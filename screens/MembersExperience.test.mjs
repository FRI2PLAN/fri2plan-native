import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const membersScreen = readFileSync(new URL('./MembersScreen.tsx', import.meta.url), 'utf8');

describe('Membres — notre tribu', () => {
  it('affiche un en-tête de tribu et les points réellement disponibles', () => {
    expect(membersScreen).toContain("t('members.ourTribe')");
    expect(membersScreen).toContain('memberPointsById');
    expect(membersScreen).toContain('styles.memberPoints');
  });

  it('réutilise les avatars personnalisés avec une clé liée au cercle', () => {
    expect(membersScreen).toContain('<MemberAvatar member={member} size={48} />');
    expect(membersScreen).toContain('key={`${activeFamily?.id}-${member.id}`}');
  });

  it('déduplique les membres avant de les compter et de les afficher', () => {
    expect(membersScreen).toContain('const uniqueMembers = useMemo(() =>');
    expect(membersScreen).toContain('seenMemberIds.has(memberId)');
    expect(membersScreen).toContain('Membres ({uniqueMembers.length})');
    expect(membersScreen).toContain("t('members.tribeCount', { count: uniqueMembers.length })");
    expect(membersScreen).toContain('uniqueMembers.map((member: any) =>');
  });
});
