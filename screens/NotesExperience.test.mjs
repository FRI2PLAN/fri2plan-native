import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const screen = read('./NotesScreen.tsx');
const quick = read('../components/QuickCreateModal.tsx');
const prefetch = read('../components/GlobalPrefetch.tsx');
const types = read('../lib/types.ts');
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

describe('Notes — structure de l’expérience isolée', () => {
  it('écran et preload partagent une clé user+cercle, jamais une liste globale/fallback', () => {
    for (const source of [screen, prefetch]) {
      expect(source).toContain('noteScope(user?.id, activeFamilyId, isReady, isCircleTransitioning)');
      expect(source).toContain('queryKey: noteListKey(scope)');
      expect(source).toContain('utils.client.notes.list.query({ familyId: scope.familyId }, { signal })');
      expect(source).toContain('placeholderData: undefined');
      expect(source).not.toContain('trpc.notes.list.useQuery');
    }
    expect(screen).toContain('enabled: !!scope');
    expect(prefetch).toContain('enabled: ready && !!scope');
  });

  it('filtre avant recherche/quota et ne confond pas erreur et liste vide', () => {
    expect(screen).toContain('notesInScope<Note>(notes, scope)');
    expect(screen).toContain('const filtered = scopedNotes.filter');
    expect(screen).toContain('isFree && scopedNotes.length >= 5');
    expect(screen).toContain("if (isError || isLoading)");
    expect(screen).toContain("t('notes.loadError')");
    expect(screen.indexOf(') : isError ?')).toBeLessThan(screen.indexOf(') : filteredNotes.length === 0 ?'));
  });

  it('permet édition/suppression/épinglage des shared sans guard auteur/admin', () => {
    const card = between(screen, 'const renderNoteCard', 'const renderAttachmentList');
    expect(card).toContain('onPress={() => openEditDialog(note)}');
    expect(card).toContain('onLongPress={() => handleTogglePin(note)}');
    expect(card).toContain('<TouchableOpacity onPress={() => handleTogglePin(note)}');
    expect(card).not.toContain('isOwner');
    expect(screen).toContain('<TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>');
    expect(screen).not.toContain('selectedNote?.userId === user?.id &&');
    const actions = between(screen, 'const handleDelete', 'const uploadTarget');
    expect(actions).not.toMatch(/userId|admin|isOwner/);
    expect(actions).toContain('requireScope(origin, note)');
  });

  it('seul auteur peut changer privacy; scope et auteur ne sont jamais édités', () => {
    expect(screen).toContain('disabled={!selectedNote || selectedNote.userId !== currentScope?.userId}');
    expect(screen).toContain('...(selectedNote.userId === origin.userId ? { isPrivate: editIsPrivate } : {})');
    const mutations = between(screen, 'const handleCreate', 'const uploadTarget');
    expect(mutations).not.toMatch(/userId\s*:/);
    expect(mutations).not.toContain('familyId: activeFamilyId');
    expect(mutations).toContain('familyId: origin.familyId, noteId: selectedNote.id');
    expect(mutations).toContain('familyId: origin.familyId, noteId: note.id');
  });

  it('annule formulaires, confirmation, uploads et callbacks après switch/compte/unmount', () => {
    expect(screen).toContain('const currentScope = scopeGuard.update(scope)');
    expect(screen).toContain('}, [currentScope]);');
    expect(screen).toContain('scopeGuard.update(null)');
    expect(screen).toContain('createFormScope.current === currentScope');
    expect(screen).toContain('editFormScope.current === currentScope');
    expect(screen).toContain('formVersion !== editFormVersion.current');
    expect(screen).toContain('if (!scopeGuard.isCurrent(origin)) return;');
    expect(screen).toContain('target.version === (isEdit ? editFormVersion.current : createFormVersion.current)');
    expect(screen).toContain('if (!targetIsCurrent(target, isEdit)) return;');
    expect(screen).toContain('if (targetIsCurrent(target, isEdit)) setUploadingFile(false)');
  });

  it('offline écran capture durablement user+cercle et invalide seulement la clé origine', () => {
    expect(screen).toContain('await enqueue({ type, payload, scope: { userId: origin.userId, familyId: origin.familyId } }');
    expect(screen).toContain('queryKey: noteListKey(origin), exact: true');
    expect(screen).not.toContain('utils.notes.list.invalidate');
    for (const name of ['create', 'update', 'delete', 'uploadFile']) {
      expect(screen).toContain(`trpc.notes.${name}.useMutation({ networkMode: 'always', retry: false })`);
    }
    expect(screen).toContain("t('notes.offlineUploadUnavailable')");
  });

  it('quick-create Notes ne prend jamais families[0], est online-only et ignore réponses périmées', () => {
    expect(quick).toContain('noteScope(user?.id, ctxFamilyId, isReady, isCircleTransitioning)');
    expect(quick).toContain('noteFormOrigin === noteOrigin');
    expect(quick).toContain('noteGuard.update(null)');
    const submit = between(quick, "case 'note': {", "case 'expense': {");
    expect(submit).toContain('familyId: origin.familyId');
    expect(submit).not.toContain('activeFamilyId');
    expect(submit).toContain('if (!isConnected)');
    expect(submit).toContain("t('notes.offlineQuickCreateUnavailable')");
    expect(submit).toContain('!noteGuard.isCurrent(origin) || noteOpeningScope.current !== origin');
    expect(submit).toContain('queryKey: noteListKey(origin), exact: true');
    expect(quick).toContain("trpc.notes.create.useMutation({ networkMode: 'always', retry: false })");
    expect(quick).not.toContain('utils.notes.list.invalidate');
  });

  it('maintient les autres mutations quick-create/preload sans scope Notes', () => {
    for (const name of ['events', 'tasks', 'requests']) {
      expect(quick).toContain(`utils.${name}.list.invalidate(); handleClose();`);
    }
    expect(quick).toContain('utils.budget.invalidate(); handleClose();');
    expect(prefetch).toContain('trpc.tasks.list.useQuery(undefined, { enabled: ready, staleTime: STALE_2MIN })');
    expect(prefetch).toContain('trpc.rewards.list.useQuery(undefined, { enabled: ready, staleTime: STALE_2MIN })');
  });

  it('documente inputs explicites et privacy update optional bool ou 0/1 sans réattribution', () => {
    const notes = between(types, '  notes: {', '  budget: {');
    expect(notes).toContain('query: (input: { familyId: number })');
    expect(notes).toContain('query: (input: { familyId: number; noteId: number })');
    expect(notes).toContain('isPrivate?: boolean | 0 | 1');
    expect(notes).toContain('Promise<{ noteId: number }>');
    expect(notes).toContain('Promise<{ success: true }>');
    expect(notes).not.toContain('userId:');
    expect(types).toContain('familyId: number | null; // Legacy origin unknown');
  });

  it('messages Notes disponibles dans les cinq locales', () => {
    for (const language of ['fr', 'en', 'de', 'it', 'es']) {
      const locale = JSON.parse(read(`../locales/${language}.json`));
      for (const key of ['privateHint', 'publicHint', 'scopeUnavailable', 'scopeChanged', 'loadError', 'retry',
        'offlineQueued', 'offlineLegacyBlocked', 'offlineScopeBlocked', 'offlineUploadUnavailable',
        'offlineQuickCreateUnavailable']) {
        expect(locale.notes[key], `${language}: notes.${key}`).toBeTruthy();
      }
    }
  });
});
