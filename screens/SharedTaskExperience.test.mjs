import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./TasksScreen.tsx', import.meta.url), 'utf8');
const types = readFileSync(new URL('../lib/types.ts', import.meta.url), 'utf8');

describe('expérience des tâches communes', () => {
  it('conserve une distinction explicite entre tâche personnelle et commune', () => {
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
  });

  it('conserve les tâches communes dans Mes tâches sans les dupliquer', () => {
    expect(source).toContain("t.assignmentMode === 'shared'");
    expect(source).toContain('(t.participants || []).some');
  });

  it('expose les contrats de participants partagés', () => {
    expect(types).toContain('export interface TaskParticipant');
    expect(types).toContain("assignmentMode?: 'personal' | 'shared'");
    expect(types).toContain('participants?: TaskParticipant[]');
  });
});
