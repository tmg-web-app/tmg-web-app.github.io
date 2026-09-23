const MAX_FIELD_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 5_000;
// Hard cap on the request body size, well above what a legitimate submission needs.
const MAX_BODY_BYTES = 20_000;

function parseAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function matchAllowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  const allowed = parseAllowedOrigins(env);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(allowedOrigin) {
  if (!allowedOrigin) {
    return {};
  }

  return {
    "access-control-allow-origin": allowedOrigin,
    vary: "Origin",
  };
}

function jsonResponse(body, status, allowedOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      ...corsHeaders(allowedOrigin),
    },
  });
}

function field(data, key, maxLength, { required = false, allowNewlines = false } = {}) {
  const raw = data[key];
  const normalized = typeof raw === "string" ? raw.trim() : "";

  if (required && !normalized) {
    throw new Error(`${key} is required.`);
  }

  if (!allowNewlines && /[\r\n]/.test(normalized)) {
    throw new Error(`${key} contains invalid characters.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${key} is too long.`);
  }

  return normalized;
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

function isValidationError(error) {
  return (
    error instanceof Error &&
    (error.message.endsWith("is required.") ||
      error.message.endsWith("is too long.") ||
      error.message.endsWith("contains invalid characters."))
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = matchAllowedOrigin(request, env);

    if (url.pathname !== "/contact") {
      return jsonResponse({ ok: false, error: "Not found." }, 404, allowedOrigin);
    }

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) {
        return new Response(null, { status: 403 });
      }

      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(allowedOrigin),
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "Content-Type",
          "access-control-max-age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405, allowedOrigin);
    }

    // Restrict to the configured site origin(s); anything else is rejected outright.
    if (!allowedOrigin) {
      return jsonResponse({ ok: false, error: "Origin not allowed." }, 403, null);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse({ ok: false, error: "Unsupported content type." }, 415, allowedOrigin);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: "Payload too large." }, 413, allowedOrigin);
    }

    let bodyText;
    try {
      bodyText = await request.text();
    } catch {
      return jsonResponse({ ok: false, error: "Unable to read request body." }, 400, allowedOrigin);
    }

    if (bodyText.length > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: "Payload too large." }, 413, allowedOrigin);
    }

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400, allowedOrigin);
    }

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400, allowedOrigin);
    }

    try {
      const name = field(data, "name", MAX_FIELD_LENGTH, { required: true });
      const email = field(data, "email", MAX_FIELD_LENGTH, { required: true });
      const service = field(data, "service", MAX_FIELD_LENGTH);
      const message = field(data, "message", MAX_MESSAGE_LENGTH, { required: true, allowNewlines: true });
      const honeypot = field(data, "website", MAX_FIELD_LENGTH);

      if (honeypot) {
        // Silently accept bot submissions without sending an email.
        return jsonResponse({ ok: true }, 200, allowedOrigin);
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ ok: false, error: "Enter a valid email address." }, 400, allowedOrigin);
      }

      await env.SEND_EMAIL.send({
        to: env.CONTACT_RECIPIENT,
        from: env.CONTACT_SENDER,
        replyTo: email,
        subject: "New website contact request",
        text: emailContent({ name, email, service, message }),
      });

      return jsonResponse({ ok: true }, 200, allowedOrigin);
    } catch (error) {
      if (isValidationError(error)) {
        return jsonResponse({ ok: false, error: error.message }, 400, allowedOrigin);
      }

      console.error("Contact email delivery failed.", error);
      return jsonResponse(
        { ok: false, error: "Unable to send your message right now. Please try again later." },
        502,
        allowedOrigin
      );
    }
  },
};
