# IQuest — dizayn sharhi (DESIGN.md 1.0 → 1.1)

Sana: 2026-yil 25-sentabr · Koʻrib chiqilgan: `DESIGN.md` 1.0, `docs/CONTRACTS.md`, `packages/ui/tokens.css`, `docs/prototype.html`, `apps/tma/index.html`, `packages/i18n/locales/*` (faqat oʻqildi).
Mahsulot egasining talabi: *“Gʻoya yaxshi, lekin dizaynni qayta koʻrib chiqing — bizga TEZ ishlaydigan mahsulot kerak.”*

Belgilar: har bir topilma — **muammo → taklif → taʼsir** (yuqori / oʻrta / past). ✅ QOʻLLANDI — `DESIGN.md` yoki `tokens.css`ga kiritildi; ⏳ LEAD — qaror yoki boshqa papkadagi oʻzgarish kerak.

---

## Qisqacha

1. **Birinchi savolgacha yoʻl juda uzun.** 1.0 da: 6 ekran, 8 bosish (+ testdan keyin yosh soʻrovi), inson vaqti ≈ 45 s. 1.1 da: 3 ekran, 5 bosish, ≈ 25 s. S1 (til) olib tashlandi, birinchi kirishda S2 oʻtkazib yuboriladi, mashq 1 ta, S8 + S9 birlashdi.
2. **Kritik yoʻlda keraksiz baytlar bor.** Inter self-host (4 subset) — 178 KB (oʻlchangan), `telegram-web-app.js` esa parserni bloklaydi. 1.1 da TMA tizim shriftida ishlaydi (0 KB), skript `defer` bilan yuklanadi, JS budjeti 180 KB oʻrniga ≤ 60 KB.
3. **S5 oʻrta Android ekraniga sigʻmaydi.** Foydali balandlik ≈ 610 px, 1.0 maketi esa ≈ 690 px. Variantlarning 2-qatori ekrandan tashqarida qoladi, 27 savolning har birida scroll kerak boʻladi. 1.1 da `--matrix-cell` balandlikka qarab 88 → 76 → 64 px ga tushadi.
4. **Kontrast:** 33 ta matn juftligidan bittasi 4.5:1 dan past chiqdi: `--money`/`--money-tint` = 4.38 (toʻlov chipi). Tuzatildi: 5.13. Qorongʻi rejimdagi `--accent-press` fon sifatida 2.09 beradi, shuning uchun alohida `--accent-fill-press` qoʻshildi. Input chegarasi (`--field-line`) 1.58, 3:1 talabiga javob bermaydi — `--control-edge` qoʻshildi.
5. **Qorongʻi rejimda soya koʻrinmaydi** (`--surface`/`--bg` = 1.09), variant plitkalari fonga singib ketadi. Tuzatish: qorongʻi `--sh*` tokenlariga 1px yorugʻ halqa qoʻshildi.
6. **Ichki ziddiyatlar:** oʻlchash rejimida yashil ✅ ishlatilgan (§2 buni taqiqlaydi); S2 da pastki navigatsiya BottomButton bilan ustma-ust tushadi; 104–116 oraligʻi uchun persentil xato yozilgan (60–75, toʻgʻrisi 61–86); “16 daqiqada” deb yozilgan, test esa 15 daqiqalik; JS budjeti `DESIGN.md`da 180 KB, `CONTRACTS.md`da 60 KB.
7. **Matnlar:** `paywall.terms` “pul avtomatik qaytariladi” deb tushunilishi mumkin; “yaxshi koʻrasiz” ikki maʼnoli (“sevasiz”); tugmalarda feʼl qoidasi buzilgan (“Boshladik!”); bir nechta kalit yetishmaydi (boʻlim oxiri, vaqt tugashi, offline).

---

## 1. Tezlik

### Sovuq ochilishning taxminiy vaqti (oʻrta Android, 4G: RTT ≈ 80 ms, 5–10 Mbit/s)

| Bosqich | 1.0 | 1.1 |
|---|---|---|
| Telegram WebViewʼni ishga tushirish (bizga bogʻliq emas) | 300–700 ms | 300–700 ms |
| Bizning hostga DNS + TCP + TLS 1.3 (≈ 3 RTT) | 240 ms | 240 ms |
| HTML (≈ 2 KB, 1 RTT) | 80 ms | 80 ms; **inline shell shu yerda chiziladi** |
| `telegram-web-app.js` — boshqa origin, parserni bloklaydi | +250–400 ms (parser kutadi) | parallel, bloklamaydi (`defer`) |
| JS (1.0: budjet 180 KB gz; 1.1: ≤ 60 KB gz) | 290 ms + 1 RTT | 100 ms + 1 RTT |
| Parse va bajarish (oʻrta SoC) | 300–450 ms | 100–150 ms |
| Shrift (Inter latin 48 KB + cyrillic 19 KB, swap) | +80–150 ms, keyin matn siljiydi | 0 |
| **S3 interaktiv boʻlguncha** | **≈ 1.5–2.2 s** | **≈ 0.8–1.1 s** |

### Birinchi savolgacha: bosish va inson vaqti

| Qadam | 1.0 | 1.1 |
|---|---|---|
| S1 til tanlash | 1 bosish, ≈ 3 s | yoʻq (`language_code`) |
| S2 “Testni boshlash” | 1 bosish, ≈ 3 s | birinchi kirishda yoʻq |
| S3 oʻqish + ConsentSheet (sheet ochish, checkbox, yopish) | 2 bosish, ≈ 15 s | yosh chipi + checkbox + “Boshlash” = 3 bosish, ≈ 12 s |
| S4 mashq | 2 × (variant + “Tushunarli”) = 4 bosish, ≈ 24 s | 2 bosish, ≈ 12 s (2-mashq faqat xato boʻlsa) |
| Testdan keyin S9 (yosh, viloyat, taʼlim, chalgʻitish) | 4–6 bosish | S8 da 1 ixtiyoriy savol |
| **Jami, S5 gacha** | **8 bosish, ≈ 45 s** | **5 bosish, ≈ 25 s** |

**T1. Birinchi savolgacha 6 ekran.**
Muammo: ekranlar S0 → S1 → S2 → S3 → (sheet) → S4 → S4 → S5. Har ekran almashinuvi 220 ms animatsiya va bitta qaror demakdir. Foydalanuvchi share-havola yoki botdan kelganda niyati aniq: test topshirish.
Taklif: S1 olib tashlanadi. Birinchi kirish S0 → S3 → S4 → S5. S2 faqat qaytgan foydalanuvchiga koʻrsatiladi. Bot `startapp=test` deep-link bilan ham toʻgʻridan-toʻgʻri S3 ni ochadi.
Taʼsir: **yuqori**. ✅ QOʻLLANDI (§9).

