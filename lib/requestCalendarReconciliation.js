// Request/calendar reconciliation only. No React, notification or storage side effects.
export function requestCalendarScope(userId, familyId, isReady = true, isCircleTransitioning = false) {
  return userId && familyId && isReady && !isCircleTransitioning ? { userId, familyId } : null;
}

export function createRequestCalendarScopeGuard() {
  let current = null;
  let generation = 0;
  return {
    update(scope) {
      if (!scope) {
        if (current) generation += 1;
        current = null;
      } else if (!current || current.userId !== scope.userId || current.familyId !== scope.familyId) {
        current = Object.freeze({ ...scope, generation: ++generation });
      }
      return current;
    },
    isCurrent(token) { return !!token && token === current; },
  };
}

// Throwing in onMutate prevents TanStack from starting the HTTP mutation.
export function requestCalendarMutationContext(actionOrigins, variables, scopeGuard) {
  const context = actionOrigins.get(variables);
  if (!context?.origin || !scopeGuard.isCurrent(context.origin)) {
    throw new Error('Request mutation origin is no longer active');
  }
  return context;
}

export function removeRequestEvents(events, requestId, deletedEventIds = []) {
  if (!Array.isArray(events)) return events;
  const ids = new Set(deletedEventIds.filter(id => Number.isInteger(id) && id > 0));
  return events.filter(event => !ids.has(event.id) && !(requestId != null && event.relatedRequestId === requestId));
}

export function isEventNotFound(error) {
  return (error?.data?.code ?? error?.shape?.data?.code ?? error?.code) === 'NOT_FOUND';
}

export function rollbackEventUpdate(events, previousEvent, optimisticEvent) {
  if (!Array.isArray(events) || !previousEvent || !optimisticEvent) return events;
  return events.map(event => event === optimisticEvent ? previousEvent : event);
}

export function rollbackEventDelete(events, previousEvent, optimisticList) {
  if (!Array.isArray(events) || !previousEvent || events !== optimisticList || events.some(event => event.id === previousEvent.id)) return events;
  return [...events, previousEvent];
}

export function resolveScopedSelection(snapshot, rows, authoritative, scopeCurrent) {
  if (!snapshot || !scopeCurrent) return null;
  const current = Array.isArray(rows) ? rows.find(row => row.id === snapshot.id) : undefined;
  return current ?? (authoritative ? null : snapshot);
}

export function isRequestNotice(data, familyId) {
  if (!data || typeof data !== 'object') return false;
  if (data.familyId != null && String(data.familyId) !== String(familyId)) return false;
  const type = String(data.type ?? '').toLowerCase();
  return ['request_created', 'request_updated', 'request_approved', 'request_rejected', 'request_deleted', 'request_comment'].includes(type)
    || /^\/requests(?:[/?#]|$)/.test(String(data.actionUrl ?? data.url ?? ''));
}

// Do not use utils.fetch/refetch for the shared undefined-input events cache here:
// their late response would be cached before the origin guard can run. Raw client
// reads are committed only while the originating account/circle is still current.
// Mutation success and refresh failure are deliberately separate outcomes.
const latestReads = new Map();
export async function reconcileRequestCalendar(utils, origin, isCurrent, options = {}) {
  if (!isCurrent(origin)) return { skipped: true, failed: [] };
  if (options.removeLinked || options.deletedEventIds?.length) {
    utils.events.list.setData(undefined, events => removeRequestEvents(
      events, options.removeLinked ? options.requestId : undefined, options.deletedEventIds,
    ));
  }
  const input = { familyId: origin.familyId };
  let paths = options.eventsOnly ? [['events', 'list', undefined]] : [
    ['requests', 'list', input],
    ['events', 'list', undefined],
    ['requests', 'hasOpenBadge', input],
    ['requests', 'getUnreadCommentsCounts', input],
    ['notifications', 'list', input],
    ['notifications', 'getUnreadCount', input],
  ];
  if (options.badgesOnly) paths = paths.filter(([domain, procedure]) => domain === 'requests' && procedure !== 'list');
  const failed = [];
  await Promise.all(paths.map(async ([domain, procedure, queryInput]) => {
    if (!isCurrent(origin)) return;
    const utility = utils[domain]?.[procedure];
    if (!utility) return;
    const path = `${domain}.${procedure}`;
    const readKey = `${origin.userId}:${origin.familyId}:${path}`;
    const version = (latestReads.get(readKey) ?? 0) + 1;
    latestReads.set(readKey, version);
    const previousData = utility.getData(queryInput);
    try {
      // Mark only this exact input stale; no automatically cached in-flight read.
      await utility.invalidate(queryInput, { refetchType: 'none' });
      if (!isCurrent(origin)) return;
      const data = await utils.client[domain][procedure].query(queryInput);
      if (isCurrent(origin) && latestReads.get(readKey) === version && utility.getData(queryInput) === previousData) {
        utility.setData(queryInput, data);
      }
    } catch (error) {
      failed.push(path);
    }
  }));
  return { skipped: !isCurrent(origin), failed };
}
