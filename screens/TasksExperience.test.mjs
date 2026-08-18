import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const tasksScreen = readFileSync(new URL('./TasksScreen.tsx', import.meta.url), 'utf8');
const completionFeedback = readFileSync(new URL('../components/CompletionFeedback.tsx', import.meta.url), 'utf8');

describe('Tâches — expérience de validation familiale', () => {
  it('met la tâche à jour immédiatement avant la synchronisation serveur', () => {
    expect(tasksScreen).toContain('optimisticCompletedTaskIds');
    expect(tasksScreen).toContain('utils.tasks.list.setData');
    expect(tasksScreen).toContain("status: 'completed'");
  });

  it('relie la validation à un feedback haptique et visuel sans alerte bloquante', () => {
    expect(tasksScreen).toContain('triggerCompletionHaptic(points)');
    expect(tasksScreen).toContain('<CompletionFeedback');
    expect(tasksScreen).toContain('celebrate: isImportant');
    expect(tasksScreen).not.toContain("Alert.alert('🎉'");
  });

  it('affiche le responsable avec son avatar personnalisé et une carte enrichie', () => {
    expect(tasksScreen).toContain('<MemberAvatar member={assignedMember} size={34} />');
    expect(tasksScreen).toContain('styles.assigneeMeta');
    expect(tasksScreen).toContain('styles.taskCardCompleted');
    expect(tasksScreen).toContain('todayProgressPercent');
    expect(tasksScreen).toContain('styles.todayProgressFill');
  });

  it('conserve une célébration discrète pour les tâches importantes', () => {
    expect(completionFeedback).toContain('celebrate?: boolean');
    expect(completionFeedback).toContain('{celebrate && <Text style={styles.sparkle}>✦</Text>}');
  });
});
