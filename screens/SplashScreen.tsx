/**
 * SplashScreen.tsx
 * Écran de démarrage affiché pendant l'initialisation de l'app
 * (chargement du token, initialisation Google Sign-In, etc.)
 * Fond blanc cassé + logo FRI2PLAN + spinner violet
 */
import React, { useEffect, useRef } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Animated } from 'react-native';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="large"
        color="#7c3aed"
        style={styles.spinner}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafaf8', // blanc cassé
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 40,
  },
  spinner: {
    marginTop: 8,
  },
});
