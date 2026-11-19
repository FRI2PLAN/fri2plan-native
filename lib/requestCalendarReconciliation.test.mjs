import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  requestCalendarScope, createRequestCalendarScopeGuard, removeRequestEvents, isEventNotFound,
  rollbackEventUpdate, rollbackEventDelete, resolveScopedSelection, isRequestNotice, reconcileRequestCalendar,
  requestCalendarMutationContext,
} from './requestCalendarReconciliation.js';

const A = 11, B = 22, U = 101, V = 202, RID = 10, EID = 80;
const request = extra => ({ id: RID, familyId: A, userId: U, title: 'Fixture', status: 'pending', ...extra });
const event = extra => ({ id: EID, familyId: A, userId: U, title: 'Same fixture title', relatedRequestId: RID, ...extra });
const paths = ['requests.list', 'events.list', 'requests.hasOpenBadge', 'requests.getUnreadCommentsCounts', 'notifications.list', 'notifications.getUnreadCount'];
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const flush = () => new Promise(resolve => setImmediate(resolve));
function utilities(options = {}) {
  const trace = [], initial = { 'requests.list': [request()], 'events.list': [event()], 'requests.hasOpenBadge': true, 'requests.getUnreadCommentsCounts': { [RID]: 1 }, 'notifications.list': [], 'notifications.getUnreadCount': 1 };
  const server = structuredClone(initial), utils = { client: {} }, data = {};
  // Vraies révisions/structural sharing, aucune queryFn/réseau ni persistance.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const keys = Object.fromEntries(paths.map(path => [path, [path, path === 'events.list' ? undefined : { familyId: A }]]));
  for (const path of paths) {
    queryClient.setQueryData(keys[path], initial[path]);
    Object.defineProperty(data, path, { enumerable: true, get: () => queryClient.getQueryData(keys[path]), set: value => queryClient.setQueryData(keys[path], value) });
    const [domain, procedure] = path.split('.'); utils[domain] ??= {}; utils.client[domain] ??= {};
    utils[domain][procedure] = {
      invalidate: vi.fn((input, settings) => { trace.push(['invalidate', path, input, settings]); return options.invalidate?.(path) ?? Promise.resolve(); }),
      setData: vi.fn((input, update) => { trace.push(['set', path, input]); return queryClient.setQueryData(keys[path], update); }),
      getData: vi.fn(() => queryClient.getQueryData(keys[path])),
      queryOptions: vi.fn(() => ({ queryKey: keys[path] })),
      fetch: vi.fn(() => { throw new Error('Automatically cached fetch forbidden'); }),
    };
    utils.client[domain][procedure] = { query: vi.fn(input => { trace.push(['query', path, input]); return options.query?.(path) ?? Promise.resolve(structuredClone(server[path])); }) };
  }
  const forbidden = vi.fn(() => { throw new Error('Unrelated domain forbidden'); });
  for (const domain of ['notes', 'tasks', 'rewards', 'user', 'family', 'syncedCalendars']) utils[domain] = new Proxy({}, { get: () => ({ invalidate: forbidden, fetch: forbidden, setData: forbidden }) });
  return { utils, trace, data, server, forbidden, queryClient, keys };
}

describe('Réconciliation — scopes immuables et génération', () => {
  it.each([[undefined, A, true, false], [U, undefined, true, false], [U, A, false, false], [U, A, true, true]])('scope non prêt %j/%j/%j/%j neutralisé', (u, f, ready, transitioning) => {
    expect(requestCalendarScope(u, f, ready, transitioning)).toBeNull();
  });
  it('scope stable, gelé ; cercle/compte/unmount invalident et A→B→A ne ressuscite jamais A', () => {
    const guard = createRequestCalendarScopeGuard(); const scope = requestCalendarScope(U, A), old = guard.update(scope);
    expect(Object.isFrozen(old)).toBe(true); scope.familyId = B; expect(old.familyId).toBe(A);
    expect(guard.update(requestCalendarScope(U, A))).toBe(old);
    guard.update(requestCalendarScope(U, B)); expect(guard.isCurrent(old)).toBe(false);
    const back = guard.update(requestCalendarScope(U, A)); expect(back).not.toBe(old); expect(guard.isCurrent(old)).toBe(false);
    guard.update(requestCalendarScope(V, A)); expect(guard.isCurrent(back)).toBe(false);
    const beforeUnmount = guard.update(requestCalendarScope(U, A)); guard.update(null); expect(guard.isCurrent(beforeUnmount)).toBe(false);
    expect(guard.update(requestCalendarScope(U, A))).not.toBe(beforeUnmount);
  });
});

