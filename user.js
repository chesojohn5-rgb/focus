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
const paymentHistoryTable = document.getElementById('paymentHistoryTable');
const notificationBell = document.getElementById('notificationBell');
const notificationCount = document.getElementById('notificationCount');
const notificationsPanel = document.getElementById('notificationsPanel');
const notificationList = document.getElementById('notificationList');
const profileName = document.getElementById('profileName');
const profilePhone = document.getElementById('profilePhone');
const profileEmail = document.getElementById('profileEmail');
const profileRepaidLoans = document.getElementById('profileRepaidLoans');
const creditScoreValue = document.getElementById('creditScoreValue');
const creditRiskBadge = document.getElementById('creditRiskBadge');
const creditScoreMessage = document.getElementById('creditScoreMessage');
const creditScoreHint = document.getElementById('creditScoreHint');
const calcAmount = document.getElementById('calcAmount');
const calcRate = document.getElementById('calcRate');
const calcDays = document.getElementById('calcDays');
const calcStartDate = document.getElementById('calcStartDate');
const calcInterest = document.getElementById('calcInterest');
const calcRepayment = document.getElementById('calcRepayment');
const calcDueDate = document.getElementById('calcDueDate');
const calcInstallment = document.getElementById('calcInstallment');
const borrowingLimitValue = document.getElementById('borrowingLimitValue');
const borrowingTier = document.getElementById('borrowingTier');
const borrowingNextTier = document.getElementById('borrowingNextTier');
const overdueLoansCount = document.getElementById('overdueLoansCount');
const lateFeeTotal = document.getElementById('lateFeeTotal');
const repaymentScheduleTable = document.getElementById('repaymentScheduleTable');
const printAgreementBtn = document.getElementById('printAgreementBtn');
const agreementPreview = document.getElementById('agreementPreview');
const documentForm = document.getElementById('documentForm');
const documentType = document.getElementById('documentType');
const documentFile = document.getElementById('documentFile');
const documentsTable = document.getElementById('documentsTable');

const DOCUMENTS_KEY = `loanexpress_documents_${user.id}`;
const AUDIT_KEY = 'loanexpress_audit_trail';

if (welcomeEl) welcomeEl.innerText = 'Welcome, ' + user.name;
if (userNameBadge) userNameBadge.innerText = user.name;
if (profileName) profileName.innerText = `${user.name || ''} ${user.surname || ''}`.trim() || '-';
if (profilePhone) profilePhone.innerText = user.phone || '-';
if (profileEmail) profileEmail.innerText = user.email || '-';

function logout() {
  localStorage.clear();
  goToPage('login');
}

const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const navLinks = document.querySelector('.nav-links');

function setSidebar(open) {
  if (!sidebar) return;
  const next = open === undefined ? !sidebar.classList.contains('open') : open;
  sidebar.classList.toggle('open', next);
  if (sidebarBackdrop) sidebarBackdrop.classList.toggle('show', next);
  if (navLinks) navLinks.classList.toggle('open', next);
}

if (sidebarToggle) sidebarToggle.addEventListener('click', () => setSidebar());
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => setSidebar(false));
if (navLinks) {
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setSidebar(false));
  });
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (err) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function pushAuditEvent(action, details) {
  const trail = readJson(AUDIT_KEY, []);
  trail.unshift({
    time: new Date().toISOString(),
    actor: user.name || 'Borrower',
    role: 'Borrower',
    action,
    details
  });
  writeJson(AUDIT_KEY, trail.slice(0, 100));
}

function getStoredDocuments() {
  return readJson(DOCUMENTS_KEY, []);
}

function saveStoredDocuments(documents) {
  writeJson(DOCUMENTS_KEY, documents);
}

function formatMoney(value) {
  return (Number(value) || 0).toFixed(2);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function addDays(dateValue, days) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + (Number(days) || 0));
  return date;
}

