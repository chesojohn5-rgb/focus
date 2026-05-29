// Admin JS: handles listing loans, approving/rejecting, manual payments, export and search

const adminUser = JSON.parse(localStorage.getItem('user')) || { name: 'Admin' };
document.getElementById('adminName').innerText = adminUser.name;

const AUDIT_KEY = 'loanexpress_audit_trail';

function logout() {
  localStorage.clear();
  goToPage('login');
}
window.logout = logout;

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
if (sidebar) {
  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setSidebar(false));
  });
}

function openModal(id) { document.getElementById(id).setAttribute('aria-hidden', 'false'); }
function closeModal(id) { document.getElementById(id).setAttribute('aria-hidden', 'true'); }

let allLoans = [];
let allUsers = [];
let usersById = {};
let userNotes = {};

try {
  userNotes = JSON.parse(localStorage.getItem('admin_user_notes') || '{}');
} catch (err) {
  userNotes = {};
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

function saveNotes() {
  writeJson('admin_user_notes', userNotes);
}

function pushAuditEvent(action, details) {
  const trail = readJson(AUDIT_KEY, []);
  trail.unshift({
    time: new Date().toISOString(),
    actor: adminUser.name || 'Admin',
    role: 'Admin',
    action,
    details
  });
  writeJson(AUDIT_KEY, trail.slice(0, 150));
  renderAuditTrail();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function renderAnalytics(totalLoaned, totalPaid, totalBalance) {
  const maxValue = Math.max(totalLoaned, totalPaid, totalBalance, 1);
  const items = [
    ['analyticsIssuedValue', 'analyticsIssuedBar', totalLoaned],
    ['analyticsRepaidValue', 'analyticsRepaidBar', totalPaid],
    ['analyticsOutstandingValue', 'analyticsOutstandingBar', totalBalance]
  ];

  items.forEach(([valueId, barId, value]) => {
    const valueEl = document.getElementById(valueId);
    const barEl = document.getElementById(barId);
    if (valueEl) valueEl.innerText = (Number(value) || 0).toFixed(2);
    if (barEl) {
      const percentage = Number(value) > 0 ? Math.max((Number(value) / maxValue) * 100, 12) : 0;
      barEl.style.width = `${percentage}%`;
    }
  });
}

function getAllStoredDocuments() {
  const documents = [];
  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith('loanexpress_documents_')) return;
    const list = readJson(key, []);
    list.forEach((item) => documents.push(item));
  });
  return documents.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

