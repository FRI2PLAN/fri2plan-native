export interface NoteScope {
  readonly userId: number;
  readonly familyId: number;
}

export interface NoteScopeToken extends NoteScope {
  readonly generation: number;
}

// Do not coerce null/zero/partial strings (e.g. "12other") into a circle.
export function positiveNoteId(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function noteScope(userId: unknown, familyId: unknown, isReady = true, isTransitioning = false): NoteScope | null {
  const user = positiveNoteId(userId);
  const family = positiveNoteId(familyId);
  return isReady && !isTransitioning && user !== null && family !== null
    ? Object.freeze({ userId: user, familyId: family }) : null;
}

export function sameNoteScope(origin: NoteScope | null | undefined, current: NoteScope | null | undefined): boolean {
  return !!origin && !!current && positiveNoteId(origin.userId) !== null && positiveNoteId(origin.familyId) !== null
    && origin.userId === current.userId && origin.familyId === current.familyId;
}

export function noteInScope(note: { familyId?: unknown; userId?: unknown; isPrivate?: unknown } | null | undefined, scope: NoteScope | null | undefined): boolean {
  return !!note && !!scope && positiveNoteId(note.familyId) !== null && note.familyId === scope.familyId
    && (!(note.isPrivate === true || note.isPrivate === 1) || note.userId === scope.userId);
}

export function notesInScope<T extends { familyId?: unknown; userId?: unknown; isPrivate?: unknown }>(notes: unknown, scope: NoteScope | null): T[] {
  return Array.isArray(notes) ? notes.filter(note => noteInScope(note, scope)) : [];
}

// Same key for screen/prefetch/replay, without sending userId as API authorization.
export function noteListKey(scope: NoteScope | null) {
  return [['notes', 'list'], { input: { familyId: scope?.familyId ?? null }, type: 'query' }, { userId: scope?.userId ?? null }] as const;
}

// Invalidate on readiness/transition changes too. A -> B -> A never revives a
// confirmation, upload or callback captured before the switch.
export function createNoteScopeGuard() {
  let current: NoteScopeToken | null = null;
  let generation = 0;
  return {
    update(scope: NoteScope | null): NoteScopeToken | null {
      if (!sameNoteScope(scope, current)) {
        if (scope || current) generation += 1;
        current = scope ? Object.freeze({ ...scope, generation }) : null;
      }
      return current;
    },
    isCurrent(token: NoteScopeToken | null | undefined): token is NoteScopeToken {
      return !!token && token === current;
    },
    capture(): NoteScopeToken | null { return current; },
  };
}

export function isNoteOfflineAction(action: { type?: unknown }): boolean {
  return action.type === 'note.create' || action.type === 'note.update' || action.type === 'note.delete';
}

export function noteReplayBlockReason(
  action: { type?: unknown; scope?: NoteScope; payload?: unknown },
  current: NoteScope | null,
): 'legacy' | 'scope' | null {
  if (!isNoteOfflineAction(action)) return null;
  const familyId = (action.payload as { familyId?: unknown } | null)?.familyId;
  if (!noteScope(action.scope?.userId, action.scope?.familyId)
      || positiveNoteId(familyId) === null) return 'legacy';
  return sameNoteScope(action.scope, current) && familyId === action.scope?.familyId ? null : 'scope';
}
