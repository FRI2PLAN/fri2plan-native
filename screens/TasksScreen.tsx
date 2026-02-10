import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PageHeader from '../components/PageHeader';
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TasksScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function TasksScreen({ onNavigate }: TasksScreenProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch tasks from API
  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery();

  // Mutation to complete a task
  const completeMutation = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleTask = (id: number) => {
    completeMutation.mutate({ id });
  };

  const filteredTasks = (tasks || []).filter(task => {
    if (filter === 'active') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  }).filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Urgent';
      case 'medium': return 'Moyen';
      case 'low': return 'Faible';
      default: return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'À faire';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <PageHeader
        title="Tâches"
        buttonText="Nouvelle tâche"
        onButtonPress={() => {/* TODO: Open create modal */}}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une tâche..."
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
            Toutes ({tasks?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            En cours ({tasks?.filter(t => t.status !== 'completed').length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Terminées ({tasks?.filter(t => t.status === 'completed').length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
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
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <View key={task.id} style={styles.taskCard}>
              <TouchableOpacity 
                style={styles.taskCheckbox}
                onPress={() => toggleTask(task.id)}
              >
                <View style={[
                  styles.checkbox,
                  task.status === 'completed' && styles.checkboxChecked
                ]}>
                  {task.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>

              <View style={styles.taskContent}>
                <Text style={[
                  styles.taskTitle,
                  task.status === 'completed' && styles.taskTitleCompleted
                ]}>
                  {task.title}
                </Text>
                
                {task.description && (
                  <Text style={styles.taskDescription}>{task.description}</Text>
                )}

                <View style={styles.taskMeta}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                    <Text style={styles.priorityText}>{getPriorityLabel(task.priority)}</Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
                  </View>

                  {task.dueDate && (
                    <Text style={styles.dueDateText}>
                      📅 {format(new Date(task.dueDate), 'dd MMM', { locale: fr })}
                    </Text>
                  )}
                </View>

                {task.points && task.points > 0 && (
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsText}>⭐ {task.points} points</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Aucune tâche trouvée' : 'Aucune tâche pour le moment'}
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
  taskCard: {
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
  taskCheckbox: {
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
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '600',
  },
  dueDateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  pointsBadge: {
    marginTop: 8,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  pointsText: {
    color: '#92400e',
    fontSize: 12,
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
