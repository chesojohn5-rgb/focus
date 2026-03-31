// ----------------------
// GET USER FROM STORAGE
// ----------------------
const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
  goToPage('login');
}

// UI elements
const welcomeEl = document.getElementById('welcome');
const loansTable = document.getElementById('loansTable');
const searchInput = document.getElementById('searchLoans');
const userNameBadge = document.getElementById('userNameBadge');
const payNowCard = document.getElementById('payNowCard');
const payNowInfo = document.getElementById('payNowInfo');
const payNowBtn = document.getElementById('payNowBtn');
const receiptCard = document.getElementById('receiptCard');
const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
const amountInput = document.getElementById('amount');
const interestRateInput = document.getElementById('interest_rate');
const interestTotal = document.getElementById('interestTotal');

if(welcomeEl) welcomeEl.innerText = "Welcome, " + user.name;
if(userNameBadge) userNameBadge.innerText = user.name;

// logout
function logout() {
  localStorage.clear();
  goToPage('login');
}

// mobile sidebar toggle
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const navLinks = document.querySelector('.nav-links');

function setSidebar(open){
  if(!sidebar) return;
  const next = (open === undefined) ? !sidebar.classList.contains('open') : open;
  sidebar.classList.toggle('open', next);
  if(sidebarBackdrop) sidebarBackdrop.classList.toggle('show', next);
  if(navLinks) navLinks.classList.toggle('open', next);
}

if(sidebarToggle) sidebarToggle.addEventListener('click', ()=> setSidebar());
if(sidebarBackdrop) sidebarBackdrop.addEventListener('click', ()=> setSidebar(false));
if(navLinks){
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', ()=> setSidebar(false));
  });
}

// toast helper
function showToast(message){
  let t = document.querySelector('.toast');
  if(!t){ 
    t = document.createElement('div'); 
    t.className='toast'; 
    document.body.appendChild(t); 
  }
  t.innerText = message; 
  t.classList.add('show'); 
  setTimeout(()=>t.classList.remove('show'), 3000);
}

function downloadReceipt(url){
  if(!url) return;
  const a = document.createElement('a');
  a.href = resolveApiAssetUrl(url);
  a.download = '';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  if(resolveApiAssetUrl(url) === localStorage.getItem('latest_receipt_url')){
    localStorage.removeItem('latest_receipt_url');
  }
}

let latestReceiptUrl = "";
if(downloadReceiptBtn){
  downloadReceiptBtn.addEventListener('click', () => downloadReceipt(latestReceiptUrl));
}

// show receipt when coming back from pay_now
const storedReceiptUrl = localStorage.getItem('latest_receipt_url') || '';
if(receiptCard && storedReceiptUrl){
  latestReceiptUrl = resolveApiAssetUrl(storedReceiptUrl);
  receiptCard.style.display = '';
}

function updateInterestTotal(){
  if(!amountInput || !interestRateInput || !interestTotal) return;
  const amount = parseFloat(amountInput.value);
  const ratePercent = parseFloat(interestRateInput.value);
  if(isNaN(amount) || isNaN(ratePercent)){
    interestTotal.innerText = 'Total with interest: -';
    return;
  }
  const total = amount + (amount * (ratePercent / 100));
  interestTotal.innerText = `Total with interest: ${total.toFixed(2)}`;
}

if(amountInput) amountInput.addEventListener('input', updateInterestTotal);
if(interestRateInput) interestRateInput.addEventListener('input', updateInterestTotal);
updateInterestTotal();

// ----------------------
// REQUEST LOAN
// ----------------------
const loanForm = document.getElementById('loanForm');

loanForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const amount = parseFloat(amountInput ? amountInput.value : '');
  const rateValue = interestRateInput ? interestRateInput.value : '';
  const interestRatePercent = rateValue === '' ? null : parseFloat(rateValue);
  const dueDateInput = document.getElementById('due_date');
  const due_date = dueDateInput ? dueDateInput.value : '';

  if(isNaN(amount) || amount <= 0){ 
    showToast('Enter a valid amount'); 
    return; 
  }

  const res = await apiFetch('/api/auth/loan', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ amount, interest_rate: interestRatePercent, due_date: due_date || null })
  });

  const data = await res.json();

  if (res.ok) {
    showToast('Loan requested successfully');
    loanForm.reset();
    if(interestTotal) interestTotal.innerText = 'Total with interest: -';
  } else {
    showToast(data.message || 'Request failed');
  }

  loadLoans();
});

// ----------------------
// MODALS
// ----------------------
function openModal(id){ document.getElementById(id).setAttribute('aria-hidden','false'); }
function closeModal(id){ document.getElementById(id).setAttribute('aria-hidden','true'); }

// ----------------------
// PAY LOAN
// ----------------------
const payForm = document.getElementById('payForm');

payForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const amount = parseFloat(form.amount.value);
  const loanId = form.loanId.value;

  if(isNaN(amount) || amount <= 0){ 
    showToast('Enter a valid amount'); 
    return; 
  }

  const res = await apiFetch(`/api/auth/loan/${loanId}/pay`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ amount })
  });

  const data = await res.json();

  if(res.ok){
    showToast(`Payment successful. Remaining: ${data.balance}`);
    closeModal('payModal');
    latestReceiptUrl = resolveApiAssetUrl(data.receipt_url);
    downloadReceipt(latestReceiptUrl);
    if(receiptCard && latestReceiptUrl){
      receiptCard.style.display = "";
    }
  } else if(res.status === 403){
    showToast('This loan is pending approval and cannot be paid yet');
  } else {
    showToast(data.message || 'Payment failed');
  }

  loadLoans();
});

