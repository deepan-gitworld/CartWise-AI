# Devpost submission draft

## Project name

Cartwise AI

## Tagline

An AI shopping assistant that makes the full cost, delivery, and return terms clear before PayPal checkout.

## Inspiration

PayPal's Q3 2026 presentation reports 1% currency-neutral growth in online branded checkout volume. We explored a shopper-side reason people can hesitate before paying: uncertainty about whether an item fits their needs, when it will arrive, what can be returned, and what the complete amount will be. We wanted AI to reduce that uncertainty while leaving the purchase decision with the customer.

## What it does

Cartwise lets a shopper describe a need, occasion, recipient, budget, delivery deadline, or return preference in everyday language. Gemini turns that request into a structured suggestion from a small, fixed catalog. Cartwise validates product IDs, quantities, and stock against its server-side catalog, calculates item subtotal and shipping, and displays the reason for each pick, delivery estimate, return terms, and full total. It creates a PayPal Sandbox order only after the shopper chooses checkout and approves the test payment.

## How we built it

The app uses a small Node.js server and a responsive browser interface. Gemini 2.5 Flash interprets the shopper's request and returns a constrained JSON suggestion. The server only accepts stocked items from its fixed catalog, supplies verified product terms, and calculates prices and shipping itself. PayPal's JavaScript SDK presents checkout, while the server creates and captures an order through the PayPal Orders API in Sandbox mode.

## What we learned / challenges

The main design challenge was giving the AI enough flexibility to understand shopper intent without letting it invent products, prices, stock, or policies. We addressed this by constraining its output to catalog IDs and quantities, validating every suggestion on the server, and requiring the shopper to review all terms and approve the cart before PayPal checkout.

## Built with

Node.js, JavaScript, HTML, CSS, Google Gemini API, PayPal JavaScript SDK, PayPal Orders API (Sandbox)

## Links to add before submitting

- Public source repository: [add the public GitHub repository URL]
- Demo video (YouTube, under 3 minutes): [add the public YouTube URL]
- Hosted demo, if available: [add URL; otherwise provide the repository setup instructions]

## Demo video script (about 75 seconds)

“This is Cartwise AI. It helps shoppers resolve questions that can cause hesitation before checkout: does this fit my needs, when will it arrive, can I return it, and what is my full cost? I’ll ask for a thoughtful gift for a creative friend under twenty-five dollars, with easy returns. Gemini finds relevant items from our store catalog. The server verifies each item, quantity, stock, price, and store policy, then calculates shipping and the exact total. I can review those details and choose whether to pay. I’ll continue with PayPal Sandbox and approve the test order. Cartwise confirms the sandbox payment. No live payments are made.”

Record the actual app and actual sandbox checkout. Do not submit the script as a substitute for the required demo video.
