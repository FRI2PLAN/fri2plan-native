import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  positiveNoteId, noteScope, sameNoteScope, noteInScope, notesInScope,
  noteListKey, createNoteScopeGuard, noteReplayBlockReason,
} from './noteScope.ts';

const A = noteScope(101, 701);
const B = noteScope(101, 702);
const otherUser = noteScope(202, 701);

describe('Notes — scope utilisateur/cercle fail-closed', () => {
  it.each([null, undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1,
    '', ' ', '701', '701other', '1.5', true, {}, []])('refuse un identifiant non entier positif: %s', value => {
    expect(positiveNoteId(value)).toBeNull();
    expect(noteScope(101, value)).toBeNull();
    expect(noteScope(value, 701)).toBeNull();
  });
  it('accepte seulement des nombres entiers positifs et attend readiness/transition', () => {
    expect(positiveNoteId(701)).toBe(701);
    expect(A).toEqual({ userId: 101, familyId: 701 });
    expect(Object.isFrozen(A)).toBe(true);
    expect(noteScope(101, 701, false)).toBeNull();
    expect(noteScope(101, 701, true, true)).toBeNull();
    expect(sameNoteScope(A, B)).toBe(false);
    expect(sameNoteScope(A, otherUser)).toBe(false);
  });
  it('exclut notes étrangères et origine legacy null avant quota/recherche', () => {
    const mixed = [
      { id: 1, familyId: 701, userId: 101, isPrivate: false },
      { id: 2, familyId: 701, userId: 101, isPrivate: true },
      { id: 3, familyId: 702, userId: 101, isPrivate: true },
      { id: 4, familyId: 702, userId: 101, isPrivate: false },
      { id: 5, familyId: null, userId: 101 }, { id: 6 },
      { id: 7, familyId: '701' }, null,
    ];
    expect(notesInScope(mixed, A).map(n => n.id)).toEqual([1, 2]);
    expect(notesInScope(mixed, B).map(n => n.id)).toEqual([3, 4]);
    expect(notesInScope(mixed, null)).toEqual([]);
    expect(notesInScope(undefined, A)).toEqual([]);
    expect(noteInScope({ familyId: null }, A)).toBe(false);
  });
  it('partagées accessibles à tout membre, privées auteur seul même pour admin', () => {
    const mixed = [
      { id: 1, familyId: 701, userId: 101, isPrivate: false },
      { id: 2, familyId: 701, userId: 202, isPrivate: 0 },
      { id: 3, familyId: 701, userId: 101, isPrivate: true },
      { id: 4, familyId: 701, userId: 202, isPrivate: 1 },
      { id: 5, familyId: 701, isPrivate: true },
    ];
    expect(notesInScope(mixed, A).map(n => n.id)).toEqual([1, 2, 3]);
    expect(notesInScope(mixed, otherUser).map(n => n.id)).toEqual([1, 2, 4]);
    expect(noteInScope(mixed[3], { ...A, role: 'admin' })).toBe(false);
    expect(noteInScope(mixed[4], A)).toBe(false);
  });
  it('clé commune screen/prefetch distincte pour famille et utilisateur', () => {
    expect(noteListKey(A)).toEqual(noteListKey(noteScope(101, 701)));
    expect(noteListKey(A)).not.toEqual(noteListKey(B));
    expect(noteListKey(A)).not.toEqual(noteListKey(otherUser));
  });
  it.each(['family', 'user', 'transition', 'notReady', 'unmount'])('invalide formulaire/confirmation/upload/callback après %s, même A -> B -> A', async reason => {
    const guard = createNoteScopeGuard();
    const origin = guard.update(A);
    expect(guard.update(noteScope(101, 701))).toBe(origin);
    let resolve;
    const late = new Promise(r => { resolve = r; });
    let uiUpdates = 0;
    const callback = late.then(() => { if (guard.isCurrent(origin)) uiUpdates++; });
    guard.update(reason === 'family' ? B : reason === 'user' ? otherUser : null);
    const returned = guard.update(A);
    expect(returned).not.toBe(origin);
    expect(guard.isCurrent(origin)).toBe(false);
    resolve(); await callback;
    expect(uiUpdates).toBe(0);
  });
  it('une réponse A tardive ne remplit pas B et la purge existante reste efficace', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let release;
    const pending = client.fetchQuery({ queryKey: noteListKey(A), queryFn: () => new Promise(r => { release = r; }) });
    client.setQueryData(noteListKey(B), []);
    release([{ id: 1, familyId: 701 }]); await pending;
    expect(client.getQueryData(noteListKey(B))).toEqual([]);
    expect(notesInScope(client.getQueryData(noteListKey(A)), B)).toEqual([]);
    client.clear();
    expect(client.getQueryData(noteListKey(A))).toBeUndefined();
  });
});

describe('Notes — décision de rejeu immuable', () => {
  const action = { type: 'note.create', scope: A, payload: { familyId: 701, title: 'Synthetic' } };
  it('autorise le cercle/utilisateur exact, pas B ni un autre compte ni transition', () => {
    expect(noteReplayBlockReason(action, A)).toBeNull();
    expect(noteReplayBlockReason(action, B)).toBe('scope');
    expect(noteReplayBlockReason(action, otherUser)).toBe('scope');
    expect(noteReplayBlockReason(action, null)).toBe('scope');
    expect(action.scope).toEqual(A);
  });
  it.each(['note.create', 'note.update', 'note.delete'])('retient %s legacy sans jamais utiliser le cercle courant par défaut', type => {
    expect(noteReplayBlockReason({ type, payload: { noteId: 9 } }, A)).toBe('legacy');
    expect(noteReplayBlockReason({ type, scope: A, payload: { familyId: null } }, A)).toBe('legacy');
    expect(noteReplayBlockReason({ type, scope: A, payload: { familyId: 702 } }, A)).toBe('scope');
  });
  it.each(['task.create', 'task.update', 'task.delete', 'task.complete',
    'shopping.addItem', 'shopping.toggleItem', 'shopping.deleteItem', 'message.send'])('ne bloque pas %s', type => {
    expect(noteReplayBlockReason({ type, payload: {} }, null)).toBeNull();
  });
});
