import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolate,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width - lower for easier swipe
const VELOCITY_THRESHOLD = 800; // Lower velocity threshold for more responsive swipe
const MAX_TRANSLATE = SCREEN_WIDTH * 0.8; // Maximum translation during swipe (80% of screen)
const TRANSITION_DURATION = 300; // 0.3s as per user preference
const RESET_DELAY = 50; // Small delay before reset to allow new page to mount

interface SwipeNavigatorProps {
  children: React.ReactNode;
  currentScreen: string;
  screens: string[];
}

export default function SwipeNavigator({ children, currentScreen, screens }: SwipeNavigatorProps) {
  const navigation = useNavigation();
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isHorizontalSwipe = useSharedValue(false);
  const isTransitioning = useSharedValue(false);

  // Reset transitioning state when screen changes
  useEffect(() => {
    isTransitioning.value = false;
  }, [currentScreen]);

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName as never);
  };

  const getNextScreen = () => {
    'worklet';
    const currentIndex = screens.indexOf(currentScreen);
    const nextIndex = (currentIndex + 1) % screens.length;
    return screens[nextIndex];
  };

  const getPreviousScreen = () => {
    'worklet';
    const currentIndex = screens.indexOf(currentScreen);
    const previousIndex = (currentIndex - 1 + screens.length) % screens.length;
    return screens[previousIndex];
  };

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      startX.value = event.absoluteX;
      startY.value = event.absoluteY;
      isHorizontalSwipe.value = false;
    })
    .onUpdate((event) => {
      // Don't allow swipe during transition
      if (isTransitioning.value) return;

      // Detect if it's a horizontal or vertical swipe
      const deltaX = Math.abs(event.translationX);
      const deltaY = Math.abs(event.translationY);

      // Only activate horizontal swipe if horizontal movement is dominant
      if (!isHorizontalSwipe.value && deltaX > 10) {
        if (deltaX > deltaY * 1.5) { // Horizontal must be 1.5x vertical
          isHorizontalSwipe.value = true;
        }
      }

      // Only update translateX if it's a horizontal swipe
      if (isHorizontalSwipe.value) {
        // Apply rubber band effect: limit translation to MAX_TRANSLATE
        const clampedTranslation = interpolate(
          event.translationX,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-MAX_TRANSLATE, 0, MAX_TRANSLATE],
          Extrapolate.CLAMP
        );
        translateX.value = clampedTranslation;
      }
    })
    .onEnd((event) => {
      // Only navigate if it was a horizontal swipe
      if (!isHorizontalSwipe.value) {
        translateX.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
        return;
      }

      const velocity = event.velocityX;
      const translation = event.translationX;

      // Swipe left (next screen) - requires either distance OR high velocity
      if (translation < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) {
        isTransitioning.value = true;
        translateX.value = withTiming(
          -SCREEN_WIDTH,
          {
            duration: TRANSITION_DURATION,
            easing: Easing.out(Easing.cubic),
          },
          (finished) => {
            if (finished) {
              runOnJS(navigateToScreen)(getNextScreen());
              // Reset with delay to allow new page to mount
              translateX.value = withDelay(
                RESET_DELAY,
                withTiming(0, { duration: 0 })
              );
            }
          }
        );
      }
      // Swipe right (previous screen) - requires either distance OR high velocity
      else if (translation > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        isTransitioning.value = true;
        translateX.value = withTiming(
          SCREEN_WIDTH,
          {
            duration: TRANSITION_DURATION,
            easing: Easing.out(Easing.cubic),
          },
          (finished) => {
            if (finished) {
              runOnJS(navigateToScreen)(getPreviousScreen());
              // Reset with delay to allow new page to mount
              translateX.value = withDelay(
                RESET_DELAY,
                withTiming(0, { duration: 0 })
              );
            }
          }
        );
      }
      // Reset with smooth animation if threshold not met
      else {
        translateX.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
      }
    })
    .activeOffsetX([-10, 10]) // Require 10px horizontal movement to activate
    .failOffsetY([-25, 25]); // Fail if vertical movement exceeds 25px

  // Animated style with cross-fade effect
  const animatedStyle = useAnimatedStyle(() => {
    // If transitioning, keep opacity at 0 to prevent flash
    if (isTransitioning.value && Math.abs(translateX.value) > SCREEN_WIDTH * 0.9) {
      return {
        transform: [{ translateX: translateX.value }],
        opacity: 0,
      };
    }

    // Calculate opacity based on translation
    // When swiping, the current page fades out
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.5, SCREEN_WIDTH],
      [1, 0.5, 0], // Fade from 1 (visible) to 0 (invisible)
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX: translateX.value }],
      opacity,
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
