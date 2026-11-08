import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
import { MutationObserver } from '@tanstack/query-core';
import { createTRPCReact, createTRPCClient, createTRPCQueryUtils, getQueryKey } from '@trpc/react-query';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('./RewardsScreen.tsx');
const realTrpc = createTRPCReact();
const procedure = path => path.split('.').reduce((value, key) => value[key], realTrpc);
const keyFor = (path, input) => getQueryKey(procedure(path), input, 'query');
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

// Execute the actual screen/hooks and actual tRPC key builder/React Query cache.
// Native rendering and transport are stubbed: no device, login or network request.
function screenHarness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const realUtils = createTRPCQueryUtils({ queryClient, client: createTRPCClient({ links: [] }) });
  let family = { activeFamilyId: 11, isReady: true, isCircleTransitioning: false };
  let user = { id: 7, familyRole: 'admin' };
  let cursor = 0;
  const slots = [];
  const queries = [];
  const invalidations = [];
  const alerts = [];
  const mutations = new Map();
  const cleanups = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
    useState(initial) {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useMemo: fn => fn(),
    useRef(initial) {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
    useEffect(effect) {
      const slot = cursor++;
      if (!(slot in slots)) { slots[slot] = true; cleanups.push(effect()); }
    },
  };
  const utils = new Proxy({}, {
    get: (_target, router) => new Proxy({}, {
      get: (_target, method) => ({ invalidate(input) {
        const path = `${String(router)}.${String(method)}`;
        invalidations.push({ path, input });
        return realUtils[router][method].invalidate(input);
      } }),
    }),
  });
  const trpc = new Proxy({}, {
    get: (_target, router) => router === 'useUtils' ? () => utils : new Proxy({}, {
      get: (_target, method) => {
        const path = `${String(router)}.${String(method)}`;
        return {
          useQuery(input, opts = {}) {
            queries.push({ path, input, opts, key: keyFor(path, input) });
            return { data: queryClient.getQueryData(keyFor(path, input)), isLoading: false };
          },
          useMutation(opts) {
            if (!mutations.has(path)) {
              const entry = { resolve: null };
              entry.observer = new MutationObserver(queryClient, {
                ...opts, mutationFn: () => new Promise(resolve => { entry.resolve = resolve; }),
              });
              mutations.set(path, entry);
            }
            const entry = mutations.get(path);
            entry.observer.setOptions({ ...opts, mutationFn: () => new Promise(resolve => { entry.resolve = resolve; }) });
            return { mutate: input => entry.observer.mutate(input), isLoading: false };
          },
        };
      },
    }),
  });
  const native = new Proxy({
    StyleSheet: { create: value => value, absoluteFillObject: {} },
    Alert: { alert: (...args) => alerts.push(args) }, Platform: { OS: 'ios' },
  }, { get: (target, name) => target[name] ?? String(name) });
  const modules = {
    react, 'react-native': native, 'expo-status-bar': { StatusBar: 'StatusBar' },
    '../contexts/AuthContext': { useAuth: () => ({ user }) },
    '../contexts/ThemeContext': { useTheme: () => ({ isDark: false }) },
    '../contexts/FamilyContext': { useFamily: () => family },
    '../contexts/SubscriptionContext': { useSubscription: () => ({ hasPremium: true }) },
    '../lib/trpc': { trpc }, 'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'fr' } }) },
    '../components/PremiumOverlay': { default: 'PremiumOverlay' },
  };
  const module = { exports: {} };
  vm.runInNewContext(compile(source), { module, exports: module.exports, require: path => modules[path] ?? require(path) });
  const render = () => { cursor = 0; queries.length = 0; return module.exports.default({}); };
  const seed = (path, input, data) => queryClient.setQueryData(keyFor(path, input), data);
  return {
    render, seed, queries, invalidations, alerts, queryClient,
    switchFamily: id => { family = { ...family, activeFamilyId: id }; },
    readiness: (isReady, isCircleTransitioning = false) => { family = { ...family, isReady, isCircleTransitioning }; },
    switchAccount: id => { user = { ...user, id }; },
    unmount: () => cleanups.forEach(fn => fn?.()),
    async start(path, input) {
      const entry = mutations.get(path);
      const completion = entry.observer.mutate(input);
      while (!entry.resolve) await new Promise(resolve => setTimeout(resolve, 0));
      return { finish: async () => { entry.resolve({ success: true }); await completion; } };
    },
  };
}
const text = tree => !tree || typeof tree !== 'object' ? String(tree ?? '') : tree.children.map(text).join(' ');
const find = (tree, predicate) => {
  if (!tree || typeof tree !== 'object') return undefined;
  if (predicate(tree)) return tree;
  return tree.children.map(child => find(child, predicate)).find(Boolean);
};
const histories = ['rewards.myEarnedRewards', 'rewardClaims.listByUser'];