function isOverdue(dateValue) {
  const date = dateValue ? new Date(dateValue) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && date.getTime() < Date.now());
}

function downloadReceipt(url) {
  if (!url) return;
  const anchor = document.createElement('a');
  anchor.href = resolveApiAssetUrl(url);
  anchor.download = '';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  if (resolveApiAssetUrl(url) === localStorage.getItem('latest_receipt_url')) {
    localStorage.removeItem('latest_receipt_url');
  }
}

let latestReceiptUrl = '';
let latestAgreementLoan = null;

if (downloadReceiptBtn) {
  downloadReceiptBtn.addEventListener('click', () => downloadReceipt(latestReceiptUrl));
}

if (notificationBell && notificationsPanel) {
  notificationBell.addEventListener('click', () => {
    notificationsPanel.style.display = notificationsPanel.style.display === 'none' ? '' : 'none';
  });
}

const storedReceiptUrl = localStorage.getItem('latest_receipt_url') || '';
if (receiptCard && storedReceiptUrl) {
  latestReceiptUrl = resolveApiAssetUrl(storedReceiptUrl);
  receiptCard.style.display = '';
}

function updateInterestTotal() {
  if (!amountInput || !interestRateInput || !interestTotal) return;
  const amount = parseFloat(amountInput.value);
  const ratePercent = parseFloat(interestRateInput.value);
  if (isNaN(amount) || isNaN(ratePercent)) {
    interestTotal.innerText = 'Total with interest: -';
    return;
  }
  const total = amount + amount * (ratePercent / 100);
  interestTotal.innerText = `Total with interest: ${total.toFixed(2)}`;
}

if (amountInput) amountInput.addEventListener('input', updateInterestTotal);
if (interestRateInput) interestRateInput.addEventListener('input', updateInterestTotal);
updateInterestTotal();

function updateCalculator() {
  if (!calcAmount || !calcRate || !calcDays) return;
  const amount = Number(calcAmount.value);
  const rate = Number(calcRate.value);
  const days = Number(calcDays.value);
  const startDate = calcStartDate && calcStartDate.value ? calcStartDate.value : new Date().toISOString().slice(0, 10);

  if (calcStartDate && !calcStartDate.value) {
    calcStartDate.value = startDate;
  }

  if (amount <= 0 || rate < 0 || days <= 0) {
    calcInterest.innerText = '-';
    calcRepayment.innerText = '-';
    calcDueDate.innerText = '-';
    calcInstallment.innerText = '-';
    return;
  }

  const interest = amount * (rate / 100);
  const repayment = amount + interest;
  const dueDate = addDays(startDate, days);
  const weeklyInstallment = repayment / Math.max(Math.ceil(days / 7), 1);

  calcInterest.innerText = formatMoney(interest);
  calcRepayment.innerText = formatMoney(repayment);
  calcDueDate.innerText = dueDate ? dueDate.toLocaleDateString() : '-';
  calcInstallment.innerText = `${formatMoney(weeklyInstallment)} / week`;
}

[calcAmount, calcRate, calcDays, calcStartDate].forEach((input) => {
  if (input) input.addEventListener('input', updateCalculator);
});
updateCalculator();

function buildNotifications(loans) {
  const notices = [];

  loans.forEach((loan) => {
    const status = (loan.status || '').toLowerCase();
    const balance = Number(loan.balance ?? loan.amount) || 0;

    if (status === 'approved') {
      notices.push({
        title: `Loan #${loan.id} approved`,
        body: `Balance due is ${formatMoney(balance)}${loan.due_date ? ` by ${formatDate(loan.due_date)}` : ''}.`
      });
    }

    if ((Number(loan.paid_amount) || 0) > 0) {
      notices.push({
        title: `Payment received for loan #${loan.id}`,
        body: `${formatMoney(loan.paid_amount)} has been recorded on your account.`
      });
    }

    if (isOverdue(loan.due_date) && balance > 0 && status === 'approved') {
      const fee = balance * 0.05;
      notices.push({
        title: `Late fee warning`,
        body: `Loan #${loan.id} is overdue. Estimated late fee: ${formatMoney(fee)}.`
      });
    }
  });

  return notices.slice(0, 6);
}

