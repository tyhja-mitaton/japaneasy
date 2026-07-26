# JapanEasy Monorepo

## Project Structure

```
japaneasy/
├── frontend/      # Next.js 16 (React 19, TypeScript, Tailwind 4)
├── backend/       # Laravel 12 (PHP 8.3+, Sanctum auth, Spatie permissions)
├── nlp-service/   # FastAPI (Python, fugashi tokenizer, Anthropic SDK)
├── nginx/         # Reverse proxy config
└── docker-compose.yml
```

## Quick Start

```bash
docker compose up
```

Services: frontend(:3000), laravel(:8000), nlp(:8001), postgres(:5432), redis, nginx(:8080), mailpit(:8025)

## Backend (Laravel)

**Run tests:**
```bash
composer test          # clears config cache, then runs phpunit
```

**Dev (inside container or locally):**
```bash
composer dev           # runs artisan serve + queue:listen + pail + vite concurrently
```

**Database:** PostgreSQL in Docker, SQLite for local dev and tests. Migrations: `php artisan migrate`

**Auth flow:** Sanctum tokens, email verification required before login. Frontend stores token in localStorage, sends as `Authorization: Bearer <token>`.

**Roles:** Uses Spatie permission (roles: user, manager, administrator). Admin routes require `role:manager|administrator`.

## Frontend (Next.js)

```bash
npm run dev            # uses --turbopack
npm run build
npm run lint           # eslint
```

**API URL:** `NEXT_PUBLIC_API_URL` env var (default: `http://localhost:8000`)

**Important:** This is Next.js 16 with breaking changes from older versions. See `frontend/AGENTS.md` and `node_modules/next/dist/docs/` before writing code.

**Output mode:** `standalone` (configured in next.config.ts)

## NLP Service

FastAPI at `/nlp-service/main.py`. Endpoints: `/health`, `/analyze/word`, `/tokenize`, `/grammar`

Requires `LLM_API_KEY` env var (Anthropic).

## Environment Variables

Root `.env`:
- `DB_PASSWORD`, `DB_DATABASE`, `DB_USERNAME` - PostgreSQL
- `LLM_API_KEY` - Anthropic API key for NLP service

Production adds: `APP_KEY`, `APP_URL`, `STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`

## API Routes (Backend)

Public: `POST /api/auth/*` (register, login, forgot-password, reset-password), `GET /api/grammar-articles/*`

Protected (Sanctum): `/api/vocabulary/*`, `/api/texts/*`, `/api/dictionary/lookup`, `/api/auth/logout`, `/api/auth/me`

Admin only: `/api/admin/grammar-articles/*` (requires manager|administrator role)
