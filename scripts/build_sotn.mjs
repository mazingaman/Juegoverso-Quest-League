// Genera sotn.md con títulos/descr. en español + iconos oficiales de RetroAchievements
// Node 20 (fetch nativo). Sin dependencias.

import fs from "node:fs/promises";

const GAME_ID = 11240; // Symphony of the Night (PS1)
const USER = process.env.RA_USERNAME;
const KEY  = process.env.RA_API_KEY;

if (!USER || !KEY) {
  console.error("Faltan secrets RA_USERNAME o RA_API_KEY");
  process.exit(1);
}

// Utils
const slug = s => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// --- Traducción de títulos
const trTitleMap = {
  "What is a Man?":"¿Qué es un hombre?",
  "Demonic Duo":"Dúo demoníaco",
  "Shadow in the Mirror":"Sombra en el espejo",
  "Magical Key":"Llave mágica",
  "Cavern Maiden":"Doncella de la caverna",
  "Black Wings":"Alas negras",
  "Guardians of the Keep":"Guardianes de la torre",
  "A Thread and a Bullet":"Un hilo y una bala",
  "Fall of a Nosferatu":"La caída de un Nosferatu",
  "Gatekeeper of Hell":"Guardián del infierno",
  "For I am Many":"Porque somos legión",
  "Iron Maiden Destroyer":"Destructor de doncella de hierro",
  "Silver Key":"Llave plateada",
  "Golden Key":"Llave dorada",
  "Beyond Evil Illusions":"Más allá de las ilusiones malignas",
  "Not All Yet Lost":"Aún no todo está perdido",
  "Echoes of the Past":"Ecos del pasado",
  "Lord of the Flies":"Señor de las moscas",
  "Beyond the Mirror":"Más allá del espejo",
  "Ring of Vlad":"Anillo de Vlad",
  "Tooth of Vlad":"Diente de Vlad",
  "Heart of Vlad":"Corazón de Vlad",
  "Rib of Vlad":"Costilla de Vlad",
  "Eye of Vlad":"Ojo de Vlad",
  "Lord of Space and Time":"Señor del espacio y el tiempo",
  "The End: Solitude":"El final: Soledad",
  "The End: Heroes Reunited":"El final: Héroes reunidos",
  "The End: Redemption":"El final: Redención",
  "Belmont Revenge":"Venganza Belmont",
  "Vampiric Knight":"Caballero vampírico",
  "Seasoned Dhampir":"Dhampir curtido",
  "Demon Master":"Maestro de demonios",
  "Waterproof":"A prueba de agua",
  "Sword of Many Slashes":"Espada de muchos tajos",
  "Bloodlust Blade":"Hoja sedienta de sangre",
  "Family Heirloom":"Herencia familiar",
  "My Precious":"Mi tesoro",
  "Breaking Thermodynamics":"Rompiendo la termodinámica",
  "Master Shapeshifter":"Maestro cambiaformas",
  "All Powerful Being":"Ser todopoderoso",
  "Magician":"Mago",
  "Warp Wide Web":"Red de teletransportes",
  "Gourmetvania":"Gourmetvania",
  "Sacred Body":"Cuerpo sagrado",
  "Holy Heart":"Corazón sagrado",
  "Legendary Explorer":"Explorador legendario",
  "Miserable Pile of Secrets":"Montón miserable de secretos",
  "Transylvanian Hitman":"Sicario transilvano",
  "The Rarest of Monster Droppings":"Las gotas más raras de monstruos",
  "Hunter's Stamina":"Resistencia del cazador",
  "Belmont Spirit":"Espíritu Belmont",
  "Innate Talent":"Talento innato",
  "Unexpected Encounter":"Encuentro inesperado",
  "The Secret Knuckles":"Los puños secretos",
  "Cycle of Life":"Ciclo de la vida",
  "Spying on Strangers":"Espiando a desconocidos",
  "Winged Beast":"Bestia alada",
  "Fashion-monger":"Exhibicionista de moda",
  "Nice Money Bag":"Buena bolsa de dinero",
  "15 cm of Self Esteem":"15 cm de autoestima",
  "Spiked Menace":"Amenaza con pinchos",
  "Gift from the Other Side":"Regalo del más allá",
  "TRACULA!":"¡TRÁCULA!",
  "Mooo!":"¡Muuu!",
  "Sword of Riches":"Espada de la riqueza",
  "Gears go Awry":"Engranajes fuera de control",
  "Hmmm, the Switch...":"Hmm, el interruptor…",
  "Fairy Curiosity":"Curiosidad de hada",
  "50% of the Time, It Works Every Time":"El 50 % de las veces funciona siempre",
  "How do I Eat This?":"¿Cómo me como esto?",
  "Shake, Old One!":"¡Sacúdete, anciano!",
  "Red Undead Redemption":"Redención no-muerta roja",
  "Runic Secret":"Secreto rúnico",
  "Cat Therapy":"Terapia felina",
  "Moment of Reflection":"Momento de reflexión",
  "Blazing Blood":"Sangre ardiente",
  "Vampire Killer":"Asesino de vampiros",
  "Castle of Rage":"Castillo de la ira",
  "Rusty Duel":"Duelo oxidado",
  "Dancing Water":"Agua danzante",
  "No Longer a Horse, but Still no Griffin":"Ya no es un caballo, pero aún no un grifo",
  "Cursed Battle":"Batalla maldita",
  "Arena Shenanigans":"Travesuras de la arena",
  "Axe Lord vs Vampire Lord":"Señor hacha vs. señor vampiro",
  "Wolf vs Dog":"Lobo contra perro",
  "Whip! Whip 'em Good!":"¡Látigo! ¡Dales bien!",
  "Nightmare Beauty":"Belleza de pesadilla",
  "Shaft Floor is Lava":"El suelo de Shaft es lava",
  "I was Born in Castlevania":"Nací en Castlevania",
  "Pride of Michelangelo":"Orgullo de Miguel Ángel",
  "Castle of Rage II":"Castillo de la ira II",
  "Can You Whip a Fly?":"¿Puedes azotar a una mosca?",
  "Axe Lord vs Pharaoh":"Señor hacha vs. faraón",
  "Family Matters":"Asuntos de familia",
  "Death of Death":"La muerte de la Muerte",
  "Was That Really a Boss?":"¿Ese realmente era un jefe?",
  "In the Name of my Mother":"En el nombre de mi madre",
  "Whipping Darkness":"Azotando la oscuridad",
  "Acrolucard":"Acrolucard",
  "Blindfolded Maze":"Laberinto a ciegas",
  "Wolf Run":"Carrera de lobo",
  "Nice Flight":"Buen vuelo",
  "Silent, Yet Deadly":"Silencioso, pero mortal",
  "Lucky 3's":"Tres de la suerte",
  "Rondo of Blood Gaiden":"Rondo of Blood Gaiden",
};
const trTitle = t => trTitleMap[t] || t;

