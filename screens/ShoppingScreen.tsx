import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface ShoppingScreenProps {
  onNavigate?: (screen: string) => void;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}

interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdDate: string;
}

export default function ShoppingScreen({ onNavigate }: ShoppingScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock shopping lists data
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([
    {
      id: '1',
      name: 'Courses de la semaine',
      createdDate: 'Aujourd\'hui',
      items: [
        { id: '1', name: 'Pain', quantity: '2', category: 'Boulangerie', checked: false },
        { id: '2', name: 'Lait', quantity: '1L', category: 'Produits laitiers', checked: false },
        { id: '3', name: 'Pommes', quantity: '1kg', category: 'Fruits', checked: true },
        { id: '4', name: 'Poulet', quantity: '1', category: 'Viande', checked: false },
        { id: '5', name: 'Riz', quantity: '500g', category: 'Épicerie', checked: false },
      ],
    },
    {
      id: '2',
      name: 'Produits d\'entretien',
      createdDate: 'Hier',
      items: [
        { id: '6', name: 'Lessive', quantity: '1', category: 'Entretien', checked: false },
        { id: '7', name: 'Éponges', quantity: '3', category: 'Entretien', checked: false },
      ],
    },
  ]);

  const [activeListId, setActiveListId] = useState('1');

  const toggleItem = (listId: string, itemId: string) => {
    setShoppingLists(shoppingLists.map(list => 
      list.id === listId 
        ? {
            ...list,
            items: list.items.map(item =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            )
          }
        : list
    ));
  };

  const activeList = shoppingLists.find(list => list.id === activeListId);
  const filteredItems = activeList?.items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'Boulangerie': '🥖',
      'Produits laitiers': '🥛',
      'Fruits': '🍎',
      'Légumes': '🥕',
      'Viande': '🍗',
      'Poisson': '🐟',
      'Épicerie': '🛒',
      'Entretien': '🧹',
      'Hygiène': '🧴',
    };
    return emojiMap[category] || '📦';
  };

  const completedCount = activeList?.items.filter(item => item.checked).length || 0;
  const totalCount = activeList?.items.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Courses</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nouvelle liste</Text>
        </TouchableOpacity>
      </View>

      {/* Lists Tabs */}
      <ScrollView horizontal style={styles.listsContainer} showsHorizontalScrollIndicator={false}>
        {shoppingLists.map(list => (
          <TouchableOpacity
            key={list.id}
            style={[styles.listTab, activeListId === list.id && styles.listTabActive]}
            onPress={() => setActiveListId(list.id)}
          >
            <Text style={[styles.listTabText, activeListId === list.id && styles.listTabTextActive]}>
              {list.name}
            </Text>
            <Text style={[styles.listTabDate, activeListId === list.id && styles.listTabDateActive]}>
              {list.createdDate}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Progress Bar */}
      {activeList && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {completedCount} / {totalCount} articles
            </Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un article..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Shopping Items */}
      <ScrollView style={styles.content}>
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleItem(activeListId, item.id)}
              >
                <View style={[
                  styles.checkboxInner,
                  item.checked && styles.checkboxChecked
                ]}>
                  {item.checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>

              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={[
                    styles.itemName,
                    item.checked && styles.itemNameChecked
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemQuantity}>{item.quantity}</Text>
                </View>
                <View style={styles.itemCategory}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noItems}>
            <Text style={styles.noItemsText}>Aucun article trouvé</Text>
          </View>
        )}

        {/* Add Item Button */}
        <TouchableOpacity style={styles.addItemButton}>
          <Text style={styles.addItemButtonText}>+ Ajouter un article</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    minWidth: 150,
  },
  listTabActive: {
    backgroundColor: '#7c3aed',
  },
  listTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  listTabTextActive: {
    color: '#fff',
  },
  listTabDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  listTabDateActive: {
    color: '#e9d5ff',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
    marginLeft: 8,
  },
  itemCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#6b7280',
  },
  noItems: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  addItemButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#7c3aed',
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7c3aed',
  },
});
