import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Share } from 'react-native';
import PageHeaderWithArrows from '../components/PageHeaderWithArrows';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface ReferralScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

interface Referral {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'premium';
  date: string;
  reward: number;
}

export default function ReferralScreen({ onNavigate , onPrevious, onNext}: ReferralScreenProps) {
  const referralCode = 'FRI2PLAN-ABCD1234';
  const referralLink = `https://fri2plan.app/invite/${referralCode}`;

  // Mock referrals data
  const referrals: Referral[] = [
    {
      id: '1',
      name: 'Marie Dupont',
      email: 'marie.dupont@example.com',
      status: 'active',
      date: 'Il y a 2 semaines',
      reward: 10,
    },
    {
      id: '2',
      name: 'Jean Martin',
      email: 'jean.martin@example.com',
      status: 'premium',
      date: 'Il y a 1 mois',
      reward: 20,
    },
    {
      id: '3',
      name: 'Sophie Bernard',
      email: 'sophie.bernard@example.com',
      status: 'pending',
      date: 'Il y a 3 jours',
      reward: 0,
    },
  ];

  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.status === 'active' || r.status === 'premium').length;
  const totalRewards = referrals.reduce((sum, r) => sum + r.reward, 0);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Rejoins-moi sur FRI2PLAN, l'organiseur familial qui simplifie la vie ! 🎉\n\nUtilise mon code de parrainage : ${referralCode}\n\nLien : ${referralLink}`,
        url: referralLink,
        title: 'Parrainage FRI2PLAN',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    // In a real app, use Clipboard API
    console.log('Copied to clipboard:', text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'active': return '#10b981';
      case 'premium': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'active': return 'Actif';
      case 'premium': return 'Premium';
      default: return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Parrainer un ami</Text>
      </View>

      <PageHeaderWithArrows 


        title="Parrainage"


        onPrevious={onPrevious}


        onNext={onNext}


      />


      


      <ScrollView style={styles.content}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>Parrainez et gagnez !</Text>
          <Text style={styles.heroDescription}>
            Invitez vos amis à rejoindre FRI2PLAN et recevez des récompenses pour chaque inscription réussie
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.statValue}>{totalReferrals}</Text>
            <Text style={styles.statLabel}>Parrainages</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={styles.statValue}>{activeReferrals}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.statValue}>{totalRewards}€</Text>
            <Text style={styles.statLabel}>Récompenses</Text>
          </View>
        </View>

        {/* Referral Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Votre code de parrainage</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(referralCode)}
            >
              <Text style={styles.copyButtonText}>📋 Copier</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.linkLabel}>Lien de parrainage</Text>
          <View style={styles.linkContainer}>
            <Text style={styles.linkText} numberOfLines={1}>{referralLink}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(referralLink)}
            >
              <Text style={styles.copyButtonText}>📋 Copier</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>📤 Partager le lien</Text>
          </TouchableOpacity>
        </View>

        {/* How it Works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.sectionTitle}>Comment ça marche ? 🤔</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Partagez votre code</Text>
              <Text style={styles.stepDescription}>
                Envoyez votre code de parrainage à vos amis et votre famille
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Ils s'inscrivent</Text>
              <Text style={styles.stepDescription}>
                Vos amis créent un compte avec votre code de parrainage
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Vous gagnez tous les deux</Text>
              <Text style={styles.stepDescription}>
                Recevez 10€ de crédit et votre ami reçoit 1 mois gratuit
              </Text>
            </View>
          </View>
        </View>

        {/* Rewards Info */}
        <View style={styles.rewardsCard}>
          <Text style={styles.sectionTitle}>Récompenses 🎁</Text>
          
          <View style={styles.rewardItem}>
            <Text style={styles.rewardIcon}>✅</Text>
            <View style={styles.rewardContent}>
              <Text style={styles.rewardTitle}>Inscription validée</Text>
              <Text style={styles.rewardAmount}>+10€ de crédit</Text>
            </View>
          </View>

          <View style={styles.rewardItem}>
            <Text style={styles.rewardIcon}>⭐</Text>
            <View style={styles.rewardContent}>
              <Text style={styles.rewardTitle}>Passage Premium</Text>
              <Text style={styles.rewardAmount}>+10€ de crédit supplémentaire</Text>
            </View>
          </View>

          <View style={styles.rewardItem}>
            <Text style={styles.rewardIcon}>🏆</Text>
            <View style={styles.rewardContent}>
              <Text style={styles.rewardTitle}>5 parrainages actifs</Text>
              <Text style={styles.rewardAmount}>+1 mois Premium gratuit</Text>
            </View>
          </View>
        </View>

        {/* Referrals List */}
        {referrals.length > 0 && (
          <View style={styles.referralsContainer}>
            <Text style={styles.sectionTitle}>Vos parrainages ({totalReferrals})</Text>
            
            {referrals.map(referral => (
              <View key={referral.id} style={styles.referralCard}>
                <View style={styles.referralHeader}>
                  <View style={styles.referralInfo}>
                    <Text style={styles.referralName}>{referral.name}</Text>
                    <Text style={styles.referralEmail}>{referral.email}</Text>
                    <Text style={styles.referralDate}>📅 {referral.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(referral.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(referral.status)}</Text>
                  </View>
                </View>
                {referral.reward > 0 && (
                  <View style={styles.referralReward}>
                    <Text style={styles.referralRewardText}>
                      🎁 Vous avez gagné {referral.reward}€
                    </Text>
                  </View>
                )}
              </View>
            ))}
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
  content: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: '#7c3aed',
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  codeCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  codeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  copyButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  shareButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  howItWorksCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  rewardsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  referralsContainer: {
    padding: 16,
  },
  referralCard: {
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
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  referralEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  referralDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  referralReward: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  referralRewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
});
