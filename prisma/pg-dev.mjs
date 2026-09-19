// Local Postgres for development (real server, no install needed).
// Binaries come from the `embedded-postgres` devDependency (official builds).
// Data persists in prisma/pgdata. Production uses external Postgres —
// only DATABASE_URL changes.
import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.PG_PORT ?? 5433);
const USER = process.env.PG_USER ?? "lumina";
const PASSWORD = process.env.PG_PASSWORD ?? "lumina-dev-pass";
const DB = process.env.PG_DB ?? "lumina";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "prisma", "pgdata");

// --serve rejimi: Postgres'ni ishga tushirib, process'ni tirik saqlaydi.
// (embedded-postgres tugun process o'lganda serverni ham to'xtatadi,
//  shuning uchun start.bat uni alohida background oynada ishga tushiradi.)
const SERVE = process.argv.includes("--serve");

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.on("connect", () => {
      s.end();
      resolve(true);
    });
    s.on("error", () => resolve(false));
  });
}

if (await portOpen(PORT)) {
  console.log(`[pg] already running on ${PORT}`);
  process.exit(0);
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

// initialise() faqat birinchi marta kerak — pgdata allaqachon yaratilgan
// bo'lsa uni qayta chaqirish initdb xatosiga olib keladi:
// 'directory "prisma/pgdata" exists but is not empty'.
// Oldingi nozik o'chirilishdan qolgan stale lock bo'lsa tozalaymiz
// (port yopiq = server ishlamayapti demak).
const stalePid = path.join(dataDir, "postmaster.pid");
if (!await portOpen(PORT)) {
  try {
    if (fs.existsSync(stalePid)) fs.rmSync(stalePid);
  } catch { /* ignore */ }
}

const alreadyInitialised =
  fs.existsSync(path.join(dataDir, "PG_VERSION")) ||
  fs.existsSync(path.join(dataDir, "pg_hba.conf"));

if (alreadyInitialised) {
  console.log("[pg] existing cluster found, skipping init...");
} else {
  console.log("[pg] initialising (first run downloads Postgres binaries)...");
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase(DB);
  console.log(`[pg] database "${DB}" created`);
} catch {
  console.log(`[pg] database "${DB}" exists`);
}
console.log(`[pg] ready: postgresql://${USER}:***@localhost:${PORT}/${DB}`);
if (SERVE) {
  console.log("[pg] serve mode — bu oynani yopmang (Postgres shu yerda ishlaydi).");
  // Process tirik qolsin, server o'chib ketmasin. Ctrl+C da toza to'xtash.
  const shutdown = async () => {
    try {
      await pg.stop();
    } catch { /* ignore */ }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  setInterval(() => {}, 60_000);
} else {
  process.exit(0);
}
