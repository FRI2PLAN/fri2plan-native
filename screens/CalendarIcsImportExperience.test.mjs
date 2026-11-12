import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ts from 'typescript';

// Handler et parser RÉELS extraits via AST : aucun montage RN, test UI/appareil
// ou compteur réseau téléphone. Aucun remplacement de la logique d’import.
const calendar = readFileSync(new URL('./CalendarScreen.tsx', import.meta.url), 'utf8');
const source = ts.createSourceFile('CalendarScreen.tsx', calendar, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const text = node => node.getText(source);
function collect(root, predicate) {
  const found = [];
  function visit(node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}
function declaration(name) {
  const node = collect(source, node => ts.isVariableDeclaration(node) && text(node.name) === name)[0];
  if (!node?.initializer) throw new Error(`Déclaration réelle introuvable : ${name}`);
  return node;
}
function compile(name, bindings) {
  const js = ts.transpileModule(`const extractedCallback = (${text(declaration(name).initializer)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText;
  return Function(...Object.keys(bindings), `${js}\nreturn extractedCallback;`)(...Object.values(bindings));
}
const locales = Object.fromEntries(['fr', 'en', 'de', 'es', 'it'].map(locale => [
  locale, JSON.parse(readFileSync(new URL(`../locales/${locale}.json`, import.meta.url), 'utf8')),
]));
const lookup = (locale, key) => key.split('.').reduce((value, part) => value?.[part], locales[locale]);
const interpolate = (value, options = {}) => value.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, name) => (
  Object.hasOwn(options, name) ? String(options[name]) : all
));
function translate(locale, key, options) {
  const value = lookup(locale, key);
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Traduction absente : ${locale}/${key}`);
  return interpolate(value, options);
}

// Copie embarquée de la fixture diagnostique connue ; aucun chemin hors dépôt
// n’est nécessaire au test. Les dates flottantes gardent la même heure en tout TZ.
const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FRI2PLAN//Diagnostic ICS DEV 20261112//FR
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:ics-dev-20261112-a@example.invalid
DTSTAMP:20261112T063000Z
DTSTART:20261111T090000
DTEND:20261111T093000
SUMMARY:[ICS-DEV-20261112] A
DESCRIPTION:Evenement fictif de diagnostic dans le cercle Test DEV.
END:VEVENT
BEGIN:VEVENT
UID:ics-dev-20261112-b@example.invalid
DTSTAMP:20261112T063000Z
DTSTART:20261111T100000
DTEND:20261111T104500
SUMMARY:[ICS-DEV-20261112] B
DESCRIPTION:Evenement fictif de diagnostic dans le cercle Test DEV.
END:VEVENT
BEGIN:VEVENT
UID:ics-dev-20261112-c@example.invalid
DTSTAMP:20261112T063000Z
DTSTART:20261111T110000
DTEND:20261111T120000
SUMMARY:[ICS-DEV-20261112] C
DESCRIPTION:Evenement fictif de diagnostic dans le cercle Test DEV.
END:VEVENT
END:VCALENDAR
`.replace(/\n/g, '\r\n');
const EMPTY_ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
const EXPECTED_EVENTS = [
  ['A', 'a', '09:00:00', 30], ['B', 'b', '10:00:00', 45], ['C', 'c', '11:00:00', 60],
].map(([title, uid, time, durationMinutes]) => ({
  title: `[ICS-DEV-20261112] ${title}`,
  description: 'Evenement fictif de diagnostic dans le cercle Test DEV.',
  icalUid: `ics-dev-20261112-${uid}@example.invalid`,
  startDate: `2026-11-11 ${time}`,
  durationMinutes,
  category: 'other', reminderMinutes: 20, isPrivate: 0,
}));
function realParser() {
  const cleanDescription = compile('cleanDescription', {});
  const parseICSDateToString = compile('parseICSDateToString', {});
  return compile('parseICS', { cleanDescription, parseICSDateToString, defaultReminderStr: '20' });
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
async function finishesWithoutSideEffects(promise) {
  // Une boucle d’import de 3 Promises résolues finit avant le prochain tour.
  // Pas de timer arbitraire ou attente infinie d’une notification/refetch bloqué.
  const finished = await Promise.race([promise.then(() => true), flush().then(() => false)]);
  expect(finished, 'Le résultat et le finally ne doivent pas attendre notification/refetch').toBe(true);
}
function harness(options = {}) {
  const locale = options.locale || 'fr';
  const trace = [];
  let importing = false;
  const picker = vi.fn(options.picker || (async () => ({ canceled: false, assets: [{ uri: 'memory://diagnostic.ics' }] })));
  const fetchFile = vi.fn(options.fetch || (async () => ({ ok: true, text: async () => options.content ?? ICS })));
  const parseICS = vi.fn(options.parser || realParser());
  const create = vi.fn(async event => {
    trace.push(['create', event.icalUid]);
    return options.create ? options.create(event) : { id: event.icalUid };
  });
  const notification = vi.fn(payload => {
    trace.push(['notification', payload]);
    return options.notification ? options.notification(payload) : Promise.resolve({ id: 'notice' });
  });
  const refetch = vi.fn(() => {
    trace.push(['refetch']);
    return options.refetch ? options.refetch() : Promise.resolve({ data: [] });
  });
  const alert = vi.fn((...args) => trace.push(['alert', ...args]));
  const setIsImporting = vi.fn(value => { importing = value; trace.push(['spinner', value]); });
  const setImportModalOpen = vi.fn(value => trace.push(['modal', value]));
  const t = vi.fn((key, values) => translate(locale, key, values));
  const forbidden = vi.fn(() => { throw new Error('Google/API hors import ICS interdit'); });
  // Pas de .mutate sur le proxy tRPC brut : reproduit le défaut historique.
  const trpc = {
    notifications: { createForSelf: { useMutation: forbidden } },
    events: { create: { useMutation: forbidden }, list: { useQuery: forbidden } },
    syncedCalendars: { sync: { mutate: forbidden, mutateAsync: forbidden } },
    googleCalendar: { sync: { mutate: forbidden, mutateAsync: forbidden } },
  };
  const run = compile('handleImportICS', {
    DocumentPicker: { getDocumentAsync: picker }, fetch: fetchFile, parseICS,
    createEvent: { mutateAsync: create }, createImportNotification: { mutateAsync: notification },
    refetch, Alert: { alert }, t, setIsImporting, setImportModalOpen, trpc,
    // Bindings sentinelles : aucune intégration Google ni autre refetch autorisé.
    GoogleSignin: { signIn: forbidden, getTokens: forbidden },
    syncSyncedCalendarMutation: { mutate: forbidden, mutateAsync: forbidden },
    refetchSyncedCalendars: forbidden, refetchSubscriptions: forbidden,
    console: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
  });
  return { run, locale, trace, picker, fetchFile, parseICS, create, notification, refetch,
    alert, setIsImporting, setImportModalOpen, t, forbidden, isImporting: () => importing };
}
function noWrites(h) {
  expect(h.create).not.toHaveBeenCalled();
  expect(h.notification).not.toHaveBeenCalled();
  expect(h.refetch).not.toHaveBeenCalled();
  expect(h.forbidden).not.toHaveBeenCalled();
}
function spinnerDone(h) {
  expect(h.isImporting()).toBe(false);
  expect(h.setIsImporting).toHaveBeenLastCalledWith(false);
  expect(h.forbidden).not.toHaveBeenCalled();
}
function result(h, kind, values = {}) {
  const messageKey = `calendar.import${kind}Message`;
  // count est le nombre importé, jamais le nombre tenté. Accepte le nom
  // failedCount retenu par l’implémentation ou failed, avec la même valeur.
  const counts = { count: 0, ...values, failedCount: values.failed ?? 0 };
  const expectedMessage = translate(h.locale, messageKey, counts);
  expect(h.alert).toHaveBeenCalledTimes(1);
  const [title, message] = h.alert.mock.calls[0];
  expect(message).toBe(expectedMessage);
  expect(title).toEqual(expect.any(String));
  expect(title.trim()).not.toBe('');
  expect(`${title} ${message}`).not.toMatch(/\{\{|calendar\.|common\./);
  const titleKey = `calendar.import${kind}Title`;
  if (h.t.mock.calls.some(([key]) => key === titleKey)) {
    expect(title).toBe(translate(h.locale, titleKey, counts));
  } else {
    expect(['Failed', 'ReadError']).toContain(kind);
    expect(title).toBe(translate(h.locale, 'common.error'));
  }
  expect(h.t.mock.calls.some(([key]) => key === messageKey)).toBe(true);
}
function groupedNotice(h, count) {
  expect(h.notification).toHaveBeenCalledTimes(1);
  const payload = h.notification.mock.calls[0][0];
  expect(payload.type).toBe('event_created');
  // La notification peut conserver le libellé de succès ou refléter le partiel.
  const messageCalls = h.t.mock.calls.filter(([key]) => (
    key === 'calendar.importSuccessMessage' || key === 'calendar.importPartialMessage'
  ));
  expect(messageCalls.some(([key, values]) => values?.count === count
    && translate(h.locale, key, values) === payload.message)).toBe(true);
  expect(payload.message).not.toMatch(/\{\{/);
}

describe('Import ICS — hook stable (seule garde structurelle)', () => {
  it('déclare une mutation de notification stable hors du handler, pas sur le proxy tRPC brut', () => {
    const hook = declaration('createImportNotification');
    expect(ts.isCallExpression(hook.initializer)).toBe(true);
    // Un cast TypeScript n’altère pas la cible du hook au runtime.
    function accessPath(node) {
      if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
        return accessPath(node.expression);
      }
      if (ts.isPropertyAccessExpression(node)) return `${accessPath(node.expression)}.${text(node.name)}`;
      return text(node);
    }
    expect(accessPath(hook.initializer.expression)).toBe('trpc.notifications.createForSelf.useMutation');
    expect(hook.parent.flags & ts.NodeFlags.Const).not.toBe(0);
    // Même bloc direct que le handler : pas dans un callback ou un if.
    expect(hook.parent.parent.parent).toBe(declaration('handleImportICS').parent.parent.parent);
    let ancestor = hook.parent;
    while (ancestor && ancestor !== source) {
      expect(ancestor).not.toBe(declaration('handleImportICS'));
      ancestor = ancestor.parent;
    }
    const hooks = collect(source, node => ts.isCallExpression(node)
      && accessPath(node.expression) === 'trpc.notifications.createForSelf.useMutation');
    expect(hooks).toHaveLength(1);
  });
});

describe('Import ICS — vrai parser et handler exécutés avec bindings fictifs', () => {
  it('parse la fixture : 3 UID, heures locales, durées et champs conservés', () => {
    expect(realParser()(ICS)).toEqual(EXPECTED_EVENTS);
  });

  it('annulation : aucune alerte, lecture, création, notification ou refetch', async () => {
    const h = harness({ picker: async () => ({ canceled: true, assets: null }) });
    await h.run();
    expect(h.picker).toHaveBeenCalledTimes(1);
    expect(h.fetchFile).not.toHaveBeenCalled();
    expect(h.parseICS).not.toHaveBeenCalled();
    expect(h.alert).not.toHaveBeenCalled();
    expect(h.isImporting()).toBe(false);
    expect(h.setIsImporting.mock.calls.flat()).not.toContain(true);
    noWrites(h);
  });

  it.each([
    ['assets absent', { canceled: false }],
    ['assets null', { canceled: false, assets: null }],
    ['assets vide', { canceled: false, assets: [] }],
    ['premier asset null', { canceled: false, assets: [null] }],
    ['URI absent', { canceled: false, assets: [{}] }],
    ['URI vide', { canceled: false, assets: [{ uri: '' }] }],
    ['URI blanche', { canceled: false, assets: [{ uri: '   ' }] }],
    ['URI non-string', { canceled: false, assets: [{ uri: 42 }] }],
  ])('sélection invalide (%s) : erreur de lecture, aucun appel événement', async (_name, picked) => {
    const h = harness({ picker: async () => picked });
    await h.run();
    expect(h.fetchFile).not.toHaveBeenCalled();
    expect(h.parseICS).not.toHaveBeenCalled();
    result(h, 'ReadError');
    spinnerDone(h);
    noWrites(h);
  });

  it.each([
    ['picker rejeté', { picker: async () => { throw new Error('picker'); } }],
    ['fetch rejeté', { fetch: async () => { throw new Error('read'); } }],
    ['HTTP en échec', { fetch: async () => ({ ok: false, text: async () => ICS }) }],
    ['response.text rejeté', { fetch: async () => ({ text: async () => { throw new Error('text'); } }) }],
    ['parser throw', { parser: () => { throw new Error('parse'); } }],
  ])('%s : erreur de lecture distincte, zéro création et finally', async (_name, options) => {
    const h = harness(options);
    await h.run();
    result(h, 'ReadError');
    spinnerDone(h);
    noWrites(h);
  });

  it('aucun événement : résultat vide distinct, sans création, notification ou refetch', async () => {
    const h = harness({ content: EMPTY_ICS });
    await h.run();
    expect(h.parseICS).toHaveBeenCalledWith(EMPTY_ICS);
    result(h, 'Empty');
    spinnerDone(h);
    noWrites(h);
  });

  it('3 succès : payloads inchangés + skipNotification, ordre A/B/C, une notification count=3 et un refetch', async () => {
    const h = harness();
    await h.run();
    await flush();
    expect(h.picker).toHaveBeenCalledWith({ type: 'text/calendar', copyToCacheDirectory: true });
    expect(h.fetchFile).toHaveBeenCalledTimes(1);
    expect(h.fetchFile).toHaveBeenCalledWith('memory://diagnostic.ics');
    expect(h.create.mock.calls.map(([event]) => event)).toEqual(EXPECTED_EVENTS.map(event => ({ ...event, skipNotification: true })));
    expect(h.trace.filter(([type]) => type === 'create').map(([, uid]) => uid)).toEqual(EXPECTED_EVENTS.map(event => event.icalUid));
    expect(h.refetch).toHaveBeenCalledTimes(1);
    const finalCreateOrder = h.create.mock.invocationCallOrder[2];
    expect(h.refetch.mock.invocationCallOrder[0]).toBeGreaterThan(finalCreateOrder);
    expect(h.notification.mock.invocationCallOrder[0]).toBeGreaterThan(finalCreateOrder);
    groupedNotice(h, 3);
    result(h, 'Success', { count: 3 });
    expect(h.setImportModalOpen).toHaveBeenCalledWith(false);
    spinnerDone(h);
  });

  it('attend chaque création avant la suivante et garde le spinner pendant la boucle', async () => {
    const first = deferred();
    const h = harness({ create: event => event.icalUid === EXPECTED_EVENTS[0].icalUid ? first.promise : Promise.resolve({ id: event.icalUid }) });
    const pending = h.run();
    try {
      await flush();
      expect(h.create).toHaveBeenCalledTimes(1);
      expect(h.isImporting()).toBe(true);
      expect(h.notification).not.toHaveBeenCalled();
      expect(h.refetch).not.toHaveBeenCalled();
      expect(h.alert).not.toHaveBeenCalled();
    } finally {
      first.resolve({ id: 'first' });
      await pending;
    }
    expect(h.create).toHaveBeenCalledTimes(3);
    result(h, 'Success', { count: 3 });
    spinnerDone(h);
  });

  it('1 échec sur 3 : continue après B, 2 succès/1 échec, notification count=2 et bilan partiel', async () => {
    const h = harness({ create: async event => {
      if (event.icalUid === EXPECTED_EVENTS[1].icalUid) throw new Error('create B');
      return { id: event.icalUid };
    } });
    await h.run();
    await flush();
    expect(h.create.mock.calls.map(([event]) => event)).toEqual(EXPECTED_EVENTS.map(event => ({ ...event, skipNotification: true })));
    expect(h.refetch).toHaveBeenCalledTimes(1);
    groupedNotice(h, 2);
    result(h, 'Partial', { count: 2, failed: 1 });
    expect(h.alert.mock.calls[0][1]).not.toBe(translate('fr', 'calendar.importSuccessMessage', { count: 2 }));
    spinnerDone(h);
  });

  it('3 échecs : bilan 0 succès/3 échecs distinct, pas de refetch ni notification', async () => {
    const h = harness({ create: async () => { throw new Error('create all'); } });
    await h.run();
    expect(h.create).toHaveBeenCalledTimes(3);
    result(h, 'Failed', { count: 0, failed: 3 });
    expect(h.refetch).not.toHaveBeenCalled();
    expect(h.notification).not.toHaveBeenCalled();
    spinnerDone(h);
  });

  it.each(['notification', 'refetch'])('%s en attente ne bloque ni le résultat ni le finally', async sideEffect => {
    const background = deferred();
    const h = harness({ [sideEffect]: () => background.promise });
    const pending = h.run();
    try {
      await finishesWithoutSideEffects(pending);
      result(h, 'Success', { count: 3 });
      groupedNotice(h, 3);
      expect(h.refetch).toHaveBeenCalledTimes(1);
      spinnerDone(h);
    } finally {
      background.resolve({ data: [] });
      await pending;
      await flush();
    }
  });

  it('notification ET refetch en attente simultanée laissent le résultat disponible', async () => {
    const notice = deferred();
    const refresh = deferred();
    const h = harness({ notification: () => notice.promise, refetch: () => refresh.promise });
    const pending = h.run();
    try {
      await finishesWithoutSideEffects(pending);
      result(h, 'Success', { count: 3 });
      groupedNotice(h, 3);
      expect(h.refetch).toHaveBeenCalledTimes(1);
      spinnerDone(h);
    } finally {
      notice.resolve({ id: 'notice' });
      refresh.resolve({ data: [] });
      await pending;
      await flush();
    }
  });

  it.each([
    ['notification', 'sync'], ['notification', 'async'], ['refetch', 'sync'], ['refetch', 'async'],
  ])('%s %s en échec ne produit jamais une fausse erreur d’import', async (sideEffect, mode) => {
    const failure = () => {
      if (mode === 'sync') throw new Error(`${sideEffect} sync`);
      return Promise.reject(new Error(`${sideEffect} async`));
    };
    const h = harness({ [sideEffect]: failure });
    await h.run();
    await flush();
    expect(h.create).toHaveBeenCalledTimes(3);
    expect(h.refetch).toHaveBeenCalledTimes(1);
    groupedNotice(h, 3);
    result(h, 'Success', { count: 3 });
    spinnerDone(h);
  });
});

describe.each(['fr', 'en', 'de', 'es', 'it'])('Import ICS — libellés et placeholders réellement utilisés (%s)', locale => {
  it('tous les résultats utilisent des traductions présentes, distinctes et interpolées', async () => {
    const scenarios = [
      ['Success', {}, { count: 3 }],
      ['Empty', { content: EMPTY_ICS }, {}],
      ['Partial', { create: async event => {
        if (event.icalUid === EXPECTED_EVENTS[1].icalUid) throw new Error('B');
        return { id: event.icalUid };
      } }, { count: 2, failed: 1 }],
      ['Failed', { create: async () => { throw new Error('all'); } }, { count: 0, failed: 3 }],
      ['ReadError', { fetch: async () => { throw new Error('read'); } }, {}],
    ];
    const messages = [];
    for (const [kind, options, values] of scenarios) {
      const h = harness({ ...options, locale });
      await h.run();
      await flush();
      result(h, kind, values);
      spinnerDone(h);
      messages.push(h.alert.mock.calls[0][1]);
      for (const [key, variables] of h.t.mock.calls) {
        const template = lookup(locale, key);
        expect(template, `${locale}/${key}`).toEqual(expect.any(String));
        expect(template.trim(), `${locale}/${key}`).not.toBe('');
        const placeholders = [...template.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(match => match[1]);
        for (const placeholder of placeholders) {
          expect(variables, `${locale}/${key} requiert ${placeholder}`).toHaveProperty(placeholder);
          expect(variables[placeholder]).toEqual(expect.any(Number));
        }
        expect(translate(locale, key, variables)).not.toMatch(/\{\{/);
      }
      expect(h.forbidden).not.toHaveBeenCalled();
    }
    expect(new Set(messages).size, `${locale} distingue succès/vide/partiel/échec/lecture`).toBe(5);
    expect(lookup(locale, 'calendar.importSuccessMessage')).toMatch(/\{\{\s*count\s*\}\}/);
    expect(lookup(locale, 'calendar.importPartialMessage')).toMatch(/\{\{\s*count\s*\}\}/);
    expect(lookup(locale, 'calendar.importPartialMessage')).toMatch(/\{\{\s*failed(?:Count)?\s*\}\}/);
    expect(lookup(locale, 'calendar.importFailedMessage')).toMatch(/\{\{\s*(?:failed(?:Count)?|count)\s*\}\}/);
  });
});