describe('Mutation — WeakMap exacte et origine active avant HTTP', () => {
  it('rend le même contexte enregistré, sans clone ni recapture de nouvelle ouverture A', () => {
    const guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A));
    const variables = { requestId: RID, familyId: A, expectedUserId: U }, context = { origin, opening: 1 };
    const actionOrigins = new WeakMap([[variables, context]]), newerOpening = { origin, opening: 2 };
    expect(requestCalendarMutationContext(actionOrigins, variables, guard)).toBe(context);
    expect(requestCalendarMutationContext(actionOrigins, variables, guard)).not.toBe(newerOpening);
    expect(actionOrigins.get(variables)).toBe(context);
  });
  it('clone, objet absent, undefined, null et ancien payload string lèvent sans origine inventée', () => {
    const guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A));
    const variables = { requestId: RID }, actionOrigins = new WeakMap([[variables, { origin, opening: 1 }]]);
    for (const missing of [{ ...variables }, {}, undefined, null, '10']) {
      expect(() => requestCalendarMutationContext(actionOrigins, missing, guard)).toThrow();
    }
    expect(requestCalendarMutationContext(actionOrigins, variables, guard).origin).toBe(origin);
  });
  it('unmount, autre cercle, autre compte et A→B→A refusent le contexte périmé exact', () => {
    for (const mode of ['unmount', 'circle', 'account', 'ABA']) {
      const guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A));
      const variables = { requestId: RID }, context = { origin, opening: 1 }, actionOrigins = new WeakMap([[variables, context]]);
      if (mode === 'unmount') guard.update(null);
      else if (mode === 'account') guard.update(requestCalendarScope(V, A));
      else { guard.update(requestCalendarScope(U, B)); if (mode === 'ABA') guard.update(requestCalendarScope(U, A)); }
      expect(() => requestCalendarMutationContext(actionOrigins, variables, guard), mode).toThrow();
      expect(actionOrigins.get(variables)).toBe(context);
    }
  });
});

