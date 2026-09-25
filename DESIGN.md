# IQuest — Dizayn

Versiya 1.1 · 2026-sentabr · Qamrov: Telegram Mini App (MVP), iquest.uz, share kartalar, sertifikat

> **1.1 o'zgarishlar** (asos va hisob-kitoblar: `docs/DESIGN-REVIEW.md`). Mahsulot egasi talabi — "tez ishlasin":
> - **Oqim qisqardi:** S1 (til) olib tashlandi — til Telegram `language_code`dan, S2/S3 da `Oʻz · Ру` chip; birinchi kirishda to'g'ridan-to'g'ri S3; yosh S9'dan S3'ga ko'chdi (< 18 — testdan **oldin** bilinadi); mashq 1 ta (2-si faqat 1-si xato bo'lsa); S8 va S9 bitta ekranga birlashdi. Birinchi savolgacha bosishlar: 8 → 5 (ekranlar: 6 → 3).
> - **Tezlik:** TMA'da tizim shrifti (Inter faqat brend, share, PDF, veb); budjet: birinchi savolgacha kritik yo'l ≤ 60 KB gzip; `telegram-web-app.js` — `defer`; savollar orasida siljish animatsiyasi yo'q.
> - **Tokenlar:** `--money` (yorug') #087F5B → #077350 (`--money-tint` ustida 4.38 → 5.13); yangi `--accent-fill-press`, `--control-edge`, `--font-brand`, `--matrix-cell`; qorong'i soyalarga 1px halqa.
> - **Maket:** S5 360px/≈610px balandlikda scrollsiz (matritsa katagi 88 → 76 → 64); sonlar qatori 28px; MVP'da pastki navigatsiya yo'q (BottomButton bilan to'qnashardi).
> - **Matnlar:** o'lchash rejimidagi ✅ olib tashlandi; `paywall.terms`, `result.pct`, `test.intro.integrity`, uslub tavsiflari aniqlashtirildi; yetishmagan kalitlar qo'shildi (§13).

---

## 0. Bu hujjat qanday ishlatiladi
- Asos — **DESIGN-SYSTEM.md** (1.1: repoda hali yo'q — u qo'shilguncha shu fayl va `tokens.css` yagona manba): rang rollari, tamoyillar, o'lchamlar va holat tizimi o'sha yerdan olinadi. Bu fayl faqat **IQuest mavzusi (qiymatlar)**, **IQuest'ga xos komponentlar**, **ekranlar** va **matnlar**ni belgilaydi.
- Komponentlar rangni faqat rol nomi bilan oladi (`var(--accent)`); hex qiymatlar faqat §3 jadvalida.
- Kod joyi: `packages/ui/tokens.css` (mavzu), `packages/ui/src/*` (komponentlar, API — `docs/CONTRACTS.md`).
- Asosiy tamoyillar (DESIGN-SYSTEM.md'dan): ekran bitta savolga javob beradi · tugma = amal fe'li · holat = rang + so'z · bitta aksent · kartalar chegarasiz (fon + yumshoq soya + katta radius), chiziq faqat ro'yxat/jadval ichida · tanlash = aksent halqa + ✓ + och fon · raqamlar tabular · telefon birinchi (390px, 360px'da tekshiriladi) · harakat faqat ma'no uchun · kontrast: matn ≥ 4.5:1, boshqaruv chegarasi ≥ 3:1 · **tezlik — dizayn qarori** (har yangi ekran/shrift/rasm o'z baytini oqlashi kerak).

---

## 1. Brend va ohang
- Nomi: **IQuest** ("IQ" + "quest" — aql sarguzashti).
- Ohang: **"Ilmiy. Iliq. Halol."** Foydalanuvchiga "siz" deb murojaat. O'yinqaroqlik faqat jumboq qatlamida. Hech qachon sharmanda qilmaydi, bo'rttirmaydi.
- Va'da (landing, test oldi ekrani, paywall'da ko'rinadi): **"Natija bepul. Yashirin obuna yoʻq."**
- Asosiy shior: **"Aqlingizni sinang, kuchli tomoningizni kashf eting."**
  Qo'shimcha: "IQuest — aqlingiz sarguzashti." · "Har kuni bir jumboq — har kuni bir qadam."
- Kripto tap-o'yinlaridan vizual masofa: tanga, "earn", neon, oltin, kazino animatsiyasi — yo'q.

### Logo
- Wordmark: `IQuest` — "IQ" og'irlik 800, "uest" 600; bitta rang (`--ink` yoki `--on-fill`).
- Belgi: "Q" harfi, dumi oldinga ketgan yo'l/strelka shaklida (quest). App ikonka: `--accent-fill` fonda oq Q, burchak radiusi 26.
- Minimal o'lcham 24px; atrofidagi bo'sh joy = Q balandligining yarmi.

---

## 2. Ikki rejim — eng muhim dizayn qoidasi

| | O'lchash rejimi (ball beriladigan test) | O'yin rejimi (mashq, kunlik jumboq) |
|---|---|---|
| Fikr-mulohaza | Yo'q — to'g'ri/noto'g'ri ko'rsatilmaydi | Darhol, qisqa izoh bilan |
| Rang | Neytral + aksent (faqat tanlash uchun) | Holat ranglari: to'g'ri — `--accent` ✓ + "Toʻgʻri"; noto'g'ri — `--danger` ✕ + "Unchalik emas" |
| Gamifikatsiya | Yo'q (ball, streak, konfetti yo'q) | Zanjir, nishonlar, milestone animatsiyasi |
| Taymer | Sokin; yashirish mumkin; faqat 1 daqiqa qolganda ogohlantirish | Ixtiyoriy |
| Telegram | fullscreen, swipe lock, yopishni tasdiqlash | Oddiy |

Sabab: test ichidagi har qanday "yashil = to'g'ri" signal o'lchovni buzadi. Shuning uchun IQuest aksenti **indigo**, yashil esa faqat pul/to'lov holati uchun.

---

## 3. Mavzu "Siyoh" (IQuest) — qiymatlar

DESIGN-SYSTEM.md rollari bilan. Mavzu A'dan farqi: aksent — indigo; `--money` — yashil; `--notice` — moviy.

| Rol | Yorug' | Qorong'i | Ishlatilishi |
|---|---|---|---|
| `--bg` | #F5F4FB | #121120 | sahifa foni |
| `--surface` | #FFFFFF | #1B1A2B | kartalar |
| `--soft` | #EEECF7 | #242338 | chip, ikkinchi darajali fon, "?" katak |
| `--soft-2` | #E6E3F2 | #2C2B42 | bosilgan fon |
| `--line` | #DEDBEA | #34324A | ro'yxat/jadval ichidagi chiziq |
| `--faint` | #ECEAF4 | #26253A | juda yengil ajratgich |
| `--field-line` | #CFCBE0 | #45425E | dekorativ chegara ("?" katak uzuq chizig'i). 1.1: boshqaruv chegarasi uchun emas (1.6:1) |
| `--control-edge` | #7F7B96 | #7A7696 | 1.1: checkbox, radio, input chegarasi (≥ 3:1) |
| `--ink` | #1D1B2E | #F1F0FA | asosiy matn, item grafikasi |
| `--ink-2` | #3A3752 | #CFCDE3 | ikkinchi darajali matn |
| `--muted` | #5E5B72 | #A4A1BA | izoh, meta |
| `--accent` | #4F3FD0 | #9C90FF | havola, tanlash halqasi, faol holat |
| `--accent-press` | #3F31B0 | #B3A9FF | bosilgan aksent |
| `--accent-fill` | #4F3FD0 | #6B5CF0 | asosiy tugma foni |
| `--accent-fill-press` | #3F31B0 | #5647D8 | 1.1: bosilgan asosiy tugma foni (`--accent-press` qorong'ida och — fon sifatida oq matn bilan 2.1:1) |
| `--accent-tint` | #ECEAFB | #26224A | aksent chip foni |
| `--selected-bg` | #F1EFFD | #231F45 | tanlangan variant foni |
| `--on-fill` | #FFFFFF | #FFFFFF | fill ustidagi matn |
| `--warn` / `--warn-tint` | #8A5A00 / #FBF1DD | #F2C46B / #3A2E12 | diqqat: ishonchsiz natija, 1 daqiqa qoldi |
| `--money` / `--money-tint` | #077350 / #E5F3EC | #5FD3A6 / #10302A | narx, to'lov, "sotib olingan" |
| `--notice` / `--notice-tint` | #0E6E8C / #E3F2F7 | #6CC6E0 / #0F2C36 | kutish/reja: rozilik kutilmoqda, me'yorlar tayyorlanmoqda |
| `--danger` / `--danger-tint` | #B42F35 / #FBE9EA | #FF8A8F / #3A1719 | xato, o'chirish |
| `--sh` | 0 1px 2px rgba(29,27,46,.06) | 0 0 0 1px rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.40) | kichik soya |
| `--sh-2` | 0 4px 16px rgba(29,27,46,.08) | 0 0 0 1px rgba(255,255,255,.06), 0 4px 16px rgba(0,0,0,.45) | karta |
| `--sh-3` | 0 12px 40px rgba(29,27,46,.14) | 0 0 0 1px rgba(255,255,255,.08), 0 12px 40px rgba(0,0,0,.55) | sheet, oyna |

Qorong'i soyalardagi 1px halqa (1.1): `--surface`/`--bg` = 1.09:1, qora soya qora fonda ko'rinmaydi — halqasiz variant plitkalari fonga singib ketadi.

Kontrast (WCAG 2.x, hisoblangan; to'liq jadval — `docs/DESIGN-REVIEW.md`): `--muted`/`--bg` 5.98 (qorong'i 7.44) · `--muted`/`--soft-2` 5.17 (eng past matn juftligi) · `--on-fill`/`--accent-fill` 7.11 (yorug'), 4.76 (qorong'i) · `--accent`/`--bg` 6.50 / 6.96 · `--money`/`--money-tint` 5.13 · `--money`/`--surface` 5.87 · `--notice`/`--notice-tint` 5.05 · `--warn`/`--warn-tint` 5.29 · `--control-edge`/`--soft` ≥ 3.47. Barcha matn juftliklari ≥ 4.5:1.

### Holat tizimi (DESIGN-SYSTEM.md bilan bir xil, yangi holat qo'shilmaydi)
| Holat | Rol | IQuest'da misol |
|---|---|---|
| bo'sh | neytral | hali test topshirilmagan |
| faol | `--accent` | test davom etmoqda, tanlangan variant |
| diqqat | `--warn` | "Natija ishonchsiz", "1 daqiqa qoldi" |
| to'lov kutilmoqda | `--money` | invoice ochildi, to'lov tasdiqlanmoqda |
| kutish/reja | `--notice` | "Ota-ona roziligi kutilmoqda", "Yosh meʼyorlari tayyorlanmoqda", "Dastlabki meʼyorlar" |
| xato | `--danger` | to'lov o'tmadi, tarmoq xatosi |
| ishlamaydi | xira + uzuq chiziq | qulflangan domen (kognitiv xarita, v1) |

### Telegram bilan bog'lash
- `colorScheme` → `data-theme="light|dark"`.
- `setHeaderColor`, `setBackgroundColor`, `setBottomBarColor` → `--bg` qiymati.
- BottomButton (MainButton): `color = --accent-fill`, `text_color = --on-fill`. SecondaryButton (S12 "Hozir emas"): `color = --soft`, `text_color = --ink`, `position = "top"`.
- BotFather loading screen foni: yorug' #F5F4FB, qorong'i #121120 (= `--bg`) — ochilishda oq "chaqnash" bo'lmasin.
- Telegram `themeParams` faqat zaxira sifatida; brend ranglari ustun.

---

## 4. Tipografiya va o'lchamlar

**Shrift (1.1):** TMA ichida — **tizim shrifti** (`--font`: system-ui → Android'da Roboto, iOS'da SF). 0 KB, FOUT va matn siljishi yo'q, Telegram'ning o'z UI'si bilan bir xil ko'rinadi; Roboto va SF `ʻ` (U+02BB), `ʼ` (U+02BC) va kirillni qamraydi, raqamlari tabular.
**Inter** (`--font-brand`) faqat: logo wordmark (SVG sifatida — shrift yuklanmaydi), iquest.uz, share kartalar va PDF (server tomonda Inter TTF). Veb uchun self-host, faqat `wght` o'qi, `unicode-range` bo'yicha: latin (U+02BB–02BC shu subsetda) 48 KB, cyrillic 19 KB, latin-ext (Ğ Ş — kelajak) 85 KB faqat kerak bo'lganda (Inter v20, `wght` 400–800, o'lchangan); `font-display: swap`, latin subset `preload`.
Og'irliklar tizim shriftida yaqiniga yaxlitlanadi (650 → 600/700, 800 → 700/900) — ierarxiya o'lcham bilan ham ushlab turiladi.

Ierarxiya og'irlik bilan, bitta oila:
| Token | O'lcham / og'irlik / qator | Qayerda |
|---|---|---|
| `display` | 40 / 800 / 1.1 | natija oralig'i (104–116) |
| `title-1` | 28 / 800 / 1.2 | sahifa sarlavhasi |
| `title-2` | 20 / 700 / 1.3 | karta sarlavhasi |
| `body` | 15 / 500 / 1.5 | asosiy matn |
| `body-s` | 13.5 / 500 / 1.45 | izoh, meta |
| `button` | 14.5 / 650 / 1 | tugmalar |
| `eyebrow` | 12 / 700 / 1.2, katta harf, +0.04em | eyebrow |
| `num` | `font-feature-settings: "tnum"` | taymer, oraliq, narx, progress |

- Radius: karta 20 · tugma, maydon va variant plitkasi 15 · chip 999 · sheet/oyna 26.
- Oraliqlar: 4, 8, 12, 16, 20, 24, 32, 40. Ekran chetidan 16.
- Tugma balandligi ≥ 50 (kichik 44); bosiladigan zona ≥ 44.
- Maket: dizayn eni 390px; 360–430px'da **va 360×610px foydali balandlikda** (o'rta Android: status bar + Telegram sarlavhasi + BottomButton + nav bar ayirilgandan keyin) tekshiriladi. TMA'da `--tg-safe-area-inset-*` va `--tg-content-safe-area-inset-*` hisobga olinadi.
- "Katta matn" rejimi (Sozlamalar): barcha matn ×1.15. Shuning uchun yonma-yon tugmalar va sarlavha+chip qatorlari `flex-wrap`/ustma-ust joylashuvga o'ta olishi shart (360px'da ikki tugma ≈ 140px dan — "Hisobotni olish" ×1.15 sig'maydi).

---

## 5. Harakat va haptika
- Faqat `transform` va `opacity`. 150–220ms, `cubic-bezier(.2,.8,.2,1)`.
- Ekranlar orasida: 12px siljish + opacity. **Savoldan savolga (S5 → S5): siljish yo'q**, faqat item maydonida ≤ 120ms opacity; javob → keyingi savol ≤ 100ms ichida chizilishi kerak (27 marta takrorlanadi — har 200ms kechikish 5+ s "sekinlik" beradi). Saqlash (CloudStorage) kutilmaydi — optimistik.
- **Natija ochilishi (cho'qqi lahzasi):** oraliq chizig'i markazdan yoyiladi (scaleX, 400ms) + `notificationOccurred('success')`. Raqamni "sanab chiqish" animatsiyasi yo'q — raqam bo'rttirilmaydi.
- Haptika: variant tanlash → `selectionChanged()`; "Keyingi" → `impactOccurred('light')`; bo'lim tugashi → `notificationOccurred('success')`; xato → `notificationOccurred('error')`.
- `prefers-reduced-motion` yoki Android LOW performance class → animatsiyalar o'chadi.

---

## 6. Ikonkalar va item grafikasi
- Ikonkalar: Lucide, chiziq 1.75px, 20/24px. Emoji faqat kognitiv uslub nishonlarida va share matnlarida.
- **Test itemlari (SVG):**
  - monoxrom: chiziq `currentColor` (`--ink`) 2px; to'ldirish: bo'sh / to'liq / 45° diagonal chiziqlar; fon `--surface`;
  - **qoidalar hech qachon rangga bog'liq emas** (rang ko'rligi uchun xavfsiz);
  - item 1:1 nisbatda; barcha variantlar bir xil o'lchamda;
  - qorong'i mavzuda `currentColor` orqali avtomatik moslashadi.
- Matritsa: 3×3, katak `--matrix-cell` (88px; viewport balandligi ≤ 720px → 76px; ≤ 620px → 64px), kataklar orasi `--matrix-gap` 6px, karta ichki cheti 8px, oxirgi katak "?" — `--soft` fon, `--field-line` uzuq chiziq, "?" `--muted`. Eni 360px'da ham sig'adi (3×88+2×6+16 = 292px ≤ 328px); cheklovchi o'lcham — **balandlik**.
- Sonlar qatori: `title-1` (28px/800) tabular raqamlar, vergul bilan ajratilgan, oxirida "?" chip; 328px'ga sig'masa qator bo'linadi (40px `display`da "2, 6, 12, 20, 30, ?" ≈ 430px — 360px ekranga sig'maydi).

