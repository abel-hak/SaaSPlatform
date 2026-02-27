## Aurora Workspace – Multi-Tenant AI SaaS

Production-grade multi-tenant SaaS template with FastAPI, PostgreSQL RLS, Redis, Stripe billing, and a polished React + Vite + Tailwind frontend.

### Features

- **Multi-tenant architecture** with real PostgreSQL Row-Level Security (RLS)
- **Auth**: email/password, JWT access/refresh, password reset
- **Per-tenant AI assistant** using Groq + ChromaDB with streaming responses
- **Stripe billing**: Free / Pro / Enterprise plans, webhooks, customer portal
- **Usage meters** and plan-based feature flags across backend + UI
- **Audit log**, background document indexing, health/readiness endpoints

### Quickstart (Docker Compose)

```bash
cp .env.example .env
# fill in secrets (JWT, Stripe, GROQ_API_KEY, etc.)

docker compose up --build
```

Backend is available on `http://localhost:8000`, frontend on `http://localhost:5173` (after running `npm install && npm run dev` inside `frontend` if you prefer local dev).

### Tech Stack

- **Backend**: FastAPI, SQLAlchemy, Alembic, PostgreSQL 16, Redis 7, ChromaDB, Groq SDK, Stripe
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, lucide-react, react-router, react-hot-toast
- **Infra**: Docker Compose, health/readiness probes, `.env`-driven config

### Architecture Diagram

```text
                           +----------------------+
                           |      React App       |
                           |  Vite + TS + TW      |
                           +----------+-----------+
                                      |
                                      v
                         HTTPS / JSON + SSE (chat)
                                      |
                           +----------+-----------+
                           |      FastAPI         |
                           |  Auth, Billing, AI   |
                           +----------+-----------+
                                      |
          +---------------------------+-----------------------------+
          |                           |                             |
          v                           v                             v
 +-----------------+        +-------------------+        +-------------------+
 | PostgreSQL 16   |        |   Redis 7         |        |   ChromaDB        |
 | - Orgs / Users  |        | - Rate limiting   |        | - Per-org vectors |
 | - Docs / Msgs   |        | - Queues (future) |        | - RAG context     |
 | - Usage / Audit |        +-------------------+        +-------------------+
 | - RLS policies  |
 +--------+--------+
          |
          v
 +-----------------+
 |   Stripe        |
 | - Checkout      |
 | - Webhooks      |
 | - Customer      |
 |   Portal        |
 +-----------------+
```

### Database Overview

- `organizations`: tenants, Stripe IDs, current plan
- `users`: per-org users with roles (owner/admin/member)
- `invites`: email-based invites with tokens
- `documents`: uploaded docs per org (status, chunk counts)
- `conversations` & `messages`: chat history (Pro+)
- `usage`: per-org, per-period usage for AI queries, documents, seats
- `audit_log`: structured audit trail (invites, plan changes, limits, logins)
- `stripe_events`: idempotency store for Stripe webhooks

All tables with `org_id` have **RLS policies** bound to `current_setting('app.current_org_id')`.

### Backend Endpoints (high level)

- **Auth**: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/password/reset*`
- **Team**: `/team/` (list), `/team/invites`, `/team/members/{id}/role`, `/team/members/{id}`
- **Documents**: `/documents/`, `/documents/upload`, `/documents/{id}/status`, `/documents/{id}`
- **Assistant**: `/assistant/conversations`, `/assistant/chat` (SSE streaming via `EventSourceResponse`)
- **Usage**: `/usage/` – current usage, limits, warnings when >= 80%
- **Audit log**: `/audit-log/` – paginated, filterable (Pro+ only)
- **Billing**: `/billing/checkout-session`, `/billing/portal`, `/billing/webhook`
- **Settings**: `/settings/org`, `/settings/profile/password`
- **Health**: `/health`, `/ready`

### Frontend Highlights

- **Landing page**: Hero, feature highlights, polished pricing cards with Pro highlighted
- **Auth**: modern login/register with organization creation
- **Dashboard**: plan badge, usage meters, soft limit banners, quick actions
- **AI Assistant**: streaming chat UI, Pro+ conversation list, disabled input on limit hit
- **Documents**: drag & drop uploader with plan-aware disabling
- **Team**: seat-aware invite button, roles, removal, upgrade CTAs at limit
- **Billing**: plan cards wired to Stripe Checkout + Customer Portal
- **Audit log**: blurred preview on Free, full table on Pro/Enterprise

### Environment Variables

See `.env.example` for a full, documented list:

- **Core**: `APP_NAME`, `APP_ENV`, `APP_HOST`, `APP_PORT`
- **JWT**: `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- **Postgres**: `DATABASE_URL`, `POSTGRES_*`
- **Redis**: `REDIS_URL`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `STRIPE_CUSTOMER_PORTAL_RETURN_URL`
- **Groq**: `GROQ_API_KEY`
- **ChromaDB**: `CHROMA_PERSIST_DIRECTORY`
- **Frontend**: `FRONTEND_ORIGIN`

### License

MIT – free to use in your own projects and portfolios.

