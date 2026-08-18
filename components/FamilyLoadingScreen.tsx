import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type FamilyLoadingScreenProps = {
  ready: boolean;
};

const STAGES = [
  'dashboard.loadingSocks',
  'dashboard.loadingCalendar',
  'dashboard.loadingChores',
  'dashboard.loadingMeals',
  'dashboard.loadingOrder',
] as const;

export default function FamilyLoadingScreen({ ready }: FamilyLoadingScreenProps) {
  const { t } = useTranslation();
  const progress = useRef(new Animated.Value(0.06)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const bubbles = useRef(new Animated.Value(0)).current;
  const [displayProgress, setDisplayProgress] = useState(6);

  useEffect(() => {
    const progressListener = progress.addListener(({ value }) => setDisplayProgress(Math.round(value * 100)));
    return () => progress.removeListener(progressListener);
  }, [progress]);

  useEffect(() => {
    const waveLoop = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    const bubblesLoop = Animated.loop(
      Animated.timing(bubbles, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    waveLoop.start();
    bubblesLoop.start();
    return () => {
      waveLoop.stop();
      bubblesLoop.stop();
    };
  }, [bubbles, wave]);

  useEffect(() => {
    const target = ready ? 1 : 0.9;
    Animated.timing(progress, {
      toValue: target,
      duration: ready ? 320 : 2400,
      easing: ready ? Easing.out(Easing.cubic) : Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress, ready]);

  const stageIndex = useMemo(() => Math.min(STAGES.length - 1, Math.floor((displayProgress / 100) * STAGES.length)), [displayProgress]);
  const liquidHeight = progress.interpolate({ inputRange: [0, 1], outputRange: ['5%', '96%'] });
  const waveTranslate = wave.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const bubbleTranslate = bubbles.interpolate({ inputRange: [0, 1], outputRange: [18, -68] });

  return (
    <View style={styles.screen} accessibilityLabel={t('dashboard.loadingAria')}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.glass}>
        <Animated.View style={[styles.liquid, { height: liquidHeight }]}>
          <Animated.View style={[styles.wave, { transform: [{ translateX: waveTranslate }] }]} />
          <Animated.View style={[styles.bubble, styles.bubbleOne, { transform: [{ translateY: bubbleTranslate }] }]} />
          <Animated.View style={[styles.bubble, styles.bubbleTwo, { transform: [{ translateY: bubbleTranslate }] }]} />
          <Animated.View style={[styles.bubble, styles.bubbleThree, { transform: [{ translateY: bubbleTranslate }] }]} />
        </Animated.View>
      </View>
      <Text style={styles.message}>{ready ? t('dashboard.loadingReady') : t(STAGES[stageIndex])}</Text>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={styles.progressText}>{displayProgress} %</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#fffdf7', minHeight: 430, paddingHorizontal: 32, paddingTop: 46 },
  logo: { height: 46, marginBottom: 22, width: 150 },
  glass: { borderColor: '#6d3be8', borderRadius: 22, borderWidth: 2, height: 160, overflow: 'hidden', width: 96 },
  liquid: { backgroundColor: '#8b5cf6', bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0 },
  wave: { backgroundColor: 'rgba(255,255,255,0.34)', borderRadius: 22, height: 12, position: 'absolute', top: -6, width: 140 },
  bubble: { backgroundColor: 'rgba(255,255,255,0.56)', borderRadius: 10, position: 'absolute' },
  bubbleOne: { height: 7, left: 20, width: 7 },
  bubbleTwo: { height: 5, left: 52, width: 5 },
  bubbleThree: { height: 4, left: 38, top: 20, width: 4 },
  message: { color: '#312e4e', fontSize: 16, fontWeight: '700', marginTop: 24, minHeight: 25, textAlign: 'center' },
  progressTrack: { backgroundColor: '#ebe7fb', borderRadius: 999, height: 8, marginTop: 18, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: '#7c3aed', borderRadius: 999, height: '100%' },
  progressText: { color: '#796f98', fontSize: 13, fontWeight: '700', marginTop: 8 },
});
