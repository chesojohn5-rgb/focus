const params = new URLSearchParams(window.location.search);
const intentId = params.get('intent_id');

const summary = document.getElementById('lencoSummary');
const returnBtn = document.getElementById('returnToApp');

if (returnBtn) {
  returnBtn.addEventListener('click', () => {
    goToPage('userDashboard');
  });
}

if (!intentId) {
  if (summary) summary.textContent = 'Missing payment reference.';
} else {
  apiFetch(`/api/auth/lenco/intents/${intentId}`)
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        summary.textContent = data.message || 'Unable to load payment details.';
        return;
      }
      const amount = Number(data.amount || 0).toFixed(2);
      const currency = data.currency || '';
      const status = data.status || 'pending';
      summary.textContent = `Reference: ${data.reference} | Loan #${data.loan_id} | Amount: ${amount} ${currency} | Status: ${status}`;
    })
    .catch(() => {
      if (summary) summary.textContent = 'Unable to load payment details.';
    });
}