describe('Réconciliation — liens certains, erreurs et sélection actuelle', () => {
  it('liens multiples/IDs certains supprimés, jamais par titre/date/auteur ; entrée non mutée', () => {
    const input = [event(), event({ id: 81 }), event({ id: 82, relatedRequestId: null }), event({ id: 83, relatedRequestId: 99 }), event({ id: 84, relatedRequestId: String(RID) })];
    const snapshot = structuredClone(input);
    expect(removeRequestEvents(input, RID, [82, -83, '83', NaN]).map(e => e.id)).toEqual([83, 84]);
    expect(input).toEqual(snapshot); expect(removeRequestEvents(undefined, RID)).toBeUndefined();
    expect(removeRequestEvents(input, undefined, [82]).map(e => e.id)).toEqual([80, 81, 83, 84]);
  });
  it.each([{ data: { code: 'NOT_FOUND' } }, { shape: { data: { code: 'NOT_FOUND' } } }, { code: 'NOT_FOUND' }])('NOT_FOUND structuré reconnu %j', error => expect(isEventNotFound(error)).toBe(true));
  it.each([{ message: 'Événement introuvable' }, { message: 'NOT_FOUND' }, { data: { code: 'FORBIDDEN' } }, { code: 'NETWORK_ERROR' }, new Error('Network'), null])('pas de fausse suppression sur %j', error => expect(isEventNotFound(error)).toBe(false));
  it('update rollback objet seulement ; objet authoritative/nouvelle liste non clobber', () => {
    const previous = event(), optimistic = { ...previous, title: 'Optimistic' }, other = event({ id: 81 });
    expect(rollbackEventUpdate([optimistic, other], previous, optimistic)).toEqual([previous, other]);
    const fresh = { ...optimistic, title: 'Server fresh' }; expect(rollbackEventUpdate([fresh, other], previous, optimistic)).toEqual([fresh, other]);
    expect(rollbackEventUpdate([], previous, optimistic)).toEqual([]);
  });
  it('delete rollback ne réinsère que dans SA liste optimiste ; authoritative vide et concurrente gagnent', () => {
    const previous = event(), other = event({ id: 81 }), optimisticList = [other];
    expect(rollbackEventDelete(optimisticList, previous, optimisticList)).toEqual([other, previous]);
    expect(rollbackEventDelete([], previous, optimisticList)).toEqual([]);
    const fresh = [event({ id: 82 })]; expect(rollbackEventDelete(fresh, previous, optimisticList)).toBe(fresh);
    const alreadyBack = [other, previous]; expect(rollbackEventDelete(alreadyBack, previous, alreadyBack)).toBe(alreadyBack);
  });
  it('fiche lit objet courant, attend pendant loading/restauration, ferme si absence authoritative ou changement scope', () => {
    const snapshot = request(), fresh = request({ status: 'rejected', title: 'Fresh' });
    expect(resolveScopedSelection(snapshot, [fresh], true, true)).toBe(fresh);
    expect(resolveScopedSelection(snapshot, [], false, true)).toBe(snapshot);
    expect(resolveScopedSelection(snapshot, undefined, false, true)).toBe(snapshot);
    expect(resolveScopedSelection(snapshot, [], true, true)).toBeNull();
    expect(resolveScopedSelection(snapshot, [fresh], false, false)).toBeNull();
  });
  it.each(['request_created', 'request_updated', 'request_approved', 'request_rejected', 'request_deleted', 'request_comment'])('notice %s cible uniquement cercle courant explicite', type => {
    expect(isRequestNotice({ type, familyId: A }, A)).toBe(true); expect(isRequestNotice({ type, familyId: B }, A)).toBe(false);
  });
  it('URL requêtes compatible sans familyId, pas de refresh global pour Notes/Points/event', () => {
    expect(isRequestNotice({ type: 'request', actionUrl: '/requests', familyId: String(A) }, A)).toBe(true);
    expect(isRequestNotice({ actionUrl: '/requests?requestId=10' }, A)).toBe(true);
    expect(isRequestNotice({ url: '/requests?requestId=10' }, A)).toBe(true);
    expect(isRequestNotice({ url: '/requests', familyId: B }, A)).toBe(false);
    for (const payload of [{ type: 'event_created' }, { type: 'note_created' }, { actionUrl: '/requests-other' }, null]) expect(isRequestNotice(payload, A)).toBe(false);
  });
});