**T2. `telegram-web-app.js` sinxron yuklanadi.**
Muammo: `apps/tma/index.html`dagi `<script src="https://telegram.org/js/telegram-web-app.js">` `<head>` ichida turibdi. Skript boshqa origindan keladi (yana 3 RTT handshake), kesh siyosatini biz boshqara olmaymiz, parser esa uni kutib turadi. Natijada `type="module"` ilova ham, har qanday inline shell ham skript kelguncha chizilmaydi. (Hajmini oʻlchab boʻlmadi — sandbox proksisi telegram.org ga 403 qaytardi. Asosiy xarajat baribir hajm emas, handshake va bloklash.)
Taklif: `<script src="…telegram-web-app.js" defer>`. `defer` va `type="module"` skriptlar hujjatdagi tartibda bajariladi, shuning uchun `window.Telegram` ilova kodidan oldin tayyor boʻladi. Bunga qoʻshimcha: `<link rel="preconnect" href="https://telegram.org">`, `<body>` ichida `--bg` fonli inline shell (≤ 2 KB, logo SVG) va `<meta name="theme-color">`. Skriptni oʻz CDNʼimizdan tarqatish (vendoring) tavsiya etilmaydi — Telegram versiyasidan orqada qolish xavfi bor.
Taʼsir: **yuqori**. ⏳ LEAD — `apps/` papkasiga tegmadim. Qoida `DESIGN.md` §14 ga yozildi.

**T3. Shrift: Inter self-host yoki tizim shrifti?**
Muammo: 1.0 da Inter variable, 4 ta subset. Google Fonts Inter v20 (`wght` 400–800) boʻyicha oʻlchangan hajmlar: latin 48 KB, latin-ext 85 KB, cyrillic 19 KB, cyrillic-ext 26 KB. Hammasi birga 178 KB. uz-Latn uchun latin subsetning oʻzi yetadi (U+02BB–02BC shu subsetga kiradi), yaʼni latin-ext yuklanmasligi ham mumkin. Lekin 48 KB + swap baribir kritik yoʻlda turadi. Swap paytida matn siljiydi (CLS), “FOUT” koʻrinadi. Buning evaziga olinadigan narsa esa kam: Androidʼdagi Roboto va iOSʼdagi SF Interʼga juda yaqin, Telegramʼning oʻz interfeysi ham shu shriftlarda chiziladi.
Taklif: TMAʼda `--font` = tizim shrifti (0 KB). Inter faqat `--font-brand` orqali ishlatiladi: logo (SVG), iquest.uz, share kartalar va PDF (server tomonda). Veb sayt uchun: faqat `wght` oʻqi, `unicode-range`, latin subset `preload`. Ogʻirliklar yaxlitlanadi (650 → 600/700), lekin ierarxiya oʻlcham orqali saqlanib qoladi.
Taʼsir: **yuqori** (−48…−178 KB, CLS = 0). ✅ QOʻLLANDI (`tokens.css` `--font`, `--font-brand`; §4).

**T4. JS budjeti bir-biriga zid va juda keng.**
Muammo: `DESIGN.md` §14 da “≤ 180 KB gzip”, `CONTRACTS.md` da “≤ 180 (maqsad ≤ 60)”. 180 KB gzip ≈ 600 KB xom JS degani, oʻrta Androidʼda uni parse va bajarish ≈ 0.5 s oladi. Preact + signals ≈ 6 KB, engine + UI + i18n uchun 60 KB bemalol yetadi.
Taklif: kritik yoʻl (S3 va S5 gacha) uchun HTML + CSS + JS ≤ 60 KB gzip, CSS ≤ 10 KB, rasm va shrift 0 KB. CIʼda `vite build` hajmini tekshirish (masalan `size-limit`).
Taʼsir: **yuqori**. ✅ QOʻLLANDI (§14). ⏳ LEAD: `CONTRACTS.md`dagi “≤ 180” ni “≤ 60” ga tenglashtirish.

**T5. Savoldan savolga oʻtish.**
Muammo: §5 ekranlar orasidagi oʻtish uchun 12 px siljish va 220 ms belgilaydi. Agar S5 → S5 ham “ekran almashinuvi” deb hisoblansa, har savolda +220 ms qoʻshiladi. 27 savolda bu 6 s dan ortiq, test “sekin” tuyuladi. Bundan tashqari, CloudStorageʼga saqlashni (Telegram bridge, 50–300 ms) kutib turish ham xavfli.
Taklif: savollar orasida siljish boʻlmaydi, faqat item maydonida ≤ 120 ms opacity. Javob berilgach, keyingi savol 100 ms ichida chizilishi kerak. Saqlash optimistik: kutilmaydi, xato boʻlsa `Banner` chiqadi.
Taʼsir: **yuqori**. ✅ QOʻLLANDI (§5).

**T6. Natija chunki lazy yuklanadi.**
Muammo: S10 alohida chunk. 15 daqiqalik test davomida 4G uzilib qolishi mumkin, shunda “Natijani koʻrish” bosilganda chunk yuklanmaydi va eng muhim lahza yoʻqoladi.
Taklif: 3-boʻlim boshlanganda `import()` natija chunkini idle paytda oldindan yuklaydi. Ball hisoblash lokal (`engine.score`), shuning uchun natija tarmoqsiz ham ochiladi.
Taʼsir: **yuqori**. ✅ QOʻLLANDI (§14, S8).

**T7. Yuklanish va skeleton strategiyasi.**
Muammo: §7 da `Skeleton` bor, lekin qachon ishlatilishi aytilmagan. Test va natija lokal ishlaydi, u yerda skeleton faqat miltillash hosil qiladi. BotFather loading screenʼning fon rangi ham belgilanmagan (oq “chaqnash” boʻladi).
Taklif: skeleton faqat tarmoq kerak boʻlgan joyda (toʻlov, share rasm, tarix): 150 ms kechikish bilan chiqadi, shimmer yoʻq. Loading screen foni = `--bg` (#F5F4FB va #121120). Spinner umuman yoʻq.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§3, §7, S0).

**T8. `waiting_room` (“navbat”) ekrani.**
Muammo: `engine.buildForm` savollarni klientda generatsiya qiladi, test boshlanishi serverga bogʻliq emas. Navbat ekrani oʻzi yuklanishni sekinlashtiradi, foydalanuvchi uchun esa bu bekorchi toʻsiq.
Taklif: navbat faqat server zarur boʻlgan joylarda (toʻlov, share rasm renderi).
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§13 izohi).

**T9. i18n: barcha tillar `eager` yuklanadi.**
Muammo: `import.meta.glob(…, { eager: true })` ikkala tilni ham asosiy chunkka qoʻshadi. Hozirgi ru lugʻati allaqachon ≈ 200 qator.
Taklif: joriy til `eager` qoladi, ikkinchisi `import()` orqali lazy yuklanadi.
Taʼsir: **past** (≈ 5–8 KB). ⏳ LEAD (`CONTRACTS.md`, `packages/i18n`).

**T10. Test rejimida fullscreen.**
Muammo: `requestFullscreen` S5 ga kirilganda viewportʼni oʻzgartiradi (reflow va Telegram animatsiyasi ≈ 300 ms). Fullscreenʼda Telegram yuqoriga oʻz boshqaruv tugmalarini chizadi (≈ 46 px + status bar), shuning uchun aslida yutiladigan joy ≈ 10–20 px.
Taklif: MVPʼda `expand()` + `disableVerticalSwipes()` + `enableClosingConfirmation()` yetarli. Fullscreenʼni real qurilmada A/B bilan tekshirish kerak. Fullscreen qolsa, CalmTimer `--safe-top` ostida turishi shart (qoʻllandi).
Taʼsir: **oʻrta**. ⏳ LEAD (§2 jadvali oʻzgartirilmadi).

