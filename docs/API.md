# IQuest API — kontrakt

`apps/api` — Fastify 5 + PostgreSQL (Drizzle ORM), TypeScript. Frontendlar (`iquest-frontend`, `apps/tma`) shu kontraktga tayanadi.
Bu fayl yagona manba: endpoint o'zgarsa — shu faylni ham yangilang.

## Umumiy qoidalar
- JSON. Vaqtlar — ISO 8601 (UTC). Kun chegarasi (limitlar, "bugun") — Toshkent vaqti (`services/usage.ts` → `tashkentDay`).
- Auth: `Authorization: Bearer <token>` (JWT, 30 kun). Token `POST /auth/telegram` dan olinadi.
- Xatolar: `{ "error": "<kod>", "message"?: "..." }`. Kodlar: `validation` (400), `unauthorized` (401), `forbidden` (403),
  `not_found` (404), `conflict` (409), `limit_reached` (429 emas — **403**, `error:"limit_reached"`), `internal` (500).
- Kirish ma'lumotlari `zod` bilan tekshiriladi (`schema.parse(req.body)` → ZodError avtomatik 400 ga aylanadi).
- Biznes xatolari uchun `throw new HttpError(status, code, message?)` (`src/app.ts`).
- Joriy foydalanuvchi: route'da `{ preHandler: app.authenticate }`, keyin `req.userId` yoki `await currentUser(app, req)`.
- Admin route'lar: `{ preHandler: app.requireAdmin }` (ADMIN_TG_IDS).
- Foydalanuvchi har doim `toUserDto()` shaklida qaytadi (`src/lib/dto.ts`).
- Lang: `'uz' | 'ru' | 'kril'`. Lokallashgan matn: `{ uz, ru, kril }`.