describe('Réconciliation — relecture raw ciblée, read-after-write et réponses tardives', () => {
  it('refus : suppression immédiate puis six reads/scopes exacts, badges et notifications à jour', async () => {
    const h = utilities(), guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A));
    h.server['requests.list'][0].status = 'rejected'; h.server['events.list'] = []; h.server['requests.hasOpenBadge'] = false; h.server['notifications.getUnreadCount'] = 0;
    const pending = reconcileRequestCalendar(h.utils, origin, token => guard.isCurrent(token), { requestId: RID, removeLinked: true });
    expect(h.data['events.list']).toEqual([]);
    expect(await pending).toEqual({ skipped: false, failed: [] });
    expect(h.data['requests.list'][0].status).toBe('rejected'); expect(h.data['requests.hasOpenBadge']).toBe(false); expect(h.data['notifications.getUnreadCount']).toBe(0);
    for (const path of paths) {
      const [domain, procedure] = path.split('.'), input = domain === 'events' ? undefined : { familyId: A };
      expect(h.utils[domain][procedure].invalidate).toHaveBeenCalledWith(input, { refetchType: 'none' });
      expect(h.utils.client[domain][procedure].query).toHaveBeenCalledWith(input);
      expect(h.utils[domain][procedure].fetch).not.toHaveBeenCalled();
    }
    expect(h.trace[0]).toEqual(['set', 'events.list', undefined]); expect(h.forbidden).not.toHaveBeenCalled();
  });
  it('double refus/reply ancien sans deletedEventIds : aucune réinsertion ni dépendance au nouveau retour', async () => {
    const h = utilities(), guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A)); h.server['events.list'] = [];
    for (let i = 0; i < 2; i++) await reconcileRequestCalendar(h.utils, origin, token => guard.isCurrent(token), { requestId: RID, removeLinked: true });
    expect(h.data['events.list']).toEqual([]); expect(h.forbidden).not.toHaveBeenCalled();
  });
  it('approbation : pas de suppression locale avant relecture', async () => {
    const gate = deferred(), h = utilities({ query: path => path === 'events.list' ? gate.promise : undefined });
    const origin = { userId: U, familyId: A }; const pending = reconcileRequestCalendar(h.utils, origin, () => true);
    await flush(); expect(h.data['events.list']).toHaveLength(1); gate.resolve([event()]); await pending;
    expect(h.data['events.list']).toHaveLength(1);
  });
  it.each(['invalidate', 'query'])('%s en échec : erreurs observées, autres reads continuent, pas de rejet/faux succès métier', async stage => {
    const h = utilities({ [stage]: path => path === 'events.list' ? Promise.reject(new Error('Transport fixture')) : undefined });
    const origin = { userId: U, familyId: A }; expect(await reconcileRequestCalendar(h.utils, origin, () => true)).toEqual({ skipped: false, failed: ['events.list'] });
    expect(h.data['events.list']).toHaveLength(1); expect(h.utils.client.requests.list.query).toHaveBeenCalled();
  });
  it('ancienne réponse après interruption/démontage : zéro accès partagé', async () => {
    const h = utilities(), guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A)); guard.update(null);
    expect(await reconcileRequestCalendar(h.utils, origin, token => guard.isCurrent(token), { requestId: RID, removeLinked: true })).toEqual({ skipped: true, failed: [] }); expect(h.trace).toEqual([]);
  });
  it.each(['circle', 'account', 'unmount', 'ABA'])('read A en vol puis %s : aucune réponse A mise en cache après changement', async mode => {
    const gate = deferred(), h = utilities({ query: () => gate.promise }), guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A));
    const pending = reconcileRequestCalendar(h.utils, origin, token => guard.isCurrent(token)); await flush();
    if (mode === 'unmount') guard.update(null);
    else if (mode === 'account') guard.update(requestCalendarScope(V, A));
    else { guard.update(requestCalendarScope(U, B)); if (mode === 'ABA') guard.update(requestCalendarScope(U, A)); }
    h.data['events.list'] = [event({ id: 99, familyId: B })]; const sets = h.trace.filter(([kind]) => kind === 'set').length;
    gate.resolve([]); expect((await pending).skipped).toBe(true);
    expect(h.data['events.list'].map(e => e.id)).toEqual([99]); expect(h.trace.filter(([kind]) => kind === 'set')).toHaveLength(sets);
  });
  it('scope interrompu pendant invalidate : aucun raw query ni écriture après invalidation', async () => {
    const gate = deferred(), h = utilities({ invalidate: () => gate.promise }), guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A));
    const pending = reconcileRequestCalendar(h.utils, origin, token => guard.isCurrent(token)); guard.update(null); gate.resolve(); await pending;
    expect(h.trace.filter(([kind]) => kind === 'query' || kind === 'set')).toEqual([]);
  });
});

