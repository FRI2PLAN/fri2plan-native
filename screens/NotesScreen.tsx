import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface NotesScreenProps {
  onNavigate?: (screen: string) => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  category: string;
  isPrivate: boolean;
  color: string;
}

export default function NotesScreen({ onNavigate }: NotesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'private' | 'public'>('all');

  // Mock notes data
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Liste des courses',
      content: 'Pain, lait, œufs, fromage, fruits...',
      author: 'Maman',
      date: 'Aujourd\'hui',
      category: 'Courses',
      isPrivate: false,
      color: '#fef3c7',
    },
    {
      id: '2',
      title: 'Idées cadeaux anniversaire Papa',
      content: 'Montre, livre de cuisine, chemise...',
      author: 'Maman',
      date: 'Hier',
      category: 'Personnel',
      isPrivate: true,
      color: '#dbeafe',
    },
    {
      id: '3',
      title: 'Recette gâteau au chocolat',
      content: '200g chocolat, 150g beurre, 4 œufs, 100g sucre...',
      author: 'Maman',
      date: 'Il y a 2 jours',
      category: 'Recettes',
      isPrivate: false,
      color: '#fce7f3',
    },
    {
      id: '4',
      title: 'Numéros d\'urgence',
      content: 'Médecin: 01 23 45 67 89, Plombier: 06 12 34 56 78...',
      author: 'Papa',
      date: 'Il y a 1 semaine',
      category: 'Important',
      isPrivate: false,
      color: '#fee2e2',
    },
  ]);

  const filteredNotes = notes.filter(note => {
    if (filter === 'private' && !note.isPrivate) return false;
    if (filter === 'public' && note.isPrivate) return false;
    if (searchQuery && !note.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !note.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nouvelle note</Text>
        </TouchableOpacity>
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
            Toutes ({notes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'public' && styles.filterTabActive]}
          onPress={() => setFilter('public')}
        >
          <Text style={[styles.filterText, filter === 'public' && styles.filterTextActive]}>
            Publiques ({notes.filter(n => !n.isPrivate).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'private' && styles.filterTabActive]}
          onPress={() => setFilter('private')}
        >
          <Text style={[styles.filterText, filter === 'private' && styles.filterTextActive]}>
            Privées ({notes.filter(n => n.isPrivate).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes Grid */}
      <ScrollView style={styles.content}>
        <View style={styles.notesGrid}>
          {filteredNotes.length > 0 ? (
            filteredNotes.map(note => (
              <TouchableOpacity key={note.id} style={[styles.noteCard, { backgroundColor: note.color }]}>
                <View style={styles.noteHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{note.category}</Text>
                  </View>
                  {note.isPrivate && (
                    <View style={styles.privateBadge}>
                      <Text style={styles.privateBadgeText}>🔒 Privée</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.noteTitle} numberOfLines={2}>{note.title}</Text>
                <Text style={styles.noteContent} numberOfLines={4}>{note.content}</Text>

                <View style={styles.noteFooter}>
                  <Text style={styles.noteAuthor}>👤 {note.author}</Text>
                  <Text style={styles.noteDate}>📅 {note.date}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noNotes}>
              <Text style={styles.noNotesText}>Aucune note trouvée</Text>
            </View>
          )}
        </View>
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
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
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
  },
  notesGrid: {
    padding: 16,
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  privateBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  noteAuthor: {
    fontSize: 12,
    color: '#6b7280',
  },
  noteDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  noNotes: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noNotesText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
