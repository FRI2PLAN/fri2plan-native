import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./MembersScreen.tsx', import.meta.url), 'utf8');

describe('modales de cercle au-dessus du clavier Android', () => {
  it('utilise un conteneur de positionnement clavier dans les modales Créer et Rejoindre', () => {
    expect(source).toContain('visible={showNewCircleModal}');
    expect(source).toContain('visible={showJoinCircleModal}');
    expect(source.match(/behavior=\{Platform\.OS === 'ios' \? 'padding' : 'position'\}/g)).toHaveLength(2);
    expect(source.match(/contentContainerStyle=\{styles\.modalKeyboardContent\}/g)).toHaveLength(2);
  });

  it('ancre le contenu de chaque modale au bas de la zone redimensionnée', () => {
    expect(source).toContain("modalKeyboardContent: { flex: 1, justifyContent: 'flex-end' }");
    expect(source).toContain("modalDismissArea: { flex: 1, justifyContent: 'flex-end' }");
  });
});
