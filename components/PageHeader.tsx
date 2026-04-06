import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface PageHeaderProps {
  title: string;
  buttonText?: string;
  onButtonPress?: () => void;
  buttonIcon?: string;
}

export default function PageHeader({
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
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

function getStyles(isDark: boolean) { return StyleSheet.create({
  container: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#1f2937',
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
}); }