## Umumiy servislar (`src/services/*`, tayyor — o'zgartirmang, faqat ishlating)
| Fayl | Nima |
|---|---|
| `settings.ts` | `getSettings(db)`, `setSetting(db,key,value)`, `deleteSetting`, `toPublicSettings(s)`, `DEFAULT_SETTINGS` (limitlar, chegirma, tariflar, referal milestone'lari, karta) |
| `pro.ts` | `isPro(user)`, `grantPro(db, userId, days)` — muddatni uzaytiradi |
| `usage.ts` | `getUsage(db,userId,kind)`, `incUsage(db,userId,kind,by)`, `tashkentDay()`; kind: `practice_questions` \| `iq_tests` |
| `notify.ts` | `notify(db, userId, { type, titleKey, body })` — ilova ichidagi bildirishnoma |
| `referrals.ts` | `applyReferralCode(db, newUserId, code)` — auth birinchi kirishda chaqiradi |

## Endpointlar

### auth (tayyor)
- `POST /auth/telegram` `{ initData, ref? }` → `{ token, user, settings }`. `start_param` (yoki `ref`) — referal kodi, faqat yangi foydalanuvchiga qo'llanadi.
- `POST /auth/dev` `{ tgId, firstName?, ref? }` → xuddi shu (faqat `NODE_ENV!=production`).
- `settings` shakli (frontend `res.settings.daily_test_limit.value` o'qiydi): `{ daily_test_limit:{value}, free_exam_count:{value}, free_ticket_count:{value}, discount, plans, referral_milestones, card }`.

### users — `routes/users.ts`
- `GET /me` → `{ user, settings, usage: { practiceQuestions, iqTests }, limits: { dailyTestLimit, freeExamCount, freeTicketCount } }`
- `PATCH /me` `{ firstName?, lastName?, phone?, lang? }` → `{ user }` (phone: `+998XXXXXXXXX` yoki bo'sh; ism ≤ 64 belgi)
- `GET /me/saved` → `{ items: [{ key, data, createdAt }] }` (yangi → eski)
- `PUT /me/saved/:key` `{ data }` → `{ ok: true }` (upsert; key ≤ 64, data ≤ 4 KB JSON; foydalanuvchiga ≤ 500 ta)
- `DELETE /me/saved/:key` → `{ ok: true }`

### referrals — `routes/referrals.ts` + `services/referrals.ts`
- `applyReferralCode`: kod egasini topadi; o'zini taklif qila olmaydi; `referrals` ga yozadi; `users.referredBy` o'rnatadi;
  taklif qiluvchining taklif soni `settings.referralMilestones` dagi `count` ga yetsa — `referralRewards` ga (bir marta) yozadi,
  `grantPro(days)` va `notify(type:'referral', titleKey:'referral')`.
- `GET /referrals/me` → `{ code, link: "https://t.me/<bot>?startapp=<code>", invited, rewards: [{milestone, days, createdAt}], next: {count, days} | null, history: [{ firstName, createdAt, rewarded: boolean }] }`
  (bot username — `BOT_USERNAME` env, standart `iquest_bot`; history ≤ 50, ism faqat birinchi harf + "***" emas — to'liq `firstName`, familiya yo'q)

### iq — `routes/iq.ts` (server tomonda ball, `@iquest/engine`)
- `POST /iq/sessions` `{ ageBand? }` → `{ sessionId, seed, formVersion, form }`. Bepul foydalanuvchi: kuniga `freeExamCount` ta
  (`iq_tests` usage) — oshsa 403 `limit_reached`. `form` = `buildForm(seed)` — 3×9 ball beriladigan bo'limlarda `answer` olib tashlanadi; `practice` itemlarida qoladi (mashq ekrani izoh ko'rsatadi, ballga kirmaydi). `seed` — 1..2³¹−1.
  Foydalanuvchida `active` sessiya bo'lsa (24 soatdan yangi) — o'sha qaytadi (limit sarflanmaydi).
- `GET /iq/sessions/:id` → `{ sessionId, status, seed, formVersion, form, result? }` (faqat egasi)
- `POST /iq/sessions/:id/submit` `{ answers: (number|null)[][], rtMs: number[][], blurCount?: number }` → `{ result }`.
  Server `buildForm(seed)` ni qayta quradi, `SessionState` yasaydi va `score()` bilan hisoblaydi (klient ballini ishonmaydi).
  Shakl: 3 bo'lim × 9; noto'g'ri o'lcham — 400. Ikki marta submit — 409. `results` ga `kind:'iq'` yoziladi, `users.xp` += correct×10.
  `notify(type:'result', titleKey:'notifResult')`.
- `GET /iq/history` → `{ items: [{ sessionId, finishedAt, band:{low,high}, style, correct, total }] }` (≤ 50)

### results — `routes/results.ts` (iquest-frontend mashq/to'plam natijalari)
- `POST /results` `{ kind: 'set'|'practice', setId?, correct, total, durationSec? }` → `{ result, xpGained, user }`
  (`0 ≤ correct ≤ total ≤ 100`; `kind:'set'` → `1 ≤ setId ≤ 100` majburiy; Pro emas va `setId > freeTicketCount` → 403 `forbidden`).
  xp = correct × 2 (to'plam) yoki correct × 1 (mashq). `kind:'practice'` → `practice_questions` usage += total.
- `POST /results/practice/check` → `{ allowed, used, limit }` (Pro: limit `null`, allowed true)
- `GET /results/sets` → `{ items: [{ setId, best: percent, attempts, lastAt }] }` — To'plamlar ekranidagi progress uchun

### stats — `routes/stats.ts`
- `GET /stats/me?period=all|week|month|year` → `{ totalQuestions, correct, wrong, correctPct, currentStreak, bestStreak,
  iq: { count, best: {low,high}|null, last: {low,high}|null, avgMid: number|null }, graph: [{ date:'YYYY-MM-DD', pct }] }`
  (graph — oxirgi 7 faol kun; streak — ketma-ket faol kunlar, Toshkent vaqti)
  Davr: week/month/year = oxirgi 7/30/365 Toshkent kuni (bugun ham); totals, `iq` (finishedAt bo'yicha) va graph'ga qo'llanadi, streak'lar — butun tarix. `pct` = round(100×correct/total), total=0 → 0.

### leaderboard — `routes/leaderboard.ts`
- `GET /leaderboard?period=day|week|month|all&limit=50` → `{ items: [{ rank, userId, name, avatar, xp, isMe }], me: { rank, xp } | null }`
  (`all` — `users.xp`; boshqalari — `results.xp` yig'indisi davr ichida; name = firstName + familiya bosh harfi; avatar = ism bosh harflari)
  day/week/month — Toshkent yarim tunidan 0/6/29 kun oldin boshlanadi; standart `week`. Rank noyob: teng xp'da kichik userId oldinda. 0 xp'lilar chiqarilmaydi.

### payments — `routes/payments.ts` + `routes/bot.ts`
- `GET /payments/plans` → `{ plans: [{ id, days, uzs, uzsFinal, stars }], discount: {...discount, applied}, card }` (chegirma `uzsFinal` ga qo'llanadi; faol bo'lsa va `endDate` o'tmagan bo'lsa)
- `POST /payments/stars/invoice` `{ plan }` → `{ paymentId, invoiceLink }` — Bot API `createInvoiceLink` (currency `XTR`, `payload` = noyob id, provider_token bo'sh). `payments` ga `pending`.
- `POST /payments/receipt` (multipart: `plan` maydoni + `file` — jpg/png/webp/pdf ≤ 5 MB) → `{ payment }` — `UPLOAD_DIR` ga saqlanadi, `card_receipt`, `pending`, summa = `uzsFinal`. Foydalanuvchida allaqachon `pending` chek bo'lsa — 409.
- `GET /payments/me` → `{ items: [...] }`
- `POST /bot/webhook` — Telegram update'lari. `X-Telegram-Bot-Api-Secret-Token` = `BOT_WEBHOOK_SECRET` bo'lmasa 401.
  `pre_checkout_query` → payload bo'yicha `pending` to'lovni tekshiradi (summa, XTR, to'lovchi `from.id` = to'lov egasi — boshqaga yuborilgan invoice rad etiladi), `answerPreCheckoutQuery(ok)`.
  `message.successful_payment` → idempotent: `telegram_payment_charge_id` bo'yicha; `paid`, `grantPro(plan.days)`, `notify(type:'payment')`.
  `/start <code>` xabari → Mini App tugmasi bilan javob (`sendMessage` + `web_app` inline tugma, `WEBAPP_URL` env).
- Bot API chaqiruvlari `src/lib/botApi.ts` orqali (`callBotApi(token, method, params)`; testlarda `fetch` mock qilinadi).

### admin — `routes/admin.ts` (hammasi `app.requireAdmin`)
- `GET /admin/payments?status=pending` → `{ items: [{ ...payment, user }] }`
- `POST /admin/payments/:id/approve` → `{ payment, user }` — faqat `pending`; `paid`, `grantPro`, `reviewedBy`, `notify`
- `POST /admin/payments/:id/reject` `{ note? }` → `{ payment }` + `notify`
- `GET /admin/payments/:id/receipt` → fayl oqimi (to'g'ri content-type)
- `GET /admin/settings` → `{ settings }` ; `PUT /admin/settings` `Partial<AppSettings>` (zod bilan har kalit tekshiriladi) → `{ settings }`
- `GET /admin/users?q=&limit=&offset=` → `{ items, total }` (q: ism, username, tgId bo'yicha)
- `POST /admin/users/:id/pro` `{ days }` → `{ user }` (qo'lda Pro berish; `days` 1..3650)
- `GET /admin/stats` → `{ users, proUsers, dau, iqTestsToday, revenue: { uzs, stars } }`
- `POST /admin/broadcast` `{ type, titleKey, body:{uz,ru,kril} }` → `{ sent }` (ilova ichidagi bildirishnoma — barcha foydalanuvchilarga)

### settings — `routes/settings.ts`
- `GET /settings/public` (auth shart emas) → `toPublicSettings(...)`

### notifications — `routes/notifications.ts`
- `GET /notifications?unread=1` → `{ items: [{ id, type, titleKey, body, read, createdAt }], unread }` (≤ 100)
- `POST /notifications/:id/read` → `{ ok }` ; `POST /notifications/read-all` → `{ ok, count }`
- `GET /notifications/prefs` → `{ daily, result, new, exam }` ; `PUT /notifications/prefs` (partial) → shu

## Testlar
- `vitest` + PGlite (in-process Postgres): `test/helpers.ts` → `makeTestApp()`, `login(app, tgId)`, `initDataFor()`.
- Har route fayli uchun `test/<nom>.test.ts`. Tarmoqqa chiqmaydi (`fetch` — `vi.spyOn(globalThis, 'fetch')`).
- Sxema: `src/db/schema.ts` → `pnpm --filter @iquest/api db:generate` → `drizzle/` migratsiyasi.
