import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ArrowNavigatorProps {
  pages: React.ReactNode[];
  currentIndex: number;
  onPageChange: (index: number) => void;
}

export default function ArrowNavigator({
  pages,
  currentIndex,
  onPageChange,
}: ArrowNavigatorProps) {
  const totalPages = pages.length;

  const handlePrevious = () => {
    const prevIndex = currentIndex === 0 ? totalPages - 1 : currentIndex - 1;
    onPageChange(prevIndex);
  };

  const handleNext = () => {
    const nextIndex = currentIndex === totalPages - 1 ? 0 : currentIndex + 1;
    onPageChange(nextIndex);
  };

  return (
    <View style={styles.container}>
      {/* Page actuelle */}
      <View style={styles.pageContainer}>
        {pages[currentIndex]}
      </View>

      {/* Flèche gauche */}
      <TouchableOpacity
        style={[styles.arrow, styles.leftArrow]}
        onPress={handlePrevious}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={32} color="#7c3aed" />
      </TouchableOpacity>

      {/* Flèche droite */}
      <TouchableOpacity
        style={[styles.arrow, styles.rightArrow]}
        onPress={handleNext}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={32} color="#7c3aed" />
      </TouchableOpacity>
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
