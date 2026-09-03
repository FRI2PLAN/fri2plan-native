/**
 * AddToShoppingModal.tsx
 * Modale d'ajout aux courses depuis un repas.
 * - Sélecteur de convives avec recalcul des quantités
 * - Cases à cocher par ingrédient
 * - Ajout à une liste existante ou création d'une nouvelle liste
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';
import { useTheme } from '../contexts/ThemeContext';

interface ShoppingList {
  id: number;
  name: string;
  isArchived?: boolean | number;
}

interface AddToShoppingModalProps {
  visible: boolean;
  onClose: () => void;
  mealServings: number;
  ingredients: string[]; // liste déjà parsée depuis openAddToShopping
  activeLists: ShoppingList[];
  familyId: number;
  onListCreated?: () => void; // callback pour invalider la query des listes
}

type ShoppingIngredient = { name: string; quantity?: string };

/** Recalcule les valeurs numériques dans une chaîne d'ingrédient selon le ratio */
function scaleIngredient(ing: string, ratio: number): string {
  if (ratio === 1) return ing;
  return ing.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(',', '.'));
    const scaled = num * ratio;
    const result = Math.round(scaled * 10) / 10;
    return result % 1 === 0 ? String(result) : String(result).replace('.', ',');
  });
}

/** Sépare « 560 g pâtes » en quantité et article pour permettre la fusion côté serveur. */
function toShoppingIngredient(ingredient: string): ShoppingIngredient {
  const normalized = ingredient.trim().replace(/\s+/g, ' ');
  const match = normalized.match(/^((?:\d+(?:[.,]\d+)?|\d+\/\d+)(?:\s*(?:kg|g|mg|l|ml|cl|dl|pcs?|pi[eè]ces?|tranches?|bo[iî]tes?|sachets?|cuill[eè]res?))?)\s+(.+)$/iu);
  if (!match) return { name: normalized };
  return { quantity: match[1].trim(), name: match[2].trim() };
}

