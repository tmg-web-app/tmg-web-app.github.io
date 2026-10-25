# Contact form Worker

This Cloudflare Worker receives the contact form submission, sends it through Cloudflare Email Routing, and redirects the visitor to the site thank-you page.

## Configure and deploy

1. In Cloudflare, enable Email Routing for the zone that owns the sender address and verify the sender address.
2. Install Wrangler and authenticate it with the Cloudflare account that will host the Worker:

   ```sh
   npm install --global wrangler
   wrangler login
   ```

3. The deployment values are defined in `wrangler.toml` under `[vars]`, then deploy from this directory:

   ```sh
   wrangler deploy
   ```

4. Replace `YOUR_ACCOUNT_SUBDOMAIN` in `../contact.html` with the Worker hostname shown by `wrangler deploy`.

The Worker only accepts POST requests at `/contact`, enforces field limits, checks the required fields and email format, includes a hidden honeypot, and sends a `303` redirect only after Cloudflare accepts the email for delivery.

## Configuration

These are set in `wrangler.toml` under `[vars]` and read from `env` at runtime:

| Name                | Required | Purpose                                                                                 |
| ------------------- | -------- | --------------------------------------------------------------------------------------- |
| `CONTACT_SENDER`    | Yes      | The `from:` address. **Must be a verified sender on a domain with Email Routing enabled** in this account. |
| `CONTACT_RECIPIENT` | Yes      | The `to:` address. **Must be a verified destination address** for this account. |
| `THANK_YOU_URL`     | No       | Where non-JS visitors are redirected after success. Defaults to `https://www.mediagroup.dev/thanks.html` if unset. |

> **Secrets override vars.** If you previously set `CONTACT_SENDER` or `CONTACT_RECIPIENT` with `wrangler secret put`, the encrypted value takes precedence over `[vars]`. Delete them (`wrangler secret delete CONTACT_SENDER`) to make `wrangler.toml` the source of truth.

The `SEND_EMAIL` binding is declared in `wrangler.toml`:

```toml
[[send_email]]
name = "SEND_EMAIL"
```

If `env.SEND_EMAIL` is `undefined` at runtime, the binding is missing from the deployed Worker — redeploy after confirming the block above is present.

## Database

Submissions are stored in the `db_contact_form` D1 database, bound as `env.DB`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "db_contact_form"
database_id = "5492eab5-eb15-49c1-ba15-0220fd9a62d5"
```

Each accepted submission (one that passes validation and is not a honeypot match) is inserted into `table_contact_schema` after the email is sent:

| Column      | Source                    |
| ----------- | ------------------------- |
| `c_id`      | Auto-increment primary key |
| `c_date`    | ISO 8601 timestamp at insert |
| `c_name`    | `name` form field         || `c_email`   | `email` form field        |
| `c_service` | `service` form field (null when empty) |
| `c_message` | `message` form field      |
| `c_phone`   | `phone` form field (null when empty) |

The insert runs **after** the email send. If it fails, the error is logged and the visitor still sees success, because the email has already been dispatched.

### Inspect stored submissions

```sh
npx wrangler d1 execute db_contact_form --remote \
  --command="SELECT c_id, c_date, c_name, c_email, c_service FROM table_contact_schema ORDER BY c_id DESC LIMIT 20"
```

### Email Routing prerequisites

Before the first `send()` can succeed, all of the following must be true **in the same Cloudflare account that hosts the Worker**:

- Email Routing is enabled for the zone that owns `CONTACT_SENDER`.
- `CONTACT_SENDER` (the `from:` address) is verified / onboarded for sending.
- `CONTACT_RECIPIENT` (the `to:` address) is a verified destination address in Email Routing.

If any is missing, `env.SEND_EMAIL.send()` rejects and the Worker returns `502`.

## CORS

The form is submitted with `fetch()` from `https://www.mediagroup.dev` to `https://forms.mediagroup.dev/contact`, which is a cross-origin request. Because the JavaScript sends an `X-Requested-With` header, the browser issues an `OPTIONS` preflight first.

The Worker answers `OPTIONS` with `204` and returns `access-control-allow-origin` only for origins in `ALLOWED_ORIGINS` (in `src/index.js`). Add any new site origins to that list when the site moves to a new host.

A browser-side `TypeError: Failed to fetch` usually means the preflight was rejected, the hostname does not resolve, or the TLS certificate is invalid — not that the email send failed.

## DNS

The `routes` entry in `wrangler.toml` attaches the Worker to `forms.mediagroup.dev`, but the hostname still needs a DNS record in the `mediagroup.dev` zone (or a Worker custom domain). Confirm it resolves before debugging the Worker itself:

```sh
nslookup forms.mediagroup.dev
```

## Smoke test

Run these against the deployed Worker to verify routing, CORS, and email delivery independently.

### 1. Preflight (should be `204` with CORS headers)

```sh
curl -i -X OPTIONS https://forms.mediagroup.dev/contact \
  -H "Origin: https://www.mediagroup.dev" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With, Accept"
```

Expect `HTTP/2 204` and `access-control-allow-origin: https://www.mediagroup.dev`.

### 2. Real submission (should be `200` with `{"ok":true}`)

```sh
curl -i -X POST https://forms.mediagroup.dev/contact \
  -H "Origin: https://www.mediagroup.dev" \
  -H "Accept: application/json" \
  -H "X-Requested-With: fetch" \
  --data-urlencode "name=Curl Test" \
  --data-urlencode "email=test@example.com" \
  --data-urlencode "phone=555-123-4567" \
  --data-urlencode "service=web-dev" \
  --data-urlencode "message=This is a smoke test from curl."
```

Expect `HTTP/2 200` and a body of `{"ok":true,"message":"Thanks! Your message has been sent.","redirect":"..."}`.

If you get `502` instead, the request reached the Worker and CORS is fine — the failure is in `SEND_EMAIL.send()`. Re-check the Email Routing prerequisites above.

### 3. Validation failure (should be `400`)

```sh
curl -i -X POST https://forms.mediagroup.dev/contact \
  -H "Accept: application/json" \
  -H "X-Requested-With: fetch" \
  --data-urlencode "name=" \
  --data-urlencode "email=not-an-email" \
  --data-urlencode "message="
```

Expect `HTTP/2 400` with `{"ok":false,"message":"..."}`.
