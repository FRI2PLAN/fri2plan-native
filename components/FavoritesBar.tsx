import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface Favorite {
  id: string;
  name: string;
  icon: string;
  color?: string;
  pageIndex: number;
}

interface FavoritesBarProps {
  favorites: Favorite[];
  onFavoritePress: (pageIndex: number) => void;
  onFavoriteSelect?: (favoriteId: string) => void;
  allPages?: Array<{ id: string; name: string; icon: string; pageIndex: number }>;
}

export default function FavoritesBar({
  const { isDark } = useTheme();
  const styles = getStyles(isDark); 
  favorites, 
  onFavoritePress, 
  onFavoriteSelect,
  allPages = []
}: FavoritesBarProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const displayedFavorites = favorites.slice(0, 5);
  const slots = Array(5).fill(null).map((_, index) => displayedFavorites[index] || null);

  const handleLongPress = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setShowModal(true);
  };

  const handlePress = (slotIndex: number) => {
    const favorite = slots[slotIndex];
    if (favorite) {
      onFavoritePress(favorite.pageIndex);
    } else {
      setSelectedSlot(slotIndex);
      setShowModal(true);
    }
  };

  const handleSelectPage = (page: any) => {
    if (onFavoriteSelect) {
      onFavoriteSelect(page.id);
    }
    setShowModal(false);
    setSelectedSlot(null);
  };

  const handleRemoveFavorite = () => {
    const favorite = slots[selectedSlot!];
    if (favorite && onFavoriteSelect) {
      onFavoriteSelect(favorite.id);
    }
    setShowModal(false);
    setSelectedSlot(null);
  };

  const currentFavorite = selectedSlot !== null ? slots[selectedSlot] : null;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.favoritesRow}>
          {slots.map((favorite, index) => (
            <TouchableOpacity
              key={index}
              style={styles.favoriteSlot}
              onPress={() => handlePress(index)}
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
              {favorite && (
                <Text style={styles.favoriteLabel} numberOfLines={1}>
                  {favorite.name}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.handleBar} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentFavorite 
                  ? t('favorites.editShortcut', 'Modifier le raccourci')
                  : t('favorites.addShortcut', 'Ajouter un raccourci')
                }
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {currentFavorite && (
              <TouchableOpacity
                style={styles.removeOption}
                onPress={handleRemoveFavorite}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.removeText}>
                  {t('favorites.remove', 'Supprimer ce raccourci')}
                </Text>
              </TouchableOpacity>
            )}

            {currentFavorite && allPages.length > 0 && (
              <View style={styles.separator}>
                <Text style={styles.separatorText}>
                  {t('favorites.chooseOther', 'Choisir une autre page')}
                </Text>
              </View>
            )}

            <ScrollView 
              style={styles.pagesScrollContainer}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
              indicatorStyle="black"
              contentContainerStyle={styles.pagesScrollContent}
            >
              {allPages.map((page) => {
                const isSelected = favorites.some(f => f.id === page.id);
                const isCurrentSlot = currentFavorite?.id === page.id;
                return (
                  <TouchableOpacity
                    key={page.id}
                    style={[
                      styles.pageOption, 
                      isSelected && !isCurrentSlot && styles.selectedPage
                    ]}
                    onPress={() => handleSelectPage(page)}
                    disabled={isSelected && !isCurrentSlot}
                  >
                    <Text style={styles.pageIcon}>{page.icon}</Text>
                    <Text style={[
                      styles.pageName,
                      isSelected && !isCurrentSlot && styles.pageNameDisabled
                    ]}>
                      {page.name}
                    </Text>
                    {isCurrentSlot && (
                      <Ionicons name="checkmark-circle" size={20} color="#7c3aed" />
                    )}
                    {isSelected && !isCurrentSlot && (
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function getStyles(isDark: boolean) { return StyleSheet.create({
  container: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  favoritesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  favoriteSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlot: {
    borderWidth: 2,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  iconEmoji: {
    fontSize: 26,
  },
  favoriteLabel: {
    fontSize: 10,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
    maxWidth: 56,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 420,
    paddingBottom: 32,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#f9fafb' : '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  removeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
  removeText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '600',
  },
  separator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  separatorText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pagesScrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pagesScrollContent: {
    paddingVertical: 8,
  },
  pageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: isDark ? '#111827' : '#f9fafb',
    marginBottom: 8,
  },
  selectedPage: {
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    opacity: 0.6,
  },
  pageIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pageName: {
    fontSize: 16,
    color: isDark ? '#f9fafb' : '#1f2937',
    flex: 1,
    fontWeight: '500',
  },
  pageNameDisabled: {
    color: '#9ca3af',
  },
}); }