function renderNotifications(notices) {
  if (!notificationCount || !notificationList || !notificationsPanel) return;
  notificationCount.innerText = String(notices.length);

  if (!notices.length) {
    notificationsPanel.style.display = 'none';
    notificationList.innerHTML = '<div class="stack-item"><strong>No notifications</strong><span class="helper">You are all caught up.</span></div>';
    return;
  }

  notificationList.innerHTML = notices.map((notice) => `
    <div class="stack-item">
      <strong>${notice.title}</strong>
      <span>${notice.body}</span>
    </div>
  `).join('');
}

function calculateCreditScore(loans) {
  let score = 600;
  let onTimeCount = 0;
  let lateCount = 0;
  let repaidCount = 0;

  loans.forEach((loan) => {
    const status = (loan.status || '').toLowerCase();
    const paidAmount = Number(loan.paid_amount) || 0;
    const pastDue = isOverdue(loan.due_date);

    if (status === 'paid') {
      repaidCount += 1;
      if (pastDue) {
        lateCount += 1;
        score -= 30;
      } else {
        onTimeCount += 1;
        score += 25;
      }
    } else if (status === 'approved' && pastDue && paidAmount <= 0) {
      lateCount += 1;
      score -= 40;
    }
  });

  score = Math.max(300, Math.min(850, score));

  let risk = 'New';
  let message = 'Building your repayment profile.';
  if (score >= 720) {
    risk = 'Low risk';
    message = 'High chance of approval';
  } else if (score >= 640) {
    risk = 'Moderate';
    message = 'Healthy repayment profile';
  } else if (score >= 560) {
    risk = 'Watchlist';
    message = 'Repay on time to improve trust';
  } else {
    risk = 'High risk';
    message = 'Approval may require extra review';
  }

  return { score, risk, message, repaidCount, onTimeCount, lateCount };
}

function renderCreditScore(summary) {
  if (creditScoreValue) creditScoreValue.innerText = summary.score;
  if (creditRiskBadge) creditRiskBadge.innerText = summary.risk;
  if (creditScoreMessage) creditScoreMessage.innerText = summary.message;
  if (creditScoreHint) creditScoreHint.innerText = `${summary.onTimeCount} on-time repayments, ${summary.lateCount} late cases.`;
  if (profileRepaidLoans) profileRepaidLoans.innerText = summary.repaidCount;
}

function renderBorrowingPower(scoreSummary) {
  let limit = 500;
  let tier = 'Starter';
  let next = 'Reach 640 score for Growth';

  if (scoreSummary.score >= 720) {
    limit = 3000;
    tier = 'Prime';
    next = 'Top tier unlocked';
  } else if (scoreSummary.score >= 640) {
    limit = 1500;
    tier = 'Growth';
    next = 'Reach 720 score for Prime';
  }

  if (borrowingLimitValue) borrowingLimitValue.innerText = formatMoney(limit);
  if (borrowingTier) borrowingTier.innerText = tier;
  if (borrowingNextTier) borrowingNextTier.innerText = next;
}

function renderLateFeeWatch(loans) {
  let overdueCount = 0;
  let feeTotal = 0;

  loans.forEach((loan) => {
    const status = (loan.status || '').toLowerCase();
    const balance = Number(loan.balance ?? 0) || 0;
    if (status === 'approved' && balance > 0 && isOverdue(loan.due_date)) {
      overdueCount += 1;
      feeTotal += balance * 0.05;
    }
  });

  if (overdueLoansCount) overdueLoansCount.innerText = String(overdueCount);
  if (lateFeeTotal) lateFeeTotal.innerText = formatMoney(feeTotal);
}

