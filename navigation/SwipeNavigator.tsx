import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.5; // 50% of screen width - higher threshold to avoid accidental navigation
const VELOCITY_THRESHOLD = 1200; // Higher velocity threshold for intentional swipes
const MAX_TRANSLATE = SCREEN_WIDTH * 0.7; // Maximum translation during swipe (70% of screen)

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
      // Detect if it's a horizontal or vertical swipe
      const deltaX = Math.abs(event.translationX);
      const deltaY = Math.abs(event.translationY);

      // Only activate horizontal swipe if horizontal movement is dominant
      if (!isHorizontalSwipe.value && deltaX > 15) {
        if (deltaX > deltaY * 2) { // Stricter ratio: horizontal must be 2x vertical
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
        translateX.value = withSpring(0, {
          damping: 25,
          stiffness: 120,
          mass: 0.5,
        });
        return;
      }

      const velocity = event.velocityX;
      const translation = event.translationX;

      // Swipe left (next screen) - requires either distance OR high velocity
      if (translation < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) {
        translateX.value = withSpring(
          -SCREEN_WIDTH,
          {
            damping: 30,
            stiffness: 150,
            mass: 0.8,
          },
          () => {
            runOnJS(navigateToScreen)(getNextScreen());
            translateX.value = 0;
          }
        );
      }
      // Swipe right (previous screen) - requires either distance OR high velocity
      else if (translation > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        translateX.value = withSpring(
          SCREEN_WIDTH,
          {
            damping: 30,
            stiffness: 150,
            mass: 0.8,
          },
          () => {
            runOnJS(navigateToScreen)(getPreviousScreen());
            translateX.value = 0;
          }
        );
      }
      // Reset with rubber band effect if threshold not met
      else {
        translateX.value = withSpring(0, {
          damping: 25,
          stiffness: 120,
          mass: 0.5,
        });
      }
    })
    .activeOffsetX([-15, 15]) // Require 15px horizontal movement to activate (increased from 10px)
    .failOffsetY([-25, 25]); // Fail if vertical movement exceeds 25px (increased from 20px)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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