function renderDocumentsAdmin() {
  const tbody = document.getElementById('adminDocumentsTable');
  if (!tbody) return;

  const documents = getAllStoredDocuments();
  tbody.innerHTML = documents.length ? documents.map((doc) => `
    <tr>
      <td data-label="User">${doc.userName || doc.userId}</td>
      <td data-label="Type">${doc.type}</td>
      <td data-label="File">${doc.name}</td>
      <td data-label="Saved">${formatDateTime(doc.savedAt)}</td>
      <td data-label="Status">${doc.status}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="5">No borrower documents yet.</td>
    </tr>
  `;
}

function renderAuditTrail() {
  const tbody = document.getElementById('auditTrailTable');
  if (!tbody) return;
  const trail = readJson(AUDIT_KEY, []);

  tbody.innerHTML = trail.length ? trail.slice(0, 20).map((item) => `
    <tr>
      <td data-label="Time">${formatDateTime(item.time)}</td>
      <td data-label="Actor">${item.actor} (${item.role})</td>
      <td data-label="Action">${item.action}</td>
      <td data-label="Details">${item.details || '-'}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="4">No audit events yet.</td>
    </tr>
  `;
}

async function loadLoans() {
  const res = await apiFetch('/api/auth/loans');
  allLoans = await res.json();

  const tbody = document.querySelector('#loansTable tbody');
  tbody.innerHTML = '';

  let totalLoaned = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  let pending = 0;

  allLoans.forEach((loan) => {
    const status = (loan.status || '').toLowerCase();
    const amount = Number(loan.amount) || 0;
    const balance = (status === 'approved' || status === 'paid') ? (loan.balance ?? amount) : 0;
    const numericBalance = Number(balance) || 0;

    if (status === 'approved' || status === 'paid') totalLoaned += amount;
    totalPaid += Number(loan.paid_amount) || 0;
    totalBalance += numericBalance;
    if (status === 'pending') pending += 1;

    const userDisplay = usersById[loan.user_id] || loan.user_id;
    tbody.innerHTML += `
      <tr>
        <td data-label="ID">${loan.id}</td>
        <td data-label="User">${userDisplay}</td>
        <td data-label="Amount">${amount.toFixed(2)}</td>
        <td data-label="Paid">${(Number(loan.paid_amount) || 0).toFixed(2)}</td>
        <td data-label="Balance">${numericBalance.toFixed(2)}</td>
        <td data-label="Due Date">${loan.due_date || '-'}</td>
        <td data-label="Status" class="status-${status}">${loan.status}</td>
        <td data-label="Actions" class="actions">
          ${loan.status === 'pending' ? `
            <button class="btn-primary" onclick="confirmAction('Approve loan', 'Approve this loan?', ()=>updateStatus(${loan.id}, 'approved'))">Approve</button>
            <button class="btn-danger" onclick="confirmAction('Reject loan', 'Reject this loan?', ()=>updateStatus(${loan.id}, 'rejected'))">Reject</button>
          ` : ''}
          ${(status === 'paid' && loan.latest_payment_id) ? `<button class="btn-success" onclick="downloadReceipt('/api/auth/receipt/${loan.latest_payment_id}')">Download Receipt</button>` : ''}
        </td>
      </tr>
    `;
  });

  document.getElementById('statTotalLoaned').innerText = totalLoaned.toFixed(2);
  document.getElementById('statOutstanding').innerText = totalBalance.toFixed(2);
  document.getElementById('statPending').innerText = pending;
  renderAnalytics(totalLoaned, totalPaid, totalBalance);
}

async function loadUsers() {
  const res = await apiFetch('/api/auth/users');
  allUsers = await res.json();
  usersById = {};

  allUsers.forEach((entry) => {
    const name = `${entry.name || ''} ${entry.surname || ''}`.trim() || `User ${entry.id}`;
    usersById[entry.id] = name;
  });

  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  allUsers.forEach((entry) => {
    const name = `${entry.name || ''} ${entry.surname || ''}`.trim() || '-';
    const nrcNumber = entry.nrc_number || '-';
    const role = entry.is_admin == 1 ? 'Admin' : 'User';
    const savedNote = userNotes[entry.id] || '';

    tbody.innerHTML += `
      <tr>
        <td data-label="ID">${entry.id}</td>
        <td data-label="Name">${name}</td>
        <td data-label="Email">${entry.email || '-'}</td>
        <td data-label="Phone">${entry.phone || '-'}</td>
        <td data-label="NRC">${nrcNumber}</td>
        <td data-label="Role">${role}</td>
        <td data-label="Notes">${savedNote || '<span class="helper">No notes</span>'}</td>
        <td data-label="Actions" class="actions">
          <button class="btn-success" onclick="openNotesModal(${entry.id})">Notes</button>
          <button class="btn-primary" onclick="openSetPassword(${entry.id})">Set Password</button>
        </td>
      </tr>
    `;
  });
}

async function updateStatus(id, status) {
  const res = await apiFetch(`/api/auth/loan/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (res.ok) {
    pushAuditEvent(status === 'approved' ? 'Approved loan' : 'Rejected loan', `Loan #${id}`);
  }
  alert(data.message || 'Done');
  loadLoans();
}

function confirmAction(title, message, cb) {
  document.getElementById('confirmTitle').innerText = title;
  document.getElementById('confirmMessage').innerText = message;
  openModal('confirmModal');
  const yes = document.getElementById('confirmYes');
  yes.onclick = () => {
    closeModal('confirmModal');
    cb();
  };
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
}

function openSetPassword(userId) {
  const form = document.getElementById('passwordForm');
  form.userId.value = userId;
  form.password.value = '';
  openModal('passwordModal');
}

function openNotesModal(userId) {
  const noteInput = document.getElementById('adminNoteText');
  const userIdInput = document.getElementById('adminNoteUserId');
  if (noteInput) noteInput.value = userNotes[userId] || '';
  if (userIdInput) userIdInput.value = userId;
  openModal('notesModal');
}

document.getElementById('passwordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const userId = form.userId.value;
  const password = form.password.value.trim();
  if (!password || password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }

  const res = await apiFetch(`/api/auth/users/${userId}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    pushAuditEvent('Updated password', `User #${userId}`);
    alert(data.message || 'Password updated');
    closeModal('passwordModal');
  } else {
    alert(data.message || 'Unable to update password');
  }
});

document.getElementById('notesForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const userId = document.getElementById('adminNoteUserId').value;
  const noteText = document.getElementById('adminNoteText').value.trim();
  if (!userId) return;
  userNotes[userId] = noteText;
  saveNotes();
  pushAuditEvent('Saved admin note', `User #${userId}: ${noteText || 'cleared note'}`);
  closeModal('notesModal');
  loadUsers();
});

