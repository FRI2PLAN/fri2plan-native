import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';

interface RewardsScreenProps {
  onNavigate?: (screen: string) => void;

  onPrevious?: () => void;
  onNext?: () => void;}

export default function RewardsScreen({ onNavigate, onPrevious, onNext }: RewardsScreenProps) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch rewards from API
  const { data: rewards, isLoading, refetch } = trpc.rewards.list.useQuery();

  // Mutation to redeem reward
  const redeemMutation = trpc.rewards.redeem.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Récompense échangée avec succès !');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Impossible d\'échanger cette récompense');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRedeem = (rewardId: number, points: number) => {
    Alert.alert(
      'Échanger une récompense',
      `Voulez-vous échanger cette récompense pour ${points} points ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => redeemMutation.mutate({ id: rewardId }),
        },
      ]
    );
  };

  const getRewardIcon = (title: string) => {
    const icons: Record<string, string> = {
      'Sortie cinéma': '🎬',
      'Jeu vidéo': '🎮',
      'Soirée pyjama': '🏠',
      'Argent de poche': '💰',
      'Parc d\'attractions': '🎡',
      'Restaurant': '🍽️',
      'Livre': '📚',
      'Sport': '⚽',
    };
    
    for (const [key, icon] of Object.entries(icons)) {
      if (title.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }
    return '🎁';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      {/* Header removed - using RichHeader in home.tsx instead */}

      {/* User Points Card */}
      <View style={styles.pointsCard}>
        <View style={styles.pointsHeader}>
          <Text style={styles.pointsTitle}>Mes points</Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsValue}>⭐ {user?.name || 'Utilisateur'}</Text>
          </View>
        </View>
        <Text style={styles.pointsSubtext}>
          Complétez des tâches pour gagner des points et débloquer des récompenses !
        </Text>
      </View>

      {/* Rewards List */}
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
        ) : rewards && rewards.length > 0 ? (
          rewards.map(reward => (
            <View key={reward.id} style={styles.rewardCard}>
              <View style={styles.rewardIcon}>
                <Text style={styles.rewardIconText}>{getRewardIcon(reward.title)}</Text>
              </View>

              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>{reward.title}</Text>
                {reward.description && (
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                )}

                <View style={styles.rewardFooter}>
                  <View style={styles.rewardPoints}>
                    <Text style={styles.rewardPointsText}>⭐ {reward.pointsCost} points</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.redeemButton,
                      redeemMutation.isLoading && styles.redeemButtonDisabled
                    ]}
                    onPress={() => handleRedeem(reward.id, reward.pointsCost)}
                    disabled={redeemMutation.isLoading}
                  >
                    {redeemMutation.isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.redeemButtonText}>Échanger</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucune récompense disponible</Text>
            <Text style={styles.emptyStateSubtext}>
              Les récompenses seront ajoutées par les parents
            </Text>
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
  pointsCard: {
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
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsSubtext: {
    fontSize: 14,
    color: '#e9d5ff',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: 16,
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
  rewardCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rewardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rewardIconText: {
    fontSize: 32,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardPoints: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rewardPointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  redeemButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  redeemButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
