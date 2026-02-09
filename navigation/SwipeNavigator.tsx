import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen width (reduced for faster response)
const VELOCITY_THRESHOLD = 800; // Increased velocity threshold

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
      if (!isHorizontalSwipe.value && deltaX > 10) {
        if (deltaX > deltaY * 1.5) {
          isHorizontalSwipe.value = true;
        }
      }

      // Only update translateX if it's a horizontal swipe
      if (isHorizontalSwipe.value) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      // Only navigate if it was a horizontal swipe
      if (!isHorizontalSwipe.value) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
        return;
      }

      const velocity = event.velocityX;
      const translation = event.translationX;

      // Swipe left (next screen)
      if (translation < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH, { damping: 20, stiffness: 90 }, () => {
          runOnJS(navigateToScreen)(getNextScreen());
          translateX.value = 0;
        });
      }
      // Swipe right (previous screen)
      else if (translation > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH, { damping: 20, stiffness: 90 }, () => {
          runOnJS(navigateToScreen)(getPreviousScreen());
          translateX.value = 0;
        });
      }
      // Reset if threshold not met
      else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
      }
    })
    .activeOffsetX([-10, 10]) // Require 10px horizontal movement to activate
    .failOffsetY([-20, 20]); // Fail if vertical movement exceeds 20px

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
