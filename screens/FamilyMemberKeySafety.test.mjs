import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const calendarScreen = fs.readFileSync(new URL('./CalendarScreen.tsx', import.meta.url), 'utf8');
const dashboardScreen = fs.readFileSync(new URL('./DashboardScreen.tsx', import.meta.url), 'utf8');
const tasksScreen = fs.readFileSync(new URL('./TasksScreen.tsx', import.meta.url), 'utf8');

describe('sécurité des clés membres entre cercles', () => {
  it('déduplique les membres du filtre Calendrier et scope leur clé au cercle actif', () => {
    expect(calendarScreen).toContain('const uniqueFamilyMembers = useMemo');
    expect(calendarScreen).toContain('calendar-member-${activeFamily?.id ?? \'none\'}-${member.id}-${index}');
    expect(calendarScreen).not.toContain('<TouchableOpacity key={member.id} style={styles.filterCheckboxRow}');
  });

  it('conserve les clés d’avatar de l’Accueil rattachées au cercle actif', () => {
    expect(dashboardScreen).toContain('dashboard-member-${activeFamily?.id ?? \'none\'}-${member.id}');
  });

  it('déduplique les membres du sélecteur de tâches et scope leur clé au cercle actif', () => {
    expect(tasksScreen).toContain('const activeMembers = useMemo');
    expect(tasksScreen).toContain('task-member-${activeFamily?.id ?? \'none\'}-${member.id}-${index}');
    expect(tasksScreen).not.toContain('<TouchableOpacity key={m.id} style={styles.pickerOption}');
  });
});
