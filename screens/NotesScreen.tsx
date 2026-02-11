import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotesScreenProps {
  onNavigate?: (screen: string) => void;

  onPrevious?: () => void;
  onNext?: () => void;}

export default function NotesScreen({ onNavigate, onPrevious, onNext }: NotesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'private' | 'public'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notes from API
  const { data: notes, isLoading, refetch } = trpc.notes.list.useQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredNotes = (notes || []).filter(note => {
    if (filter === 'private' && !note.isPrivate) return false;
    if (filter === 'public' && note.isPrivate) return false;
    if (searchQuery && !note.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !note.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getNoteColor = (index: number) => {
    const colors = ['#fef3c7', '#dbeafe', '#fce7f3', '#fee2e2', '#e0e7ff', '#d1fae5'];
    return colors[index % colors.length];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Notes</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une note..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Toutes ({notes?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'private' && styles.filterTabActive]}
          onPress={() => setFilter('private')}
        >
          <Text style={[styles.filterText, filter === 'private' && styles.filterTextActive]}>
            Privées ({notes?.filter(n => n.isPrivate).length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'public' && styles.filterTabActive]}
          onPress={() => setFilter('public')}
        >
          <Text style={[styles.filterText, filter === 'public' && styles.filterTextActive]}>
            Publiques ({notes?.filter(n => !n.isPrivate).length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : filteredNotes.length > 0 ? (
          <View style={styles.notesGrid}>
            {filteredNotes.map((note, index) => (
              <TouchableOpacity
                key={note.id}
                style={[styles.noteCard, { backgroundColor: getNoteColor(index) }]}
              >
                <View style={styles.noteHeader}>
                  <Text style={styles.noteTitle} numberOfLines={2}>
                    {note.title}
                  </Text>
                  {note.isPrivate && (
                    <View style={styles.privateBadge}>
                      <Text style={styles.privateBadgeText}>🔒</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.noteContent} numberOfLines={4}>
                  {note.content}
                </Text>

                <View style={styles.noteFooter}>
                  <Text style={styles.noteDate}>
                    {formatDistanceToNow(new Date(note.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Aucune note trouvée' : 'Aucune note pour le moment'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Créez votre première note !
            </Text>
          </View>
        )}
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#7c3aed',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
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
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  noteCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  privateBadge: {
    marginLeft: 8,
  },
  privateBadgeText: {
    fontSize: 16,
  },
  noteContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
    flex: 1,
  },
  noteFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },

  pageTitleContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
});