---

## 7. Komponentlar (IQuest'ga xos)

| Komponent | Tavsif | Holatlar |
|---|---|---|
| `Button` | primary (`--accent-fill`), secondary (`--soft` fon), ghost (matn). Matn — fe'l: "Boshlash", "Ulashish", "Hisobotni olish" | default, press, disabled, loading |
| `OptionTile` | test varianti (SVG yoki son). Joylashuv (ustun × qator, oraliq `--tile-gap` 8px): matritsa 4×2 (360px'da plitka ≈ 76px), qator 3×2, fazo 3 ustun (3+2) — `OptionGrid columns` bilan bir xil (ro'yxat emas) | default · bosilgan (`--soft-2`) · **tanlangan: 2px `--accent` halqa + burchakda ✓ + `--selected-bg`** · fokus (2px `--accent` tashqi halqa, 2px oraliq) · disabled (vaqt tugaganda) |
| `MatrixGrid` | 3×3 item, "?" katak | — |
| `SeriesRow` | sonlar qatori + "?" | — |
| `SectionProgress` | "1/3-boʻlim · 4/9" + 9 segmentli chiziq (6px) | `role="progressbar"`, `aria-valuenow/max`; bo'sh segment dekorativ — ma'no "4/9" matnida |
| `CalmTimer` | kichik halqa + mm:ss; "Vaqtni yashirish" / "Vaqtni koʻrsatish" tugmasi (44px) | normal · warn (`--warn` + "1 daqiqa qoldi", yashirin bo'lsa ham ko'rinadi) · yashirin · tugadi (`test.timeup`). Har soniya e'lon qilinmaydi: `aria-live` faqat warn'da, `polite` |
| `ScoreBandCard` | `display` oraliq "104–116"; normal taqsimot egri chizig'i (SVG, `aria-hidden`) ustida aksent bilan belgilangan oraliq; "Har 100 kishidan taxminan 61–86 nafaridan yuqori" (IQ 104 ≈ 61-, 116 ≈ 86-persentil; μ=100, σ=15); holat chipi "Dastlabki meʼyorlar" (`--notice`) | normal · `unreliable` (`--warn` karta, raqamsiz) · `age_pending` (`--notice` karta, raqamsiz) |
| `StyleBadge` | katta emoji (44px) + kognitiv uslub nomi + bir qator tavsif. Emoji `aria-hidden`; eski Android (≤ 9) 🧊 ni ko'rsatmaydi — 4 ta emoji inline SVG sifatida (≈ 1–2 KB) | — |
| `StrengthBars` | 3 gorizontal chiziq (keyin 5): Naqsh, Raqamlar, Fazo. Yonida so'z: "kuchli" / "oʻrtacha" / "oʻsish zonasi" (1.1: "rivojlanish zonasi" 360px'da kesilardi). Raqam yo'q; SR uchun "Naqsh: kuchli" | — |
| `PaywallCard` | sarlavha + narx (`--money`) + 4 ta ✓ band (Lucide `check`, `--accent`) + `paywall.terms` + ikkita **teng vaznli** tugma (bir xil `secondary`, bir xil o'lcham; 360px yoki "Katta matn"da ustma-ust) | yashirin (past yoki ishonchsiz natijada) · to'lov kutilmoqda · sotib olingan ("Hisobotni ochish") |
| `ShareSheet` | karta preview + "Faqat uslubim / Ballim bilan" tanlovi + 3 kanal | preview yuklanmoqda (`Skeleton` 1:1) · xato ("Qayta urinish") |
| `ConsentSheet` | 1.1: S3 ichida inline blok (sheet ochib-yopish = +1 bosish); qisqa rozilik matni + "Toʻliq matn" havolasi + checkbox (`--control-edge`, 24px belgi, 44px bosish zonasi) | checkbox belgilanmaguncha asosiy tugma disabled |
| `StatusChip` | rang + so'z (hech qachon faqat rang); balandlik 24px, bosilmaydi; `neutral` = `--soft` fon + `--ink-2` | §3 holatlari |
| `ObjectCard` | test/natija kartasi, ≤ 5 ma'no o'rni: sarlavha, meta, holat chipi, progress, amal | — |
| `PageHeader` | eyebrow + sarlavha + holat chipi | — |
| `EmptyState` | ikonka + bitta jumla + bitta fe'l-tugma | — |
| `Skeleton` | `--soft` bloklar, shimmer yo'q. Faqat tarmoq kutilganda (to'lov, share rasm, tarix); 150ms dan keyin ko'rinadi (tez javobda miltillamasin). Test va natija lokal — ularda skeleton bo'lmaydi | — |
| `Banner` (1.1) | tarmoq yo'q / saqlanmadi: `--danger-tint` yoki `--notice-tint` qator + so'z + "Qayta urinish" | offline · xato |
| v1: `StreakChip`, `PuzzleCard`, `QuestMap` (kognitiv xarita, 5 hudud), `LeagueRow` (harakat ochkolari) | | |

