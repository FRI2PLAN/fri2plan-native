import { SafeAreaView } from 'react-native-safe-area-context';
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

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Bienvenue sur FRI2PLAN ! 🎉",
    description: "Votre organiseur familial complet pour gérer le quotidien ensemble. Découvrez comment utiliser l'application en quelques étapes simples.",
    icon: "people",
    category: "essential",
    tips: [
      "Suivez ce guide pour découvrir toutes les fonctionnalités",
      "Vous pourrez revisiter ce tutoriel à tout moment depuis les paramètres",
      "Chaque section a son propre mini-tutoriel pour vous guider"
    ]
  },
  {
    title: "Calendrier familial 📅",
    description: "Créez et partagez des événements avec toute la famille. Synchronisez vos calendriers externes et activez le Calendrier Intime pour un suivi personnel.",
    icon: "calendar",
    category: "essential",
    tips: [
      "Cliquez sur une date pour créer un événement rapidement",
      "Importez vos calendriers Google/Outlook en un clic",
      "Activez les rappels pour ne rien oublier"
    ],
    action: {
      label: "Explorer le calendrier",
      pageIndex: 1,
    },
  },
  {
    title: "Gestion des tâches ✅",
    description: "Organisez vos tâches, assignez-les aux membres de la famille et suivez leur progression. Gagnez des points en complétant des tâches !",
    icon: "checkmark-circle",
    category: "essential",
    tips: [
      "Maintenez appuyé sur une tâche pour accéder aux actions rapides",
      "Utilisez les priorités pour organiser vos tâches",
      "Marquez vos tâches favorites pour y accéder rapidement"
    ],
    action: {
      label: "Voir les tâches",
      pageIndex: 2,
    },
  },
  {
    title: "Messages et groupes 💬",
    description: "Communiquez en temps réel avec votre famille. Créez des groupes thématiques pour organiser vos conversations.",
    icon: "chatbubbles",
    category: "essential",
    tips: [
      "Les messages sont instantanés grâce à la technologie WebSocket",
      "Créez des groupes pour différents sujets (Courses, Vacances...)",
      "Partagez des photos et documents facilement"
    ],
    action: {
      label: "Accéder aux messages",
      pageIndex: 5,
    },
  },
  {
    title: "Listes de courses 🛒",
    description: "Créez des listes de courses partagées. Cochez les articles en temps réel pendant vos achats.",
    icon: "cart",
    category: "essential",
    tips: [
      "Créez plusieurs listes pour différents magasins",
      "Les modifications sont synchronisées en temps réel",
      "Organisez vos articles par catégorie"
    ],
    action: {
      label: "Voir les courses",
      pageIndex: 3,
    },
  },
  {
    title: "Budget et dépenses 💰",
    description: "Suivez vos dépenses familiales, visualisez vos statistiques et gérez votre budget mensuel. (Fonctionnalité Premium)",
    icon: "wallet",
    category: "premium",
    tips: [
      "Enregistrez toutes vos dépenses avec catégorie",
      "Définissez un budget mensuel et recevez des alertes",
      "Visualisez l'évolution de vos dépenses sur 30 jours"
    ],
    action: {
      label: "Gérer le budget",
      pageIndex: 8,
    },
  },
  {
    title: "Notes partagées 📝",
    description: "Créez des notes personnelles ou partagées avec la famille. Ajoutez des pièces jointes et épinglez les notes importantes. (Premium)",
    icon: "document-text",
    category: "premium",
    tips: [
      "Épinglez vos notes importantes en haut de la liste",
      "Ajoutez des images et documents (max 10 MB)",
      "Marquez une note comme privée si nécessaire"
    ],
    action: {
      label: "Voir les notes",
      pageIndex: 7,
    },
  },
  {
    title: "Système de récompenses 🏆",
    description: "Motivez les membres de la famille avec un système de points et de récompenses personnalisées. (Premium)",
    icon: "trophy",
    category: "premium",
    tips: [
      "Chaque tâche terminée rapporte des points",
      "Créez des récompenses personnalisées pour votre famille",
      "Les enfants peuvent échanger leurs points contre des récompenses"
    ],
    action: {
      label: "Voir les récompenses",
      pageIndex: 9,
    },
  },
  {
    title: "Vous êtes prêt ! 🚀",
    description: "Vous avez découvert toutes les fonctionnalités principales. Commencez à organiser votre vie familiale dès maintenant !",
    icon: "checkmark-done-circle",
    category: "essential",
    tips: [
      "Vous pouvez revisiter ce guide depuis Paramètres > Centre d'aide",
      "Chaque section a son propre tutoriel détaillé",
      "N'hésitez pas à nous contacter si vous avez des questions"
    ]
  },
];

interface OnboardingScreenProps {
  visible: boolean;
  onComplete: () => void;
  onNavigate?: (pageIndex: number) => void;
}

export default function OnboardingScreen({ visible, onComplete, onNavigate }: OnboardingScreenProps) {
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
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onComplete}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Passer</Text>
            </TouchableOpacity>
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

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, isFirstStep && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={isFirstStep}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={isFirstStep ? '#9ca3af' : '#7c3aed'} 
              />
              <Text style={[styles.navButtonText, isFirstStep && styles.navButtonTextDisabled]}>
                Précédent
              </Text>
            </TouchableOpacity>

            {/* Step Indicators */}
            <View style={styles.indicators}>
              {ONBOARDING_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentStep && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text style={styles.navButtonText}>
                {isLastStep ? 'Terminer' : 'Suivant'}
              </Text>
              <Ionicons 
                name={isLastStep ? "checkmark" : "chevron-forward"} 
                size={24} 
                color="#7c3aed" 
              />
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 2,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    color: '#ffffff',
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
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#d1d5db',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#e5e7eb',
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
});
