import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { familyPalette, motion } from '../constants/experience';

type CompletionFeedbackProps = {
  visible: boolean;
  points?: number;
  color?: string;
  celebrate?: boolean;
};

/**
 * Feedback non bloquant affiché au-dessus d’une carte après une validation.
 * La logique de persistance reste dans l’écran : ce composant ne modifie aucune donnée.
 */
export function CompletionFeedback({
  visible,
  points = 0,
  color = familyPalette.reward,
  celebrate = false,
}: CompletionFeedbackProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  const scale = useSharedValue(0.82);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      return;
    }

    opacity.value = withSequence(
      withTiming(1, { duration: motion.micro }),
      withTiming(0, { duration: motion.standard }),
    );
    translateY.value = withTiming(-24, { duration: motion.feedbackVisible });
    scale.value = withSequence(
      withSpring(1.14, motion.completionSpring),
      withSpring(1, motion.completionSpring),
    );
  }, [visible, opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    // React Native 0.81 contraint le type d’un tableau de transforms hétérogènes.
    // Reanimated accepte correctement ces deux transforms exécutées côté UI.
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ] as any,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { backgroundColor: color }, animatedStyle]}
    >
      <View style={styles.content}>
        {celebrate && <Text style={styles.sparkle}>✦</Text>}
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.label}>{points > 0 ? `+${points} points` : 'Fait !'}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 18,
    top: 8,
    zIndex: 20,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  sparkle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