### Kognitiv uslublar (`style_label`)
Eng kuchli subskal bo'yicha; o'yinqaroq tavsif, shaxsiyat turi emas.
| Kalit | Nomi | Tavsif |
|---|---|---|
| `pattern` | Naqsh ovchisi 🧩 | Qonuniyat va naqshlarni tez ilgʻaysiz |
| `numbers` | Raqamlar ustasi 🔢 | Sonlar orasidagi bogʻliqlikni tez payqaysiz |
| `spatial` | Fazoviy meʼmor 🧊 | Shakllarni xayolda aylantirishda kuchlisiz |
| `balanced` | Muvozanatli fikrlovchi ⚖️ | Barcha yoʻnalishlarda bir tekis kuchlisiz |
| v1: `memory` | Xotira qoʻriqchisi 🧠 | — |
| v1: `speed` | Chaqqon fikr ⚡ | — |

---

## 8. Navigatsiya (TMA)
- Pastki navigatsiya (3 ta): **Bosh sahifa · Natijalarim · Profil** — **v1** (1.1). MVP'da yo'q: S2'da BottomButton "Testni boshlash" bilan ustma-ust ikki pastki panel ≈ 120px oladi, MVP'da esa yuqori darajali manzil 2 ta. MVP: S2'dagi "Natijalarim" kartasi + PageHeader o'ngida sozlamalar ikonkasi (44px).
- Orqaga: Telegram `BackButton`. Test ichida bosilsa → "Testni toʻxtatasizmi? Javoblaringiz saqlanadi." ["Davom etish"] ["Toʻxtatish"].
- Sahifa sarlavhasi: `PageHeader` (eyebrow + sarlavha + holat chipi).

