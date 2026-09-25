# IQuest — Dizayn

Versiya 1.0 · 2026-sentabr · Qamrov: Telegram Mini App (MVP), iquest.uz, share kartalar, sertifikat

---

## 0. Bu hujjat qanday ishlatiladi
- Asos — **DESIGN-SYSTEM.md**: rang rollari, tamoyillar, o'lchamlar va holat tizimi o'sha yerdan olinadi. Bu fayl faqat **IQuest mavzusi (qiymatlar)**, **IQuest'ga xos komponentlar**, **ekranlar** va **matnlar**ni belgilaydi.
- Komponentlar rangni faqat rol nomi bilan oladi (`var(--accent)`); hex qiymatlar faqat §3 jadvalida.
- Kod joyi: `packages/ui/tokens.css` (mavzu), `packages/ui/components/*`.
- Asosiy tamoyillar (DESIGN-SYSTEM.md'dan): ekran bitta savolga javob beradi · tugma = amal fe'li · holat = rang + so'z · bitta aksent · kartalar chegarasiz (fon + yumshoq soya + katta radius), chiziq faqat ro'yxat/jadval ichida · tanlash = aksent halqa + ✓ + och fon · raqamlar tabular · telefon birinchi (390px) · harakat faqat ma'no uchun · kontrast ≥ 4.5:1.

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
| `--field-line` | #CFCBE0 | #45425E | input chegarasi |
| `--ink` | #1D1B2E | #F1F0FA | asosiy matn, item grafikasi |
| `--ink-2` | #3A3752 | #CFCDE3 | ikkinchi darajali matn |
| `--muted` | #5E5B72 | #A4A1BA | izoh, meta |
| `--accent` | #4F3FD0 | #9C90FF | havola, tanlash halqasi, faol holat |
| `--accent-press` | #3F31B0 | #B3A9FF | bosilgan aksent |
| `--accent-fill` | #4F3FD0 | #6B5CF0 | asosiy tugma foni |
| `--accent-tint` | #ECEAFB | #26224A | aksent chip foni |
| `--selected-bg` | #F1EFFD | #231F45 | tanlangan variant foni |
| `--on-fill` | #FFFFFF | #FFFFFF | fill ustidagi matn |
| `--warn` / `--warn-tint` | #8A5A00 / #FBF1DD | #F2C46B / #3A2E12 | diqqat: ishonchsiz natija, 1 daqiqa qoldi |
| `--money` / `--money-tint` | #087F5B / #E5F3EC | #5FD3A6 / #10302A | narx, to'lov, "sotib olingan" |
| `--notice` / `--notice-tint` | #0E6E8C / #E3F2F7 | #6CC6E0 / #0F2C36 | kutish/reja: rozilik kutilmoqda, me'yorlar tayyorlanmoqda |
| `--danger` / `--danger-tint` | #B42F35 / #FBE9EA | #FF8A8F / #3A1719 | xato, o'chirish |
| `--sh` | 0 1px 2px rgba(29,27,46,.06) | 0 1px 2px rgba(0,0,0,.40) | kichik soya |
| `--sh-2` | 0 4px 16px rgba(29,27,46,.08) | 0 4px 16px rgba(0,0,0,.45) | karta |
| `--sh-3` | 0 12px 40px rgba(29,27,46,.14) | 0 12px 40px rgba(0,0,0,.55) | sheet, oyna |

Kontrast: `--muted`/`--bg` ≈ 6.0 · `--on-fill`/`--accent-fill` ≈ 7.1 (yorug'), ≈ 4.8 (qorong'i) · `--accent`/`--bg` (qorong'i) ≈ 7.0 · `--money`/`--surface` ≈ 5.0 · `--notice`/`--surface` ≈ 5.8.

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
- BottomButton (MainButton): `color = --accent-fill`, `text_color = --on-fill`.
- Telegram `themeParams` faqat zaxira sifatida; brend ranglari ustun.

---

## 4. Tipografiya va o'lchamlar

**Shrift:** Inter (variable), self-host, woff2 subsetlar: latin, latin-ext, cyrillic, cyrillic-ext + `ʻ` (U+02BB), `ʼ` (U+02BC). Kelajakdagi Ö Ğ Ş Ç ham qamrab olingan. Share rasmlar va PDF uchun Inter TTF.

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
- Maket: dizayn eni 390px; 360–430px'da tekshiriladi. TMA'da `--tg-safe-area-inset-*` va `--tg-content-safe-area-inset-*` hisobga olinadi.
- "Katta matn" rejimi (Sozlamalar): barcha matn ×1.15.

---

## 5. Harakat va haptika
- Faqat `transform` va `opacity`. 150–220ms, `cubic-bezier(.2,.8,.2,1)`.
- Ekranlar orasida: 12px siljish + opacity.
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
- Matritsa: 3×3, katak 88px (390px ekranda), kataklar orasi 6px, oxirgi katak "?" — `--soft` fon, uzuq chiziq.
- Sonlar qatori: `display` o'lchamdagi tabular raqamlar, vergul bilan ajratilgan, oxirida "?" chip.

---

## 7. Komponentlar (IQuest'ga xos)

| Komponent | Tavsif | Holatlar |
|---|---|---|
| `Button` | primary (`--accent-fill`), secondary (`--soft` fon), ghost (matn). Matn — fe'l: "Boshlash", "Ulashish", "Hisobotni olish" | default, press, disabled, loading |
| `OptionTile` | test varianti (SVG yoki son). Joylashuv: 2×4 (matritsa), 3×2 (qator), 5 ta ro'yxat (fazo) | default · **tanlangan: 2px `--accent` halqa + burchakda ✓ + `--selected-bg`** · disabled |
| `MatrixGrid` | 3×3 item, "?" katak | — |
| `SeriesRow` | sonlar qatori + "?" | — |
| `SectionProgress` | "1/3-boʻlim · 4/9" + 9 segmentli chiziq | — |
| `CalmTimer` | kichik halqa + mm:ss; "Vaqtni yashirish" tugmasi | normal · warn (`--warn` + "1 daqiqa qoldi") · yashirin |
| `ScoreBandCard` | `display` oraliq "104–116"; normal taqsimot egri chizig'i (SVG) ustida aksent bilan belgilangan oraliq; "100 kishidan taxminan 60–75 tasidan yuqori"; holat chipi "Dastlabki meʼyorlar" (`--notice`) | normal · `unreliable` (`--warn` karta, raqamsiz) · `age_pending` (`--notice` karta, raqamsiz) |
| `StyleBadge` | katta emoji + kognitiv uslub nomi + bir qator tavsif | — |
| `StrengthBars` | 3 gorizontal chiziq (keyin 5): Naqsh, Raqamlar, Fazo. Yonida so'z: "kuchli" / "oʻrtacha" / "rivojlanish zonasi". Raqam yo'q | — |
| `PaywallCard` | sarlavha + narx (`--money`) + 4 ta ✓ band + "Bir martalik toʻlov. Obuna emas. 7 kun ichida pul qaytariladi." + ikkita **teng vaznli** tugma | yashirin (past yoki ishonchsiz natijada) |
| `ShareSheet` | karta preview + "Faqat uslubim / Ballim bilan" tanlovi + 3 kanal | — |
| `ConsentSheet` | qisqa rozilik matni + "Toʻliq matn" havolasi + checkbox | — |
| `StatusChip` | rang + so'z (hech qachon faqat rang) | §3 holatlari |
| `ObjectCard` | test/natija kartasi, ≤ 5 ma'no o'rni: sarlavha, meta, holat chipi, progress, amal | — |
| `PageHeader` | eyebrow + sarlavha + holat chipi | — |
| `EmptyState` | ikonka + bitta jumla + bitta fe'l-tugma | — |
| `Skeleton` | `--soft` bloklar, shimmer yo'q | — |
| v1: `StreakChip`, `PuzzleCard`, `QuestMap` (kognitiv xarita, 5 hudud), `LeagueRow` (harakat ochkolari) | | |

### Kognitiv uslublar (`style_label`)
Eng kuchli subskal bo'yicha; o'yinqaroq tavsif, shaxsiyat turi emas.
| Kalit | Nomi | Tavsif |
|---|---|---|
| `pattern` | Naqsh ovchisi 🧩 | Qonuniyat va naqshlarni tez ilg'aysiz |
| `numbers` | Raqamlar ustasi 🔢 | Sonlar orasidagi bog'liqlikni yaxshi ko'rasiz |
| `spatial` | Fazoviy meʼmor 🧊 | Shakllarni xayolda aylantirishda kuchlisiz |
| `balanced` | Muvozanatli fikrlovchi ⚖️ | Barcha yo'nalishlarda bir tekis |
| v1: `memory` | Xotira qoʻriqchisi 🧠 | — |
| v1: `speed` | Chaqqon fikr ⚡ | — |

---

## 8. Navigatsiya (TMA)
- Pastki navigatsiya (3 ta): **Bosh sahifa · Natijalarim · Profil** — faqat yuqori darajali ekranlarda. Test, natija va to'lov oqimlarida yashiriladi (u yerda Telegram BottomButton ishlaydi).
- Orqaga: Telegram `BackButton`. Test ichida bosilsa → "Testni toʻxtatasizmi? Javoblaringiz saqlanadi." ["Davom etish"] ["Toʻxtatish"].
- Sahifa sarlavhasi: `PageHeader` (eyebrow + sarlavha + holat chipi).

---

## 9. Ekranlar — Telegram Mini App (MVP)

Har ekran bitta savolga javob beradi. "Tugma" ustuni — Telegram BottomButton matni.

| # | Ekran | Qaysi savolga javob beradi | Tarkibi (yuqoridan pastga) | Tugma |
|---|---|---|---|---|
| S0 | Yuklanish | — | BotFather loading screen (logo) → yengil shell; `ready()` imkon qadar tez | — |
| S1 | Til tanlash (faqat 1-marta) | Qaysi tilda? | Ikkita katta variant: **Oʻzbekcha** · **Русский** (v1: Ўзбекча) | tanlash = davom |
| S2 | Bosh sahifa | Nima qilaman? | PageHeader "IQuest"; asosiy `ObjectCard`: "IQ testi: mantiqiy fikrlash" · "15 daqiqa · 27 savol" · chip **Bepul**; tugallanmagan test bo'lsa — "Davom ettirish" kartasi; "Natijalarim" kartasi (bo'lsa). v1: kunlik jumboq, kognitiv xarita | **Testni boshlash** |
| S3 | Test haqida | Nimaga tayyorlanay? | 3 qator: ⏱ 15 daqiqa · 3 boʻlim · 27 savol; 🎁 Asosiy natija bepul; 🤫 Tinch joy, yordamsiz. Integrity ogohlantirishi. Birinchi marta — `ConsentSheet`. Ikkinchi darajali: "Keyinroq eslatish" (shu yerda `requestWriteAccess`) | **Boshladik** |
| S4 | Mashq (×2) | Savol qanday ishlaydi? | Bitta item + variantlar; tanlangach darhol izoh (faqat mashqda) | **Tushunarli** |
| S5 | Savol | Qaysi variant to'g'ri? | Wireframe pastda | **Keyingi** (variant tanlanganda faol) |
| S6 | Tanaffus | Qancha qoldi? | "1-boʻlim yakunlandi ✅"; keyingi bo'lim nomi va vaqti; taymer to'xtagan | **Davom etish** |
| S7 | Davom ettirish | Qayerda to'xtadim? | "Testingiz saqlangan. 2-boʻlimning 4-savolidan davom etasiz." | **Davom etish** |
| S8 | Yakun | — (cho'qqi lahzasi) | "Barakalla! 27 ta savolga 16 daqiqada javob berdingiz." + success haptika | **Davom etish** |
| S9 | Qisqa savollar | Sizni kim bilan solishtiramiz? | Yosh oralig'i (chiplar, majburiy); viloyat (ixtiyoriy); ta'lim (ixtiyoriy); "Test davomida chalgʻitildingizmi?" < 18 bo'lsa → S18 | **Natijani koʻrish** |
| S10 | Natija | Mening natijam qanday? | Wireframe pastda | **Natijani ulashish** |
| S11 | Ulashish | Qanday ulashaman? | Karta preview; tanlov: **Faqat uslubim** (standart) / Ballim bilan; kanallar: Chatga yuborish (`shareMessage`), Story (`shareToStory`), Rasmni saqlash (`downloadFile`) | **Doʻstlarga yuborish** |
| S12 | Batafsil hisobot (tanlov) | Pullik hisobotda nima bor? | Tarkib ro'yxati (xira qilingan "yashirin" kontent yo'q); narx `--money`; "Bir martalik toʻlov. Obuna emas. 7 kun ichida pul qaytariladi." Ikkinchi, teng vaznli: "Hozir emas" | **Hisobotni olish · 150 ⭐** |
| S13 | To'lov natijasi | To'lov o'tdimi? | Muvaffaqiyat → hisobot ochiladi. `pending` → `--money` chip "Toʻlov tasdiqlanmoqda". Xato → `--danger` + "Qayta urinish" | **Hisobotni ochish** |
| S14 | Batafsil hisobot | Batafsil nimalar? | Har bo'lim tahlili; vaqt va aniqlik; 4 haftalik mashq rejasi; AI izohi | **PDF yuklab olish** |
| S15 | Natijalarim / Profil | Mening tarixim? | Natijalar ro'yxati (`ObjectCard`); xaridlar; qayta test sanasi ("90 kundan keyin"). v1: kognitiv xarita, zanjir | — |
| S16 | Sozlamalar | Qanday sozlayman? | Til; bildirishnomalar (kategoriya + vaqt); katta matn; maxfiylik; **Maʼlumotlarimni oʻchirish** (`--danger`, tasdiqlash oynasi bilan) | — |
| S17 | Metodika | Test qanday ishlaydi? | Nima o'lchanadi / o'lchanmaydi; me'yorlar versiyasi va sanasi; cheklovlar; "Biz nimani daʼvo qilmaymiz" ro'yxati; qayta testda amaliyot effekti | — |
| S18 | Ota-ona roziligi (< 18) | Davom etish uchun nima kerak? | Qisqa tushuntirish; holat chipi "Kutilmoqda" (`--notice`); rozilik kelguncha natija saqlanmaydi | **Ota-onamga yuborish** |
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

### S10 — Natija (390px)
```
┌──────────────────────────────────┐
│ IQ TESTI · 25-SENTABR            │
│ Natijangiz   [Dastlabki meʼyorlar]│ ← PageHeader + notice chip
│ Barakalla! 27 ta savolga         │
│ 16 daqiqada javob berdingiz.     │
│ ┌──────────────────────────────┐ │
│ │ 🧩  Naqsh ovchisi             │ │ ← StyleBadge
│ │ Qonuniyat va naqshlarni tez   │ │
│ │ ilgʻaysiz                     │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Taxminiy IQ oraligʻi          │ │ ← ScoreBandCard
│ │         104–116               │ │
│ │     ╱‾‾‾‾[█████]‾‾‾‾╲         │ │
│ │ 100 kishidan taxminan 60–75   │ │
│ │ tasidan yuqori                │ │
│ └──────────────────────────────┘ │
│ Qobiliyatlaringiz                │
│ Naqsh     ██████████  kuchli     │ ← StrengthBars
│ Raqamlar  ███████     oʻrtacha   │
│ Fazo      █████   rivojlanish z. │
│ ▸ Bu natija nimani anglatadi?    │ ← accordion
│ ▸ Keyingi qadamlar               │
│ ┌──────────────────────────────┐ │
│ │ Batafsil hisobot · 150 ⭐     │ │ ← PaywallCard (eng pastda)
│ │ ✔ 3 boʻlim tahlili ✔ vaqt/aniqlik│
│ │ ✔ 4 haftalik reja ✔ PDF       │ │
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
| `test.intro.integrity` | Diqqat: test davomida boshqa ilovaga oʻtsangiz, natijangiz “tasdiqlanmagan” deb belgilanadi. |
| `test.intro.cta` | Boshladik! |
| `test.intro.later` | Keyinroq eslatish |
| `practice.correct` | Toʻgʻri! Har bir qatorda shakllar bittadan koʻpaymoqda. |
| `practice.wrong` | Unchalik emas — qarang: … |
| `test.skip` | Bilmayman |
| `test.next` | Keyingi |
| `test.timer.hide` | Vaqtni yashirish |
| `test.timer.warn` | 1 daqiqa qoldi |
| `test.exit.confirm` | Testni toʻxtatasizmi? Javoblaringiz saqlanadi. |
| `section.done` | {n}-boʻlim yakunlandi ✅ Diqqatingiz uchun rahmat. Tayyor boʻlganingizda davom eting. |
| `resume.body` | Testingiz saqlangan. {section}-boʻlimning {item}-savolidan davom etasiz. |
| `finish.body` | Barakalla! {count} ta savolga {minutes} daqiqada javob berdingiz. |
| `result.title` | Natijangiz |
| `result.band.label` | Taxminiy IQ oraligʻi |
| `result.pct` | 100 kishidan taxminan {low}–{high} tasidan yuqori |
| `result.norms.provisional` | Dastlabki meʼyorlar |
| `result.strongest` | Eng kuchli tomoningiz: {style} |
| `result.means` | Bu natija ijodkorligingiz, bilimingiz, xarakteringiz yoki inson sifatidagi qadringizni oʻlchamaydi. Bu tibbiy tashxis emas. |
| `result.conditions` | Uyqu, charchoq, shovqin va bunday topshiriqlarga odatlanmaganlik natijaga taʼsir qiladi. |
| `result.growth` | Mashq qilgan topshiriq turlaringizda natija oshadi — kunlik jumboqlar aynan shu uchun. |
| `result.snapshot` | Bu natija — bugungi holatingiz surati, hukm emas. |
| `result.unreliable` | Baʼzi javoblar juda tez berildi, shuning uchun bu natija ishonchli emas. Tinch sharoitda qayta urinib koʻrasizmi? |
| `result.age_pending` | Yoshingiz uchun meʼyorlar tayyorlanmoqda. Tayyor boʻlganda xabar beramiz. |
| `result.worried` | Natija haqida qaygʻuryapsizmi? |
| `result.retest` | Rasmiy qayta test — 90 kundan keyin, yangi savollar bilan. |
| `paywall.title` | Batafsil hisobot · {price} |
| `paywall.items` | ✔ 3 boʻlim boʻyicha tahlil ✔ Har boʻlim boʻyicha vaqt va aniqlik ✔ 4 haftalik shaxsiy mashq rejasi ✔ PDF |
| `paywall.terms` | Bir martalik toʻlov. Obuna emas. 7 kun ichida pul qaytariladi. |
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
| `waiting_room` | Hozir test topshirayotganlar juda koʻp. Navbatingiz tez orada keladi — iltimos, ilovani yopmang. |
| `settings.delete` | Maʼlumotlarimni oʻchirish |
| `privacy.short` | Maʼlumotlaringizni sotmaymiz. Istalgan payt oʻchirasiz. |
| `bot.nudge.abandoned` | 💾 Testingiz saqlandi. Davom ettirish uchun bosing — qolgan qismi taxminan {minutes} daqiqa. |
| `bot.puzzle.ready` | 🧩 Bugungi jumboq tayyor — 2 daqiqalik bosh qotirma. Yechib koʻrasizmi? |
| `bot.retest` | 📅 Birinchi testingizdan 90 kun oʻtdi. Xohlasangiz, yangi savollar bilan rasmiy qayta test topshiring. |
| `bot.paused` | 🤝 Sizni bezovta qilmaslik uchun eslatmalarni toʻxtatdik. Qaytmoqchi boʻlsangiz — jumboqlar shu yerda. |

Ruscha asosiy qatorlar (namuna): `promise` — «Результат бесплатно. Никаких скрытых подписок.» · `home.cta` — «Начать тест» · `paywall.terms` — «Разовая оплата. Не подписка. Возврат в течение 7 дней.»

---

## 14. Kirish imkoniyati va tezlik
- Kontrast ≥ 4.5:1 (§3 da tekshirilgan); holat hech qachon faqat rang bilan emas — doim so'z yoki belgi bilan.
- Bosiladigan zona ≥ 44px; variantlar orasi ≥ 8px.
- Screen reader: variantlar "Variant 1 … 8", tanlangan holat e'lon qilinadi; itemlar uchun qisqa `aria-label` (javobni oshkor qilmaydigan).
- "Katta matn" rejimi; `prefers-reduced-motion` hurmat qilinadi.
- **Tezlik budjeti (TMA):** boshlang'ich JS ≤ 180 KB gzip; har item SVG ≤ 30 KB; birinchi savolgacha ≤ 45 s (median); o'rta Android + 4G'da LCP < 2.5 s. Paywall, hisobot, share modullari lazy-load.

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
