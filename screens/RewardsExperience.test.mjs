import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const rewardsScreen = readFileSync(new URL('./RewardsScreen.tsx', import.meta.url), 'utf8');
const fr = JSON.parse(readFileSync(new URL('../locales/fr.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));
const de = JSON.parse(readFileSync(new URL('../locales/de.json', import.meta.url), 'utf8'));

describe('Récompenses — vitrine de progression', () => {
  it('priorise les récompenses atteignables et calcule le prochain objectif', () => {
    expect(rewardsScreen).toContain('const rewardCatalog = useMemo');
    expect(rewardsScreen).toContain('const nextReward = rewardCatalog.find');
    expect(rewardsScreen).toContain('availableRewardCount');
  });

  it('affiche une jauge pour le prochain objectif et les récompenses non encore atteignables', () => {
    expect(rewardsScreen).toContain('styles.nextRewardFill');
    expect(rewardsScreen).toContain('styles.rewardProgressFill');
    expect(rewardsScreen).toContain("t('rewards.missingPoints'");
  });

  it('met en évidence la disponibilité dans les trois langues', () => {
    for (const locale of [fr, en, de]) {
      expect(locale.rewards.nextReward).toBeTruthy();
      expect(locale.rewards.available).toBeTruthy();
      expect(locale.rewards.availableNow).toContain('{{count}}');
      expect(locale.rewards.availableNow_plural).toContain('{{count}}');
    }
  });

  it('centre le badge de disponibilité et lui donne une largeur adaptative à la carte violette', () => {
    expect(rewardsScreen).toContain("availableNowPill: { alignItems: 'center', alignSelf: 'stretch'");
    expect(rewardsScreen).toContain("textAlign: 'center'");
  });

  it('déduplique le classement familial et lie chaque clé de rang au cercle actif', () => {
    expect(rewardsScreen).toContain('const familyPoints = useMemo(() =>');
    expect(rewardsScreen).toContain('const pointsByUserId = new Map<number, any>();');
    expect(rewardsScreen).toContain('!pointsByUserId.has(userId)');
    expect(rewardsScreen).toContain('key={`reward-rank-${activeFamilyId}-${m.userId}`}');
  });
});