**T11. Metrikalar TMAʼga mos emas.**
Muammo: TMAʼda “LCP < 2.5 s” deyarli hech narsani oʻlchamaydi. “Har item SVG ≤ 30 KB” qoidasi esa endi eskirgan: item grafikasi maʼlumotdan chiziladi, alohida SVG fayl yoʻq.
Taklif: quyidagi metrikalar: birinchi kadr ≤ 300 ms, S3 interaktiv ≤ 1.2 s, kesh bilan ≤ 0.6 s, javob → keyingi savol ≤ 100 ms, birinchi savolgacha ≤ 25 s (median). Keshlash: HTML uchun `no-cache`, hash nomli fayllar uchun `immutable`, Brotli.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§14).

---

## 2. Oqim (flow)

**O1. S1 “Til tanlash” keraksiz.**
Muammo: Telegram `initDataUnsafe.user.language_code` ni beradi. Til ekrani har bir yangi foydalanuvchidan 1 ekran va 1 bosish oladi.
Taklif: `ru`, `uk`, `be`, `kk`, `ky`, `tg` → ru; qolganlar → uz-Latn. S2 va S3 sarlavhasida `Oʻz · Ру` chip turadi (44 px bosish zonasi), tilni S16 da ham oʻzgartirish mumkin. Muhim shart: ru lugʻati toʻliq boʻlmaguncha ru foydalanuvchiga ham uz-Latn koʻrsatiladi. Aralash tildagi interfeys til ekranidan ham yomonroq.
Taʼsir: **yuqori**. ✅ QOʻLLANDI (§9, §13).

**O2. Yosh test oxirida soʻraladi (S9).**
Muammo: 18 yoshdan kichik foydalanuvchi 15 daqiqa test ishlaydi, soʻng S18 da “rozilik kelguncha natija saqlanmaydi” degan xabarga duch keladi. Bu eng yomon “kutilmagan toʻsiq” holati. 13–15 yoshlilar ham faqat oxirida “meʼyorlar tayyorlanmoqda” degan xabarni bilib oladi.
Taklif: yosh chiplari S3 ga koʻchiriladi (majburiy, 1 bosish). < 18 boʻlsa, S18 testdan oldin ochiladi. 13–15 yoshlilarga shu yerning oʻzida ogohlantirish beriladi.
Taʼsir: **yuqori**. ✅ QOʻLLANDI (S3, S18).

**O3. Mashq ×2.**
Muammo: har mashq = variant + izoh + “Tushunarli”. Ikkita mashq ≈ 24 s va 4 bosish oladi. Ikkinchi mashq koʻpchilik uchun yangi narsa oʻrgatmaydi. Qolaversa, matritsa mashqi 2- va 3-boʻlim formatini (qator, aylantirish) umuman oʻrgatmaydi.
Taklif: 1-mashq matritsa boʻyicha, 2-mashq (`practice[1]`) faqat 1-mashq xato yechilganda beriladi. Keyingi boʻlimlar formati S6 tanaffusida bitta statik namuna rasm bilan tushuntiriladi. `CONTRACTS.md` oʻzgarmaydi (`practice: 2 ta` qoladi).
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (S4, S6).

**O4. S8 → S9 → S10: natijagacha 2 ekran.**
Muammo: eng yuqori kutilish lahzasida 4–6 savolli anketa turadi. Bundan tashqari, S8 matni (“Barakalla! …”) S10 da aynan takrorlanadi.
Taklif: S8 va S9 bitta ekranga birlashtiriladi: “Barakalla!” + 1 ta ixtiyoriy chip-savol “Chalgʻitildingizmi?” (Yoʻq · Biroz · Ha) + “Natijani koʻrish”. Bu savol natijadan oldin qoladi, aks holda foydalanuvchi natijani koʻrib javobini moslashtirishi mumkin. Viloyat va taʼlim ixtiyoriy, S10 dagi “Meʼyorlarni aniqlashtirishga yordam bering” kartasiga koʻchiriladi.
Taʼsir: **yuqori**. ✅ QOʻLLANDI.

**O5. ConsentSheet — alohida sheet.**
Muammo: sheet ochish, checkbox belgilash va yopish = 2–3 bosish hamda animatsiya.
Taklif: rozilik S3 ichida inline blok boʻladi (qisqa matn, “Toʻliq matn” havolasi, checkbox). “Boshlash” checkbox belgilanmaguncha disabled.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI. ⏳ Yurist: “bosish orqali rozilik” (clickwrap) yetarlimi yoki checkbox shartmi — tekshirish kerak.

**O6. S12 “teng vaznli” talabi va BottomButton.**
Muammo: “Hisobotni olish” native aksent BottomButtonʼda, “Hozir emas” esa sahifa ichida. Bu tugmalar teng vaznli emas, §15 dagi halollik tamoyiliga zid.
Taklif: “Hozir emas” uchun Telegram SecondaryButton ishlatiladi (`color = --soft`, `text_color = --ink`).
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§3, S12).

**O7. Pastki navigatsiya.**
Muammo: §8 ga koʻra S2 da pastki navigatsiya bor, lekin S2 da BottomButton “Testni boshlash” ham bor. Ikki pastki panel ≈ 120 px joy oladi (360 × 610 ekranda bu 20%). MVPʼda yuqori darajali manzil esa atigi ikkita.
Taklif: MVPʼda pastki navigatsiya yoʻq: S2 dagi “Natijalarim” kartasi + sarlavhadagi sozlamalar ikonkasi yetarli. Pastki navigatsiya v1 ga qoladi.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§8).

**O8. Boʻlim va test oxiridagi tugma.**
Muammo: 9-savolda ham “Keyingi” turadi. Foydalanuvchi boʻlim tugashini kutmaydi, keyin tanaffus ekrani kutilmaganda chiqadi.
Taklif: 9-savolda “Boʻlimni yakunlash”, 27-savolda “Testni yakunlash”.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (S5, §13).

**O9. Chiqish va tanaffusda taymer qoidasi aniqlanmagan.**
Muammo: “Testni toʻxtatasizmi? Javoblaringiz saqlanadi.” Lekin boʻlim vaqti bu paytda yuradimi? Taymer toʻxtasa, savolni koʻrib chiqib ketish va keyin qaytib javob berish mumkin boʻladi. Taymer yursa, S7 dagi “davom etasiz” vaʼdasi ochiq-oydin boʻlmaydi.
Taklif: taymer toʻxtaydi, lekin joriy savol “Bilmayman” deb yopiladi va keyingisidan davom etiladi. Qoida S7 matnida aytiladi.
Taʼsir: **oʻrta**. ⏳ LEAD (psixometrik qaror, engineʼga taʼsir qiladi).

**O10. “Tasdiqlanmagan” holati S10 da yoʻq.**
Muammo: S3 da “boshqa ilovaga oʻtsangiz, natijangiz «tasdiqlanmagan» deb belgilanadi” deyilgan. S10 variantlarida esa faqat `reliability=low` (“juda tez javoblar”) bor.
Taklif: matn “«ishonchsiz» deb belgilanishi mumkin” ga oʻzgartirildi va sababga moslashgan `result.unreliable.blur` qoʻshildi. Telegram bildirishnomasi ham `blur` hodisasini chaqirishi mumkin, shu sababli matnda “mumkin” soʻzi qoldirildi.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI.

**O11. `requestWriteAccess` matni joyiga mos emas.**
Muammo: S3 dagi “Keyinroq eslatish” tugmasi `write_access.ask` ni chaqiradi: “Natijangiz tayyor boʻlganda xabar yuborishimizga…”. Test hali boshlanmagan, natija esa baribir darhol chiqadi.
Taklif: S3 uchun “Testni eslatishimiz uchun sizga bot orqali xabar yuborishimizga ruxsat berasizmi?”. Hozirgi matn faqat `age_pending` holatida ishlatiladi.
Taʼsir: **past**. ⏳ LEAD (i18n).

