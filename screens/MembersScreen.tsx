import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';

interface MembersScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const COLORS = ['#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#14B8A6'];

export default function MembersScreen({ onNavigate, onPrevious, onNext }: MembersScreenProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');

  const utils = trpc.useUtils();
  const { data: meData } = trpc.user.me.useQuery();
  const { data: families } = trpc.family.list.useQuery();
  const activeFamily = families?.[0];

  const { data: members = [], isLoading } = trpc.family.members.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );

  const { data: invitations = [] } = trpc.invitations.list.useQuery(
    undefined,
    { enabled: !!activeFamily }
  );

  const currentUserIsAdmin = useMemo(() => {
    if (!meData || !members.length) return false;
    const me = members.find((m: any) => m.id === meData.id);
    return me?.familyRole === 'admin' || me?.role === 'admin' || meData.role === 'admin';
  }, [meData, members]);

  const inviteMutation = trpc.members.invite.useMutation({
    onSuccess: (data: any) => {
      setGeneratedCode(data.invitationCode);
      utils.invitations.list.invalidate();
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const updateRoleMutation = trpc.members.updateRole.useMutation({
    onSuccess: () => {
      utils.family.members.invalidate();
      setShowRoleModal(false);
      setSelectedMember(null);
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const updateColorMutation = trpc.members.updateColor.useMutation({
    onSuccess: () => {
      utils.family.members.invalidate();
      setShowColorModal(false);
      setSelectedMember(null);
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const removeMutation = trpc.members.remove.useMutation({
    onSuccess: () => {
      utils.family.members.invalidate();
      setShowRemoveModal(false);
      setSelectedMember(null);
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const transferMutation = trpc.members.transferAdminRole.useMutation({
    onSuccess: () => {
      utils.family.members.invalidate();
      setShowTransferModal(false);
      setSelectedMember(null);
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const deleteInvitationMutation = trpc.invitations.delete.useMutation({
    onSuccess: () => utils.invitations.list.invalidate(),
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const handleInvite = () => {
    if (!inviteEmail.trim() || !activeFamily) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), familyId: activeFamily.id, role: inviteRole });
  };

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Copié !', 'Le code a été copié dans le presse-papiers.');
  };

  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Rejoins notre famille sur FRI2PLAN ! 🎉\n\nCode d'invitation : ${code}\n\nLien : https://famorganiser-c6nkqckm.manus.space/invitation/${code}`,
        title: 'Invitation FRI2PLAN',
      });
    } catch (e) {}
  };

  const handleMemberAction = (member: any, action: 'role' | 'color' | 'remove' | 'transfer') => {
    setSelectedMember(member);
    setSelectedColor(member.userColor || '#8B5CF6');
    if (action === 'role') setShowRoleModal(true);
    else if (action === 'color') setShowColorModal(true);
    else if (action === 'remove') setShowRemoveModal(true);
    else if (action === 'transfer') setShowTransferModal(true);
  };

  const getRoleLabel = (member: any) => {
    const role = member.familyRole || member.role;
    return role === 'admin' ? '👑 Admin' : '👤 Membre';
  };

  const getMemberColor = (member: any) => member.userColor || '#8B5CF6';

  const getAvatarDisplay = (member: any) => {
    if (member.avatarType === 'emoji' || member.avatarType === 'icon') return member.avatarValue || '👤';
    return member.name?.charAt(0).toUpperCase() || '?';
  };

  const isEmojiAvatar = (member: any) => member.avatarType === 'emoji' || member.avatarType === 'icon';

  return (
    <View style={styles.container}>
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Cercles</Text>
      </View>

      {/* Family Info */}
      {activeFamily && (
        <View style={styles.familyBanner}>
          <Text style={styles.familyName}>👨‍👩‍👧‍👦 {activeFamily.name}</Text>
          <View style={styles.familyCodeRow}>
            <Text style={styles.familyCodeLabel}>Code : </Text>
            <Text style={styles.familyCode} numberOfLines={1} adjustsFontSizeToFit>{activeFamily.inviteCode}</Text>
            <TouchableOpacity onPress={() => handleCopyCode(activeFamily.inviteCode)} style={styles.familyCodeCopy}>
              <Text style={styles.familyCodeCopyText}>📋</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs + Add */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            👥 Membres ({members.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invitations' && styles.tabActive]}
          onPress={() => setActiveTab('invitations')}
        >
          <Text style={[styles.tabText, activeTab === 'invitations' && styles.tabTextActive]}>
            ✉️ Invitations ({invitations.length})
          </Text>
        </TouchableOpacity>
        {currentUserIsAdmin && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setGeneratedCode(null); setInviteEmail(''); setShowInviteModal(true); }}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator>
        {/* MEMBRES */}
        {activeTab === 'members' && (
          <View>
            {isLoading ? (
              <Text style={styles.emptyText}>Chargement...</Text>
            ) : members.length === 0 ? (
              <Text style={styles.emptyText}>Aucun membre</Text>
            ) : (
              members.map((member: any) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={[styles.memberAvatar, { backgroundColor: getMemberColor(member) }]}>
                    <Text style={isEmojiAvatar(member) ? styles.memberEmoji : styles.memberInitial}>
                      {getAvatarDisplay(member)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                    <Text style={styles.memberRole}>{getRoleLabel(member)}</Text>
                  </View>
                  {currentUserIsAdmin && member.id !== meData?.id && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleMemberAction(member, 'role')}
                      >
                        <Text style={styles.actionBtnText}>🔑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleMemberAction(member, 'color')}
                      >
                        <Text style={styles.actionBtnText}>🎨</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        onPress={() => handleMemberAction(member, 'remove')}
                      >
                        <Text style={styles.actionBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {currentUserIsAdmin && member.id !== meData?.id && (member.familyRole === 'member' || member.role === 'member') && (
                    <TouchableOpacity
                      style={styles.transferBtn}
                      onPress={() => handleMemberAction(member, 'transfer')}
                    >
                      <Text style={styles.transferBtnText}>Transférer admin</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* INVITATIONS */}
        {activeTab === 'invitations' && (
          <View>
            {invitations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✉️</Text>
                <Text style={styles.emptyText}>Aucune invitation en attente</Text>
                {currentUserIsAdmin && (
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => { setGeneratedCode(null); setInviteEmail(''); setShowInviteModal(true); }}
                  >
                    <Text style={styles.emptyBtnText}>Inviter un membre</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              invitations.map((inv: any) => (
                <View key={inv.id} style={styles.invitationCard}>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.invitationEmail}>{inv.email}</Text>
                    <Text style={styles.invitationRole}>{inv.role === 'admin' ? '👑 Admin' : '👤 Membre'}</Text>
                    <View style={styles.codeRow}>
                      <Text style={styles.invitationCode} numberOfLines={1} adjustsFontSizeToFit>{inv.invitationCode}</Text>
                      <TouchableOpacity onPress={() => handleCopyCode(inv.invitationCode)} style={styles.copyBtn}>
                        <Text style={styles.copyBtnText}>📋</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleShareCode(inv.invitationCode)} style={styles.copyBtn}>
                        <Text style={styles.copyBtnText}>📤</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {currentUserIsAdmin && (
                    <TouchableOpacity
                      style={styles.deleteInvBtn}
                      onPress={() => Alert.alert(
                        'Supprimer',
                        'Supprimer cette invitation ?',
                        [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Supprimer', style: 'destructive', onPress: () => deleteInvitationMutation.mutate({ invitationId: inv.id }) },
                        ]
                      )}
                    >
                      <Text style={styles.deleteInvBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL INVITATION */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Inviter un membre</Text>

            {!generatedCode ? (
              <>
                <Text style={styles.modalLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="email@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.modalLabel}>Rôle</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, inviteRole === 'member' && styles.roleBtnActive]}
                    onPress={() => setInviteRole('member')}
                  >
                    <Text style={[styles.roleBtnText, inviteRole === 'member' && styles.roleBtnTextActive]}>👤 Membre</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, inviteRole === 'admin' && styles.roleBtnActive]}
                    onPress={() => setInviteRole('admin')}
                  >
                    <Text style={[styles.roleBtnText, inviteRole === 'admin' && styles.roleBtnTextActive]}>👑 Admin</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInviteModal(false)}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, (!inviteEmail.trim() || inviteMutation.isPending) && styles.confirmBtnDisabled]}
                    onPress={handleInvite}
                    disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  >
                    <Text style={styles.confirmBtnText}>{inviteMutation.isPending ? '...' : 'Inviter'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>✅ Invitation créée !</Text>
                </View>
                <Text style={styles.modalLabel}>Code d'invitation</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeBoxText} numberOfLines={1} adjustsFontSizeToFit>{generatedCode}</Text>
                  <TouchableOpacity onPress={() => handleCopyCode(generatedCode)} style={styles.copyBtn}>
                    <Text style={styles.copyBtnText}>📋</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.shareFullBtn} onPress={() => handleShareCode(generatedCode)}>
                  <Text style={styles.shareFullBtnText}>📤 Partager via WhatsApp / SMS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowInviteModal(false); setGeneratedCode(null); setInviteEmail(''); }}>
                  <Text style={styles.cancelBtnText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL RÔLE */}
      <Modal visible={showRoleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer le rôle</Text>
            <Text style={styles.modalSubtitle}>{selectedMember?.name}</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleBtn, styles.roleBtnActive]}
                onPress={() => selectedMember && activeFamily && updateRoleMutation.mutate({ userId: selectedMember.id, familyId: activeFamily.id, role: 'member' })}
              >
                <Text style={styles.roleBtnTextActive}>👤 Membre</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, styles.roleBtnActive]}
                onPress={() => selectedMember && activeFamily && updateRoleMutation.mutate({ userId: selectedMember.id, familyId: activeFamily.id, role: 'admin' })}
              >
                <Text style={styles.roleBtnTextActive}>👑 Admin</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRoleModal(false)}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL COULEUR */}
      <Modal visible={showColorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Couleur de {selectedMember?.name}</Text>
            <View style={styles.colorGrid}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && styles.colorSwatchSelected]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowColorModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => selectedMember && updateColorMutation.mutate({ userId: selectedMember.id, color: selectedColor })}
              >
                <Text style={styles.confirmBtnText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SUPPRIMER MEMBRE */}
      <Modal visible={showRemoveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Retirer le membre</Text>
            <Text style={styles.modalSubtitle}>Voulez-vous retirer {selectedMember?.name} de la famille ?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRemoveModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnDanger]}
                onPress={() => selectedMember && removeMutation.mutate({ userId: selectedMember.id })}
              >
                <Text style={styles.confirmBtnText}>Retirer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL TRANSFERT ADMIN */}
      <Modal visible={showTransferModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transférer les droits admin</Text>
            <Text style={styles.modalSubtitle}>
              Transférer les droits d'administrateur à {selectedMember?.name} ? Vous deviendrez membre.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTransferModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => selectedMember && activeFamily && transferMutation.mutate({ newAdminUserId: selectedMember.id, familyId: activeFamily.id })}
              >
                <Text style={styles.confirmBtnText}>Transférer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  pageTitleContainer: { paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  familyBanner: { backgroundColor: '#ede9fe', paddingHorizontal: 16, paddingVertical: 8 },
  familyName: { fontSize: 14, fontWeight: '600', color: '#5b21b6', marginBottom: 2 },
  familyCodeRow: { flexDirection: 'row', alignItems: 'center' },
  familyCodeLabel: { fontSize: 12, color: '#7c3aed' },
  familyCode: { fontSize: 12, color: '#7c3aed', fontWeight: '600', flex: 1 },
  familyCodeCopy: { padding: 4 },
  familyCodeCopyText: { fontSize: 14 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center', paddingHorizontal: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText: { fontSize: 13, color: '#6b7280' },
  tabTextActive: { color: '#7c3aed', fontWeight: '600' },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 22 },
  content: { flex: 1, padding: 12 },
  memberCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, flexWrap: 'wrap' },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  memberInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  memberEmoji: { fontSize: 22 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  memberEmail: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  memberRole: { fontSize: 12, color: '#7c3aed', marginTop: 2 },
  memberActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  actionBtnDanger: { backgroundColor: '#fee2e2' },
  actionBtnText: { fontSize: 14 },
  transferBtn: { width: '100%', marginTop: 6, paddingLeft: 54 },
  transferBtnText: { fontSize: 11, color: '#7c3aed', textDecorationLine: 'underline' },
  invitationCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  invitationInfo: { flex: 1 },
  invitationEmail: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  invitationRole: { fontSize: 12, color: '#7c3aed', marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  invitationCode: { fontSize: 11, color: '#6b7280', flex: 1 },
  copyBtn: { padding: 4 },
  copyBtnText: { fontSize: 16 },
  deleteInvBtn: { padding: 8 },
  deleteInvBtnText: { fontSize: 18 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', padding: 20 },
  emptyBtn: { marginTop: 16, backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#f9fafb' },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  roleBtnText: { color: '#374151', fontSize: 14 },
  roleBtnTextActive: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#7c3aed', alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnDanger: { backgroundColor: '#ef4444' },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
  successBanner: { backgroundColor: '#d1fae5', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 8 },
  successText: { color: '#065f46', fontWeight: '600' },
  codeBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, backgroundColor: '#f9fafb', gap: 8 },
  codeBoxText: { flex: 1, fontSize: 13, color: '#374151' },
  shareFullBtn: { marginTop: 12, backgroundColor: '#25D366', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  shareFullBtnText: { color: '#fff', fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginVertical: 16 },
  colorSwatch: { width: 44, height: 44, borderRadius: 22 },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#1f2937' },
});
