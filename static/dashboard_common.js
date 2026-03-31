// Common dashboard helpers (sidebar + logout + user badge)
let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem('user'));
} catch (err) {
  currentUser = null;
}

if (!currentUser) {
  goToPage('login');
}

window.currentUser = currentUser;

const userNameBadge = document.getElementById('userNameBadge');
if (userNameBadge && currentUser) {
  userNameBadge.innerText = currentUser.name || '';
}

function logout() {
  localStorage.clear();
  goToPage('login');
}

window.logout = logout;

const dashboardLink = document.getElementById('dashboardLink');
if (dashboardLink && currentUser) {
  const isAdmin = Number(currentUser.is_admin) === 1;
  dashboardLink.textContent = isAdmin ? 'Admin Panel' : 'Dashboard';
  dashboardLink.href = getPageUrl(isAdmin ? 'adminDashboard' : 'userDashboard');
}

// mobile sidebar toggle
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const navLinks = document.querySelector('.nav-links');

function setSidebar(open) {
  if (!sidebar) return;
  const next = (open === undefined) ? !sidebar.classList.contains('open') : open;
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
