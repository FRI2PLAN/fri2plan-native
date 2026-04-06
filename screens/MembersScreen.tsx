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
} from 'react-native';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';

interface MembersScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const COLORS = ['#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'];

// Vue principale de l'écran
type MainView = 'circles' | 'circle_detail';

export default function MembersScreen({ onNavigate, onPrevious, onNext }: MembersScreenProps) {
  const { user } = useAuth();

  // Vue principale : liste des cercles ou détail d'un cercle
  const [mainView, setMainView] = useState<MainView>('circles');
  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);

  // Onglet dans le détail d'un cercle
  const [detailTab, setDetailTab] = useState<'members' | 'invitations'>('members');

  // Modales membres
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

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

  // Formulaire édition profil (tous les users)
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#8B5CF6');
  const [profileAvatarType, setProfileAvatarType] = useState<'emoji' | 'initials'>('initials');
  const [profileAvatarValue, setProfileAvatarValue] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Formulaire nouveau cercle
  const [newCircleName, setNewCircleName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const utils = trpc.useUtils();
  const { data: meData } = trpc.auth.me.useQuery();
  const { data: families = [] } = trpc.family.list.useQuery();
  const activeFamily = (families as any[])[activeFamilyIndex] || (families as any[])[0];

  const { data: members = [], isLoading } = trpc.family.members.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );

  const { data: allInvitations = [] } = trpc.invitations.list.useQuery(
    undefined,
    { enabled: !!activeFamily }
  );

  // Filtrer uniquement les invitations en attente (pending)
  const pendingInvitations = useMemo(() =>
    (allInvitations as any[]).filter((inv: any) => inv.status === 'pending'),
    [allInvitations]
  );

  const currentUserIsAdmin = useMemo(() => {
    if (!meData || !(members as any[]).length) return false;
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

  const updateNameMutation = trpc.members.updateName.useMutation({
    onSuccess: () => {
      utils.family.members.invalidate();
      utils.auth.me.invalidate();
      setShowEditProfileModal(false);
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });

  const updateProfileColorMutation = trpc.members.updateColor.useMutation({
    onSuccess: () => {
      utils.family.members.invalidate();
      setShowEditProfileModal(false);
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

  const updateAvatarMutation = trpc.avatar.updateAvatar.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      utils.family.members.invalidate();
    },
    onError: (err: any) => Alert.alert('Erreur', err.message),
  });
  const leaveFamilyMutation = trpc.members.remove.useMutation({
    onSuccess: () => {
      utils.family.list.invalidate();
      setShowLeaveConfirm(false);
      setMainView('circles');
      Alert.alert('✅', 'Vous avez quitté ce cercle.');
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
  const handleCopyCode = async (code: string) => {
    try {
      await Share.share({ message: code, title: "Code d'invitation" });
    } catch {
      Alert.alert('Code', code);
    }
  };

  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Rejoins notre famille sur FRI2PLAN ! 🎉\n\nCode d'invitation : ${code}`,
        title: 'Invitation FRI2PLAN',
      });
    } catch (e) {}
  };

  const handleInvite = () => {
    if (!inviteEmail.trim() || !activeFamily) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), familyId: activeFamily.id, role: inviteRole });
  };

  const handleOpenCircleDetail = (idx: number) => {
    setActiveFamilyIndex(idx);
    setDetailTab('members');
    setMainView('circle_detail');
  };

  const handleOpenEditFamily = () => {
    if (!activeFamily) return;
    setFamilyName(activeFamily.name || '');
    setFamilyColor(activeFamily.familyColor || '#8B5CF6');
    setShowEditFamilyModal(true);
  };

  const handleOpenEditProfile = () => {
    setProfileName(meData?.name || '');
    const me = (members as any[]).find((m: any) => m.id === meData?.id);
    setProfileColor(me?.userColor || meData?.userColor || '#8B5CF6');
    const avatarType = (meData as any)?.avatarType || 'initials';
    const avatarValue = (meData as any)?.avatarValue || '';
    setProfileAvatarType(avatarType === 'emoji' ? 'emoji' : 'initials');
    setProfileAvatarValue(avatarValue);
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = () => {
    if (!profileName.trim() || !meData) return;
    // Sauvegarder nom si modifié
    if (profileName.trim() !== meData.name) {
      updateNameMutation.mutate({ userId: meData.id, name: profileName.trim() });
    }
    // Sauvegarder couleur
    updateProfileColorMutation.mutate({ userId: meData.id, color: profileColor });
    // Sauvegarder avatar si modifié
    const currentAvatarType = (meData as any)?.avatarType || 'initials';
    const currentAvatarValue = (meData as any)?.avatarValue || '';
    if (profileAvatarType !== currentAvatarType || profileAvatarValue !== currentAvatarValue) {
      updateAvatarMutation.mutate({ type: profileAvatarType, value: profileAvatarValue || undefined });
    }
  };
  const handleLeaveCircle = () => {
    if (!meData || !activeFamily) return;
    if (currentUserIsAdmin) {
      const adminCount = (members as any[]).filter((m: any) => isMemberAdmin(m)).length;
      if (adminCount <= 1) {
        Alert.alert(
          '⚠️ Impossible de quitter',
          'Vous êtes le seul admin. Transférez d\'abord le rôle admin à un autre membre.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setShowLeaveConfirm(true);
  };

  const handleRemoveMember = (member: any) => {
    if (isMemberAdmin(member)) {
      Alert.alert(
        '⚠️ Action impossible',
        'Vous devez d\'abord transférer le rôle admin à un autre membre avant de retirer cet administrateur.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedMember(member);
    setShowRemoveModal(true);
  };

  const getMemberColor = (member: any) => member.userColor || '#8B5CF6';

  const getAvatarDisplay = (member: any) => {
    if (member.avatarType === 'emoji' || member.avatarType === 'icon') return member.avatarValue || '👤';
    return member.name?.charAt(0).toUpperCase() || '?';
  };

  const isEmojiAvatar = (member: any) => member.avatarType === 'emoji' || member.avatarType === 'icon';
  const isMemberAdmin = (member: any) => member.familyRole === 'admin' || member.role === 'admin';

  // ── VUE LISTE DES CERCLES ──
  if (mainView === 'circles') {
    return (
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Cercles</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Cartes cercles */}
          {(families as any[]).map((fam: any, idx: number) => (
            <TouchableOpacity
              key={fam.id}
              style={styles.circleCard}
              onPress={() => handleOpenCircleDetail(idx)}
              activeOpacity={0.75}
            >
              <View style={[styles.circleColorBar, { backgroundColor: fam.familyColor || '#8B5CF6' }]} />
              <View style={styles.circleCardBody}>
                <Text style={styles.circleName}>{fam.name}</Text>
                <Text style={styles.circleCode}>Code : {fam.inviteCode}</Text>
              </View>
              <Text style={styles.circleArrow}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Actions */}
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

          <View style={{ height: 40 }} />
        </ScrollView>

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

  // ── VUE DÉTAIL D'UN CERCLE ──
  return (
    <View style={styles.container}>
      {/* Header avec retour */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => setMainView('circles')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle} numberOfLines={1}>{activeFamily?.name || 'Cercle'}</Text>
        {/* Icônes actions — taille uniforme 22 */}
        <View style={styles.headerActions}>
          {/* Modifier profil (tous les users) */}
          <TouchableOpacity onPress={handleOpenEditProfile} style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>👤</Text>
          </TouchableOpacity>
          {/* Modifier le cercle (admin seulement) */}
          {currentUserIsAdmin && (
            <TouchableOpacity onPress={handleOpenEditFamily} style={styles.headerIconBtn}>
              <Text style={styles.headerIcon}>✏️</Text>
            </TouchableOpacity>
          )}
          {/* Partager le code */}
          <TouchableOpacity onPress={() => handleShareCode(activeFamily?.inviteCode || '')} style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Membres / Invitations */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, detailTab === 'members' && styles.tabActive]}
          onPress={() => setDetailTab('members')}
        >
          <Text style={[styles.tabText, detailTab === 'members' && styles.tabTextActive]}>
            👥 Membres ({(members as any[]).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, detailTab === 'invitations' && styles.tabActive]}
          onPress={() => setDetailTab('invitations')}
        >
          <Text style={[styles.tabText, detailTab === 'invitations' && styles.tabTextActive]}>
            ✉️ Invitations{pendingInvitations.length > 0 ? ` (${pendingInvitations.length})` : ''}
          </Text>
        </TouchableOpacity>
        {currentUserIsAdmin && detailTab === 'members' && (
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
        {detailTab === 'members' && (
          <View>
            {isLoading ? (
              <Text style={styles.emptyText}>Chargement...</Text>
            ) : (members as any[]).length === 0 ? (
              <Text style={styles.emptyText}>Aucun membre</Text>
            ) : (
              (members as any[]).map((member: any) => {
                const isMe = member.id === meData?.id;
                const isAdmin = isMemberAdmin(member);
                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={[styles.memberAvatar, { backgroundColor: getMemberColor(member) }]}>
                      <Text style={isEmojiAvatar(member) ? styles.memberEmoji : styles.memberInitial}>
                        {getAvatarDisplay(member)}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {isAdmin && <Text style={styles.adminBadge}>👑</Text>}
                        {isMe && <Text style={styles.meBadge}>moi</Text>}
                      </View>
                      <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
                      <Text style={styles.memberRole}>{isAdmin ? '👑 Admin' : '👤 Membre'}</Text>
                    </View>
                    <View style={styles.memberActionsCol}>
                      {/* Modifier son propre profil */}
                      {isMe && (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleOpenEditProfile}>
                          <Text style={styles.actionBtnText}>✏️</Text>
                        </TouchableOpacity>
                      )}
                      {/* Actions admin sur les autres */}
                      {currentUserIsAdmin && !isMe && (
                        <View style={styles.memberActions}>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => { setSelectedMember(member); setShowRoleModal(true); }}
                          >
                            <Text style={styles.actionBtnText}>🔑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => { setSelectedMember(member); setSelectedColor(member.userColor || '#8B5CF6'); setShowColorModal(true); }}
                          >
                            <Text style={styles.actionBtnText}>🎨</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, isAdmin && styles.actionBtnDisabled]}
                            onPress={() => handleRemoveMember(member)}
                          >
                            <Text style={styles.actionBtnText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {/* Transférer admin */}
                      {currentUserIsAdmin && !isMe && !isAdmin && (
                        <TouchableOpacity
                          style={styles.transferBtn}
                          onPress={() => { setSelectedMember(member); setShowTransferModal(true); }}
                        >
                          <Text style={styles.transferBtnText}>⚡ Admin</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── ONGLET INVITATIONS ── */}
        {detailTab === 'invitations' && (
          <View>
            {pendingInvitations.length === 0 ? (
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
              pendingInvitations.map((inv: any) => (
                <View key={inv.id} style={styles.invitationCard}>
                  {/* Ligne principale : email + rôle + actions sur la même ligne */}
                  <View style={styles.invitationRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invitationEmail} numberOfLines={1}>{inv.email}</Text>
                      <Text style={styles.invitationCode} numberOfLines={1}>{inv.invitationCode}</Text>
                    </View>
                    <Text style={styles.invitationRole}>{inv.role === 'admin' ? '👑' : '👤'}</Text>
                    <TouchableOpacity onPress={() => handleCopyCode(inv.invitationCode)} style={styles.invActionBtn}>
                      <Text style={styles.invActionIcon}>📋</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleShareCode(inv.invitationCode)} style={styles.invActionBtn}>
                      <Text style={styles.invActionIcon}>📤</Text>
                    </TouchableOpacity>
                    {currentUserIsAdmin && (
                      <TouchableOpacity
                        style={styles.invActionBtn}
                        onPress={() => Alert.alert(
                          'Supprimer',
                          'Supprimer cette invitation ?',
                          [
                            { text: 'Annuler', style: 'cancel' },
                            { text: 'Supprimer', style: 'destructive', onPress: () => deleteInvitationMutation.mutate({ invitationId: inv.id }) },
                          ]
                        )}
                      >
                        <Text style={styles.invActionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Bouton Quitter ce cercle */}
        <View style={styles.leaveSection}>
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveCircle}>
            <Text style={styles.leaveBtnText}>🚪 Quitter ce cercle</Text>
          </TouchableOpacity>
        </View>
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
                  <TouchableOpacity onPress={() => handleCopyCode(generatedCode)} style={styles.invActionBtn}>
                    <Text style={styles.invActionIcon}>📋</Text>
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

      {/* ── MODAL ÉDITION PROFIL (tous les users) ── */}
      <Modal visible={showEditProfileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Mon profil</Text>
            {/* Aperçu avatar */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.memberAvatar, { width: 56, height: 56, borderRadius: 28, backgroundColor: profileColor }]}>
                <Text style={{ fontSize: profileAvatarType === 'emoji' && profileAvatarValue ? 28 : 22, color: '#fff', fontWeight: 'bold' }}>
                  {profileAvatarType === 'emoji' && profileAvatarValue ? profileAvatarValue : (meData?.name?.charAt(0).toUpperCase() || '?')}
                </Text>
              </View>
            </View>
            <Text style={styles.modalLabel}>Nom affiché</Text>
            <TextInput
              style={styles.input}
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Votre nom"
            />
            <Text style={styles.modalLabel}>Mon avatar</Text>
            <View style={styles.avatarTypeRow}>
              <TouchableOpacity
                style={[styles.avatarTypeBtn, profileAvatarType === 'initials' && styles.avatarTypeBtnActive]}
                onPress={() => setProfileAvatarType('initials')}
              >
                <Text style={[styles.avatarTypeBtnText, profileAvatarType === 'initials' && styles.avatarTypeBtnTextActive]}>Initiales</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.avatarTypeBtn, profileAvatarType === 'emoji' && styles.avatarTypeBtnActive]}
                onPress={() => setProfileAvatarType('emoji')}
              >
                <Text style={[styles.avatarTypeBtnText, profileAvatarType === 'emoji' && styles.avatarTypeBtnTextActive]}>Emoji</Text>
              </TouchableOpacity>
            </View>
            {profileAvatarType === 'emoji' && (
              <View>
                <View style={styles.emojiGrid}>
                  {['😀','😎','🦁','🐻','🦊','🐼','🦋','🌟','🎯','🏆','💜','🌈','🍀','🦄','🐉','🎭','🚀','⚡','🎸','🌺'].map(emoji => (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.emojiBtn, profileAvatarValue === emoji && styles.emojiBtnSelected]}
                      onPress={() => setProfileAvatarValue(emoji)}
                    >
                      <Text style={styles.emojiBtnText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <Text style={styles.modalLabel}>Ma couleur</Text>
            <View style={styles.colorGrid}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, profileColor === color && styles.colorSwatchSelected]}
                  onPress={() => setProfileColor(color)}
                />
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditProfileModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!profileName.trim() || updateNameMutation.isPending || updateProfileColorMutation.isPending || updateAvatarMutation.isPending) && styles.confirmBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={!profileName.trim() || updateNameMutation.isPending || updateProfileColorMutation.isPending || updateAvatarMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>{(updateNameMutation.isPending || updateProfileColorMutation.isPending || updateAvatarMutation.isPending) ? '...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      {/* ── MODAL CONFIRMATION QUITTER CERCLE ── */}
      <Modal visible={showLeaveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quitter ce cercle ?</Text>
            <Text style={styles.modalSubtitle}>
              Vous allez quitter « {activeFamily?.name} ». Vous ne verrez plus les données de ce cercle.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLeaveConfirm(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: '#ef4444' }, leaveFamilyMutation.isPending && styles.confirmBtnDisabled]}
                onPress={() => meData && leaveFamilyMutation.mutate({ userId: meData.id })}
                disabled={leaveFamilyMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>{leaveFamilyMutation.isPending ? '...' : 'Quitter'}</Text>
              </TouchableOpacity>
            </View>
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
                style={[styles.roleBtn, !isMemberAdmin(selectedMember || {}) && styles.roleBtnActive]}
                onPress={() => selectedMember && activeFamily && updateRoleMutation.mutate({ userId: selectedMember.id, familyId: activeFamily.id, role: 'member' })}
              >
                <Text style={[styles.roleBtnText, !isMemberAdmin(selectedMember || {}) && styles.roleBtnTextActive]}>👤 Membre</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, isMemberAdmin(selectedMember || {}) && styles.roleBtnActive]}
                onPress={() => selectedMember && activeFamily && updateRoleMutation.mutate({ userId: selectedMember.id, familyId: activeFamily.id, role: 'admin' })}
              >
                <Text style={[styles.roleBtnText, isMemberAdmin(selectedMember || {}) && styles.roleBtnTextActive]}>👑 Admin</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRoleModal(false)}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL COULEUR MEMBRE (admin) ── */}
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
                onPress={() => familyName.trim() && activeFamily && updateFamilyMutation.mutate({ familyId: activeFamily.id, name: familyName.trim(), familyColor })}
                disabled={!familyName.trim() || updateFamilyMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>{updateFamilyMutation.isPending ? '...' : 'Enregistrer'}</Text>
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

  // Header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { padding: 4, marginRight: 4 },
  backBtnText: { fontSize: 28, color: '#7c3aed', lineHeight: 32, fontWeight: '300' },
  pageTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#1f2937', textAlign: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerIconBtn: { padding: 6 },
  headerIcon: { fontSize: 18 },  // taille uniforme pour tous les icônes du header

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText: { fontSize: 12, color: '#6b7280' },
  tabTextActive: { color: '#7c3aed', fontWeight: '600' },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#7c3aed',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 4,
  },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 22 },

  // Content
  content: { flex: 1, padding: 12 },

  // Cercle card (vue liste)
  circleCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  circleColorBar: { width: 6, alignSelf: 'stretch' },
  circleCardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 16 },
  circleName: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  circleCode: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  circleArrow: { fontSize: 26, color: '#9ca3af', paddingRight: 14, fontWeight: '300' },

  circleActions: { gap: 10, marginTop: 4 },
  circleActionBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  circleActionBtnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#7c3aed' },
  circleActionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  circleActionBtnTextSecondary: { color: '#7c3aed', fontWeight: '700', fontSize: 15 },

  // Member card
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10, flexShrink: 0,
  },
  memberInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  memberEmoji: { fontSize: 22 },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  adminBadge: { fontSize: 14 },
  meBadge: {
    fontSize: 10, color: '#7c3aed', fontWeight: '600',
    backgroundColor: '#ede9fe', paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
  },
  memberEmail: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  memberRole: { fontSize: 11, color: '#7c3aed', marginTop: 2 },
  memberActionsCol: { alignItems: 'flex-end', gap: 4 },
  memberActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.35 },
  actionBtnText: { fontSize: 14 },
  transferBtn: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#ede9fe', borderRadius: 6 },
  transferBtnText: { fontSize: 10, color: '#7c3aed', fontWeight: '600' },

  // Invitation card — compacte, tout sur une ligne
  invitationCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  invitationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  invitationEmail: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  invitationCode: { fontSize: 10, color: '#9ca3af', marginTop: 1 },
  invitationRole: { fontSize: 16 },
  invActionBtn: { padding: 5 },
  invActionIcon: { fontSize: 16 },

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
  // Quitter cercle
  leaveSection: { marginTop: 24, marginHorizontal: 16, marginBottom: 8 },
  leaveBtn: { borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  leaveBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  // Avatar sélecteur
  avatarTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  avatarTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  avatarTypeBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  avatarTypeBtnText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  avatarTypeBtnTextActive: { color: '#fff' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginVertical: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  emojiBtnSelected: { borderColor: '#7c3aed', borderWidth: 2, backgroundColor: '#ede9fe' },
  emojiBtnText: { fontSize: 22 },
});
