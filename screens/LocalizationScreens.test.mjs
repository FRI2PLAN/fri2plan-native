import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const calendar = readFileSync(new URL('./CalendarScreen.tsx', import.meta.url), 'utf8');
const meals = readFileSync(new URL('./MealsScreen.tsx', import.meta.url), 'utf8');
const intimate = readFileSync(new URL('./CalendrierIntimeScreen.tsx', import.meta.url), 'utf8');
const rewards = readFileSync(new URL('./RewardsScreen.tsx', import.meta.url), 'utf8');

describe('Localisation des écrans de calendrier et récompenses', () => {
  it('utilise les locales espagnole et italienne pour les jours et mois', () => {
    expect(calendar).toContain("import { fr, de, enUS, es, it } from 'date-fns/locale'");
    expect(calendar).toContain("if (lang === 'es') return es;");
    expect(calendar).toContain("if (lang === 'it') return it;");
    expect(meals).toContain("import { fr, de, enUS, es, it } from 'date-fns/locale'");
    expect(meals).toContain("i18n.language === 'es' ? es");
    expect(meals).toContain("i18n.language === 'it' ? it");
  });

  it('recalcule le calendrier intime et les dates lors du changement de langue', () => {
    expect(intimate).toContain("const { t, i18n } = useTranslation()");
    expect(intimate).toContain("i18n.language === 'es' ? 'es-ES'");
    expect(intimate).toContain("i18n.language === 'it' ? 'it-IT'");
    expect(intimate).toContain('}, [settings, i18n.language]);');
    expect(intimate).not.toContain("toLocaleDateString('fr-FR'");
  });

  it('utilise des clés de traduction pour les sous-menus Récompenses', () => {
    expect(rewards).toContain("t('rewards.tabCatalog')");
    expect(rewards).toContain("t('rewards.tabBadges')");
    expect(rewards).toContain("t('rewards.tabHistory')");
    expect(rewards).toContain("t('rewards.tabAdmin')");
    expect(rewards).not.toContain('label: "🎁 Catalogue"');
  });
});
