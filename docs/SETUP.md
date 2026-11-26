# Going live: setup guide

Front Street Makers has two parts:

| Part | What it does | Where it runs | Cost |
|---|---|---|---|
| **Website** (`src/` → `dist/`) | Every public page, the illustrated street, the forms, the admin screens | GitHub Pages | Free |
| **API** (`worker/`) | Stores applications and photos, admin sign-in, publishes approved businesses, daily rotation | Cloudflare Worker + D1 database + R2 photo storage | Free tier is enough to start |

Until the API is connected, the website runs in **demo mode**: sample stalls only, and forms and the admin dashboard keep everything in the visitor's own browser. The admin password in demo mode is `demo`.

---

## 1. Publish the website on GitHub Pages (about 5 minutes)

1. On GitHub, open the repository → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. The workflow `.github/workflows/deploy.yml` publishes the site each time `main` changes. To run it right away, open the **Actions** tab, choose **Deploy site to GitHub Pages**, then **Run workflow**.
4. **Custom domain**: still in Settings → Pages, enter `frontstreetmakers.com`, save, and tick **Enforce HTTPS** once it is available.
5. At your domain registrar, add these DNS records:
   - `A` records for `frontstreetmakers.com` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `lionelbuh.github.io`

   GitHub's guide: <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>

## 2. Create the API on Cloudflare (about 20 minutes)

**Easiest:** do it all in the browser with [CLOUDFLARE-DASHBOARD.md](CLOUDFLARE-DASHBOARD.md). The command-line steps below are an alternative.

You need a free Cloudflare account and Node.js 22 on your computer.

```bash
cd worker
npx wrangler login
```

**Database (D1):**

```bash
npx wrangler d1 create front-street-makers
```

Copy the `database_id` it prints into `worker/wrangler.toml` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`), then create the tables:

```bash
npx wrangler d1 execute front-street-makers --remote --file=schema.sql
```

**Photo storage (R2):** in the Cloudflare dashboard, open **R2** and enable it (the free tier needs a payment method on file), then:

```bash
npx wrangler r2 bucket create front-street-makers-photos
```

**Secrets** (each command asks for the value; never put them in a file):

```bash
npx wrangler secret put ADMIN_PASSWORD
```

```bash
npx wrangler secret put SESSION_SECRET
```

For `SESSION_SECRET`, use a long random string. For example, run `openssl rand -base64 48` and paste the result.

**Deploy:**

```bash
npx wrangler deploy
```

Wrangler prints the Worker address, for example `https://front-street-makers-api.<your-name>.workers.dev`. To use `https://api.frontstreetmakers.com` instead, add it as a **Custom Domain** on the Worker (Workers & Pages → the worker → Settings → Domains & Routes). The domain must be managed by Cloudflare for this.

## 3. Connect the website to the API

In `src/assets/js/app/config.js`, set:

```js
API_BASE: 'https://api.frontstreetmakers.com', // or the workers.dev address
```

Commit and push to `main`. The site redeploys, demo mode turns off, and the street shows only real approved businesses. The `ALLOWED_ORIGINS` value in `worker/wrangler.toml` must list the website's address. It already includes `https://frontstreetmakers.com` and the `www` version.

## 4. Optional extras

- **Spam protection (Cloudflare Turnstile):** create a Turnstile widget for the domain. Put the *site key* in `config.js` (`TURNSTILE_SITE_KEY`), and the *secret key* on the worker with `npx wrangler secret put TURNSTILE_SECRET`. Without it, the forms still use a hidden honeypot field, a timing check and a per-email daily limit.
- **Email when an application arrives:** create a free [Resend](https://resend.com) account and verify the domain, then set these worker secrets:
  - `RESEND_API_KEY`
  - `NOTIFY_EMAIL` (where to send the alerts)
  - `FROM_EMAIL` (for example `Front Street Makers <hello@frontstreetmakers.com>`)
- **Extra protection for /admin:** the dashboard is password-protected by the API. For a second lock, put the admin page and `/api/admin/*` behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) (free for up to 50 users).

## 5. Day-to-day

- **Review applications:** `https://frontstreetmakers.com/admin/`
  - Applications start as *New Application*, or *Assistance Requested* / *Requirements Being Clarified* when the licensing answers need follow-up.
  - Only **Approved for Publication** appears on the site.
- **Daily street:** in the admin, *Daily rotation* sets how many businesses stand on the street (1–10) and the welcome boost for new businesses. Pin a business from its application to feature it on chosen dates.
- **Sponsors:** edit `src/assets/js/market/sponsors.js` and put the sponsor's images in `src/assets/img/sponsors/`.
- **Removing someone's data:** open the business in the admin and use *Delete this business*. This removes the record and its photos.

## Running it locally

```bash
npm run serve          # builds dist/ and serves it at http://localhost:4173 (demo mode)
npm test               # rotation and API tests
npm run test:e2e       # full browser test (needs Playwright installed)
```

To run the API locally: `cd worker && npx wrangler dev`, then set `API_BASE: 'http://localhost:8787'` in `config.js` and add `http://localhost:4173` to `ALLOWED_ORIGINS`.
