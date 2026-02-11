import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Favorite {
  id: string;
  name: string;
  icon: string; // Emoji or icon name
  color?: string; // Optional color for icon
  pageIndex: number;
}

interface FavoritesBarProps {
  favorites: Favorite[];
  onFavoritePress: (pageIndex: number) => void;
  onFavoriteSelect?: (favoriteId: string) => void; // Pour sélectionner/désélectionner
  allPages?: Array<{ id: string; name: string; icon: string; pageIndex: number }>; // Toutes les pages disponibles
}

export default function FavoritesBar({ 
  favorites, 
  onFavoritePress, 
  onFavoriteSelect,
  allPages = []
}: FavoritesBarProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Afficher 5 favoris maximum
  const displayedFavorites = favorites.slice(0, 5);
  
  // Remplir avec des slots vides si moins de 5 favoris
  const slots = Array(5).fill(null).map((_, index) => displayedFavorites[index] || null);

  const handleLongPress = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setShowModal(true);
  };

  const handleSelectPage = (page: any) => {
    if (onFavoriteSelect) {
      onFavoriteSelect(page.id);
    }
    setShowModal(false);
    setSelectedSlot(null);
  };

  const handleRemoveFavorite = (slotIndex: number) => {
    const favorite = slots[slotIndex];
    if (favorite && onFavoriteSelect) {
      onFavoriteSelect(favorite.id);
    }
    setShowModal(false);
    setSelectedSlot(null);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.favoritesRow}>
          {slots.map((favorite, index) => (
            <TouchableOpacity
              key={index}
              style={styles.favoriteSlot}
              onPress={() => favorite && onFavoritePress(favorite.pageIndex)}
              onLongPress={() => handleLongPress(index)}
              delayLongPress={500}
            >
              <View style={[
                styles.iconContainer, 
                favorite?.color && { backgroundColor: favorite.color },
                !favorite && styles.emptySlot
              ]}>
                {favorite ? (
                  <Text style={styles.iconEmoji}>{favorite.icon}</Text>
                ) : (
                  <Ionicons name="add" size={24} color="#9ca3af" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Modal pour sélectionner/désélectionner un favori */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {slots[selectedSlot!] ? 'Modifier le favori' : 'Ajouter un favori'}
            </Text>

            {/* Si un favori existe, option pour le retirer */}
            {slots[selectedSlot!] && (
              <TouchableOpacity
                style={[styles.modalOption, styles.removeOption]}
                onPress={() => handleRemoveFavorite(selectedSlot!)}
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
                <Text style={styles.removeText}>Retirer ce favori</Text>
              </TouchableOpacity>
            )}

            {/* Liste des pages disponibles */}
            <View style={styles.pagesContainer}>
              {allPages.map((page) => {
                const isSelected = favorites.some(f => f.id === page.id);
                return (
                  <TouchableOpacity
                    key={page.id}
                    style={[styles.pageOption, isSelected && styles.selectedPage]}
                    onPress={() => handleSelectPage(page)}
                    disabled={isSelected && slots[selectedSlot!]?.id !== page.id}
                  >
                    <Text style={styles.pageIcon}>{page.icon}</Text>
                    <Text style={styles.pageName}>{page.name}</Text>
                    {isSelected && slots[selectedSlot!]?.id !== page.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
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
  favoritesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  favoriteSlot: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlot: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  iconEmoji: {
    fontSize: 28,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  removeOption: {
    backgroundColor: '#fee2e2',
  },
  removeText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 12,
  },
  pagesContainer: {
    maxHeight: 300,
  },
  pageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  selectedPage: {
    backgroundColor: '#e5e7eb',
    opacity: 0.6,
  },
  pageIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pageName: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  cancelButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
});