// ----------------------
// LOAD LOANS
// ----------------------
async function loadLoans(){
  const res = await apiFetch('/api/auth/loans');
  const loans = await res.json();

  let totalBorrowed = 0, outstanding = 0, activeCount = 0;
  let payableLoan = null;

  loans.forEach(loan => {

    // ✅ FIXED: strict comparison
    if(Number(loan.user_id) === Number(user.id)){

      const amount = Number(loan.amount) || 0;
      const interestRate = Number(loan.interest_rate) || 0;
      const totalWithInterest = amount + (amount * (interestRate / 100));
      const status = (loan.status || '').toLowerCase();
      const isApproved = (status === 'approved' || status === 'paid');
      const balance = isApproved ? (loan.balance ?? totalWithInterest) : 0;
      const numericBalance = Number(balance) || 0;

      if(isApproved){
        totalBorrowed += amount;
        outstanding += numericBalance;
        if(numericBalance > 0){
          activeCount += 1;
        }
      }

      if(numericBalance > 0 && status === 'approved'){
        if(!payableLoan || Number(loan.id) < Number(payableLoan.id)){
          payableLoan = { id: loan.id, balance: numericBalance, due_date: loan.due_date };
        }
      }
    }
  });

  document.getElementById('userActiveLoans').innerText = activeCount;
  document.getElementById('userTotalBorrowed').innerText = totalBorrowed;
  document.getElementById('userOutstanding').innerText = outstanding;

  if(payNowCard && payNowBtn && payNowInfo){
    if(payableLoan){
      // find the full loan object for more context
      const loanObj = loans.find(l => String(l.id) === String(payableLoan.id)) || {};
      const paidAmount = Number(loanObj.paid_amount) || 0;
      const status = (loanObj.status || '').toLowerCase();
      const due = loanObj.due_date ? ` | Due: ${loanObj.due_date}` : '';

      if(status === 'approved'){
        // Approved but not yet confirmed as paid by admin
        if(paidAmount === 0){
          payNowInfo.innerText = `Loan #${loanObj.id} | UNPAID${due}`;
        } else {
          payNowInfo.innerText = `Loan #${loanObj.id} | PARTIALLY PAID | Balance: ${payableLoan.balance}${due}`;
        }
        // allow user to submit manual payment details
        payNowBtn.disabled = false;
        payNowBtn.onclick = () => {
          const qs = new URLSearchParams({ loan_id: loanObj.id, amount: payableLoan.balance, due: loanObj.due_date || '' });
          goToPage('payNow', Object.fromEntries(qs.entries()));
        };
      } else if(status === 'paid'){
        payNowInfo.innerText = `Loan #${loanObj.id} | PAID${due}`;
        payNowBtn.disabled = true;
        payNowBtn.onclick = null;
      } else {
        // fallback
        payNowInfo.innerText = `Loan #${loanObj.id} | Status: ${loanObj.status}`;
        payNowBtn.disabled = true;
        payNowBtn.onclick = null;
      }

      payNowCard.style.display = "";
    } else {
      payNowCard.style.display = "none";
      payNowInfo.innerText = "";
      payNowBtn.onclick = null;
    }
  }

  renderLoansTable(loans);
}

// ----------------------
// RENDER TABLE
// ----------------------
function renderLoansTable(loans){
  const q = searchInput ? searchInput.value.toLowerCase() : '';
  loansTable.innerHTML = '';

  loans.forEach(loan => {

    // ✅ FIXED: strict comparison
    if (Number(loan.user_id) !== Number(user.id)) return;

    const match = !q || [loan.id, loan.user_id, loan.status, loan.amount, loan.due_date]
      .join(' ')
      .toLowerCase()
      .includes(q);

    if(!match) return;

    const status = (loan.status || "").toLowerCase();

    const amount = Number(loan.amount) || 0;
    const interestRate = Number(loan.interest_rate) || 0;
    const totalWithInterest = amount + (amount * (interestRate / 100));
    const balance = ((status === 'approved' || status === 'paid')) ? (loan.balance ?? totalWithInterest) : 0;
    const numericBalance = Number(balance) || 0;

    const dueDate = loan.due_date || '-';


    loansTable.innerHTML += `
      <tr>
        <td data-label="ID">${loan.id}</td>
        <td data-label="Amount">${loan.amount}</td>
        <td data-label="Paid">${loan.paid_amount || 0}</td>
        <td data-label="Balance">${numericBalance}</td>
        <td data-label="Due Date">${dueDate}</td>
        <td data-label="Status" class="status-${loan.status}">${loan.status}</td>
      </tr>
    `;
  });
}

// open payment modal
function openPayModal(loanId){
  const form = document.getElementById('payForm');
  form.loanId.value = loanId;
  form.amount.value = '';
  openModal('payModal');
}

// search
if(searchInput) searchInput.addEventListener('input', loadLoans);

// ✅ IMPORTANT: initial load + auto refresh
loadLoans();
setInterval(loadLoans, 5000);

// expose
window.logout = logout;
window.openPayModal = openPayModal;



