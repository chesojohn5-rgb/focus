# GitHub Frontend Deploy

1. Open `LOAN SYSTEM/static/app_config.js`.
2. Change `apiBaseUrl` from `https://your-backend-domain.com` to your live backend URL before publishing.
3. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\build_github_frontend.ps1
```

4. Push the repo to GitHub.
5. In GitHub Pages, set the publishing source to `/docs`.

For the backend to accept login/session requests from the GitHub-hosted frontend later, set these backend environment variables on the backend host:

```env
FRONTEND_ORIGINS=https://your-username.github.io
SESSION_COOKIE_SAMESITE=None
SESSION_COOKIE_SECURE=true
FLASK_SECRET_KEY=replace-this-with-a-real-secret
```

If you use a GitHub project site instead of a user site, `FRONTEND_ORIGINS` is still the origin only, for example:

```env
FRONTEND_ORIGINS=https://your-username.github.io
```