**O12. `unreliable` → “qayta urinib koʻrasizmi?” va “90 kundan keyin”.**
Muammo: ishonchsiz natijadan keyin darhol qayta topshirish mumkinmi, yoki 90 kunlik qoida bunga ham tegishlimi — aniq emas.
Taklif: ishonchsiz natijadan keyin 1 marta darhol qayta topshirishga ruxsat, yangi savollar bilan. Qoida S17 da yoziladi.
Taʼsir: **oʻrta**. ⏳ LEAD.

---

## 3. Vizual va kirish imkoniyati

### Kontrast jadvali (WCAG 2.x, `scratchpad/contrast.py` bilan hisoblandi)

Matn uchun talab ≥ 4.5:1; boshqaruv chegarasi va maʼnoli grafika uchun ≥ 3:1. Qiymatlar **1.1 tokenlari** boʻyicha; 1.0 dan farqi izohda.

| Matn / fon | Yorugʻ | Qorongʻi | Izoh |
|---|---|---|---|
| `--ink` / `--bg` | 15.39 | 16.49 | |
| `--ink` / `--surface` | 16.82 | 15.12 | |
| `--ink` / `--soft` | 14.40 | 13.54 | |
| `--ink` / `--selected-bg` | 14.82 | 13.73 | |
| `--ink-2` / `--bg` | 10.40 | 11.98 | |
| `--ink-2` / `--surface` | 11.36 | 10.98 | |
| `--ink-2` / `--soft` | 9.73 | 9.83 | |
| `--muted` / `--bg` | 5.98 | 7.44 | §3 dagi “≈ 6.0” toʻgʻri |
| `--muted` / `--surface` | 6.53 | 6.82 | |
| `--muted` / `--soft` | 5.59 | 6.11 | |
| `--muted` / `--soft-2` | 5.17 | 5.48 | eng past matn juftligi |
| `--muted` / `--selected-bg` | 5.76 | 6.20 | |
| `--accent` / `--bg` | 6.50 | 6.96 | §3 dagi “≈ 7.0” (qorongʻi) toʻgʻri |
| `--accent` / `--surface` | 7.11 | 6.38 | |
| `--accent` / `--soft` | 6.08 | 5.72 | |
| `--accent` / `--accent-tint` | 6.00 | 5.56 | aksent chip |
| `--accent` / `--selected-bg` | 6.26 | 5.80 | |
| `--on-fill` / `--accent-fill` | 7.11 | 4.76 | qorongʻida zaxira kam (14.5 px/650 “katta matn” emas) |
| `--on-fill` / `--accent-press` | 9.22 | **2.09 ✗** | qorongʻi `--accent-press` och rang, fon sifatida ishlatib boʻlmaydi |
| `--on-fill` / `--accent-fill-press` (yangi) | 9.22 | 6.39 | ✅ bosilgan tugma foni |
| `--surface` / `--accent` (✓ belgisi) | 7.11 | 6.38 | |
| `--warn` / `--warn-tint` | 5.29 | 8.16 | |
| `--warn` / `--surface` | 5.93 | 10.48 | |
| `--warn` / `--bg` | 5.42 | 11.43 | CalmTimer warn |
| `--money` / `--money-tint` | **5.13** | 7.68 | 1.0: **4.38 ✗** (#087F5B) → #077350 |
| `--money` / `--surface` | 5.87 | 9.24 | 1.0: 5.00 |
| `--money` / `--bg` | 5.37 | 10.08 | 1.0: 4.58 |
| `--notice` / `--notice-tint` | 5.05 | 7.53 | |
| `--notice` / `--surface` | 5.79 | 8.78 | |
| `--notice` / `--bg` | 5.30 | 9.58 | |
| `--danger` / `--danger-tint` | 5.28 | 7.05 | |
| `--danger` / `--surface` | 6.18 | 7.55 | |
| `--danger` / `--bg` | 5.65 | 8.24 | |

| Matn boʻlmagan element (≥ 3:1) | Yorugʻ | Qorongʻi | Izoh |
|---|---|---|---|
| `--accent` halqa / `--selected-bg` | 6.26 | 5.80 | tanlangan variant ✓ |
| `--accent` segment / `--soft-2` | 5.63 | 5.12 | progress ✓ |
| `--field-line` / `--surface` | **1.58 ✗** | **1.78 ✗** | input/checkbox chegarasi sifatida yaroqsiz |
| `--field-line` / `--soft` | 1.35 | 1.60 | “?” katak — dekorativ, yoʻl qoʻyiladi |
| `--control-edge` / `--surface` (yangi) | 4.06 | 3.95 | ✅ |
| `--control-edge` / `--soft` | 3.47 | 3.54 | ✅ |
| `--control-edge` / `--bg` | 3.71 | 4.31 | ✅ |
| `--soft-2` boʻsh segment / `--bg` | 1.16 | 1.36 | dekorativ; maʼno “4/9” matnida |
| `--line` / `--surface` | 1.36 | 1.38 | roʻyxat ajratgichi — dekorativ |
| `--surface` / `--bg` (plitka, karta) | 1.09 | 1.09 | faqat soya bilan ajraladi, pastga qarang |
| `--accent-fill` / `--bg` (tugma shakli) | 6.50 | 3.92 | ✓ |

**V1. `--money`/`--money-tint` = 4.38.**
Muammo: “Toʻlov tasdiqlanmoqda” chipi (S13) va narx chipi 4.5:1 dan past. §3 dagi kontrast roʻyxatida bu juftlik umuman tekshirilmagan.
Taklif: `--money` #087F5B → #077350 (tint ustida 5.13, surface ustida 5.87). Rang tusi deyarli oʻzgarmaydi.
Taʼsir: **yuqori** (WCAG buzilishi). ✅ QOʻLLANDI (`tokens.css`, §3).

**V2. Bosilgan asosiy tugma uchun token yoʻq.**
Muammo: `--accent-press` qorongʻida #B3A9FF (havola uchun ataylab ochroq qilingan). Agar u tugma foni sifatida ishlatilsa, oq matn 2.09 beradi.
Taklif: `--accent-fill-press`: yorugʻda #3F31B0 (9.22), qorongʻida #5647D8 (6.39).
Taʼsir: **oʻrta**. ✅ QOʻLLANDI.

**V3. Checkbox va input chegarasi 1.58:1.**
Muammo: `--field-line` “input chegarasi” deb belgilangan, lekin WCAG 1.4.11 talab qiladigan 3:1 ga yetmaydi. ConsentSheet checkboxʼi va S9/S10 dagi selectʼlar deyarli koʻrinmaydi.
Taklif: yangi `--control-edge` token: #7F7B96 / #7A7696. `--field-line` nomi va qiymati saqlanadi, endi faqat dekorativ elementlar uchun (“?” katak).
Taʼsir: **yuqori**. ✅ QOʻLLANDI.

**V4. Qorongʻi mavzuda soya ishlamaydi.**
Muammo: qorongʻida `--surface`/`--bg` = 1.09, `rgba(0,0,0,.45)` soya esa #121120 fonda deyarli koʻrinmaydi. Natijada 8 ta variant plitkasi va kartalar fonga singib ketadi, ayniqsa AMOLED ekranda.
Taklif: qorongʻi `--sh`, `--sh-2`, `--sh-3` tokenlariga `0 0 0 1px rgba(255,255,255,.06–.08)` halqa qoʻshildi (Materialʼdagi “elevation overlay” gʻoyasiga oʻxshash). Token nomlari oʻzgarmadi, komponentlarni tuzatish shart emas. Yorugʻ mavzuda plitkalar glif va `--sh` bilan yetarlicha ajraladi. Agar foydalanuvchi testida plitkalarni “oʻtkazib yuborish” holatlari koʻrinsa, plitkaga `inset 0 0 0 1px var(--line)` qoʻshiladi.
Taʼsir: **yuqori**. ✅ QOʻLLANDI (`tokens.css`, §3).

**V5. S5 ekranga sigʻmaydi.**
Muammo: prototip boʻyicha balandlik: 16 + 44 + 16 + 20 + 16 + matritsa 300 (3 × 88 + 2 × 6 + 24) + 16 + variantlar 160–175 + 16 + 44 + 24 ≈ **670–690 px**. Oʻrta Androidʼda (360 × 800 CSS px, masalan Redmi Note / Galaxy A) foydali joy: 800 − status bar 24 − nav bar 48 − Telegram sarlavhasi 56 − BottomButton 58 ≈ **610 px**. Eni boʻyicha esa hammasi sigʻadi (292 ≤ 328).
Taklif: `--matrix-cell` = 88 px, ≤ 720 px balandlikda 76 px, ≤ 620 px da 64 px. Karta ichki cheti 12 → 8 px, bloklar orasi 16 → 12 px, “4/9” sarlavha qatoriga koʻchadi. Natija: 360 px eni va 76 px katakda ≈ **554 px**, scroll yoʻq. 360 × 640 kabi juda kichik ekranlarda 64 px katak bilan ham ≈ 520 px chiqadi — u yerda qisqa scroll qolishiga rozi boʻlamiz.
Taʼsir: **yuqori**. ✅ QOʻLLANDI (`tokens.css` `--matrix-cell`, `--matrix-gap`, `--tile-gap`; §4, §6, S5 izohi).

**V6. `SeriesRow` 40 px da sigʻmaydi.**
Muammo: 40 px/800 raqamlarda “2, 6, 12, 20, 30, ?” ≈ 400–430 px, mavjud joy esa 328 px.
Taklif: `title-1` (28 px) + qatorni boʻlishga ruxsat.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§6).