---

## 9. Ekranlar — Telegram Mini App (MVP)

Har ekran bitta savolga javob beradi. "Tugma" ustuni — Telegram BottomButton matni.

**1.1 oqim:** birinchi kirish: S0 → S3 → S4 (1 ta) → S5. Qaytgan foydalanuvchi: S0 → S2. Birinchi savolgacha: 5 bosish (yosh chipi · rozilik checkbox'i · Boshlash · mashq varianti · Tushunarli); 1.0 da 8 bosish va 6 ekran edi (yosh esa testdan keyin yana 1).

| # | Ekran | Qaysi savolga javob beradi | Tarkibi (yuqoridan pastga) | Tugma |
|---|---|---|---|---|
| S0 | Yuklanish | — | BotFather loading screen (logo, fon = `--bg`) → `index.html` ichidagi inline shell (fon + logo SVG, ≤ 2 KB) → ilova; `ready()` birinchi chizilgan kadrdan keyin darhol. Spinner yo'q | — |
| ~~S1~~ | ~~Til tanlash~~ (1.1: olib tashlandi) | — | Til: `initDataUnsafe.user.language_code` — `ru`, `uk`, `be`, `kk`, `ky`, `tg` → ru; qolgan hammasi → uz-Latn. O'zgartirish: S2/S3 PageHeader'da `Oʻz · Ру` chip (bir bosish) va S16 | — |
| S2 | Bosh sahifa (qaytganlar uchun) | Nima qilaman? | PageHeader "IQuest" + til chip + sozlamalar ikonkasi; asosiy `ObjectCard`: "IQ testi: mantiqiy fikrlash" · "15 daqiqa · 27 ta savol" · chip **Bepul** (`accent`); tugallanmagan test bo'lsa — "Davom ettirish" kartasi; "Natijalarim" kartasi (bo'lsa). v1: kunlik jumboq, kognitiv xarita | **Testni boshlash** |
| S3 | Test haqida | Nimaga tayyorlanay? | 3 qator: ⏱ 15 daqiqa · 3 boʻlim · 27 ta savol; 🎁 Asosiy natija bepul; 🤫 Tinch joy, yordamsiz. Integrity ogohlantirishi. **Yosh oralig'i** (chiplar, majburiy; 1.1: S9'dan ko'chdi) — < 18 → S18 testdan oldin; 13–15 → "meʼyorlar tayyorlanmoqda" oldindan aytiladi. Birinchi marta — rozilik S3 ichida (qisqa matn + "Toʻliq matn" + checkbox), alohida sheet emas. Ikkinchi darajali: "Keyinroq eslatish" (shu yerda `requestWriteAccess`) | **Boshlash** (yosh tanlanmaguncha disabled) |
| S4 | Mashq (1 ta; 1.1) | Savol qanday ishlaydi? | Bitta matritsa item + variantlar; tanlangach darhol izoh (faqat mashqda). Xato bo'lsa — 2-mashq (`practice[1]`). 2- va 3-bo'lim formati S6'da bitta statik namuna rasm bilan tushuntiriladi | **Tushunarli** |
| S5 | Savol | Qaysi variant to'g'ri? | Wireframe pastda | **Keyingi** (variant tanlanganda faol); bo'limning 9-savolida **Boʻlimni yakunlash**, testning oxirgisida **Testni yakunlash** |
| S6 | Tanaffus | Qancha qoldi? | "1-boʻlim yakunlandi." (belgi — Lucide `check`, `--accent`; ✅ emas — yashil o'lchash rejimida taqiqlangan, §2); keyingi bo'lim nomi, vaqti va bitta namuna rasm; taymer to'xtagan | **Davom etish** |
| S7 | Davom ettirish | Qayerda to'xtadim? | "Testingiz saqlangan. 2-boʻlimning 4-savolidan davom etasiz." | **Davom etish** |
| S8 | Yakun (1.1: S8 + S9 birlashdi) | Natijadan oldin nima qolgan? | "Barakalla! 27 ta savolga 14 daqiqada javob berdingiz." + success haptika; bitta ixtiyoriy savol: "Test davomida chalgʻitildingizmi?" — chiplar **Yoʻq · Biroz · Ha** (natijadan oldin — natijani ko'rib javobni o'zgartirmasin). Natija kodi shu ekran ochilganda oldindan yuklangan | **Natijani koʻrish** |
| ~~S9~~ | ~~Qisqa savollar~~ (1.1) | — | Yosh → S3. Viloyat va ta'lim (ixtiyoriy) → S10'da strength'lardan keyin karta: "Meʼyorlarni aniqlashtirishga yordam bering" (2 ta select, "Yuborish") | — |
| S10 | Natija | Mening natijam qanday? | Wireframe pastda | **Natijani ulashish** |
| S11 | Ulashish | Qanday ulashaman? | Karta preview; tanlov: **Faqat uslubim** (standart) / Ballim bilan; kanallar: Chatga yuborish (`shareMessage`), Story (`shareToStory`), Rasmni saqlash (`downloadFile`) | **Doʻstlarga yuborish** |
| S12 | Batafsil hisobot (tanlov) | Pullik hisobotda nima bor? | Tarkib ro'yxati (xira qilingan "yashirin" kontent yo'q); narx `--money`; `paywall.terms`. Ikkinchi, teng vaznli: "Hozir emas" — Telegram **SecondaryButton** (§3), sahifa ichidagi ghost havola emas | **Hisobotni olish · 150 ⭐** |
| S13 | To'lov natijasi | To'lov o'tdimi? | Muvaffaqiyat → hisobot ochiladi. `pending` → `--money` chip "Toʻlov tasdiqlanmoqda". Xato → `--danger` + "Qayta urinish" | **Hisobotni ochish** |
| S14 | Batafsil hisobot | Batafsil nimalar? | Har bo'lim tahlili; vaqt va aniqlik; 4 haftalik mashq rejasi; AI izohi | **PDF yuklab olish** |
| S15 | Natijalarim / Profil | Mening tarixim? | Natijalar ro'yxati (`ObjectCard`); xaridlar; qayta test sanasi ("90 kundan keyin"). v1: kognitiv xarita, zanjir | — |
| S16 | Sozlamalar | Qanday sozlayman? | Til; bildirishnomalar (kategoriya + vaqt); katta matn; maxfiylik; **Maʼlumotlarimni oʻchirish** (`--danger`, tasdiqlash oynasi bilan) | — |
| S17 | Metodika | Test qanday ishlaydi? | Nima o'lchanadi / o'lchanmaydi; me'yorlar versiyasi va sanasi; cheklovlar; "Biz nimani daʼvo qilmaymiz" ro'yxati; qayta testda amaliyot effekti | — |
| S18 | Ota-ona roziligi (< 18) | Davom etish uchun nima kerak? | 1.1: S3'dan (testdan **oldin**) ochiladi. Qisqa tushuntirish; holat chipi "Kutilmoqda" (`--notice`); rozilik kelguncha natija saqlanmaydi | **Ota-onamga yuborish** |
| S19 | Yordam | Savolim bor | FAQ + aloqa | — |

