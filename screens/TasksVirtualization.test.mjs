import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./TasksScreen.tsx', import.meta.url), 'utf8');

describe('Tâches — historique virtualisé', () => {
  it('utilise FlatList pour les tâches terminées nombreuses', () => {
    expect(screen).toContain("filter === 'completed' && !isLoading ? (");
    expect(screen).toContain('<FlatList');
    expect(screen).toContain('data={filteredTasks}');
    expect(screen).toContain('initialNumToRender={12}');
    expect(screen).toContain('removeClippedSubviews={Platform.OS === \'android\'}');
  });
});