**V7. Variant plitkalari oʻlchami.**
Holat: 4 × 2 joylashuvda 360 px da plitka (328 − 3 × 8) / 4 = **76 px**, 390 px da 83.5 px. Ikkalasi ham ≥ 44 px, oraliq 8 px — yaxshi. Glif maydoni ≈ 64 px, shakl ≈ 16 px, 2 px chiziq bilan oʻqiladi. Muammo fazo boʻlimida: 1.0 da u “5 ta roʻyxat” deb yozilgan. Uning balandligi 5 × 72 + 4 × 8 = 392 px, bunga namuna figura qoʻshilsa ekranga sigʻmaydi. `OptionGrid` API esa faqat 2/3/4 ustunni biladi.
Taklif: fazo boʻlimi 3 ustunda (3 + 2), plitka ≈ 104 px. Joylashuv yozuvi “ustun × qator” tartibida birxillashtirildi.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§7).

**V8. Bosish zonalari.**
Muammo: prototipda accordion `summary` 24 px (≥ 44 px boʻlishi kerak). Til chipi va sozlamalar ikonkasi uchun oʻlcham belgilanmagan.
Taklif: har bir bosiladigan element ≥ 44 px, jumladan accordion sarlavhasi va chiplar.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§14).

**V9. “Katta matn” (×1.15) bilan joy yetmaydi.**
Muammo: 360 px da PaywallCardʼdagi ikki tugmaning har biriga ≈ 140 px tegadi. “Hisobotni olish” ≈ 136 px, ×1.15 da ≈ 156 px — sigʻmaydi. S10 sarlavhasi: “Natijangiz” (28 px/800 ≈ 160 px) + “◷ Dastlabki meʼyorlar” chipi (≈ 165 px) + 8 px = 333 px > 328 px, yaʼni oddiy oʻlchamda ham chegarada.
Taklif: qatorlar `flex-wrap` boʻladi. Paywall tugmalari 360 px da yoki “Katta matn” rejimida ustma-ust turadi.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (§4, §7).

**V10. Yashil ✅ oʻlchash rejimida.**
Muammo: S6 va `section.done` da ✅ ishlatilgan. U deyarli barcha platformalarda yashil kvadrat boʻlib chiqadi, §2 esa “test ichida yashil = toʻgʻri signal yoʻq” deydi. Bundan tashqari ✔ (U+2714) va ✓ (U+2713) aralash ishlatilgan.
Taklif: Lucide `check` ikonkasi, `--accent` rangida. Matnda belgi ishlatilmaydi.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI.

**V11. Emoji eski Androidʼda.**
Muammo: 🧊 (Unicode 12) Android ≤ 9 da boʻsh kvadrat (“tofu”) boʻlib chiqadi. StyleBadgeʼda 44 px oʻlchamda bu juda koʻzga tashlanadi.
Taklif: 4 ta uslub emojisi inline SVG sifatida (≈ 1–2 KB).
Taʼsir: **past–oʻrta**. ✅ QOʻLLANDI (§7).

**V12. Fullscreenʼda CalmTimer.**
Muammo: taymer oʻng yuqori burchakda turadi, Telegramʼning “⋯” tugmasi ham aynan shu yerda.
Taklif: taymer `--safe-top` ostida joylashadi (token mavjud).
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (S5 izohi).

**V13. `user-scalable=no`.**
Muammo: `index.html` zoom qilishni bloklaydi (WCAG 1.4.4).
Taklif: “Katta matn” rejimi buni qisman qoplaydi. `user-scalable=no` faqat test rejimida kerak boʻlsa, JS orqali qoʻyilsin.
Taʼsir: **past**. ⏳ LEAD (`apps/`).

**V14. Fokus holati yoʻq.**
Muammo: §7 da hech bir komponent uchun `:focus-visible` belgilanmagan (klaviatura, switch access va veb-versiya uchun kerak).
Taklif: umumiy qoida — 2 px `--accent` halqa, 2 px `outline-offset`.
Taʼsir: **oʻrta**. ✅ QOʻLLANDI (OptionTile). Qolgan komponentlar uchun ⏳ UI agenti.

---

## 4. Ziddiyatlar (DESIGN.md ichida va hujjatlar orasida)

