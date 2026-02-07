import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface RewardsScreenProps {
  onNavigate?: (screen: string) => void;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  points: number;
  category: string;
  icon: string;
  isUnlocked: boolean;
}

interface UserPoints {
  name: string;
  points: number;
  level: number;
  avatar: string;
}

export default function RewardsScreen({ onNavigate }: RewardsScreenProps) {
  const [selectedUser, setSelectedUser] = useState(0);

  // Mock user points data
  const users: UserPoints[] = [
    { name: 'Enfant 1', points: 450, level: 5, avatar: '👦' },
    { name: 'Enfant 2', points: 320, level: 4, avatar: '👧' },
  ];

  // Mock rewards data
  const rewards: Reward[] = [
    {
      id: '1',
      title: 'Sortie cinéma',
      description: 'Une séance de cinéma au choix',
      points: 100,
      category: 'Loisirs',
      icon: '🎬',
      isUnlocked: true,
    },
    {
      id: '2',
      title: 'Jeu vidéo',
      description: 'Un nouveau jeu vidéo',
      points: 300,
      category: 'Loisirs',
      icon: '🎮',
      isUnlocked: true,
    },
    {
      id: '3',
      title: 'Soirée pyjama',
      description: 'Inviter un ami à dormir',
      points: 150,
      category: 'Social',
      icon: '🏠',
      isUnlocked: true,
    },
    {
      id: '4',
      title: 'Argent de poche bonus',
      description: '10€ d\'argent de poche supplémentaire',
      points: 200,
      category: 'Financier',
      icon: '💰',
      isUnlocked: true,
    },
    {
      id: '5',
      title: 'Parc d\'attractions',
      description: 'Une journée au parc d\'attractions',
      points: 500,
      category: 'Loisirs',
      icon: '🎡',
      isUnlocked: false,
    },
    {
      id: '6',
      title: 'Console de jeux',
      description: 'Une nouvelle console de jeux',
      points: 1000,
      category: 'Loisirs',
      icon: '🕹️',
      isUnlocked: false,
    },
  ];

  const currentUser = users[selectedUser];
  const nextLevelPoints = (currentUser.level + 1) * 100;
  const levelProgress = (currentUser.points % 100) / 100 * 100;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Récompenses</Text>
      </View>

      {/* User Selector */}
      <View style={styles.userSelector}>
        {users.map((user, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.userTab, selectedUser === index && styles.userTabActive]}
            onPress={() => setSelectedUser(index)}
          >
            <Text style={styles.userAvatar}>{user.avatar}</Text>
            <Text style={[styles.userName, selectedUser === index && styles.userNameActive]}>
              {user.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View>
              <Text style={styles.pointsLabel}>Points totaux</Text>
              <Text style={styles.pointsValue}>{currentUser.points} pts</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Niveau {currentUser.level}</Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>
              Progression vers le niveau {currentUser.level + 1}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${levelProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {currentUser.points % 100} / 100 points
            </Text>
          </View>
        </View>

        {/* Rewards List */}
        <View style={styles.rewardsContainer}>
          <Text style={styles.sectionTitle}>Récompenses disponibles</Text>
          
          {rewards.map(reward => {
            const canAfford = currentUser.points >= reward.points;
            
            return (
              <View
                key={reward.id}
                style={[
                  styles.rewardCard,
                  !reward.isUnlocked && styles.rewardCardLocked
                ]}
              >
                <View style={styles.rewardIcon}>
                  <Text style={styles.rewardIconText}>{reward.icon}</Text>
                  {!reward.isUnlocked && (
                    <View style={styles.lockOverlay}>
                      <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                  )}
                </View>

                <View style={styles.rewardContent}>
                  <Text style={[
                    styles.rewardTitle,
                    !reward.isUnlocked && styles.rewardTitleLocked
                  ]}>
                    {reward.title}
                  </Text>
                  <Text style={[
                    styles.rewardDescription,
                    !reward.isUnlocked && styles.rewardDescriptionLocked
                  ]}>
                    {reward.description}
                  </Text>
                  <View style={styles.rewardFooter}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{reward.category}</Text>
                    </View>
                    <Text style={[
                      styles.rewardPoints,
                      canAfford && styles.rewardPointsAffordable
                    ]}>
                      {reward.points} pts
                    </Text>
                  </View>
                </View>

                {reward.isUnlocked && canAfford && (
                  <TouchableOpacity style={styles.claimButton}>
                    <Text style={styles.claimButtonText}>Échanger</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* How to Earn Points */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment gagner des points ? 🌟</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>✅</Text>
            <Text style={styles.infoText}>Terminer une tâche : 10 points</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>📚</Text>
            <Text style={styles.infoText}>Faire ses devoirs : 20 points</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>🧹</Text>
            <Text style={styles.infoText}>Ranger sa chambre : 15 points</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>🍽️</Text>
            <Text style={styles.infoText}>Aider à la cuisine : 10 points</Text>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  userSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  userTabActive: {
    backgroundColor: '#7c3aed',
  },
  userAvatar: {
    fontSize: 24,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userNameActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  pointsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  levelBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  rewardsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  rewardCard: {
    flexDirection: 'row',
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
  rewardCardLocked: {
    opacity: 0.6,
  },
  rewardIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  rewardIconText: {
    fontSize: 32,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 24,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  rewardTitleLocked: {
    color: '#9ca3af',
  },
  rewardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  rewardDescriptionLocked: {
    color: '#9ca3af',
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  rewardPointsAffordable: {
    color: '#7c3aed',
  },
  claimButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    marginLeft: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
