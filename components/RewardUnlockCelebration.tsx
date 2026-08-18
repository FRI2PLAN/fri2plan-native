import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomInEasyDown } from 'react-native-reanimated';

type RewardUnlockCelebrationProps = {
  visible: boolean;
  rewardName?: string;
  onDismiss: () => void;
  title: string;
  subtitle: string;
};

export function RewardUnlockCelebration({
  visible,
  rewardName,
  onDismiss,
  title,
  subtitle,
}: RewardUnlockCelebrationProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <Animated.View entering={ZoomInEasyDown.duration(300)} style={styles.card}>
        <Text style={styles.confetti}>✦  ·  ✧  ·  ✦</Text>
        <Text style={styles.gift}>🎁</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.rewardName} numberOfLines={2}>{rewardName}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 18, 52, 0.44)',
  },
  card: {
    width: '82%',
    maxWidth: 340,
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 26,
    backgroundColor: '#FFFEFB',
    borderWidth: 2,
    borderColor: '#FCD34D',
    shadowColor: '#3B2460',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  confetti: { color: '#A855F7', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  gift: { fontSize: 54, marginTop: 8 },
  title: { color: '#4C1D95', fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  rewardName: { color: '#1F1630', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 7 },
  subtitle: { color: '#6D5A82', fontSize: 13, textAlign: 'center', marginTop: 8 },
});
