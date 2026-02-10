import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Favorite {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  pageIndex: number;
}

interface FavoritesBarProps {
  favorites: Favorite[];
  onFavoritePress: (pageIndex: number) => void;
}

export default function FavoritesBar({ favorites, onFavoritePress }: FavoritesBarProps) {
  if (favorites.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favoris</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {favorites.map((favorite) => (
          <TouchableOpacity
            key={favorite.id}
            style={styles.favoriteButton}
            onPress={() => onFavoritePress(favorite.pageIndex)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={favorite.icon} size={24} color="#7c3aed" />
            </View>
            <Text style={styles.favoriteText}>{favorite.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  scrollContent: {
    gap: 12,
  },
  favoriteButton: {
    alignItems: 'center',
    minWidth: 80,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  favoriteText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
