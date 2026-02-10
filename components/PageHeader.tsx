import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PageHeaderProps {
  title: string;
  buttonText?: string;
  onButtonPress?: () => void;
  buttonIcon?: string;
}

export default function PageHeader({
  title,
  buttonText,
  onButtonPress,
  buttonIcon = '+',
}: PageHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Titre centré */}
      <Text style={styles.title}>{title}</Text>
      
      {/* Bouton en dessous, centré */}
      {buttonText && onButtonPress && (
        <TouchableOpacity style={styles.button} onPress={onButtonPress}>
          <Text style={styles.buttonText}>
            {buttonIcon} {buttonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
