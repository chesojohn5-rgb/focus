(function () {
  const isGithubPages = /github\.io$/i.test(window.location.hostname);
  const defaultApiBaseUrl = isGithubPages ? 'https://api.loanexpresslimited.com' : 'http://127.0.0.1:5000';

  const appConfig = {
    apiBaseUrl: defaultApiBaseUrl,
    pages: {
      home: 'index.html',
      login: 'login.html',
      register: 'registration.html',
      userDashboard: 'user_dashboard.html',
      adminDashboard: 'admin_dashboard.html',
      settings: 'settings.html',
      about: 'about.html',
      contact: 'contact.html',
      payNow: 'pay_now.html',
      lencoCheckout: 'lenco_checkout.html',
      lencoReturn: 'lenco_return.html'
    }
  };

  function trimTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
  }

  function normalizePath(path) {
    const value = String(path || '');
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
  }

  function getApiUrl(path) {
    const cleanBase = trimTrailingSlash(appConfig.apiBaseUrl);
    const cleanPath = normalizePath(path);
    return cleanBase ? `${cleanBase}${cleanPath}` : cleanPath;
  }

  function resolveApiAssetUrl(value) {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return getApiUrl(value);
  }

  function getPageUrl(pageKey, query) {
    const page = appConfig.pages[pageKey] || pageKey || appConfig.pages.login;
    if (!query) return page;
    const params = new URLSearchParams(query);
    const queryString = params.toString();
    return queryString ? `${page}?${queryString}` : page;
  }

  function goToPage(pageKey, query) {
    window.location.href = getPageUrl(pageKey, query);
  }

  async function apiFetch(path, options) {
    const requestOptions = Object.assign({ credentials: 'include' }, options || {});
    return fetch(getApiUrl(path), requestOptions);
  }

  window.APP_CONFIG = appConfig;
  window.getApiUrl = getApiUrl;
  window.resolveApiAssetUrl = resolveApiAssetUrl;
  window.getPageUrl = getPageUrl;
  window.goToPage = goToPage;
  window.apiFetch = apiFetch;
})();
