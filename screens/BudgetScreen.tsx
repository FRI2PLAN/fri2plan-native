import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface BudgetScreenProps {
  onNavigate?: (screen: string) => void;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  paidBy: string;
  isRecurring: boolean;
}

interface Budget {
  category: string;
  allocated: number;
  spent: number;
  color: string;
}

export default function BudgetScreen({ onNavigate }: BudgetScreenProps) {
  const [view, setView] = useState<'overview' | 'expenses'>('overview');

  // Mock budget data
  const budgets: Budget[] = [
    { category: 'Alimentation', allocated: 500, spent: 320, color: '#10b981' },
    { category: 'Transport', allocated: 200, spent: 180, color: '#3b82f6' },
    { category: 'Loisirs', allocated: 150, spent: 95, color: '#f59e0b' },
    { category: 'Santé', allocated: 100, spent: 45, color: '#ef4444' },
    { category: 'Éducation', allocated: 250, spent: 250, color: '#8b5cf6' },
  ];

  // Mock expenses data
  const expenses: Expense[] = [
    { id: '1', title: 'Courses Carrefour', amount: 85.50, category: 'Alimentation', date: 'Aujourd\'hui', paidBy: 'Papa', isRecurring: false },
    { id: '2', title: 'Essence', amount: 60.00, category: 'Transport', date: 'Hier', paidBy: 'Maman', isRecurring: false },
    { id: '3', title: 'Cinéma', amount: 45.00, category: 'Loisirs', date: 'Il y a 2 jours', paidBy: 'Papa', isRecurring: false },
    { id: '4', title: 'Pharmacie', amount: 25.50, category: 'Santé', date: 'Il y a 3 jours', paidBy: 'Maman', isRecurring: false },
    { id: '5', title: 'Cours de musique', amount: 80.00, category: 'Éducation', date: 'Il y a 1 semaine', paidBy: 'Papa', isRecurring: true },
  ];

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalAllocated - totalSpent;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budget</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nouvelle dépense</Text>
        </TouchableOpacity>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, view === 'overview' && styles.toggleButtonActive]}
          onPress={() => setView('overview')}
        >
          <Text style={[styles.toggleText, view === 'overview' && styles.toggleTextActive]}>
            Vue d\'ensemble
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, view === 'expenses' && styles.toggleButtonActive]}
          onPress={() => setView('expenses')}
        >
          <Text style={[styles.toggleText, view === 'expenses' && styles.toggleTextActive]}>
            Dépenses
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {view === 'overview' ? (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, { backgroundColor: '#dbeafe' }]}>
                <Text style={styles.summaryLabel}>Budget total</Text>
                <Text style={styles.summaryAmount}>{totalAllocated.toFixed(2)} €</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
                <Text style={styles.summaryLabel}>Dépensé</Text>
                <Text style={styles.summaryAmount}>{totalSpent.toFixed(2)} €</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#d1fae5' }]}>
                <Text style={styles.summaryLabel}>Restant</Text>
                <Text style={styles.summaryAmount}>{remaining.toFixed(2)} €</Text>
              </View>
            </View>

            {/* Budget Categories */}
            <View style={styles.categoriesContainer}>
              <Text style={styles.sectionTitle}>Budgets par catégorie</Text>
              {budgets.map((budget, index) => {
                const percentage = (budget.spent / budget.allocated) * 100;
                const isOverBudget = percentage > 100;

                return (
                  <View key={index} style={styles.budgetCard}>
                    <View style={styles.budgetHeader}>
                      <Text style={styles.budgetCategory}>{budget.category}</Text>
                      <Text style={[styles.budgetAmount, isOverBudget && styles.budgetAmountOver]}>
                        {budget.spent.toFixed(2)} € / {budget.allocated.toFixed(2)} €
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(percentage, 100)}%`, backgroundColor: isOverBudget ? '#ef4444' : budget.color }
                        ]}
                      />
                    </View>
                    <Text style={[styles.budgetPercentage, isOverBudget && styles.budgetPercentageOver]}>
                      {percentage.toFixed(0)}% utilisé
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* Expenses List */}
            <View style={styles.expensesContainer}>
              <Text style={styles.sectionTitle}>Dernières dépenses</Text>
              {expenses.map(expense => (
                <View key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseHeader}>
                    <Text style={styles.expenseTitle}>{expense.title}</Text>
                    <Text style={styles.expenseAmount}>-{expense.amount.toFixed(2)} €</Text>
                  </View>
                  <View style={styles.expenseMeta}>
                    <Text style={styles.expenseCategory}>📂 {expense.category}</Text>
                    <Text style={styles.expensePaidBy}>👤 {expense.paidBy}</Text>
                    <Text style={styles.expenseDate}>📅 {expense.date}</Text>
                  </View>
                  {expense.isRecurring && (
                    <View style={styles.recurringBadge}>
                      <Text style={styles.recurringText}>🔄 Récurrent</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  categoriesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  budgetCard: {
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
  budgetCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  budgetAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  budgetAmountOver: {
    color: '#ef4444',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetPercentage: {
    fontSize: 12,
    color: '#6b7280',
  },
  budgetPercentageOver: {
    color: '#ef4444',
    fontWeight: '600',
  },
  expensesContainer: {
    padding: 16,
  },
  expenseCard: {
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  expenseMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  expenseCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  expensePaidBy: {
    fontSize: 14,
    color: '#6b7280',
  },
  expenseDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  recurringBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  recurringText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
});
