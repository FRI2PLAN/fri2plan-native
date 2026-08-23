import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';
import { useTheme } from '../contexts/ThemeContext';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPointsFeedback } from '../lib/pointsFeedbackBus';
import { changeLanguage, getCurrentLanguage } from '../i18n';

interface RichHeaderProps {
  onQuickActionsPress?: () => void;
  onNotificationsPress?: () => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
  isDarkMode?: boolean;
  onNavigateHome?: () => void;
}

export default function RichHeader({
  onQuickActionsPress,
  onNotificationsPress,
  onThemeToggle,
  onLogout,
  isDarkMode = true,
  onNavigateHome,
}: RichHeaderProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(isDark);
  const navigation = useNavigation();
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  const handleLanguageChange = async (language: string) => {
    await changeLanguage(language);
    setCurrentLanguage(language);
    setLanguagePickerOpen(false);
  };

  const getLanguageLabel = (language: string) => {
    if (language === 'en') return t('settings.langEn');
    if (language === 'de') return t('settings.langDe');
    return t('settings.langFr');
  };

  const getLanguageFlag = (language: string) => {
    if (language === 'en') return '🇬🇧';
    if (language === 'de') return '🇩🇪';
    return '🇫🇷';
  };

  // Récupérer les données utilisateur depuis le cache local (AuthContext) ET depuis le serveur
  const { user: cachedUser } = useAuth();
  const { data: meData } = trpc.auth.me.useQuery();
  // Utiliser les données du serveur si disponibles, sinon le cache local (évite "Utilisateur" au premier rendu)
  const user = meData ?? cachedUser;

  // Récupérer les points de la famille pour le classement
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const { data: families } = trpc.family.list.useQuery();
  const activeFamily = ctxFamilyId
    ? (families as any[])?.find((f: any) => f.id === ctxFamilyId) ?? families?.[0]
    : families?.[0];

  // Récupérer le nombre de notifications non lues filtrées par famille active
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery(
    { familyId: activeFamily?.id || undefined },
    { enabled: !!activeFamily, refetchInterval: 30000 }
  );
  const activeFamilyName: string | null = activeFamily?.name || null;
  const { data: familyPoints = [] } = trpc.rewards.familyPoints.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );
  const { data: activeFamilyMembers = [] } = trpc.family.members.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );

  // Le dénominateur et le rang doivent suivre la liste effective des membres du
  // cercle. Les entrées de points peuvent contenir des reliquats techniques
  // après une réassociation de compte et ne constituent pas la source de vérité.
  const uniqueActiveFamilyMembers = useMemo(() => {
    const membersById = new Map<number, any>();
    for (const member of activeFamilyMembers as any[]) {
      const memberId = Number(member.id);
      if (!Number.isNaN(memberId) && !membersById.has(memberId)) {
        membersById.set(memberId, member);
      }
    }
    return Array.from(membersById.values());
  }, [activeFamilyMembers]);

  const pointsByUserId = useMemo(() => {
    const pointsByUser = new Map<number, any>();
    for (const entry of familyPoints as any[]) {
      if (!pointsByUser.has(entry.userId)) {
        pointsByUser.set(entry.userId, entry);
      }
    }
    return pointsByUser;
  }, [familyPoints]);

  // Calculer points et classement de l'utilisateur
  const { currentUserPoints, currentUserRank, totalMembers } = useMemo(() => {
    if (!user || !uniqueActiveFamilyMembers.length) return { currentUserPoints: 0, currentUserRank: 0, totalMembers: 0 };
    const sorted = uniqueActiveFamilyMembers
      .map((member: any) => ({
        userId: Number(member.id),
        totalPoints: Number(pointsByUserId.get(Number(member.id))?.totalPoints || 0),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
    const rank = sorted.findIndex((m: any) => m.userId === user.id) + 1;
    const myPoints = sorted.find((m: any) => m.userId === user.id)?.totalPoints || 0;
    return { currentUserPoints: myPoints, currentUserRank: rank, totalMembers: uniqueActiveFamilyMembers.length };
  }, [user, uniqueActiveFamilyMembers, pointsByUserId]);
  const [displayedPoints, setDisplayedPoints] = useState(currentUserPoints);
  const displayedPointsRef = useRef(currentUserPoints);
  const isCounterAnimating = useRef(false);
  const pointsScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCounterAnimating.current) return;
    displayedPointsRef.current = currentUserPoints;
    setDisplayedPoints(currentUserPoints);
  }, [currentUserPoints]);

  useEffect(() => subscribeToPointsFeedback(({ delta }) => {
    const start = displayedPointsRef.current;
    const target = Math.max(0, start + delta);
    const steps = Math.min(Math.max(Math.abs(delta), 1), 18);
    const increment = (target - start) / steps;
    let step = 0;
    isCounterAnimating.current = true;

    Animated.sequence([
      Animated.spring(pointsScale, { toValue: 1.34, useNativeDriver: true, friction: 4 }),
      Animated.spring(pointsScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();

    const timer = setInterval(() => {
      step += 1;
      const next = step >= steps ? target : Math.round(start + increment * step);
      displayedPointsRef.current = next;
      setDisplayedPoints(next);
      if (step >= steps) {
        clearInterval(timer);
        isCounterAnimating.current = false;
      }
    }, 34);
    return () => clearInterval(timer);
  }), [pointsScale]);

  // Calcul progression vers prochain palier
  const progressPercent = useMemo(() => {
    const milestones = [0, 50, 100, 200, 500, 1000, 2000, 5000];
    const idx = milestones.findIndex(m => currentUserPoints < m);
    if (idx <= 0) return 100;
    const prev = milestones[idx - 1];
    const next = milestones[idx];
    return Math.min(((currentUserPoints - prev) / (next - prev)) * 100, 100);
  }, [currentUserPoints]);

  // Rendu de l'avatar selon le type (upload, emoji, icon, initials)
  const renderAvatar = () => {
    const avatarType = (user as any)?.avatarType;
    const avatarValue = (user as any)?.avatarValue;
    const avatarUrl = (user as any)?.avatarUrl;
    const userColor = (user as any)?.userColor || '#ec4899';

    if (avatarType === 'upload' && avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
    }
    if ((avatarType === 'emoji' || avatarType === 'icon') && avatarValue) {
      return (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: userColor }]}>
          <Text style={styles.avatarEmoji}>{avatarValue}</Text>
        </View>
      );
    }
    // initials or fallback
    const initials = user?.name?.charAt(0).toUpperCase() || '?';
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: userColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <>
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Left: Avatar + Name + Points - Clickable to go Home */}
        <TouchableOpacity
          style={styles.leftSection}
          onPress={onNavigateHome}
          activeOpacity={0.7}
        >
          {renderAvatar()}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Utilisateur'}
            </Text>
            {totalMembers > 0 && (
              <View style={styles.pointsRow}>
                <Animated.Text style={[styles.pointsText, { transform: [{ scale: pointsScale }] }]}>🏆 {displayedPoints} pts</Animated.Text>
                <Text style={styles.rankText}>{currentUserRank}/{totalMembers}</Text>
              </View>
            )}
            {totalMembers > 0 && (
              <View style={styles.progressBarWrapper}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
                </View>
              </View>
            )}

          </View>
        </TouchableOpacity>

        {/* Right: Actions */}
        <View style={styles.rightSection}>
          {/* Quick Actions - Icon only */}
          <TouchableOpacity
            onPress={onQuickActionsPress}
            style={styles.iconButton}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>

          {/* Notifications with badge */}
          <TouchableOpacity
            onPress={onNotificationsPress}
            style={styles.iconButton}
          >
            <Ionicons name="notifications" size={22} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Langue : même préférence persistante que dans Paramètres */}
          <TouchableOpacity
            onPress={() => setLanguagePickerOpen(true)}
            style={styles.iconButton}
            accessibilityLabel={t('settings.selectLanguage')}
          >
            <Text style={styles.languageTriggerFlag}>{getLanguageFlag(currentLanguage)}</Text>
          </TouchableOpacity>

          {/* Hamburger Menu */}
          <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
    <Modal visible={languagePickerOpen} transparent animationType="fade" onRequestClose={() => setLanguagePickerOpen(false)}>
      <View style={styles.languageOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setLanguagePickerOpen(false)} />
        <View style={styles.languageModal}>
          <Text style={styles.languageTitle}>{t('settings.selectLanguage')}</Text>
          {['fr', 'en', 'de'].map((language) => (
            <TouchableOpacity
              key={language}
              style={[styles.languageOption, currentLanguage === language && styles.languageOptionSelected]}
              onPress={() => void handleLanguageChange(language)}
            >
              <Text style={styles.languageOptionText}>{getLanguageLabel(language)}</Text>
              {currentLanguage === language && <Text style={styles.languageCheckmark}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.languageCloseButton} onPress={() => setLanguagePickerOpen(false)}>
            <Text style={styles.languageCloseText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

function getStyles(isDark: boolean) { return StyleSheet.create({
  container: {
    backgroundColor: '#7c3aed', // Violet
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  pointsText: {
    color: '#fde68a',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rankText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.9,
  },
  progressBarWrapper: {
    alignSelf: 'flex-start',
    width: 90,
    marginTop: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#fbbf24',
    borderRadius: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  languageTriggerFlag: {
    fontSize: 20,
    lineHeight: 24,
  },
  menuButton: {
    padding: 6,
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  familyNameText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 9,
    marginTop: 2,
  },
  languageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  languageModal: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 16,
    padding: 20,
  },
  languageTitle: {
    color: isDark ? '#f9fafb' : '#111827',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 14,
  },
  languageOption: {
    alignItems: 'center',
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 14,
  },
  languageOptionSelected: {
    backgroundColor: isDark ? '#3b2f6e' : '#f3e8ff',
    borderColor: '#7c3aed',
  },
  languageOptionText: {
    color: isDark ? '#f9fafb' : '#1f2937',
    fontSize: 16,
    fontWeight: '500',
  },
  languageCheckmark: {
    color: '#7c3aed',
    fontSize: 20,
    fontWeight: '700',
  },
  languageCloseButton: {
    alignItems: 'center',
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 10,
    marginTop: 4,
    padding: 14,
  },
  languageCloseText: {
    color: isDark ? '#f9fafb' : '#1f2937',
    fontSize: 15,
    fontWeight: '600',
  },
}); }
