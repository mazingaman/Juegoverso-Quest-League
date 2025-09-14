// scripts/fetch_xbox.mjs
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const args = Object.fromEntries(
  process.argv.slice(2).map(s => {
    const [k, ...rest] = s.split("=");
    return [k.replace(/^--/, ""), rest.join("=")];
  })
);

const TITLE_ID = args.titleId;         // hex, ej. 15E009DD
const OUT = args.out || `tmp/xbox_${TITLE_ID}.json`;
const API = process.env.XBL_API_KEY;

if (!TITLE_ID) {
  console.error("❌ Falta --titleId=15E009DD (hex).");
  process.exit(1);
}
if (!API) {
  console.error("❌ Falta XBL_API_KEY (Actions secret).");
  process.exit(1);
}

const url = `https://xbl.io/api/v2/achievements/title/${TITLE_ID}`; // catálogo completo del título

const res = await fetch(url, {
  headers: {
    "X-Authorization": API,
    "Accept": "application/json",
  },
});
if (!res.ok) {
  console.error("❌ Error XBL.io:", res.status, res.statusText);
  const t = await res.text();
  console.error(t);
  process.exit(1);
}

const data = await res.json();

// Asegura carpeta tmp/
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(data, null, 2), "utf-8");
console.log(`✅ Xbox JSON guardado en: ${OUT} (logros: ${data?.achievements?.length || 0})`);
