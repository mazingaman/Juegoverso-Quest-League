// Genera sotn.md con títulos/descr. en español + iconos oficiales de RetroAchievements
// Funciona con Node 20 (usa fetch nativo). No necesita dependencias.

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
  "The End: Heroes Reunited":
