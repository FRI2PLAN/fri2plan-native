import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./RegisterScreen.tsx', import.meta.url), 'utf8');
const locales = ['fr', 'en', 'de', 'es', 'it'].map((language) =>
  JSON.parse(readFileSync(new URL(`../locales/${language}.json`, import.meta.url), 'utf8')),
);

describe('localisation complète de l’inscription', () => {
  it('ne conserve pas les libellés d’inscription écrits en dur', () => {
    for (const hardCodedText of [
      '>Inscription<',
      'Créez votre compte Fri2Plan',
      '>Nom complet<',
      'Masquer le code d\'invitation',
      '>S\'inscrire<',
      'Déjà un compte ?',
      '>OU<',
      '>Connexion en cours...<',
    ]) {
      expect(source).not.toContain(hardCodedText);
    }
  });

  it('utilise les clés d’inscription et les règles de mot de passe dans chaque langue', () => {
    for (const key of [
      "t('register.title')",
      "t('register.subtitle')",
      "t('register.fullName')",
      "t('register.haveInviteCode')",
      "t('register.googleSigningIn')",
      "t('auth.pwdUppercase')",
      "t('auth.pwdLowercase')",
      "t('auth.pwdDigit')",
      "t('auth.pwdSpecial')",
    ]) {
      expect(source).toContain(key);
    }
    for (const locale of locales) {
      for (const key of [
        'title', 'subtitle', 'fullName', 'fullNamePlaceholder', 'emailPlaceholder',
        'hideInviteCode', 'haveInviteCode', 'inviteCodePlaceholder', 'or',
        'googleSigningIn', 'googleTokenMissing', 'googlePlayServicesUnavailable', 'googleSignInFailed',
      ]) {
        expect(locale.register[key]).toBeTruthy();
      }
      for (const key of ['pwdUppercase', 'pwdLowercase', 'pwdDigit', 'pwdSpecial']) {
        expect(locale.auth[key]).toBeTruthy();
      }
    }
  });
});
