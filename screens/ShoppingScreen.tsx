import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { trpc } from '../lib/trpc';

interface ShoppingScreenProps {
  onNavigate?: (screen: string) => void;

  onPrevious?: () => void;
  onNext?: () => void;}

export default function ShoppingScreen({ onNavigate, onPrevious, onNext }: ShoppingScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeListId, setActiveListId] = useState<number | null>(null);

  // Fetch shopping lists from API
  const { data: shoppingLists, isLoading: listsLoading, refetch: refetchLists } = trpc.shopping.lists.useQuery();

  // Fetch items for active list
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = trpc.shopping.items.useQuery(
    { listId: activeListId! },
    { enabled: activeListId !== null }
  );

  // Mutation to toggle item
  const toggleMutation = trpc.shopping.toggleItem.useMutation({
    onSuccess: () => {
      refetchItems();
    },
  });

  // Set first list as active if not set
  if (!activeListId && shoppingLists && shoppingLists.length > 0) {
    setActiveListId(shoppingLists[0].id);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchLists(), activeListId ? refetchItems() : Promise.resolve()]);
    setRefreshing(false);
  };

  const toggleItem = (itemId: number) => {
    toggleMutation.mutate({ id: itemId });
  };

  const activeList = shoppingLists?.find(list => list.id === activeListId);
  const filteredItems = (items || []).filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = items?.filter(item => item.checked).length || 0;
  const totalCount = items?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      {/* Header removed - using RichHeader in home.tsx instead */}

      {/* Lists Tabs */}
      {listsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#7c3aed" />
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.listsContainer}
        >
          {shoppingLists?.map(list => (
            <TouchableOpacity
              key={list.id}
              style={[
                styles.listTab,
                activeListId === list.id && styles.listTabActive
              ]}
              onPress={() => setActiveListId(list.id)}
            >
              <Text style={[
                styles.listTabText,
                activeListId === list.id && styles.listTabTextActive
              ]}>
                {list.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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

      {/* Items List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >
        {itemsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemCard}
              onPress={() => toggleItem(item.id)}
            >
              <View style={styles.itemCheckbox}>
                <View style={[
                  styles.checkbox,
                  item.checked && styles.checkboxChecked
                ]}>
                  {item.checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>

              <View style={styles.itemContent}>
                <Text style={[
                  styles.itemName,
                  item.checked && styles.itemNameChecked
                ]}>
                  {item.name}
                </Text>
                {item.quantity && (
                  <Text style={styles.itemQuantity}>Quantité: {item.quantity}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Aucun article trouvé' : 'Aucun article dans cette liste'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Item Button */}
      {activeList && (
        <View style={styles.addItemContainer}>
          <TouchableOpacity style={styles.addItemButton}>
            <Text style={styles.addItemButtonText}>+ Ajouter un article</Text>
          </TouchableOpacity>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  listTabActive: {
    borderBottomColor: '#7c3aed',
  },
  listTabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  listTabTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
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
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  searchContainer: {
    padding: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
  itemCheckbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  addItemContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  addItemButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
