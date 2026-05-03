# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: Nafex Hub

Ghana's premier digital fashion marketplace. Allows fashion businesses to list themselves, users to discover and browse brands, and admins to verify businesses.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **State management**: Zustand (auth state)
- **Routing**: Wouter

## Artifacts

- `artifacts/nafex-hub` — React/Vite frontend at `/`
- `artifacts/api-server` — Express API server at `/api`

## Packages

- `lib/api-spec` — OpenAPI spec + Orval codegen config
- `lib/api-zod` — Generated Zod schemas from OpenAPI
- `lib/api-client-react` — Generated React Query hooks + custom fetch
- `lib/db` — Drizzle ORM schema + migrations

## Database Schema

- `users` — id, name, email, passwordHash, role (user/business_owner/admin), createdAt
- `businesses` — id, ownerId, name, category, description, location, phone, logo, images, isVerified, createdAt

## Frontend Pages

- `/` — Homepage with hero, stats, featured brands, CTA
- `/explore` — Browse all brands with search + category filter
- `/brand/:id` — Brand profile with collection gallery + WhatsApp contact
- `/list` — Form to list a new business
- `/admin` — Admin panel to verify/unverify businesses
- `/login` — Login form
- `/register` — Registration form with account type selector

## Auth

- Token-based: SHA256 password hash, base64 token stored in localStorage as `nafex_token`
- User JSON stored in `nafex_user` localStorage key
- Zustand store in `src/hooks/use-auth.ts`
- API client reads token via `setAuthTokenGetter` on mount in App.tsx

## API Routes

- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `GET /api/businesses` — List businesses (search, category, featured filters)
- `GET /api/businesses/featured` — Featured businesses
- `GET /api/businesses/:id` — Single business
- `POST /api/businesses` — Create business (auth required)
- `PUT /api/businesses/:id` — Update business (owner/admin)
- `DELETE /api/businesses/:id` — Delete business (owner/admin)
- `PUT /api/businesses/:id/verify` — Verify/unverify (admin)
- `GET /api/businesses/admin` — Admin list with all statuses
- `GET /api/stats/summary` — Total businesses, verified count, categories, featured count
- `GET /api/stats/categories` — Category breakdown

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Seeded Data

8 sample businesses: Kente Palace, Nana Styles, Abena Shoes, Gold Coast Accessories, Kofi Sneakers, Ama Threads, Osei Watch House, Volta Bags.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
