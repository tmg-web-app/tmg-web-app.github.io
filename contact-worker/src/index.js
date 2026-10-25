const MAX_FIELD_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 5_000;

function value(form, field, maximumLength, allowNewlines = false) {
  const rawValue = form.get(field);
  const normalizedValue = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!allowNewlines && /[\r\n]/.test(normalizedValue)) {
    throw new Error(`${field} contains invalid characters.`);
  }

  if (normalizedValue.length > maximumLength) {
    throw new Error(`${field} is too long.`);
  }

  return normalizedValue;
}

function redirectTarget(env) {
  return env.THANK_YOU_URL || "https://www.mediagroup.dev/thanks.html";
}

function wantsJsonResponse(request) {
  const accept = (request.headers.get("accept") || "").toLowerCase();
  const requestedWith = (request.headers.get("x-requested-with") || "").toLowerCase();
  return accept.includes("application/json") || requestedWith === "fetch";
}

function normalizedFormSnapshot(form) {
  const snapshot = {};

  for (const [field, rawValue] of form.entries()) {
    if (typeof rawValue !== "string") {
      snapshot[field] = "[binary value omitted]";
      continue;
    }

    const cleaned = rawValue.trim().replace(/[\r\n]+/g, " ");
    snapshot[field] = cleaned;
  }

  return snapshot;
}

function emailContent({ name, email, phone, service, message, submittedFields }) {
  const submitted = Object.entries(submittedFields)
    .filter(([field]) => field !== "website")
    .map(([field, fieldValue]) => `${field}: ${fieldValue || "(empty)"}`);

  return [
    "New contact request",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Service: ${service || "Not specified"}`,
    "",
    "Project details:",
    message,
    "",
    "Submitted fields:",
    ...submitted,
  ].join("\n");
}

function errorResponse(message, status = 400, asJson = false) {
  if (asJson) {
    return new Response(JSON.stringify({ ok: false, message }), {
      status,
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "cache-control": "no-store",
      },
    });
  }

  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=UTF-8",
      "cache-control": "no-store",
    },
  });
}

function successResponse(message, env, asJson = false) {
  const redirect = redirectTarget(env);

  if (asJson) {
    return new Response(JSON.stringify({ ok: true, message, redirect }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "cache-control": "no-store",
      },
    });
  }

  return Response.redirect(redirect, 303);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const asJson = wantsJsonResponse(request);

    if (url.pathname !== "/contact") {
      return errorResponse("Not found.", 404, asJson);
    }

    if (request.method !== "POST") {
      return errorResponse("Method not allowed.", 405, asJson);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
      return errorResponse("Unsupported form submission.", 415, asJson);
    }

    try {
      const form = await request.formData();
      const submittedFields = normalizedFormSnapshot(form);
      const name = value(form, "name", MAX_FIELD_LENGTH);
      const email = value(form, "email", MAX_FIELD_LENGTH);
      const phone = value(form, "phone", MAX_FIELD_LENGTH);
      const service = value(form, "service", MAX_FIELD_LENGTH);
      const message = value(form, "message", MAX_MESSAGE_LENGTH, true);
      const honeypot = value(form, "website", MAX_FIELD_LENGTH);

      if (honeypot) {
        return successResponse("Thanks!", env, asJson);
      }

      if (!name || !email || !message) {
        return errorResponse("Name, email, and project details are required.", 400, asJson);
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse("Enter a valid email address.", 400, asJson);
      }

      await env.SEND_EMAIL.send({
        to: env.CONTACT_RECIPIENT,
        from: env.CONTACT_SENDER,
        replyTo: email,
        subject: "New website contact request",
        text: emailContent({ name, email, phone, service, message, submittedFields }),
      });
      return successResponse("Thanks! Your message has been sent.", env, asJson);
    } catch (error) {
      if (error instanceof Error && (error.message.endsWith("is too long.") || error.message.endsWith("contains invalid characters."))) {
        return errorResponse(error.message, 400, asJson);
      }

      console.error("Contact email delivery failed.", error);
      return errorResponse("Unable to send your message right now. Please try again later.", 502, asJson);
    }
  },
};
