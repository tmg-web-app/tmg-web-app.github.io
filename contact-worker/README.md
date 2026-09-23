# Contact form Worker

This Cloudflare Worker receives the contact form submission as JSON, sends it through Cloudflare Email Routing, and returns a JSON result to the page's `fetch` call. It does not redirect the browser; `js/main.js` handles the pending/success/error UI and navigates to `thanks.html` on success.

## Security model

- **CORS is restricted** to the origin(s) listed in the `ALLOWED_ORIGINS` var in `wrangler.toml` (comma-separated). Requests with a missing or non-matching `Origin` header are rejected with `403`, and only allowed origins receive `Access-Control-Allow-Origin` on the response.
- **Only `POST` with `Content-Type: application/json`** at `/contact` is accepted; anything else gets `404`/`405`/`415`.
- **Payload limits**: the request body is capped at 20 KB, individual fields at 160 characters, and the message at 5,000 characters. Fields containing newlines (except the message) are rejected.
- **No secrets in client code.** The Worker reads `CONTACT_SENDER` / `CONTACT_RECIPIENT` from Wrangler secrets and sends mail through the `SEND_EMAIL` binding (Cloudflare Email Routing) — the frontend only ever sees the public Worker URL.
- A hidden honeypot field (`website`) is accepted and silently discarded (no email is sent, but the client still gets `ok: true`) to reduce bot noise without revealing the check.

## Configure and deploy

1. In Cloudflare, enable Email Routing for the zone that owns the sender address and verify the sender address.
2. Install Wrangler and authenticate it with the Cloudflare account that will host the Worker:

   ```sh
   npm install --global wrangler
   wrangler login
   ```

3. Update `ALLOWED_ORIGINS` in `wrangler.toml` if the site is served from a different origin than `https://www.mediagroup.dev` or `https://tmg-web-app.github.io`.

4. From this directory, set the required secrets and deploy:

   ```sh
   wrangler secret put CONTACT_SENDER
   wrangler secret put CONTACT_RECIPIENT
   wrangler deploy
   ```

   Set `CONTACT_SENDER` to the verified sender address and `CONTACT_RECIPIENT` to the inbox that should receive requests. Neither value is ever sent to the browser.

5. Replace `YOUR_ACCOUNT_SUBDOMAIN` in `../contact.html`'s `data-endpoint` attribute with the Worker hostname shown by `wrangler deploy` (or point it at a custom route/domain if you configure one).

## API

`POST /contact` with a JSON body:

```json
{ "name": "Jane Doe", "email": "jane@example.com", "service": "website-development", "message": "..." }
```

Responses are always JSON: `{ "ok": true }` on success, or `{ "ok": false, "error": "..." }` with a `4xx`/`5xx` status on validation failure or delivery failure.

## Local testing

```sh
wrangler dev
```

Then `POST` to `http://127.0.0.1:8787/contact` with an `Origin` header that matches an entry in `ALLOWED_ORIGINS` (add `http://localhost:*` style entries locally if needed — Wrangler dev still enforces the same `ALLOWED_ORIGINS` check).
