const CATALOG_REFERENCE = /^\[fri2plan-catalog:[a-z0-9_-]+\]\s*$/i;
const INGREDIENT_HEADER = /^(ingredients?|ingrédients?|zutaten|ingredientes?|ingredienti)\s*:?$/i;
const INSTRUCTION_HEADER = /^(instructions?|préparation|preparation|zubereitung|étapes?|steps?|directions?|metodo|método|preparación|preparazione|procedimento|passaggi|pasos)\s*:?$/i;
const NUMBERED_STEP = /^(?:\d+[.)\-:]|(?:step|étape|schritt|paso|passaggio)\s*\d+\s*[:.)\-]?)/i;

const cleanLine = (value) => value
  .replace(/^[•*\-]\s*/, '')
  .replace(NUMBERED_STEP, '')
  .trim();

const unique = (values) => values.filter((value, index) =>
  value.length > 0 && values.findIndex(candidate => candidate.localeCompare(value, undefined, { sensitivity: 'accent' }) === 0) === index,
);

/**
 * Sépare la structure habituelle des notes importées ou libres en ingrédients et étapes.
 * Les en-têtes courants des cinq langues sont acceptés afin d'offrir une fiche cuisine
 * lisible sans interpréter ni modifier le texte d'origine sauvegardé.
 */
export function parseMealCookingNotes(notes = '') {
  const lines = (notes || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !CATALOG_REFERENCE.test(line));

  const ingredients = [];
  const instructions = [];
  const unclassified = [];
  let section = null;

  for (const line of lines) {
    if (INGREDIENT_HEADER.test(line)) {
      section = 'ingredients';
      continue;
    }
    if (INSTRUCTION_HEADER.test(line)) {
      section = 'instructions';
      continue;
    }

    const clean = cleanLine(line);
    if (!clean) continue;
    if (section === 'ingredients') ingredients.push(clean);
    else if (section === 'instructions') instructions.push(clean);
    else unclassified.push(clean);
  }

  if (instructions.length === 0 && unclassified.some(line => NUMBERED_STEP.test(line))) {
    instructions.push(...unclassified);
  } else if (ingredients.length === 0 && instructions.length === 0 && unclassified.length > 0) {
    instructions.push(...unclassified);
  }

  return {
    ingredients: unique(ingredients),
    instructions: unique(instructions),
  };
}
