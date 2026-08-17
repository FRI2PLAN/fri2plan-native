import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./DashboardScreen.tsx', import.meta.url), 'utf8');
const memberSummaryModal = readFileSync(new URL('../components/MemberSummaryModal.tsx', import.meta.url), 'utf8');
const fr = JSON.parse(readFileSync(new URL('../locales/fr.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));
const de = JSON.parse(readFileSync(new URL('../locales/de.json', import.meta.url), 'utf8'));

describe('Accueil — expérience familiale et chargement progressif', () => {
  it('ne bloque plus l’Accueil sur les données secondaires', () => {
    expect(screen).toContain('tasksLoading && eventsLoading');
    expect(screen).not.toContain('tasksLoading || eventsLoading || messagesLoading || mealsLoading');
  });

  it('présente les repères de la famille et la prochaine action', () => {
    expect(screen).toContain("t('dashboard.todayAtHome')");
    expect(screen).toContain("t('dashboard.nextUp')");
    expect(screen).toContain('familyAvatarStack');
  });

  it('dispose des nouveaux libellés dans les trois langues', () => {
    for (const locale of [fr, en, de]) {
      expect(locale.dashboard.todayAtHome).toBeTruthy();
      expect(locale.dashboard.nextUp).toBeTruthy();
      expect(locale.dashboard.greetingMorning).toContain('{{name}}');
    }
  });

  it('rend les avatars personnalisés cliquables et évite les clés dupliquées entre cercles', () => {
    expect(screen).toContain("import MemberAvatar from '../components/MemberAvatar'");
    expect(screen).toContain('visibleFamilyMembers');
    expect(screen).toContain('seenMemberIds.has(memberId)');
    expect(screen).toContain('dashboard-member-${activeFamily?.id ?? \'none\'}-${member.id}');
    expect(screen).toContain('onPress={() => setSelectedMember(member)}');
  });

  it('présente le résumé individuel et conserve la croix de fermeture en bas', () => {
    expect(memberSummaryModal).toContain('getMemberDailySummary');
    expect(memberSummaryModal).toContain('task.assignedTo');
    expect(memberSummaryModal).toContain('event.userId');
    expect(memberSummaryModal).toContain('Pressable style={StyleSheet.absoluteFill} onPress={onClose}');
    expect(memberSummaryModal).toContain('style={styles.closeButton}');
    expect(memberSummaryModal).toContain('<Text style={styles.closeIcon}>✕</Text>');
  });

  it('traduit les sections du résumé individuel dans les trois langues', () => {
    for (const locale of [fr, en, de]) {
      expect(locale.dashboard.memberSummaryTitle).toContain('{{name}}');
      expect(locale.dashboard.memberTasks).toBeTruthy();
      expect(locale.dashboard.memberPoints).toBeTruthy();
      expect(locale.dashboard.memberEvents).toBeTruthy();
      expect(locale.dashboard.memberAchievements).toBeTruthy();
    }
  });
});
