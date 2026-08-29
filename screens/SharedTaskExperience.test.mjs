import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./TasksScreen.tsx', import.meta.url), 'utf8');
const types = readFileSync(new URL('../lib/types.ts', import.meta.url), 'utf8');
const locales = ['fr', 'en', 'de', 'it', 'es'].map((language) => [
  language,
  JSON.parse(readFileSync(new URL(`../locales/${language}.json`, import.meta.url), 'utf8')),
]);

describe('expérience des tâches communes', () => {
  it('conserve une distinction explicite entre tâche individuelle et commune', () => {
    expect(source).toContain("assignmentMode: 'personal'");
    expect(source).toContain("t('tasks.assignmentShared')");
    expect(source).toContain("t('tasks.assignmentPersonal')");
  });

  it('autorise une sélection de plusieurs participants uniquement pour une tâche commune', () => {
    expect(source).toContain("data.assignmentMode === 'shared'");
    expect(source).toContain('participantUserIds');
    expect(source).toContain("participantUserIds: selected ? data.participantUserIds.filter");
  });

  it('montre une seule carte avec une progression de participants', () => {
    expect(source).toContain('completedParticipants.length');
    expect(source).toContain("t('tasks.sharedProgress'");
  });

  it('permet uniquement au membre connecté de valider sa propre participation', () => {
    expect(source).toContain('participant.userId === user?.id');
    expect(source).toContain("myParticipation?.status === 'completed'");
    expect(source).toContain("t('tasks.sharedValidationRestrictedTitle')");
    expect(source).toContain("t('tasks.sharedValidationRestrictedMessage')");
  });

  it('conserve les tâches communes dans Mes tâches sans les dupliquer', () => {
    expect(source).toContain("t.assignmentMode === 'shared'");
    expect(source).toContain('(t.participants || []).some');
    expect(source).toContain('const taskList = useMemo(() => {');
    expect(source).toContain('const uniqueTasks = new Map<number, any>();');
    expect(source).toContain("useState<FilterType>('myTasks')");
  });

  it('laisse une tâche commune accessible à son créateur et aux administrateurs', () => {
    expect(source).toContain('const canManageSharedTasks = useMemo(() => {');
    expect(source).toContain("currentMember?.role === 'admin'");
    expect(source).toContain('t.createdBy === user?.id');
    expect(source).toContain('|| canManageSharedTasks');
    expect(source).toContain('mayEditParticipants');
    expect(source).toContain('participantUserIds: editFormData.assignmentMode === \'shared\'');
  });

  it('n’affiche pas une validation globale pour une progression seulement individuelle', () => {
    expect(source).toContain("(!isSharedTask && isOptimisticallyCompleted)");
    expect(source).toContain("disabled={isSharedTask && !myParticipation}");
  });

  it('expose les contrats de participants partagés', () => {
    expect(types).toContain('export interface TaskParticipant');
    expect(types).toContain("assignmentMode?: 'personal' | 'shared'");
    expect(types).toContain('participants?: TaskParticipant[]');
  });

  it('explique clairement la sélection et localise le verrouillage d’un participant terminé dans cinq langues', () => {
    expect(source).toContain("t('tasks.sharedParticipantsSelection')");
    expect(source).toContain('SHARED_TASK_COMPLETED_PARTICIPANT_LOCKED');
    expect(source).toContain("t('tasks.sharedCompletedParticipantLockedTitle')");
    expect(source).toContain("t('tasks.sharedCompletedParticipantLockedMessage')");
    for (const [, locale] of locales) {
      expect(locale.tasks.sharedParticipantsSelection).toBeTruthy();
      expect(locale.tasks.sharedParticipantsMinimum).toBeTruthy();
      expect(locale.tasks.sharedParticipantsEditHelp).toBeTruthy();
      expect(locale.tasks.sharedCompletedParticipantLockedTitle).toBeTruthy();
      expect(locale.tasks.sharedCompletedParticipantLockedMessage).toBeTruthy();
    }
  });
});
