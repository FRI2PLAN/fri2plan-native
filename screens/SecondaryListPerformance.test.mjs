import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const notes = readFileSync(new URL('./NotesScreen.tsx', import.meta.url), 'utf8');
const requests = readFileSync(new URL('./RequestsScreen.tsx', import.meta.url), 'utf8');

describe('Écrans secondaires — listes fluides', () => {
  it('mémorise filtrage et regroupement des notes', () => {
    expect(notes).toContain("import { useMemo, useState } from 'react'");
    expect(notes).toContain('const { filteredNotes, pinnedNotes, unpinnedNotes } = useMemo');
  });

  it('mémorise les demandes filtrées selon les actions visibles', () => {
    expect(requests).toContain("import { useMemo, useState } from 'react'");
    expect(requests).toContain('const filteredRequests = useMemo');
  });

  it('rend les actions de demandes en attente visibles dans les filtres', () => {
    expect(requests).toContain('const requestStatusCounts = useMemo');
    expect(requests).toContain('requestStatusCounts[status]');
    expect(requests).toContain('styles.filterCountBadge');
  });
});
