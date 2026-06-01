# Nafex Hub — setup & deployment

Ghana marketplace monorepo: React frontend (`artifacts/nafex-hub`) + Express API (`artifacts/api-server`) + shared DB (`lib/db`).

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+
- PostgreSQL database

## 1. Install & configure

```bash
pnpm install
cp .env.example .env
# Edit .env — at minimum DATABASE_URL and Paystack keys for payments
```

## 2. Database

Push schema to your Postgres instance:

```bash
pnpm db:push
```

Create your first **admin** user: register on the site, then in SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## 3. Local development

**Terminal A — API (port 5000):**

```bash
pnpm --filter @workspace/api-server run build
$env:NODE_ENV="development"   # PowerShell
pnpm --filter @workspace/api-server run start
```

**Terminal B — Frontend (port 3000, proxies `/api` → 5000):**

```bash
pnpm dev:web
```

Open http://localhost:3000

## 4. Production build

```bash
pnpm run build
```

## 5. Deploy

### Vercel (recommended — frontend + API serverless)

1. Connect repo: https://github.com/Ayamgenerationalthinker/Nafex-Hub  
2. Set env vars from `.env.example` in the Vercel dashboard.  
3. Uses `vercel.json` — API routes rewrite to the bundled handler; static files from `artifacts/nafex-hub/dist/public`.

### Railway (full Node API + Postgres)

1. Add PostgreSQL plugin → `DATABASE_URL` is injected.  
2. Set `ALLOWED_ORIGIN` to your Vercel frontend URL if split deploy.  
3. Uses `railway.json` — runs `node artifacts/api-server/dist/index.mjs` and serves built frontend in production.

After deploy, run `pnpm db:push` against production `DATABASE_URL` once.

## Feature checklist

| Role | Flow |
|------|------|
| **Buyer** | Register → verify email → explore → cart → Paystack escrow → track order → confirm delivery / dispute |
| **Seller** | Register as business owner → list business → My Shop products → **Optimize listing** (AI) → dashboard orders → **Arrange delivery** → OTP confirm |
| **Admin** | `/admin` → verify businesses, deliveries/riders, disputes, payments, flash sales |

## Environment reference

See [.env.example](./.env.example) for all variables.

## Troubleshooting

- **CORS errors**: set `ALLOWED_ORIGIN` to your exact frontend URL (scheme + host, no trailing slash).  
- **Paystack**: both `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` required for live payments.  
- **Stale UI after deploy**: hard-refresh; PWA service worker uses `no-cache` on `sw.js` / `index.html`.  
- **Windows build**: use pnpm only (`preinstall` blocks npm/yarn).
