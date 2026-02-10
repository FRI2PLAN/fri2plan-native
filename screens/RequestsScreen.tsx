import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PageHeader from '../components/PageHeader';
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RequestsScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function RequestsScreen({ onNavigate }: RequestsScreenProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch requests from API
  const { data: requests, isLoading, refetch } = trpc.requests.list.useQuery();

  // Mutation to review request
  const reviewMutation = trpc.requests.review.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleReview = (id: number, status: 'approved' | 'rejected') => {
    const statusText = status === 'approved' ? 'approuver' : 'rejeter';
    Alert.alert(
      'Confirmation',
      `Voulez-vous ${statusText} cette demande ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => reviewMutation.mutate({ id, status }),
        },
      ]
    );
  };

  const filteredRequests = (requests || []).filter(req => {
    if (filter !== 'all' && req.status !== filter) return false;
    if (searchQuery && !req.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !req.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
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
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <PageHeader
        title="Demandes"
        buttonText="Nouvelle demande"
        onButtonPress={() => {/* TODO: Open create modal */}}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une demande..."
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
            Toutes ({requests?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            En attente ({requests?.filter(r => r.status === 'pending').length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[styles.filterText, filter === 'approved' && styles.filterTextActive]}>
            Approuvées ({requests?.filter(r => r.status === 'approved').length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'rejected' && styles.filterTabActive]}
          onPress={() => setFilter('rejected')}
        >
          <Text style={[styles.filterText, filter === 'rejected' && styles.filterTextActive]}>
            Rejetées ({requests?.filter(r => r.status === 'rejected').length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Requests List */}
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
        ) : filteredRequests.length > 0 ? (
          filteredRequests.map(request => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(request.status)}</Text>
                </View>
              </View>

              {request.description && (
                <Text style={styles.requestDescription}>{request.description}</Text>
              )}

              <View style={styles.requestMeta}>
                <Text style={styles.requestMetaText}>
                  Demandé par: Utilisateur #{request.requestedBy}
                </Text>
                <Text style={styles.requestMetaText}>
                  {formatDistanceToNow(new Date(request.createdAt), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </Text>
              </View>

              {/* Admin Actions */}
              {isAdmin && request.status === 'pending' && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleReview(request.id, 'approved')}
                    disabled={reviewMutation.isLoading}
                  >
                    <Text style={styles.actionButtonText}>✓ Approuver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReview(request.id, 'rejected')}
                    disabled={reviewMutation.isLoading}
                  >
                    <Text style={styles.actionButtonText}>✗ Rejeter</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Aucune demande trouvée' : 'Aucune demande pour le moment'}
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
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#7c3aed',
  },
  filterText: {
    fontSize: 12,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  requestMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
