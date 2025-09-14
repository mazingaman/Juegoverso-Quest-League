// scripts/merge_xbox_points.mjs
import fs from "fs/promises";
import path from "path";

// CLI
const args = Object.fromEntries(
  process.argv.slice(2).map(s => {
    const [k, ...rest] = s.split("=");
    return [k.replace(/^--/, ""), rest.join("=")];
  })
);

const MD_PATH = args.md;
const JSON_PATH = args.json;
const PREFER_ICONS = (args.preferIcons || "steam").toLowerCase();

if (!MD_PATH || !JSON_PATH) {
  console.error("Uso: node scripts/merge_xbox_points.mjs --md=game.md --json=tmp/xbox_XXXX.json [--preferIcons=xbox|steam]");
  process.exit(1);
}

// ---- helpers ----
const deburr = s =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function normalize(s = "") {
  // minúsculas, quita acentos, reemplaza & -> and, quita símbolos frecuentes
  return deburr(String(s).toLowerCase())
    .replace(/&/g, " and ")
    .replace(/[:–—\-_/]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// genera variantes tolerantes
function variants(name) {
  const n = normalize(name);
  const out = new Set([n]);

  out.add(n.replace(/\bthe\b/g, "").trim());      // quita "the"
  out.add(n.replace(/\bto\b/g, "").trim());
  out.add(n.replace(/\ba\b/g, "").trim());
  out.add(n.replace(/\ban\b/g, "").trim());
  out.add(n.replace(/\bof\b/g, "").trim());
  out.add(n.replace(/\band\b/g, "").trim());

  return Array.from(out).filter(Boolean);
}

function looseEqual(a, b) {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return false;
  if (A === B) return true;
  // contención
  return A.includes(B) || B.includes(A);
}

async function loadAliases() {
  const p = path.join("aliases", "aliases.json");
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ---- load data ----
const [mdRaw, xboxRaw, aliases] = await Promise.all([
  fs.readFile(MD_PATH, "utf-8"),
  fs.readFile(JSON_PATH, "utf-8"),
  loadAliases(),
]);

const xboxJson = JSON.parse(xboxRaw);

// Mapa Xbox: key normalizada -> info
const xboxMap = new Map();

for (const a of xboxJson.achievements || []) {
  const name = a.name || a.id || "";
  const score = Number(a?.rewards?.[0]?.value ?? 0) || 0;
  const icon = a?.mediaAssets?.[0]?.url || null;
  const secret = !!a.isSecret;

  const vs = variants(name);
  for (const v of vs) {
    if (!xboxMap.has(v)) {
      xboxMap.set(v, { score, icon, secret, originalName: name });
    }
  }
}

// Aplica alias manuales mdName -> xboxName
function resolveAlias(mdName) {
  const key = aliases[mdName];
  if (!key) return null;
  // buscamos ese alias en el mapa por equivalencia suelta
  for (const [k, info] of xboxMap.entries()) {
    if (looseEqual(info.originalName, key)) return k;
  }
  return null;
}

// ---- procesa MD ----
const lines = mdRaw.split("\n");

let injected = 0;
let replacedIcons = 0;
const notFound = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith("### ")) continue;

  const mdName = line.replace(/^###\s+/, "").trim();

  // Candidato directo y variantes
  let key = null;

  // 1) alias manual
  const aliasKey = resolveAlias(mdName);
  if (aliasKey) {
    key = aliasKey;
  } else {
    // 2) por variantes del nombre MD y búsqueda en Xbox map
    const mdVars = variants(mdName);
    for (const mv of mdVars) {
      if (xboxMap.has(mv)) { key = mv; break; }
    }
    // 3) búsqueda suelta por contención
    if (!key) {
      for (const [k, info] of xboxMap.entries()) {
        if (looseEqual(info.originalName, mdName)) { key = k; break; }
      }
    }
  }

  if (!key) { notFound.push(mdName); continue; }

  const info = xboxMap.get(key);

  // Inserta Gamerscore si no está
  const nextIdx = i + 1;
  const hasScore = (lines[nextIdx] || "").toLowerCase().includes("gamerscore");
  if (!hasScore) {
    const scoreLine = `**Gamerscore:** ${info.score}${info.secret ? " · **Secreto**" : ""}`;
    lines.splice(nextIdx, 0, scoreLine, "");
    injected++;
    // seguimos i sin mover (el bucle incrementa)
  }

  // Reemplaza icono si toca
  if (PREFER_ICONS === "xbox" && info.icon) {
    // Busca una línea de imagen en las ~5 líneas siguientes
    for (let j = nextIdx; j < Math.min(lines.length, nextIdx + 6); j++) {
      if (/!\[.*\]\(.*\)/.test(lines[j])) {
        const newIcon = `![icon](${info.icon})`;
        if (lines[j] !== newIcon) {
          lines[j] = newIcon;
          replacedIcons++;
        }
        break;
      }
    }
  }
}

await fs.writeFile(MD_PATH, lines.join("\n"), "utf-8");

console.log(`✅ Gamerscore inyectados: ${injected}`);
if (PREFER_ICONS === "xbox") console.log(`🖼️ Iconos reemplazados: ${replacedIcons}`);
if (notFound.length) {
  console.log("⚠️ Sin match Xbox (revisa nombres o usa aliases/aliases.json):");
  for (const n of notFound) console.log("  -", n);
}
