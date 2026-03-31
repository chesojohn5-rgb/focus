const settingsForm = document.getElementById('settingsForm');
const statusEl = document.getElementById('settingsStatus');

const nameInput = document.getElementById('settingsName');
const surnameInput = document.getElementById('settingsSurname');
const emailInput = document.getElementById('settingsEmail');
const phoneInput = document.getElementById('settingsPhone');

function setStatus(message, isError) {
  if (!statusEl) return;
  statusEl.innerText = message || '';
  statusEl.style.color = isError ? '#dc2626' : '#16a34a';
}

function fillForm(user) {
  if (!user) return;
  if (nameInput) nameInput.value = user.name || '';
  if (surnameInput) surnameInput.value = user.surname || '';
  if (emailInput) emailInput.value = user.email || '';
  if (phoneInput) phoneInput.value = user.phone || '';
}

async function refreshProfile() {
  try {
    const res = await apiFetch('/api/auth/me', { method: 'GET' });
    if (res.status === 401) {
      localStorage.clear();
      goToPage('login');
      return;
    }
    if (!res.ok) return;
    const user = await res.json();
    localStorage.setItem('user', JSON.stringify(user));
    window.currentUser = user;
    fillForm(user);
  } catch (err) {
    // ignore network issues for now
  }
}

fillForm(window.currentUser);
refreshProfile();

if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');

    const payload = {
      name: nameInput ? nameInput.value.trim() : '',
      surname: surnameInput ? surnameInput.value.trim() : '',
      email: emailInput ? emailInput.value.trim() : '',
      phone: phoneInput ? phoneInput.value.trim() : ''
    };

    if (!payload.name || !payload.phone) {
      setStatus('Name and phone number are required.', true);
      return;
    }

    try {
      const res = await apiFetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.currentUser = data.user;
        fillForm(data.user);
        setStatus(data.message || 'Settings updated successfully.');
      } else if (res.status === 401) {
        localStorage.clear();
        goToPage('login');
      } else {
        setStatus(data.message || 'Unable to update settings.', true);
      }
    } catch (err) {
      setStatus('Settings service not available.', true);
    }
  });
}
