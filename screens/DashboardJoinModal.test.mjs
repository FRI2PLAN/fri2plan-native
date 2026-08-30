import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./DashboardScreen.tsx', import.meta.url), 'utf8');
const locales = ['fr', 'en', 'de', 'es', 'it'].map((language) =>
  JSON.parse(readFileSync(new URL(`../locales/${language}.json`, import.meta.url), 'utf8')),
);

describe('modale de jonction de famille', () => {
  it('utilise une modale centrée qui se redimensionne avec le clavier', () => {
    expect(source).toContain("import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, TextInput, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';");
    expect(source).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(source).toContain("justifyContent: 'center'");
    expect(source).toContain('statusBarTranslucent');
  });

  it('ne garde aucun texte français figé dans la modale et dispose des cinq traductions', () => {
    for (const hardCodedText of ['>Rejoindre une famille<', 'Entrez le code d’invitation', 'placeholder="Code d’invitation"', '>Annuler<']) {
      expect(source).not.toContain(hardCodedText);
    }
    for (const locale of locales) {
      for (const key of ['joinFamily', 'joinFamilyDescription', 'joinFamilyCodePlaceholder', 'joinFamilyInvalidCode']) {
        expect(locale.dashboard[key]).toBeTruthy();
      }
    }
  });
});
