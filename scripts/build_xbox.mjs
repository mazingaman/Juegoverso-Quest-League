// scripts/build_xbox.mjs
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const args = Object.fromEntries(
  process.argv.slice(2).map(s => {
    const [k, ...rest] = s.split("=");
    return [k.replace(/^--/, ""), rest.join("=")];
  })
);

const TITLE_ID = args.titleId; // HEX, ej: 15E009DD
const TITLE    = args.title || "Logros";
const OUT      = args.out || "xbox_game.md";
const API      = process.env.XBL_API_KEY;

if (!API) {
  console.error("❌ Falta XBL_API_KEY (secret).");
  process.exit(1);
}
if (!TITLE_ID) {
  console.error("❌ Falta --titleId=<HEX> (ej. 15E009DD).");
  process.exit(1);
}

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchXboxAchievements(titleIdHex) {
  // xbl.io acepta HEX en este endpoint
  const url = `https://xbl.io/api/v2/achievements/title/${titleIdHex}`;
  const res = await fetch(url, {
    headers: {
      "X-Authorization": API,
      "Accept": "application/json"
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`XBL.io ${res.status} ${res.statusText}\n${body}`);
  }
  return res.json();
}

function toMarkdownXbox(title, data) {
  const list = data?.achievements || [];
  let md = `# ${title}\n\n`;
  md += `**Fuente:** Xbox Achievements (TitleID: ${TITLE_ID})\n\n`;
  md += `<a id="indice"></a>\n\n`;
  md += `## 🎯 Índice\n`;
  for (const a of list) {
    const anchor = slugify(a.name);
    md += `- [${a.name}](#${anchor})\n`;
  }
  md += `\n---\n`;

  for (const a of list) {
    const anchor = slugify(a.name);
    const icon = a?.mediaAssets?.[0]?.url || null;
    const gs = Number(a?.rewards?.find(r => r.type === "Gamerscore")?.value ?? 0);

    md += `### ${a.name}\n\n`;
    if (icon) md += `![Icono](${icon})\n\n`;
    md += `${a.description || "_Sin descripción_"}\n\n`;
    md += `**Gamerscore:** ${gs}${a.isSecret ? " · **Secreto**" : ""}\n\n`;
    md += `[⬆ Volver al índice](#indice)\n\n`;
    md += `---\n`;
  }
  return md;
}

(async () => {
  try {
    const data = await fetchXboxAchievements(TITLE_ID);
    await fs.mkdir(path.dirname(OUT) || ".", { recursive: true });
    const md = toMarkdownXbox(TITLE, data);
    await fs.writeFile(OUT, md, "utf-8");
    console.log(`✅ Archivo generado: ${OUT} (logros: ${data?.achievements?.length || 0})`);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
})();
