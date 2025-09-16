// scripts/build_xbox.mjs
import { execSync } from "child_process";
import fs from "fs";

// ======== Entradas por ENV (definidas en el workflow) ========
const API_KEY = process.env.XBL_API_KEY || "9afdbb87-7a0b-46c2-af8a-deded02e3791"; // tu clave
const XUID    = process.env.XBOX_XUID || "";   // p.ej. 2535473210914202
const TITLEID = process.env.XBOX_TITLE_ID || ""; // p.ej. 1096157158 (decimal)
const OUTFILE = process.env.OUTPUT || "xbox_game.md";
const TITLE   = process.env.TITLE || "Logros Xbox";

// ======== Utils ========
const slug = (s) =>
  (s || "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function runCurl(url) {
  const cmd = `curl -s -H "x-authorization: ${API_KEY}" -H "accept: */*" "${url}"`;
  return execSync(cmd, { encoding: "utf8" });
}

function pickGamerscore(rewards = []) {
  const r = rewards.find((x) => x?.type === "Gamerscore");
  return r?.value ?? 0;
}

function pickIcon(mediaAssets = []) {
  // intenta "Icon" antes que otros
  const icon = mediaAssets.find((m) => m?.type?.toLowerCase() === "icon");
  return icon?.url || mediaAssets?.[0]?.url || "";
}

// ======== Fetch ========
function fetchXboxAchievements(xuid, titleId) {
  if (!xuid || !titleId) {
    throw new Error("Faltan XBOX_XUID o XBOX_TITLE_ID.");
  }
  const url = `https://xbl.io/api/v2/achievements/player/${xuid}/title/${titleId}`;
  const raw = runCurl(url);
  const data = JSON.parse(raw);

  if (!data || !Array.isArray(data.achievements)) {
    throw new Error("Respuesta de Xbox inesperada o sin 'achievements'.");
  }
  return data.achievements;
}

// ======== Markdown ========
function toMarkdown(title, achievements) {
  // Índice
  let md = `# ${title}\n\n`;
  md += `**Fuente:** xbl.io · **XUID:** ${XUID} · **TitleID:** ${TITLEID}\n\n`;
  md += `<a id="indice"></a>\n\n`;
  md += `## 🎯 Índice\n`;
  achievements.forEach((a) => {
    const name = a.name || a.id || "(sin nombre)";
    md += `- [${name}](#${slug(name)})\n`;
  });
  md += `\n---\n`;

  // Cuerpo
  achievements.forEach((a) => {
    const name = a.name || a.id || "(sin nombre)";
    const description = a.description || "_Sin descripción_";
    const score = pickGamerscore(a.rewards);
    const icon = pickIcon(a.mediaAssets);

    md += `### ${name}${score ? ` (${score}G)` : ""}\n\n`;
    if (icon) md += `![icon](${icon})\n\n`;
    md += `${description}\n\n`;
    md += `[⬆ Volver al índice](#indice)\n\n`;
    md += `---\n`;
  });

  return md;
}

// ======== MAIN ========
async function main() {
  try {
    if (!API_KEY) throw new Error("Falta XBL_API_KEY.");
    const achs = fetchXboxAchievements(XUID, TITLEID);

    // Orden opcional por nombre
    achs.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const md = toMarkdown(TITLE, achs);
    fs.writeFileSync(OUTFILE, md, "utf8");
    console.log(`📄 Archivo generado: ${OUTFILE} · ${achs.length} logros.`);
  } catch (err) {
    console.error("❌ Error:", err?.message || err);
    process.exit(1);
  }
}

main();
