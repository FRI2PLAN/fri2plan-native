import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./RichHeader.tsx', import.meta.url), 'utf8');

describe('Header — compteur de points', () => {
  it('écoute les variations confirmées et anime progressivement le total', () => {
    expect(source).toContain('subscribeToPointsFeedback');
    expect(source).toContain('Animated.spring(pointsScale');
    expect(source).toContain('setInterval');
    expect(source).toContain('displayedPoints');
  });

  it('calcule le rang à partir des membres réels du cercle, pas des entrées de points historiques', () => {
    expect(source).toContain('const { data: activeFamilyMembers = [] } = trpc.family.members.useQuery');
    expect(source).toContain('const uniqueActiveFamilyMembers = useMemo');
    expect(source).toContain('const membersById = new Map<number, any>();');
    expect(source).toContain('const pointsByUserId = useMemo');
    expect(source).toContain('totalMembers: uniqueActiveFamilyMembers.length');
  });

  it('propose le même changement de langue persistant que les Paramètres', () => {
    expect(source).toContain("import { changeLanguage, getCurrentLanguage } from '../i18n'");
    expect(source).toContain('getLanguageFlag(currentLanguage)');
    expect(source).toContain("return '🇫🇷'");
    expect(source).toContain("return '🇬🇧'");
    expect(source).toContain("return '🇩🇪'");
    expect(source).toContain("setLanguagePickerOpen(true)");
    expect(source).toContain('await changeLanguage(language);');
    expect(source).toContain("['fr', 'en', 'de'].map");
  });

  it('ne déclare les hooks React qu’une seule fois pour conserver un bundling valide', () => {
    expect(source.match(/from 'react'/g)).toHaveLength(1);
    expect(source).toContain("import React, { useEffect, useMemo, useRef, useState } from 'react'");
  });
});
