# Contact form Worker

This Cloudflare Worker receives the contact form submission, sends it through Cloudflare Email Routing, and redirects the visitor to the site thank-you page.

## Configure and deploy

1. In Cloudflare, enable Email Routing for the zone that owns the sender address and verify the sender address.
2. Install Wrangler and authenticate it with the Cloudflare account that will host the Worker:

   ```sh
   npm install --global wrangler
   wrangler login
   ```

3. From this directory, configure the deployment values. Use the actual Worker URL returned by `wrangler deploy` for the contact form's `action` in `../contact.html`.

   ```sh
   wrangler secret put CONTACT_SENDER
   wrangler secret put CONTACT_RECIPIENT
   wrangler secret put THANK_YOU_URL
   wrangler deploy
   ```

   Set `CONTACT_SENDER` to the verified sender address, `CONTACT_RECIPIENT` to the inbox that should receive requests, and `THANK_YOU_URL` to `https://tmg-web-app.github.io/thanks.html`.

4. Replace `YOUR_ACCOUNT_SUBDOMAIN` in `../contact.html` with the Worker hostname shown by `wrangler deploy`.

The Worker only accepts POST requests at `/contact`, enforces field limits, checks the required fields and email format, includes a hidden honeypot, and sends a `303` redirect only after Cloudflare accepts the email for delivery.
