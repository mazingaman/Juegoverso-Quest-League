// scripts/build_steam.mjs
import fetch from "node-fetch";
import fs from "fs/promises";

/** ======== Inputs por ENV (del workflow) ======== */
const API_KEY = process.env.STEAM_API_KEY;
const APPID = process.env.APPID;
const TITLE = process.env.TITLE || "Logros";
const OUTPUT = process.env.OUTPUT || "steam_game.md";

if (!API_KEY) {
  console.error("❌ Falta STEAM_API_KEY en Secrets.");
  process.exit(1);
}
if (!APPID) {
  console.error("❌ Falta APPID (inputs.appid en el workflow).");
  process.exit(1);
}

/** ======== Utilidades ======== */
function slugifyForAnchor(text) {
  return (text || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function resolveIconUrl(appid, iconField) {
  if (!iconField) return null;

  // Si ya es una URL absoluta, úsala tal cual
  if (/^https?:\/\//i.test(iconField)) {
    return iconField;
  }

  // Si viene con extensión, solo anteponemos la ruta base
  if (/\.(jpg|jpeg|png|gif)$/i.test(iconField)) {
    return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${iconField}`;
  }

  // Si solo trae el hash, asumimos .jpg por defecto
  return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${iconField}.jpg`;
}


/** ======== Fetch de la API de Steam ======== */
async function fetchAchievements(appid) {
  const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${API_KEY}&appid=${appid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const achs = data?.game?.availableGameStats?.achievements || [];
  return achs;
}

/** ======== Generador de Markdown ======== */
function toMarkdown(appid, title, achs) {
  let md = `# ${title}\n\n`;
  md += `**Fuente:** Steam API (AppID: ${appid})\n\n`;
  md += `<a id="indice"></a>\n\n`;
  md += `## 🎯 Índice\n`;
  achs.forEach(a => {
    const anchor = slugifyForAnchor(a.displayName || a.name);
    md += `- [${a.displayName || a.name}](#${anchor})\n`;
  });
  md += `\n---\n`;

  achs.forEach(a => {
    const anchor = slugifyForAnchor(a.displayName || a.name);
    const iconUrl = resolveIconUrl(appid, a.icon); // <- aquí

    md += `### ${a.displayName || a.name}\n\n`;
    if (iconUrl) md += `![icon](${iconUrl})\n\n`;
    md += `${a.description || "_Sin descripción_"}\n\n`;
    md += `[⬆ Volver al índice](#indice)\n\n`;
    md += `---\n`;
  });

  return md;
}


/** ======== Main ======== */
async function main() {
  try {
    const achievements = await fetchAchievements(APPID);
    console.log(`✅ ${achievements.length} logros encontrados.`);
    const md = toMarkdown(APPID, TITLE, achievements);
    await fs.writeFile(OUTPUT, md, "utf-8");
    console.log(`📄 Archivo generado: ${OUTPUT}`);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

main();
