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

function emailContent({ name, email, service, message }) {
  return [
    "New contact request",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Service: ${service || "Not specified"}`,
    "",
    "Project details:",
    message,
  ].join("\n");
}

function errorResponse(message, status = 400) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=UTF-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/contact") {
      return errorResponse("Not found.", 404);
    }

    if (request.method !== "POST") {
      return errorResponse("Method not allowed.", 405);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
      return errorResponse("Unsupported form submission.", 415);
    }

    try {
      const form = await request.formData();
      const name = value(form, "name", MAX_FIELD_LENGTH);
      const email = value(form, "email", MAX_FIELD_LENGTH);
      const service = value(form, "service", MAX_FIELD_LENGTH);
      const message = value(form, "message", MAX_MESSAGE_LENGTH, true);
      const honeypot = value(form, "website", MAX_FIELD_LENGTH);

      if (honeypot) {
        return Response.redirect(env.THANK_YOU_URL, 303);
      }

      if (!name || !email || !message) {
        return errorResponse("Name, email, and project details are required.");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse("Enter a valid email address.");
      }

      await env.SEND_EMAIL.send({
        to: env.CONTACT_RECIPIENT,
        from: env.CONTACT_SENDER,
        replyTo: email,
        subject: "New website contact request",
        text: emailContent({ name, email, service, message }),
      });
      return Response.redirect(env.THANK_YOU_URL, 303);
    } catch (error) {
      if (error instanceof Error && (error.message.endsWith("is too long.") || error.message.endsWith("contains invalid characters."))) {
        return errorResponse(error.message);
      }

      console.error("Contact email delivery failed.", error);
      return errorResponse("Unable to send your message right now. Please try again later.", 502);
    }
  },
};