export function AddToShoppingModal({
  visible,
  onClose,
  mealName,
  mealServings,
  ingredients,
  activeLists,
  familyId,
  onListCreated,
}: AddToShoppingModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  // Nombre de convives — initialisé sur les portions de la recette
  const [servings, setServings] = useState(mealServings || 2);
  // Ingrédients sélectionnés (index)
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const addItemsMerged = trpc.shopping.addItemsMerged.useMutation();
  const createListMutation = trpc.shopping.createList.useMutation();

  // Réinitialiser à chaque ouverture
  useEffect(() => {
    if (visible) {
      setServings(mealServings || 2);
      setSelected(new Set(ingredients.map((_, i) => i)));
      setIsCreatingList(false);
      setNewListName('');
    }
  }, [visible, mealServings, ingredients]);

  const ratio = mealServings > 0 ? servings / mealServings : 1;

  const scaledIngredients = ingredients.map(ing => scaleIngredient(ing, ratio));

  const toggleAll = () => {
    if (selected.size === ingredients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ingredients.map((_, i) => i)));
    }
  };

  const toggleOne = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  const doAdd = async (listId: number) => {
    const items = scaledIngredients
      .filter((_, i) => selected.has(i))
      .map(toShoppingIngredient);
    if (items.length === 0) {
      Alert.alert('', t('meals.noIngredients') || 'Aucun ingrédient sélectionné');
      return;
    }
    try {
      await addItemsMerged.mutateAsync({ listId, items });
      onClose();
      Alert.alert('✓', `${items.length} ${t('meals.ingredientsAdded') || 'ingrédient(s) ajouté(s) à la liste'}`);
    } catch (e: any) {
      Alert.alert('❌', e?.message || t('common.error') || 'Erreur');
    }
  };

  const doCreateAndAdd = async () => {
    const items = scaledIngredients
      .filter((_, i) => selected.has(i))
      .map(toShoppingIngredient);
    if (items.length === 0) {
      Alert.alert('', t('meals.noIngredients') || 'Aucun ingrédient sélectionné');
      return;
    }
    const listName = newListName.trim();
    if (!listName) {
      Alert.alert(
        t('shopping.listName') || 'Nom de la liste',
        t('shopping.listNameRequired') || 'Veuillez donner un nom à la liste.',
      );
      return;
    }
    try {
      setIsCreatingList(true);
      const { listId } = await createListMutation.mutateAsync({ familyId, name: listName });
      await addItemsMerged.mutateAsync({ listId, items });
      onListCreated?.();
      onClose();
      Alert.alert('✓', `${items.length} ${t('meals.ingredientsAdded') || 'ingrédient(s) ajouté(s) à la liste'}`);
    } catch (e: any) {
      Alert.alert('❌', e?.message || t('common.error') || 'Erreur');
    } finally {
      setIsCreatingList(false);
    }
  };

  const bg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const subColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const accentColor = '#7c3aed';
  const checkBg = isDark ? '#374151' : '#f3f4f6';

  const selectedCount = selected.size;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modal, { backgroundColor: bg }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>
              🛒 {t('meals.addToShopping') || 'Ajouter aux courses'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: subColor, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: subColor }]}>
            {ingredients.length} {t('meals.ingredientsFound') || 'ingrédient(s) trouvé(s)'}
          </Text>

          {/* Sélecteur de convives */}
          <View style={[styles.servingsRow, { borderColor }]}>
            <Text style={[styles.servingsLabel, { color: textColor }]}>
              {t('meals.adaptFor') || 'Adapter les quantités pour'}
            </Text>
            <View style={styles.servingsControls}>
              <TouchableOpacity
                style={[styles.servingsBtn, { backgroundColor: accentColor }]}
                onPress={() => setServings(s => Math.max(1, s - 1))}
              >
                <Text style={styles.servingsBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.servingsValue, { color: textColor }]}>{servings}</Text>
              <TouchableOpacity
                style={[styles.servingsBtn, { backgroundColor: accentColor }]}
                onPress={() => setServings(s => s + 1)}
              >
                <Text style={styles.servingsBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={[styles.servingsUnit, { color: subColor }]}>
                {t('meals.convives') || 'convive(s)'}
              </Text>
            </View>
            {mealServings > 0 && (
              <Text style={[styles.servingsBase, { color: subColor }]}>
                {t('meals.recipeFor') || 'Recette prévue pour'} {mealServings} {t('meals.persons') || 'personne(s)'}
              </Text>
            )}
          </View>

          {/* Liste des ingrédients avec cases à cocher */}
          {ingredients.length > 0 && (
            <>
              <TouchableOpacity onPress={toggleAll} style={styles.toggleAllBtn}>
                <Text style={[styles.toggleAllText, { color: accentColor }]}>
                  {selectedCount === ingredients.length
                    ? (t('common.deselectAll') || 'Tout décocher')
                    : (t('common.selectAll') || 'Tout cocher')}
                  {' '}({selectedCount}/{ingredients.length})
                </Text>
              </TouchableOpacity>

              <ScrollView style={styles.ingredientList} showsVerticalScrollIndicator>
                {scaledIngredients.map((ing, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.ingredientRow, { backgroundColor: selected.has(i) ? (isDark ? '#2d1f4e' : '#f5f3ff') : checkBg, borderColor }]}
                    onPress={() => toggleOne(i)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, { borderColor: selected.has(i) ? accentColor : subColor, backgroundColor: selected.has(i) ? accentColor : 'transparent' }]}>
                      {selected.has(i) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.ingredientText, { color: selected.has(i) ? textColor : subColor }]}>
                      {ing}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Choisir une liste */}
          <Text style={[styles.sectionLabel, { color: subColor }]}>
            {t('shopping.selectList') || 'Choisir une liste'} :
          </Text>

          {activeLists.length === 0 ? (
            <Text style={[styles.emptyText, { color: subColor }]}>
              {t('shopping.noLists') || 'Aucune liste active'}
            </Text>
          ) : (
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {activeLists.map((list) => (
                <TouchableOpacity
                  key={list.id}
                  style={[styles.listBtn, { borderColor }]}
                  onPress={() => doAdd(list.id)}
                  disabled={addItemsMerged.isPending}
                >
                  {addItemsMerged.isPending ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <Text style={[styles.listBtnText, { color: textColor }]}>📋 {list.name}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Créer une nouvelle liste */}
          <Text style={[styles.sectionLabel, { color: subColor }]}>
            {t('shopping.listName') || 'Nom de la liste'}
          </Text>
          <TextInput
            value={newListName}
            onChangeText={setNewListName}
            placeholder={t('shopping.listName') || 'Nom de la liste'}
            placeholderTextColor={subColor}
            style={[styles.listNameInput, { color: textColor, borderColor, backgroundColor: checkBg }]}
            maxLength={255}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.createListBtn, !newListName.trim() && styles.createListBtnDisabled]}
            onPress={doCreateAndAdd}
            disabled={!newListName.trim() || isCreatingList || createListMutation.isPending}
          >
            {isCreatingList ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Text style={[styles.createListText, { color: accentColor }]}>
                + {t('shopping.newList') || 'Créer une nouvelle liste'}
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  servingsRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  servingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  servingsValue: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  servingsUnit: {
    fontSize: 13,
  },
  servingsBase: {
    fontSize: 12,
    marginTop: 6,
  },
  toggleAllBtn: {
    marginBottom: 6,
  },
  toggleAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ingredientList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ingredientText: {
    fontSize: 13,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  listScroll: {
    maxHeight: 120,
    marginBottom: 8,
  },
  listBtn: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  createListBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  createListBtnDisabled: {
    opacity: 0.45,
  },
  listNameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  createListText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
