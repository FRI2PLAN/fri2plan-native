import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ts from 'typescript';
import { format } from 'date-fns';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import * as reconciliation from '../lib/requestCalendarReconciliation.js';

// Exécution des expressions, handlers, callbacks et cleanups TSX réels.
// QueryClient réel, en mémoire, sans queryFn : structural sharing et révisions réels.
// Aucun montage RN, téléphone, API, DB, push, installation ou .env.
const R = 'RequestsScreen.tsx', C = 'CalendarScreen.tsx', Q = 'QuickCreateModal.tsx', APP = 'App.tsx';
const files = { [R]: `./${R}`, [C]: `./${C}`, [Q]: '../components/QuickCreateModal.tsx', [APP]: '../App.tsx' };
const sources = Object.fromEntries(Object.entries(files).map(([file, path]) => [file, ts.createSourceFile(file, readFileSync(new URL(path, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)]));
function collect(root, predicate) { const found = []; function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); } visit(root); return found; }
const text = (file, node) => node.getText(sources[file]);
function declaration(file, name) {
  const node = collect(sources[file], node => ts.isVariableDeclaration(node) && text(file, node.name) === name)[0];
  if (!node?.initializer) throw new Error(`Déclaration réelle absente: ${file}/${name}`); return node.initializer;
}
function evaluate(file, expression, bindings) {
  const code = ts.transpileModule(`const extracted = (${typeof expression === 'string' ? expression : text(file, expression)});`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
  return Function(...Object.keys(bindings), `${code}\nreturn extracted;`)(...Object.values(bindings));
}
const compile = (file, name, bindings) => evaluate(file, declaration(file, name), bindings);
function effect(file, pattern, root = sources[file]) {
  const found = collect(root, node => ts.isCallExpression(node) && text(file, node.expression) === 'useEffect').find(node => pattern.test(text(file, node.arguments[0])));
  expect(found, `effet réel ${file}/${pattern}`).toBeDefined(); return found;
}
function scopeCleanup(file, bindings, guardName = 'scopeGuard') {
  const cleanup = evaluate(file, effect(file, new RegExp(`${guardName}\\.update\\(null\\)`)).arguments[0], bindings)();
  expect(typeof cleanup).toBe('function'); return cleanup;
}
const RID = 10, EID = 80, A = 11, B = 22, U = 101;
const request = extra => ({ id: RID, familyId: A, userId: U, type: 'outing', title: 'Fixture request', status: 'pending', ...extra });
const event = extra => ({ id: EID, familyId: A, userId: U, title: 'Fixture event', relatedRequestId: RID, startTime: '2026-12-01 18:00:00', endTime: '2026-12-01 19:00:00', startDate: '2026-12-01 18:00:00', recurrence: 'none', ...extra });
const paths = ['requests.list', 'events.list', 'requests.hasOpenBadge', 'requests.getUnreadCommentsCounts', 'notifications.list', 'notifications.getUnreadCount'];
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const createdInput = () => ({ type: 'outing', title: 'Fixture', description: undefined, requestedDate: new Date('2026-12-01T18:00:00Z'), familyId: A, expectedUserId: U });
function expectedRequestInput(name) {
  if (name === 'createRequest') return createdInput();
  if (name === 'reviewRequest') return { requestId: RID, status: 'rejected', reviewComment: 'Reason', familyId: A, expectedUserId: U };
  if (name === 'deleteRequest') return { requestId: RID, familyId: A, expectedUserId: U };
  if (name === 'addComment') return { requestId: RID, message: 'Fixture comment' };
  return { requestId: RID };
}
async function queuedMutation(m, beforeOnMutate) {
  const gate = deferred(), reached = deferred(), mutationFn = vi.fn(async () => ({ success: true, requestId: RID }));
  // Le callback du cache TanStack précède réellement onMutate puis mutationFn.
  // Aucun fetch : mutationFn est uniquement le témoin local d'un départ HTTP.
  const client = new QueryClient({ mutationCache: new MutationCache({ onMutate: async () => { reached.resolve(); await gate.promise; } }), defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
  const mutation = client.getMutationCache().build(client, { ...m.callback, mutationFn });
  const outcome = mutation.execute(m.input).then(value => ({ value }), error => ({ error }));
  await reached.promise; beforeOnMutate(); gate.resolve();
  const settled = await outcome, context = mutation.state.context; client.clear();
  return { ...settled, context, mutationFn };
}
function cacheHarness() {
  const trace = [], initial = { 'requests.list': [request()], 'events.list': [event()], 'requests.hasOpenBadge': true, 'requests.getUnreadCommentsCounts': {}, 'notifications.list': [], 'notifications.getUnreadCount': 1 };
  const server = structuredClone(initial), utils = { client: {} }, data = {}, queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const keys = Object.fromEntries(paths.map(path => [path, [path, path === 'events.list' ? undefined : { familyId: A }]]));
  for (const path of paths) {
    queryClient.setQueryData(keys[path], initial[path]);
    Object.defineProperty(data, path, { enumerable: true, get: () => queryClient.getQueryData(keys[path]), set: value => queryClient.setQueryData(keys[path], value) });
    const [domain, procedure] = path.split('.'); utils[domain] ??= {}; utils.client[domain] ??= {};
    utils[domain][procedure] = {
      invalidate: vi.fn(async (input, settings) => { trace.push(['invalidate', path, input, settings]); }),
      getData: vi.fn(() => queryClient.getQueryData(keys[path])),
      setData: vi.fn((input, updater) => { trace.push(['set', path, input]); return queryClient.setQueryData(keys[path], updater); }),
      queryOptions: vi.fn(() => ({ queryKey: keys[path] })),
    };
    utils.client[domain][procedure] = { query: vi.fn(async input => { trace.push(['query', path, input]); return structuredClone(server[path]); }) };
  }
  return { data, server, trace, utils, queryClient, keys };
}
function derived(file, h, ui, bindings, extra = {}) {
  const isRequest = file === R, prefix = isRequest ? 'request' : 'event', queryName = isRequest ? 'requestsQuery' : 'eventsQuery', authoritativeName = isRequest ? 'requestsAuthoritative' : 'eventsAuthoritative';
  const b = { ...bindings, isRestoring: false, [queryName]: { isSuccess: true, isFetching: false, isPlaceholderData: false, data: h.data[isRequest ? 'requests.list' : 'events.list'] }, [isRequest ? 'requestSnapshot' : 'eventSnapshot']: ui.selected, ...extra };
  b[authoritativeName] ??= compile(file, authoritativeName, b);
  b[`${prefix}ScopeCurrent`] = compile(file, `${prefix}ScopeCurrent`, b);
  b[isRequest ? 'selectedRequest' : 'selectedEvent'] = compile(file, isRequest ? 'selectedRequest' : 'selectedEvent', b);
  b[`${prefix}Actionable`] = compile(file, `${prefix}Actionable`, b);
  return { ...b, ...extra };
}
function requestHarness() {
  const h = cacheHarness(), ui = { detail: true, create: true, selected: request(), comment: 'Reason', alerts: [] }, mutations = [];
  const scopeGuard = reconciliation.createRequestCalendarScopeGuard(), scopeToken = scopeGuard.update(reconciliation.requestCalendarScope(U, A));
  const requestOpening = { current: { origin: scopeToken, opening: 1, requestId: RID } }, createOpening = { current: { origin: scopeToken, opening: 2 } }, openingSequence = { current: 2 };
  const bindings = {
    ...reconciliation, scopeGuard, scopeToken, requestOpening, createOpening, openingSequence, utils: h.utils, useRef: value => ({ current: value }),
    setDetailDialogOpen: vi.fn(value => { ui.detail = value; }), setSelectedRequest: vi.fn(value => { ui.selected = value; }),
    setCreateDialogOpen: vi.fn(value => { ui.create = value; }), setReviewComment: vi.fn(value => { ui.comment = value; }), setNewComment: vi.fn(), refetchComments: vi.fn(async () => {}),
    resetForm: vi.fn(), t: key => key, Alert: { alert: vi.fn((...args) => ui.alerts.push(args)) },
    trpc: { requests: Object.fromEntries(['create', 'review', 'delete', 'markCommentsRead', 'addComment'].map(kind => [kind, { useMutation: options => options }])) },
  };
  bindings.actionOrigins = compile(R, 'actionOrigins', bindings);
  for (const name of ['reconcile', 'detailStillCurrent', 'createStillCurrent', 'closeDetail', 'closeCreate', 'openCreate']) bindings[name] = compile(R, name, bindings);
  const names = ['createRequest', 'reviewRequest', 'deleteRequest', 'markCommentsRead', 'addComment'];
  const callbacks = Object.fromEntries(names.map(name => [name, compile(R, name, bindings)]));
  for (const name of names) bindings[name] = { isPending: false, mutate: vi.fn(input => mutations.push({ name, input, callback: callbacks[name] })) };
  const run = (name, extra = {}) => compile(R, name, derived(R, h, ui, bindings, { reviewComment: ui.comment, newComment: ' Fixture comment ', formType: 'outing', formTitle: ' Fixture ', formDescription: '', formDate: new Date('2026-12-01T18:00:00Z'), unreadCounts: {}, ...extra }));
  const start = (name, extra = {}) => {
    const count = mutations.length;
    if (name === 'createRequest') run('handleCreate', extra)();
    else if (name === 'reviewRequest') run('handleReview', extra)(extra.status ?? 'rejected');
    else if (name === 'deleteRequest') { run('handleDelete', extra)(); ui.alerts.at(-1)[2].find(button => button.style === 'destructive').onPress(); }
    else if (name === 'markCommentsRead') run('handleOpenDetail', { unreadCounts: { [RID]: 1 }, ...extra })(request());
    else run('handleSendComment', extra)();
    expect(mutations.length, `handler ${name} émet un payload`).toBe(count + 1); return mutations.at(-1);
  };
  const action = (name, extra = {}) => { const m = start(name, extra); return { ...m, context: m.callback.onMutate(m.input) }; };
  return { ...h, ui, bindings, scopeGuard, scopeToken, requestOpening, createOpening, callbacks, run, start, action, mutations, cleanup: scopeCleanup(R, bindings) };
}
function calendarHarness() {
  const h = cacheHarness(), ui = { selected: event(), edit: true, alerts: [], form: null }, timers = [], frames = [], mutations = [];
  const scopeGuard = reconciliation.createRequestCalendarScopeGuard(), scopeToken = scopeGuard.update(reconciliation.requestCalendarScope(U, A));
  const eventOpening = { current: { origin: scopeToken, opening: 1, eventId: EID } }, eventOpeningSequence = { current: 1 }, editCleanupTimer = { current: null };
  const mutation = kind => ({ isPending: false, mutate: vi.fn((input, options) => mutations.push({ kind, input, options })) });
  const bindings = {
    ...reconciliation, scopeGuard, scopeToken, eventOpening, eventOpeningSequence, editCleanupTimer,
    calendarUtils: h.utils, eventQueryClient: h.queryClient, isRestoring: false,
    setEditModalOpen: vi.fn(value => { ui.edit = value; }), setSelectedEvent: vi.fn(value => { ui.selected = value; }), resetForm: vi.fn(),
    setTimeout: vi.fn((callback, delay) => { const timer = { callback, delay }; timers.push(timer); return timer; }), clearTimeout: vi.fn(), requestAnimationFrame: vi.fn(callback => { frames.push(callback); }),
    setEventDate: vi.fn(), setStartTimeDate: vi.fn(), setEndTimeDate: vi.fn(), setFormData: vi.fn(value => { ui.form = value; }),
    parseLocalDate: value => new Date(String(value).replace(' ', 'T')), format, defaultReminderStr: '25', updateEvent: mutation('update'), deleteEvent: mutation('delete'),
    hasNativeRecurrence: value => value.recurrence && value.recurrence !== 'none', t: key => key, Alert: { alert: vi.fn((...args) => ui.alerts.push(args)) }, console: { error: vi.fn() },
  };
  bindings.closeEditModal = compile(C, 'closeEditModal', bindings); bindings.revalidateEvents = compile(C, 'revalidateEvents', bindings);
  const run = (name, extra = {}) => compile(C, name, derived(C, h, ui, bindings, { eventDate: new Date(2026, 11, 1), startTimeDate: new Date(2026, 11, 1, 18), endTimeDate: new Date(2026, 11, 1, 19), formData: { title: 'Updated', description: '', recurrence: 'none', category: 'other', reminder: '25', isPrivate: false }, ...extra }));
  const start = async kind => { if (kind === 'update') await run('handleUpdateEvent')(); else { run('handleDeleteEvent')(); ui.alerts.at(-1)[2].find(button => button.style === 'destructive').onPress(); } expect(mutations.at(-1)).toBeDefined(); return mutations.at(-1); };
  return { ...h, ui, bindings, scopeGuard, scopeToken, eventOpening, eventOpeningSequence, editCleanupTimer, timers, frames, mutations, run, start, cleanup: scopeCleanup(C, bindings) };
}
function quickHarness() {
  const h = cacheHarness(), requestGuard = reconciliation.createRequestCalendarScopeGuard(), requestScopeToken = requestGuard.update(reconciliation.requestCalendarScope(U, A));
  const requestOpening = { current: { origin: requestScopeToken, opening: 1 } }, alerts = [], closed = vi.fn(), mutations = [];
  const bindings = { ...reconciliation, utils: h.utils, requestGuard, requestScopeToken, requestOpening, useRef: value => ({ current: value }), type: 'request', initialDate: undefined, defaultReminderStr: '25', onClose: closed, t: key => key, Alert: { alert: vi.fn((...args) => alerts.push(args)) }, trpc: { requests: { create: { useMutation: options => options } } } };
  for (const name of ['Title', 'Description', 'EventCategory', 'EventDate', 'EventEndDate', 'IsAllDay', 'IsMultiDay', 'StartTime', 'EndTime', 'EventPrivate', 'EventReminder', 'EventRecurrence', 'EventRecurrenceEndDate', 'TaskPriority', 'TaskAssignedTo', 'TaskDueDate', 'TaskPrivate', 'TaskRecurrence', 'NotePrivate', 'ExpenseType', 'ExpenseAmount', 'ExpenseCategory', 'ExpenseDate', 'ExpensePrivate', 'RequestType', 'RequestDate']) bindings[`set${name}`] = vi.fn();
  bindings.requestActionOrigins = compile(Q, 'requestActionOrigins', bindings); bindings.handleClose = compile(Q, 'handleClose', bindings);
  const callback = compile(Q, 'createRequest', bindings);
  bindings.createRequest = { isPending: false, mutate: vi.fn(input => mutations.push({ input, callback })) };
  const run = (extra = {}) => compile(Q, 'handleSubmit', { ...bindings, title: ' Fixture ', description: '', requestType: 'outing', requestDate: new Date('2026-12-01T18:00:00Z'), ...extra });
  const start = () => { const count = mutations.length; run()(); expect(mutations).toHaveLength(count + 1); return mutations.at(-1); };
  const action = () => { const m = start(); return { ...m, context: callback.onMutate(m.input) }; };
  return { ...h, bindings, callback, requestGuard, requestScopeToken, requestOpening, alerts, closed, run, start, action, mutations, cleanup: scopeCleanup(Q, bindings, 'requestGuard') };
}
function receptionHarness(options = {}) {
  const h = cacheHarness(), scopeGuard = reconciliation.createRequestCalendarScopeGuard(), origin = scopeGuard.update(reconciliation.requestCalendarScope(U, A));
  const listeners = {}, removals = [], connectionRef = { current: options.connected ?? true }, online = { current: options.online ?? true };
  const node = sources[APP].statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'RequestCalendarReception'); expect(node).toBeDefined();
  const register = (name, callback) => { listeners[name] = callback; return { remove: vi.fn(() => removals.push(name)) }; };
  const runReconcile = vi.fn(options.reconcile ?? reconciliation.reconcileRequestCalendar);
  const bindings = { ...reconciliation, reconcileRequestCalendar: runReconcile, utils: h.utils, scopeGuard, origin, connectionRef,
    Notifications: { addNotificationReceivedListener: callback => register('received', callback), addNotificationResponseReceivedListener: callback => register('response', callback) },
    AppState: { currentState: 'active', addEventListener: (name, callback) => { expect(name).toBe('change'); return register('foreground', callback); } },
    onlineManager: { isOnline: () => online.current, subscribe: callback => { listeners.reconnect = callback; return () => removals.push('reconnect'); } },
  };
  const scopeDispose = evaluate(APP, effect(APP, /scopeGuard\.update\(null\)/, node).arguments[0], bindings)();
  const listenerEffect = effect(APP, /addNotificationReceivedListener/, node);
  let listenerDispose = evaluate(APP, listenerEffect.arguments[0], bindings)();
  const restart = () => { listenerDispose(); listenerDispose = evaluate(APP, listenerEffect.arguments[0], bindings)(); };
  return { ...h, origin, scopeGuard, listeners, removals, connectionRef, online, runReconcile, listenerEffect, restart, cleanup: () => { listenerDispose(); scopeDispose(); } };
}
const received = payload => ({ request: { content: { data: payload } } });
function successOnly(h, key) { expect(h.ui.alerts.some(([title, message]) => title === 'common.success' && message === key)).toBe(true); expect(h.ui.alerts.some(([title]) => title === 'common.error')).toBe(false); }
const errors = [{ data: { code: 'FORBIDDEN' }, message: 'Forbidden' }, new Error('Network')];

describe('Requests — vrais handlers puis callbacks avec exact payload', () => {
  it.each(['reviewRequest', 'deleteRequest'])('%s succès : lien/IDs retirés, fiche fermée et six domaines ciblés relus', async name => {
    const h = requestHarness(), { callback, input, context } = h.action(name);
    h.data['events.list'] = [...h.data['events.list'], event({ id: 81, relatedRequestId: null })]; h.server['events.list'] = []; h.server['requests.list'] = name === 'deleteRequest' ? [] : [request({ status: 'rejected' })]; h.server['requests.hasOpenBadge'] = false;
    const pending = callback.onSuccess({ success: true, deletedEventIds: [81] }, input, context);
    expect(h.data['events.list']).toEqual([]); await pending;
    expect(h.ui.detail).toBe(false); expect(h.ui.selected).toBeNull(); expect(h.data['requests.hasOpenBadge']).toBe(false);
    expect(h.utils.client.requests.list.query).toHaveBeenCalledWith({ familyId: A }); expect(h.utils.client.events.list.query).toHaveBeenCalledWith(undefined);
    successOnly(h, name === 'deleteRequest' ? 'requests.deleted' : 'requests.reviewed');
  });
  it('approbation et ancien reply sans deletedEventIds : événement conservé', async () => {
    const h = requestHarness(), { callback, input, context } = h.action('reviewRequest', { status: 'approved' }); h.server['requests.list'] = [request({ status: 'approved' })];
    await callback.onSuccess({ success: true }, input, context); expect(h.data['events.list']).toHaveLength(1); expect(h.data['requests.list'][0].status).toBe('approved'); successOnly(h, 'requests.reviewed');
  });
  it('refus répété ancien reply : aucun ghost, une seule annonce métier', async () => {
    const h = requestHarness(), { callback, input, context } = h.action('reviewRequest'); h.server['events.list'] = []; h.server['requests.list'] = [request({ status: 'rejected' })];
    await callback.onSuccess({ success: true }, input, context); await callback.onSuccess({ success: true, changed: false }, input, context);
    expect(h.data['events.list']).toEqual([]); expect(h.ui.alerts.filter(([title]) => title === 'common.success')).toHaveLength(1);
  });
  it('création datée réelle : relecture request/event et fermeture propre', async () => {
    const h = requestHarness(), { callback, input, context } = h.action('createRequest'); h.data['requests.list'] = []; h.data['events.list'] = [];
    expect(input.title).toBe('Fixture'); expect(input.requestedDate).toBeInstanceOf(Date);
    await callback.onSuccess({ requestId: RID }, input, context); expect(h.data['requests.list'][0].id).toBe(RID); expect(h.data['events.list'][0].id).toBe(EID); expect(h.ui.create).toBe(false); expect(h.bindings.resetForm).toHaveBeenCalled(); successOnly(h, 'requests.created');
  });
  it.each([false, true])('erreur transport après write=%s : état déterminé par read, jamais faux succès', async applied => {
    const h = requestHarness(), { callback, input, context } = h.action('reviewRequest');
    if (applied) { h.server['requests.list'] = [request({ status: 'rejected' })]; h.server['events.list'] = []; }
    await callback.onError({ message: 'Fixture transport', data: { code: 'INTERNAL_SERVER_ERROR' } }, input, context);
    expect(h.data['requests.list'][0].status).toBe(applied ? 'rejected' : 'pending'); expect(h.data['events.list']).toHaveLength(applied ? 0 : 1);
    expect(h.ui.alerts.some(([title]) => title === 'common.success')).toBe(false); expect(h.ui.comment).toBe('Reason'); expect(h.ui.detail).toBe(true);
  });
  it.each(['createRequest', 'deleteRequest'])('%s error : relecture sans suppression inférée', async name => {
    const h = requestHarness(), { callback, input, context } = h.action(name); await callback.onError(new Error('Network'), input, context);
    expect(h.data['events.list']).toHaveLength(1); expect(h.utils.client.events.list.query).toHaveBeenCalled(); expect(h.ui.alerts.some(([title]) => title === 'common.success')).toBe(false);
  });
  it('refresh échoue après réussite métier : un seul résultat, suppression locale maintenue', async () => {
    const h = requestHarness(), { callback, input, context } = h.action('reviewRequest'); h.utils.client.events.list.query.mockRejectedValue(new Error('refresh'));
    await callback.onSuccess({ success: true }, input, context); expect(h.ui.alerts).toHaveLength(1); successOnly(h, 'requests.reviewed'); expect(h.data['events.list']).toEqual([]);
  });
  it.each(['createRequest', 'reviewRequest', 'deleteRequest', 'markCommentsRead', 'addComment'])('onMutate %s lit seulement le payload exact enregistré par le handler', async name => {
    const h = requestHarness(), m = h.start(name), opening = name === 'createRequest' ? h.createOpening.current : h.requestOpening.current;
    expect(m.input).toEqual(expectedRequestInput(name));
    for (const missing of [{ ...m.input }, undefined, String(RID)]) expect(() => m.callback.onMutate(missing)).toThrow();
    expect(m.callback.onMutate(m.input)).toBe(opening);
    expect(Object.keys(m.input)).not.toContain('origin'); expect(Object.keys(m.input)).not.toContain('opening'); await flush();
  });
  it.each(['createRequest', 'reviewRequest', 'deleteRequest'])('%s reply après cleanup réel A : aucun cache/UI B', async name => {
    const h = requestHarness(), { callback, input, context } = h.action(name); h.cleanup(); h.data['events.list'] = [event({ id: 99, familyId: B })]; const before = structuredClone(h.data), count = h.trace.length, alerts = h.ui.alerts.length;
    await callback.onSuccess({ success: true, deletedEventIds: [99] }, input, context); await callback.onError(new Error('Old'), input, context);
    expect(h.data).toEqual(before); expect(h.trace).toHaveLength(count); expect(h.ui.alerts).toHaveLength(alerts);
  });
  it.each(['createRequest', 'reviewRequest', 'deleteRequest'])('%s onMutate décalé après nouvelle ouverture même cercle autorise HTTP mais garde ancienne origine/UI', async name => {
    const h = requestHarness(), m = h.start(name), opening = name === 'createRequest' ? h.createOpening.current : h.requestOpening.current;
    if (name === 'createRequest') h.bindings.openCreate(); else { h.data['requests.list'] = [...h.data['requests.list'], request({ id: 11 })]; h.server['requests.list'] = structuredClone(h.data['requests.list']); h.run('handleOpenDetail')(request({ id: 11 })); await flush(); }
    const alerts = h.ui.alerts.length, execution = await queuedMutation(m, () => {}), { context } = execution;
    expect(execution.error).toBeUndefined(); expect(execution.mutationFn).toHaveBeenCalledTimes(1); expect(execution.mutationFn.mock.calls[0][0]).toBe(m.input);
    expect(context).toBe(opening); expect(context).not.toBe(name === 'createRequest' ? h.createOpening.current : h.requestOpening.current);
    await m.callback.onError(new Error('Old'), m.input, context);
    expect(h.ui.alerts).toHaveLength(alerts); expect(name === 'createRequest' ? h.ui.create : h.ui.detail).toBe(true);
  });
  it.each(['createRequest', 'reviewRequest', 'deleteRequest', 'markCommentsRead', 'addComment'])('%s queued après unmount/cercle B lève et empêche mutationFn/HTTP', async name => {
    for (const mode of ['unmount', 'circle']) {
      const h = requestHarness(), m = h.start(name), old = h.bindings.actionOrigins.get(m.input); await flush();
      let before, count, alerts;
      const execution = await queuedMutation(m, () => {
        if (mode === 'unmount') h.cleanup();
        else { const b = h.scopeGuard.update(reconciliation.requestCalendarScope(U, B)); h.requestOpening.current = { origin: b, opening: 9, requestId: 99 }; h.createOpening.current = { origin: b, opening: 10 }; }
        h.data['events.list'] = [event({ id: 99, familyId: B })]; before = structuredClone(h.data); count = h.trace.length; alerts = h.ui.alerts.length;
        expect(() => m.callback.onMutate(m.input)).toThrow();
      });
      expect(execution.error).toBeInstanceOf(Error); expect(execution.context).toBeUndefined(); expect(execution.mutationFn).not.toHaveBeenCalled();
      expect(h.bindings.actionOrigins.get(m.input)).toBe(old); expect(old.origin.familyId).toBe(A);
      expect(h.data).toEqual(before); expect(h.trace).toHaveLength(count); expect(h.ui.alerts).toHaveLength(alerts);
    }
  });
  it('détail refuse autre cercle/unmount et marque les commentaires avec exact contexte', async () => {
    const h = requestHarness(); h.ui.detail = false; h.run('handleOpenDetail')(request({ familyId: B })); expect(h.ui.detail).toBe(false);
    const m = h.start('markCommentsRead'); expect(m.callback.onMutate(m.input)).toBe(h.requestOpening.current); await flush(); h.trace.length = 0;
    m.callback.onSuccess({}, m.input, m.callback.onMutate(m.input)); await flush(); expect(h.trace.filter(([op]) => op === 'query').map(([, path]) => path)).toEqual(['requests.hasOpenBadge', 'requests.getUnreadCommentsCounts']);
    const open = h.run('handleOpenDetail'); h.cleanup(); h.ui.detail = false; const count = h.trace.length; open(request()); expect(h.ui.detail).toBe(false); expect(h.trace).toHaveLength(count);
  });
  it.each([false, true])('handleReview garde actionable=%s et recontrôle le statut actuel du cache', actionable => {
    const h = requestHarness(), mutation = { mutate: vi.fn(), isPending: false }; const review = h.run('handleReview', { requestActionable: actionable, reviewRequest: mutation });
    review('rejected'); expect(mutation.mutate).toHaveBeenCalledTimes(actionable ? 1 : 0);
    h.data['requests.list'] = [request({ status: 'rejected' })]; review('approved'); expect(mutation.mutate).toHaveBeenCalledTimes(actionable ? 1 : 0);
    h.data['requests.list'] = []; review('rejected'); expect(mutation.mutate).toHaveBeenCalledTimes(actionable ? 1 : 0);
  });
  it('confirmation delete ancienne ouverture ou cache sans objet : aucun mutate', () => {
    const h = requestHarness(), mutation = { mutate: vi.fn(), isPending: false }; h.run('handleDelete', { deleteRequest: mutation })(); const confirm = h.ui.alerts.at(-1)[2].find(b => b.style === 'destructive').onPress;
    h.requestOpening.current = { origin: h.scopeToken, opening: 3, requestId: RID }; confirm(); expect(mutation.mutate).not.toHaveBeenCalled();
    h.run('handleDelete', { deleteRequest: mutation })(); h.data['requests.list'] = []; h.ui.alerts.at(-1)[2].find(b => b.style === 'destructive').onPress(); expect(mutation.mutate).not.toHaveBeenCalled();
  });
  it.each(['handleCreate', 'handleReview', 'handleDelete', 'handleSendComment'])('ancien %s capturé puis unmount A : aucun mutate malgré anciens flags', name => {
    const h = requestHarness(), handler = h.run(name); h.cleanup(); handler('rejected'); expect(h.mutations).toEqual([]);
  });
});

describe('Calendar — handlers optimistic, absence authoritative et révisions réelles', () => {
  it.each(['update', 'delete'])('%s NOT_FOUND : aucun ghost ni alerte générique', async kind => {
    const h = calendarHarness(), m = await h.start(kind), other = event({ id: 99, relatedRequestId: null }); h.data['events.list'] = [other]; h.server['events.list'] = [other];
    await m.options.onError({ data: { code: 'NOT_FOUND' }, message: 'Missing' }); expect(h.data['events.list']).toEqual([other]); expect(h.ui.edit).toBe(false); expect(h.utils.client.events.list.query).toHaveBeenCalled(); expect(h.ui.alerts.some(([title]) => title === 'common.error')).toBe(false);
  });
  it.each(['update', 'delete'].flatMap(kind => errors.map((error, n) => [kind, n, error])))('%s erreur %s : rollback de son objet, pas absence inférée, alerte maintenue', async (kind, _n, error) => {
    const h = calendarHarness(), before = h.data['events.list'][0], m = await h.start(kind), gate = deferred(); h.utils.client.events.list.query.mockReturnValue(gate.promise);
    const pending = m.options.onError(error); expect(h.data['events.list']).toContainEqual(before); expect(h.ui.alerts.some(([title]) => title === 'common.error')).toBe(true); gate.resolve([before]); await pending; expect(h.data['events.list']).toEqual([before]);
  });
  it.each(['update', 'delete'])('%s réseau après nouvelle liste : ne clobber pas cache authoritative', async kind => {
    const h = calendarHarness(), m = await h.start(kind), fresh = [event({ id: 99, relatedRequestId: null })]; h.data['events.list'] = fresh; h.server['events.list'] = fresh;
    await m.options.onError(new Error('Network')); expect(h.data['events.list']).toEqual(fresh); expect(h.data['events.list'].some(e => e.id === EID)).toBe(false);
  });
  it('delete : authoritative vide structurally shared mais révision changée interdit rollback/ghost', async () => {
    const h = calendarHarness(), m = await h.start('delete'), optimistic = h.data['events.list'], revision = h.queryClient.getQueryState(h.keys['events.list']).dataUpdateCount;
    expect(optimistic).toEqual([]); h.data['events.list'] = []; expect(h.data['events.list']).toBe(optimistic); expect(h.queryClient.getQueryState(h.keys['events.list']).dataUpdateCount).toBe(revision + 1);
    const gate = deferred(); h.utils.client.events.list.query.mockReturnValue(gate.promise); const pending = m.options.onError(new Error('Network'));
    expect(h.data['events.list']).toBe(optimistic); expect(h.data['events.list']).toEqual([]); gate.resolve([]); await pending; expect(h.data['events.list']).toEqual([]);
  });
  it('update : nouveau cache identique structurally shared mais révision changée interdit rollback', async () => {
    const h = calendarHarness(), m = await h.start('update'), optimistic = h.data['events.list'], revision = h.queryClient.getQueryState(h.keys['events.list']).dataUpdateCount;
    h.data['events.list'] = structuredClone(optimistic); expect(h.data['events.list']).toBe(optimistic); expect(h.queryClient.getQueryState(h.keys['events.list']).dataUpdateCount).toBe(revision + 1);
    const gate = deferred(); h.utils.client.events.list.query.mockReturnValue(gate.promise); const pending = m.options.onError(new Error('Network')); expect(h.data['events.list']).toBe(optimistic); gate.resolve(structuredClone(optimistic)); await pending; expect(h.data['events.list'][0].title).toBe('Updated');
  });
  it.each(['update', 'delete'])('%s transport après write : relecture détermine état sans restaurer liste ancienne', async kind => {
    const h = calendarHarness(), m = await h.start(kind); h.server['events.list'] = kind === 'delete' ? [] : [event({ title: 'Committed' })]; await m.options.onError(new Error('Response lost'));
    expect(h.data['events.list']).toEqual(h.server['events.list']);
  });
  it.each(['update', 'delete'])('%s succès : seulement events.list, pas notification ni seconde annonce', async kind => {
    const h = calendarHarness(), m = await h.start(kind); h.server['events.list'] = kind === 'delete' ? [] : [event({ title: 'Server fresh' })]; await m.options.onSuccess({ success: true });
    expect(h.data['events.list']).toEqual(h.server['events.list']); expect(h.ui.alerts.some(([title]) => title === 'common.success')).toBe(false); expect(h.trace.filter(([op]) => op === 'query').map(([, path]) => path)).toEqual(['events.list']);
  });
  it.each(['update', 'delete'])('%s vieux reply après unmount A : aucun rollback/refetch/UI B', async kind => {
    const h = calendarHarness(), m = await h.start(kind); h.cleanup(); h.data['events.list'] = [event({ id: 99, familyId: B })]; const before = structuredClone(h.data), count = h.trace.length, alerts = h.ui.alerts.length;
    await m.options.onError({ data: { code: 'NOT_FOUND' } }); await m.options.onSuccess({ success: true }); expect(h.data).toEqual(before); expect(h.trace).toHaveLength(count); expect(h.ui.alerts).toHaveLength(alerts);
  });
  it.each(['handleUpdateEvent', 'handleDeleteEvent'])('%s capturé avant unmount : aucun mutate ni cache même flags anciens', async name => {
    const h = calendarHarness(), handler = h.run(name), before = structuredClone(h.data); h.cleanup(); await handler(); expect(h.mutations).toEqual([]); expect(h.data).toEqual(before); expect(h.trace).toEqual([]);
  });
  it.each(['update', 'delete'])('%s vieille erreur ne ferme ni alerte une nouvelle fiche même cercle', async kind => {
    const h = calendarHarness(), m = await h.start(kind), fresh = event({ id: 81, relatedRequestId: null }); h.data['events.list'] = [...h.data['events.list'], fresh]; h.server['events.list'] = structuredClone(h.data['events.list']); h.run('openEditModal')(fresh);
    const alerts = h.ui.alerts.length; await m.options.onError(new Error('Old')); expect(h.ui.edit).toBe(true); expect(h.ui.selected.id).toBe(81); expect(h.ui.alerts).toHaveLength(alerts);
  });
  it('timer fermeture ancien puis nouvelle ouverture : aucun reset/selection effacée', () => {
    const h = calendarHarness(); h.bindings.closeEditModal(); const oldTimer = h.timers[0]; expect(oldTimer.delay).toBe(260); h.data['events.list'] = [...h.data['events.list'], event({ id: 81 })]; h.run('openEditModal')(event({ id: 81 })); oldTimer.callback(); expect(h.ui.selected.id).toBe(81); expect(h.ui.edit).toBe(true); expect(h.bindings.resetForm).not.toHaveBeenCalled();
  });
  it('ancien frame ignore fermeture/nouvelle ouverture et unmount', () => {
    const h = calendarHarness(); h.run('openEditModal')(event()); const old = h.frames[0]; h.bindings.closeEditModal(); h.data['events.list'] = [...h.data['events.list'], event({ id: 81 })]; h.run('openEditModal')(event({ id: 81, title: 'New' })); old(); expect(h.ui.form).toBeNull(); h.frames[1](); expect(h.ui.form.title).toBe('New'); h.bindings.setFormData.mockClear(); h.cleanup(); h.frames[1](); expect(h.bindings.setFormData).not.toHaveBeenCalled();
  });
  it('openEditModal refuse absent authoritative/public autre cercle, attend loading/restoring', () => {
    const h = calendarHarness(); h.ui.edit = false; h.run('openEditModal')(event({ id: 99 })); expect(h.ui.edit).toBe(false); h.run('openEditModal')(event({ familyId: B })); expect(h.ui.edit).toBe(false);
    h.run('openEditModal', { eventsQuery: { isSuccess: false, data: undefined } })(event()); expect(h.ui.edit).toBe(true); h.ui.edit = false;
    h.run('openEditModal', { isRestoring: true, eventsQuery: { isSuccess: true, data: [] } })(event()); expect(h.ui.edit).toBe(true);
  });
  it.each([1, true])('Calendrier intime isPrivate=%s auteur actif autre cercle autorisé si row query présente', isPrivate => {
    const h = calendarHarness(), intimate = event({ familyId: B, isPrivate, userId: U }); h.data['events.list'] = [intimate]; h.ui.edit = false; h.run('openEditModal')(intimate); expect(h.ui.edit).toBe(true); expect(h.ui.selected).toEqual(intimate); expect(h.eventOpening.current.origin).toBe(h.scopeToken);
    h.ui.edit = false; h.data['events.list'] = []; h.run('openEditModal')(intimate); expect(h.ui.edit).toBe(false);
  });
  it.each([{ isPrivate: 0, userId: U }, { isPrivate: false, userId: U }, { isPrivate: 1, userId: 202 }, { isPrivate: true, userId: 202 }])('autre cercle public ou intime autre auteur %j interdit même présent en query', extra => {
    const h = calendarHarness(), row = event({ familyId: B, ...extra }); h.data['events.list'] = [row]; h.ui.edit = false; h.run('openEditModal')(row); expect(h.ui.edit).toBe(false); expect(h.frames).toEqual([]);
  });
});

describe('Dérivations/effets réels — fresh, fetching, placeholder, restauration et scope', () => {
  const modes = [
    ['fresh', { isSuccess: true, isFetching: false, isPlaceholderData: false, data: [] }, false, true],
    ['fetching', { isSuccess: true, isFetching: true, data: [] }, false, false],
    ['placeholder', { isSuccess: true, isFetching: false, isPlaceholderData: true, data: [] }, false, false],
    ['loading', { isSuccess: false, data: undefined }, false, false],
    ['restoring', { isSuccess: true, isFetching: false, isPlaceholderData: false, data: [] }, true, false],
  ];
  it.each([R, C].flatMap(file => modes.map(mode => [file, ...mode])))('%s sélection %s : ferme seulement absence fresh, aucune action sinon', (file, _mode, query, restoring, absent) => {
    const h = file === R ? requestHarness() : calendarHarness(), isRequest = file === R, queryName = isRequest ? 'requestsQuery' : 'eventsQuery', prefix = isRequest ? 'request' : 'event';
    const b = derived(file, h, h.ui, h.bindings, { [queryName]: query, isRestoring: restoring });
    expect(b[isRequest ? 'selectedRequest' : 'selectedEvent'] === null).toBe(absent); expect(b[`${prefix}Actionable`]).toBe(false);
    const before = structuredClone(h.data); if (isRequest) { compile(R, 'handleReview', { ...b, reviewComment: 'Reason' })('rejected'); compile(R, 'handleDelete', b)(); } else { compile(C, 'handleUpdateEvent', b)(); compile(C, 'handleDeleteEvent', b)(); }
    expect(h.mutations).toEqual([]); expect(h.data).toEqual(before); expect(h.trace).toEqual([]);
    evaluate(file, effect(file, isRequest ? /requestSnapshot && !selectedRequest/ : /eventSnapshot && !selectedEvent/).arguments[0], b)(); expect(isRequest ? h.ui.detail : h.ui.edit).toBe(!absent);
  });
  it.each([R, C])('%s scope disparu neutralise immédiatement snapshot pourtant présent', file => {
    const h = file === R ? requestHarness() : calendarHarness(); h.cleanup(); const b = derived(file, h, h.ui, h.bindings); expect(b[file === R ? 'selectedRequest' : 'selectedEvent']).toBeNull(); expect(b[file === R ? 'requestActionable' : 'eventActionable']).toBe(false);
  });
  it.each([R, C])('%s sélection utilise le statut/objet courant et devient actionnable seulement fresh', file => {
    const h = file === R ? requestHarness() : calendarHarness(), row = file === R ? request({ status: 'rejected', title: 'Fresh' }) : event({ title: 'Fresh' }); h.data[file === R ? 'requests.list' : 'events.list'] = [row]; const b = derived(file, h, h.ui, h.bindings); expect(b[file === R ? 'selectedRequest' : 'selectedEvent']).toBe(h.data[file === R ? 'requests.list' : 'events.list'][0]); expect(b[file === R ? 'requestActionable' : 'eventActionable']).toBe(true);
  });
});

describe('QuickCreate Request — submit réel et origine épinglée', () => {
  it('succès relit request/event et ferme seulement SA modale', async () => {
    const h = quickHarness(), { callback, input, context } = h.action(); h.data['events.list'] = []; h.data['requests.list'] = []; await callback.onSuccess({ requestId: RID }, input, context); expect(h.closed).toHaveBeenCalledTimes(1); expect(h.requestOpening.current).toBeNull(); expect(h.data['events.list'][0].id).toBe(EID); expect(h.data['requests.list'][0].id).toBe(RID); expect(h.alerts).toEqual([]);
  });
  it('onMutate payload exact, jamais clone ou nouvelle ouverture', async () => {
    const h = quickHarness(), m = h.start(), old = h.requestOpening.current; h.requestOpening.current = { origin: h.requestScopeToken, opening: 2 };
    expect(m.input).toEqual(createdInput());
    for (const missing of [{ ...m.input }, undefined, 'old-request']) expect(() => h.callback.onMutate(missing)).toThrow();
    const execution = await queuedMutation(m, () => {}), { context } = execution;
    expect(execution.error).toBeUndefined(); expect(execution.mutationFn).toHaveBeenCalledTimes(1); expect(execution.mutationFn.mock.calls[0][0]).toBe(m.input);
    expect(context).toBe(old); expect(Object.keys(m.input)).not.toContain('origin'); await h.callback.onError(new Error('Old'), m.input, context); expect(h.closed).not.toHaveBeenCalled(); expect(h.alerts).toEqual([]); expect(h.utils.client.events.list.query).toHaveBeenCalled();
  });
  it.each(['unmount', 'circle'])('onMutate queued après %s lève : aucun mutationFn/HTTP ni cache/UI', async mode => {
    const h = quickHarness(), m = h.start(), old = h.requestOpening.current; let before;
    const execution = await queuedMutation(m, () => {
      if (mode === 'unmount') h.cleanup();
      else { const b = h.requestGuard.update(reconciliation.requestCalendarScope(U, B)); h.requestOpening.current = { origin: b, opening: 9 }; }
      h.data['events.list'] = [event({ id: 99, familyId: B })]; before = structuredClone(h.data);
      expect(() => h.callback.onMutate(m.input)).toThrow();
    });
    expect(execution.error).toBeInstanceOf(Error); expect(execution.context).toBeUndefined(); expect(execution.mutationFn).not.toHaveBeenCalled();
    expect(h.bindings.requestActionOrigins.get(m.input)).toBe(old); expect(old.origin.familyId).toBe(A);
    expect(h.data).toEqual(before); expect(h.trace).toEqual([]); expect(h.closed).not.toHaveBeenCalled(); expect(h.alerts).toEqual([]);
  });
  it('contexte capturé avant cleanup : succès/erreur tardifs ignorés même après nouvelle ouverture B', async () => {
    const h = quickHarness(), { input, context } = h.action(); h.cleanup();
    const b = h.requestGuard.update(reconciliation.requestCalendarScope(U, B)); h.requestOpening.current = { origin: b, opening: 9 };
    h.data['events.list'] = [event({ id: 99, familyId: B })]; const before = structuredClone(h.data);
    await h.callback.onSuccess({ requestId: RID }, input, context); await h.callback.onError(new Error('Old'), input, context);
    expect(h.data).toEqual(before); expect(h.trace).toEqual([]); expect(h.closed).not.toHaveBeenCalled(); expect(h.alerts).toEqual([]);
  });
  it.each([false, true])('erreur avant/après write=%s : relecture, jamais faux succès', async applied => {
    const h = quickHarness(), { callback, input, context } = h.action(); h.data['requests.list'] = []; h.data['events.list'] = []; if (!applied) { h.server['requests.list'] = []; h.server['events.list'] = []; }
    await callback.onError(new Error('Network fixture'), input, context); expect(h.closed).not.toHaveBeenCalled(); expect(h.alerts[0][0]).toBe('common.error'); expect(h.data['events.list']).toHaveLength(applied ? 1 : 0); expect(h.data['requests.list']).toHaveLength(applied ? 1 : 0);
  });
  it('submit déjà capturé puis cleanup A interdit mutate ; date et pending gardés', () => {
    const h = quickHarness(), submit = h.run(); h.run({ requestDate: undefined })(); expect(h.mutations).toEqual([]); h.run({ createRequest: { mutate: h.bindings.createRequest.mutate, isPending: true } })(); expect(h.mutations).toEqual([]); submit(); expect(h.mutations[0].input.title).toBe('Fixture'); h.cleanup(); submit(); expect(h.mutations).toHaveLength(1);
  });
});

describe('Destinataire réel App — montage, notices, foreground et reconnexion', () => {
  it('RequestCalendarReception réellement rendu auprès du navigateur authentifié', () => {
    const mounts = collect(sources[APP], node => (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && text(APP, node.tagName) === 'RequestCalendarReception'); expect(mounts).toHaveLength(1); expect(text(APP, mounts[0].parent)).toContain('AppNavigator');
  });
  it('entrée initiale, notice/tap/legacy url : six inputs ciblés ; Note/cercle B ignorés', async () => {
    const h = receptionHarness(); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(1); h.runReconcile.mockClear();
    h.listeners.received(received({ type: 'request_rejected', familyId: B })); h.listeners.received(received({ type: 'note_created', familyId: A })); await flush(); expect(h.runReconcile).not.toHaveBeenCalled();
    h.listeners.received(received({ type: 'request_rejected', familyId: A })); await flush(); h.listeners.response({ notification: received({ actionUrl: '/requests', familyId: A }) }); await flush(); h.listeners.received(received({ url: '/requests?requestId=10' })); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(3);
    expect(h.utils.client.events.list.query).toHaveBeenCalledWith(undefined); expect(h.utils.client.requests.list.query).toHaveBeenCalledWith({ familyId: A }); h.cleanup();
  });
  it('foreground et reconnect : active→active/offline ignorés, garde onlineManager réelle', async () => {
    const h = receptionHarness(); await flush(); h.runReconcile.mockClear(); h.listeners.foreground('active'); await flush(); expect(h.runReconcile).not.toHaveBeenCalled();
    h.listeners.foreground('background'); h.listeners.foreground('active'); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(1);
    h.online.current = false; h.listeners.received(received({ type: 'request_created' })); h.listeners.reconnect(true); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(1);
    h.online.current = true; h.connectionRef.current = false; h.listeners.reconnect(true); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(1);
    h.connectionRef.current = true; h.listeners.reconnect(true); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(2); h.listeners.reconnect(false); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(2); h.cleanup();
  });
  it('callback reconnect avant rendu OfflineContext : effet dépend isConnected et relecture au rendu', async () => {
    const h = receptionHarness({ connected: false, online: false }); await flush(); expect(h.runReconcile).not.toHaveBeenCalled(); h.online.current = true; h.listeners.reconnect(true); await flush(); expect(h.runReconcile).not.toHaveBeenCalled();
    expect(text(APP, h.listenerEffect.arguments[1])).toMatch(/\bisConnected\b/); h.connectionRef.current = true; h.restart(); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(1); h.cleanup();
  });
  it('cleanup réel : anciens listeners ignorés, abonnements tous retirés', async () => {
    const h = receptionHarness(); await flush(); h.runReconcile.mockClear(); h.cleanup(); h.listeners.received(received({ type: 'request_rejected', familyId: A })); h.listeners.response({ notification: received({ actionUrl: '/requests' }) }); h.listeners.foreground('background'); h.listeners.foreground('active'); h.listeners.reconnect(true); await flush(); expect(h.runReconcile).not.toHaveBeenCalled(); expect(h.removals.sort()).toEqual(['foreground', 'received', 'reconnect', 'response']);
  });
  it('relecture raw destinataire en vol puis unmount : aucune écriture tardive dans B', async () => {
    const gate = deferred(), h = receptionHarness(); h.utils.client.events.list.query.mockReturnValue(gate.promise); await flush();
    expect(h.utils.client.events.list.query).toHaveBeenCalledTimes(1); h.cleanup(); h.data['events.list'] = [event({ id: 99, familyId: B })]; const count = h.trace.filter(([op]) => op === 'set').length;
    gate.resolve([]); await flush(); expect(h.data['events.list'][0].id).toBe(99); expect(h.trace.filter(([op]) => op === 'set')).toHaveLength(count);
  });
  it('rafale notices pendant refresh : un seul refresh en vol, une reprise groupée', async () => {
    const gate = deferred(), h = receptionHarness({ reconcile: vi.fn().mockImplementationOnce(() => gate.promise).mockResolvedValue({ skipped: false, failed: [] }) }); h.listeners.received(received({ type: 'request_created' })); h.listeners.received(received({ type: 'request_rejected' })); h.listeners.reconnect(true); expect(h.runReconcile).toHaveBeenCalledTimes(1); gate.resolve({ skipped: false, failed: [] }); await flush(); expect(h.runReconcile).toHaveBeenCalledTimes(2); h.cleanup();
  });
});

describe('Remontage même cercle et restauration — instances indépendantes', () => {
  it.each(['handleReview', 'handleDelete', 'handleSendComment', 'handleCreate'])('ancien Requests %s après unmount A ne touche pas nouvelle instance A ouverte', async name => {
    const old = requestHarness(), handler = old.run(name); old.cleanup(); const fresh = requestHarness(); fresh.data['requests.list'] = [request({ id: 11 })]; fresh.server['requests.list'] = structuredClone(fresh.data['requests.list']); fresh.run('handleOpenDetail')(request({ id: 11 })); fresh.bindings.openCreate();
    const before = structuredClone(fresh.data), traceCount = fresh.trace.length, alerts = fresh.ui.alerts.length; handler('rejected'); expect(old.mutations).toEqual([]); expect(fresh.mutations).toEqual([]); expect(fresh.data).toEqual(before); expect(fresh.trace).toHaveLength(traceCount); expect(fresh.ui.alerts).toHaveLength(alerts); expect(fresh.ui.detail).toBe(true); expect(fresh.ui.create).toBe(true);
    await flush();
  });
  it.each(['handleUpdateEvent', 'handleDeleteEvent'])('ancien Calendar %s après unmount A ignore nouveau Calendar A ouvert', async name => {
    const old = calendarHarness(), handler = old.run(name); old.cleanup(); const fresh = calendarHarness(); fresh.run('openEditModal')(event()); const before = structuredClone(fresh.data); await handler(); expect(old.mutations).toEqual([]); expect(fresh.mutations).toEqual([]); expect(fresh.data).toEqual(before); expect(fresh.ui.edit).toBe(true);
  });
  it('ancien QuickCreate submit après unmount A ignore nouvelle modale A', () => {
    const old = quickHarness(), submit = old.run(); old.cleanup(); const fresh = quickHarness(); submit(); expect(old.mutations).toEqual([]); expect(fresh.mutations).toEqual([]); expect(fresh.closed).not.toHaveBeenCalled(); expect(fresh.requestOpening.current.origin).toBe(fresh.requestScopeToken);
  });
  it.each([R, C])('%s isRestoring=true avec row query présente : objet conservé, action/cache interdits', async file => {
    const h = file === R ? requestHarness() : calendarHarness(), b = derived(file, h, h.ui, h.bindings, { isRestoring: true }), before = structuredClone(h.data);
    expect(b[file === R ? 'selectedRequest' : 'selectedEvent']).not.toBeNull(); expect(b[file === R ? 'requestActionable' : 'eventActionable']).toBe(false);
    if (file === R) { compile(R, 'handleReview', { ...b, reviewComment: 'Reason' })('rejected'); compile(R, 'handleDelete', b)(); }
    else { await compile(C, 'handleUpdateEvent', b)(); compile(C, 'handleDeleteEvent', b)(); }
    expect(h.data).toEqual(before); expect(h.trace).toEqual([]); expect(h.mutations).toEqual([]);
  });
});
