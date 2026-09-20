# Lumina — Cinematic Media Platform

YouTube-style video platform: watch, chunked resumable upload (up to 2GB),
channels, subscriptions, playlists, Watch Later / Liked / History,
Creator Studio, admin panel with impersonation, 3-language UI (en/uz/ru).

Built with **Next.js 16** (App Router, standalone output), **React 19**,
**Prisma 6 + PostgreSQL**, **Tailwind CSS v4**, **zustand**, **zod**, **jose** (JWT).

## Quickstart (Windows / any OS)

```bash
npm ci
cp .env.example .env   # fill in real values (see table below)
node prisma/pg-dev.mjs --serve   # embedded dev Postgres (or point DATABASE_URL at your own)
npx prisma generate
npx prisma migrate deploy
npx prisma db seed      # optional demo content (demo@lumina.tv / password123 — dev only)
npm run dev             # http://localhost:3000
```

Windows shortcut: `start.bat` (install → embedded Postgres → migrate → dev).
Set `SEED_DEMO=1` before running it if you want demo content.

## Environment

| Var | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes (prod) | Min 32 random chars. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. App refuses to boot in production without it |
| `NEXT_PUBLIC_APP_NAME` | no | Brand name in UI (default `Lumina`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | yes (prod) | Admin panel (`/admin`) login. Set via `fly secrets set`, never commit |
| `TRANSCODE_TIMEOUT_MS` | no | Background transcode guard |
| `ALLOWED_DEV_ORIGINS` | no | Comma-separated LAN IPs allowed for dev HMR |

See `.env.example` for the template. `.env` is git-ignored — never commit it.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate && next build` |
| `npm run start` | Prod server (local) |
| `npm run lint` | `eslint .` |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:seed` | Demo seed (dev only) |
| `npm run db:pg` | Embedded dev Postgres |

## How upload works

1. Client splits files into 8MB chunks → `POST /api/upload/chunk`
2. `GET /api/upload/chunk?uploadId=` reports received chunks (resume after refresh)
3. `POST /api/upload/complete` assembles chunks to disk (streamed, size-capped at 2GB), validates MIME **and** extension, sanitizes file extension, cleans up orphan files if DB write fails
4. Videos >1GB are queued for background compression (`src/lib/transcode.ts`)

## Deploy (Docker / Fly.io)

```bash
docker build -t lumina .
docker run -p 3000:3000 --env-file .env lumina
fly deploy   # uses Dockerfile + fly.toml (volume lumina_uploads → /data)
```

Prod checklist: `fly secrets set JWT_SECRET=... ADMIN_USERNAME=... ADMIN_PASSWORD=... DATABASE_URL=...`,
healthcheck path `/` (or add `/api/health`), Redis-backed rate limit for multi-instance
(current `src/lib/ratelimit.ts` is in-memory).

## Project structure

```
src/app/            # App Router pages + /api routes
src/components/     # layout / video / ui
src/lib/            # auth, admin, db, storage, transcode, validations, ratelimit
src/store/          # zustand (auth, settings, locale, ui)
src/i18n/           # en/uz/ru dictionaries
prisma/             # schema.prisma, migrations, seed.ts, pg-dev.mjs
public/uploads/     # local dev storage (git-ignored, Fly volume in prod)
```

## Security notes

- Session (`lumina_session`, 14d) and admin (`lumina_admin`, 12h) cookies are HS256 JWT, `httpOnly`, `SameSite=Lax`, `Secure` in prod
- Admin impersonation cookie is a signed JWT (`role: impersonate`), not a raw user id
- Upload validates MIME type **and** extension, allow-lists extensions (`.mp4/.webm/.ogg/.mov/.mkv`, thumbs `.jpg/.png/.webp`), caps stream size to prevent disk-fill
- Auth/comment/like/subscribe/upload endpoints are rate-limited (in-memory; use Redis in prod multi-instance)
- Never commit `.env`, `public/uploads/*`, `prisma/pgdata/`, `.next/` — all git-ignored

## License

MIT — see [LICENSE](LICENSE).
"# LuminaMedia" 
