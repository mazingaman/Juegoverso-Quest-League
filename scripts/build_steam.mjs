// build_steam.mjs
import fs from 'fs';
import fetch from 'node-fetch';

// 👇 EDITA SOLO ESTAS DOS LÍNEAS
const APPID = 409710; // BioShock Remastered
const TITLE = "BioShock Remastered — Logros";

const API_KEY = process.env.STEAM_API_KEY;
if (!API_KEY) throw new Error("No Steam API key found");

const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${API_KEY}&appid=${APPID}`;
const outFile = `bioshock_remastered.md`;

async function main() {
  const res = await fetch(url);
  const data = await res.json();

  const achievements = data?.game?.availableGameStats?.achievements || [];
  let md = `# ${TITLE}\n\n## Índice de logros\n`;

  achievements.forEach(a => {
    md += `- [${a.displayName}](#${a.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')})\n`;
  });

  md += `\n---\n`;

  achievements.forEach(a => {
    md += `### <a name="${a.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"></a>\n`;
    md += `![icon](assets/bioshock_remastered/${a.icon})\n\n`;
    md += `**${a.displayName}**\n\n`;
    md += `${a.description || "Sin descripción"}\n\n---\n`;
  });

  fs.writeFileSync(outFile, md, "utf-8");
  console.log(`Archivo generado: ${outFile}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
