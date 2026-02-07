import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface MembersScreenProps {
  onNavigate?: (screen: string) => void;
}

interface Member {
  id: string;
  name: string;
  role: 'parent' | 'child';
  avatar: string;
  email?: string;
  age?: number;
  status: 'active' | 'pending';
  tasksCompleted: number;
  points: number;
}

export default function MembersScreen({ onNavigate }: MembersScreenProps) {
  const [selectedCircle, setSelectedCircle] = useState<'family' | 'extended'>('family');

  // Mock members data
  const familyMembers: Member[] = [
    {
      id: '1',
      name: 'Papa',
      role: 'parent',
      avatar: '👨',
      email: 'papa@example.com',
      status: 'active',
      tasksCompleted: 45,
      points: 0,
    },
    {
      id: '2',
      name: 'Maman',
      role: 'parent',
      avatar: '👩',
      email: 'maman@example.com',
      status: 'active',
      tasksCompleted: 52,
      points: 0,
    },
    {
      id: '3',
      name: 'Enfant 1',
      role: 'child',
      avatar: '👦',
      age: 12,
      status: 'active',
      tasksCompleted: 38,
      points: 450,
    },
    {
      id: '4',
      name: 'Enfant 2',
      role: 'child',
      avatar: '👧',
      age: 9,
      status: 'active',
      tasksCompleted: 25,
      points: 320,
    },
  ];

  const extendedMembers: Member[] = [
    {
      id: '5',
      name: 'Grand-mère',
      role: 'parent',
      avatar: '👵',
      email: 'grandmere@example.com',
      status: 'active',
      tasksCompleted: 12,
      points: 0,
    },
    {
      id: '6',
      name: 'Tante Marie',
      role: 'parent',
      avatar: '👩',
      email: 'marie@example.com',
      status: 'pending',
      tasksCompleted: 0,
      points: 0,
    },
  ];

  const currentMembers = selectedCircle === 'family' ? familyMembers : extendedMembers;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Membres</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Inviter</Text>
        </TouchableOpacity>
      </View>

      {/* Circle Selector */}
      <View style={styles.circleSelector}>
        <TouchableOpacity
          style={[styles.circleTab, selectedCircle === 'family' && styles.circleTabActive]}
          onPress={() => setSelectedCircle('family')}
        >
          <Text style={[styles.circleText, selectedCircle === 'family' && styles.circleTextActive]}>
            👨‍👩‍👧‍👦 Famille ({familyMembers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.circleTab, selectedCircle === 'extended' && styles.circleTabActive]}
          onPress={() => setSelectedCircle('extended')}
        >
          <Text style={[styles.circleText, selectedCircle === 'extended' && styles.circleTextActive]}>
            🏡 Cercle élargi ({extendedMembers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          {selectedCircle === 'family'
            ? '👨‍👩‍👧‍👦 Votre famille proche avec accès complet'
            : '🏡 Famille élargie et amis proches avec accès limité'}
        </Text>
      </View>

      {/* Members List */}
      <ScrollView style={styles.content}>
        {currentMembers.map(member => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatar}>{member.avatar}</Text>
                {member.status === 'pending' && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>En attente</Text>
                  </View>
                )}
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>
                  {member.role === 'parent' ? '👤 Parent' : '👶 Enfant'}
                  {member.age && ` • ${member.age} ans`}
                </Text>
                {member.email && (
                  <Text style={styles.memberEmail}>📧 {member.email}</Text>
                )}
              </View>

              <TouchableOpacity style={styles.menuButton}>
                <Text style={styles.menuIcon}>⋮</Text>
              </TouchableOpacity>
            </View>

            {member.status === 'active' && (
              <View style={styles.memberStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{member.tasksCompleted}</Text>
                  <Text style={styles.statLabel}>Tâches</Text>
                </View>
                {member.role === 'child' && (
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{member.points}</Text>
                    <Text style={styles.statLabel}>Points</Text>
                  </View>
                )}
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>✓</Text>
                  <Text style={styles.statLabel}>Actif</Text>
                </View>
              </View>
            )}

            {member.status === 'pending' && (
              <View style={styles.pendingActions}>
                <TouchableOpacity style={styles.resendButton}>
                  <Text style={styles.resendButtonText}>Renvoyer l'invitation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Invite Card */}
        <TouchableOpacity style={styles.inviteCard}>
          <Text style={styles.inviteIcon}>➕</Text>
          <Text style={styles.inviteTitle}>Inviter un nouveau membre</Text>
          <Text style={styles.inviteDescription}>
            Ajoutez des membres de votre famille ou cercle proche
          </Text>
        </TouchableOpacity>

        {/* Permissions Info */}
        <View style={styles.permissionsCard}>
          <Text style={styles.permissionsTitle}>Permissions et rôles 🔐</Text>
          
          <View style={styles.permissionItem}>
            <Text style={styles.permissionRole}>👤 Parents</Text>
            <Text style={styles.permissionDescription}>
              Accès complet : création, modification, suppression de tous les contenus
            </Text>
          </View>

          <View style={styles.permissionItem}>
            <Text style={styles.permissionRole}>👶 Enfants</Text>
            <Text style={styles.permissionDescription}>
              Accès limité : consultation, création de requêtes, gestion de leurs tâches
            </Text>
          </View>

          <View style={styles.permissionItem}>
            <Text style={styles.permissionRole}>🏡 Cercle élargi</Text>
            <Text style={styles.permissionDescription}>
              Accès en lecture seule : consultation du calendrier et des informations partagées
            </Text>
          </View>
        </View>
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
  circleSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  circleTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  circleTabActive: {
    backgroundColor: '#7c3aed',
  },
  circleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  circleTextActive: {
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    fontSize: 48,
  },
  pendingBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#6b7280',
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  resendButton: {
    flex: 1,
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  inviteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  inviteIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  inviteDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  permissionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  permissionItem: {
    marginBottom: 16,
  },
  permissionRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});
