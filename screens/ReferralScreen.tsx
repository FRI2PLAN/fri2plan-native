import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

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
  const referralCode = 'FRI2PLAN-ABCD1234';
  const referralLink = `https://fri2plan.app/invite/${referralCode}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${t('referral.shareMessage', { code: referralCode, link: referralLink })}`,
        url: referralLink,
        title: t('referral.title'),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const LEVELS = [
    {
      icon: '🥉',
      label: t('referral.level1Label'),
      condition: t('referral.level1Condition'),
      gain: t('referral.level1Gain'),
      use: t('referral.level1Use'),
      color: '#cd7f32',
    },
    {
      icon: '🥈',
      label: t('referral.level2Label'),
      condition: t('referral.level2Condition'),
      gain: t('referral.level2Gain'),
      use: t('referral.level2Use'),
      color: '#9ca3af',
    },
    {
      icon: '🥇',
      label: t('referral.level3Label'),
      condition: t('referral.level3Condition'),
      gain: t('referral.level3Gain'),
      use: t('referral.level3Use'),
      color: '#f59e0b',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>{t('referral.title')}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>{t('referral.tagline')}</Text>
          <Text style={styles.heroDescription}>{t('referral.heroDesc')}</Text>
        </View>

        {/* Code de parrainage */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('referral.yourCode')}</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleShare}>
              <Text style={styles.copyButtonText}>📤 {t('referral.shareLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comment ça marche */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('referral.howItWorks')}</Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('referral.step1Title')}</Text>
              <Text style={styles.stepDescription}>{t('referral.step1Desc')}</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('referral.step2Title')}</Text>
              <Text style={styles.stepDescription}>{t('referral.step2Desc')}</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('referral.bothEarn')}</Text>
              <Text style={styles.stepDescription}>{t('referral.step3Desc')}</Text>
            </View>
          </View>
        </View>

        {/* Niveaux de parrainage */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('referral.levelsTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('referral.levelsSubtitle')}</Text>
          {LEVELS.map((lvl, i) => (
            <View key={i} style={[styles.levelCard, { borderLeftColor: lvl.color }]}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelIcon}>{lvl.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.levelLabel, { color: lvl.color }]}>{lvl.label}</Text>
                  <Text style={styles.levelCondition}>{lvl.condition}</Text>
                </View>
              </View>
              <View style={styles.levelDetails}>
                <View style={styles.levelDetailRow}>
                  <Text style={styles.levelDetailKey}>{t('referral.youGain')}</Text>
                  <Text style={[styles.levelDetailValue, { color: '#10b981' }]}>{lvl.gain}</Text>
                </View>
                <View style={styles.levelDetailRow}>
                  <Text style={styles.levelDetailKey}>{t('referral.howToUse')}</Text>
                  <Text style={styles.levelDetailValue}>{lvl.use}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Bouton partager */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>🎉 {t('referral.shareLink')}</Text>
        </TouchableOpacity>

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
    codeCard: { backgroundColor: isDark ? '#1f2937' : '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
    codeLabel: { fontSize: 13, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 10 },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    codeText: { flex: 1, fontSize: 18, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', letterSpacing: 1 },
    copyButton: { backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    copyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    card: { backgroundColor: isDark ? '#1f2937' : '#fff', marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 6 },
    sectionSubtitle: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 16, lineHeight: 18 },
    step: { flexDirection: 'row', marginBottom: 18 },
    stepNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
    stepNumberText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    stepContent: { flex: 1 },
    stepTitle: { fontSize: 15, fontWeight: '600', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 3 },
    stepDescription: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', lineHeight: 19 },
    levelCard: { borderLeftWidth: 4, backgroundColor: isDark ? '#111827' : '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 12 },
    levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
    levelIcon: { fontSize: 28 },
    levelLabel: { fontSize: 15, fontWeight: 'bold' },
    levelCondition: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
    levelDetails: { gap: 6 },
    levelDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    levelDetailKey: { fontSize: 12, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280', width: 80 },
    levelDetailValue: { flex: 1, fontSize: 13, color: isDark ? '#e5e7eb' : '#374151', lineHeight: 18 },
    shareButton: { backgroundColor: '#10b981', marginHorizontal: 16, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    shareButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });
}
