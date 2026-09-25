# IQuest

Telegram Mini App: 15 daqiqalik IQ testi (mantiqiy fikrlash). Dizayn — [DESIGN.md](DESIGN.md) (v1.1),
tahlil — [docs/DESIGN-REVIEW.md](docs/DESIGN-REVIEW.md), paketlar kontrakti — [docs/CONTRACTS.md](docs/CONTRACTS.md).

## Tuzilma
| Yoʻl | Nima |
|---|---|
| `apps/tma` | Telegram Mini App (Preact + Vite) |
| `packages/engine` | savollar generatori, test sessiyasi, ball hisoblash, saqlash |
| `packages/ui` | komponentlar + `tokens.css` (mavzu) + `showcase/` |
| `packages/i18n` | uz-Latn / ru matnlar (ru alohida chunk'da yuklanadi) |
| `packages/tg` | `Telegram.WebApp` ustida yupqa qatlam |

## Buyruqlar
```sh
pnpm install
pnpm dev          # apps/tma dev server
pnpm build        # production build (apps/tma/dist)
pnpm test         # vitest
pnpm typecheck    # tsc
pnpm exec vite --config packages/ui/showcase/vite.config.ts   # komponentlar vitrinasi
```
Toʻlov uchun `VITE_INVOICE_URL` (bot yaratgan invoice havolasi) kerak.