### S5 — Savol (390px)
```
┌──────────────────────────────────┐
│ NAQSH · 1/3-BOʻLIM       ◔ 03:42 │ ← eyebrow + CalmTimer
│ ▰▰▰▰▱▱▱▱▱               4/9      │ ← SectionProgress
│                                  │
│       ┌─────┬─────┬─────┐        │
│       │  ○  │ ○○  │ ○○○ │        │
│       ├─────┼─────┼─────┤        │ ← MatrixGrid 3×3
│       │  □  │ □□  │ □□□ │        │
│       ├─────┼─────┼─────┤        │
│       │  △  │ △△  │  ?  │        │
│       └─────┴─────┴─────┘        │
│                                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│  │    │ │    │ │ ✓  │ │    │     │ ← OptionTile 2×4
│  └────┘ └────┘ └────┘ └────┘     │   (tanlangan: halqa + ✓ + selected-bg)
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│  │    │ │    │ │    │ │    │     │
│  └────┘ └────┘ └────┘ └────┘     │
│             Bilmayman            │ ← ghost; javobsiz o'tkazadi
├──────────────────────────────────┤
│           [ Keyingi ]            │ ← Telegram BottomButton
└──────────────────────────────────┘
```
Fullscreen, swipe lock, yopishni tasdiqlash yoqilgan. To'g'ri/noto'g'ri belgisi yo'q.

