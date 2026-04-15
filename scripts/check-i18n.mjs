/**
 * check-i18n.mjs
 * Vérifie que les 3 fichiers de locale (fr/en/de) ont les mêmes clés de premier niveau
 * et les mêmes sous-clés pour les sections qui sont des objets.
 * Utilisé par le workflow GitHub Actions i18n-check.yml.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, '../locales');
const LANGS = ['fr', 'en', 'de'];
const CRITICAL_SECTIONS = ['common', 'auth', 'settings', 'navigation'];

let hasError = false;

function loadLocale(lang) {
  const path = resolve(LOCALES_DIR, `${lang}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const locales = {};
for (const lang of LANGS) {
  locales[lang] = loadLocale(lang);
}

// 1. Vérifier que les sections top-level sont identiques
const frSections = new Set(Object.keys(locales['fr']));
for (const lang of ['en', 'de']) {
  const sections = new Set(Object.keys(locales[lang]));
  for (const section of frSections) {
    if (!sections.has(section)) {
      console.error(`❌ [${lang}] Section manquante : "${section}"`);
      hasError = true;
    }
  }
  for (const section of sections) {
    if (!frSections.has(section)) {
      console.error(`❌ [${lang}] Section supplémentaire non présente en FR : "${section}"`);
      hasError = true;
    }
  }
}

// 2. Vérifier que les clés de chaque section OBJET sont identiques entre les langues
for (const section of frSections) {
  const frValue = locales['fr'][section];
  // Ignorer les sections qui sont des chaînes simples (ex: google_calendars)
  if (typeof frValue !== 'object' || frValue === null) continue;

  const frKeys = new Set(Object.keys(frValue));
  for (const lang of ['en', 'de']) {
    const langValue = locales[lang][section];
    if (typeof langValue !== 'object' || langValue === null) {
      console.error(`❌ [${lang}] Section "${section}" devrait être un objet comme en FR`);
      hasError = true;
      continue;
    }
    const keys = new Set(Object.keys(langValue));
    for (const key of frKeys) {
      if (!keys.has(key)) {
        console.error(`❌ [${lang}] Clé manquante dans section "${section}" : "${key}"`);
        hasError = true;
      }
    }
    for (const key of keys) {
      if (!frKeys.has(key)) {
        console.error(`❌ [${lang}] Clé supplémentaire non présente en FR dans "${section}" : "${key}"`);
        hasError = true;
      }
    }
  }
}

// 3. Vérifier qu'aucune valeur n'est vide dans les sections objet
for (const lang of LANGS) {
  for (const [section, value] of Object.entries(locales[lang])) {
    if (typeof value !== 'object' || value === null) continue;
    for (const [key, v] of Object.entries(value)) {
      if (typeof v === 'string' && v.trim() === '') {
        console.error(`❌ [${lang}] Valeur vide : "${section}.${key}"`);
        hasError = true;
      }
    }
  }
}

// 4. Vérifier que les sections critiques sont présentes
for (const lang of LANGS) {
  for (const section of CRITICAL_SECTIONS) {
    if (!locales[lang][section]) {
      console.error(`❌ [${lang}] Section critique manquante : "${section}"`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('\n❌ Des incohérences i18n ont été détectées. Corrigez-les avant de merger.');
  process.exit(1);
} else {
  const sectionCount = [...frSections].filter(s => typeof locales['fr'][s] === 'object').length;
  console.log(`✅ i18n cohérent : ${LANGS.join('/')} — ${sectionCount} sections objet vérifiées`);
  process.exit(0);
}
