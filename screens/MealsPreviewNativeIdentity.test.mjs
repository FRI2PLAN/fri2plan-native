import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const appConfig = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const easConfig = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));

describe('identité native FRI2PLAN Meals Preview', () => {
  it('utilise un paquet Android distinct de la production', () => {
    expect(appConfig.expo.name).toBe('FRI2PLAN Meals Preview');
    expect(appConfig.expo.android.package).toBe('app.fri2plan.meals.preview');
    expect(appConfig.expo.android.package).not.toBe('app.fri2plan.ch');
    expect(appConfig.expo.ios.bundleIdentifier).toBe('ch.fri2plan.app.meals.preview');
    expect(appConfig.expo.ios.bundleIdentifier).not.toBe('ch.fri2plan.app');
    expect(appConfig.expo.scheme).toBe('fri2plan-meals-preview');
  });

  it('réserve un canal OTA distinct aux essais Repas', () => {
    expect(easConfig.build['meals-preview'].channel).toBe('meals-preview');
    expect(easConfig.build['meals-preview'].android.buildType).toBe('apk');
    expect(easConfig.build.production.channel).toBe('production');
  });
});
