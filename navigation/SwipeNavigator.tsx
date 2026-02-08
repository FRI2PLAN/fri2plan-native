import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width

interface SwipeNavigatorProps {
  children: React.ReactNode;
  currentScreen: string;
  screens: string[];
}

export default function SwipeNavigator({ children, currentScreen, screens }: SwipeNavigatorProps) {
  const navigation = useNavigation();
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName as never);
  };

  const getNextScreen = () => {
    const currentIndex = screens.indexOf(currentScreen);
    const nextIndex = (currentIndex + 1) % screens.length; // Circular: wrap to 0 after last
    return screens[nextIndex];
  };

  const getPreviousScreen = () => {
    const currentIndex = screens.indexOf(currentScreen);
    const previousIndex = (currentIndex - 1 + screens.length) % screens.length; // Circular: wrap to last if at 0
    return screens[previousIndex];
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const translation = event.translationX;

      // Swipe left (next screen)
      if (translation < -SWIPE_THRESHOLD || velocity < -500) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 }, () => {
          runOnJS(navigateToScreen)(getNextScreen());
          translateX.value = 0;
        });
      }
      // Swipe right (previous screen)
      else if (translation > SWIPE_THRESHOLD || velocity > 500) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 }, () => {
          runOnJS(navigateToScreen)(getPreviousScreen());
          translateX.value = 0;
        });
      }
      // Reset if threshold not met
      else {
        translateX.value = withTiming(0, { duration: 300 });
      }
    });

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
