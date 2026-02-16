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
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';

interface FamiliesScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function FamiliesScreen({ onNavigate, onPrevious, onNext }: FamiliesScreenProps) {
  const { isDark } = useTheme();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const utils = trpc.useUtils();
  const { data: families, isLoading, refetch } = trpc.family.list.useQuery();

  const createFamily = trpc.family.create.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Famille créée avec succès');
      setNewFamilyName('');
      setCreateModalVisible(false);
      refetch();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de la création de la famille');
    },
  });

  const joinFamily = trpc.family.join.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Demande envoyée avec succès');
      setInviteCode('');
      setJoinModalVisible(false);
      refetch();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Erreur lors de la demande');
    },
  });

  const handleCreateFamily = () => {
    if (!newFamilyName.trim()) {
      Alert.alert('Erreur', 'Le nom de la famille est requis');
      return;
    }
    createFamily.mutate({ name: newFamilyName.trim() });
  };

  const handleJoinFamily = () => {
    if (!inviteCode.trim()) {
      Alert.alert('Erreur', 'Le code d\'invitation est requis');
      return;
    }
    joinFamily.mutate({ inviteCode: inviteCode.trim() });
  };

  const copyInviteCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('✅', 'Code copié dans le presse-papier');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejetée';
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5dc' }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={[styles.pageTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>Cercles</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.joinButton]}
          onPress={() => setJoinModalVisible(true)}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Rejoindre</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.createButton]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Créer</Text>
        </TouchableOpacity>
      </View>

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
          {!families || families.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
              <Ionicons name="people-outline" size={64} color="#9ca3af" />
              <Text style={[styles.emptyTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                Aucune famille
              </Text>
              <Text style={styles.emptyDescription}>
                Vous n'appartenez à aucune famille pour le moment
              </Text>
              <Text style={styles.emptyHint}>
                Créez une nouvelle famille ou rejoignez-en une existante avec un code d'invitation
              </Text>
            </View>
          ) : (
            <View style={styles.familiesGrid}>
              {families.map((family) => (
                <View
                  key={family.id}
                  style={[styles.familyCard, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}
                >
                  {/* Header */}
                  <View style={styles.familyHeader}>
                    <View style={styles.familyTitleRow}>
                      <View style={styles.familyIconContainer}>
                        <Ionicons name="people" size={24} color="#7c3aed" />
                      </View>
                      <View style={styles.familyInfo}>
                        <Text style={[styles.familyName, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                          {family.name}
                        </Text>
                        <Text style={styles.familyDate}>
                          Créée le {new Date(family.createdAt).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(family.status) }]}>
                      <Text style={styles.statusText}>{getStatusLabel(family.status)}</Text>
                    </View>
                  </View>

                  {/* Role */}
                  <View style={styles.roleRow}>
                    <Text style={[styles.roleLabel, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                      Rôle:
                    </Text>
                    <View style={[styles.roleBadge, { borderColor: isDark ? '#4b5563' : '#d1d5db' }]}>
                      <Text style={[styles.roleText, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                        {family.role === 'admin' ? 'Administrateur' : 'Membre'}
                      </Text>
                    </View>
                  </View>

                  {/* Invite Code (Admin only) */}
                  {family.role === 'admin' && family.status === 'active' && (
                    <View style={styles.inviteCodeSection}>
                      <Text style={[styles.inviteCodeLabel, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                        Code d'invitation
                      </Text>
                      <View style={styles.inviteCodeRow}>
                        <View style={[styles.inviteCodeInput, { backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6' }]}>
                          <Text style={[styles.inviteCodeText, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                            {family.inviteCode}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyInviteCode(family.inviteCode)}
                        >
                          <Ionicons name="copy-outline" size={20} color="#7c3aed" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Manage Members Button */}
                  {family.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.manageMembersButton, { borderColor: isDark ? '#4b5563' : '#d1d5db' }]}
                      onPress={() => onNavigate?.(`families/${family.id}`)}
                    >
                      <Text style={[styles.manageMembersText, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                        Gérer les membres
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={isDark ? '#f5f5dc' : '#2a2a2a'} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Family Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                Créer une famille
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
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
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !newFamilyName.trim() && styles.submitButtonDisabled]}
                onPress={handleCreateFamily}
                disabled={!newFamilyName.trim() || createFamily.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createFamily.isPending ? 'Création...' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Family Modal */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f5f5dc' : '#2a2a2a' }]}>
                Rejoindre une famille
              </Text>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#f5f5dc' : '#2a2a2a'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                Code d'invitation *
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
                placeholder="Entrez le code"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setJoinModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !inviteCode.trim() && styles.submitButtonDisabled]}
                onPress={handleJoinFamily}
                disabled={!inviteCode.trim() || joinFamily.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {joinFamily.isPending ? 'Envoi...' : 'Rejoindre'}
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
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  joinButton: {
    backgroundColor: '#6b7280',
  },
  createButton: {
    backgroundColor: '#7c3aed',
  },
  actionButtonText: {
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
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  familiesGrid: {
    gap: 16,
    paddingBottom: 16,
  },
  familyCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  familyHeader: {
    marginBottom: 16,
  },
  familyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  familyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  familyInfo: {
    flex: 1,
  },
  familyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  familyDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inviteCodeSection: {
    marginBottom: 16,
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
  manageMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  manageMembersText: {
    fontSize: 14,
    fontWeight: '500',
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
