import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

type FamilyLogoIntroProps = {
  onComplete: () => void;
};

const INTRO_DURATION_MS = 3_000;
const FADE_DURATION_MS = 300;

/**
 * Premier temps de l’accueil : le logo vit seul sur fond blanc cassé, sans
 * spinner. Son mouvement lent prépare la transition vers le verre familial.
 */
export default function FamilyLogoIntro({ onComplete }: FamilyLogoIntroProps) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.99, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.03, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    breathing.start();

    const revealTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onCompleteRef.current();
      });
    }, INTRO_DURATION_MS - FADE_DURATION_MS);

    return () => {
      breathing.stop();
      clearTimeout(revealTimer);
    };
  }, [opacity, scale]);

  return (
    <View style={styles.screen} accessibilityLabel="FRI2PLAN">
      <Animated.View style={[styles.logoWrap, { opacity, transform: [{ scale }] }]}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#fffdf7', flex: 1, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logo: { height: 128, width: 220 },
});
