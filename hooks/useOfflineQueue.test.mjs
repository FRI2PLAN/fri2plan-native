import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./useOfflineQueue.ts', import.meta.url), 'utf8');

describe('contrat de la file hors connexion', () => {
  it('préserve les noms de paramètres tRPC utilisés par les écrans', () => {
    expect(source).toContain("'task.delete'; payload: { taskId: number }");
    expect(source).toContain("'task.complete'; payload: { taskId: number }");
    expect(source).toContain("'shopping.toggleItem'; payload: { itemId: number; checked: boolean }");
    expect(source).toContain("'shopping.deleteItem'; payload: { itemId: number }");
    expect(source).toContain("'note.delete'; payload: { noteId: number }");
  });

  it('conserve les actions qui doivent pouvoir être rejouées après reconnexion', () => {
    for (const action of ['task.create', 'shopping.addItem', 'message.send']) {
      expect(source).toContain(`type: '${action}'`);
    }
  });
});