Balandlik budjeti (1.1, 360px eni, `--matrix-cell` 76px): 8 + sarlavha qatori 44 + progress 6 + 12 + matritsa 256 + 12 + variantlar 160 + 4 + "Bilmayman" 44 + 8 ≈ **554px** — o'rta Android'da foydali ≈ 610px ga scrollsiz sig'adi. 1.0 dagi 88px katak va 16px oraliqlar bilan ≈ 690px edi (variantlarning 2-qatori ekrandan tashqarida). Fullscreen'da CalmTimer `--safe-top` ostida — Telegram'ning yuqori o'ng "⋯" tugmasi ustiga tushmaydi.

### S10 — Natija (390px)
```
┌──────────────────────────────────┐
│ IQ TESTI · 25-SENTABR            │
│ Natijangiz   [Dastlabki meʼyorlar]│ ← PageHeader + notice chip
│ Barakalla! 27 ta savolga         │
│ 14 daqiqada javob berdingiz.     │
│ ┌──────────────────────────────┐ │
│ │ 🧩  Naqsh ovchisi             │ │ ← StyleBadge
│ │ Qonuniyat va naqshlarni tez   │ │
│ │ ilgʻaysiz                     │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Taxminiy IQ oraligʻi          │ │ ← ScoreBandCard
│ │         104–116               │ │
│ │     ╱‾‾‾‾[█████]‾‾‾‾╲         │ │
│ │ Har 100 kishidan taxminan     │ │
│ │ 61–86 nafaridan yuqori        │ │
│ └──────────────────────────────┘ │
│ Qobiliyatlaringiz                │
│ Naqsh     ██████████  kuchli     │ ← StrengthBars
│ Raqamlar  ███████     oʻrtacha   │
│ Fazo      █████   oʻsish zonasi  │
│ ▸ Bu natija nimani anglatadi?    │ ← accordion
│ ▸ Keyingi qadamlar               │
│ ┌──────────────────────────────┐ │
│ │ Batafsil hisobot · 150 ⭐     │ │ ← PaywallCard (eng pastda)
│ │ ✓ 3 boʻlim tahlili ✓ vaqt/aniqlik│
│ │ ✓ 4 haftalik reja ✓ PDF       │ │
│ │ Bir martalik. Obuna emas.     │ │
│ │ [Hisobotni olish] [Hozir emas]│ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│       [ Natijani ulashish ]      │ ← BottomButton
└──────────────────────────────────┘
```

**S10 variantlari:**
| Variant | Farqi |
|---|---|
| Ishonchsiz (`reliability=low`) | ScoreBandCard o'rniga `--warn` karta: "Baʼzi javoblar juda tez berildi, shuning uchun bu natija ishonchli emas. Tinch sharoitda qayta urinib koʻrasizmi?" · tugma **Qayta topshirish** · PaywallCard va raqam yo'q |
| Past oraliq (taxminan 16-persentildan past) | Avval kuchli tomon va sharoit izohi; PaywallCard **ko'rsatilmaydi**; "Natija haqida qaygʻuryapsizmi?" havolasi; qayta test yo'li |
| Yosh kutilmoqda (13–15) | ScoreBandCard o'rniga `--notice` karta: "Yoshingiz uchun meʼyorlar tayyorlanmoqda. Tayyor boʻlganda xabar beramiz." Kuchli tomonlar profili ko'rsatiladi |
| Yuqori oraliq | "Daho" kabi yorliq yo'q; oraliq va sharoit izohi baribir ko'rsatiladi |

---

## 10. Veb sahifalar (iquest.uz)

