const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
loadEnv();
const PORT = Number(process.env.PORT || 3000);
const SHIPPING_FEE = 4;
const FREE_SHIPPING_MINIMUM = 30;
const CATALOG = [
  { id: 'notebook', name: 'Everyday Notebook', price: 6.5, description: 'A sturdy, lined notebook for everyday notes.', tags: ['study', 'writing', 'school'], stock: 18, delivery: 'Arrives in 3–5 business days', returns: '30-day returns when unused' },
  { id: 'pen-set', name: 'Smooth Writing Pen Set', price: 8, description: 'A set of five smooth black ink pens.', tags: ['study', 'writing', 'school'], stock: 24, delivery: 'Arrives in 3–5 business days', returns: '30-day returns when unused' },
  { id: 'sketchbook', name: 'Pocket Sketchbook', price: 12, description: 'A compact, thick-paper sketchbook for drawing.', tags: ['art', 'drawing', 'creative'], stock: 9, delivery: 'Arrives in 2–4 business days', returns: '30-day returns when unused' },
  { id: 'water-bottle', name: 'Insulated Water Bottle', price: 18, description: 'A reusable stainless steel bottle for daily use.', tags: ['fitness', 'travel', 'daily'], stock: 12, delivery: 'Arrives in 3–5 business days', returns: '30-day returns when unused' },
  { id: 'desk-lamp', name: 'LED Study Lamp', price: 24, description: 'A dimmable desk lamp with a compact footprint.', tags: ['study', 'desk', 'school'], stock: 6, delivery: 'Arrives in 4–6 business days', returns: '30-day returns when unused' },
  { id: 'tote-bag', name: 'Canvas Tote Bag', price: 14, description: 'A reusable cotton tote for books and errands.', tags: ['daily', 'travel', 'gift'], stock: 15, delivery: 'Arrives in 3–5 business days', returns: '30-day returns when unused' },
  { id: 'gift-wrap', name: 'Gift Wrap', price: 3, description: 'Simple recyclable gift wrap, added to an order.', tags: ['gift'], stock: 50, delivery: 'Ships with the order', returns: 'Not returnable' },
];

function loadEnv() {
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match && !Object.hasOwn(process.env, match[1])) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}
function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 20_000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (err) { reject(err); } });
    req.on('error', reject);
  });
}

function safeCart(lines) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 6) return null;
  const cart = new Map();
  for (const line of lines) {
    const item = CATALOG.find(product => product.id === line.id);
    const quantity = Math.floor(Number(line.quantity));
    if (!item || !Number.isFinite(quantity) || quantity < 1 || quantity > 5) continue;
    const previous = cart.get(item.id);
    const combinedQuantity = quantity + (previous?.quantity || 0);
    if (combinedQuantity > item.stock) continue;
    cart.set(item.id, { ...item, quantity: combinedQuantity, reason: String(line.reason || '').slice(0, 180) });
  }
  return cart.size ? [...cart.values()] : null;
}

function priceCart(cart) {
  const subtotal = Number(cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  const shipping = subtotal >= FREE_SHIPPING_MINIMUM ? 0 : SHIPPING_FEE;
  return { subtotal, shipping, total: Number((subtotal + shipping).toFixed(2)) };
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Add GEMINI_API_KEY to your .env file to enable the AI shopping assistant.');
  const products = CATALOG.map(({ id, name, price, description, tags, stock, delivery, returns }) => ({ id, name, price, description, tags, stock, delivery, returns }));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are Cartwise, a careful shopping assistant for a small merchant. Use only the supplied catalog facts. Never invent products, prices, availability, delivery times, or return terms. Recommend 1-4 relevant products and quantities that are in stock. Respect any stated budget including the listed shipping rule: shipping is $4 below a $30 item subtotal and free at or above $30. If the customer gives a delivery deadline, only recommend products whose listed delivery estimate is compatible; if you cannot tell, say so in the message. For each item give a short reason based only on the catalog and customer request. If the request is unrelated or cannot be fulfilled, return an empty items list and politely explain. Return JSON only.' }] },
      contents: [{ role: 'user', parts: [{ text: `Catalog: ${JSON.stringify(products)}\nCustomer request: ${prompt}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            message: { type: 'STRING' },
            items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, quantity: { type: 'INTEGER' }, reason: { type: 'STRING' } }, required: ['id', 'quantity', 'reason'] } },
          },
          required: ['message', 'items'],
        },
        temperature: 0.2,
      },
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'The AI service could not complete the request.');
  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
  if (!text) throw new Error('The AI returned an empty suggestion. Please try another request.');
  return JSON.parse(text);
}

async function paypalRequest(endpoint, options = {}) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('Add your PayPal sandbox client ID and secret to .env to enable checkout.');
  const base = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials',
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error(token.error_description || 'Could not connect to PayPal sandbox.');
  const response = await fetch(`${base}${endpoint}`, {
    method: options.method || 'GET',
    headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'PayPal sandbox request failed.');
  return data;
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/config') {
    return send(res, 200, { paypalClientId: process.env.PAYPAL_CLIENT_ID || '', currency: 'USD' });
  }
  if (req.method === 'GET' && url.pathname === '/api/catalog') return send(res, 200, CATALOG);

  if (req.method === 'POST' && url.pathname === '/api/assist') {
    try {
      const { prompt } = await readBody(req);
      if (typeof prompt !== 'string' || prompt.trim().length < 4 || prompt.length > 500) return send(res, 400, { error: 'Describe what you need in 4–500 characters.' });
      const result = await callGemini(prompt.trim());
      const cart = safeCart(result.items);
      const items = cart || [];
      return send(res, 200, { message: String(result.message || 'Here is a cart suggestion for you.'), items, pricing: items.length ? priceCart(items) : null, shippingPolicy: `Standard shipping is $${SHIPPING_FEE.toFixed(2)} under $${FREE_SHIPPING_MINIMUM.toFixed(2)}; free at or above that subtotal.` });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    try {
      const { items } = await readBody(req);
      const cart = safeCart(items);
      if (!cart) return send(res, 400, { error: 'Add at least one valid item before checkout.' });
      const pricing = priceCart(cart);
      if (pricing.total > 200) return send(res, 400, { error: 'Sandbox checkout is limited to $200 per order.' });
      const amount = pricing.total.toFixed(2);
      const order = await paypalRequest('/v2/checkout/orders', {
        method: 'POST',
        body: { intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: amount, breakdown: { item_total: { currency_code: 'USD', value: pricing.subtotal.toFixed(2) }, shipping: { currency_code: 'USD', value: pricing.shipping.toFixed(2) } } }, items: cart.map(item => ({ name: item.name, quantity: String(item.quantity), unit_amount: { currency_code: 'USD', value: item.price.toFixed(2) } })) }] },
      });
      return send(res, 200, { id: order.id, total: amount });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }

  if (req.method === 'POST' && /^\/api\/orders\/[A-Z0-9-]+\/capture$/.test(url.pathname)) {
    try {
      const id = url.pathname.split('/')[3];
      const result = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, { method: 'POST', body: {} });
      return send(res, 200, { status: result.status, id: result.id, captureId: result.purchase_units?.[0]?.payments?.captures?.[0]?.id });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }

  const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = path.resolve(PUBLIC, requested);
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 404, { error: 'Not found' });
    const ext = path.extname(file);
    const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : 'application/octet-stream';
    send(res, 200, content, type);
  });
}

http.createServer((req, res) => { route(req, res).catch(error => send(res, 500, { error: error.message })); }).listen(PORT, '127.0.0.1', () => {
  console.log(`Cartwise is ready at http://localhost:${PORT}`);
});
