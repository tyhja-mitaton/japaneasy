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

**WARNING — tests must NEVER touch the working PostgreSQL DB.** Tests use `RefreshDatabase`, which runs `migrate:fresh` (drops ALL tables). `phpunit.xml` forces sqlite via `<server name="DB_CONNECTION" value="sqlite" force="true"/>` — `server` (not `env`) is required because Laravel's `env()` resolves `$_SERVER` first, where the container's `DB_CONNECTION=pgsql` lives. `tests/TestCase.php` has a guard that refuses to run unless the effective connection is sqlite. Do not change these.

**Dev server staleness:** the laravel container must be built with `target: dev` (docker-compose.yml). A production-stage build bakes opcache with `validate_timestamps=0`, so a long-running `artisan serve` silently ignores code changes (symptoms: new routes 404, "route could not be found"). If `docker compose build laravel` fails on network, `./backend/docker/php.dev.ini` is volume-mounted over the baked prod ini to keep opcache off.

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
