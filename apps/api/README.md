# @iquest/api

IQuest backend: Fastify 5 + PostgreSQL (Drizzle ORM), TypeScript. Endpointlar — [docs/API.md](../../docs/API.md).

## Ishga tushirish
```sh
cp .env.example .env            # BOT_TOKEN, DATABASE_URL, JWT_SECRET ni to'ldiring
pnpm install
pnpm --filter @iquest/api db:migrate
pnpm dev:api                    # repo ildizidan; http://localhost:3000/health
```
Telegram'siz sinash (production'da o'chiq): `POST /auth/dev {"tgId":1}` → token.

## Testlar
```sh
pnpm --filter @iquest/api test      # in-process Postgres (PGlite), tashqi bazasiz
pnpm --filter @iquest/api test:pg   # haqiqiy Postgres: TEST_DATABASE_URL (har fayl uchun vaqtinchalik baza)
```

## Tuzilma
| Yo'l | Nima |
|---|---|
| `src/app.ts` | ilova: plaginlar, `authenticate` / `requireAdmin`, xatolar |
| `src/routes/*` | endpointlar (auth, users, referrals, iq, results, stats, leaderboard, payments, bot, admin, settings, notifications) |
| `src/services/*` | umumiy mantiq: sozlamalar, Pro, limitlar, to'lov (`markPaid`), referal, IQ ball, statistika |
| `src/db/schema.ts` | jadvallar → `pnpm db:generate` → `drizzle/` migratsiyalar |

## Deploy
`render.yaml` (repo ildizi) — API + PostgreSQL. Dockerfile: `docker build -f apps/api/Dockerfile .`
Keyin bot webhook: `setWebhook(url=<API>/bot/webhook, secret_token=BOT_WEBHOOK_SECRET)`.
Admin: `ADMIN_TG_IDS` ga Telegram id.