async function loadManualPayments() {
  const res = await apiFetch('/api/auth/manual_payments');
  if (!res.ok) {
    console.warn('Unable to load manual payments');
    return;
  }

  const intents = await res.json();
  const tbody = document.querySelector('#manualPaymentsTable tbody');
  tbody.innerHTML = '';

  intents.forEach((entry) => {
    const meta = entry.metadata || {};
    const userDisplay = usersById[entry.user_id] || entry.user_id;
    tbody.innerHTML += `
      <tr>
        <td data-label="ID">${entry.id}</td>
        <td data-label="Loan ID">${entry.loan_id}</td>
        <td data-label="User">${userDisplay}</td>
        <td data-label="Amount">${(Number(entry.amount) || 0).toFixed(2)}</td>
        <td data-label="Provider">${entry.provider}</td>
        <td data-label="Phone">${meta.phone || ''}</td>
        <td data-label="Reference">${meta.tx_reference || ''}</td>
        <td data-label="Submitted At">${entry.created_at || ''}</td>
        <td data-label="Actions">
          <button class="btn-primary" onclick="reviewManualPayment(${entry.id})">Mark Paid</button>
        </td>
      </tr>
    `;
  });
}

window.reviewManualPayment = async function (intentId) {
  const res = await apiFetch('/api/auth/manual_payments');
  const list = await res.json();
  const intent = list.find((item) => item.id === intentId);
  if (!intent) return alert('Intent not found');
  const meta = intent.metadata || {};
  document.getElementById('manualReviewBody').innerHTML = `
    <p><strong>Intent ID:</strong> ${intent.id}</p>
    <p><strong>Loan ID:</strong> ${intent.loan_id}</p>
    <p><strong>User ID:</strong> ${intent.user_id}</p>
    <p><strong>Amount:</strong> ${intent.amount}</p>
    <p><strong>Provider:</strong> ${intent.provider}</p>
    <p><strong>Phone:</strong> ${meta.phone || ''}</p>
    <p><strong>Tx Reference:</strong> ${meta.tx_reference || ''}</p>
    <p><strong>Submitted at:</strong> ${intent.created_at || ''}</p>
  `;
  openModal('manualReviewModal');

  const confirmBtn = document.getElementById('manualConfirmBtn');
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    const response = await apiFetch(`/api/auth/manual_payment/${intentId}/confirm`, { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      pushAuditEvent('Confirmed manual payment', `Intent #${intentId}, loan #${intent.loan_id}`);
      alert(data.message || 'Payment marked successfully');
      closeModal('manualReviewModal');
      loadManualPayments();
      loadLoans();
    } else {
      alert(data.message || 'Failed to mark payment');
    }
    confirmBtn.disabled = false;
  };
};

document.getElementById('search')?.addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase();
  const rows = document.querySelectorAll('#loansTable tbody tr');
  rows.forEach((row) => {
    row.style.display = Array.from(row.children).some((cell) => cell.innerText.toLowerCase().includes(query)) ? '' : 'none';
  });
});

document.getElementById('exportCsv')?.addEventListener('click', () => {
  if (!allLoans.length) return alert('No data');
  const rows = [['id', 'user_id', 'amount', 'paid_amount', 'balance', 'due_date', 'status']];
  allLoans.forEach((loan) => {
    const status = (loan.status || '').toLowerCase();
    const amount = Number(loan.amount) || 0;
    const balance = (status === 'approved' || status === 'paid') ? (loan.balance ?? amount) : 0;
    rows.push([loan.id, loan.user_id, amount, loan.paid_amount || 0, balance, loan.due_date || '', loan.status]);
  });
  const csv = rows.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'loans.csv';
  anchor.click();
  URL.revokeObjectURL(url);
});

window.updateStatus = updateStatus;
window.confirmAction = confirmAction;
window.openSetPassword = openSetPassword;
window.openNotesModal = openNotesModal;
window.downloadReceipt = downloadReceipt;

loadLoans();
loadUsers();
loadManualPayments();
renderDocumentsAdmin();
renderAuditTrail();
setInterval(loadLoans, 5000);
setInterval(loadUsers, 10000);
setInterval(loadManualPayments, 8000);
setInterval(renderDocumentsAdmin, 10000);
setInterval(renderAuditTrail, 10000);