function renderPaymentHistory(loans) {
  if (!paymentHistoryTable) return;

  const rows = loans
    .filter((loan) => (Number(loan.paid_amount) || 0) > 0 || loan.latest_payment_id || loan.receipt_url)
    .map((loan) => {
      const paidAmount = Number(loan.paid_amount) || 0;
      const receiptUrl = loan.latest_payment_id ? `/api/auth/receipt/${loan.latest_payment_id}` : loan.receipt_url;
      return `
        <tr>
          <td data-label="Loan">#${loan.id}</td>
          <td data-label="Paid">${formatMoney(paidAmount)}</td>
          <td data-label="Balance">${formatMoney(loan.balance ?? 0)}</td>
          <td data-label="Recorded">${formatDate(loan.updated_at || loan.created_at || loan.due_date)}</td>
          <td data-label="Receipt">${receiptUrl ? `<button type="button" class="btn-success" onclick="downloadReceipt('${receiptUrl}')">Download</button>` : '<span class="helper">Pending</span>'}</td>
        </tr>
      `;
    });

  paymentHistoryTable.innerHTML = rows.length ? rows.join('') : `
    <tr>
      <td colspan="5">No payment history yet.</td>
    </tr>
  `;
}

function getTrackerMarkup(status) {
  const steps = ['requested', 'approved', 'disbursed', 'repaid'];
  const normalized = (status || '').toLowerCase();
  let activeIndex = 0;

  if (normalized === 'approved') activeIndex = 2;
  if (normalized === 'paid') activeIndex = 3;

  return `<div class="tracker">${steps.map((step, index) => {
    let cls = 'tracker-step';
    if (normalized !== 'rejected') {
      if (index < activeIndex) cls = 'tracker-step done';
      if (index === activeIndex) cls = 'tracker-step active';
    } else if (index === 0) {
      cls = 'tracker-step active';
    }
    return `<span class="${cls}">${step}</span>`;
  }).join('')}</div>`;
}

function buildRepaymentSchedule(loans) {
  const schedule = [];

  loans.forEach((loan) => {
    const status = (loan.status || '').toLowerCase();
    if (status !== 'approved' && status !== 'paid') return;

    const amount = Number(loan.amount) || 0;
    const interestRate = Number(loan.interest_rate) || 0;
    const total = Number(loan.balance ?? (amount + amount * (interestRate / 100))) || 0;
    const dueDate = loan.due_date ? new Date(loan.due_date) : addDays(new Date(), 30);
    if (!dueDate || Number.isNaN(dueDate.getTime())) return;

    const installments = 4;
    const installmentAmount = total / installments;

    for (let index = 0; index < installments; index += 1) {
      const installmentDate = new Date(dueDate);
      installmentDate.setDate(dueDate.getDate() - (installments - index - 1) * 7);

      let state = 'Upcoming';
      if (status === 'paid') {
        state = 'Settled';
      } else if (installmentDate.getTime() < Date.now()) {
        state = 'Due';
      }

      schedule.push({
        loanId: loan.id,
        label: `Installment ${index + 1}`,
        due: installmentDate.toISOString(),
        status: state,
        amount: installmentAmount
      });
    }
  });

  return schedule.sort((a, b) => new Date(a.due) - new Date(b.due));
}