function historyTree(h) {
  const tree = h.render();
  find(tree, item => item.type === 'TouchableOpacity' && text(item).includes('rewards.tabHistory')).props.onPress();
  return h.render();
}

describe('Points — historiques et mutations du cercle actif', () => {
  it('utilise les vraies clés tRPC distinctes A/C et ignore les anciens historiques sans entrée', () => {
    const h = screenHarness();
    h.seed('rewards.myEarnedRewards', undefined, [{ id: 1, pointsEarned: -150, rewardName: 'Ancien global', earnedAt: '2026-11-01' }]);
    h.seed('rewards.myEarnedRewards', { familyId: 11 }, [{ id: 2, pointsEarned: -10, rewardName: 'Récompense A', earnedAt: '2026-11-01' }]);
    h.seed('rewards.myEarnedRewards', { familyId: 33 }, []);
    h.seed('rewards.myPoints', { familyId: 11 }, { totalPoints: 20 });
    h.seed('rewards.myPoints', { familyId: 33 }, { totalPoints: 0 });
    const a = historyTree(h);
    expect(text(a)).toContain('Récompense A');
    expect(text(a)).not.toContain('Ancien global');
    for (const path of histories) expect(h.queries.find(q => q.path === path).input).toEqual({ familyId: 11 });
    const keysA = histories.map(path => h.queries.find(q => q.path === path).key);
    h.switchFamily(33);
    const c = h.render();
    expect(text(c)).not.toContain('Récompense A');
    expect(text(c)).toContain('0');
    for (const [index, path] of histories.entries()) {
      const query = h.queries.find(q => q.path === path);
      expect(query.input).toEqual({ familyId: 33 });
      expect(query.opts.enabled).toBe(true);
      expect(query.key).not.toEqual(keysA[index]);
    }
    for (const path of ['rewards.myPoints', 'rewards.familyPoints', 'rewards.list', 'rewardClaims.listPending']) {
      expect(h.queries.find(q => q.path === path).input).toEqual({ familyId: 33 });
    }
    h.switchFamily(11);
    expect(text(h.render())).toContain('Récompense A');
    // Migration de clé seulement : l’ancienne entrée n’est ni transférée ni supprimée ici.
    expect(h.queryClient.getQueryData(keyFor('rewards.myEarnedRewards', undefined))[0].pointsEarned).toBe(-150);
  });

  it('désactive les historiques sans cercle positif/restauré, sans fallback families[0]', () => {
    const h = screenHarness();
    h.seed('family.list', undefined, [{ id: 11 }]);
    for (const id of [null, 0, -1]) {
      h.switchFamily(id); h.render();
      for (const path of histories) {
        const query = h.queries.find(q => q.path === path);
        expect(query.input).toEqual({ familyId: id ?? 0 });
        expect(query.opts.enabled).toBe(false);
      }
    }
    h.switchFamily(11);
    for (const ready of [[false, false], [true, true]]) {
      h.readiness(...ready); h.render();
      for (const path of histories) expect(h.queries.find(q => q.path === path).opts.enabled).toBe(false);
    }
  });

  it('garde solde/classement/catalogue/pending familiaux et badges/statistiques personnels', () => {
    const h = screenHarness(); h.render();
    for (const path of ['rewards.myPoints', 'rewards.familyPoints', 'rewards.list', 'rewardClaims.listPending']) {
      expect(h.queries.find(q => q.path === path).input).toEqual({ familyId: 11 });
    }
    for (const path of ['badges.myBadges', 'tasks.statistics']) expect(h.queries.find(q => q.path === path).input).toBeUndefined();
  });

  it('affiche encore une réponse serveur négative et ses écritures, sans clamp/reset local', () => {
    const h = screenHarness();
    h.seed('rewards.myPoints', { familyId: 11 }, { totalPoints: -150 });
    h.seed('rewards.myEarnedRewards', { familyId: 11 }, [{ id: 2, pointsEarned: -150, rewardName: 'Débit conservé', earnedAt: '2026-11-01' }]);
    const rendered = text(historyTree(h));
    expect(rendered.match(/-150/g)).toHaveLength(2);
    expect(rendered).toContain('Débit conservé');
  });

  for (const [path, variables, expected] of [
    ['rewardClaims.claim', { rewardId: 100, familyId: 11 }, ['rewardClaims.listByUser', 'rewardClaims.listPending', 'rewards.list']],
    ['rewardClaims.approve', { claimId: 101 }, ['rewardClaims.listPending', 'rewardClaims.listByUser', 'rewards.familyPoints', 'rewards.myPoints', 'rewards.list', 'rewards.myEarnedRewards']],
    ['rewardClaims.reject', { claimId: 101 }, ['rewardClaims.listPending', 'rewardClaims.listByUser']],
    ['rewards.create', { name: 'Récompense', pointsCost: 10 }, ['rewards.list']],
    ['rewards.delete', { rewardId: 100 }, ['rewards.list']],
  ]) {
    it(`${path} invalide A, jamais C, si la sélection change pendant la réponse`, async () => {
      const h = screenHarness(); h.render();
      for (const method of expected) {
        h.seed(method, { familyId: 11 }, []); h.seed(method, { familyId: 33 }, []); h.seed(method, undefined, []);
      }
      const pending = await h.start(path, variables);
      h.switchFamily(33); h.render();
      await pending.finish();
      expect(h.invalidations.filter(item => item.path !== 'badges.myBadges')).toEqual(expected.map(path => ({ path, input: { familyId: 11 } })));
      for (const method of expected) {
        expect(h.queryClient.getQueryState(keyFor(method, { familyId: 11 })).isInvalidated).toBe(true);
        expect(h.queryClient.getQueryState(keyFor(method, { familyId: 33 })).isInvalidated).toBe(false);
        expect(h.queryClient.getQueryState(keyFor(method, undefined)).isInvalidated).toBe(false);
      }
      expect(h.alerts).toHaveLength(0);
      if (path === 'rewardClaims.approve') expect(h.invalidations.find(item => item.path === 'badges.myBadges').input).toBeUndefined();
    });
  }

  it('ignore un succès de l’ancien compte dans le nouveau compte, et après unmount', async () => {
    for (const stop of ['account', 'unmount']) {
      const h = screenHarness(); h.render();
      const pending = await h.start('rewardClaims.approve', { claimId: 101 });
      if (stop === 'account') { h.switchAccount(8); h.render(); } else h.unmount();
      await pending.finish();
      expect(h.invalidations).toEqual([]);
      expect(h.alerts).toEqual([]);
    }
  });

  it('refresh cible seulement le cercle affiché et conserve le badge sans scope familial', async () => {
    const h = screenHarness();
    const tree = h.render();
    const scroll = find(tree, item => item.type === 'ScrollView' && item.props.refreshControl);
    await scroll.props.refreshControl.props.onRefresh();
    for (const item of h.invalidations) expect(item.input).toEqual(item.path === 'badges.myBadges' ? undefined : { familyId: 11 });
    for (const path of histories) expect(h.invalidations.some(item => item.path === path)).toBe(true);
  });

  it('un succès resté dans A garde sa confirmation normale', async () => {
    const h = screenHarness(); h.render();
    const pending = await h.start('rewardClaims.approve', { claimId: 101 });
    await pending.finish();
    expect(h.alerts).toHaveLength(1);
    expect(h.alerts[0][1]).toBe('Réclamation approuvée !');
    expect(h.invalidations.find(item => item.path === 'rewards.myEarnedRewards').input).toEqual({ familyId: 11 });
  });

  it('les deux contrats locaux acceptent l’entrée familiale optionnelle, sans rescopage des badges', () => {
    const ast = ts.createSourceFile('types.ts', read('../lib/types.ts'), ts.ScriptTarget.Latest, true);
    const types = ast.statements.find(node => ts.isTypeAliasDeclaration(node) && node.name.text === 'AppRouter');
    const property = (node, name) => node.members.find(member => member.name?.getText(ast) === name).type;
    for (const [router, method] of [['rewards', 'myEarnedRewards'], ['rewardClaims', 'listByUser']]) {
      const endpoint = property(property(types.type, router), method);
      for (const call of ['query', 'useQuery']) {
        const first = property(endpoint, call).parameters[0];
        expect(first.name.getText(ast)).toBe('input');
        expect(first.questionToken).toBeTruthy();
        expect(first.type.members[0].name.getText(ast)).toBe('familyId');
        expect(first.type.members[0].questionToken).toBeUndefined();
      }
    }
  });
});
