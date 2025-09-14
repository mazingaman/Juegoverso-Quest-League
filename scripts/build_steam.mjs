// =============================
// Configuración del juego
// =============================
// APPID de Steam (BioShock Remastered = 409710)
const APPID = 409710;
// Título bonito que aparecerá en el .md
const TITLE = "BioShock Remastered — Logros";
// Nombre del archivo de salida (debe coincidir con el índice)
const OUTPUT = "bioshock_remastered.md";

// =============================
// Script
// =============================
import fetch from "node-fetch";
import fs from "fs/promises";

const API_KEY = process.env.STEAM_API_KEY;
if (!API_KEY) {
  console.error("❌ Falta la STEAM_API_KEY en los secrets de GitHub.");
  process.exit(1);
}

async function fetchAchievements() {
  const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${API_KEY}&appid=${APPID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error Steam API: ${res.statusText}`);
  const data = await res.json();
  return data.game.availableGameStats.achievements;
}

function iconUrl(appid, hash, ext = 'jpg') {
  return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${hash}.${ext}`;
}

function toMarkdown(appid, title, achs) {
  let md = `# ${title}\n\n`;
  md += `**Fuente:** Steam API (AppID: ${appid})\n\n`;
  md += `## 🎯 Índice\n`;
  achs.forEach(a => {
    const anchor = slugifyForAnchor(a.displayName || a.name);
    md += `- [${a.displayName || a.name}](#${anchor})\n`;
  });
  md += `\n---\n`;

  achs.forEach(a => {
    const anchor = slugifyForAnchor(a.displayName || a.name);
    const iconJpg = iconUrl(appid, a.icon, 'jpg');
    const iconPng = iconUrl(appid, a.icon, 'png'); // fallback opcional

    md += `### ${a.displayName || a.name}\n\n`;
    md += `![icon](${iconJpg})\n\n`;
    md += `${a.description || "_Sin descripción_"}\n\n`;
    md += `[⬆ Volver al índice](#🎯-índice)\n\n`;
    md += `---\n`;
  });

  return md;
}

}

async function main() {
  const achievements = await fetchAchievements();
  console.log(`✅ ${achievements.length} logros encontrados.`);
  const md = toMarkdown(achievements);
  await fs.writeFile(OUTPUT, md, "utf-8");
  console.log(`📄 Archivo generado: ${OUTPUT}`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