function renderRepaymentSchedule(loans) {
  if (!repaymentScheduleTable) return;
  const schedule = buildRepaymentSchedule(loans);

  repaymentScheduleTable.innerHTML = schedule.length ? schedule.map((item) => `
    <tr>
      <td data-label="Loan">#${item.loanId}</td>
      <td data-label="Installment">${item.label}</td>
      <td data-label="Due">${formatDate(item.due)}</td>
      <td data-label="Status">${item.status}</td>
      <td data-label="Amount">${formatMoney(item.amount)}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="5">No active repayment schedule yet.</td>
    </tr>
  `;
}

function renderAgreementPreview(loans) {
  if (!agreementPreview) return;

  latestAgreementLoan = loans.find((loan) => ['approved', 'paid'].includes((loan.status || '').toLowerCase()))
    || loans[0]
    || null;

  if (!latestAgreementLoan) {
    agreementPreview.innerHTML = '<strong>No loan agreement available yet.</strong><span>Create or receive an approved loan to generate the agreement preview.</span>';
    return;
  }

  agreementPreview.innerHTML = `
    <strong>Loan #${latestAgreementLoan.id}</strong>
    <span>Borrower: ${profileName ? profileName.innerText : user.name}</span>
    <span>Amount: ${formatMoney(latestAgreementLoan.amount)}</span>
    <span>Interest Rate: ${Number(latestAgreementLoan.interest_rate || 0).toFixed(2)}%</span>
    <span>Due Date: ${formatDate(latestAgreementLoan.due_date)}</span>
    <span>Status: ${latestAgreementLoan.status}</span>
  `;
}

function openAgreementPrint() {
  if (!latestAgreementLoan) {
    showToast('No loan agreement available yet');
    return;
  }

  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) {
    showToast('Allow popups to print the agreement');
    return;
  }

  popup.document.write(`
    <html>
      <head>
        <title>Loan Agreement</title>
        <style>
          body{font-family:Arial,sans-serif;padding:32px;color:#111}
          h1{margin-bottom:8px}
          .meta{margin:12px 0}
          .meta p{margin:6px 0}
          .signatures{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
          .line{margin-top:54px;border-top:1px solid #111;padding-top:8px}
        </style>
      </head>
      <body>
        <h1>LOAN EXPRESS LTD</h1>
        <p>Loan Agreement</p>
        <div class="meta">
          <p><strong>Borrower:</strong> ${profileName ? profileName.innerText : user.name}</p>
          <p><strong>Loan ID:</strong> ${latestAgreementLoan.id}</p>
          <p><strong>Amount:</strong> ${formatMoney(latestAgreementLoan.amount)}</p>
          <p><strong>Interest Rate:</strong> ${Number(latestAgreementLoan.interest_rate || 0).toFixed(2)}%</p>
          <p><strong>Total Due:</strong> ${formatMoney(latestAgreementLoan.balance ?? latestAgreementLoan.amount)}</p>
          <p><strong>Due Date:</strong> ${formatDate(latestAgreementLoan.due_date)}</p>
          <p><strong>Status:</strong> ${latestAgreementLoan.status}</p>
        </div>
        <p>The borrower agrees to repay the approved amount together with the applicable interest on or before the due date shown above.</p>
        <div class="signatures">
          <div class="line">Borrower Signature</div>
          <div class="line">Authorized Officer</div>
        </div>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
  pushAuditEvent('Printed agreement', `Loan #${latestAgreementLoan.id}`);
}

function renderDocuments() {
  if (!documentsTable) return;
  const documents = getStoredDocuments();

  documentsTable.innerHTML = documents.length ? documents.map((doc) => `
    <tr>
      <td data-label="Type">${doc.type}</td>
      <td data-label="File">${doc.name}</td>
      <td data-label="Saved">${formatDateTime(doc.savedAt)}</td>
      <td data-label="Status">${doc.status}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="4">No documents saved yet.</td>
    </tr>
  `;
}

if (documentForm) {
  documentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const selectedType = documentType.value;
    const file = documentFile.files && documentFile.files[0];

    if (!selectedType || !file) {
      showToast('Select a document type and file');
      return;
    }

    const documents = getStoredDocuments();
    documents.unshift({
      id: Date.now(),
      userId: user.id,
      userName: `${user.name || ''} ${user.surname || ''}`.trim() || user.name || `User ${user.id}`,
      type: selectedType,
      name: file.name,
      size: file.size,
      savedAt: new Date().toISOString(),
      status: 'Pending review'
    });
    saveStoredDocuments(documents);
    pushAuditEvent('Saved document record', `${selectedType}: ${file.name}`);
    documentForm.reset();
    renderDocuments();
    showToast('Document record saved');
  });
}

