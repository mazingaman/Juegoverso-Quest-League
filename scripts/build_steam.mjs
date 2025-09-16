// scripts/build_steam.mjs
import fetch from "node-fetch";
import fs from "fs/promises";

/** ======== ENV from workflow ======== */
const API_KEY = process.env.STEAM_API_KEY;
const XBL_API_KEY = process.env.XBL_API_KEY || "";
const APPID = process.env.APPID;
const TITLE = process.env.TITLE || "Logros";
const OUTPUT = process.env.OUTPUT || "steam_game.md";
const XBOX_TITLEID = (process.env.XBOX_TITLEID || "").trim(); // decimal
const MERGE_MODE = (process.env.MERGE_MODE || "merge").toLowerCase(); // merge|steam|xbox

if (!APPID || !OUTPUT) {
  console.error("❌ Falta APPID u OUTPUT.");
  process.exit(1);
}
if (!API_KEY) {
  console.error("❌ Falta STEAM_API_KEY en Secrets.");
  process.exit(1);
}

/** ======== Helpers ======== */
const removeDiacritics = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function norm(str) {
  if (!str) return "";
  return removeDiacritics(str)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyForAnchor(text) {
  return (text || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function resolveSteamIconUrl(appid, iconField) {
  if (!iconField) return null;
  if (/^https?:\/\//i.test(iconField)) return iconField;
  if (/\.(jpg|jpeg|png|gif)$/i.test(iconField)) {
    return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${iconField}`;
  }
  return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${iconField}.jpg`;
}

function resolveXboxIcon(a) {
  // Xbox suele traer:
  // a.mediaAssets[0].uri  o  a.mediaAssets[0].url
  // o a.lockedImageUrl / a.unlockedImageUrl
  // o a.iconImage / a.imageUrl
  const m = a?.mediaAssets?.[0];
  if (m?.uri) return m.uri;
  if (m?.url) return m.url;
  if (a?.unlockedImageUrl) return a.unlockedImageUrl;
  if (a?.lockedImageUrl) return a.lockedImageUrl;
  if (a?.iconImage) return a.iconImage;
  if (a?.imageUrl) return a.imageUrl;
  return null;
}

/** ======== Fetch Steam (ES y EN) ======== */
async function fetchSteamSchema(appid, lang) {
  const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${API_KEY}&appid=${appid}&l=${encodeURIComponent(
    lang
  )}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Steam API ${lang} error: ${r.status}`);
  const j = await r.json();
  return j?.game?.availableGameStats?.achievements || [];
}

async function fetchSteam(appid) {
  // Español y, como respaldo, English
  const es = await fetchSteamSchema(appid, "spanish").catch(() => []);
  const en = await fetchSteamSchema(appid, "english").catch(() => []);

  // Índices por "name" (internal) para mergear ES/EN
  const map = new Map();
  for (const a of en) map.set(a.name, { en: a });
  for (const a of es) {
    const prev = map.get(a.name) || {};
    prev.es = a;
    map.set(a.name, prev);
  }

  const list = [];
  for (const [_, { es, en }] of map.entries()) {
    const base = es || en; // siempre habrá uno si existe en algún idioma
    const display = es?.displayName || en?.displayName || base?.name || "";
    const desc = es?.description || en?.description || "";
    const icon = base?.icon; // hash/icono
    list.push({
      source: "steam",
      key: base?.name || display,
      nameES: es?.displayName || "",
      nameEN: en?.displayName || "",
      descES: es?.description || "",
      descEN: en?.description || "",
      iconSteam: resolveSteamIconUrl(appid, icon),
    });
  }
  return list;
}

/** ======== Fetch Xbox (si hay TitleId y API) ======== */
async function fetchXbox(titleIdDecimal) {
  if (!titleIdDecimal || !XBL_API_KEY) return [];
  const url = `https://xbl.io/api/v2/achievements/title/${titleIdDecimal}`;
  const r = await fetch(url, {
    headers: {
      "X-Authorization": XBL_API_KEY,
      Accept: "application/json",
    },
  });
  if (!r.ok) {
    console.warn(`⚠️ Xbox API error ${r.status} (saltando)`);
    return [];
  }
  const j = await r.json();
  const achs = j?.achievements || [];
  return achs.map((a) => ({
    source: "xbox",
    key: a?.id?.toString() || a?.name || "",
    name: a?.name || "",
    desc: a?.description || "",
    gamerscore:
      a?.rewards?.find?.((rw) => rw?.type?.toLowerCase?.() === "gamerscore")
        ?.value || a?.gamerscore || a?.progression?.reward?.value || "",
    rarityPct:
      a?.rarity?.currentPercentage ??
      a?.progression?.rarityCurrentPercentage ??
      null,
    iconXbox: resolveXboxIcon(a),
  }));
}

/** ======== Matcher Steam<->Xbox ======== */
function tryMatch(steam, xboxList) {
  if (!xboxList?.length) return null;
  const nameCandidates = [
    steam.nameES,
    steam.nameEN,
    steam.descES,
    steam.descEN,
  ].filter(Boolean);

  const norms = nameCandidates.map(norm).filter(Boolean);
  const set = new Set(norms);

  // 1) Coincidencia fuerte por nombre normalizado
  for (const x of xboxList) {
    const xn = norm(x.name);
    if (set.has(xn)) return x;
  }
  // 2) Intento de startsWith/contains con nombre Xbox
  for (const x of xboxList) {
    const xn = norm(x.name);
    for (const s of set) {
      if (xn.startsWith(s) || s.startsWith(xn) || xn.includes(s)) return x;
    }
  }
  // 3) como último recurso, por descripción si existe
  for (const x of xboxList) {
    const xd = norm(x.desc || "");
    for (const s of [norm(steam.descES), norm(steam.descEN)].filter(Boolean)) {
      if (!s) continue;
      if (xd && (xd.includes(s) || s.includes(xd))) return x;
    }
  }
  return null;
}

/** ======== Merge ======== */
function mergeLists(steamList, xboxList, mode = "merge") {
  const byXboxUsed = new Set();

  if (mode === "steam") {
    return steamList.map((s) => ({
      ...s,
      merged: { gamerscore: null, rarityPct: null, icon: s.iconSteam || null },
    }));
  }
  if (mode === "xbox") {
    // Solo Xbox
    return xboxList.map((x) => ({
      source: "xbox",
      key: x.key,
      name: x.name,
      desc: x.desc,
      merged: {
        gamerscore: x.gamerscore || null,
        rarityPct: x.rarityPct ?? null,
        icon: x.iconXbox || null,
      },
    }));
  }

  // merge
  const out = [];
  for (const s of steamList) {
    const match = tryMatch(s, xboxList);
    if (match) byXboxUsed.add(match.key);

    const name = s.nameES || s.nameEN || s.key || "";
    const desc = s.descES || s.descEN || "";

    const icon =
      s.iconSteam || (match ? match.iconXbox : null) || s.iconSteam || null;

    out.push({
      source: "merge",
      key: s.key,
      name,
      desc,
      merged: {
        gamerscore: match?.gamerscore || null,
        rarityPct: match?.rarityPct ?? null,
        icon,
      },
    });
  }

  // (Opcional) añadir “huérfanos” Xbox que no estén en Steam
  // Si quieres listarlos al final, descomenta:
  // for (const x of xboxList) {
  //   if (byXboxUsed.has(x.key)) continue;
  //   out.push({
  //     source: "xbox-only",
  //     key: x.key,
  //     name: x.name,
  //     desc: x.desc || "",
  //     merged: { gamerscore: x.gamerscore || null, rarityPct: x.rarityPct ?? null, icon: x.iconXbox || null },
  //   });
  // }

  return out;
}

/** ======== Markdown ======== */
function toMarkdown(title, appid, merged) {
  let md = `# ${title}\n\n`;
  md += `**Fuentes:** Steam (AppID ${appid})${
    XBOX_TITLEID ? ` + Xbox (${XBOX_TITLEID})` : ""
  }\n\n`;
  md += `<a id="indice"></a>\n\n`;
  md += `## 🎯 Índice\n`;
  merged.forEach((a) => {
    const anchor = slugifyForAnchor(a.name);
    md += `- [${a.name}](#${anchor})\n`;
  });
  md += `\n---\n`;

  for (const a of merged) {
    const anchor = slugifyForAnchor(a.name);
    const g = a.merged.gamerscore ? `**Gamerscore:** ${a.merged.gamerscore}\n\n` : "";
    const r =
      a.merged.rarityPct != null
        ? `**Rareza (Xbox):** ${a.merged.rarityPct.toFixed(2)}%\n\n`
        : "";
    const icon = a.merged.icon ? `![icon](${a.merged.icon})\n\n` : "";

    md += `### ${a.name}\n\n`;
    md += icon;
    md += `${a.desc || "_Sin descripción_"}\n\n`;
    md += g + r;
    md += `[⬆ Volver al índice](#indice)\n\n`;
    md += `---\n`;
  }

  return md;
}

/** ======== Main ======== */
async function main() {
  try {
    const steam = await fetchSteam(APPID);
    console.log(`✅ Steam: ${steam.length} logros ES/EN.`);

    let xbox = [];
    if (XBOX_TITLEID && (MERGE_MODE === "merge" || MERGE_MODE === "xbox")) {
      xbox = await fetchXbox(XBOX_TITLEID);
      console.log(`✅ Xbox: ${xbox.length} logros.`);
    }

    const merged = mergeLists(steam, xbox, MERGE_MODE);
    console.log(`🔗 Publicando ${merged.length} entradas (${MERGE_MODE}).`);

    const md = toMarkdown(TITLE, APPID, merged);
    await fs.writeFile(OUTPUT, md, "utf-8");
    console.log(`📄 Archivo generado: ${OUTPUT}`);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}
main();
