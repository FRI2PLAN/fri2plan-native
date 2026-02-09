import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InfiniteSwiperProps {
  pages: React.ReactNode[];
  currentIndex: number;
  onPageChange: (index: number) => void;
}

type ContextType = {
  startX: number;
};

export default function InfiniteSwiper({ pages, currentIndex, onPageChange }: InfiniteSwiperProps) {
  const translateX = useSharedValue(0);
  const totalPages = pages.length;

  // Calculer les indices avec boucle circulaire
  const getPrevIndex = (index: number) => (index - 1 + totalPages) % totalPages;
  const getNextIndex = (index: number) => (index + 1) % totalPages;

  const prevIndex = getPrevIndex(currentIndex);
  const nextIndex = getNextIndex(currentIndex);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, ContextType>({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      // Swipe horizontal fluide
      translateX.value = context.startX + event.translationX;
    },
    onEnd: (event) => {
      const velocity = event.velocityX;
      const translation = translateX.value;

      // Seuil de swipe : 30% de l'écran ou vélocité > 500
      const threshold = SCREEN_WIDTH * 0.3;
      const shouldSwipe = Math.abs(translation) > threshold || Math.abs(velocity) > 500;

      if (shouldSwipe) {
        // Swipe vers la droite (page précédente)
        if (translation > 0) {
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 }, () => {
            runOnJS(onPageChange)(prevIndex);
            translateX.value = 0;
          });
        }
        // Swipe vers la gauche (page suivante)
        else {
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, () => {
            runOnJS(onPageChange)(nextIndex);
            translateX.value = 0;
          });
        }
      } else {
        // Retour à la position initiale (swipe annulé)
        translateX.value = withTiming(0, { duration: 200 });
      }
    },
  });

  // Style animé pour la page précédente (à gauche)
  const prevPageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value - SCREEN_WIDTH }],
      opacity: translateX.value > 0 ? translateX.value / SCREEN_WIDTH : 0,
    };
  });

  // Style animé pour la page actuelle (au centre)
  const currentPageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: 1 - Math.abs(translateX.value) / SCREEN_WIDTH * 0.3,
    };
  });

  // Style animé pour la page suivante (à droite)
  const nextPageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value + SCREEN_WIDTH }],
      opacity: translateX.value < 0 ? Math.abs(translateX.value) / SCREEN_WIDTH : 0,
    };
  });

  return (
    <PanGestureHandler
      onGestureEvent={gestureHandler}
      activeOffsetX={[-20, 20]}
      failOffsetY={[-10, 10]}
    >
      <Animated.View style={styles.container}>
        {/* Page précédente */}
        <Animated.View style={[styles.page, prevPageStyle]}>
          {pages[prevIndex]}
        </Animated.View>

        {/* Page actuelle */}
        <Animated.View style={[styles.page, currentPageStyle]}>
          {pages[currentIndex]}
        </Animated.View>

        {/* Page suivante */}
        <Animated.View style={[styles.page, nextPageStyle]}>
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
  },
});
