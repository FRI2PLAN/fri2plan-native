import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./MembersScreen.tsx', import.meta.url), 'utf8');
const locales = ['fr', 'en', 'de', 'es', 'it'].map((language) =>
  JSON.parse(readFileSync(new URL(`../locales/${language}.json`, import.meta.url), 'utf8')),
);
const createModalSource = source.slice(
  source.indexOf('visible={showNewCircleModal}'),
  source.indexOf('</Modal>', source.indexOf('visible={showNewCircleModal}')),
);
const joinModalSource = source.slice(
  source.indexOf('visible={showJoinCircleModal}'),
  source.indexOf('</Modal>', source.indexOf('visible={showJoinCircleModal}')),
);

describe('modales de cercle au-dessus du clavier Android', () => {
  it('utilise le positionnement existant pour la création et redimensionne la modale de code sous Android', () => {
    expect(source).toContain('visible={showNewCircleModal}');
    expect(source).toContain('visible={showJoinCircleModal}');
    expect(createModalSource).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'position'}");
    expect(createModalSource).toContain('contentContainerStyle={styles.modalKeyboardContent}');
    expect(joinModalSource).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(joinModalSource).not.toContain('contentContainerStyle={styles.modalKeyboardContent}');
  });

  it('ancre le contenu de chaque modale au bas de la zone redimensionnée', () => {
    expect(source).toContain("modalKeyboardContent: { flex: 1, justifyContent: 'flex-end' }");
    expect(source).toContain("modalDismissArea: { flex: 1, justifyContent: 'flex-end' }");
  });

  it('confirme la copie du code et la jonction dans la langue active', () => {
    expect(source).toContain("t('members.circleCodeCopiedTitle')");
    expect(source).toContain("t('members.circleCodeCopiedMessage')");
    expect(source).toContain("t('members.joinCircleSuccessTitle')");
    expect(source).toContain("t('members.joinCircleSuccessMessage')");
    for (const locale of locales) {
      expect(locale.members.circleCodeCopiedTitle).toBeTruthy();
      expect(locale.members.circleCodeCopiedMessage).toBeTruthy();
      expect(locale.members.joinCircleSuccessTitle).toBeTruthy();
      expect(locale.members.joinCircleSuccessMessage).toBeTruthy();
    }
  });
});
