/**
 * SplashScreen.tsx
 * Écran de démarrage affiché pendant l'initialisation de l'app
 * (chargement du token, initialisation Google Sign-In, etc.)
 * Fond blanc cassé neutre. L’introduction logo animée est gérée ensuite,
 * après l’onboarding éventuel, par AppContent.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });
    anim.start();
    // Cleanup: stop animation if component unmounts before completion
    // Prevents use-after-free crash in RCTNativeAnimatedNodesManager
    return () => anim.stop();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafaf8', // blanc cassé
  },
});
