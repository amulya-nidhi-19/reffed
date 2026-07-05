# Reffed

Pre-interview reference-check platform for the India HR Tech market.

## Tech Stack

- **Framework**: Next.js 14 App Router (TypeScript, strict mode)
- **Database**: PostgreSQL (Neon serverless) via Prisma ORM
- **Auth**: Auth.js (NextAuth v5) with credentials + magic link
- **UI**: Tailwind CSS + shadcn/ui
- **Forms**: react-hook-form + zod
- **State**: Server Components first; TanStack Query for client-side
- **Background Jobs**: Inngest
- **AI**: Anthropic SDK (Claude Sonnet 4.5)
- **PDF**: @react-pdf/renderer
- **Package Manager**: pnpm

## Local Development Setup

### Prerequisites

- Node.js 20 LTS
- pnpm
- Neon Postgres account (for database)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd reffed-temp
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:
- `DATABASE_URL`: Your Neon Postgres connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: `http://localhost:3000`
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `INNGEST_EVENT_KEY`: Your Inngest event key
- `INNGEST_SIGNING_KEY`: Your Inngest signing key
- `WEBHOOK_DEFAULT_SECRET`: Generate a secure secret

4. Set up the database:
```bash
pnpm prisma generate
pnpm prisma migrate dev --name init
```

5. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Health Check

The `/api/health` endpoint returns `{ ok: true, db: "up" }` when the database is connected.

## Project Structure

```
/src
  /app
    /(marketing)  # Public marketing pages
    /(app)        # Authenticated app (tenant-scoped)
    /(referee)    # Unauthenticated referee form
    /api          # Route handlers
  /lib
    /db           # Prisma client + tenant-scoped query helpers
    /auth         # Auth.js config
    /email        # EmailProvider interface + mock impl
    /ai           # Anthropic client + PII-stripping helpers
    /pdf          # PDF templates + generator
    /webhooks     # HMAC signing + dispatcher
  /components    # Shared UI
/prisma          # Schema + migrations
/inngest         # Job definitions
```

## Coding Conventions

- No `any`. Strict TypeScript.
- All DB access goes through helpers in `/src/lib/db` that require a `tenantId`.
- Every route handler validates input with zod.
- Every mutation is idempotent OR returns a clear conflict error.
- Server Actions preferred over API routes for internal mutations.
- No client-side secrets. No `NEXT_PUBLIC_*` for anything sensitive.