describe('Réconciliation finale — générations de reads et domaines strictement ciblés', () => {
  it.each([
    [{ eventsOnly: true }, ['events.list']],
    [{ badgesOnly: true }, ['requests.hasOpenBadge', 'requests.getUnreadCommentsCounts']],
  ])('options %j : seules procédures autorisées sont invalidées/lues', async (options, expected) => {
    const h = utilities(), guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A));
    expect(await reconcileRequestCalendar(h.utils, origin, token => guard.isCurrent(token), options)).toEqual({ skipped: false, failed: [] });
    for (const operation of ['invalidate', 'query', 'set']) expect(h.trace.filter(([kind]) => kind === operation).map(([, path]) => path)).toEqual(expected);
    expect(h.forbidden).not.toHaveBeenCalled();
  });
  it('read ancien avant refus puis read neuf vide : génération empêche le ghost même si ancien finit dernier', async () => {
    const old = deferred(), fresh = deferred(), h = utilities(), guard = createRequestCalendarScopeGuard(), origin = guard.update(requestCalendarScope(U, A));
    h.utils.client.events.list.query.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => fresh.promise);
    const first = reconcileRequestCalendar(h.utils, origin, token => guard.isCurrent(token), { eventsOnly: true }); await flush();
    const second = reconcileRequestCalendar(h.utils, origin, token => guard.isCurrent(token), { eventsOnly: true, removeLinked: true, requestId: RID });
    expect(h.data['events.list']).toEqual([]); await flush(); fresh.resolve([]); await second;
    const empty = h.data['events.list'], count = h.utils.events.list.setData.mock.calls.length; old.resolve([event()]); await first;
    expect(h.data['events.list']).toBe(empty); expect(h.data['events.list']).toEqual([]); expect(h.utils.events.list.setData).toHaveBeenCalledTimes(count);
  });
  it('deux reads sans changement local : dernier démarré gagne, ancien ne remplace pas objet fresh', async () => {
    const old = deferred(), fresh = deferred(), h = utilities(), origin = { userId: U, familyId: A };
    h.utils.client.events.list.query.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => fresh.promise);
    const first = reconcileRequestCalendar(h.utils, origin, () => true, { eventsOnly: true }); await flush();
    const second = reconcileRequestCalendar(h.utils, origin, () => true, { eventsOnly: true }); await flush(); fresh.resolve([event({ title: 'Authoritative fresh' })]); await second;
    old.resolve([event({ title: 'Old' })]); await first; expect(h.data['events.list'][0].title).toBe('Authoritative fresh'); expect(h.utils.events.list.setData).toHaveBeenCalledTimes(1);
  });
  it('read ancien en vol et suppression locale seulement : comparaison cache empêche réinsertion', async () => {
    const old = deferred(), h = utilities(), origin = { userId: U, familyId: A }; h.utils.client.events.list.query.mockReturnValue(old.promise);
    const pending = reconcileRequestCalendar(h.utils, origin, () => true, { eventsOnly: true }); await flush();
    h.utils.events.list.setData(undefined, rows => removeRequestEvents(rows, RID)); const count = h.utils.events.list.setData.mock.calls.length; old.resolve([event()]); await pending;
    expect(h.data['events.list']).toEqual([]); expect(h.utils.events.list.setData).toHaveBeenCalledTimes(count);
  });
  it('réponse raw FORBIDDEN/réseau ne constitue pas une absence et laisse ancien cache intact', async () => {
    for (const error of [{ data: { code: 'FORBIDDEN' } }, new Error('Network')]) {
      const h = utilities(), origin = { userId: U, familyId: A }, before = h.data['events.list']; h.utils.client.events.list.query.mockRejectedValue(error);
      expect(await reconcileRequestCalendar(h.utils, origin, () => true, { eventsOnly: true })).toEqual({ skipped: false, failed: ['events.list'] }); expect(h.data['events.list']).toBe(before); expect(h.utils.events.list.setData).not.toHaveBeenCalled();
    }
  });
  it('cache TanStack partage liste vide mais incrémente la révision à chaque donnée authoritative', () => {
    const h = utilities(); h.data['events.list'] = []; const empty = h.data['events.list'], revision = h.queryClient.getQueryState(h.keys['events.list']).dataUpdateCount;
    h.data['events.list'] = []; expect(h.data['events.list']).toBe(empty); expect(h.queryClient.getQueryState(h.keys['events.list']).dataUpdateCount).toBe(revision + 1);
  });
});