// Traducción rápida de descripciones
const trDesc = (d='') => {
  const map = [
    ["Dracula","Drácula"],
    ["Defeat","Derrota a"],
    ["Find","Encuentra"],
    ["Acquire","Obtén"],
    ["Obtain","Obtén"],
    ["Reach","Alcanza"],
    ["Train","Entrena"],
    ["Perform","Realiza"],
    ["Activate","Activa"],
    ["Finish","Termina"],
    ["Use","Usa"],
    ["Kill","Elimina"],
    ["and","y"],["with","con"],["only","solo"],["without","sin"],
    ["taking any damage","recibir daño"],
    ["in one session","en una sesión"],
    ["in the ","en el "],
    ["from the","del"],
    ["master librarian","bibliotecario"],
    ["Alchemy Laboratory","Laboratorio de Alquimia"],
    ["Outer Wall","Muro Exterior"],
    ["Underground Caverns","Cavernas Subterráneas"],
    ["Reverse Colosseum","Coliseo Invertido"],
    ["Reverse Caverns","Cavernas Invertidas"],
    ["Necromancy Laboratory","Laboratorio de Nigromancia"],
    ["Castle Keep","Torreón del Castillo"],
    ["Royal Chapel","Capilla Real"],
    ["Catacombs","Catacumbas"]
  ];
  let out = d;
  for (const [en, es] of map) out = out.replaceAll(en, es);
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
  lines.push(`# Castlevania: Symphony of the Night — Logros (RetroAchievements)\n`);
  lines.push(`**Plataforma:** ${data.ConsoleName} · **Total de logros:** ${data.NumAchievements} · **Jugadores:** ${players}\n`);

  // ---- ÍNDICE (con ancla estable) ----
  lines.push(`\n## Índice\n`);
  lines.push(`<a id="indice"></a>`);
  for (const a of ach) {
    const titleES = trTitle(a.Title);
    const anchor  = slug(titleES);      // ancla basada en el título en español
    lines.push(`- [${titleES}](#${anchor})`);
  }
  lines.push(`\n---\n`);

  // ---- LISTA DE LOGROS ----
  for (const a of ach) {
    const titleES = trTitle(a.Title);
    const anchor  = slug(titleES);
    const icon = `https://media.retroachievements.org/Badge/${a.BadgeName}.png`;
    const pct  = players ? (100 * (a.NumAwarded / players)).toFixed(2) : null;
    const pctH = players ? (100 * (a.NumAwardedHardcore / players)).toFixed(2) : null;

    lines.push(`<a id="${anchor}"></a>`);
    lines.push(`\n### ${titleES}\n`);
    lines.push(`*(${a.Title})*\n`);
    lines.push(`![Icono](${icon})\n`);
    lines.push(`**Descripción:** ${trDesc(a.Description || "")}\n`);
    lines.push(`**Puntos:** ${a.Points}\n`);
    if (pct !== null) lines.push(`**Tasa de desbloqueo:** ${pct}% · **Hardcore:** ${pctH}%\n`);
    lines.push(`[⬆ Volver al índice](#indice)\n`);
    lines.push(`\n---\n`);
  }

  await fs.writeFile("sotn.md", lines.join("\n"), "utf8");
  console.log("Generado sotn.md");
}

main().catch(err => { console.error(err); process.exit(1); });
