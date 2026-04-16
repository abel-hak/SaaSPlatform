# Aurora AI Platform

A production-grade, multi-tenant AI SaaS platform. Organizations upload their documents and chat with an AI assistant that answers questions grounded exclusively in their workspace data (RAG).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy 2, Alembic |
| **Database** | PostgreSQL 16 |
| **Cache / Rate Limiting** | Redis 7 |
| **Vector Store** | ChromaDB (persistent, per-tenant collections) |
| **AI / LLM** | Groq (default), OpenAI, Anthropic (BYOK) |
| **Embeddings** | `sentence-transformers` — `all-MiniLM-L6-v2` |
| **Billing** | Stripe (Checkout + Customer Portal + Webhooks) |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Containerisation** | Docker + Docker Compose |

---

## Features

- **Multi-tenant:** Every organization is fully isolated. Users, documents, conversations, and vector embeddings are scoped to their `org_id`.
- **RAG (Retrieval-Augmented Generation):** Documents are chunked, embedded, and stored in ChromaDB. Every AI query retrieves the most relevant chunks as context.
- **BYOK (Bring Your Own Key):** Organization owners can configure their own AI provider (Groq / OpenAI / Anthropic) and API key in Settings.
- **Conversation History:** Pro and Enterprise plans persist full chat history linked per user and org.
- **Document Management:** Upload PDF, Markdown, TXT, CSV, Python, JS/TS files (up to 10 MB). Docs are indexed in the background.
- **Team Management:** Invite members by email, assign roles (Owner / Admin / Member), manage seats.
- **Plan Enforcement:** Hard limits on AI queries, document uploads, and team seats enforced server-side per plan.
- **Audit Log:** Every significant action (login, upload, invite, plan change) is logged per org (Pro+).
- **API Keys:** Generate and revoke API keys for programmatic access.
- **Dark Mode:** Full ChatGPT-style dark mode with OS preference detection and persistent toggle.
- **Billing Portal:** Stripe-powered subscription management, plan upgrades, and invoice history.

---

## Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| AI queries / month | 50 | 500 | Unlimited |
| Documents | 5 | Unlimited | Unlimited |
| Team seats | 1 | 5 | Unlimited |
| Conversation history | ❌ | ✅ | ✅ |
| Audit log | ❌ | ✅ | ✅ |
| AI model | Llama 3.1 8B | Llama 3.1 8B | Llama 3.3 70B |

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker + Docker Compose

### 1. Clone & configure

```bash
git clone <your-repo-url>
cd SaaSPlatform
cp .env.example .env
# Edit .env with your real secrets (see Environment Variables section below)
```

### 2. Start infrastructure (Postgres + Redis)

```bash
docker-compose up postgres redis -d
```

### 3. Set up the backend

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**. The API runs at **http://localhost:8000**.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in each value:

```env
# Application
APP_NAME="Aurora AI Platform"
APP_ENV="development"

# JWT — generate a strong secret:  openssl rand -hex 32
JWT_SECRET="your-secret-here"
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database (matches docker-compose defaults)
DATABASE_URL="postgresql+psycopg2://saas_user:saas_password@localhost:5433/saas_db"

# Redis
REDIS_URL="redis://localhost:6379/0"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_PRO_MONTHLY="price_..."
STRIPE_PRICE_ENTERPRISE_MONTHLY="price_..."
STRIPE_CUSTOMER_PORTAL_RETURN_URL="http://localhost:5173/app/billing"

# AI — default provider
GROQ_API_KEY="gsk_..."

# ChromaDB
CHROMA_PERSIST_DIRECTORY="chroma_db"

# CORS
FRONTEND_ORIGIN="http://localhost:5173"
```

> ⚠️ Never commit your `.env` file. It is already in `.gitignore`.

---

## Database Migrations

This project uses **Alembic** for schema migrations.

```bash
# Apply all pending migrations
alembic upgrade head

# Create a new migration after changing models.py
alembic revision --autogenerate -m "describe your change"

# Rollback one migration
alembic downgrade -1
```

---

## API Reference

The FastAPI server auto-generates interactive docs:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new org + owner account |
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/usage/` | Get current month's usage metrics |
| GET | `/documents/` | List all org documents |
| POST | `/documents/upload` | Upload and index a document |
| DELETE | `/documents/{id}` | Delete document + vector embeddings |
| POST | `/assistant/chat` | Stream AI chat response (SSE) |
| GET | `/assistant/conversations` | List conversation history (Pro+) |
| GET | `/team/` | List team members + seats |
| POST | `/team/invites` | Invite a new member by email |
| GET | `/audit-log/` | List audit events (Pro+) |
| POST | `/billing/checkout-session` | Create Stripe checkout |
| POST | `/billing/webhook` | Stripe webhook receiver |
| GET | `/billing/portal` | Open Stripe customer portal |
| GET | `/api-keys/` | List API keys |
| POST | `/api-keys/` | Create a new API key |

---

## Project Structure

```
SaaSPlatform/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app + CORS + middleware
│       ├── config.py            # Settings + plan limits
│       ├── models.py            # SQLAlchemy ORM models
│       ├── schemas.py           # Pydantic request/response schemas
│       ├── db.py                # Database session factory
│       ├── security.py          # JWT + bcrypt helpers
│       ├── dependencies.py      # Auth dependencies + plan enforcement
│       ├── ai.py                # ChromaDB + RAG + LLM streaming
│       ├── audit.py             # Audit log helper
│       ├── redis_client.py      # Redis rate limiting
│       ├── email_service.py     # Email stub (replace for production)
│       ├── routes_auth.py
│       ├── routes_assistant.py
│       ├── routes_billing.py
│       ├── routes_documents.py
│       ├── routes_team.py
│       ├── routes_settings.py
│       ├── routes_usage.py
│       ├── routes_audit.py
│       └── routes_apikeys.py
├── frontend/
│   └── src/
│       ├── App.tsx              # Routes
│       ├── styles.css           # Global Tailwind + design tokens
│       ├── context/             # AuthContext, ThemeContext
│       ├── components/          # AppShell, UsageMeters, ConfirmDialog
│       ├── pages/               # One file per route
│       └── lib/
│           ├── api.ts           # Axios client + token refresh interceptor
│           └── types.ts         # Shared TypeScript types
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── alembic.ini
└── .env.example
```

---

## Docker (Full Stack)

To run the entire stack in Docker:

```bash
docker-compose up --build
```

> Note: In production, update `DATABASE_URL` and `REDIS_URL` in `.env` to point to the Docker service names (`postgres` and `redis`) rather than `localhost`.

---

## Production Checklist

- [ ] Replace `email_service.py` stubs with a real provider (Resend / SendGrid / AWS SES)
- [ ] Set `JWT_SECRET` to a cryptographically random value (`openssl rand -hex 32`)
- [ ] Set `APP_ENV=production` in `.env`
- [ ] Configure Stripe live keys and webhook endpoint
- [ ] Add an nginx reverse proxy (or use a platform like Railway / Render)
- [ ] Mount `chroma_db/` and `storage/` as persistent Docker volumes
- [ ] Enable HTTPS / TLS
- [ ] Set `FRONTEND_ORIGIN` to your production domain

---

## License

MIT
