const params = new URLSearchParams(window.location.search);
const reference = params.get('reference');
const message = document.getElementById('lencoReturnMessage');

if (message && reference) {
  message.textContent = `Your payment reference is ${reference}. We will update your balance once Lenco confirms the transaction.`;
}
