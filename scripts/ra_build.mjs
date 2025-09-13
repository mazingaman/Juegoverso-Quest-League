// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURA SOLO ESTO (2 líneas)
// ─────────────────────────────────────────────────────────────────────────────
const GAME_ID  = 10;                // ← ID del juego en RetroAchievements (ej.: 11240 SOTN, 745 Castlevania GBA)
const OUT_FILE = "sonic2.md"; // ← nombre EXACTO del .md (debe coincidir con tu índice)
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs/promises";

// Secrets del repo (Settings → Secrets → Actions)
const USER = process.env.RA_USERNAME;
const KEY  = process.env.RA_API_KEY;
if (!USER || !KEY) {
  console.error("Faltan secrets RA_USERNAME o RA_API_KEY");
  process.exit(1);
}

// Utilidades
const slug = s => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const esc = s => (s || "")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

// Traducción de títulos: añade aquí overrides por juego cuando lo necesites
const titleMap = {
  // Ejemplos comunes (se puede ampliar con cada juego):
  "Magical Key":"Llave mágica",
  "Black Wings":"Alas negras",
  "Vampire Killer":"Asesino de vampiros",
  "Ring of Vlad":"Anillo de Vlad",
  "Tooth of Vlad":"Diente de Vlad",
  "Heart of Vlad":"Corazón de Vlad",
  "Rib of Vlad":"Costilla de Vlad",
  "Eye of Vlad":"Ojo de Vlad",
  "Master Shapeshifter":"Maestro cambiaformas",
  "Legendary Explorer":"Explorador legendario",
  "Miserable Pile of Secrets":"Montón miserable de secretos",
  "Family Heirloom":"Herencia familiar",
  "My Precious":"Mi tesoro",
  "Gourmetvania":"Gourmetvania",
  "Silent, Yet Deadly":"Silencioso, pero mortal",
  "Moment of Reflection":"Momento de reflexión",
};
const trTitle = t => titleMap[t] || t;

// Traducción por reglas (rápida y genérica). Puedes añadir reglas cuando veas “spanglish”.
const trDesc = (d = "") => {
  const rules = [
    // Nombres comunes
    ["Dracula","Drácula"],["Death","Muerte"],["Succubus","Súcubo"],["Alucard","Alucard"],
    // Verbos/acciones
    ["Defeat","Derrota a"],["Beat","Derrota a"],["Kill","Elimina"],
    ["Find","Encuentra"],["Acquire","Obtén"],["Obtain","Obtén"],["Get","Obtén"],
    ["Reach","Alcanza"],["Train","Entrena"],["Perform","Realiza"],["Activate","Activa"],
    ["Finish","Termina"],["Use","Usa"],["Open","Abre"],["Break","Rompe"],["Explore","Explora"],
    // Conectores/frecuentes
    ["and","y"],["with","con"],["only","solo"],["without","sin"],
    ["taking any damage","recibir daño"],["in one session","en una sesión"],
    ["in the ","en el "],["at the ","en la "],["from the","del "],["of the","del "],
    // Lugares comunes RA (ajusta según veas en otros juegos)
    ["Castle Keep","Torreón del Castillo"],["Royal Chapel","Capilla Real"],
    ["Clock Tower","Torre del Reloj"],["Catacombs","Catacumbas"],["Colosseum","Coliseo"],
    ["Outer Wall","Muro Exterior"],["Underground Caverns","Cavernas Subterráneas"],
    ["Alchemy Laboratory","Laboratorio de Alquimia"],["Reverse","Inverso"],
  ];
  let out = d;
  for (const [en, es] of rules) out = out.replaceAll(en, es);
  return out;
};

async function main() {
  const url = `https://retroachievements.org/API/API_GetGameExtended.php?i=${GAME_ID}&z=${encodeURIComponent(USER)}&y=${encodeURIComponent(KEY)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API ${r.status}`);
  const data = await r.json();

  const ach = Object.values(data.Achievements).sort((a,b) => a.DisplayOrder - b.DisplayOrder);
  const players = data.NumDistinctPlayers || 0;

  const lines = [];
  lines.push(`# ${esc(data.Title)} — Logros (RetroAchievements)\n`);
  lines.push(`**Plataforma:** ${esc(data.ConsoleName)} · **Total de logros:** ${data.NumAchievements} · **Jugadores:** ${players}\n`);

  // Índice
  lines.push(`\n## Índice\n`);
  lines.push(`<a id="indice"></a>`);
  for (const a of ach) {
    const titleES = trTitle(a.Title);
    const anchor  = slug(titleES);
    lines.push(`- [${esc(titleES)}](#${anchor})`);
  }
  lines.push(`\n---\n`);

  // Lista de logros
  for (const a of ach) {
    const titleES = trTitle(a.Title);
    const anchor  = slug(titleES);
    const icon = `https://media.retroachievements.org/Badge/${a.BadgeName}.png`;
    const pct  = players ? (100 * (a.NumAwarded / players)).toFixed(2) : null;
    const pctH = players ? (100 * (a.NumAwardedHardcore / players)).toFixed(2) : null;

    lines.push(`<a id="${anchor}"></a>`);
    lines.push(`\n### ${esc(titleES)}\n`);
    lines.push(`*(${esc(a.Title)})*\n`);
    lines.push(`![Icono](${icon})\n`);
    lines.push(`**Descripción:** ${esc(trDesc(a.Description || ""))}\n`);
    lines.push(`**Puntos:** ${a.Points}\n`);
    if (pct !== null) lines.push(`**Tasa de desbloqueo:** ${pct}% · **Hardcore:** ${pctH}%\n`);
    lines.push(`[⬆ Volver al índice](#indice)\n`);
    lines.push(`\n---\n`);
  }

  await fs.writeFile(OUT_FILE, lines.join("\n"), "utf8");
  console.log(`Generado ${OUT_FILE}`);
}

main().catch(err => { console.error(err); process.exit(1); });
