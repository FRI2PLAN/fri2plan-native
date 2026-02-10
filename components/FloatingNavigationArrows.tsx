import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingNavigationArrowsProps {
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function FloatingNavigationArrows({
  onPrevious,
  onNext,
}: FloatingNavigationArrowsProps) {
  return (
    <View style={styles.container}>
      {/* Left Arrow */}
      {onPrevious && (
        <TouchableOpacity
          style={[styles.arrowButton, styles.leftArrow]}
          onPress={onPrevious}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={48} color="#ef4444" />
        </TouchableOpacity>
      )}

      {/* Right Arrow */}
      {onNext && (
        <TouchableOpacity
          style={[styles.arrowButton, styles.rightArrow]}
          onPress={onNext}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={48} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  arrowButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  leftArrow: {
    // Position à gauche
  },
  rightArrow: {
    // Position à droite
  },
});
