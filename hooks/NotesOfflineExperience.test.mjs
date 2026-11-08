import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const queueSource = read('./useOfflineQueue.ts');
const executorSource = read('./useOfflineExecutor.ts');
const load = (source, dependencies = {}) => {
  const module = { exports: {} };
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    console: { log() {}, warn() {} },
  });
  return module.exports;
};
const scopeHelpers = load(read('../lib/noteScope.ts'));
const A = scopeHelpers.noteScope(101, 701);
const B = scopeHelpers.noteScope(101, 702);
const action = (type = 'note.create') => ({ type, scope: A, payload: { familyId: 701, noteId: 9, title: 'Synthetic' } });

function hooks() {
  let index = 0;
  const values = [];
  const effects = [];
  return {
    react: {
      useRef: value => {
        const slot = index++;
        return values[slot] ??= { current: value };
      },
      useState: initial => {
        const slot = index++;
        if (!(slot in values)) values[slot] = initial;
        return [values[slot], value => { values[slot] = value; }];
      },
      useCallback: callback => callback,
      useEffect: effect => { effects.push(effect); },
    },
    render: callback => { index = 0; const result = callback(); effects.splice(0).forEach(effect => effect()); return result; },
  };
}
function queueHarness(initial = []) {
  let persisted = JSON.stringify(initial);
  let failSave = false;
  const hook = hooks();
  const storage = {
    getItem: async () => persisted,
    setItem: async (_key, value) => { if (failSave) throw new Error('storage unavailable'); persisted = value; },
    removeItem: async () => { persisted = null; },
  };
  const { useOfflineQueue } = load(queueSource, {
    react: hook.react,
    '@react-native-async-storage/async-storage': { default: storage },
    '../lib/noteScope': scopeHelpers,
  });
  const queue = hook.render(useOfflineQueue);
  return { queue, saved: () => JSON.parse(persisted ?? '[]'), fail: () => { failSave = true; } };
}
const item = (id, action, retries = 0) => ({ id, action, retries, timestamp: 1 });

describe('Notes — hook réel de queue hors ligne (stockage/hooks simulés)', () => {
  it('capture et gèle une copie origine/payload sans réattribution après mutation appelant', async () => {
    const h = queueHarness();
    const input = { type: 'note.create', scope: { ...A }, payload: { familyId: 701, title: 'Synthetic' } };
    await h.queue.enqueue(input);
    input.scope.familyId = 702;
    input.payload.familyId = 702;
    input.payload.title = 'Changed';
    let replayed;
    await h.queue.processQueue(async a => { replayed = a; });
    expect(replayed.scope).toEqual(A);
    expect(replayed.payload).toEqual({ familyId: 701, title: 'Synthetic' });
    expect(Object.isFrozen(replayed.scope)).toBe(true);
    expect(Object.isFrozen(replayed.payload)).toBe(true);
    expect(h.saved()).toEqual([]);
  });

  it('refuse les nouvelles Notes sans scope ou incohérentes et signale échec durable', async () => {
    const h = queueHarness();
    await expect(h.queue.enqueue({ type: 'note.create', payload: { title: 'Synthetic' } })).rejects.toThrow('explicit immutable');
    await expect(h.queue.enqueue({ ...action(), payload: { familyId: 702 } })).rejects.toThrow('explicit immutable');
    expect(h.saved()).toEqual([]);
    h.fail();
    await expect(h.queue.enqueue(action())).rejects.toThrow('storage unavailable');
    expect(h.saved()).toEqual([]);
  });

  it('conserve legacy/denied Notes sans drop ni retry et poursuit les autres types', async () => {
    const legacy = item('legacy', { type: 'note.delete', payload: { noteId: 9 } }, 99);
    const denied = item('denied', action('note.update'), 99);
    const task = item('task', { type: 'task.create', payload: { title: 'Synthetic' } });
    const shopping = item('shopping', { type: 'shopping.addItem', payload: {} }, 3);
    const message = item('message', { type: 'message.send', payload: {} });
    const h = queueHarness([legacy, denied, task, shopping, message]);
    await new Promise(setImmediate);
    const visited = [];
    await h.queue.processQueue(async a => {
      visited.push(a.type);
      if (a.type !== 'message.send') throw new Error('blocked');
    });
    expect(visited).toEqual(['note.delete', 'note.update', 'task.create', 'shopping.addItem', 'message.send']);
    expect(h.saved()).toEqual([legacy, denied, { ...task, retries: 1 }]);
  });

  it('conserve une Note ajoutée pendant replay sans ressusciter celles vidées au logout', async () => {
    const h = queueHarness([item('first', action())]);
    await new Promise(setImmediate);
    let release;
    const processing = h.queue.processQueue(() => new Promise(resolve => { release = resolve; }));
    await h.queue.enqueue(action('note.update'));
    release();
    await processing;
    expect(h.saved().map(i => i.action.type)).toEqual(['note.update']);
    let reject;
    const next = h.queue.processQueue(() => new Promise((_resolve, fail) => { reject = fail; }));
    await h.queue.clearQueue();
    reject(new Error('late denied'));
    await next;
    expect(h.saved()).toEqual([]);
  });
});

