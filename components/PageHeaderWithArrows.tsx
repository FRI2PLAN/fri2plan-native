import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PageHeaderWithArrowsProps {
  title: string;
  buttonText?: string;
  onButtonPress?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function PageHeaderWithArrows({
  title,
  buttonText,
  onButtonPress,
  onPrevious,
  onNext,
}: PageHeaderWithArrowsProps) {
  return (
    <View style={styles.container}>
      {/* Title Row with Arrows - SIMPLE FLEXBOX */}
      <View style={styles.titleRow}>
        {/* Left Arrow */}
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={onPrevious}
          activeOpacity={0.6}
          disabled={!onPrevious}
        >
          {onPrevious ? (
            <Ionicons name="chevron-back" size={32} color="#7c3aed" />
          ) : (
            <View style={styles.placeholder} />
          )}
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Right Arrow */}
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={onNext}
          activeOpacity={0.6}
          disabled={!onNext}
        >
          {onNext ? (
            <Ionicons name="chevron-forward" size={32} color="#7c3aed" />
          ) : (
            <View style={styles.placeholder} />
          )}
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 32,
    height: 32,
  },
  title: {
    flex: 1,
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
