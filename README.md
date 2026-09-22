# Lumina — Kinematik Media Platforma

🌐 **Jonli demo:** https://lumina-media.fly.dev/

YouTube uslubidagi video platforma: tomosha qilish, bo'laklab yuklash (2GB gacha, davom ettirish imkoniyati bilan),
kanallar, obunalar, pleylistlar, Keyin ko'rish / Yoqdi / Tarix,
Ijodkor studiyasi, impersonatsiya funksiyali admin panel, 3 tilli interfeys (o'zbek / ingliz / rus).

**Next.js 16** (App Router, standalone), **React 19**,
**Prisma 6 + PostgreSQL**, **Tailwind CSS v4**, **zustand**, **zod**, **jose** (JWT) asosida qurilgan.

## Tezkor ishga tushirish (Windows / istalgan OT)

```bash
npm ci
cp .env.example .env   # haqiqiy qiymatlarni kiriting (pastdagi jadvalga qarang)
node prisma/pg-dev.mjs --serve   # ichki dev Postgres (yoki DATABASE_URL ni o'zingiznikiga yo'naltiring)
npx prisma generate
npx prisma migrate deploy
npx prisma db seed      # ixtiyoriy demo kontent (demo@lumina.tv / password123 — faqat dev uchun)
npm run dev             # http://localhost:3000
```

Windows uchun: `start.bat` (o'rnatish → ichki Postgres → migratsiya → dev).
Demo kontent kerak bo'lsa, ishga tushirishdan oldin `SEED_DEMO=1` ni o'rnating.

## Muhit o'zgaruvchilari

| O'zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `DATABASE_URL` | ha | PostgreSQL ulanish satri |
| `JWT_SECRET` | ha (prod) | Kamida 32 ta tasodifiy belgi. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Prod'da usiz ilova ishga tushmaydi |
| `NEXT_PUBLIC_APP_NAME` | yo'q | Interfeysdagi brend nomi (standart `Lumina`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | ha (prod) | Admin panel (`/admin`) logini. `fly secrets set` orqali o'rnating, hech qachon commit qilmang |
| `TRANSCODE_TIMEOUT_MS` | yo'q | Fon transkoding himoyasi |
| `ALLOWED_DEV_ORIGINS` | yo'q | Dev HMR uchun ruxsat etilgan LAN IP'lar (vergul bilan) |

Shablon uchun `.env.example` ga qarang. `.env` git'da kuzatilmaydi — uni hech qachon commit qilmang.

## Skriptlar

| Skript | Vazifasi |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate && next build` |
| `npm run start` | Prod server (lokal) |
| `npm run lint` | `eslint .` |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:seed` | Demo seed (faqat dev) |
| `npm run db:pg` | Ichki dev Postgres |

## Yuklash qanday ishlaydi

1. Klient fayllarni 8MB bo'laklarga bo'lib → `POST /api/upload/chunk` ga yuboradi
2. `GET /api/upload/chunk?uploadId=` qabul qilingan bo'laklarni qaytaradi (sahifa yangilanganda davom ettirish)
3. `POST /api/upload/complete` bo'laklarni diskda yig'adi (oqimli, 2GB limit), MIME **va** kengaytmani tekshiradi, kengaytmani tozalaydi, DB yozuvi muvaffaqiyatsiz bo'lsa yetim fayllarni o'chiradi
4. 1GB dan katta videolar fon siqishga navbatga qo'yiladi (`src/lib/transcode.ts`)

## Deploy (Docker / Fly.io)

```bash
docker build -t lumina .
docker run -p 3000:3000 --env-file .env lumina
fly deploy   # Dockerfile + fly.toml ishlatadi (lumina_uploads volume → /data)
```

Prod ro'yxat: `fly secrets set JWT_SECRET=... ADMIN_USERNAME=... ADMIN_PASSWORD=... DATABASE_URL=...`,
healthcheck yo'li `/` (yoki `/api/health` qo'shing), ko'p nusxali rejim uchun Redis'li rate limit
(hozirgi `src/lib/ratelimit.ts` xotirada ishlaydi).

## Loyiha tuzilishi

```
src/app/            # App Router sahifalar + /api yo'llar
src/components/     # layout / video / ui
src/lib/            # auth, admin, db, storage, transcode, validations, ratelimit
src/store/          # zustand (auth, settings, locale, ui)
src/i18n/           # o'zbek / ingliz / rus lug'atlar
prisma/             # schema.prisma, migratsiyalar, seed.ts, pg-dev.mjs
public/uploads/     # lokal dev ombori (git'da kuzatilmaydi, prod'da Fly volume)
```

## Xavfsizlik eslatmalari

- Sessiya (`lumina_session`, 14 kun) va admin (`lumina_admin`, 12 soat) cookielar HS256 JWT, `httpOnly`, `SameSite=Lax`, prod'da `Secure`
- Admin impersonatsiya cookie imzolangan JWT (`role: impersonate`), xom user id emas
- Yuklashda MIME tur **va** kengaytma tekshiriladi, ruxsat etilgan kengaytmalar (`.mp4/.webm/.ogg/.mov/.mkv`, prevyu `.jpg/.png/.webp`), disk to'lib ketmasligi uchun oqim hajmi cheklangan
- Auth/izoh/like/obuna/yuklash endpoint'lar rate-limit'da (xotirada; prod multi-instance'da Redis ishlating)
- `.env`, `public/uploads/*`, `prisma/pgdata/`, `.next/` ni hech qachon commit qilmang — barchasi git-ignored

## Litsenziya

MIT — [LICENSE](LICENSE) ga qarang.
