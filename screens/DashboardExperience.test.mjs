import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./DashboardScreen.tsx', import.meta.url), 'utf8');
const memberSummaryModal = readFileSync(new URL('../components/MemberSummaryModal.tsx', import.meta.url), 'utf8');
const fr = JSON.parse(readFileSync(new URL('../locales/fr.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));
const de = JSON.parse(readFileSync(new URL('../locales/de.json', import.meta.url), 'utf8'));

describe('Accueil — expérience familiale et chargement progressif', () => {
  it('laisse le tableau de bord se précharger derrière le sas familial affiché au niveau supérieur', () => {
    expect(screen).not.toContain('FamilyLoadingScreen');
    expect(screen).not.toContain('isInitialLoading');
    expect(screen).toContain('<FavoritesBar');
  });

  it('présente les repères de la famille et la prochaine action', () => {
    expect(screen).toContain("t('dashboard.nextAppointment')");
    expect(screen).toContain('nextUpcomingEvent');
    expect(screen).toContain('summaryEvents.map');
    expect(screen).toContain("setViewMode('week')");
    expect(screen).toContain('.slice(0, 3)');
    expect(screen).toContain("t('dashboard.todayWithCircle'");
    expect(screen).toContain('heroGreetingRow');
    expect(screen).toContain("t('dashboard.greetingHello', { name: user?.name || '' })");
    expect(screen).toContain("flexWrap: 'wrap'");
    expect(screen).toContain("familyAvatarCluster: {");
    expect(screen).toContain("justifyContent: 'center'");
    expect(screen).toContain("width: '100%'");
    expect(screen).toContain('greetingText');
  });

  it('dispose des nouveaux libellés dans les trois langues', () => {
    for (const locale of [fr, en, de]) {
      expect(locale.dashboard.todayAtHome).toBeTruthy();
      expect(locale.dashboard.todayWithCircle).toContain('{{name}}');
      expect(locale.dashboard.nextUp).toBeTruthy();
      expect(locale.dashboard.greetingHello).toContain('{{name}}');
    }
  });

  it('rend les avatars personnalisés cliquables et évite les clés dupliquées entre cercles', () => {
    expect(screen).toContain("import MemberAvatar from '../components/MemberAvatar'");
    expect(screen).toContain('visibleFamilyMembers');
    expect(screen).toContain('seenMemberIds.has(memberId)');
    expect(screen).toContain('dashboard-member-${activeFamily?.id ?? \'none\'}-${member.id}');
    expect(screen).toContain('onPress={() => setSelectedMember(member)}');
  });

  it('masque le faux état sans cercle derrière une transition neutre FRI2PLAN', () => {
    expect(screen).toContain('const [isCircleTransitioning, setIsCircleTransitioning] = useState(false);');
    expect(screen).toContain('if (isCircleTransitioning) {');
    expect(screen).toContain('source={require(\'../assets/logo.png\')}');
    expect(screen).toContain('<ActivityIndicator color="#7c3aed" size="small" />');
    expect(screen).toContain('setIsCircleTransitioning(true);');
    expect(screen).toContain('backgroundColor: \'#fffdf7\'');
  });

  it('présente le résumé individuel et conserve la croix de fermeture en bas', () => {
    expect(memberSummaryModal).toContain('getMemberDailySummary');
    expect(memberSummaryModal).toContain('task.assignedTo');
    expect(memberSummaryModal).toContain('event.userId');
    expect(memberSummaryModal).toContain("{currentMember.name || ''}");
    expect(memberSummaryModal).toContain("t('dashboard.today')");
    expect(memberSummaryModal).toContain('onTouchStart={handleSwipeStart}');
    expect(memberSummaryModal).toContain('onTouchEnd={handleSwipeEnd}');
    expect(memberSummaryModal).toContain('Math.abs(horizontalDistance) < 45');
    expect(memberSummaryModal).toContain('styles.stackCard');
    expect(memberSummaryModal).toContain("shiftMember(horizontalDistance < 0 ? 1 : -1)");
    expect(memberSummaryModal).not.toContain('memberSummaryTitle');
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

  it('passe la liste des membres à la fenêtre afin de permettre le balayage entre cartes', () => {
    expect(screen).toContain('familyMembers={visibleFamilyMembers}');
  });
});
