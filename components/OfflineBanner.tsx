/**
 * OfflineBanner — Indicateur visuel de mode hors ligne
 *
 * Affiche une bannière en haut de l'écran quand l'appareil est hors ligne.
 * Disparaît automatiquement quand la connexion revient.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface OfflineBannerProps {
  onReconnect?: () => void;
  queueSize?: number;
}

export function OfflineBanner({ onReconnect, queueSize = 0 }: OfflineBannerProps) {
  const { isConnected } = useNetworkStatus(onReconnect);
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const anim = Animated.timing(slideAnim, {
      toValue: isConnected ? -50 : 0,
      duration: 300,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [isConnected, slideAnim]);

  if (isConnected) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.icon}>📵</Text>
      <View>
        <Text style={styles.title}>Mode hors ligne</Text>
        {queueSize > 0 && (
          <Text style={styles.subtitle}>
            {queueSize} action{queueSize > 1 ? 's' : ''} en attente de synchronisation
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E53E3E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    elevation: 10,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 1,
  },
});
