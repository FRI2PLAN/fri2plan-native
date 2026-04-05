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
  Switch,
} from 'react-native';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';

interface MembersScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const COLORS = ['#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'];
const FAMILY_EMOJIS = ['👨‍👩‍👧‍👦', '🏠', '⭐', '🌟', '🎯', '🌈', '🦁', '🐻', '🦊', '🐺', '🌺', '🎪', '🏆', '🎭', '🎨'];

export default function MembersScreen({ onNavigate, onPrevious, onNext }: MembersScreenProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'circles'>('members');

  // Modales membres
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Modales famille
  const [showEditFamilyModal, setShowEditFamilyModal] = useState(false);
  const [showNewCircleModal, setShowNewCircleModal] = useState(false);
  const [showJoinCircleModal, setShowJoinCircleModal] = useState(false);

  // Formulaires
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');

  // Formulaire édition famille
  const [familyName, setFamilyName] = useState('');
  const [familyColor, setFamilyColor] = useState('#8B5CF6');
  const [familyEmoji, setFamilyEmoji] = useState('👨‍👩‍👧‍👦');

  // Formulaire nouveau cercle
  const [newCircleName, setNewCircleName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Cercle actif sélectionné
  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);

  const utils = trpc.useUtils();
  const { data: meData } = trpc.auth.me.useQuery();
  const { data: families = [] } = trpc.family.list.useQuery();
  const activeFamily = (families as any[])[activeFamilyIndex] || (families as any[])[0];

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
    const me = (members as any[]).find((m: any) => m.id === meData.id);
    return me?.familyRole === 'admin' || me?.role === 'admin' || meData.role === 'admin';
  }, [meData, members]);

  // Mutations
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

  const updateFamilyMutation = trpc.family.update.useMutation({
    onSuccess: () => {
      utils.family.list.invalidate();
      setShowEditFamilyModal(false);
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const createFamilyMutation = trpc.family.create.useMutation({
    onSuccess: () => {
      utils.family.list.invalidate();
      setShowNewCircleModal(false);
      setNewCircleName('');
      Alert.alert('✅', 'Nouveau cercle créé !');
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const joinFamilyMutation = trpc.family.join.useMutation({
    onSuccess: () => {
      utils.family.list.invalidate();
      setShowJoinCircleModal(false);
      setJoinCode('');
      Alert.alert('✅', 'Vous avez rejoint le cercle !');
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  // Handlers
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

  const handleOpenEditFamily = () => {
    if (!activeFamily) return;
    setFamilyName(activeFamily.name || '');
    setFamilyColor(activeFamily.familyColor || '#8B5CF6');
    setFamilyEmoji('👨‍👩‍👧‍👦');
    setShowEditFamilyModal(true);
  };

  const handleSaveFamily = () => {
    if (!familyName.trim() || !activeFamily) return;
    updateFamilyMutation.mutate({
      familyId: activeFamily.id,
      name: familyName.trim(),
      familyColor: familyColor,
    });
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

  const isMemberAdmin = (member: any) => member.familyRole === 'admin' || member.role === 'admin';

  return (
    <View style={styles.container}>
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Cercles</Text>
      </View>

      {/* Sélecteur de cercle si plusieurs familles */}
      {(families as any[]).length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.circleSelector}>
          {(families as any[]).map((fam: any, idx: number) => (
            <TouchableOpacity
              key={fam.id}
              style={[styles.circleSelectorItem, idx === activeFamilyIndex && styles.circleSelectorItemActive]}
              onPress={() => setActiveFamilyIndex(idx)}
            >
              <Text style={[styles.circleSelectorText, idx === activeFamilyIndex && styles.circleSelectorTextActive]}>
                {fam.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Family Info Banner */}
      {activeFamily && (
        <View style={[styles.familyBanner, { borderLeftColor: activeFamily.familyColor || '#8B5CF6' }]}>
          <View style={styles.familyBannerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.familyName}>👨‍👩‍👧‍👦 {activeFamily.name}</Text>
              <View style={styles.familyCodeRow}>
                <Text style={styles.familyCodeLabel}>Code : </Text>
                <Text style={styles.familyCode} numberOfLines={1} adjustsFontSizeToFit>{activeFamily.inviteCode}</Text>
                <TouchableOpacity onPress={() => handleCopyCode(activeFamily.inviteCode)} style={styles.familyCodeCopy}>
                  <Text style={styles.familyCodeCopyText}>📋</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleShareCode(activeFamily.inviteCode)} style={styles.familyCodeCopy}>
                  <Text style={styles.familyCodeCopyText}>📤</Text>
                </TouchableOpacity>
              </View>
            </View>
            {currentUserIsAdmin && (
              <TouchableOpacity style={styles.editFamilyBtn} onPress={handleOpenEditFamily}>
                <Text style={styles.editFamilyBtnText}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            👥 Membres ({(members as any[]).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invitations' && styles.tabActive]}
          onPress={() => setActiveTab('invitations')}
        >
          <Text style={[styles.tabText, activeTab === 'invitations' && styles.tabTextActive]}>
            ✉️ Invitations ({(invitations as any[]).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'circles' && styles.tabActive]}
          onPress={() => setActiveTab('circles')}
        >
          <Text style={[styles.tabText, activeTab === 'circles' && styles.tabTextActive]}>
            🔵 Cercles
          </Text>
        </TouchableOpacity>
        {currentUserIsAdmin && activeTab === 'members' && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setGeneratedCode(null); setInviteEmail(''); setShowInviteModal(true); }}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── ONGLET MEMBRES ── */}
        {activeTab === 'members' && (
          <View>
            {isLoading ? (
              <Text style={styles.emptyText}>Chargement...</Text>
            ) : (members as any[]).length === 0 ? (
              <Text style={styles.emptyText}>Aucun membre</Text>
            ) : (
              (members as any[]).map((member: any) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={[styles.memberAvatar, { backgroundColor: getMemberColor(member) }]}>
                    <Text style={isEmojiAvatar(member) ? styles.memberEmoji : styles.memberInitial}>
                      {getAvatarDisplay(member)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {isMemberAdmin(member) && <Text style={styles.adminBadge}>👑</Text>}
                    </View>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                    <Text style={styles.memberRole}>{getRoleLabel(member)}</Text>
                  </View>
                  {currentUserIsAdmin && member.id !== meData?.id && (
                    <View style={styles.memberActionsCol}>
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
                      {!isMemberAdmin(member) && (
                        <TouchableOpacity
                          style={styles.transferBtn}
                          onPress={() => handleMemberAction(member, 'transfer')}
                        >
                          <Text style={styles.transferBtnText}>⚡ Transférer admin</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── ONGLET INVITATIONS ── */}
        {activeTab === 'invitations' && (
          <View>
            {(invitations as any[]).length === 0 ? (
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
              (invitations as any[]).map((inv: any) => (
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

        {/* ── ONGLET CERCLES ── */}
        {activeTab === 'circles' && (
          <View>
            <Text style={styles.sectionTitle}>Mes cercles ({(families as any[]).length})</Text>

            {(families as any[]).map((fam: any, idx: number) => (
              <TouchableOpacity
                key={fam.id}
                style={[styles.circleCard, idx === activeFamilyIndex && styles.circleCardActive]}
                onPress={() => { setActiveFamilyIndex(idx); setActiveTab('members'); }}
              >
                <View style={[styles.circleColorDot, { backgroundColor: fam.familyColor || '#8B5CF6' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.circleName}>{fam.name}</Text>
                  <Text style={styles.circleCode}>Code : {fam.inviteCode}</Text>
                </View>
                {idx === activeFamilyIndex && <Text style={styles.circleActiveBadge}>✓ Actif</Text>}
              </TouchableOpacity>
            ))}

            <View style={styles.circleActions}>
              <TouchableOpacity
                style={styles.circleActionBtn}
                onPress={() => { setNewCircleName(''); setShowNewCircleModal(true); }}
              >
                <Text style={styles.circleActionBtnText}>➕ Créer un cercle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.circleActionBtn, styles.circleActionBtnSecondary]}
                onPress={() => { setJoinCode(''); setShowJoinCircleModal(true); }}
              >
                <Text style={styles.circleActionBtnTextSecondary}>🔗 Rejoindre un cercle</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODAL INVITATION ── */}
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

      {/* ── MODAL RÔLE ── */}
      <Modal visible={showRoleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer le rôle</Text>
            <Text style={styles.modalSubtitle}>{selectedMember?.name}</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleBtn, (selectedMember?.familyRole === 'member' || selectedMember?.role === 'member') && styles.roleBtnActive]}
                onPress={() => selectedMember && activeFamily && updateRoleMutation.mutate({ userId: selectedMember.id, familyId: activeFamily.id, role: 'member' })}
              >
                <Text style={[styles.roleBtnText, (selectedMember?.familyRole === 'member' || selectedMember?.role === 'member') && styles.roleBtnTextActive]}>👤 Membre</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, (selectedMember?.familyRole === 'admin' || selectedMember?.role === 'admin') && styles.roleBtnActive]}
                onPress={() => selectedMember && activeFamily && updateRoleMutation.mutate({ userId: selectedMember.id, familyId: activeFamily.id, role: 'admin' })}
              >
                <Text style={[styles.roleBtnText, (selectedMember?.familyRole === 'admin' || selectedMember?.role === 'admin') && styles.roleBtnTextActive]}>👑 Admin</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRoleModal(false)}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL COULEUR MEMBRE ── */}
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

      {/* ── MODAL SUPPRIMER MEMBRE ── */}
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

      {/* ── MODAL TRANSFERT ADMIN ── */}
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

      {/* ── MODAL ÉDITION FAMILLE ── */}
      <Modal visible={showEditFamilyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier le cercle</Text>

            <Text style={styles.modalLabel}>Nom du cercle</Text>
            <TextInput
              style={styles.input}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="Nom de la famille"
            />

            <Text style={styles.modalLabel}>Couleur du cercle</Text>
            <View style={styles.colorGrid}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, familyColor === color && styles.colorSwatchSelected]}
                  onPress={() => setFamilyColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditFamilyModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!familyName.trim() || updateFamilyMutation.isPending) && styles.confirmBtnDisabled]}
                onPress={handleSaveFamily}
                disabled={!familyName.trim() || updateFamilyMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>{updateFamilyMutation.isPending ? '...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL NOUVEAU CERCLE ── */}
      <Modal visible={showNewCircleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer un nouveau cercle</Text>
            <Text style={styles.modalSubtitle}>Créez un cercle séparé (ex: travail, amis, club...)</Text>

            <Text style={styles.modalLabel}>Nom du cercle</Text>
            <TextInput
              style={styles.input}
              value={newCircleName}
              onChangeText={setNewCircleName}
              placeholder="Ex: Famille, Amis, Travail..."
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewCircleModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!newCircleName.trim() || createFamilyMutation.isPending) && styles.confirmBtnDisabled]}
                onPress={() => newCircleName.trim() && createFamilyMutation.mutate({ name: newCircleName.trim() })}
                disabled={!newCircleName.trim() || createFamilyMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>{createFamilyMutation.isPending ? '...' : 'Créer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL REJOINDRE CERCLE ── */}
      <Modal visible={showJoinCircleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejoindre un cercle</Text>
            <Text style={styles.modalSubtitle}>Entrez le code d'invitation du cercle</Text>

            <Text style={styles.modalLabel}>Code d'invitation</Text>
            <TextInput
              style={styles.input}
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Code d'invitation"
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowJoinCircleModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!joinCode.trim() || joinFamilyMutation.isPending) && styles.confirmBtnDisabled]}
                onPress={() => joinCode.trim() && joinFamilyMutation.mutate({ inviteCode: joinCode.trim() })}
                disabled={!joinCode.trim() || joinFamilyMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>{joinFamilyMutation.isPending ? '...' : 'Rejoindre'}</Text>
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

  // Sélecteur de cercle
  circleSelector: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', maxHeight: 44 },
  circleSelectorItem: { paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 2 },
  circleSelectorItemActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  circleSelectorText: { fontSize: 13, color: '#6b7280' },
  circleSelectorTextActive: { color: '#7c3aed', fontWeight: '600' },

  // Banner famille
  familyBanner: { backgroundColor: '#ede9fe', paddingHorizontal: 16, paddingVertical: 10, borderLeftWidth: 4, borderLeftColor: '#8B5CF6' },
  familyBannerRow: { flexDirection: 'row', alignItems: 'center' },
  familyName: { fontSize: 14, fontWeight: '700', color: '#5b21b6', marginBottom: 2 },
  familyCodeRow: { flexDirection: 'row', alignItems: 'center' },
  familyCodeLabel: { fontSize: 12, color: '#7c3aed' },
  familyCode: { fontSize: 12, color: '#7c3aed', fontWeight: '600', flex: 1 },
  familyCodeCopy: { padding: 4 },
  familyCodeCopyText: { fontSize: 14 },
  editFamilyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  editFamilyBtnText: { fontSize: 18 },

  // Tabs
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center', paddingHorizontal: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText: { fontSize: 11, color: '#6b7280' },
  tabTextActive: { color: '#7c3aed', fontWeight: '600' },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 22 },

  // Content
  content: { flex: 1, padding: 12 },

  // Member card
  memberCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0 },
  memberInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  memberEmoji: { fontSize: 22 },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  adminBadge: { fontSize: 14 },
  memberEmail: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  memberRole: { fontSize: 12, color: '#7c3aed', marginTop: 2 },
  memberActionsCol: { alignItems: 'flex-end', gap: 4 },
  memberActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  actionBtnDanger: { backgroundColor: '#fee2e2' },
  actionBtnText: { fontSize: 14 },
  transferBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#ede9fe', borderRadius: 6 },
  transferBtnText: { fontSize: 10, color: '#7c3aed', fontWeight: '600' },

  // Invitation card
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

  // Circles tab
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 12, marginTop: 4 },
  circleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  circleCardActive: { borderWidth: 2, borderColor: '#7c3aed' },
  circleColorDot: { width: 16, height: 16, borderRadius: 8, marginRight: 12 },
  circleName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  circleCode: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  circleActiveBadge: { fontSize: 12, color: '#7c3aed', fontWeight: '600' },
  circleActions: { gap: 10, marginTop: 8 },
  circleActionBtn: { backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  circleActionBtnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#7c3aed' },
  circleActionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  circleActionBtnTextSecondary: { color: '#7c3aed', fontWeight: '700', fontSize: 15 },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', padding: 20 },
  emptyBtn: { marginTop: 16, backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },

  // Modal
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
