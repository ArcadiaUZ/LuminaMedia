// Kichik port tekshiruvi (start.bat uchun): port ochiq bo'lsa exit 0, aks holda 1.
import net from "net";

const PORT = Number(process.env.PG_PORT ?? 5433);

const s = net.connect(PORT, "127.0.0.1");
s.on("connect", () => {
  s.end();
  process.exit(0);
});
s.on("error", () => process.exit(1));
setTimeout(() => process.exit(1), 3000);
