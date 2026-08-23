import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingStep {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tips: string[];
  action?: {
    label: string;
    pageIndex: number;
  };
  category: 'essential' | 'premium' | 'advanced';
}

const getOnboardingSteps = (t: (key: string) => string): OnboardingStep[] => [
  {
    title: t('onboarding.welcomeTitle'),
    description: t('onboarding.welcomeSubtitle'),
    icon: "people",
    category: "essential",
    tips: [
      t('onboarding.guideIntro'),
      t('onboarding.guideRevisit'),
      t('onboarding.guideTip3') || "Chaque section a son propre mini-tutoriel pour vous guider"
    ]
  },
  {
    title: t('onboarding.calendarTitle'),
    description: t('onboarding.calendarDesc'),
    icon: "calendar",
    category: "essential",
    tips: [
      t('onboarding.calendarTip1'),
      t('onboarding.calendarTip2') || "Importez vos calendriers Google/Outlook en un clic",
      t('onboarding.calendarTip3') || "Activez les rappels pour ne rien oublier"
    ],
    action: {
      label: t('onboarding.calendarBtn') || "Explorer le calendrier",
      pageIndex: 1,
    },
  },
  {
    title: t('onboarding.tasksTitle'),
    description: t('onboarding.tasksDesc'),
    icon: "checkmark-circle",
    category: "essential",
    tips: [
      t('onboarding.tasksTip1'),
      t('onboarding.tasksTip2'),
      t('onboarding.tasksTip3')
    ],
    action: {
      label: t('onboarding.tasksBtn') || "Voir les tâches",
      pageIndex: 2,
    },
  },
  {
    title: t('onboarding.messagesTitle'),
    description: t('onboarding.messagesDesc'),
    icon: "chatbubbles",
    category: "essential",
    tips: [
      t('onboarding.messagesTip1'),
      t('onboarding.messagesTip2'),
      t('onboarding.messagesTip3') || "Partagez des photos et documents facilement"
    ],
    action: {
      label: t('onboarding.messagesBtn'),
      pageIndex: 5,
    },
  },
  {
    title: t('onboarding.shoppingTitle'),
    description: t('onboarding.shoppingDesc'),
    icon: "cart",
    category: "essential",
    tips: [
      t('onboarding.shoppingTip1'),
      t('onboarding.shoppingTip2') || "Les modifications sont synchronisées en temps réel",
      t('onboarding.shoppingTip3') || "Organisez vos articles par catégorie"
    ],
    action: {
      label: t('onboarding.shoppingBtn'),
      pageIndex: 3,
    },
  },
  {
    title: t('onboarding.budgetTitle'),
    description: t('onboarding.budgetDesc'),
    icon: "wallet",
    category: "premium",
    tips: [
      t('onboarding.budgetTip1'),
      t('onboarding.budgetTip2') || "Définissez un budget mensuel et recevez des alertes",
      t('onboarding.budgetTip3') || "Visualisez l'évolution de vos dépenses sur 30 jours"
    ],
    action: {
      label: t('onboarding.budgetBtn'),
      pageIndex: 8,
    },
  },
  {
    title: t('onboarding.notesTitle') || "Notes partagées 📝",
    description: t('onboarding.notesDesc') || "Créez des notes personnelles ou partagées avec la famille.",
    icon: "document-text",
    category: "premium",
    tips: [
      t('onboarding.notesTip1') || "Épinglez vos notes importantes en haut de la liste",
      t('onboarding.notesTip2') || "Ajoutez des images et documents (max 10 MB)",
      t('onboarding.notesTip3') || "Marquez une note comme privée si nécessaire"
    ],
    action: {
      label: t('onboarding.notesBtn') || "Voir les notes",
      pageIndex: 7,
    },
  },
  {
    title: t('onboarding.rewardsTitle') || "Système de récompenses 🏆",
    description: t('onboarding.rewardsDesc') || "Motivez les membres de la famille avec un système de points et de récompenses.",
    icon: "trophy",
    category: "premium",
    tips: [
      t('onboarding.rewardsTip1') || "Chaque tâche terminée rapporte des points",
      t('onboarding.rewardsTip2') || "Créez des récompenses personnalisées pour votre famille",
      t('onboarding.rewardsTip3') || "Les enfants peuvent échanger leurs points contre des récompenses"
    ],
    action: {
      label: t('onboarding.rewardsBtn') || "Voir les récompenses",
      pageIndex: 9,
    },
  },
  {
    title: t('onboarding.readyTitle'),
    description: t('onboarding.readyDesc'),
    icon: "checkmark-done-circle",
    category: "essential",
    tips: [
      t('onboarding.readyTip1') || "Vous pouvez revisiter ce guide depuis Paramètres > Centre d'aide",
      t('onboarding.readyTip2') || "Chaque section a son propre tutoriel détaillé",
      t('onboarding.readyTip3') || "N'hésitez pas à nous contacter si vous avez des questions"
    ]
  },
];

interface OnboardingScreenProps {
  visible: boolean;
  onComplete: () => void;
  onNavigate?: (pageIndex: number) => void;
}

export default function OnboardingScreen({ visible, onComplete, onNavigate }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const ONBOARDING_STEPS = getOnboardingSteps(t);
  const [currentStep, setCurrentStep] = useState(0);
  const prevVisibleRef = useRef(false);

  // Réinitialiser à l'étape 0 chaque fois que l'onboarding devient visible
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setCurrentStep(0);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onComplete}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          {/* Progress Bar */}
          <View style={[styles.progressContainer, { paddingTop: insets.top + 10 }]}> 
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <View style={[
              styles.iconContainer,
              step.category === 'premium' && styles.iconContainerPremium,
              step.category === 'advanced' && styles.iconContainerAdvanced,
            ]}>
              <Ionicons 
                name={step.icon} 
                size={64} 
                color="#ffffff" 
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>{step.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{step.description}</Text>

            {/* Tips */}
            <View style={styles.tipsContainer}>
              {step.tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Ionicons name="bulb" size={16} color="#eab308" />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            {/* Boutons Explorer supprimés — l'utilisateur doit parcourir tout l'onboarding */}
          </ScrollView>

          {/* Deux zones tactiles larges : l'onboarding ne doit jamais retenir l'utilisateur. */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={styles.skipFooterButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipFooterText}>{t('onboarding.skipIntroduction')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>{isLastStep ? t('onboarding.finish') : t('onboarding.next')}</Text>
              <Ionicons name={isLastStep ? 'checkmark' : 'chevron-forward'} size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#fffdf7',
  },
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
  },
  progressBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#e9e5ef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 2,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  skipText: {
    color: '#5b21b6',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainerPremium: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  iconContainerAdvanced: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f1633',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#655c72',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  tipsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f5f1fa',
    padding: 12,
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#3d3648',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9e5ef',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  indicatorActive: {
    backgroundColor: '#7c3aed',
    width: 24,
  },
  skipFooterButton: {
    alignItems: 'center',
    borderColor: '#7c3aed',
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 10,
  },
  skipFooterText: {
    color: '#5b21b6',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  nextButton: {
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