if (printAgreementBtn) {
  printAgreementBtn.addEventListener('click', openAgreementPrint);
}

const loanForm = document.getElementById('loanForm');
loanForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const amount = parseFloat(amountInput ? amountInput.value : '');
  const rateValue = interestRateInput ? interestRateInput.value : '';
  const interestRatePercent = rateValue === '' ? null : parseFloat(rateValue);
  const dueDateInput = document.getElementById('due_date');
  const dueDate = dueDateInput ? dueDateInput.value : '';

  if (isNaN(amount) || amount <= 0) {
    showToast('Enter a valid amount');
    return;
  }

  const response = await apiFetch('/api/auth/loan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, interest_rate: interestRatePercent, due_date: dueDate || null })
  });

  const data = await response.json();

  if (response.ok) {
    showToast('Loan requested successfully');
    pushAuditEvent('Requested loan', `Amount ${formatMoney(amount)}`);
    loanForm.reset();
    if (interestTotal) interestTotal.innerText = 'Total with interest: -';
  } else {
    showToast(data.message || 'Request failed');
  }

  loadLoans();
});

function openModal(id) { document.getElementById(id).setAttribute('aria-hidden', 'false'); }
function closeModal(id) { document.getElementById(id).setAttribute('aria-hidden', 'true'); }

const payForm = document.getElementById('payForm');
payForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = event.target;
  const amount = parseFloat(form.amount.value);
  const loanId = form.loanId.value;

  if (isNaN(amount) || amount <= 0) {
    showToast('Enter a valid amount');
    return;
  }

  const response = await apiFetch(`/api/auth/loan/${loanId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });

  const data = await response.json();

  if (response.ok) {
    showToast(`Payment successful. Remaining: ${data.balance}`);
    pushAuditEvent('Submitted payment', `Loan #${loanId} amount ${formatMoney(amount)}`);
    closeModal('payModal');
    latestReceiptUrl = resolveApiAssetUrl(data.receipt_url);
    downloadReceipt(latestReceiptUrl);
    if (receiptCard && latestReceiptUrl) {
      receiptCard.style.display = '';
    }
  } else if (response.status === 403) {
    showToast('This loan is pending approval and cannot be paid yet');
  } else {
    showToast(data.message || 'Payment failed');
  }

  loadLoans();
});

