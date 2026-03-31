// Admin JS: handles listing loans, approving/rejecting, manual payments, export and search

const adminUser = JSON.parse(localStorage.getItem('user')) || {name:'Admin'};
document.getElementById('adminName').innerText = adminUser.name;

function logout(){ 
  localStorage.clear(); 
  goToPage('login'); 
}
window.logout = logout;

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
if(sidebar){
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', ()=> setSidebar(false));
  });
}

// modal helpers
function openModal(id){ document.getElementById(id).setAttribute('aria-hidden','false'); }
function closeModal(id){ document.getElementById(id).setAttribute('aria-hidden','true'); }

let allLoans = [];
let allUsers = [];
let usersById = {};

async function loadLoans(){
  const res = await apiFetch('/api/auth/loans');
  allLoans = await res.json();

  const tbody = document.querySelector('#loansTable tbody');
  tbody.innerHTML = '';

  let totalLoaned = 0, totalPaid = 0, totalBalance = 0, pending = 0;

  allLoans.forEach(loan => {
    const status = (loan.status || '').toLowerCase();
    const amount = Number(loan.amount) || 0;
    const balance = (status === 'approved' || status === 'paid') ? (loan.balance ?? amount) : 0;
    const numericBalance = Number(balance) || 0;

    if(status === 'approved' || status === 'paid'){
      totalLoaned += amount;
    }
    totalPaid += loan.paid_amount || 0;
    totalBalance += numericBalance;
    if(status === 'pending') pending += 1;

    const userDisplay = usersById[loan.user_id] || loan.user_id;
    tbody.innerHTML += `
      <tr>
        <td data-label="ID">${loan.id}</td>
        <td data-label="User">${userDisplay}</td>
        <td data-label="Amount">${amount}</td>
        <td data-label="Paid">${loan.paid_amount || 0}</td>
        <td data-label="Balance">${numericBalance}</td>
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

  document.getElementById('statTotalLoaned').innerText = totalLoaned;
  document.getElementById('statOutstanding').innerText = totalBalance;
  document.getElementById('statPending').innerText = pending;
}

async function loadUsers(){
  const res = await apiFetch('/api/auth/users');
  allUsers = await res.json();
  usersById = {};
  allUsers.forEach(u => {
    const name = `${u.name || ''} ${u.surname || ''}`.trim() || `User ${u.id}`;
    usersById[u.id] = name;
  });

  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  allUsers.forEach(user => {
    const name = `${user.name || ''} ${user.surname || ''}`.trim() || '-';
    const nrcNumber = user.nrc_number || '-';
    const role = user.is_admin == 1 ? 'Admin' : 'User';

    tbody.innerHTML += `
      <tr>
        <td data-label="ID">${user.id}</td>
        <td data-label="Name">${name}</td>
        <td data-label="Email">${user.email || '-'}</td>
        <td data-label="Phone">${user.phone || '-'}</td>
        <td data-label="NRC">${nrcNumber}</td>
        <td data-label="Role">${role}</td>
        <td data-label="Actions" class="actions">
          <button class="btn-primary" onclick="openSetPassword(${user.id})">Set Password</button>
        </td>
      </tr>
    `;
  });
}

async function updateStatus(id, status){
  const res = await apiFetch(`/api/auth/loan/${id}/status`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({status})
  });
  const data = await res.json();
  alert(data.message || 'Done');
  loadLoans();
}

function confirmAction(title, message, cb){
  document.getElementById('confirmTitle').innerText = title;
  document.getElementById('confirmMessage').innerText = message;
  openModal('confirmModal');
  const yes = document.getElementById('confirmYes');
  yes.onclick = ()=>{ closeModal('confirmModal'); cb(); };
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
}

function openSetPassword(userId){
  const form = document.getElementById('passwordForm');
  form.userId.value = userId;
  form.password.value = '';
  openModal('passwordModal');
}

// set password form submit
document.getElementById('passwordForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = e.target;
  const userId = form.userId.value;
  const password = form.password.value.trim();
  if(!password || password.length < 6){
    alert('Password must be at least 6 characters');
    return;
  }

  const res = await apiFetch(`/api/auth/users/${userId}/password`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({password})
  });
  const data = await res.json().catch(()=> ({}));
  if(res.ok){
    alert(data.message || 'Password updated');
    closeModal('passwordModal');
  } else {
    alert(data.message || 'Unable to update password');
  }
});

// manual payments
async function loadManualPayments(){
  const res = await apiFetch('/api/auth/manual_payments');
  if(!res.ok){ console.warn('Unable to load manual payments'); return; }
  const intents = await res.json();
  const tbody = document.querySelector('#manualPaymentsTable tbody');
  tbody.innerHTML = '';
  intents.forEach(i=>{
    const meta = i.metadata || {};
    const userDisplay = usersById[i.user_id] || i.user_id;
    tbody.innerHTML += `
      <tr>
        <td data-label="ID">${i.id}</td>
        <td data-label="Loan ID">${i.loan_id}</td>
        <td data-label="User">${userDisplay}</td>
        <td data-label="Amount">${i.amount}</td>
        <td data-label="Provider">${i.provider}</td>
        <td data-label="Phone">${meta.phone || ''}</td>
        <td data-label="Reference">${meta.tx_reference || ''}</td>
        <td data-label="Submitted At">${i.created_at || ''}</td>
        <td data-label="Actions">
          <button class="btn-primary" onclick="reviewManualPayment(${i.id})">Mark Paid</button>
        </td>
      </tr>
    `;
  });
}

window.reviewManualPayment = async function(intentId){
  const res = await apiFetch(`/api/auth/manual_payments`);
  const list = await res.json();
  const intent = list.find(x=> x.id === intentId);
  if(!intent) return alert('Intent not found');
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
  confirmBtn.onclick = async ()=>{
    confirmBtn.disabled = true;
    const r = await apiFetch(`/api/auth/manual_payment/${intentId}/confirm`, { method:'POST' });
    const data = await r.json().catch(()=> ({}));
    if(r.ok){ alert(data.message || 'Payment marked successfully'); closeModal('manualReviewModal'); loadManualPayments(); loadLoans(); } else { alert(data.message || 'Failed to mark payment'); }
    confirmBtn.disabled = false;
  };
}

// search and export
document.getElementById('search')?.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#loansTable tbody tr');
  rows.forEach(r=>{
    r.style.display = Array.from(r.children).some(td=>td.innerText.toLowerCase().includes(q)) ? '' : 'none';
  });
});

document.getElementById('exportCsv')?.addEventListener('click', ()=>{
  if(!allLoans.length) return alert('No data');
  const rows = [];
  rows.push(['id','user_id','amount','paid_amount','balance','due_date','status']);
  allLoans.forEach(l=> {
    const status = (l.status || '').toLowerCase();
    const amount = Number(l.amount) || 0;
    const balance = (status === 'approved' || status === 'paid') ? (l.balance ?? amount) : 0;
    rows.push([l.id,l.user_id,amount,l.paid_amount||0,balance,l.due_date || '',l.status]);
  });
  const csv = rows.map(r=> r.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'loans.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// expose functions used by inline onclick attributes
window.updateStatus = updateStatus;
window.confirmAction = confirmAction;
window.openSetPassword = openSetPassword;
window.downloadReceipt = downloadReceipt;

// init
loadLoans();
loadUsers();
loadManualPayments();
setInterval(loadLoans, 5000);
setInterval(loadUsers, 10000);
setInterval(loadManualPayments, 8000);
