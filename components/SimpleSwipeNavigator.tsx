import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_SWIPE_DISTANCE = 80; // Même seuil que WebView

interface SimpleSwipeNavigatorProps {
  pages: React.ReactNode[];
  currentIndex: number;
  onPageChange: (index: number) => void;
}

type ContextType = {
  startX: number;
  startY: number;
};

export default function SimpleSwipeNavigator({ pages, currentIndex, onPageChange }: SimpleSwipeNavigatorProps) {
  const translateX = useSharedValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const totalPages = pages.length;

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, ContextType>({
    onStart: (event, context) => {
      context.startX = event.absoluteX;
      context.startY = event.absoluteY;
    },
    onActive: (event, context) => {
      const swipeDistanceX = event.absoluteX - context.startX;
      const swipeDistanceY = event.absoluteY - context.startY;

      // Vérifier que c'est un swipe horizontal (pas vertical)
      if (Math.abs(swipeDistanceY) > Math.abs(swipeDistanceX)) {
        return;
      }

      // Suivre le doigt pendant le swipe
      translateX.value = swipeDistanceX;
    },
    onEnd: (event, context) => {
      const swipeDistanceX = event.absoluteX - context.startX;
      const swipeDistanceY = event.absoluteY - context.startY;

      // Vérifier que c'est un swipe horizontal
      if (Math.abs(swipeDistanceY) > Math.abs(swipeDistanceX)) {
        translateX.value = withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) });
        return;
      }

      // Vérifier la distance minimale (80px comme WebView)
      if (Math.abs(swipeDistanceX) < MIN_SWIPE_DISTANCE) {
        translateX.value = withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) });
        return;
      }

      // Déterminer la direction et la page cible
      let targetIndex: number;
      let swipeDirection: 'left' | 'right';

      // Bloquer les interactions pendant la transition
      runOnJS(setIsTransitioning)(true);

      // Swipe vers la droite (page précédente)
      if (swipeDistanceX > 0) {
        targetIndex = currentIndex === 0 ? totalPages - 1 : currentIndex - 1;
        swipeDirection = 'right';
        runOnJS(setDirection)(swipeDirection);
        
        // Changer la page AVANT l'animation
        runOnJS(onPageChange)(targetIndex);
        
        // Animation: page actuelle sort vers la droite
        translateX.value = withTiming(SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.inOut(Easing.ease),
        }, () => {
          // Reset APRÈS l'animation
          translateX.value = 0;
          runOnJS(setIsTransitioning)(false);
          runOnJS(setDirection)(null);
        });
      }
      // Swipe vers la gauche (page suivante)
      else {
        targetIndex = currentIndex === totalPages - 1 ? 0 : currentIndex + 1;
        swipeDirection = 'left';
        runOnJS(setDirection)(swipeDirection);
        
        // Changer la page AVANT l'animation
        runOnJS(onPageChange)(targetIndex);
        
        // Animation: page actuelle sort vers la gauche
        translateX.value = withTiming(-SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.inOut(Easing.ease),
        }, () => {
          // Reset APRÈS l'animation
          translateX.value = 0;
          runOnJS(setIsTransitioning)(false);
          runOnJS(setDirection)(null);
        });
      }
    },
  });

  // Style animé pour la page actuelle (fade out prononcé)
  const currentPageStyle = useAnimatedStyle(() => {
    // Fade out plus rapide (coefficient 1.5 au lieu de 1)
    const progress = Math.abs(translateX.value) / SCREEN_WIDTH;
    const opacity = 1 - (progress * 1.5);
    return {
      transform: [{ translateX: translateX.value }],
      opacity: Math.max(0, opacity),
    };
  });

  // Style animé pour la page suivante (entre de la droite si swipe gauche)
  const nextPageStyle = useAnimatedStyle(() => {
    if (translateX.value >= 0) return { opacity: 0, transform: [{ translateX: SCREEN_WIDTH }] };
    
    const progress = Math.abs(translateX.value) / SCREEN_WIDTH;
    const opacity = progress;
    const translateValue = SCREEN_WIDTH - (progress * SCREEN_WIDTH);
    
    return {
      transform: [{ translateX: translateValue }],
      opacity,
    };
  });

  // Style animé pour la page précédente (entre de la gauche si swipe droite)
  const prevPageStyle = useAnimatedStyle(() => {
    if (translateX.value <= 0) return { opacity: 0, transform: [{ translateX: -SCREEN_WIDTH }] };
    
    const progress = translateX.value / SCREEN_WIDTH;
    const opacity = progress;
    const translateValue = -SCREEN_WIDTH + (progress * SCREEN_WIDTH);
    
    return {
      transform: [{ translateX: translateValue }],
      opacity,
    };
  });

  const prevIndex = currentIndex === 0 ? totalPages - 1 : currentIndex - 1;
  const nextIndex = currentIndex === totalPages - 1 ? 0 : currentIndex + 1;

  return (
    <PanGestureHandler
      onGestureEvent={gestureHandler}
      activeOffsetX={[-10, 10]}
      failOffsetY={[-10, 10]}
      enabled={!isTransitioning}
    >
      <Animated.View style={styles.container}>
        {/* Page précédente (visible pendant swipe droite) */}
        <Animated.View style={[styles.page, prevPageStyle]} pointerEvents="none">
          {pages[prevIndex]}
        </Animated.View>

        {/* Page actuelle */}
        <Animated.View style={[styles.page, currentPageStyle]}>
          {pages[currentIndex]}
        </Animated.View>

        {/* Page suivante (visible pendant swipe gauche) */}
        <Animated.View style={[styles.page, nextPageStyle]} pointerEvents="none">
          {pages[nextIndex]}
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: '#fff',
  },
});
