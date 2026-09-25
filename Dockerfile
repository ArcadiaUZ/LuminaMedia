# Lumina Media Platform — production Dockerfile (multi-stage, Next.js standalone)
# Har qanday serverda ishlaydi: docker compose up --build (Fly.io shart emas).
# Uploads UPLOAD_DIR env orqali ($PWD/public/uploads default, compose'da /data/uploads).
# Node 20 LTS (Next 16 talabi: 20.9+). Prisma 6 + ffmpeg-static bilan mos.

# ---- 1) Bog'liqliklar ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- 2) Build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* build-time inline bo'ladi — Fly runtime env ishlamaydi, shuning uchun ARG
ARG NEXT_PUBLIC_APP_NAME=Lumina
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
# DB'ga tegadigan prerender bo'lsa build yiqilmasligi uchun dummy URL
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
ENV DATABASE_URL=$DATABASE_URL
# Build-time dummy'lar: `next build` paytida src/lib/admin.ts modul baholashdan
# o'tishi uchun (prod'da env bo'lmasa throw qiladi). Faqat builder layer'da
# yashaydi — runtime'da fly secrets'dagi haqiqiy qiymatlar ishlatiladi.
ARG ADMIN_PASSWORD="build-only-dummy-not-used-at-runtime"
ENV ADMIN_PASSWORD=$ADMIN_PASSWORD
ARG JWT_SECRET="build-only-dummy-secret-0123456789abcdef-0123456789abcdef"
ENV JWT_SECRET=$JWT_SECRET
RUN npx prisma generate
RUN npm run build

# ---- 3) Runner (minimal) ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs \
 && apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Boot'da `prisma migrate deploy` uchun schema + TO'LIQ prod node_modules
# (prisma CLI transitive dep'lari — masalan `effect` — ildizda bo'ladi,
# qisman nusxalash "Cannot find module" beradi, shuning uchun prune usuli).
# NOTE: prisma devDependencies'da bo'lgani uchun prune'dan keyin CLI o'chadi.
# Shuning uchun runner'da uni qayta o'rnatamiz (prod migrate uchun shart).
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm install --no-save prisma@6.19.3 && npm cache clean --force

# Next.js standalone server (server.js + minimal node_modules + public)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema/migratsiyalar (migrate deploy uchun)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Upload'lar: UPLOAD_DIR (/data/uploads default — compose volume).
# Eski Fly volume bilan moslik uchun /data/uploads ga symlink ham saqlanadi.
RUN rm -rf ./public/uploads && mkdir -p /data/uploads \
  && ln -s /data/uploads ./public/uploads \
  && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

# Har boot'da: uploads papka (UPLOAD_DIR hurmati) → migratsiya → server
CMD ["sh", "-c", "U=${UPLOAD_DIR:-/data/uploads}; mkdir -p \"$U\" \"$U/videos\" \"$U/thumbnails\" \"$U/tmp\" && ./node_modules/.bin/prisma migrate deploy && node server.js"]
