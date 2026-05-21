import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, ActivityIndicator, Alert, Clipboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { trpc } from '../lib/trpc';

interface ReferralScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function ReferralScreen({
  onNavigate,
  onPrevious,
  onNext,
}: ReferralScreenProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const styles = getStyles(isDark);

  // Récupérer la famille active
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const { data: families = [] } = trpc.family.list.useQuery();
  const activeFamilyId = ctxFamilyId ?? (families as any[])[0]?.id ?? 0;

  // Récupérer les codes de parrainage existants
  const { data: referralCodes = [], isLoading, refetch } = trpc.subscription.listReferralCodes.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );

  // Mutation pour générer un nouveau code
  const generateCode = trpc.subscription.generateReferralCode.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('✅', t('referral.codeGenerated') || 'Code de parrainage généré !');
    },
    onError: (err: any) => {
      Alert.alert(t('common.error'), err.message || 'Erreur lors de la génération du code');
    },
  });

  const codes = referralCodes as any[];
  const activeCode = codes.find((c: any) => !c.isUsed);
  const usedCodes = codes.filter((c: any) => c.isUsed);

  const handleCopy = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('✅', t('referral.codeCopied') || 'Code copié !');
  };

  const handleShare = async (code: string) => {
    try {
      await Share.share({
        message: `Rejoins-moi sur FRI2PLAN ! Utilise mon code de parrainage "${code}" pour obtenir 1 mois offert. https://fri2plan.app`,
        title: t('referral.title') || 'Parrainage FRI2PLAN',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGenerateCode = () => {
    if (!activeFamilyId) {
      Alert.alert(t('common.error'), 'Aucune famille active');
      return;
    }
    generateCode.mutate({ familyId: activeFamilyId });
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>🎁 {t('referral.title') || 'Parrainage'}</Text>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>{t('referral.tagline') || 'Parrainez et gagnez !'}</Text>
          <Text style={styles.heroDescription}>
            {t('referral.heroDesc') || "Pour chaque ami qui rejoint FRI2PLAN avec votre code, vous recevez 1 mois d'abonnement offert."}
          </Text>
        </View>

        {/* Récompense mise en avant */}
        <View style={styles.rewardCard}>
          <Text style={styles.rewardEmoji}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardTitle}>{t('referral.rewardTitle') || '1 mois offert par parrainage'}</Text>
            <Text style={styles.rewardDesc}>
              {t('referral.rewardDesc') || "Chaque fois qu'un ami s'abonne avec votre code, vous recevez automatiquement 1 mois d'abonnement gratuit."}
            </Text>
          </View>
        </View>

        {/* Code de parrainage actif */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('referral.yourCode') || 'Votre code de parrainage'}</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 12 }} />
          ) : activeCode ? (
            <>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{activeCode.promoCode}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={() => handleCopy(activeCode.promoCode)}>
                  <Text style={styles.copyButtonText}>📋 {t('common.copy') || 'Copier'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.shareButton} onPress={() => handleShare(activeCode.promoCode)}>
                <Text style={styles.shareButtonText}>🎉 {t('referral.shareLink') || 'Partager mon code'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.noCodeText}>
                {t('referral.noCode') || "Vous n'avez pas encore de code de parrainage."}
              </Text>
              <TouchableOpacity
                style={[styles.generateButton, generateCode.isPending && { opacity: 0.6 }]}
                onPress={handleGenerateCode}
                disabled={generateCode.isPending}
              >
                {generateCode.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.generateButtonText}>✨ {t('referral.generateCode') || 'Générer mon code'}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Comment ça marche */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('referral.howItWorks') || 'Comment ça marche ?'}</Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('referral.step1Title') || 'Générez votre code'}</Text>
              <Text style={styles.stepDescription}>{t('referral.step1Desc') || 'Créez votre code de parrainage unique depuis cette page.'}</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('referral.step2Title') || 'Partagez-le'}</Text>
              <Text style={styles.stepDescription}>{t('referral.step2Desc') || 'Envoyez votre code à vos amis et votre famille.'}</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('referral.step3Title') || 'Profitez de votre mois offert'}</Text>
              <Text style={styles.stepDescription}>{t('referral.step3Desc') || "Dès que votre filleul s'abonne, vous recevez 1 mois gratuit automatiquement."}</Text>
            </View>
          </View>
        </View>

        {/* Historique des parrainages */}
        {codes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('referral.history') || 'Historique'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{codes.length}</Text>
                <Text style={styles.statLabel}>{t('referral.totalCodes') || 'Codes générés'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#10b981' }]}>{usedCodes.length}</Text>
                <Text style={styles.statLabel}>{t('referral.usedCodes') || 'Parrainages réussis'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#7c3aed' }]}>{usedCodes.length}</Text>
                <Text style={styles.statLabel}>{t('referral.monthsEarned') || 'Mois offerts'}</Text>
              </View>
            </View>
            {usedCodes.length > 0 && (
              <View style={{ marginTop: 12 }}>
                {usedCodes.map((c: any, i: number) => (
                  <View key={c.id || i} style={styles.historyItem}>
                    <Text style={styles.historyCode}>{c.promoCode}</Text>
                    <View style={styles.historyBadge}>
                      <Text style={styles.historyBadgeText}>✅ {t('referral.used') || 'Utilisé'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' },
    pageTitleContainer: { padding: 20, backgroundColor: isDark ? '#1f2937' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', textAlign: 'center' },
    content: { flex: 1 },
    heroCard: { backgroundColor: '#7c3aed', margin: 16, padding: 28, borderRadius: 16, alignItems: 'center' },
    heroEmoji: { fontSize: 56, marginBottom: 12 },
    heroTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
    heroDescription: { fontSize: 15, color: '#fff', textAlign: 'center', opacity: 0.9, lineHeight: 22 },
    rewardCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1f2937' : '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, gap: 12, borderLeftWidth: 4, borderLeftColor: '#f59e0b', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
    rewardEmoji: { fontSize: 36 },
    rewardTitle: { fontSize: 15, fontWeight: '700', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 4 },
    rewardDesc: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', lineHeight: 18 },
    codeCard: { backgroundColor: isDark ? '#1f2937' : '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
    codeLabel: { fontSize: 13, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 10 },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    codeText: { flex: 1, fontSize: 18, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', letterSpacing: 1 },
    copyButton: { backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    copyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    shareButton: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    shareButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    noCodeText: { fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 12, textAlign: 'center', lineHeight: 20 },
    generateButton: { backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    generateButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    card: { backgroundColor: isDark ? '#1f2937' : '#fff', marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 16 },
    step: { flexDirection: 'row', marginBottom: 18 },
    stepNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
    stepNumberText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    stepContent: { flex: 1 },
    stepTitle: { fontSize: 15, fontWeight: '600', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 3 },
    stepDescription: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', lineHeight: 19 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb', borderRadius: 10, padding: 12, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '800', color: isDark ? '#f9fafb' : '#1f2937' },
    statLabel: { fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'center', marginTop: 4 },
    historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#f3f4f6' },
    historyCode: { fontSize: 14, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151' },
    historyBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    historyBadgeText: { fontSize: 12, color: '#065f46', fontWeight: '600' },
  });
}
