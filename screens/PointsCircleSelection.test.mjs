import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCReact, getQueryKey } from '@trpc/react-query';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const parse = source => ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const select = (root, predicate) => {
  if (predicate(root)) return root;
  let result;
  root.forEachChild(child => { if (!result) result = select(child, predicate); });
  return result;
};
const find = (source, predicate) => {
  const root = parse(source);
  const node = select(root, node => predicate(node, root));
  if (!node) throw new Error('Required source callback not found');
  return { node, root };
};
const evaluate = (expression, context) => {
  const output = ts.transpileModule(`module.exports = (${expression});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { ...context, module });
  return module.exports;
};
const initializer = (source, name) => {
  const { node, root } = find(source, node => ts.isVariableDeclaration(node) && node.name.getText() === name);
  return { value: node.initializer, root };
};
const wait = () => new Promise(resolve => setTimeout(resolve, 0));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const storage = initial => {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    multiSet: async entries => { entries.forEach(([key, value]) => values.set(key, value)); },
    removeItem: async key => { values.delete(key); },
    multiRemove: async keys => { keys.forEach(key => values.delete(key)); },
  };
};
const realTrpc = createTRPCReact();
const historyKey = familyId => getQueryKey(realTrpc.rewards.myEarnedRewards, { familyId }, 'query');

for (const lineEndings of ['LF', 'CRLF']) {
  const source = path => lineEndings === 'LF' ? read(path).replace(/\r\n/g, '\n') : read(path).replace(/\r?\n/g, '\r\n');
  describe(`Points — sélection et barrières existantes (${lineEndings})`, () => {
    it('créer C via Cercles ne le sélectionne pas automatiquement ; la demande conserve le nom saisi', () => {
      const memberSource = source('./MembersScreen.tsx');
      const { value, root } = initializer(memberSource, 'createFamilyMutation');
      const events = [];
      const options = evaluate(value.arguments[0].getText(root), {
        utils: { family: { list: { invalidate: () => events.push('list') } } },
        setShowNewCircleModal: value => events.push(['modal', value]),
        setNewCircleName: value => events.push(['name', value]),
        setActiveFamilyId: id => events.push(['selection', id]),
        Alert: { alert: () => events.push('alert') },
      });
      options.onSuccess({ familyId: 33 });
      expect(events).toEqual(['list', ['modal', false], ['name', ''], 'alert']);
      const button = find(memberSource, (node, root) => ts.isJsxAttribute(node) && node.name.getText() === 'onPress'
        && node.getText(root).includes('createFamilyMutation.mutate'));
      const submit = evaluate(button.node.initializer.expression.getText(button.root), {
        newCircleName: '  Cercle C  ', createFamilyMutation: { mutate: input => events.push(input) },
      });
      submit();
      expect(events.at(-1)).toEqual({ name: 'Cercle C' });
    });

    it('sélectionner explicitement C attend l’écriture compte+cercle/en-tête avant invalidation', async () => {
      const events = [];
      const AsyncStorage = storage({ active_family_id_7: '11', active_family_id: '11' });
      const write = deferred();
      const originalMultiSet = AsyncStorage.multiSet;
      AsyncStorage.multiSet = async entries => { events.push('writing'); await write.promise; await originalMultiSet(entries); };
      const familySource = source('../contexts/FamilyContext.tsx');
      const { value, root } = initializer(familySource, 'setActiveFamilyId');
      let activeFamilyId = 11;
      const setActiveFamilyId = evaluate(value.arguments[0].getText(root), {
        AsyncStorage, storageKey: 'active_family_id_7',
        ACTIVE_FAMILY_HEADER_KEY: 'active_family_id',
        setIsReady: ready => events.push(['ready', ready]),
        setActiveFamilyIdState: id => { activeFamilyId = id; events.push(['active', id]); },
      });
      const dashboard = source('./DashboardScreen.tsx');
      const button = find(dashboard, (node, root) => ts.isJsxAttribute(node) && node.name.getText() === 'onPress'
        && node.getText(root).includes('await setActiveFamilyId(fam.id)'));
      const click = evaluate(button.node.initializer.expression.getText(button.root), {
        activeFamilyId, fam: { id: 33 }, setActiveFamilyId,
        beginCircleTransition: () => events.push('transition'),
        setCirclePickerOpen: value => events.push(['picker', value]),
        queryClient: { invalidateQueries: () => events.push(['invalidate', activeFamilyId, AsyncStorage.values.get('active_family_id')]) },
      });
      const selected = click();
      expect(activeFamilyId).toBe(11);
      expect(events).not.toContainEqual(['invalidate', 33, '33']);
      write.resolve(); await selected;
      expect(activeFamilyId).toBe(33);
      expect(AsyncStorage.values.get('active_family_id_7')).toBe('33');
      expect(AsyncStorage.values.get('active_family_id')).toBe('33');
      expect(events.at(-1)).toEqual(['invalidate', 33, '33']);
    });

    it('le transport relit le nouvel en-tête actif à chaque envoi ; API fixe et fallback inchangés', async () => {
      const AsyncStorage = storage({ authToken: 'fixture-only', active_family_id: '11', '@fri2plan_language': 'fr' });
      let batchOptions;
      const api = 'https://fri2plan-server-production-f184.up.railway.app/api/trpc';
      const modules = {
        '@trpc/react-query': { createTRPCReact: () => ({ createClient: opts => opts }) },
        '@trpc/client': { httpBatchLink: options => { batchOptions = options; return options; } },
        superjson: { default: {} },
        '@react-native-async-storage/async-storage': { default: AsyncStorage },
        'expo-localization': { getLocales: () => [{ languageCode: 'fr' }] },
        './apiConfig': { API_URL: api },
      };
      const module = { exports: {} };
      const output = ts.transpileModule(source('../lib/trpc.ts'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      vm.runInNewContext(output, { module, exports: module.exports, require: path => modules[path], fetch: () => { throw new Error('Network forbidden'); }, console });
      module.exports.createTRPCClient();
      expect(batchOptions.url).toBe(api);
      expect((await batchOptions.headers())['x-active-family-id']).toBe('11');
      await AsyncStorage.setItem('active_family_id', '33');
      expect((await batchOptions.headers())['x-active-family-id']).toBe('33');
      const fallback = evaluate(source('../lib/apiConfig.ts').replace('export const API_URL =', '').trim().replace(/;$/, ''), { process: { env: {} } });
      expect(fallback).toBe('https://app.fri2plan.ch/api/trpc');
    });

    it('le cache familial est conservé dans le même scope, purgé avant rendu pour C et un autre compte', async () => {
      const AsyncStorage = storage({ '@fri2plan:query_cache_family_scope': '7:11' });
      const queryClient = new QueryClient();
      const app = source('../App.tsx');
      const gate = find(app, node => ts.isFunctionDeclaration(node) && node.name?.text === 'FamilyCacheScopeGate');
      let userId = 7;
      let familyId = 11;
      let cleanup;
      const readyEvents = [];
      const run = evaluate(gate.node.getText(gate.root), {
        AsyncStorage, queryClient, FAMILY_CACHE_SCOPE_KEY: '@fri2plan:query_cache_family_scope',
        useAuth: () => ({ isAuthenticated: true, user: { id: userId } }),
        useFamily: () => ({ activeFamilyId: familyId, isReady: true }),
        useEffect: effect => { cleanup?.(); cleanup = effect(); },
      });
      queryClient.setQueryData(historyKey(11), [{ rewardName: 'A' }]);
      const onReady = ready => readyEvents.push({ ready, cacheA: queryClient.getQueryData(historyKey(11)) });
      run({ onReady }); await wait();
      expect(queryClient.getQueryData(historyKey(11))).toEqual([{ rewardName: 'A' }]);
      familyId = 33; run({ onReady }); await wait();
      expect(AsyncStorage.values.get('@fri2plan:query_cache_family_scope')).toBe('7:33');
      expect(readyEvents.at(-1)).toEqual({ ready: true, cacheA: undefined });
      queryClient.setQueryData(historyKey(33), [{ rewardName: 'Compte 7 C' }]);
      userId = 8; run({ onReady }); await wait();
      expect(queryClient.getQueryData(historyKey(33))).toBeUndefined();
      expect(AsyncStorage.values.get('@fri2plan:query_cache_family_scope')).toBe('8:33');
    });

    it('l’ancien cache compte reste utile au même propriétaire, jamais à un autre', async () => {
      const app = source('../App.tsx');
      const ownerEffect = find(app, (node, root) => ts.isCallExpression(node) && node.expression.getText(root) === 'useEffect'
        && node.arguments[0]?.getText(root).includes('const cachedOwnerId'));
      const AsyncStorage = storage({ '@fri2plan:query_cache_owner': '7' });
      const queryClient = new QueryClient();
      queryClient.setQueryData(historyKey(11), [{ rewardName: 'Cache validé' }]);
      const run = userId => evaluate(ownerEffect.node.arguments[0].getText(ownerEffect.root), {
        AsyncStorage, queryClient, QUERY_CACHE_OWNER_KEY: '@fri2plan:query_cache_owner',
        isAuthenticated: true, isLoading: false, user: { id: userId }, setSessionCacheReady: () => {},
      })();
      run(7); await wait();
      expect(queryClient.getQueryData(historyKey(11))).toEqual([{ rewardName: 'Cache validé' }]);
      run(8); await wait();
      expect(queryClient.getQueryData(historyKey(11))).toBeUndefined();
      expect(AsyncStorage.values.get('@fri2plan:query_cache_owner')).toBe('8');
    });
  });
}
