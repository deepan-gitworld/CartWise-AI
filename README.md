# Cartwise AI

**Good picks. Clear checkout.** Cartwise is a merchant-side shopping assistant designed to reduce uncertainty before checkout. A shopper describes their need, budget, delivery timing, or return preference; Cartwise suggests matching catalog items and shows the itemized price, shipping cost, delivery estimate, and return terms before the shopper chooses PayPal Sandbox checkout.

## Why it helps

PayPal's Q3 2026 presentation reports that online branded checkout volume grew 1% year over year on a currency-neutral basis. Cartwise explores one possible response to checkout hesitation: help a customer answer “is this right for me, and what will it really cost?” before payment. This is a hackathon hypothesis, not a claim that the prototype changes PayPal's business results.

## What it does

1. The shopper describes a need, occasion, recipient, budget, delivery deadline, or return preference.
2. Gemini returns a structured suggestion using only the supplied catalog facts.
3. Cartwise validates product IDs, quantities, and stock, then calculates item subtotal, shipping, and total on the server.
4. The shopper reviews why each product was suggested, stock-backed delivery estimates, return terms, and the full amount.
5. PayPal Sandbox creates and captures a test order only after the shopper approves checkout.

The catalog, stock, product details, and order amounts are controlled by the server. The AI cannot set prices or silently charge a shopper. Shipping is $4 below a $30 item subtotal and free at or above $30. This demo uses USD and sample store policies.

## Built with

- Node.js 18+ (built-in HTTP server and `fetch`; no third-party server packages)
- Google Gemini API (`gemini-2.5-flash`) for natural-language cart suggestions
- PayPal JavaScript SDK and PayPal Orders v2 Sandbox API for checkout
- HTML, CSS, and browser JavaScript

## Run locally

1. Install Node.js 18 or later.
2. Create a Google AI Studio API key and a PayPal Developer sandbox REST app. For PayPal, copy the sandbox client ID and secret.
3. In this folder, copy `.env.example` to `.env` and add your keys. Never publish `.env` or share the PayPal secret.
4. Start the app:

   ```sh
   npm start
   ```

5. Open <http://localhost:3000>.
6. Describe a shopping request, review the suggested cart, and use a PayPal sandbox personal test account to approve a test payment.

If only one credential is configured, the corresponding feature displays setup guidance; the app does not make live payments.

## Create credentials

- Google AI Studio: <https://aistudio.google.com/app/apikey>
- PayPal Developer dashboard: <https://developer.paypal.com/dashboard/applications/sandbox>

Use sandbox credentials only. `PAYPAL_CLIENT_SECRET` and `GEMINI_API_KEY` are server-side secrets. The PayPal client ID is sent to the browser to load the PayPal JavaScript SDK; the client secret is never sent to the browser.

## Environment variables

See `.env.example`. `PORT` is optional and defaults to `3000`.

## Demo video outline (under 3 minutes)

1. Show the Cartwise landing page and explain the checkout uncertainty it addresses.
2. Enter: “A thoughtful gift for a creative friend under $25, easy returns.”
3. Show Gemini's suggestion and review its reasons, product prices, delivery estimate, return policy, shipping, and total.
4. Click the PayPal button, approve using a sandbox buyer account, and show the success confirmation.
5. State clearly that the payment was completed in PayPal Sandbox, not with real money.

## Scope and limitations

- This is a hackathon proof of concept with a small fixed sample catalog and USD prices.
- Test purchases use PayPal Sandbox only.
- Do not enter real payment card information or deploy with production credentials.
- The AI suggestion is a convenience; the customer reviews the cart before creating a PayPal order.

## License

MIT. See [LICENSE](LICENSE).
