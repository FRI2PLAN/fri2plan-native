import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native';
import PageHeaderWithArrows from '../components/PageHeaderWithArrows';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';

interface MembersScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function MembersScreen({ onNavigate , onPrevious, onNext}: MembersScreenProps) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch family info from API
  const { data: families, isLoading, refetch } = trpc.family.list.useQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const currentFamily = families && families.length > 0 ? families[0] : null;

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'superadmin': return 'Super Admin';
      case 'user': return 'Membre';
      default: return 'Membre';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return '#7c3aed';
      case 'superadmin': return '#ef4444';
      default: return '#10b981';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cercles</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Inviter</Text>
        </TouchableOpacity>
      </View>

      {/* Family Info Card */}
      {currentFamily && (
        <View style={styles.familyCard}>
          <Text style={styles.familyName}>{currentFamily.name}</Text>
          <View style={styles.familyInfo}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Code d'invitation</Text>
              <View style={styles.inviteCodeContainer}>
                <Text style={styles.inviteCode}>{currentFamily.inviteCode}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.familySubtext}>
            Partagez ce code avec votre famille pour les inviter
          </Text>
        </View>
      )}

      {/* Current User Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mon profil</Text>
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>👤</Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{user?.name || 'Utilisateur'}</Text>
            <Text style={styles.memberEmail}>{user?.email || 'email@example.com'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role) }]}>
              <Text style={styles.roleBadgeText}>{getRoleLabel(user?.role)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Members List */}
      <PageHeaderWithArrows 

        title="Membres"

        onPrevious={onPrevious}

        onNext={onNext}

      />

      

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Membres de la famille</Text>
            
            {currentFamily ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardText}>
                  Les autres membres de votre famille apparaîtront ici une fois qu'ils auront rejoint avec le code d'invitation.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune famille</Text>
                <Text style={styles.emptyStateSubtext}>
                  Créez une famille ou rejoignez-en une avec un code d'invitation
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  familyCard: {
    backgroundColor: '#7c3aed',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  familyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  familyInfo: {
    marginBottom: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#e9d5ff',
    marginBottom: 8,
  },
  inviteCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  familySubtext: {
    fontSize: 14,
    color: '#e9d5ff',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  memberAvatarText: {
    fontSize: 32,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCardText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
