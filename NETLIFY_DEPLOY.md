# Netlify Frontend Deploy

Use this repo for the Loan Express Limited frontend.

## Netlify settings

- Repository: `chesojohn5-rgb/focus`
- Branch: `main`
- Build command: leave empty
- Publish directory: `docs`

The `netlify.toml` file already sets those values.

## Domain

Add these custom domains in Netlify:

- `www.loanexpresslimited.com`
- `loanexpresslimited.com`

After Netlify gives you DNS records, update your domain DNS provider to point the domain to Netlify. Keep GitHub Pages active until Netlify preview works, then remove the GitHub Pages custom domain to avoid DNS/certificate conflicts.

## Backend API

The frontend is configured in `app_config.js` to call:

```text
https://api.loanexpresslimited.com
```

Point `api.loanexpresslimited.com` to the AWS backend after the backend is deployed.
