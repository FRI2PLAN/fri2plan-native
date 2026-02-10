import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PageHeaderWithArrowsProps {
  title: string;
  buttonText?: string;
  onButtonPress?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  showArrows?: boolean;
}

export default function PageHeaderWithArrows({
  title,
  buttonText,
  onButtonPress,
  onPrevious,
  onNext,
  showArrows = true,
}: PageHeaderWithArrowsProps) {
  return (
    <View style={styles.container}>
      {/* Title Row with Arrows */}
      <View style={styles.titleRow}>
        {/* Left Arrow */}
        {showArrows && onPrevious && (
          <TouchableOpacity
            style={styles.arrow}
            onPress={onPrevious}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#7c3aed" />
          </TouchableOpacity>
        )}

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Right Arrow */}
        {showArrows && onNext && (
          <TouchableOpacity
            style={styles.arrow}
            onPress={onNext}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={28} color="#7c3aed" />
          </TouchableOpacity>
        )}
      </View>

      {/* Button (if provided) */}
      {buttonText && onButtonPress && (
        <TouchableOpacity style={styles.button} onPress={onButtonPress}>
          <Text style={styles.buttonText}>+ {buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  arrow: {
    padding: 8,
    position: 'absolute',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