function executorHarness() {
  const hook = hooks();
  const calls = [];
  const invalidations = [];
  const alerts = [];
  const context = { user: { id: 101 }, family: { activeFamilyId: 701, isReady: true, isCircleTransitioning: false } };
  let executor;
  const mutation = name => ({ useMutation: () => ({ mutateAsync: async payload => { calls.push([name, payload]); } }) });
  const trpc = {};
  for (const [router, names] of Object.entries({ tasks: ['create', 'update', 'delete', 'complete'],
    shopping: ['addItem', 'toggleItem', 'deleteItem'], notes: ['create', 'update', 'delete'], messages: ['create'] })) {
    trpc[router] = Object.fromEntries(names.map(name => [name, mutation(`${router}.${name}`)]));
  }
  const { useOfflineExecutor } = load(executorSource, {
    react: hook.react,
    'react-native': { Alert: { alert: (...args) => alerts.push(args) } },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: input => { invalidations.push(input); } }) },
    '../contexts/AuthContext': { useAuth: () => ({ user: context.user }) },
    '../contexts/FamilyContext': { useFamily: () => context.family },
    '../contexts/OfflineContext': { useOffline: () => ({ registerExecutor: e => { executor = e; } }) },
    '../lib/trpc': { trpc },
    '../lib/noteScope': scopeHelpers,
  });
  const render = () => hook.render(useOfflineExecutor);
  render();
  return { context, render, execute: a => executor(a), calls, invalidations, alerts };
}

describe('Notes — hook réel de replay (mutations/hooks simulés)', () => {
  it('bloque legacy/cercle/compte/transition puis exécute chaque Notes exact avec invalidation origine', async () => {
    const h = executorHarness();
    await expect(h.execute({ type: 'note.delete', payload: { noteId: 9 } })).rejects.toThrow('offlineLegacyBlocked');
    h.context.family.activeFamilyId = B.familyId; h.render();
    await expect(h.execute(action())).rejects.toThrow('offlineScopeBlocked');
    h.context.family.activeFamilyId = A.familyId; h.context.user = { id: 202 }; h.render();
    await expect(h.execute(action())).rejects.toThrow('offlineScopeBlocked');
    h.context.user = { id: 101 }; h.context.family.isCircleTransitioning = true; h.render();
    await expect(h.execute(action())).rejects.toThrow('offlineScopeBlocked');
    expect(h.calls).toEqual([]);
    h.context.family.isCircleTransitioning = false; h.render();
    for (const type of ['note.create', 'note.update', 'note.delete']) await h.execute(action(type));
    expect(h.calls.map(([name]) => name)).toEqual(['notes.create', 'notes.update', 'notes.delete']);
    expect(h.invalidations).toEqual(Array(3).fill({ queryKey: scopeHelpers.noteListKey(A), exact: true }));
  });

  it('scope Notes indisponible ne bloque aucune mutation des autres types ni ne change payload', async () => {
    const h = executorHarness();
    h.context.user = null; h.context.family.isReady = false; h.render();
    const mapping = {
      'task.create': 'tasks.create', 'task.update': 'tasks.update', 'task.delete': 'tasks.delete', 'task.complete': 'tasks.complete',
      'shopping.addItem': 'shopping.addItem', 'shopping.toggleItem': 'shopping.toggleItem',
      'shopping.deleteItem': 'shopping.deleteItem', 'message.send': 'messages.create',
    };
    for (const type of Object.keys(mapping)) await h.execute({ type, payload: { synthetic: type } });
    expect(h.calls).toEqual(Object.entries(mapping).map(([type, name]) => [name, { synthetic: type }]));
    expect(h.invalidations).toEqual([]);
    expect(h.alerts).toEqual([]);
  });
});
