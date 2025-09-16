// scripts/build_xbox.mjs
import { execSync } from "child_process";
import fs from "fs";

// ======== Entradas por ENV (definidas en el workflow) ========
const API_KEY = process.env.XBL_API_KEY || "9afdbb87-7a0b-46c2-af8a-deded02e3791"; // tu clave
const XUID    = process.env.XBOX_XUID || "";        // p.ej. 2535473210914202
const TITLEID = process.env.XBOX_TITLE_ID || "";    // p.ej. 1096157158 (decimal)
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

function toNumberSafe(v) {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickGamerscore(rewards = []) {
  if (!Array.isArray(rewards)) return 0;
  // Busca reward de tipo Gamerscore/Score
  const r =
    rewards.find((x) => /gamerscore/i.test(x?.type || "")) ||
    rewards.find((x) => /score/i.test(x?.type || "")) ||
    rewards.find((x) => /gamerscore/i.test(x?.name || "")) ||
    rewards.find((x) => /score/i.test(x?.name || ""));
  return toNumberSafe(r?.value);
}

function pickIcon(mediaAssets = []) {
  if (!Array.isArray(mediaAssets)) return "";
  // 1) Coincidencia fuerte con "icon"
  let m = mediaAssets.find(
    (x) => /icon/i.test(x?.type || "") || /icon/i.test(x?.name || "")
  );
  // 2) Si no hay, intenta otros tipos habituales
  if (!m) {
    m = mediaAssets.find((x) =>
      /(tile|image|art)/i.test(`${x?.type || ""} ${x?.name || ""}`)
    );
  }
  return m?.url || "";
}

// ======== Fetch ========
function fetchXboxAchievements(xuid, titleId) {
  if (!xuid || !titleId) {
    throw new Error("Faltan XBOX_XUID o XBOX_TITLE_ID.");
  }
  const url = `https://xbl.io/api/v2/achievements/player/${xuid}/title/${titleId}`;
  const raw = runCurl(url);

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON inválido recibido de Xbox (${e.message}).`);
  }

  if (!data || !Array.isArray(data.achievements)) {
    // Modo debug: imprime un trozo de la respuesta para inspección
    console.error("Respuesta Xbox inesperada:", raw.slice(0, 400) + "...");
    throw new Error("Respuesta de Xbox inesperada o sin 'achievements'.");
  }
  return data.achievements;
}

// ======== Markdown ========
function toMarkdown(title, achievements) {
  let md = `# ${title}\n\n`;
  md += `**Fuente:** xbl.io · **XUID:** ${XUID} · **TitleID:** ${TITLEID}\n\n`;
  md += `<a id="indice"></a>\n\n`;

  // Índice
  md += `## 🎯 Índice\n`;
  achievements.forEach((a) => {
    const name = a.name || a.id || "(sin nombre)";
    md += `- [${name}](#${slug(name)})\n`;
  });
  md += `\n---\n`;

  // Cuerpo
  achievements.forEach((a) => {
    const name = a.name || a.id || "(sin nombre)";
    const description =
      a.description || a.unlockedDescription || "_Sin descripción_";
    const score = pickGamerscore(a.rewards);
    const icon = pickIcon(a.mediaAssets);
    const state = a.progressState || a.progression?.state || "Unknown";
    const isSecret = a.isSecret ? "Sí" : "No";

    md += `### ${name}${score ? ` (${score}G)` : ""}\n\n`;
    if (icon) md += `![icon](${icon})\n\n`;
    md += `${description}\n\n`;
    md += `**Estado:** ${state} · **Secreto:** ${isSecret}`;
    if (score) md += ` · **Puntuación:** ${score}G`;
    md += `\n\n[⬆ Volver al índice](#indice)\n\n`;
    md += `---\n`;
  });

  return md;
}

// ======== MAIN ========
async function main() {
  try {
    if (!API_KEY) throw new Error("Falta XBL_API_KEY.");
    const achs = fetchXboxAchievements(XUID, TITLEID);

    // Orden opcional
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
