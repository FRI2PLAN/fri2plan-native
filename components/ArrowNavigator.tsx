import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ArrowNavigatorProps {
  pages: React.ReactNode[];
  currentIndex: number;
  onPageChange: (index: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function ArrowNavigator({
  pages,
  currentIndex,
  onPageChange,
  onPrevious,
  onNext,
}: ArrowNavigatorProps) {
  const totalPages = pages.length;

  const handlePrevious = () => {
    const prevIndex = currentIndex === 0 ? totalPages - 1 : currentIndex - 1;
    onPageChange(prevIndex);
    onPrevious?.();
  };

  const handleNext = () => {
    const nextIndex = currentIndex === totalPages - 1 ? 0 : currentIndex + 1;
    onPageChange(nextIndex);
    onNext?.();
  };

  // Clone page with arrow handlers
  const pageWithArrows = React.cloneElement(pages[currentIndex] as React.ReactElement, {
    onPrevious: handlePrevious,
    onNext: handleNext,
  });

  return (
    <View style={styles.container}>
      {/* Page actuelle with arrow handlers */}
      <View style={styles.pageContainer}>
        {pageWithArrows}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  pageContainer: {
    flex: 1,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -24 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
});
