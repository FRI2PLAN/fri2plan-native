import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type FamilyLoadingScreenProps = {
  onComplete: () => void;
};

const STAGES = [
  'dashboard.loadingSocks',
  'dashboard.loadingCalendar',
  'dashboard.loadingChores',
  'dashboard.loadingMeals',
  'dashboard.loadingOrder',
] as const;

const STAGE_DURATION_MS = 2_000;
const FINAL_MESSAGE_DURATION_MS = 450;

export default function FamilyLoadingScreen({ onComplete }: FamilyLoadingScreenProps) {
  const { t } = useTranslation();
  const progress = useRef(new Animated.Value(0.06)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const bubbles = useRef(new Animated.Value(0)).current;
  const [displayProgress, setDisplayProgress] = useState(6);
  const [stageIndex, setStageIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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
    const target = ready ? 1 : Math.min(0.9, (stageIndex + 1) * (0.9 / STAGES.length));
    Animated.timing(progress, {
      toValue: target,
      duration: ready ? 320 : 1_400,
      easing: ready ? Easing.out(Easing.cubic) : Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress, ready, stageIndex]);

  useEffect(() => {
    // Cinq étapes de deux secondes : l’animation est un sas d’accueil volontaire
    // et ne dépend pas de la fin d’une requête réseau particulière.
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const stageTimer = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, STAGE_DURATION_MS);
    const completionTimer = setTimeout(() => {
      setReady(true);
      revealTimer = setTimeout(() => onCompleteRef.current(), FINAL_MESSAGE_DURATION_MS);
    }, STAGES.length * STAGE_DURATION_MS);

    return () => {
      clearInterval(stageTimer);
      clearTimeout(completionTimer);
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, []);

  const liquidHeight = progress.interpolate({ inputRange: [0, 1], outputRange: ['5%', '96%'] });
  const waveTranslate = wave.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const bubbleTranslate = bubbles.interpolate({ inputRange: [0, 1], outputRange: [18, -68] });

  return (
    <View style={styles.screen} accessibilityLabel={t('dashboard.loadingAria')}>
      <View style={styles.glassAssembly}>
        <View style={styles.glass}>
          <View pointerEvents="none" style={styles.glassRim} />
          <Animated.View style={[styles.liquid, { height: liquidHeight }]}>
            <Animated.View style={[styles.wave, { transform: [{ translateX: waveTranslate }] }]} />
            <Animated.View style={[styles.bubble, styles.bubbleOne, { transform: [{ translateY: bubbleTranslate }] }]} />
            <Animated.View style={[styles.bubble, styles.bubbleTwo, { transform: [{ translateY: bubbleTranslate }] }]} />
            <Animated.View style={[styles.bubble, styles.bubbleThree, { transform: [{ translateY: bubbleTranslate }] }]} />
          </Animated.View>
          <View pointerEvents="none" style={styles.glassReflection} />
        </View>
        <View style={styles.glassBase} />
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
  screen: { alignItems: 'center', backgroundColor: '#fffdf7', flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  glassAssembly: { alignItems: 'center', marginBottom: 2 },
  glass: { backgroundColor: 'rgba(255,255,255,0.48)', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, borderColor: '#6d3be8', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 2, height: 166, overflow: 'hidden', width: 108 },
  glassRim: { borderColor: '#6d3be8', borderRadius: 999, borderWidth: 2, height: 12, left: 7, position: 'absolute', right: 7, top: -6, zIndex: 4 },
  glassReflection: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 99, bottom: 22, left: 12, position: 'absolute', top: 18, width: 5, zIndex: 3 },
  glassBase: { backgroundColor: 'rgba(109,59,232,0.18)', borderRadius: 99, height: 7, marginTop: 8, width: 92 },
  liquid: { backgroundColor: '#8b5cf6', bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0 },
  wave: { backgroundColor: 'rgba(255,255,255,0.34)', borderRadius: 22, height: 12, position: 'absolute', top: -6, width: 152 },
  bubble: { backgroundColor: 'rgba(255,255,255,0.56)', borderRadius: 10, position: 'absolute' },
  bubbleOne: { height: 7, left: 20, width: 7 },
  bubbleTwo: { height: 5, left: 52, width: 5 },
  bubbleThree: { height: 4, left: 38, top: 20, width: 4 },
  message: { color: '#312e4e', fontSize: 16, fontWeight: '700', marginTop: 24, minHeight: 25, textAlign: 'center' },
  progressTrack: { backgroundColor: '#ebe7fb', borderRadius: 999, height: 8, marginTop: 18, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: '#7c3aed', borderRadius: 999, height: '100%' },
  progressText: { color: '#796f98', fontSize: 13, fontWeight: '700', marginTop: 8 },
});
