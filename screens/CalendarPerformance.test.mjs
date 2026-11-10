import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ts from 'typescript';
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, format } from 'date-fns';
import { buildCalendarAgenda, buildCalendarDayIndex, prepareCalendarEvents } from '../lib/calendarViewModel.js';

// Intégration STRUCTURELLE et callbacks JS extraits du vrai écran, pas un montage RN,
// un test UI/téléphone ou une observation de trafic réseau.
const calendar = readFileSync(new URL('./CalendarScreen.tsx', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../lib/calendarViewModel.js', import.meta.url), 'utf8');
const source = ts.createSourceFile('CalendarScreen.tsx', calendar, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const text = node => node.getText(source);
function collect(root, predicate) {
  const results = [];
  function visit(node) {
    if (predicate(node)) results.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return results;
}
const calls = (root, name) => collect(root, node => ts.isCallExpression(node) && text(node.expression) === name);
function declaration(name) {
  const node = collect(source, node => ts.isVariableDeclaration(node) && text(node.name) === name)[0];
  expect(node, `déclaration ${name}`).toBeDefined();
  return node;
}
function compile(expression, bindings) {
  const js = ts.transpileModule(`const extractedCallback = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText;
  return Function(...Object.keys(bindings), `${js}\nreturn extractedCallback;`)(...Object.values(bindings));
}
function pressCallbacks() {
  return collect(source, node => ts.isJsxAttribute(node) && text(node.name) === 'onPress')
    .map(node => node.initializer)
    .filter(node => node && ts.isJsxExpression(node) && node.expression)
    .map(node => node.expression);
}
function enclosingMemo(call) {
  let node = call.parent;
  while (node && node !== source) {
    if (ts.isCallExpression(node) && text(node.expression) === 'useMemo') return node;
    node = node.parent;
  }
  return undefined;
}
const forbiddenLocalEffects = /\b(?:await|fetch|refetch|refetchSubscriptions|AsyncStorage|mutate|mutateAsync|invalidate|setData|prefetch|setTimeout|requestAnimationFrame)\b/;

function indexAliases() {
  return collect(source, node => ts.isVariableDeclaration(node) && node.initializer && calls(node.initializer, 'buildCalendarDayIndex').length > 0)
    .map(node => text(node.name));
}
function mockedIndexBindings(index) {
  return Object.fromEntries(indexAliases().map(name => [name, index]));
}

describe('Calendrier — intégration locale du view model (pas de test RN)', () => {
  it('importe et utilise les helpers réels sans réimplémenter la récurrence', () => {
    const imports = collect(source, ts.isImportDeclaration);
    const imported = imports.find(node => text(node.moduleSpecifier).includes('../lib/calendarViewModel'));
    expect(imported).toBeDefined();
    expect(text(imported)).toContain('prepareCalendarEvents');
    expect(text(imported)).toContain('buildCalendarDayIndex');
    expect(text(imported)).toContain('buildCalendarAgenda');
    expect(helper).toMatch(/from\s+['"](?:\.\/|\.\.\/lib\/)eventRecurrence\.js['"]/);
    expect(helper).toContain('isRecurringEventOnDay');
    expect(helper).toContain('getNextRecurringEventDate');
    expect(calls(source, 'isRecurringEventOnDay')).toHaveLength(0);
    expect(calls(source, 'getNextRecurringEventDate')).toHaveLength(0);
    expect(calendar).not.toMatch(/function\s+isEventOnDay\s*\(/);
  });

  it('mémoïse la préparation sur la donnée query, pas seulement sur une date de navigation', () => {
    const preparations = calls(source, 'prepareCalendarEvents');
    expect(preparations).toHaveLength(1);
    const memo = enclosingMemo(preparations[0]);
    expect(memo).toBeDefined();
    expect(text(memo.arguments[1])).toContain('eventsQuery.data');
    expect(text(preparations[0])).toContain('eventsQuery.data');
    expect(calendar).not.toMatch(/const\s+events\s*=\s*\(eventsQuery\.data\s*\|\|\s*\[\]\)\.map/);
  });

  it('ne reconstruit pas le mois quand seule la sélection ou un formulaire change', () => {
    const grid = declaration('calendarGrid').initializer;
    const monthIndex = declaration('visibleMonthIndex').initializer;
    expect(text(grid.arguments[1])).toBe('[viewMode, currentDate]');
    expect(text(monthIndex.arguments[1])).toBe('[preparedEvents, calendarGrid]');
    expect(text(monthIndex.arguments[1])).not.toMatch(/selectedDate|formData|calendarNow/);
    expect(calendar).toContain('monthCoversSelectedDay ? visibleMonthIndex : selectedDayIndex');
  });

  it('réutilise les index jour/heure dans les vues plutôt que les anciens scans par cellule', () => {
    expect(calls(source, 'buildCalendarDayIndex').length).toBeGreaterThan(0);
    expect(calendar).toMatch(/\.byDay\s*\[/);
    expect(calendar).toMatch(/\.byDayHour\s*\[/);
    expect(calendar).not.toMatch(/(?:events\s*\|\|\s*\[\]|events)\)?\.filter\([^;]*isEventOnDay/);
    const daySlots = collect(source, node => ts.isVariableDeclaration(node) && text(node.name) === 'hourEvents');
    expect(daySlots.length).toBeGreaterThanOrEqual(2);
    for (const slot of daySlots) expect(text(slot.initializer)).not.toContain('.filter(');
  });

  it('évite la recherche Agenda hors de sa vue et conserve une horloge renouvelable', () => {
    const agendaCalls = calls(source, 'buildCalendarAgenda');
    expect(agendaCalls).toHaveLength(1);
    const memo = enclosingMemo(agendaCalls[0]);
    expect(memo).toBeDefined();
    expect(text(memo)).toMatch(/viewMode\s*(?:===|!==)\s*['"]agenda['"]/);
    const args = agendaCalls[0].arguments;
    expect(args.length).toBeGreaterThanOrEqual(4);
    expect(text(args[2])).toContain('selectedCategories');
    expect(text(args[3])).toContain('selectedMembers');
    const clock = text(args[1]);
    expect(clock).not.toMatch(/startOfDay|yyyy-MM-dd/);
    // Si une variable d'horloge est mémoïsée, sa variation doit invalider l'Agenda.
    if (/^[A-Za-z_$][\w$]*$/.test(clock)) {
      expect(text(memo.arguments[1])).toContain(clock);
      const setters = collect(source, node => ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.name.elements.some(el => text(el) === clock));
      expect(setters.length, `état d'horloge renouvelable ${clock}`).toBeGreaterThan(0);
      const setter = text(setters[0].name.elements[1]);
      expect(calls(source, setter).length, 'horloge renouvelée au-delà du montage').toBeGreaterThan(0);
    } else {
      expect(clock).toMatch(/new Date\(|Date\.now\(/);
      expect(text(memo.arguments[1])).toContain('viewMode');
    }
  });

  it('garde la query globale sans date et les invalidations des vraies mutations', () => {
    const query = calls(source, 'trpc.events.list.useQuery');
    expect(query).toHaveLength(1);
    expect(text(query[0].arguments[0])).toBe('undefined');
    expect(text(query[0])).toContain('refetchOnWindowFocus: false');
    expect(calendar).toContain('calendarUtils.events.list.invalidate()');
    expect(calendar).toContain('calendarUtils.events.list.setData(undefined');
    expect(calendar).toContain('deleteEvent.mutate({ eventId: selectedEvent.id }');
    expect(calendar).toContain('isTodayDate && !isSelected && styles.dayCellToday');
    expect(calendar).toContain('const isTodayDate = isSameDay(day, calendarNow);');
    expect(calendar).toContain('isSameDay(day, calendarNow) && styles.weekDayNameToday');
  });
});

describe('Calendrier — callbacks de navigation exécutés avec setters fictifs', () => {
  it.each([
    ['subMonths', 'setCurrentDate', subMonths], ['addMonths', 'setCurrentDate', addMonths],
    ['subWeeks', 'setCurrentDate', subWeeks], ['addWeeks', 'setCurrentDate', addWeeks],
    ['subDays', 'setSelectedDate', subDays], ['addDays', 'setSelectedDate', addDays],
  ])('%s prend chaque tap en compte via un setter fonctionnel, sans effet réseau/disque', (name, setterName, operation) => {
    const matches = pressCallbacks().filter(callback => calls(callback, name).length && calls(callback, setterName).length);
    expect(matches, name).toHaveLength(1);
    const callbackSource = text(matches[0]);
    expect(callbackSource).not.toMatch(forbiddenLocalEffects);
    const initial = new Date(2026, 0, 31, 12, 23, 45);
    let state = new Date(initial);
    const setter = vi.fn(update => {
      expect(typeof update).toBe('function');
      const before = state.getTime();
      const result = update(state);
      expect(state.getTime()).toBe(before);
      state = result;
    });
    const otherSetter = vi.fn();
    const bindings = { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, currentDate: initial, selectedDate: initial,
      setCurrentDate: setterName === 'setCurrentDate' ? setter : otherSetter,
      setSelectedDate: setterName === 'setSelectedDate' ? setter : otherSetter };
    const callback = compile(callbackSource, bindings);
    callback(); callback(); callback(); // même closure : ne doit pas perdre les taps rapprochés
    let expected = new Date(initial);
    for (let i = 0; i < 3; i += 1) expected = operation(expected, 1);
    expect(state.getTime()).toBe(expected.getTime());
    expect(initial.getTime()).toBe(new Date(2026, 0, 31, 12, 23, 45).getTime());
    expect(setter).toHaveBeenCalledTimes(3);
    expect(otherSetter).not.toHaveBeenCalled(); // currentDate/selectedDate ont leurs rôles distincts
  });

  it('le clic jour décide à partir du vrai index, y compris multi-jours/récurrence/jour hors mois', () => {
    const callback = pressCallbacks().find(node => calls(node, 'setSelectedDate').some(call => text(call.arguments[0]) === 'day'));
    expect(callback).toBeDefined();
    const callbackSource = text(callback);
    expect(callbackSource).not.toMatch(forbiddenLocalEffects);
    expect(callbackSource).not.toContain('.filter(');
    const raw = [
      { id: 'span', startDate: '2026-03-28 23:00:00', endDate: '2026-03-30 00:00:00' },
      { id: 'monthly', startDate: '2026-01-31 08:00:00', recurrence: 'monthly' },
      { id: 'outside', startDate: '2026-04-01 10:00:00' },
    ];
    const prepared = prepareCalendarEvents(raw);
    const days = [new Date(2026, 2, 30), new Date(2026, 2, 31), new Date(2026, 3, 1), new Date(2026, 3, 2)];
    const index = buildCalendarDayIndex(prepared, days);
    expect(indexAliases().length, 'index réellement construit dans CalendarScreen').toBeGreaterThan(0);
    for (const day of days) {
      const setters = { setSelectedDate: vi.fn(), setDropdownModalOpen: vi.fn(), setCreateModalOpen: vi.fn() };
      const bindings = { ...mockedIndexBindings(index), ...setters, day, format,
        dayKey: format(day, 'yyyy-MM-dd'), getCalendarDayKey: date => format(date, 'yyyy-MM-dd'),
        // Accepte une liste déjà lue de l'index dans le scope de la cellule.
        dayEvents: index.byDay[format(day, 'yyyy-MM-dd')] || [],
        dayEvts: index.byDay[format(day, 'yyyy-MM-dd')] || [] };
      compile(callbackSource, bindings)();
      expect(setters.setSelectedDate).toHaveBeenCalledWith(day);
      expect(setters.setSelectedDate.mock.invocationCallOrder[0]).toBeLessThan(
        [...setters.setDropdownModalOpen.mock.invocationCallOrder, ...setters.setCreateModalOpen.mock.invocationCallOrder][0],
      );
      const hasEvents = (index.byDay[format(day, 'yyyy-MM-dd')] || []).length > 0;
      expect(setters.setDropdownModalOpen).toHaveBeenCalledTimes(hasEvents ? 1 : 0);
      expect(setters.setCreateModalOpen).toHaveBeenCalledTimes(hasEvents ? 0 : 1);
    }
  });

  it('le mode de vue change avant sa persistance et sans requête', async () => {
    const node = declaration('saveViewMode');
    const body = text(node.initializer);
    expect(body).not.toMatch(/\b(?:fetch|refetch|mutate|invalidate|prefetch)\b/);
    const sequence = [];
    const save = compile(body, {
      setViewMode: mode => sequence.push(['view', mode]),
      setCalendarNow: vi.fn(),
      AsyncStorage: { setItem: (key, mode) => { sequence.push(['disk', key, mode]); return Promise.resolve(); } },
    });
    await save('agenda');
    expect(sequence).toEqual([['view', 'agenda'], ['disk', 'calendar_view_mode', 'agenda']]);
  });

  it('de nouvelles données et un nouveau now changent les dérivations locales sans refresh', () => {
    const day = new Date(2026, 10, 9);
    const firstRaw = [{ id: 'A', startDate: '2026-11-09 09:00:00' }];
    const nextRaw = [{ id: 'B', startDate: '2026-11-09 18:00:00' }];
    const first = prepareCalendarEvents(firstRaw);
    const next = prepareCalendarEvents(nextRaw);
    expect(buildCalendarDayIndex(first, [day]).byDay['2026-11-09'].map(event => event.id)).toEqual(['A']);
    expect(buildCalendarDayIndex(next, [day]).byDay['2026-11-09'].map(event => event.id)).toEqual(['B']);
    expect(buildCalendarAgenda(next, new Date(2026, 10, 9, 17, 59)).map(event => event.id)).toEqual(['B']);
    expect(buildCalendarAgenda(next, new Date(2026, 10, 9, 18, 1))).toEqual([]);
  });
});
