const params = new URLSearchParams(window.location.search);
const loanId = params.get('loan_id') || '';
const amount = params.get('amount') || '';
const due = params.get('due') || '';

const user = JSON.parse(localStorage.getItem('user')) || {};

const loanSummary = document.getElementById('loanSummary');
const payPhone = document.getElementById('payPhone');
const payAmount = document.getElementById('payAmount');
const loanIdInput = document.getElementById('loanId');
const message = document.getElementById('payNowMessage');
const receiptArea = document.getElementById('receiptArea');
const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
const payProvider = document.getElementById('payProvider');
const txReference = document.getElementById('txReference');

let latestReceiptUrl = '';

function downloadReceipt(url){
  if(!url) return;
  const a = document.createElement('a');
  a.href = resolveApiAssetUrl(url);
  a.download = '';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

if(downloadReceiptBtn){
  downloadReceiptBtn.addEventListener('click', () => downloadReceipt(latestReceiptUrl));
}

function showReceipt(url){
  latestReceiptUrl = url || '';
  if(receiptArea && latestReceiptUrl){
    receiptArea.style.display = '';
  }
  if(latestReceiptUrl){
    localStorage.setItem('latest_receipt_url', latestReceiptUrl);
  }
}

if (loanIdInput) loanIdInput.value = loanId || '-';
if (payAmount && amount) payAmount.value = amount;
if (payPhone && user.phone) payPhone.value = user.phone;

if (loanSummary){
  const dueText = due ? ` | Due: ${due}` : '';
  const amountText = amount ? `Amount: ${amount}` : 'Amount: -';
  const idText = loanId ? `Loan #${loanId}` : 'Loan';
  loanSummary.textContent = `${idText} | ${amountText}${dueText}`;
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('payNowForm');
  const phoneInput = document.getElementById('payPhone');
  const providerSelect = document.getElementById('payProvider');
  const amountInput = document.getElementById('payAmount');
  const loanIdInput = document.getElementById('loanId');

  // Prefill loan id and amount from query params if available
  const params = new URLSearchParams(window.location.search);
  if (params.get('loan_id')) loanIdInput.value = params.get('loan_id');
  if (params.get('amount')) amountInput.value = params.get('amount');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const phone = (phoneInput.value || '').trim();
    const provider = (providerSelect.value || '').trim();
    const amount = parseFloat(amountInput.value);
    const loanId = parseInt(loanIdInput.value, 10);

    if (!phone) return alert('Phone is required');
    if (!provider) return alert('Please select a mobile money provider');
    if (isNaN(amount) || amount <= 0) return alert('Enter a valid amount');

    try {
      const resp = await apiFetch('/api/auth/manual_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loanId, amount: amount, phone: phone, provider: provider })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Submission failed');

      // Do NOT redirect to admin dashboard. Show a friendly confirmation message
      if (message) {
        message.textContent = 'Payment submission recorded. Admin will verify shortly. Use your browser Back or dashboard link to return.';
        message.style.display = '';
      } else {
        alert('Payment submission recorded. Admin will verify shortly.');
      }

      // disable form to prevent double submits
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      // previously we inserted a Back to Dashboard button here — removed as requested

    } catch (err) {
      console.error(err);
      alert('Failed to submit payment: ' + (err.message || err));
    }
  });
});