async function loadLoans() {
  const response = await apiFetch('/api/auth/loans');
  const loans = await response.json();
  const userLoans = loans.filter((loan) => Number(loan.user_id) === Number(user.id));

  let totalBorrowed = 0;
  let outstanding = 0;
  let activeCount = 0;
  let payableLoan = null;

  userLoans.forEach((loan) => {
    const amount = Number(loan.amount) || 0;
    const interestRate = Number(loan.interest_rate) || 0;
    const totalWithInterest = amount + amount * (interestRate / 100);
    const status = (loan.status || '').toLowerCase();
    const isApproved = status === 'approved' || status === 'paid';
    const balance = isApproved ? (loan.balance ?? totalWithInterest) : 0;
    const numericBalance = Number(balance) || 0;

    if (isApproved) {
      totalBorrowed += amount;
      outstanding += numericBalance;
      if (numericBalance > 0) activeCount += 1;
    }

    if (numericBalance > 0 && status === 'approved') {
      if (!payableLoan || Number(loan.id) < Number(payableLoan.id)) {
        payableLoan = { id: loan.id, balance: numericBalance, due_date: loan.due_date };
      }
    }
  });

  document.getElementById('userActiveLoans').innerText = activeCount;
  document.getElementById('userTotalBorrowed').innerText = formatMoney(totalBorrowed);
  document.getElementById('userOutstanding').innerText = formatMoney(outstanding);

  if (payNowCard && payNowBtn && payNowInfo) {
    if (payableLoan) {
      const loanObj = userLoans.find((loan) => String(loan.id) === String(payableLoan.id)) || {};
      const paidAmount = Number(loanObj.paid_amount) || 0;
      const status = (loanObj.status || '').toLowerCase();
      const due = loanObj.due_date ? ` | Due: ${loanObj.due_date}` : '';

      if (status === 'approved') {
        if (paidAmount === 0) {
          payNowInfo.innerText = `Loan #${loanObj.id} | UNPAID${due}`;
        } else {
          payNowInfo.innerText = `Loan #${loanObj.id} | PARTIALLY PAID | Balance: ${formatMoney(payableLoan.balance)}${due}`;
        }
        payNowBtn.disabled = false;
        payNowBtn.onclick = () => {
          const query = new URLSearchParams({ loan_id: loanObj.id, amount: payableLoan.balance, due: loanObj.due_date || '' });
          goToPage('payNow', Object.fromEntries(query.entries()));
        };
      } else if (status === 'paid') {
        payNowInfo.innerText = `Loan #${loanObj.id} | PAID${due}`;
        payNowBtn.disabled = true;
        payNowBtn.onclick = null;
      } else {
        payNowInfo.innerText = `Loan #${loanObj.id} | Status: ${loanObj.status}`;
        payNowBtn.disabled = true;
        payNowBtn.onclick = null;
      }

      payNowCard.style.display = '';
    } else {
      payNowCard.style.display = 'none';
      payNowInfo.innerText = '';
      payNowBtn.onclick = null;
    }
  }

  const scoreSummary = calculateCreditScore(userLoans);
  renderLoansTable(userLoans);
  renderPaymentHistory(userLoans);
  renderNotifications(buildNotifications(userLoans));
  renderCreditScore(scoreSummary);
  renderBorrowingPower(scoreSummary);
  renderLateFeeWatch(userLoans);
  renderRepaymentSchedule(userLoans);
  renderAgreementPreview(userLoans);
  renderDocuments();
}

function renderLoansTable(loans) {
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  loansTable.innerHTML = '';

  loans.forEach((loan) => {
    const match = !query || [loan.id, loan.user_id, loan.status, loan.amount, loan.due_date]
      .join(' ')
      .toLowerCase()
      .includes(query);

    if (!match) return;

    const status = (loan.status || '').toLowerCase();
    const amount = Number(loan.amount) || 0;
    const interestRate = Number(loan.interest_rate) || 0;
    const totalWithInterest = amount + amount * (interestRate / 100);
    const balance = (status === 'approved' || status === 'paid') ? (loan.balance ?? totalWithInterest) : 0;
    const numericBalance = Number(balance) || 0;
    const dueDate = loan.due_date || '-';

    loansTable.innerHTML += `
      <tr>
        <td data-label="ID">${loan.id}</td>
        <td data-label="Amount">${formatMoney(loan.amount)}</td>
        <td data-label="Paid">${formatMoney(loan.paid_amount || 0)}</td>
        <td data-label="Balance">${formatMoney(numericBalance)}</td>
        <td data-label="Due Date">${dueDate}</td>
        <td data-label="Status" class="status-${loan.status}">${loan.status}</td>
        <td data-label="Tracker">${getTrackerMarkup(loan.status)}</td>
      </tr>
    `;
  });
}

function openPayModal(loanId) {
  const form = document.getElementById('payForm');
  form.loanId.value = loanId;
  form.amount.value = '';
  openModal('payModal');
}

if (searchInput) searchInput.addEventListener('input', loadLoans);

loadLoans();
setInterval(loadLoans, 5000);

window.logout = logout;
window.openPayModal = openPayModal;
window.downloadReceipt = downloadReceipt;