| # | Ziddiyat | Qaror | Holat |
|---|---|---|---|
| Z1 | §0: “Asos — DESIGN-SYSTEM.md”, lekin bunday fayl repoda yoʻq | Bu fayl qoʻshilguncha `DESIGN.md` va `tokens.css` yagona manba | ✅ |
| Z2 | §0: `packages/ui/components/*`, `CONTRACTS.md`da esa `packages/ui/src/*` | `src` | ✅ |
| Z3 | §2: “test ichida yashil yoʻq”, lekin S6 va `section.done` da ✅ | ✅ olib tashlandi | ✅ |
| Z4 | §8: S2 da pastki navigatsiya, S2 da esa BottomButton ham bor | MVPʼda pastki navigatsiya yoʻq | ✅ |
| Z5 | §8: navigatsiyada “Natijalarim” va “Profil” alohida, S15 da esa ular bitta ekran | v1 ga qoldirildi; S15 bitta ekran | ✅ |
| Z6 | S12 “teng vaznli”, lekin tugmalardan biri native aksent BottomButton | SecondaryButton | ✅ |
| Z7 | ScoreBandCard misoli: 104–116 → “60–75 tasidan yuqori”. μ=100, σ=15 da 104 = 60.5-, 116 = 85.7-persentil | “61–86” | ✅ |
| Z8 | Test 15 daqiqa (3 × 5), lekin misolda “16 daqiqada javob berdingiz” | “14 daqiqada” | ✅ |
| Z9 | §14: JS ≤ 180 KB; `CONTRACTS.md`: “maqsad ≤ 60 KB” | ≤ 60 KB | ✅ (DESIGN) / ⏳ (CONTRACTS) |
| Z10 | §14: “har item SVG ≤ 30 KB”, `CONTRACTS.md`da esa glif maʼlumotdan chiziladi | qoida olib tashlandi | ✅ |
| Z11 | §7: OptionTile fazo uchun “5 ta roʻyxat”, `OptionGrid` esa faqat `columns: 2 \| 3 \| 4` | 3 ustun (3 + 2) | ✅ |
| Z12 | §7 “2×4 (matritsa), 3×2 (qator)” — qaysi son ustun, qaysi qator? | “ustun × qator”: 4×2, 3×2 | ✅ |
| Z13 | S3 “«tasdiqlanmagan» deb belgilanadi”, S10 da bunday holat yoʻq | «ishonchsiz» + `result.unreliable.blur` | ✅ |
| Z14 | `result.strongest` = “Eng kuchli tomoningiz: {style}”, lekin {style} — uslub nomi (“Naqsh ovchisi”), tomon emas | `{domain}` | ✅ |
| Z15 | `result.growth` kunlik jumboqlarni tilga oladi, ular esa v1 da | MVPʼda koʻrsatilmaydi | ✅ |
| Z16 | `waiting_room`, lekin test lokal ishlaydi | faqat server kerak boʻlgan joyda | ✅ |
| Z17 | §1 “tugma = amal feʼli”, lekin “Boshladik!” | “Boshlash” | ✅ |
| Z18 | S2 “27 savol”, S3 va `test.intro.meta` da “27 ta savol” | “27 ta savol” | ✅ |
| Z19 | §3 “kontrast ≥ 4.5 (§3 da tekshirilgan)”, lekin `--money`/`--money-tint` tekshirilmagan va 4.38 chiqdi | jadval toʻldirildi, token tuzatildi | ✅ |
| Z20 | `--field-line` “input chegarasi” deb yozilgan, lekin 3:1 dan past | `--control-edge` | ✅ |
| Z21 | §4 “Katta matn ×1.15”, lekin 360 px dagi yonma-yon tugmalar bunga moslanmagan | `flex-wrap` / ustma-ust | ✅ |
| Z22 | §9 S13 “`pending` → `--money` chip”, §3 da esa holat jadvali “toʻlov kutilmoqda = `--money`” | mos, oʻzgarish kerak emas | — |

---

## 5. Komponentlar (§7, birma-bir)

360 px ekranda kontent eni 328 px (16 px chetlar).

| Komponent | Yetishmayotgan holat | Kirish imkoniyati (a11y) | 360 px da oʻlcham | Qaror |
|---|---|---|---|---|
| `Button` | fokus; loading = spinner + `aria-busy`, bosish bloklanadi; `press` = `--accent-fill-press` | disabled holatda `aria-disabled` (fokus olib qoʻyilmaydi) | 50 px (kichik 44 px); matn ≤ 22 belgi | ✅ token; fokus — ⏳ UI |
| `OptionTile` | *bosilgan* va *fokus* holatlari yoʻq edi | `role="radio"`, “Variant 3, tanlangan”; strelka tugmalari `OptionGrid`da | 76 px (390 px da 83.5 px), oraliq 8 px | ✅ §7 |
| `MatrixGrid` | — | `role="img"` + javobni oshkor qilmaydigan label (“3×3 naqsh jadvali, oxirgi katak boʻsh”) | `--matrix-cell` 88 / 76 / 64 | ✅ |
| `SeriesRow` | uzun qator | raqamlar oddiy matn — SR oʻqiydi; “?” → “nomaʼlum” | 28 px, qator boʻlinadi | ✅ |
| `SectionProgress` | — | `role="progressbar"`, `aria-valuenow`/`max`; segmentlar `aria-hidden` | 9 × ≈ 28 px, 6 px | ✅ |
| `CalmTimer` | “tugadi” holati; yashirin + warn birga | har soniya eʼlon qilinmaydi; faqat warn da `polite` | 44 px bosish zonasi | ✅ |
| `ScoreBandCard` | past oraliq varianti (§9 da bor, §7 da yoʻq); egri chiziq animatsiyasi reduced-motionʼda | egri chiziq `aria-hidden`, oraliq matn sifatida | `display` 40 px — “104–116” ≈ 170 px, sigʻadi | ✅ persentil |
| `StyleBadge` | emoji fallback | emoji `aria-hidden` | ru nomlar (“Пространственный архитектор”, 27 belgi) 2 qatorga oʻtadi — ruxsat | ✅ SVG emoji |
| `StrengthBars` | — | “Naqsh: kuchli” deb oʻqiladi | “oʻsish zonasi” bilan chiziq ≈ 150 px (1.0 da ≈ 115 px) | ✅ |
| `PaywallCard` | *toʻlov kutilmoqda*, *sotib olingan* holatlari yoʻq edi | ikkala tugma bir xil rol va oʻlchamda | ≈ 140 px dan ikki tugma — tor, ustma-ust | ✅ |
| `ShareSheet` | preview yuklanmoqda; xato; `downloadFile` yoʻq boʻlsa (eski klient) fallback | preview `aria-label` | preview 1:1 ≈ 280 px | ✅ holatlar |
| `ConsentSheet` | inline variant | checkbox ≥ 24 px, zona 44 px, `--control-edge` | — | ✅ |
| `StatusChip` | `neutral` rangi aniqlanmagan edi | rang + soʻz + belgi | 24 px, `nowrap`, lekin qator `wrap` | ✅ |
| `ObjectCard` | press (`--soft-2`), fokus; butun karta bitta tugma | sarlavha — accessible name | ≤ 5 maʼno oʻrni ✓ | ⏳ UI |
| `PageHeader` | chip bilan sarlavha sigʻmaydi | `h1` | `wrap` | ✅ §4 |
| `EmptyState` | — | ikonka `aria-hidden` | — | — |
| `Skeleton` | qachon koʻrsatilishi | `aria-busy` konteynerda | — | ✅ |
| `Banner` (yangi) | offline / saqlanmadi | `role="status"` | 1 qator + tugma | ✅ qoʻshildi |
| `Sheet`, `Accordion`, `BottomBar`, `Glyph`, `OptionGrid`, `Card`, `Screen` | `CONTRACTS.md`da bor, §7 da yoʻq | Sheet: fokus tuzogʻi, BackButton yopadi; Accordion: 44 px sarlavha | — | ⏳ §7 ga qisqa qator qoʻshish (keyingi versiya) |

---

## 6. Matn va soʻzlar

