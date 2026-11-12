const promptInput = document.querySelector('#prompt');
const suggestButton = document.querySelector('#suggest');
const statusLine = document.querySelector('#assistant-status');
const suggestion = document.querySelector('#suggestion');
const messageLine = document.querySelector('#ai-message');
const cartItems = document.querySelector('#cart-items');
const cartTotal = document.querySelector('#cart-total');
const cartSubtotal = document.querySelector('#cart-subtotal');
const cartShipping = document.querySelector('#cart-shipping');
const paypalContainer = document.querySelector('#paypal-buttons');
const toast = document.querySelector('#toast');
let activeCart = [];
let paypalClientId = '';
let toastTimer;
const icons = { notebook: '📓', 'pen-set': '🖊️', sketchbook: '🎨', 'water-bottle': '💧', 'desk-lamp': '💡', 'tote-bag': '👜', 'gift-wrap': '🎁' };

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

function renderCart(items, pricing = null) {
  activeCart = items;
  cartItems.innerHTML = '';
  for (const item of items) {
    const lineTotal = item.price * item.quantity;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `<div class="item-icon">${icons[item.id] || '🛍️'}</div><div class="item-main"><div class="item-name"></div><div class="item-meta"></div><div class="item-reason"></div><div class="item-terms"></div></div><div class="item-price">$${lineTotal.toFixed(2)}</div>`;
    row.querySelector('.item-name').textContent = item.name;
    row.querySelector('.item-meta').textContent = `Qty ${item.quantity} · $${item.price.toFixed(2)} each`;
    row.querySelector('.item-reason').textContent = item.reason ? `Why it fits: ${item.reason}` : '';
    row.querySelector('.item-terms').textContent = `${item.delivery} · ${item.returns}`;
    cartItems.append(row);
  }
  cartSubtotal.textContent = `$${(pricing?.subtotal || 0).toFixed(2)}`;
  cartShipping.textContent = pricing?.shipping === 0 ? 'Free' : `$${(pricing?.shipping || 0).toFixed(2)}`;
  cartTotal.textContent = `$${(pricing?.total || 0).toFixed(2)}`;
  suggestion.classList.toggle('hidden', !items.length);
  renderPayPal();
}

async function renderPayPal() {
  paypalContainer.innerHTML = '';
  if (!activeCart.length || !paypalClientId || !window.paypal) return;
  try {
    await window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 42 },
      createOrder: async () => (await api('/api/orders', { method: 'POST', body: JSON.stringify({ items: activeCart.map(({ id, quantity }) => ({ id, quantity })) }) })).id,
      onApprove: async data => {
        const result = await api(`/api/orders/${encodeURIComponent(data.orderID)}/capture`, { method: 'POST', body: '{}' });
        showToast(`Sandbox payment ${result.status.toLowerCase()} · ${result.captureId || result.id}`);
        paypalContainer.innerHTML = '<div class="success-message">✓ &nbsp; Thank you! Your sandbox order is complete.</div>';
      },
      onError: error => showToast(error?.message || 'PayPal checkout could not be completed.'),
    }).render(paypalContainer);
  } catch (error) { showToast(error.message); }
}

async function loadPayPal() {
  try {
    const config = await api('/api/config');
    paypalClientId = config.paypalClientId;
    if (!paypalClientId) {
      document.querySelector('.sandbox-caption').innerHTML = '<span class="status-dot"></span> Add PayPal sandbox credentials to enable checkout';
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=USD&intent=capture`;
    script.onload = renderPayPal;
    script.onerror = () => showToast('Could not load PayPal sandbox. Check your connection.');
    document.head.append(script);
  } catch (error) { showToast(error.message); }
}

suggestButton.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  if (prompt.length < 4) { statusLine.textContent = 'Add a little more detail so Cartwise can help.'; promptInput.focus(); return; }
  suggestButton.disabled = true;
  suggestButton.innerHTML = '<span>✳</span> Finding thoughtful picks…';
  statusLine.textContent = 'Matching your request to the collection…';
  try {
    const result = await api('/api/assist', { method: 'POST', body: JSON.stringify({ prompt }) });
    messageLine.textContent = result.message;
    renderCart(result.items || [], result.pricing);
    statusLine.textContent = result.items?.length ? 'Review your picks, then choose PayPal to continue.' : 'Try describing a different need from the collection.';
    suggestion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) { statusLine.textContent = error.message; }
  finally { suggestButton.disabled = false; suggestButton.innerHTML = '<span>✨</span> Find my picks <span class="arrow">↗</span>'; }
});

document.querySelectorAll('.example').forEach(button => button.addEventListener('click', () => { promptInput.value = button.dataset.prompt; promptInput.focus(); }));
document.querySelector('#clear-cart').addEventListener('click', () => { renderCart([], null); statusLine.textContent = 'A short description is all we need.'; promptInput.focus(); });
promptInput.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') suggestButton.click(); });
loadPayPal();
