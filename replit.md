# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: Nafex Hub

Ghana's premier digital fashion marketplace. Allows fashion businesses to list themselves, users to discover and browse brands, message sellers, place orders, leave reviews, and sellers to manage their business via a dashboard with analytics.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (routes use `"zod"` directly, lib schemas use `"zod/v4"`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (ESM bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Recharts
- **State management**: Zustand (auth state)
- **Routing**: Wouter

## Artifacts

- `artifacts/nafex-hub` — React/Vite frontend at `/`
- `artifacts/api-server` — Express API server at `/api`

## Packages

- `lib/api-spec` — OpenAPI spec + Orval codegen config
- `lib/api-zod` — Generated Zod schemas from OpenAPI (zod client, mode: single, direct target path)
- `lib/api-client-react` — Generated React Query hooks + custom fetch (react-query client, mode: split)
- `lib/db` — Drizzle ORM schema + migrations

## Database Schema

- `users` — id, name, email, passwordHash, role (user/business_owner/admin), createdAt
- `businesses` — id, ownerId, name, category, description, location, phone, logo, images, isVerified, createdAt/updatedAt
- `reviews` — id, userId, businessId, rating (1-5), comment, createdAt
- `conversations` — id, userId, businessId, createdAt, updatedAt
- `messages` — id, conversationId, senderId, text, createdAt
- `orders` — id, userId, businessId, items (jsonb), totalPrice (cents), status, notes, createdAt/updatedAt
- `analytics_events` — id, businessId, userId, type (view/message/order), createdAt

## Frontend Pages

- `/` — Homepage with hero, stats, featured brands, CTA
- `/explore` — Browse all brands with search + category filter
- `/brand/:id` — Brand profile: collection gallery, reviews section, message/order buttons, analytics tracking
- `/list` — Form to list a new business
- `/admin` — Admin panel to verify/unverify businesses
- `/login` — Login form
- `/register` — Registration form with account type selector
- `/inbox` — In-app messaging with conversation list + real-time chat (5s polling)
- `/orders` — Order history with status progress tracker
- `/dashboard` — Seller dashboard: overview stats, order management, analytics charts

## Auth

- Token-based: SHA256 password hash, base64 token stored in localStorage as `nafex_token`
- User JSON stored in `nafex_user` localStorage key
- Zustand store in `src/hooks/use-auth.ts`
- API client reads token via `setAuthTokenGetter` on mount in App.tsx
- Auth middleware in `artifacts/api-server/src/lib/auth-middleware.ts` (requireAuth / optionalAuth)

## API Routes

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user

### Businesses
- `GET /api/businesses` — List businesses (search, category, verified filters)
- `GET /api/businesses/featured` — Featured businesses
- `GET /api/businesses/:id` — Single business
- `POST /api/businesses` — Create business (auth required)
- `PUT /api/businesses/:id` — Update business
- `DELETE /api/businesses/:id` — Delete business
- `PATCH /api/businesses/:id/verify` — Verify/unverify (admin)
- `GET /api/admin/businesses` — Admin list with all statuses

### Reviews
- `GET /api/businesses/:id/reviews` — Reviews for a business (with userName join)
- `POST /api/reviews` — Submit a review (auth required)

### Messaging
- `GET /api/conversations` — User's conversations (auth required)
- `POST /api/conversations` — Start or get conversation with a business (auth required)
- `GET /api/conversations/:id/messages` — Messages in a conversation (auth required)
- `POST /api/conversations/:id/messages` — Send a message (auth required)

### Orders
- `POST /api/orders` — Place an order (auth required)
- `GET /api/orders/user` — Current user's orders (auth required)
- `GET /api/orders/business` — Orders for user's business (auth required)
- `PATCH /api/orders/:id/status` — Update order status (auth required)

### Analytics
- `POST /api/analytics/track` — Track view/message/order event (optional auth)
- `GET /api/analytics/business/:businessId` — 30-day analytics for a business

### Stats & Dashboard
- `GET /api/stats/summary` — Platform summary statistics
- `GET /api/categories` — Category breakdown
- `GET /api/dashboard/stats` — Seller dashboard stats (auth required; includes businessId in response)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Important Notes

- **zod imports in api-server routes**: Use `from "zod"` NOT `from "zod/v4"` — esbuild cannot resolve `zod/v4` subpath
- **Orval barrel file**: `lib/api-zod` uses direct target path (no workspace) to avoid orval generating a broken barrel file. `lib/api-zod/src/index.ts` must export only `./generated/api`
- **dashboard/stats** returns an extra `businessId` field (not in OpenAPI spec) used by the frontend to query analytics
- Analytics tracking fires on every brand profile page load (view event), message start, and order creation

## Seeded Data

8 sample businesses: Kente Palace, Nana Styles, Abena Shoes, Gold Coast Accessories, Kofi Sneakers, Ama Threads, Osei Watch House, Volta Bags.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
