import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BudgetScreenProps {
  onNavigate?: (screen: string) => void;

  onPrevious?: () => void;
  onNext?: () => void;}

export default function BudgetScreen({ onNavigate, onPrevious, onNext }: BudgetScreenProps) {
  const [view, setView] = useState<'overview' | 'transactions'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const currentMonth = format(new Date(), 'yyyy-MM');

  // Fetch budget and transactions from API
  const { data: budget, isLoading: budgetLoading, refetch: refetchBudget } = trpc.budget.get.useQuery({ month: currentMonth });
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = trpc.budget.transactions.useQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchBudget(), refetchTransactions()]);
    setRefreshing(false);
  };

  const totalIncome = budget?.totalIncome || 0;
  const totalExpenses = budget?.totalExpenses || 0;
  const remaining = totalIncome - totalExpenses;

  // Group transactions by category
  const expensesByCategory = (transactions || [])
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = 0;
      }
      acc[t.category] += t.amount;
      return acc;
    }, {} as Record<string, number>);

  const categories = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category,
    spent: amount,
    color: getCategoryColor(category),
  }));

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Alimentation': '#10b981',
      'Transport': '#3b82f6',
      'Loisirs': '#f59e0b',
      'Santé': '#ef4444',
      'Éducation': '#8b5cf6',
      'Logement': '#06b6d4',
      'Autre': '#6b7280',
    };
    return colors[category] || '#6b7280';
  }

  const isLoading = budgetLoading || transactionsLoading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Budget</Text>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, view === 'overview' && styles.toggleButtonActive]}
          onPress={() => setView('overview')}
        >
          <Text style={[styles.toggleText, view === 'overview' && styles.toggleTextActive]}>
            Vue d'ensemble
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, view === 'transactions' && styles.toggleButtonActive]}
          onPress={() => setView('transactions')}
        >
          <Text style={[styles.toggleText, view === 'transactions' && styles.toggleTextActive]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

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
        ) : view === 'overview' ? (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, { backgroundColor: '#dbeafe' }]}>
                <Text style={styles.summaryLabel}>Revenus</Text>
                <Text style={styles.summaryAmount}>{totalIncome.toFixed(2)} €</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
                <Text style={styles.summaryLabel}>Dépenses</Text>
                <Text style={styles.summaryAmount}>{totalExpenses.toFixed(2)} €</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: remaining >= 0 ? '#d1fae5' : '#fee2e2' }]}>
                <Text style={styles.summaryLabel}>Solde</Text>
                <Text style={[styles.summaryAmount, remaining < 0 && { color: '#ef4444' }]}>
                  {remaining.toFixed(2)} €
                </Text>
              </View>
            </View>

            {/* Budget by Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dépenses par catégorie</Text>
              {categories.length > 0 ? (
                categories.map((cat, index) => (
                  <View key={index} style={styles.budgetItem}>
                    <View style={styles.budgetHeader}>
                      <View style={styles.budgetInfo}>
                        <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                        <Text style={styles.budgetCategory}>{cat.category}</Text>
                      </View>
                      <Text style={styles.budgetAmount}>{cat.spent.toFixed(2)} €</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${Math.min((cat.spent / totalExpenses) * 100, 100)}%`,
                            backgroundColor: cat.color 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucune dépense pour ce mois</Text>
              )}
            </View>
          </>
        ) : (
          /* Transactions List */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transactions récentes</Text>
            {transactions && transactions.length > 0 ? (
              transactions.map(transaction => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionCategory}>{transaction.category}</Text>
                      {transaction.description && (
                        <Text style={styles.transactionDescription}>{transaction.description}</Text>
                      )}
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)} €
                    </Text>
                  </View>
                  <Text style={styles.transactionDate}>
                    {format(new Date(transaction.date), 'dd MMMM yyyy', { locale: fr })}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Aucune transaction</Text>
            )}
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
  viewToggle: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#7c3aed',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  budgetItem: {
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
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  budgetCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#10b981',
  },
  expenseAmount: {
    color: '#ef4444',
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
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
