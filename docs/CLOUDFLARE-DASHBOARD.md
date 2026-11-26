# Create the API in the Cloudflare dashboard (no installation needed)

Everything below happens in your browser at <https://dash.cloudflare.com>. It takes about 20 minutes. The free plan is enough.

You will create four things and connect them:

| What | Name to use | Purpose |
|---|---|---|
| D1 database | `front-street-makers` | Applications, profiles, settings, stories |
| R2 bucket | `front-street-makers-photos` | Business photos |
| Worker | `front-street-makers-api` | The API itself |
| Secrets | `ADMIN_PASSWORD`, `SESSION_SECRET` | Admin sign-in |

---

## Step 1 — Database (D1), about 3 minutes

1. In the left menu, open **Storage & Databases → D1 SQL Database**.
2. Click **Create database**, name it `front-street-makers` and click **Create**.
3. Open the new database and go to the **Console** tab.
4. Open [`worker/schema-console.sql`](../worker/schema-console.sql) on GitHub, click **Copy raw file**, paste it into the console and click **Execute**. Use this file, not `schema.sql`: the console joins everything into one line, and the comments in `schema.sql` would then hide the commands.
5. Check the result: under **Tables** you should see `businesses`, `photos`, `stories`, `settings` and `audit`.

## Step 2 — Photo storage (R2), about 3 minutes

1. In the left menu, open **Storage & Databases → R2 Object Storage**.
2. The first time, Cloudflare asks you to subscribe to R2. The free tier is 10 GB, more than enough. A payment method on file is required, but you are not charged within the free tier.
3. Click **Create bucket**, name it `front-street-makers-photos`, and keep the defaults. Do **not** make the bucket public: the API serves photos itself, and only once a business is approved.

## Step 3 — The Worker, about 5 minutes

1. In the left menu, open **Compute (Workers) → Workers & Pages**, then click **Create → Create Worker** (or **Start with Hello World!**).
2. Name it `front-street-makers-api` and click **Deploy**.
3. Click **Edit code**. Delete everything in `worker.js`, then paste the whole content of [`worker/dist/worker.js`](../worker/dist/worker.js): on GitHub, click **Copy raw file**.
4. Click **Deploy** (top right).
5. Note the Worker's address shown on its page, for example `https://front-street-makers-api.YOURNAME.workers.dev`.

## Step 4 — Connect the database and the photos, about 3 minutes

On the Worker's page, open **Settings → Bindings → Add binding**:

1. **D1 database**: variable name `DB` (exactly, in capitals), database `front-street-makers`. Click **Add Binding**.
2. **R2 bucket**: variable name `PHOTOS`, bucket `front-street-makers-photos`. Click **Add Binding**.

## Step 5 — Settings and secrets, about 4 minutes

Still on **Settings**, under **Variables and Secrets**, click **Add** for each line:

| Type | Name | Value |
|---|---|---|
| Text | `ALLOWED_ORIGINS` | `https://frontstreetmakers.com,https://www.frontstreetmakers.com,https://lionelbuh.github.io` |
| Secret | `ADMIN_PASSWORD` | Your admin password: long, and not used anywhere else |
| Secret | `SESSION_SECRET` | A long random string (see below) |

For `SESSION_SECRET`, open a password generator (for example in your password manager), make a 48-character random password and paste it. You will never need to type it again.

Click **Deploy** to apply.

## Step 6 — Check it works, about 1 minute

Open `https://front-street-makers-api.YOURNAME.workers.dev/api/health` in your browser. You should see:

```
{"ok":true}
```

Then open `/api/market` at the same address. You should see `{"date":"…","businesses":[],"featured":[]…}`: empty is correct, as there are no approved businesses yet.

## Step 7 — Turn off demo mode

Send the Worker's address to the person maintaining the site, or set it yourself in [`src/assets/js/app/config.js`](../src/assets/js/app/config.js):

```js
API_BASE: 'https://front-street-makers-api.YOURNAME.workers.dev',
```

After the change reaches `main`, the site redeploys in about a minute and starts using the real database. Sign in at `/admin/` with your `ADMIN_PASSWORD`.

---

### Updating the Worker later

When the API code changes, `worker/dist/worker.js` is regenerated in the repository. Open the Worker → **Edit code**, paste the new file, then **Deploy**. Your database, photos and secrets stay as they are.

### If something goes wrong

| What you see | Likely cause |
|---|---|
| `/api/health` shows an error page | The code was not fully pasted. Paste it again and deploy. |
| `/api/market` says "Something went wrong" | The `DB` binding is missing or misnamed, or the schema was not run (step 1.4). |
| The site says it "could not reach" the API | `ALLOWED_ORIGINS` doesn't include the site's address exactly (no trailing slash). |
| Admin says the password "has not been configured" | `ADMIN_PASSWORD` or `SESSION_SECRET` is missing. |
| Photos fail to upload | The `PHOTOS` binding is missing. |