**Umumiy qoidalar (tekshirildi):**
- **Apostroflar.** §13 dagi barcha UI satrlarida `ʻ` (U+02BB, oʻ/gʻ) va `ʼ` (U+02BC, tutuq belgisi: maʼlumot, meʼyor, taʼsir) toʻgʻri ishlatilgan. Xato faqat §7 dagi uslub tavsiflarida topildi: “ilg'aysiz”, “bog'liqlik”, “ko'rasiz”, “yo'nalish” oddiy ASCII `'` bilan yozilgan. Bu satrlar UI ga chiqadi, shuning uchun tuzatildi. Hujjat nasrida ASCII `'` ishlatish — muallifning ongli uslubi (UI satrlari emas), oʻzgartirilmadi.
- **Qoʻshtirnoq.** Aralash ishlatilgan: `“tasdiqlanmagan”` va `«{style}»`. Qaror: UI da `« »`.
- **“Siz”.** Hamma joyda “siz” bilan murojaat qilingan. Istisno — share matnlari (“Sen ham sinab koʻr”). Bu ataylab qilingan: bu gaplar foydalanuvchining doʻstiga oʻz ovozidan aytadigan gapi. Qoldirildi.
- **Tugma = feʼl.** Buzilgan joylar: “Boshladik!” (tuzatildi → “Boshlash”), “Tushunarli” (sifat; mashqda qabul qilinadi — qisqa va iliq), “Keyingi” (odatiy, qoldirildi), “Bilmayman” (foydalanuvchining javobi, tugma-amal emas — qoldirildi).
- **Uzunlik.** Hisob 14.5 px/650 da ≈ 8 px/belgi + 2 × 8 px ichki chet boʻyicha. BottomButtonʼda (≈ 328 px) barcha satrlar sigʻadi. Tor joylar: PaywallCardʼdagi yarim tugma (≈ 140 px): “Hisobotni olish” ≈ 136 px ✓, ×1.15 da ✗; ru “Получить отчёт” ≈ 128 px ✓, ×1.15 da ✗. Qaror: tugmalar ustma-ust.

### §13 satrlari, birma-bir

| Kalit | Baho | Izoh / tuzatish |
|---|---|---|
| `promise` | ✓ | Qisqa, halol. |
| `home.cta` | ✓ | Feʼl. |
| `test.intro.meta` | ✓ | S2 dagi “27 savol” shunga moslashtirildi (“27 ta savol”). |
| `test.intro.free` | ✓ | |
| `test.intro.quiet` | ✓ | 🤫 “sir tut” deb oʻqilishi mumkin — past xavf, qoldirildi. |
| `test.intro.integrity` | **tuzatildi** | “Diqqat: … belgilanadi” — ohangi tahdidli, S10 da mavjud boʻlmagan holatga ishora qiladi va har doim ham rost emas (Telegram bildirishnomasi ham `blur` chaqiradi). → “Test davomida boshqa ilovaga oʻtmang — aks holda natija «ishonchsiz» deb belgilanishi mumkin.” |
| `test.intro.cta` | **tuzatildi** | “Boshladik!” → “Boshlash”. |
| `test.intro.later` | ✓ | |
| `practice.correct` | **tuzatildi** | Izoh bitta itemga bogʻlab qoʻyilgan edi → “Toʻgʻri!” + `practice.explain.{itemId}`. |
| `practice.wrong` | ✓ | “Unchalik emas” — iliq, sharmanda qilmaydi. |
| `test.skip` | ✓ | “Bilmayman” — halol, taxmin qilishni ragʻbatlantirmaydi. |
| `test.next` | ✓ | Yangi: `test.section.finish` “Boʻlimni yakunlash”, `test.finish` “Testni yakunlash”. |
| `test.timer.hide` | ✓ | Yangi: `test.timer.show` “Vaqtni koʻrsatish” (prototipda bor, bankda yoʻq edi), `test.timeup`. |
| `test.timer.warn` | ✓ | |
| `test.exit.confirm` | ✓ | Tugmalar kaliti yoʻq edi → `test.exit.continue` / `test.exit.stop`. Taymer qoidasi — O9. |
| `section.done` | **tuzatildi** | ✅ olib tashlandi, gap nuqta bilan tugaydi. |
| `resume.body` | ✓ | Grammatika toʻgʻri (“2-boʻlimning 4-savolidan”). |
| `finish.body` | izoh | “27 ta savolga javob berdingiz” — “Bilmayman” bosilgan savollar ham javob hisoblanadi. Qabul qilinadi. ru varianti “на все вопросы” — rost emas (quyida). |
| `result.title` | ✓ | |
| `result.band.label` | ✓ | |
| `result.pct` | **tuzatildi** | “100 kishidan … tasidan” — ikki marta chiqish kelishigi, “ta” esa odamlar uchun ishlatilmaydi. → “Har 100 kishidan taxminan {low}–{high} nafaridan yuqori”. |
| `result.norms.provisional` | ✓ | |
| `result.strongest` | **tuzatildi** | `{style}` → `{domain}` (Z14). |
| `result.means` | ✓ | Ilmiy va halol. |
| `result.conditions` | ✓ | |
| `result.growth` | izoh | v1 gacha koʻrsatilmaydi. Jumla “IQ oshadi” deb emas, “topshiriq turlarida” deb yozilgan — halol. |
| `result.snapshot` | ✓ | |
| `result.unreliable` | ✓ | Yangi: `result.unreliable.blur`, `result.retake`. |
| `result.age_pending` | ✓ | |
| `result.worried` | izoh | Havola qayerga olib borishi aniqlanmagan. Taklif: S17 dagi “Natija nimani anglatmaydi” boʻlimi. |
| `result.retest` | ✓ | |
| `paywall.title` | ✓ | |
| `paywall.items` | **tuzatildi** | 4 ta band bitta satrga ✔ bilan yopishtirilgan edi → alohida kalitlar, belgi ikonka bilan. |
| `paywall.terms` | **tuzatildi** | “7 kun ichida pul qaytariladi” — “7 kunda pul avtomatik qaytadi” deb oʻqiladi. → “7 kun ichida soʻrasangiz, pulingiz qaytariladi.” |
| `paywall.cta` / `paywall.decline` | ✓ | Ikkalasi ham neytral, rad etish sharmanda qilmaydi. |
| `share.cta` | ✓ | Yangi: `result.share` “Natijani ulashish” (S10 BottomButton, bankda yoʻq edi). |
| `share.style_only` | izoh | “aql testini” — mahsulot nomi “IQ testi”. Taklif: “IQ testini topshirdim”. |
| `share.with_score` | izoh | “{high} 🧠 Eng” — emoji oldidan nuqta yoʻq. Taklif: “…{high}. 🧠 Eng kuchli…” |
| `share.story` | ✓ | |
| `write_access.ask` | izoh | Joyiga mos emas — O11. |
| `home_screen.ask` | izoh | “keyingi testga” — keyingi test 90 kundan keyin. Taklif: bosh ekranga qoʻshishni v1 ga (kunlik jumboq bilan) qoldirish. |
| `consent.minor` / `.cta` | ✓ | Endi test oldidan koʻrsatiladi (O2). |
| `waiting_room` | izoh | Z16. |
| `settings.delete` | ✓ | |
| `privacy.short` | kichik | “Istalgan payt oʻchirasiz” — maʼnosi toʻgʻri, lekin qattiq eshitiladi. Taklif: “Istalgan payt oʻchirib tashlashingiz mumkin.” |
| `bot.*` | ✓ | Ohang iliq, bosim yoʻq. `bot.paused` — namunali. |

### §7 va §9 dagi satrlar