| Yo'l | Bosqich | Tarkibi |
|---|---|---|
| `/` (+ `/ru`) | MVP | Hero: "Aqlingizni sinang, kuchli tomoningizni kashf eting." · "15 daqiqa · 27 savol · natija bepul" · CTA **Telegramda boshlash** (v1: + Brauzerda boshlash). Ishonch qatori: "Natija bepul. Yashirin obuna yoʻq." · "Maʼlumotlaringizni sotmaymiz" · "Metodika ochiq". "Qanday ishlaydi" (3 qadam). Namuna natija kartasi. "Biz nimani daʼvo qilmaymiz". FAQ. Footer: yuridik shaxs nomi, STIR, manzil, aloqa |
| `/metodika` | MVP | S17 ning to'liq versiyasi + ilmiy kengash (haqiqiy ismlar bilan; bo'lmasa bo'lim ko'rsatilmaydi) |
| `/maxfiylik`, `/shartlar`, `/qaytarish` | MVP | Oddiy tildagi qisqacha + to'liq matn |
| `/r/:slug` | MVP | Foydalanuvchi ruxsat bergan ommaviy natija (uslub + ixtiyoriy oraliq) + OG rasm + CTA |
| `/v/:id` | v1 | Sertifikat tekshiruvi: ism, test va versiya, sana, oraliq, sharoit ("nazoratsiz onlayn"), holat (haqiqiy / bekor qilingan) |
| `/test`, `/kirish`, `/hisob`, `/tolov` | v1 | Veb-test (o'sha `test-runner`), Telegram Login, akkaunt, Click/Payme/Uzum |
| `/blog/*` | v1 | SEO maqolalar uz/ru ("IQ nima?", "IQ testi qanday ishlaydi?") |
| `/maktablar` | v2 | B2B sahifa |

Veb maket: yuqorida header (logo, til, CTA), kontent eni ≤ 1080px, mobil birinchi. Kartalar — DESIGN-SYSTEM.md qoidalari bo'yicha.

---

## 11. Share kartalar

| Format | O'lcham | Tarkibi |
|---|---|---|
| Story | 1080×1920 | Tepada 250px va pastda 250px xavfsiz zona (UI qoplaydi). Markazda: logo → katta emoji → "Mening kognitiv uslubim" → uslub nomi (`title-1` ×2) → (ixtiyoriy) "Taxminiy IQ: 104–116" → 3 ta StrengthBars. Pastda: **"Sen ham sinab koʻr → @iquest_bot · iquest.uz"** + QR |
| Chat | 1080×1080 | Chapda emoji + uslub nomi, o'ngda 3 qator kuchli tomonlar; pastda handle |
| OG | 1200×630 | Chapda uslub, o'ngda "Aqlingizni sinang…" + logo |

- Fon: `--bg`; kartalar `--surface` + `--sh-2`; aksent faqat bitta elementda (oraliq chizig'i yoki uslub nomi).
- Link widget faqat Premium'da ishlaydi → **bot handle va QR rasmning o'zida chiziladi**.
- "Ballim bilan" tanlanmasa rasmda raqam bo'lmaydi.
- Uz va ru versiyalari; foydalanuvchi mavzusidan qat'i nazar yorug' mavzuda render qilinadi.

---

## 12. Hisobot va sertifikat (PDF)

- **Hisobot:** A4 portret. Muqova (uslub + sana) → natija oralig'i va izoh → har bo'lim (vaqt, aniqlik, izoh) → 4 haftalik mashq rejasi → "Bu natija nimani anglatadi / anglatmaydi" → metodika qisqacha → AI izohi.
- **Sertifikat:** A4 albom. Yuqorida logo; markazda ism (foydalanuvchi kiritgan); "IQ testi: mantiqiy fikrlash · v1.0"; sana; "Taxminiy IQ oraligʻi: 104–116"; sharoit: "nazoratsiz onlayn"; pastda o'ngda QR → `iquest.uz/v/K7Q2M9`, ID; pastda kichik matn: "Bu klinik baholash emas." Rang: `--ink` oq fonda, `--accent` ingichka chiziq. O'zbekcha va inglizcha versiya.

---

## 13. Matnlar banki (uz-Latn, asosiy)

i18n kalitlari `packages/i18n/locales/uz-Latn/*.json`da. Ruscha — professional tarjimon tekshiradi.

| Kalit | Matn |
|---|---|
| `promise` | Natija bepul. Yashirin obuna yoʻq. |
| `home.cta` | Testni boshlash |
| `test.intro.meta` | ⏱ 15 daqiqa · 3 boʻlim · 27 ta savol |
| `test.intro.free` | 🎁 Asosiy natija — bepul, roʻyxatdan oʻtish shart emas. |
| `test.intro.quiet` | 🤫 Tinch joy tanlang va hech kimdan yordam soʻramang. |
| `test.intro.integrity` | Test davomida boshqa ilovaga oʻtmang — aks holda natija «ishonchsiz» deb belgilanishi mumkin. |
| `test.intro.cta` | Boshlash |
| `test.intro.later` | Keyinroq eslatish |
| `practice.correct` | Toʻgʻri! |
| `practice.explain.{itemId}` | Har bir qatorda shakllar bittadan koʻpaymoqda. (1.1: izoh itemga bog'liq — alohida kalit) |
| `practice.wrong` | Unchalik emas — qarang: … |
| `test.skip` | Bilmayman |
| `test.next` | Keyingi |
| `test.section.finish` | Boʻlimni yakunlash |
| `test.finish` | Testni yakunlash |
| `test.timer.hide` | Vaqtni yashirish |
| `test.timer.show` | Vaqtni koʻrsatish |
| `test.timeup` | Boʻlim vaqti tugadi. Javoblaringiz saqlandi. |
| `test.timer.warn` | 1 daqiqa qoldi |
| `test.exit.confirm` | Testni toʻxtatasizmi? Javoblaringiz saqlanadi. |
| `test.exit.continue` | Davom etish |
| `test.exit.stop` | Toʻxtatish |
| `section.done` | {n}-boʻlim yakunlandi. Diqqatingiz uchun rahmat. Tayyor boʻlganingizda davom eting. |
| `resume.body` | Testingiz saqlangan. {section}-boʻlimning {item}-savolidan davom etasiz. |
| `finish.body` | Barakalla! {count} ta savolga {minutes} daqiqada javob berdingiz. |
| `survey.distracted` | Test davomida chalgʻitildingizmi? |
| `survey.distracted.no` / `.some` / `.yes` | Yoʻq · Biroz · Ha |
| `finish.cta` | Natijani koʻrish |
| `survey.age` | Yoshingiz |
| `lang.switch` | Oʻz · Ру |
| `result.title` | Natijangiz |
| `result.band.label` | Taxminiy IQ oraligʻi |
| `result.pct` | Har 100 kishidan taxminan {low}–{high} nafaridan yuqori |
| `result.norms.provisional` | Dastlabki meʼyorlar |
| `result.strongest` | Eng kuchli tomoningiz: {domain} |
| `result.means` | Bu natija ijodkorligingiz, bilimingiz, xarakteringiz yoki inson sifatidagi qadringizni oʻlchamaydi. Bu tibbiy tashxis emas. |
| `result.conditions` | Uyqu, charchoq, shovqin va bunday topshiriqlarga odatlanmaganlik natijaga taʼsir qiladi. |
| `result.growth` | Mashq qilgan topshiriq turlaringizda natija oshadi — kunlik jumboqlar aynan shu uchun. (v1 — kunlik jumboq chiqqanda; MVP'da ko'rsatilmaydi) |
| `result.snapshot` | Bu natija — bugungi holatingiz surati, hukm emas. |
| `result.unreliable` | Baʼzi javoblar juda tez berildi, shuning uchun bu natija ishonchli emas. Tinch sharoitda qayta urinib koʻrasizmi? |
| `result.unreliable.blur` | Test davomida ilovadan bir necha marta chiqdingiz, shuning uchun bu natija ishonchli emas. Tinch sharoitda qayta urinib koʻrasizmi? |
| `result.retake` | Qayta topshirish |
| `result.share` | Natijani ulashish |
| `result.age_pending` | Yoshingiz uchun meʼyorlar tayyorlanmoqda. Tayyor boʻlganda xabar beramiz. |
| `result.worried` | Natija haqida qaygʻuryapsizmi? |
| `result.retest` | Rasmiy qayta test — 90 kundan keyin, yangi savollar bilan. |
| `paywall.title` | Batafsil hisobot · {price} |
| `paywall.items` | ✔ 3 boʻlim boʻyicha tahlil ✔ Har boʻlim boʻyicha vaqt va aniqlik ✔ 4 haftalik shaxsiy mashq rejasi ✔ PDF (1.1: UI'da 4 ta alohida band — `paywall.item.sections|timing|plan|pdf`, belgi ikonka bilan, matnda emas) |
| `paywall.terms` | Bir martalik toʻlov. Obuna emas. 7 kun ichida soʻrasangiz, pulingiz qaytariladi. |
| `paywall.cta` | Hisobotni olish |
| `paywall.decline` | Hozir emas |
| `share.cta` | Doʻstlarga yuborish |
| `share.style_only` | Men IQuest ilovasida aql testini topshirdim. Mening uslubim — «{style}». Seniki qanday? 👇 |
| `share.with_score` | IQuest natijam: taxminan {low}–{high} 🧠 Eng kuchli tomonim — {strength}. Sen ham sinab koʻr 👇 |
| `share.story` | Mening kognitiv uslubim: {style} @{bot} |
| `write_access.ask` | Natijangiz tayyor boʻlganda xabar yuborishimizga ruxsat berasizmi? |
| `home_screen.ask` | IQuest ilovasini telefoningiz bosh ekraniga qoʻshing — keyingi testga bir bosishda qayting. |
| `consent.minor` | 18 yoshga toʻlmagan boʻlsangiz, natijangizni saqlash uchun ota-onangiz yoki vasiyingiz roziligi kerak. |
| `consent.minor.cta` | Ota-onamga yuborish |
| `waiting_room` | Hozir test topshirayotganlar juda koʻp. Navbatingiz tez orada keladi — iltimos, ilovani yopmang. (1.1: test lokal ishlaydi — faqat server kerak bo'lgan joyda: to'lov, share rasm) |
| `error.offline` | Internet yoʻq. Javoblaringiz telefonda saqlanmoqda. |
| `common.retry` | Qayta urinish |
| `settings.delete` | Maʼlumotlarimni oʻchirish |
| `privacy.short` | Maʼlumotlaringizni sotmaymiz. Istalgan payt oʻchirasiz. |
| `bot.nudge.abandoned` | 💾 Testingiz saqlandi. Davom ettirish uchun bosing — qolgan qismi taxminan {minutes} daqiqa. |
| `bot.puzzle.ready` | 🧩 Bugungi jumboq tayyor — 2 daqiqalik bosh qotirma. Yechib koʻrasizmi? |
| `bot.retest` | 📅 Birinchi testingizdan 90 kun oʻtdi. Xohlasangiz, yangi savollar bilan rasmiy qayta test topshiring. |
| `bot.paused` | 🤝 Sizni bezovta qilmaslik uchun eslatmalarni toʻxtatdik. Qaytmoqchi boʻlsangiz — jumboqlar shu yerda. |

Ruscha asosiy qatorlar (namuna): `promise` — «Результат — бесплатно. Никаких скрытых подписок.» · `home.cta` — «Начать тест» · `paywall.terms` — «Разовая оплата. Не подписка. Вернём деньги, если попросите в течение 7 дней.» (to'liq ru namunasi — `docs/DESIGN-REVIEW.md`). 1.1: ru lug'ati to'liq bo'lmaguncha `language_code=ru` foydalanuvchiga ham uz-Latn ko'rsatiladi — aralash til yomonroq.

---

## 14. Kirish imkoniyati va tezlik
- Kontrast ≥ 4.5:1 (§3 da tekshirilgan); holat hech qachon faqat rang bilan emas — doim so'z yoki belgi bilan.
- Bosiladigan zona ≥ 44px (accordion sarlavhasi ham); variantlar orasi ≥ 8px. Boshqaruv chegaralari (checkbox, input) — `--control-edge`, ≥ 3:1.
- Screen reader: variantlar "Variant 1 … 8", tanlangan holat e'lon qilinadi; itemlar uchun qisqa `aria-label` (javobni oshkor qilmaydigan).
- "Katta matn" rejimi; `prefers-reduced-motion` hurmat qilinadi.
- **Tezlik budjeti (TMA, 1.1):** o'rta Android (Snapdragon 6xx / Helio G8x) + 4G (RTT ≈ 80ms, 5–10 Mbit/s), sovuq kesh:
  - kritik yo'l (HTML + CSS + JS, S3 va S5 gacha): **≤ 60 KB gzip** (Preact + signals ≈ 6 KB, engine ≈ 10 KB, i18n faqat joriy til); CSS ≤ 10 KB; shrift 0 KB; rasm 0 KB (item grafikasi ma'lumotdan chiziladi — alohida SVG fayl yo'q);
  - WebView ochilgandan birinchi kadrgacha (inline shell) ≤ 300ms; S3 interaktiv ≤ 1.2 s; qayta ochishda (kesh) ≤ 0.6 s;
  - birinchi savolgacha (inson vaqti bilan, median) ≤ 25 s; javob → keyingi savol ≤ 100ms (INP);
  - `telegram-web-app.js` — `<script defer>` (render-blocking emas; `defer` + `type="module"` hujjat tartibida bajariladi, shuning uchun `window.Telegram` ilova kodidan oldin tayyor);
  - Natija, paywall, share, sozlamalar, metodika — lazy chunk; **natija chunki 3-bo'lim boshlanganda oldindan yuklanadi** (`import()` idle'da) — 15 daqiqa davomida tarmoq uzilsa ham S10 darhol ochiladi;
  - `index.html` va chunk'lar: `Cache-Control: immutable` (hash nomlar), HTML — `no-cache`; hosting HTTP/2+, Brotli.

---

## 15. Qilinmaydi (anti-patternlar)
- Natijani pullik devor ortiga yashirish; "£1 sinov → oylik obuna" turidagi tuzoq.
- Soxta taymer, soxta tanqislik ("faqat bugun!"), soxta sharhlar, foydalanuvchilardan yig'ilgan "aniqlik foizi".
- Rad etish tugmasida uyaltirish ("Yoʻq, men aqlliroq boʻlishni xohlamayman").
- "Daho", "aqlsiz" kabi yorliqlar; IQ bo'yicha reyting; viloyat, jins, millat taqqoslash.
- Test ichida yashil/qizil signallar, konfetti, ball animatsiyasi.
- Past natija ekranida sotuv taklifi.
- Tanga, "earn", airdrop, kazino uslubidagi vizual til.
- Bolalar profilida reklama, reyting, ulashish, bildirishnoma.
