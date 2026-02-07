import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface RequestsScreenProps {
  onNavigate?: (screen: string) => void;
}

interface Request {
  id: string;
  title: string;
  description: string;
  requester: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  category: string;
  isFavorite: boolean;
}

export default function RequestsScreen({ onNavigate }: RequestsScreenProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'favorite'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock requests data
  const [requests, setRequests] = useState<Request[]>([
    {
      id: '1',
      title: 'Sortie au cinéma',
      description: 'Aller voir le nouveau film Marvel samedi après-midi',
      requester: 'Enfant 1',
      status: 'pending',
      date: 'Aujourd\'hui',
      category: 'Loisirs',
      isFavorite: true,
    },
    {
      id: '2',
      title: 'Augmentation argent de poche',
      description: 'Demande d\'augmentation de 5€ par semaine',
      requester: 'Enfant 2',
      status: 'pending',
      date: 'Hier',
      category: 'Financier',
      isFavorite: false,
    },
    {
      id: '3',
      title: 'Soirée pyjama chez un ami',
      description: 'Dormir chez Thomas vendredi soir',
      requester: 'Enfant 1',
      status: 'approved',
      date: 'Il y a 2 jours',
      category: 'Social',
      isFavorite: false,
    },
    {
      id: '4',
      title: 'Nouveau jeu vidéo',
      description: 'Acheter le dernier FIFA',
      requester: 'Enfant 2',
      status: 'rejected',
      date: 'Il y a 3 jours',
      category: 'Loisirs',
      isFavorite: false,
    },
  ]);

  const toggleFavorite = (id: string) => {
    setRequests(requests.map(req =>
      req.id === id ? { ...req, isFavorite: !req.isFavorite } : req
    ));
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'favorite') return req.isFavorite;
    if (filter !== 'all' && req.status !== filter) return false;
    if (searchQuery && !req.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !req.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Refusée';
      default: return '';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const favoriteCount = requests.filter(r => r.isFavorite).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requêtes</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nouvelle requête</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une requête..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal style={styles.filterContainer} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Toutes ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'favorite' && styles.filterTabActive]}
          onPress={() => setFilter('favorite')}
        >
          <Text style={[styles.filterText, filter === 'favorite' && styles.filterTextActive]}>
            ⭐ Favoris ({favoriteCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            En attente ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[styles.filterText, filter === 'approved' && styles.filterTextActive]}>
            Approuvées
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'rejected' && styles.filterTabActive]}
          onPress={() => setFilter('rejected')}
        >
          <Text style={[styles.filterText, filter === 'rejected' && styles.filterTextActive]}>
            Refusées
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Requests List */}
      <ScrollView style={styles.content}>
        {filteredRequests.length > 0 ? (
          filteredRequests.map(request => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(request.status)}</Text>
                </View>
                <TouchableOpacity onPress={() => toggleFavorite(request.id)}>
                  <Text style={styles.favoriteIcon}>
                    {request.isFavorite ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.requestTitle}>{request.title}</Text>
              <Text style={styles.requestDescription}>{request.description}</Text>

              <View style={styles.requestMeta}>
                <Text style={styles.requestRequester}>👤 {request.requester}</Text>
                <Text style={styles.requestCategory}>📂 {request.category}</Text>
                <Text style={styles.requestDate}>📅 {request.date}</Text>
              </View>

              {request.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.actionButton, styles.approveButton]}>
                    <Text style={styles.actionButtonText}>✓ Approuver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.rejectButton]}>
                    <Text style={styles.actionButtonText}>✗ Refuser</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.noRequests}>
            <Text style={styles.noRequestsText}>Aucune requête trouvée</Text>
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
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
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
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteIcon: {
    fontSize: 24,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  requestMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  requestRequester: {
    fontSize: 14,
    color: '#6b7280',
  },
  requestCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  requestDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noRequests: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noRequestsText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