| Satr | Baho | Tuzatish |
|---|---|---|
| Uslub: “Sonlar orasidagi bogʻliqlikni yaxshi koʻrasiz” | **tuzatildi** | “yaxshi koʻrmoq” = “sevmoq”, yaʼni gap “bogʻliqlikni sevasiz” deb oʻqiladi. → “…tez payqaysiz”. |
| Uslub: “Barcha yoʻnalishlarda bir tekis” | **tuzatildi** | Kesimi yoʻq, gap tugallanmagan. → “…bir tekis kuchlisiz”. |
| Uslub: “Qonuniyat va naqshlarni tez ilgʻaysiz” | apostrof tuzatildi | |
| StrengthBars: “rivojlanish zonasi” | **tuzatildi** | 360 px da kesilardi (wireframeʼda “rivojlanish z.”) → “oʻsish zonasi” (ru “зона роста” bilan ham mos). |
| S2 chip “Bepul” | izoh | Rang tanlanmagan edi → `accent` (yashil faqat pul uchun; “bepul” narx emas, vaʼda). |
| S6 “1-boʻlim yakunlandi ✅” | **tuzatildi** | ✅ olib tashlandi. |
| S8 “16 daqiqada” | **tuzatildi** | “14 daqiqada” (Z8). |
| S10 “60–75 tasidan yuqori” | **tuzatildi** | “Har 100 kishidan taxminan 61–86 nafaridan yuqori”. |
| S3 CTA “Boshladik” | **tuzatildi** | “Boshlash”. |

### Rus tilidagi koʻzgu (namuna va tuzatishlar)

Hozirgi `packages/i18n/locales/ru/*` qoralamasi (i18n agenti yozmoqda; oʻzim tegmadim) boʻyicha:

| Kalit | Hozir | Taklif |
|---|---|---|
| `promise` | Результат бесплатно. Никаких скрытых подписок. | Результат — бесплатно. Никаких скрытых подписок. |
| `test.intro.cta` | Начинаем! | Начать |
| `test.intro.integrity` | …результат будет отмечен как «неподтверждённый». | Не переключайтесь на другие приложения во время теста — иначе результат может быть отмечен как «ненадёжный». |
| `section.done` | Раздел {n} завершён ✅ … | Раздел {n} завершён. Спасибо за внимание. Продолжайте, когда будете готовы. |
| `finish.body` | Отлично! Вы ответили на все вопросы: {count} за {minutes} мин. | Отлично! {count} вопросов за {minutes} мин. |
| `result.pct` | Выше, чем примерно у {low}–{high} человек из 100 | ✓ (uz ga qaraganda aniqroq) |
| `result.strongest` | Ваша самая сильная сторона: {style} | …: {domain} |
| `paywall.terms` | Разовая оплата. Не подписка. Возврат в течение 7 дней. | Разовая оплата. Не подписка. Вернём деньги, если попросите в течение 7 дней. |
| `strength.strong` / `.medium` | сильная / средняя | ✓ (“сторона” soʻziga mos). “Числа: сильная” kabi yonma-yon qoʻyilganda biroz gʻalati. Muqobil: “сильно / средне / зона роста”. |
| `test.next` | Далее | ✓ |
| Yangi | — | `test.section.finish` “Завершить раздел”, `test.finish` “Завершить тест”, `test.timeup` “Время раздела вышло. Ответы сохранены.”, `survey.distracted.some` “Немного” |

---

## 7. Qoʻllangan oʻzgarishlar (prioritet boʻyicha)

1. **Oqim** (`DESIGN.md` §9): S1 olib tashlandi (`language_code` + `Oʻz · Ру` chip); birinchi kirish S0 → S3; yosh S3 ga koʻchdi (< 18 → S18 testdan oldin); mashq adaptiv (1 + faqat xato boʻlsa 2-si); S8 + S9 birlashdi; viloyat va taʼlim S10 dagi ixtiyoriy kartaga koʻchdi; rozilik S3 ichida inline; 9- va 27-savolda yakunlash tugmalari; S12 da SecondaryButton.
2. **Tezlik budjeti** (§14): kritik yoʻl ≤ 60 KB gzip, 0 KB shrift va rasm, vaqt metrikalari, `telegram-web-app.js` → `defer`, natija chunki oldindan yuklanadi, keshlash. §5: savollar orasida siljish yoʻq, ≤ 100 ms. §7 `Skeleton`: faqat tarmoq kutilganda.
3. **Shrift** (§4, `tokens.css`): `--font` = tizim shrifti; yangi `--font-brand` (Inter faqat brend, share, PDF, veb uchun); subset hajmlari oʻlchandi.
4. **Kontrast** (`tokens.css`, §3): `--money` #087F5B → #077350; yangi `--accent-fill-press`, `--control-edge`; qorongʻi `--sh*` ga 1px halqa; §3 dagi kontrast qatori hisoblangan qiymatlar bilan almashtirildi.
5. **S5 maketi** (`tokens.css`, §4, §6, S5): `--matrix-cell` (88 / 76 / 64), `--matrix-gap`, `--tile-gap`; balandlik budjeti; 360 × 610 px tekshiruv oʻlchami; SeriesRow 28 px; fazo 3 ustunda.
6. **Komponentlar** (§7): OptionTile holatlari (press, fokus); CalmTimer (tugadi, `aria-live`); ScoreBandCard persentili; StyleBadge SVG emoji; StrengthBars “oʻsish zonasi”; PaywallCard holatlari va ustma-ust tugmalar; ShareSheet holatlari; StatusChip neutral; yangi `Banner`.
7. **Ziddiyatlar**: Z1–Z21 (4-boʻlimdagi jadval).
8. **Matnlar** (§13): `test.intro.integrity`, `test.intro.cta`, `section.done`, `result.pct`, `result.strongest`, `paywall.terms`, uslub tavsiflari, ru `promise` va `paywall.terms` tuzatildi. Yangi kalitlar: `test.section.finish`, `test.finish`, `test.timer.show`, `test.timeup`, `test.exit.continue`, `test.exit.stop`, `survey.distracted(.no/.some/.yes)`, `survey.age`, `finish.cta`, `lang.switch`, `result.unreliable.blur`, `result.retake`, `result.share`, `practice.explain.{itemId}`, `error.offline`, `common.retry`. Kalit nomlari i18n agenti ishlatayotgan nomlarga moslashtirildi.
9. **Navigatsiya** (§8): MVPʼda pastki navigatsiya yoʻq.

### Qoʻllanmagan — lead qarori kerak (⏳)
- `apps/tma/index.html`: telegram-web-app.js uchun `defer`, `preconnect`, inline shell, `theme-color`; `user-scalable=no` ni qayta koʻrib chiqish.
- `docs/CONTRACTS.md`: “≤ 180 KB” → “≤ 60 KB”; i18nʼda faqat joriy til `eager`.
- `packages/i18n/locales/*`: §13 dagi yangi qiymatlar va kalitlarni sinxronlash (uz va ru); ru lugʻati toʻliq boʻlmaguncha `ru` avtomatik tanlanmasin.
- UI agenti: `--accent-fill-press`, `--control-edge` va `:focus-visible` dan foydalanish; S5 da `--matrix-cell`/`--tile-gap`; checkbox `--control-edge` bilan.
- Test rejimida fullscreen (T10), chiqishda taymer qoidasi (O9), ishonchsiz natijadan keyin qayta topshirish (O12), clickwrap rozilik (O5, yurist).
