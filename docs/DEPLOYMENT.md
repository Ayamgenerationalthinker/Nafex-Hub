# Nafex Hub Deployment Strategy

This application is built as a Monorepo containing a React SPA frontend (`artifacts/nafex-hub`) and a Node.js Express API (`artifacts/api-server`).

It natively supports two deployment topologies:
1. **Split Topology (Recommended)**: Vercel for Frontend, Railway for API + DB + Redis.
2. **Unified Container Topology**: Docker Compose for orchestrating all services together (usually for local development or traditional VPS deployments).

---

## 1. Environments & Branch Strategy

The repository utilizes a strict branch-based deployment strategy:
- `main` branch -> **Production Environment** (Live Data)
- `staging` branch -> **Staging Environment** (Testing Data)

Before merging any code to `main`, it must first be merged to `staging` to pass automated End-to-End tests and manual Quality Assurance.

---

## 2. Split Topology (Vercel + Railway)

This is the preferred setup for edge-cached UI delivery and dedicated backend resource allocation.

### A. Vercel (Frontend)
1. Import the repository into Vercel.
2. Configure **Production**:
   - Vercel automatically maps the `main` branch to Production.
   - Set the required Environment Variables in Vercel from `.env.example`.
3. Configure **Staging (Preview Environments)**:
   - Create a specific Environment Variable override for the `staging` environment in Vercel. 
   - Point `VITE_API_URL` to your Railway Staging API URL.
   - Any commit pushed to the `staging` branch will generate a Vercel Preview Deployment URL.

### B. Railway (API & Postgres)
1. Import the repository into Railway.
2. Create two separate **Environments** in your Railway project: `production` and `staging`.
3. Provision a **PostgreSQL** database and a **Redis** instance inside BOTH environments.
4. Railway will automatically inject `DATABASE_URL` and `REDIS_URL`.
5. Map the GitHub Trigger:
   - Map `main` branch -> `production` environment.
   - Map `staging` branch -> `staging` environment.
6. Run the database migration script locally against the Railway connection strings:
   ```bash
   $env:DATABASE_URL="<railway-staging-url>"; pnpm db:push
   $env:DATABASE_URL="<railway-production-url>"; pnpm db:push
   ```

---

## 3. Docker & Containerization

If you need to deploy the application on a traditional VPS (AWS EC2, DigitalOcean Droplet), or want complete operational parity locally, you can use the provided Docker setup.

### A. Multi-Stage Dockerfile
The included `Dockerfile` uses an Alpine Node.js base image and employs a two-stage build:
1. **Builder Stage**: Installs `pnpm`, compiles TypeScript, and bundles assets.
2. **Runner Stage**: Prunes all `devDependencies`, switches to a non-root user (`nodejs`) for security, and only copies the compiled assets, keeping the image incredibly lightweight and secure.

### B. Docker Compose (Local Testing)
To spin up the entire production-like environment on your machine (API + Postgres + Redis):

```bash
docker-compose up --build
```
This spins up:
- Node.js API (Port 5000)
- PostgreSQL Database (Port 5432)
- Redis Cache (Port 6379)

---

## 4. DevOps Security & CI Pipeline

### GitHub Actions Pipeline
Every push and Pull Request is gated by two primary workflows:
1. **`.github/workflows/ci.yml`**: Runs on all PRs.
   - Executes strict TypeScript compilation verification.
   - Performs a high-severity security audit (`pnpm audit`) to block vulnerable dependencies.
   - Runs backend/frontend Unit Tests (`vitest`).
   - Runs End-to-End browser tests (`playwright`) against a fully compiled local build.
2. **`.github/workflows/staging-deploy.yml`**: Runs on pushes to `staging`.
   - Triggers Vercel and Railway deployments to sync the staging environment.

### Environment Validations
The application utilizes Zod schema validation for environment variables at startup (`src/config/env.ts`). If a critical secret (like `JWT_SECRET` or `DATABASE_URL`) is missing in production, the server will crash instantly with a descriptive error rather than failing silently later.

### Secret Management
- `.gitignore` explicitly blocks `.env`, `.env.local`, and SQLite local databases to prevent credential leakage.
- Production credentials should be injected via your hosting provider's Secret Manager (Vercel/Railway), **never** hardcoded into files.

---

## 5. Mandatory Credential Rotation

Before launching your production instance, you **MUST** rotate all default credentials and keys used during development to prevent unauthorized access.

### 1. Database Credentials
If using Neon DB or Railway Postgres, navigate to the provider's dashboard and regenerate the primary `DATABASE_URL` password.

### 2. Application Secrets
Generate a new, cryptographically secure 256-bit string for your `JWT_SECRET`.
You can generate one locally via Node:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. API Keys & Email Delivery
Regenerate your production API keys for external services and update Vercel/Railway environment variables accordingly:
- **Resend** / **Gmail**: Rotate the `EMAIL_PASS` or generate a new App Password.
- **Paystack**: Rotate the `PAYSTACK_SECRET_KEY`.
- **Cloudinary/S3**: If used for image uploads, generate new access keys.
