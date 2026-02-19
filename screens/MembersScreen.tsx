import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';

interface MembersScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  familyId?: number;
}

export default function MembersScreen({ onNavigate, onPrevious, onNext, familyId: propFamilyId }: MembersScreenProps) {
  const { user } = useAuth();
  const { activeFamilyId } = useFamily();
  const { isDark } = useTheme();
  const familyId = propFamilyId || activeFamilyId;

  const [refreshing, setRefreshing] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedMemberRole, setSelectedMemberRole] = useState<'admin' | 'member'>('member');

  const utils = trpc.useUtils();
  
  const { data: members = [], isLoading } = trpc.family.members.useQuery(
    { familyId: familyId || 0 },
    { enabled: !!familyId }
  );

  const { data: families = [] } = trpc.family.list.useQuery();
  const currentFamily = families.find(f => f.id === familyId);

  // Vérifier si l'utilisateur est admin
  const currentUserIsAdmin = useMemo(() => {
    if (!user || !members.length) return false;
    const currentMember = members.find(m => m.id === user.id);
    return currentMember?.familyRole === 'admin';
  }, [user, members]);

  // Mutations
  const inviteMutation = trpc.members.invite.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Invitation envoyée !');
      setInviteEmail('');
      setInviteRole('member');
      setInviteModalVisible(false);
      utils.family.members.invalidate();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'invitation');
    },
  });

  const updateFamilyNameMutation = trpc.family.update.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Nom de la famille modifié !');
      setEditNameModalVisible(false);
      setNewFamilyName('');
      utils.family.list.invalidate();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de la modification');
    },
  });

  const updateRoleMutation = trpc.members.updateRole.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Rôle modifié !');
      setRoleModalVisible(false);
      setSelectedMemberId(null);
      utils.family.members.invalidate();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de la modification du rôle');
    },
  });

  const removeMemberMutation = trpc.members.remove.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Membre retiré de la famille');
      utils.family.members.invalidate();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de la suppression');
    },
  });

  const approveMemberMutation = trpc.family.approveMember.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Membre approuvé !');
      utils.family.members.invalidate();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'approbation');
    },
  });

  const rejectMemberMutation = trpc.family.rejectMember.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Membre rejeté');
      utils.family.members.invalidate();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors du rejet');
    },
  });

  // Handlers
  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email');
      return;
    }
    if (!familyId) {
      Alert.alert('Erreur', 'Aucune famille sélectionnée');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, familyId, role: inviteRole });
  };

  const handleUpdateFamilyName = () => {
    if (!newFamilyName.trim()) {
      Alert.alert('Erreur', 'Le nom de la famille est requis');
      return;
    }
    if (!familyId) {
      Alert.alert('Erreur', 'Aucune famille sélectionnée');
      return;
    }
    updateFamilyNameMutation.mutate({ familyId, name: newFamilyName.trim() });
  };

  const handleChangeRole = (memberId: number, currentRole: string) => {
    setSelectedMemberId(memberId);
    setSelectedMemberRole(currentRole as 'admin' | 'member');
    setRoleModalVisible(true);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedMemberId || !familyId) return;
    updateRoleMutation.mutate({
      memberId: selectedMemberId,
      familyId,
      role: selectedMemberRole,
    });
  };

  const handleRemoveMember = (memberId: number, memberName: string) => {
    if (!familyId) return;
    Alert.alert(
      'Confirmer',
      `Voulez-vous vraiment retirer ${memberName} de la famille ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => removeMemberMutation.mutate({ memberId, familyId }),
        },
      ]
    );
  };

  const handleApproveMember = (memberId: number) => {
    if (!familyId) return;
    approveMemberMutation.mutate({ memberId, familyId });
  };

  const handleRejectMember = (memberId: number) => {
    if (!familyId) return;
    rejectMemberMutation.mutate({ memberId, familyId });
  };

  const copyInviteCode = async () => {
    if (!currentFamily?.inviteCode) return;
    await Clipboard.setStringAsync(currentFamily.inviteCode);
    Alert.alert('✅', 'Code copié dans le presse-papier');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await utils.family.members.invalidate();
    await utils.family.list.invalidate();
    setRefreshing(false);
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrateur' : 'Membre';
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? '#7c3aed' : '#10b981';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  // Séparer les membres par statut
  const activeMembers = members.filter(m => m.status === 'active');
  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5dc' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={[styles.pageTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
          Gestion des membres
        </Text>
        <TouchableOpacity
          style={styles.tutorialButton}
          onPress={() => Alert.alert('Aide', 'Gérez les membres de votre cercle familial')}
        >
          <Ionicons name="help-circle" size={24} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      {/* Family Info Card */}
      {currentFamily && (
        <View style={[styles.familyCard, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
          <View style={styles.familyHeader}>
            <View style={styles.familyTitleRow}>
              <Ionicons name="people" size={24} color="#7c3aed" />
              <Text style={[styles.familyName, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                {currentFamily.name}
              </Text>
            </View>
            {currentUserIsAdmin && (
              <TouchableOpacity
                onPress={() => {
                  setNewFamilyName(currentFamily.name);
                  setEditNameModalVisible(true);
                }}
              >
                <Ionicons name="pencil" size={20} color="#7c3aed" />
              </TouchableOpacity>
            )}
          </View>

          {currentUserIsAdmin && (
            <View style={styles.inviteCodeSection}>
              <Text style={[styles.inviteCodeLabel, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                Code d'invitation
              </Text>
              <View style={styles.inviteCodeRow}>
                <View style={[styles.inviteCodeInput, { backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6' }]}>
                  <Text style={[styles.inviteCodeText, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                    {currentFamily.inviteCode}
                  </Text>
                </View>
                <TouchableOpacity style={styles.copyButton} onPress={copyInviteCode}>
                  <Ionicons name="copy-outline" size={20} color="#7c3aed" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {currentUserIsAdmin && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setInviteModalVisible(true)}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.inviteButtonText}>Inviter un membre</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
          }
        >
          {/* Pending Members */}
          {pendingMembers.length > 0 && currentUserIsAdmin && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                Demandes en attente ({pendingMembers.length})
              </Text>
              {pendingMembers.map((member) => (
                <View
                  key={member.id}
                  style={[styles.memberCard, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}
                >
                  <View style={styles.memberInfo}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {member.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={[styles.memberName, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                        {member.name || 'Sans nom'}
                      </Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status) }]}>
                        <Text style={styles.statusText}>{getStatusLabel(member.status)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveMember(member.id)}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectMember(member.id)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Active Members */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
              Membres actifs ({activeMembers.length})
            </Text>
            {activeMembers.map((member) => {
              const isCurrentUser = member.id === user?.id;
              return (
                <View
                  key={member.id}
                  style={[styles.memberCard, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}
                >
                  <View style={styles.memberInfo}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {member.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={[styles.memberName, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                        {member.name || 'Sans nom'}
                        {isCurrentUser && ' (Vous)'}
                      </Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                      <View
                        style={[styles.roleBadge, { backgroundColor: getRoleColor(member.familyRole) }]}
                      >
                        <Text style={styles.roleBadgeText}>{getRoleLabel(member.familyRole)}</Text>
                      </View>
                    </View>
                  </View>
                  {currentUserIsAdmin && !isCurrentUser && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleChangeRole(member.id, member.familyRole)}
                      >
                        <Ionicons name="swap-horizontal" size={20} color="#7c3aed" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleRemoveMember(member.id, member.name || 'ce membre')}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Invite Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                Inviter un membre
              </Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#f5f5dc' : '#2a2a2a'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                Email *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
                    color: isDark ? '#f5f5dc' : '#2a2a2a',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                  },
                ]}
                placeholder="email@exemple.com"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#6b7280', marginTop: 16 }]}>
                Rôle
              </Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    inviteRole === 'member' && styles.roleOptionSelected,
                  ]}
                  onPress={() => setInviteRole('member')}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      inviteRole === 'member' && styles.roleOptionTextSelected,
                    ]}
                  >
                    Membre
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    inviteRole === 'admin' && styles.roleOptionSelected,
                  ]}
                  onPress={() => setInviteRole('admin')}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      inviteRole === 'admin' && styles.roleOptionTextSelected,
                    ]}
                  >
                    Administrateur
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setInviteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !inviteEmail.trim() && styles.submitButtonDisabled]}
                onPress={handleInvite}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {inviteMutation.isPending ? 'Envoi...' : 'Inviter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Family Name Modal */}
      <Modal
        visible={editNameModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                Modifier le nom
              </Text>
              <TouchableOpacity onPress={() => setEditNameModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#f5f5dc' : '#2a2a2a'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                Nom de la famille *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
                    color: isDark ? '#f5f5dc' : '#2a2a2a',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                  },
                ]}
                placeholder="Ex: Famille Dupont"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={newFamilyName}
                onChangeText={setNewFamilyName}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditNameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !newFamilyName.trim() && styles.submitButtonDisabled]}
                onPress={handleUpdateFamilyName}
                disabled={!newFamilyName.trim() || updateFamilyNameMutation.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {updateFamilyNameMutation.isPending ? 'Modification...' : 'Modifier'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        visible={roleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                Modifier le rôle
              </Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#f5f5dc' : '#2a2a2a'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                Nouveau rôle
              </Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    selectedMemberRole === 'member' && styles.roleOptionSelected,
                  ]}
                  onPress={() => setSelectedMemberRole('member')}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      selectedMemberRole === 'member' && styles.roleOptionTextSelected,
                    ]}
                  >
                    Membre
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    selectedMemberRole === 'admin' && styles.roleOptionSelected,
                  ]}
                  onPress={() => setSelectedMemberRole('admin')}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      selectedMemberRole === 'admin' && styles.roleOptionTextSelected,
                    ]}
                  >
                    Administrateur
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setRoleModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleConfirmRoleChange}
                disabled={updateRoleMutation.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {updateRoleMutation.isPending ? 'Modification...' : 'Modifier'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitleContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    position: 'relative',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tutorialButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  familyCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  familyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  familyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  familyName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inviteCodeSection: {
    marginTop: 8,
  },
  inviteCodeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteCodeInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  inviteCodeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '600',
  },
  copyButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inviteButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  memberCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleOptionSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  roleOptionTextSelected: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
