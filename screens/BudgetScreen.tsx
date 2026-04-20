import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, RefreshControl, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform, Switch, Pressable, FlatList, Share, Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets} from 'react-native-safe-area-context';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { trpc } from '../lib/trpc';
import { format, formatDistanceToNow } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

interface BudgetScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const CURRENCIES = [
  { value: 'CHF', symbol: 'CHF', flag: '🇨🇭' },
  { value: 'EUR', symbol: '€', flag: '🇪🇺' },
  { value: 'USD', symbol: '$', flag: '🇺🇸' },
];

// Mapping des noms Lucide (backend) vers emojis (React Native)
const LUCIDE_TO_EMOJI: Record<string, string> = {
  ShoppingCart: '🛒', Car: '🚗', Smile: '😊', Heart: '❤️',
  GraduationCap: '🎓', Home: '🏠', Shirt: '👕', Wallet: '💼',
  DollarSign: '💵', CreditCard: '💳', TrendingUp: '📈', Gift: '🎁'};

const getCategoryEmoji = (icon?: string): string => {
  if (!icon) return '💼';
  // Si c'est déjà un emoji (contient un caractère non-ASCII)
  if (/[^\x00-\x7F]/.test(icon)) return icon;
  // Sinon c'est un nom Lucide
  return LUCIDE_TO_EMOJI[icon] || '💼';
};

const EXPENSE_CATEGORIES = [
  { value: 'Alimentation', emoji: '🛒', color: '#10b981' },
  { value: 'Transport', emoji: '🚗', color: '#3b82f6' },
  { value: 'Loisirs', emoji: '😊', color: '#f59e0b' },
  { value: 'Santé', emoji: '❤️', color: '#ef4444' },
  { value: 'Éducation', emoji: '🎓', color: '#8b5cf6' },
  { value: 'Logement', emoji: '🏠', color: '#6b7280' },
  { value: 'Vêtements', emoji: '👕', color: '#ec4899' },
  { value: 'Autre', emoji: '💼', color: '#64748b' },
];

const INCOME_CATEGORIES = ['Salaire', 'Allocation', 'Cadeau', 'Autre'];

// Catégories spécifiques aux projets partagés (On Partage)
const PROJECT_CATEGORIES = [
  { value: 'Restaurant', emoji: '🍽️' },
  { value: 'Courses', emoji: '🛒' },
  { value: 'Logement', emoji: '🏠' },
  { value: 'Transport', emoji: '🚗' },
  { value: 'Bar', emoji: '🍺' },
  { value: 'Activités', emoji: '🎪' },
  { value: 'Autre', emoji: '💼' },
];

type TabType = 'expenses' | 'projects' | 'settings';
type FilterType = 'all' | 'income' | 'expense';
type FilterPeriod = 'all' | 'week' | 'month' | 'year';

// ─── Calcul du split Tricount ─────────────────────────────────────────────────
function calculateSplit(
  transactions: any[],
  members: any[],
  currency: string
): { from: string; to: string; amount: number; currency: string }[] {
  // N'utiliser QUE les dépenses (type 'expense') pour le calcul du split
  // Les remboursements (type 'income', category 'Remboursement') sont exclus
  const expenses = transactions.filter(t => t.type === 'expense');

  // Calculer ce que chaque membre a payé et ce qu'il doit
  const paid: Record<number, number> = {};
  const owes: Record<number, number> = {};

  members.forEach(m => { paid[m.id] = 0; owes[m.id] = 0; });

  const total = expenses.reduce((sum, t) => sum + t.amount / 100, 0);
  const perPerson = members.length > 0 ? total / members.length : 0;

  expenses.forEach(t => {
    if (t.userId && paid[t.userId] !== undefined) {
      paid[t.userId] += t.amount / 100;
    }
  });

  // Soustraire les remboursements déjà effectués
  const reimbursements = transactions.filter(t => t.type === 'income' && t.category === 'Remboursement');
  reimbursements.forEach(r => {
    if (r.userId && paid[r.userId] !== undefined) {
      // Le rembourseur a payé cette somme → augmenter son crédit
      paid[r.userId] += r.amount / 100;
    }
  });

  members.forEach(m => {
    owes[m.id] = perPerson - (paid[m.id] || 0);
  });

  // Algorithme de simplification des dettes
  const debtors = members.filter(m => owes[m.id] > 0.01).sort((a, b) => owes[b.id] - owes[a.id]);
  const creditors = members.filter(m => owes[m.id] < -0.01).sort((a, b) => owes[a.id] - owes[b.id]);

  const settlements: { from: string; to: string; amount: number; currency: string }[] = [];

  let i = 0, j = 0;
  const debtAmounts = debtors.map(m => owes[m.id]);
  const creditAmounts = creditors.map(m => -owes[m.id]);

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtAmounts[i], creditAmounts[j]);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].name || `#${debtors[i].id}`,
        to: creditors[j].name || `#${creditors[j].id}`,
        amount: Math.round(amount * 100) / 100,
        currency});
    }
    debtAmounts[i] -= amount;
    creditAmounts[j] -= amount;
    if (debtAmounts[i] < 0.01) i++;
    if (creditAmounts[j] < 0.01) j++;
  }

  return settlements;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function BudgetScreen({ onNavigate, onPrevious, onNext }: BudgetScreenProps) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const styles = getStyles(isDark);
  const insets = useSafeAreaInsets();

  const getLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'de': return de;
      default: return enUS;
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [refreshing, setRefreshing] = useState(false);

  // ── Famille ──
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const { data: families = [] } = trpc.family.list.useQuery();
  // Utiliser useMemo pour résoudre correctement la famille active (même pattern que DashboardScreen)
  const activeFamily = useMemo(() => {
    if (!families || (families as any[]).length === 0) return undefined;
    if (ctxFamilyId) {
      const found = (families as any[]).find((f: any) => f.id === ctxFamilyId);
      if (found) return found;
    }
    return (families as any[])[0];
  }, [families, ctxFamilyId]);
  const activeFamilyId = activeFamily?.id ?? 0;
  const { data: members = [] } = trpc.family.members.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );

  // ── Données budget ──
  const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } = trpc.budget.listTransactions.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );
  const { data: budgetBalance, refetch: refetchBalance } = trpc.budget.getBudgetBalance.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );
  const { data: categories = [], refetch: refetchCats } = trpc.budget.listCategories.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );
  const { data: categoryBudgets = [], refetch: refetchCatBudgets } = trpc.budget.listCategoryBudgets.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );
  const { data: savingsProjects = [], refetch: refetchProjects } = trpc.budget.listSavingsProjects.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );

  // ── Filtres transactions ──
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // ── Formulaire transaction ──
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [txForm, setTxForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date(),
    isPrivate: false,
    projectId: undefined as number | undefined,
    payerId: undefined as number | undefined});  // undefined = utilisateur connecté par défaut
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Formulaire projet ──
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState({ name: '', currency: 'CHF', targetAmount: '' });
  const [projectSelectedMembers, setProjectSelectedMembers] = useState<number[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);

  // ── Formulaire dépense projet ──
  const [projectTxModalOpen, setProjectTxModalOpen] = useState(false);
  const [projectTxForm, setProjectTxForm] = useState({
    amount: '', category: 'Restaurant', description: '', payerId: user?.id || 0, date: new Date()});
  const [showProjectDatePicker, setShowProjectDatePicker] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  // ── Remboursements confirmés (clé = "projectId-from-to-amount") ──
  const [paidSettlements, setPaidSettlements] = useState<Set<string>>(new Set());

  // ── Formulaire catégorie ──
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', color: '#7c3aed', icon: '💼' });
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  // ── Formulaire budget catégorie ──
  const [catBudgetModalOpen, setCatBudgetModalOpen] = useState(false);
  const [catBudgetForm, setCatBudgetForm] = useState({ categoryId: '', budgetAmount: '', period: 'monthly' as 'weekly' | 'monthly' | 'yearly', alertThreshold: '80' });
  const [editingCatBudgetId, setEditingCatBudgetId] = useState<number | null>(null);

  // ── Devise par défaut (settings) ──
  const [defaultCurrency, setDefaultCurrency] = useState('CHF');

  // ── Mutations ──
  const createTx = trpc.budget.createTransaction.useMutation({
    onSuccess: () => { setTxModalOpen(false); resetTxForm(); refetchTx(); refetchBalance(); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const updateTx = trpc.budget.updateTransaction.useMutation({
    onSuccess: () => { setTxModalOpen(false); setEditingTxId(null); resetTxForm(); refetchTx(); refetchBalance(); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const deleteTx = trpc.budget.deleteTransaction.useMutation({
    onSuccess: () => { refetchTx(); refetchBalance(); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const createProject = trpc.budget.createSavingsProject.useMutation({
    onSuccess: () => { setProjectModalOpen(false); resetProjectForm(); setEditingProjectId(null); refetchProjects(); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const updateProject = trpc.budget.updateSavingsProject.useMutation({
    onSuccess: () => { setProjectModalOpen(false); resetProjectForm(); setEditingProjectId(null); refetchProjects(); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const deleteProject = trpc.budget.deleteSavingsProject.useMutation({
    onSuccess: () => { setProjectDetailOpen(false); setSelectedProject(null); refetchProjects(); refetchTx(); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const createCat = trpc.budget.createCategory.useMutation({
    onSuccess: () => { setCatModalOpen(false); resetCatForm(); refetchCats(); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const deleteCat = trpc.budget.deleteCategory.useMutation({
    onSuccess: () => refetchCats(),
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const createCatBudget = trpc.budget.createCategoryBudget.useMutation({
    onSuccess: () => { setCatBudgetModalOpen(false); resetCatBudgetForm(); refetchCatBudgets(); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});
  const deleteCatBudget = trpc.budget.deleteCategoryBudget.useMutation({
    onSuccess: () => refetchCatBudgets(),
    onError: (e: any) => Alert.alert(t('common.error'), e.message)});

  // ── Reset forms ──
  const resetTxForm = () => setTxForm({ type: 'expense', amount: '', category: '', description: '', date: new Date(), isPrivate: false, projectId: undefined, payerId: undefined });
  const resetProjectForm = () => { setProjectForm({ name: '', currency: 'CHF', targetAmount: '' }); setProjectSelectedMembers([]); };
  const resetCatForm = () => { setCatForm({ name: '', color: '#7c3aed', icon: '💼' }); setEditingCatId(null); };
  const resetCatBudgetForm = () => { setCatBudgetForm({ categoryId: '', budgetAmount: '', period: 'monthly', alertThreshold: '80' }); setEditingCatBudgetId(null); };

  // ── Refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTx(), refetchBalance(), refetchProjects(), refetchCats(), refetchCatBudgets()]);
    setRefreshing(false);
  }, []);

  // ── Filtrage transactions ──
  const filteredTx = useMemo(() => {
    let list = (transactions as any[]).filter((t: any) => !t.projectId); // exclure les dépenses de projets
    if (filterType !== 'all') list = list.filter((t: any) => t.type === filterType);
    if (filterCategory !== 'all') list = list.filter((t: any) => t.category === filterCategory);
    if (filterPeriod !== 'all') {
      const now = new Date();
      const start = new Date();
      if (filterPeriod === 'week') start.setDate(now.getDate() - 7);
      else if (filterPeriod === 'month') start.setMonth(now.getMonth() - 1);
      else if (filterPeriod === 'year') start.setFullYear(now.getFullYear() - 1);
      list = list.filter((t: any) => new Date(t.date) >= start);
    }
    return list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterType, filterCategory, filterPeriod]);

  // ── Stats ──
  const stats = useMemo(() => {
    const income = filteredTx.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount / 100, 0);
    const expense = filteredTx.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount / 100, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTx]);

  // ── Toutes les catégories (défaut + personnalisées)
  const allCategories = useMemo(() => {
    const dbCats = (categories as any[]).map((cat: any) => ({
      value: cat.name,
      emoji: getCategoryEmoji(cat.icon),
      color: cat.color || '#64748b'}));
    // Fusionner avec les catégories par défaut (sans doublons)
    const custom = dbCats.filter(d => !EXPENSE_CATEGORIES.find(e => e.value === d.value));
    return [...EXPENSE_CATEGORIES, ...custom];
  }, [categories]);

  // ── Transactions d'un projet ──
  const getProjectTransactions = (projectId: number) =>
    (transactions as any[]).filter((t: any) => t.projectId === projectId);

  const getProjectCurrency = (project: any): string => {
    // La devise est encodée dans le nom: "Vacances [EUR]" ou "Vacances [EUR][m:1,2]"
    const match = project.name?.match(/\[([A-Z]+)\]/);
    return match ? match[1] : 'CHF';
  };
  const getProjectDisplayName = (project: any): string => {
    return project.name?.replace(/\s*\[[A-Z]+\](\[m:[\d,]+\])?$/, '') || project.name;
  };

  // ── Handlers ──
  const handleSaveTx = () => {
    const amount = parseFloat(txForm.amount);
    if (isNaN(amount) || amount <= 0) return Alert.alert(t('common.error'), t('budget.invalidAmount'));
    if (!txForm.category) return Alert.alert(t('common.error'), t('budget.categoryRequired'));
    const amountCents = Math.round(amount * 100);
    if (editingTxId) {
      updateTx.mutate({ transactionId: editingTxId, type: txForm.type, amount: amountCents, category: txForm.category, description: txForm.description || undefined, date: txForm.date, isPrivate: txForm.isPrivate ? 1 : 0, ...(txForm.payerId ? { userId: txForm.payerId } : {}) });
    } else {
      createTx.mutate({ familyId: activeFamilyId, type: txForm.type, amount: amountCents, category: txForm.category, description: txForm.description || undefined, date: txForm.date, isPrivate: txForm.isPrivate ? 1 : 0, ...(txForm.payerId ? { userId: txForm.payerId } : {}) });
    }
  };

  const handleDeleteTx = (id: number) => {
    Alert.alert(t('common.confirm'), t('budget.deleteTxConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteTx.mutate({ transactionId: id }) },
    ]);
  };

  const handleEditTx = (tx: any) => {
    setEditingTxId(tx.id);
    setTxForm({ type: tx.type, amount: (tx.amount / 100).toFixed(2), category: tx.category, description: tx.description || '', date: new Date(tx.date), isPrivate: tx.isPrivate === 1, projectId: tx.projectId, payerId: tx.userId });
    setTxModalOpen(true);
  };

  // Encoder les membres dans la description du projet: "[EUR][m:1,2,3]"
  const encodeProjectMeta = (currency: string, memberIds: number[]) => {
    const membersStr = memberIds.length > 0 ? `[m:${memberIds.join(',')}]` : '';
    return `[${currency}]${membersStr}`;
  };
  const getProjectMemberIds = (project: any): number[] => {
    const match = project.name?.match(/\[m:([\d,]+)\]/);
    if (!match) return (members as any[]).map((m: any) => m.id); // tous les membres par défaut
    return match[1].split(',').map(Number).filter(Boolean);
  };
  const handleSaveProject = () => {
    if (!projectForm.name.trim()) return Alert.alert(t('common.error'), t('budget.projectNameRequired'));
    const targetRaw = projectForm.targetAmount.trim();
    const target = targetRaw ? parseFloat(targetRaw) : 0;
    if (targetRaw && (isNaN(target) || target < 0)) return Alert.alert(t('common.error'), t('budget.invalidAmount'));
    // Encoder devise + membres dans le nom
    const selectedMemberIds = projectSelectedMembers.length > 0
      ? projectSelectedMembers
      : (members as any[]).map((m: any) => m.id);
    const meta = encodeProjectMeta(projectForm.currency, selectedMemberIds);
    const nameWithMeta = `${projectForm.name.trim()} ${meta}`;
    if (editingProjectId) {
      updateProject.mutate({ budgetConfigId: editingProjectId, name: nameWithMeta, targetAmount: Math.round(target * 100) });
    } else {
      createProject.mutate({ familyId: activeFamilyId, name: nameWithMeta, targetAmount: Math.round(target * 100) });
    }
  };
  const handleShareProject = async (project: any) => {
    const displayName = getProjectDisplayName(project);
    const appUrl = 'https://app.fri2plan.ch';
    const message = t('budget.shareInviteMessage', { projectName: displayName, appUrl });
    try {
      await Share.share({ message, title: displayName });
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteProject = (project: any) => {
    Alert.alert(t('common.confirm'), t('budget.deleteProjectConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteProject.mutate({ budgetConfigId: project.id }) },
    ]);
  };

  // ── Clé unique pour identifier un remboursement ──
  const getSettlementKey = (s: { from: string; to: string; amount: number }, projectId: number) =>
    `${projectId}-${s.from}-${s.to}-${s.amount.toFixed(2)}`;

  // ── Marquer un remboursement comme payé ──
  const handleMarkSettlementPaid = (settlement: { from: string; to: string; amount: number; currency: string }, projectId: number) => {
    const key = getSettlementKey(settlement, projectId);
    // Si déjà payé, ne rien faire
    if (paidSettlements.has(key)) return;

    const fromMember = (members as any[]).find(m => m.name === settlement.from);
    if (!fromMember) return;
    Alert.alert(
      '\u2705 Marquer comme payé',
      `${settlement.from} a remboursé ${settlement.amount.toFixed(2)} ${getCurrencySymbol(settlement.currency)} \u00e0 ${settlement.to} ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            // Marquer visuellement comme payé immédiatement
            setPaidSettlements(prev => new Set([...prev, key]));
            // Ajouter une transaction de remboursement qui réduit la dette
            createTx.mutate({
              familyId: activeFamilyId,
              type: 'income',
              amount: Math.round(settlement.amount * 100),
              category: 'Remboursement',
              description: `\u2705 Rembours\u00e9 par ${settlement.from} \u00e0 ${settlement.to}`,
              date: new Date(),
              isPrivate: 0,
              projectId,
              userId: fromMember.id,
            });
          },
        },
      ]
    );
  };

  const handleSaveProjectTx = () => {
    if (!selectedProject) return;
    const amount = parseFloat(projectTxForm.amount);
    if (isNaN(amount) || amount <= 0) return Alert.alert(t('common.error'), t('budget.invalidAmount'));
    const payerId = projectTxForm.payerId || user?.id || 0;
    createTx.mutate({
      familyId: activeFamilyId,
      type: 'expense',
      amount: Math.round(amount * 100),
      category: projectTxForm.category,
      description: projectTxForm.description || undefined,
      date: projectTxForm.date,
      isPrivate: 0,
      projectId: selectedProject.id,
      payerId, // Passer le payeur sélectionné
    });
    setProjectTxModalOpen(false);
    setProjectTxForm({ amount: '', category: 'Restaurant', description: '', payerId: user?.id || 0, date: new Date() });
  };

  const handleSaveCat = () => {
    if (!catForm.name.trim()) return Alert.alert(t('common.error'), t('budget.categoryNameRequired'));
    createCat.mutate({ familyId: activeFamilyId, name: catForm.name.trim(), color: catForm.color, icon: catForm.icon });
  };

  const handleSaveCatBudget = () => {
    const catId = parseInt(catBudgetForm.categoryId);
    const amount = parseFloat(catBudgetForm.budgetAmount);
    const threshold = parseInt(catBudgetForm.alertThreshold);
    if (isNaN(catId)) return Alert.alert(t('common.error'), t('budget.categoryRequired'));
    if (isNaN(amount) || amount <= 0) return Alert.alert(t('common.error'), t('budget.invalidAmount'));
    createCatBudget.mutate({ familyId: activeFamilyId, categoryId: catId, budgetAmount: Math.round(amount * 100), period: catBudgetForm.period, alertThreshold: threshold });
  };

  const getCurrencySymbol = (code: string) => CURRENCIES.find(c => c.value === code)?.symbol || code;

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>💰 {t('budget.title')}</Text>
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        {([
          { key: 'expenses', label: t('budget.tabTransactions'), emoji: '💰' },
          { key: 'projects', label: t('budget.tabOnPartage'), emoji: '🤝' },
          { key: 'settings', label: t('budget.tabSettings'), emoji: '⚙️' },
        ] as { key: TabType; label: string; emoji: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ONGLET DÉPENSES ── */}
      {activeTab === 'expenses' && (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
              <Text style={styles.statLabel}>{t('budget.income')}</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>+{stats.income.toFixed(2)}</Text>
              <Text style={styles.statCurrency}>{defaultCurrency}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#ef4444' }]}>
              <Text style={styles.statLabel}>{t('budget.expenses')}</Text>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>-{stats.expense.toFixed(2)}</Text>
              <Text style={styles.statCurrency}>{defaultCurrency}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: stats.balance >= 0 ? '#7c3aed' : '#f59e0b' }]}>
              <Text style={styles.statLabel}>{t('budget.balance')}</Text>
              <Text style={[styles.statValue, { color: stats.balance >= 0 ? '#7c3aed' : '#f59e0b' }]}>
                {stats.balance >= 0 ? '+' : ''}{stats.balance.toFixed(2)}
              </Text>
              <Text style={styles.statCurrency}>{defaultCurrency}</Text>
            </View>
          </View>

          {/* Filtres */}
          <View style={styles.filtersSection}>
            {/* Type */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {(['all', 'income', 'expense'] as FilterType[]).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, filterType === f && styles.filterChipActive]}
                  onPress={() => setFilterType(f)}
                >
                  <Text style={[styles.filterChipText, filterType === f && styles.filterChipTextActive]}>
                    {f === 'all' ? t('budget.all') : f === 'income' ? `📈 ${t('budget.income')}` : `📉 ${t('budget.expenses')}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Période */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {([
                { key: 'all', label: t('budget.allPeriods') },
                { key: 'week', label: t('budget.thisWeek') },
                { key: 'month', label: t('budget.thisMonth') },
                { key: 'year', label: t('budget.thisYear') },
              ] as { key: FilterPeriod; label: string }[]).map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filterPeriod === f.key && styles.filterChipActive]}
                  onPress={() => setFilterPeriod(f.key)}
                >
                  <Text style={[styles.filterChipText, filterPeriod === f.key && styles.filterChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bouton ajouter */}
          <TouchableOpacity style={styles.addButton} onPress={() => { resetTxForm(); setEditingTxId(null); setTxModalOpen(true); }}>
            <Text style={styles.addButtonText}>+ {t('budget.addTransaction')}</Text>
          </TouchableOpacity>

          {/* Liste transactions */}
          {txLoading ? (
            <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
          ) : filteredTx.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('budget.noTransactions')}</Text>
            </View>
          ) : (
            filteredTx.map((tx: any) => {
              const catInfo = allCategories.find(c => c.value === tx.category) || EXPENSE_CATEGORIES[7];
              return (
                <TouchableOpacity key={tx.id} style={styles.txCard} onPress={() => handleEditTx(tx)} onLongPress={() => handleDeleteTx(tx.id)}>
                  <View style={[styles.txIcon, { backgroundColor: catInfo.color + '22' }]}>
                    <Text style={styles.txIconText}>{catInfo.emoji}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txCategory}>{tx.category}</Text>
                    {tx.description && <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.txDate}>{format(new Date(tx.date), 'dd/MM/yyyy', { locale: getLocale() })}</Text>
                      {tx.userId && tx.userId !== user?.id && (() => {
                        const payer = (members as any[]).find((m: any) => m.id === tx.userId);
                        return payer ? <Text style={[styles.txDate, { color: '#7c3aed' }]}>👤 {payer.name}</Text> : null;
                      })()}
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: tx.type === 'income' ? '#10b981' : '#ef4444' }]}>
                      {tx.type === 'income' ? '+' : '-'}{(tx.amount / 100).toFixed(2)}
                    </Text>
                    <Text style={styles.txCurrency}>{defaultCurrency}</Text>
                    {tx.isPrivate === 1 && <Text style={styles.privateBadge}>🔒</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── ONGLET PROJETS PARTAGÉS ── */}
      {activeTab === 'projects' && (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <TouchableOpacity style={styles.addButton} onPress={() => { resetProjectForm(); setProjectModalOpen(true); }}>
            <Text style={styles.addButtonText}>+ {t('budget.newOnPartage')}</Text>
          </TouchableOpacity>

          {(savingsProjects as any[]).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('budget.noProjects')}</Text>
              <Text style={styles.emptySubtext}>{t('budget.noProjectsHint')}</Text>
            </View>
          ) : (
            (savingsProjects as any[]).map((project: any) => {
              const currency = getProjectCurrency(project);
              const displayName = getProjectDisplayName(project);
              const projectTxs = getProjectTransactions(project.id);
              const totalSpent = projectTxs.reduce((s: number, t: any) => s + t.amount / 100, 0);
              const target = project.targetAmount / 100;
              const progress = target > 0 ? Math.min(totalSpent / target, 1) : 0;

              return (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => { setSelectedProject(project); setProjectDetailOpen(true); }}
                >
                  <View style={styles.projectCardHeader}>
                    <Text style={styles.projectName}>{displayName}</Text>
                    <View style={styles.projectCurrencyBadge}>
                      <Text style={styles.projectCurrencyText}>{CURRENCIES.find(c => c.value === currency)?.flag} {currency}</Text>
                    </View>
                  </View>
                  <View style={styles.projectStats}>
                    <Text style={styles.projectSpent}>{totalSpent.toFixed(2)} {getCurrencySymbol(currency)}</Text>
                    <Text style={styles.projectTarget}>/ {target.toFixed(2)} {getCurrencySymbol(currency)}</Text>
                  </View>
                  {/* Barre de progression */}
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
                  </View>
                  <Text style={styles.projectMembers}>
                    👥 {projectTxs.length} {t('budget.expenses').toLowerCase()}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── ONGLET PARAMÈTRES ── */}
      {activeTab === 'settings' && (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Devise par défaut - gérée dans Paramètres généraux */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>{t('budget.defaultCurrency')}</Text>
            <View style={[styles.currencyRow, { flexWrap: 'wrap' }]}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.currencyChip, defaultCurrency === c.value && styles.currencyChipActive]}
                  onPress={() => setDefaultCurrency(c.value)}
                >
                  <Text style={styles.currencyFlag}>{c.flag}</Text>
                  <Text style={[styles.currencyLabel, defaultCurrency === c.value && styles.currencyLabelActive]}>{c.value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 6, fontStyle: 'italic' }}>
              {t('settings.currencyVisualOnly')}
            </Text>
          </View>

          {/* Catégories personnalisées */}
          <View style={styles.settingsSection}>
            <View style={styles.settingsSectionHeader}>
              <Text style={styles.settingsSectionTitle}>{t('budget.customCategories')}</Text>
              <TouchableOpacity style={styles.settingsAddBtn} onPress={() => { resetCatForm(); setCatModalOpen(true); }}>
                <Text style={styles.settingsAddBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {(categories as any[]).length === 0 ? (
              <Text style={styles.settingsEmpty}>{t('budget.noCustomCategories')}</Text>
            ) : (
              (categories as any[]).map((cat: any) => (
                <View key={cat.id} style={styles.settingsItem}>
                  <Text style={styles.settingsItemIcon}>{getCategoryEmoji(cat.icon)}</Text>
                  <Text style={styles.settingsItemName}>{cat.name}</Text>
                  <View style={[styles.colorDot, { backgroundColor: cat.color || '#7c3aed' }]} />
                  <TouchableOpacity onPress={() => {
                    Alert.alert(t('common.confirm'), t('budget.deleteCategoryConfirm'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('common.delete'), style: 'destructive', onPress: () => deleteCat.mutate({ categoryId: cat.id }) },
                    ]);
                  }}>
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Budgets par catégorie */}
          <View style={styles.settingsSection}>
            <View style={styles.settingsSectionHeader}>
              <Text style={styles.settingsSectionTitle}>{t('budget.categoryBudgets')}</Text>
              <TouchableOpacity style={styles.settingsAddBtn} onPress={() => { resetCatBudgetForm(); setCatBudgetModalOpen(true); }}>
                <Text style={styles.settingsAddBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {(categoryBudgets as any[]).length === 0 ? (
              <Text style={styles.settingsEmpty}>{t('budget.noCategoryBudgets')}</Text>
            ) : (
              (categoryBudgets as any[]).map((cb: any) => {
                const spent = cb.spent || 0;
                const budget = cb.budgetAmount / 100;
                const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                const isAlert = pct >= cb.alertThreshold;
                return (
                  <View key={cb.id} style={styles.catBudgetItem}>
                    <View style={styles.catBudgetInfo}>
                      <Text style={styles.catBudgetName}>{cb.categoryName || t('common.unknown')}</Text>
                      <Text style={styles.catBudgetPeriod}>{cb.period}</Text>
                    </View>
                    <View style={styles.catBudgetRight}>
                      <Text style={[styles.catBudgetPct, isAlert && { color: '#ef4444' }]}>{pct}%</Text>
                      <Text style={styles.catBudgetAmount}>{budget.toFixed(0)} {defaultCurrency}</Text>
                      <TouchableOpacity onPress={() => {
                        Alert.alert(t('common.confirm'), t('budget.deleteCategoryBudgetConfirm'), [
                          { text: t('common.cancel'), style: 'cancel' },
                          { text: t('common.delete'), style: 'destructive', onPress: () => deleteCatBudget.mutate({ budgetId: cb.id }) },
                        ]);
                      }}>
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Modal Transaction */}
      <Modal visible={txModalOpen} animationType="slide" transparent onRequestClose={() => setTxModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingTxId ? t('budget.editTransaction') : t('budget.addTransaction')}</Text>

            {/* Type */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeBtn, txForm.type === 'expense' && styles.typeBtnActive]}
                onPress={() => setTxForm(f => ({ ...f, type: 'expense', category: '' }))}
              >
                <Text style={[styles.typeBtnText, txForm.type === 'expense' && styles.typeBtnTextActive]}>📉 {t('budget.expense')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txForm.type === 'income' && styles.typeBtnActiveIncome]}
                onPress={() => setTxForm(f => ({ ...f, type: 'income', category: '' }))}
              >
                <Text style={[styles.typeBtnText, txForm.type === 'income' && styles.typeBtnTextActive]}>📈 {t('budget.income')}</Text>
              </TouchableOpacity>
            </View>

            {/* Montant */}
            <Text style={styles.fieldLabel}>{t('budget.amount')} ({defaultCurrency})</Text>
            <TextInput
              style={styles.input}
              value={txForm.amount}
              onChangeText={v => setTxForm(f => ({ ...f, amount: v }))}
              placeholder="0.00"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              keyboardType="decimal-pad"
            />

            {/* Catégorie */}
            <Text style={styles.fieldLabel}>{t('budget.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {(txForm.type === 'income' ? INCOME_CATEGORIES.map(v => ({ value: v, emoji: '💵', color: '#10b981' })) : allCategories).map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.catChip, txForm.category === cat.value && styles.catChipActive]}
                  onPress={() => setTxForm(f => ({ ...f, category: cat.value }))}
                >
                  <Text style={styles.catChipEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catChipText, txForm.category === cat.value && styles.catChipTextActive]}>{cat.value}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Description */}
            <Text style={styles.fieldLabel}>{t('budget.description')}</Text>
            <TextInput
              style={styles.input}
              value={txForm.description}
              onChangeText={v => setTxForm(f => ({ ...f, description: v }))}
              placeholder={t('budget.descriptionPlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />

            {/* Date */}
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>📅 {format(txForm.date, 'dd/MM/yyyy')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={txForm.date}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setTxForm(f => ({ ...f, date: d })); }}
              />
            )}

            {/* Payé par */}
            {(members as any[]).length > 1 && (
              <>
                <Text style={styles.fieldLabel}>{t('budget.paidBy')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  {(members as any[]).map((m: any) => {
                    const isSelected = txForm.payerId === m.id || (!txForm.payerId && m.id === user?.id);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.catChip, isSelected && styles.catChipActive]}
                        onPress={() => setTxForm(f => ({ ...f, payerId: m.id }))}
                      >
                        <Text style={styles.catChipEmoji}>
                          {m.avatarType === 'emoji' || m.avatarType === 'icon' ? (m.avatarValue || '👤') : (m.name?.charAt(0) || '?')}
                        </Text>
                        <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>{m.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Privé */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🔒 {t('budget.private')}</Text>
              <Switch value={txForm.isPrivate} onValueChange={v => setTxForm(f => ({ ...f, isPrivate: v }))} trackColor={{ true: '#7c3aed' }} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTxModalOpen(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTx} disabled={createTx.isPending || updateTx.isPending}>
                {(createTx.isPending || updateTx.isPending) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Nouveau Projet */}
      <Modal visible={projectModalOpen} animationType="slide" transparent onRequestClose={() => setProjectModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingProjectId ? t('budget.editProject') : t('budget.newProject')}</Text>

            <Text style={styles.fieldLabel}>{t('budget.projectName')}</Text>
            <TextInput
              style={styles.input}
              value={projectForm.name}
              onChangeText={v => setProjectForm(f => ({ ...f, name: v }))}
              placeholder={t('budget.projectNamePlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />

            <Text style={styles.fieldLabel}>{t('budget.currency')}</Text>
            <View style={styles.currencyRow}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.currencyChip, projectForm.currency === c.value && styles.currencyChipActive]}
                  onPress={() => setProjectForm(f => ({ ...f, currency: c.value }))}
                >
                  <Text style={styles.currencyFlag}>{c.flag}</Text>
                  <Text style={[styles.currencyLabel, projectForm.currency === c.value && styles.currencyLabelActive]}>{c.value}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('budget.targetAmount')} ({projectForm.currency}) <Text style={{ color: '#9ca3af', fontWeight: '400' }}>({t('common.optional')})</Text></Text>
            <TextInput
              style={styles.input}
              value={projectForm.targetAmount}
              onChangeText={v => setProjectForm(f => ({ ...f, targetAmount: v }))}
              placeholder={t('budget.targetAmountOptionalPlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              keyboardType="decimal-pad"
            />

            {/* Sélection des membres */}
            <Text style={styles.fieldLabel}>{t('budget.projectMembers')}</Text>
            <Text style={styles.fieldHint}>{t('budget.projectMembersHint')}</Text>
            <View style={styles.memberSelectRow}>
              {(members as any[]).map((m: any) => {
                const isSelected = projectSelectedMembers.length === 0 || projectSelectedMembers.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberChip, isSelected && styles.memberChipActive]}
                    onPress={() => {
                      if (projectSelectedMembers.length === 0) {
                        // Tous sélectionnés par défaut → désélectionner les autres
                        const others = (members as any[]).filter((x: any) => x.id !== m.id).map((x: any) => x.id);
                        setProjectSelectedMembers(others);
                      } else if (isSelected) {
                        const next = projectSelectedMembers.filter(id => id !== m.id);
                        setProjectSelectedMembers(next.length === 0 ? [] : next);
                      } else {
                        setProjectSelectedMembers(prev => [...prev, m.id]);
                      }
                    }}
                  >
                    <Text style={styles.memberChipEmoji}>👤</Text>
                    <Text style={[styles.memberChipText, isSelected && styles.memberChipTextActive]}>{m.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setProjectModalOpen(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProject} disabled={createProject.isPending || updateProject.isPending}>
                {(createProject.isPending || updateProject.isPending) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{editingProjectId ? t('common.save') : t('common.create')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Détail Projet */}
      <Modal visible={projectDetailOpen && !!selectedProject} animationType="slide" transparent onRequestClose={() => setProjectDetailOpen(false)}>
        <View style={[styles.modalOverlayFull, { paddingTop: insets.top }]}>
          <View style={styles.projectDetailContainer}>
            {selectedProject && (() => {
              const currency = getProjectCurrency(selectedProject);
              const displayName = getProjectDisplayName(selectedProject);
              const projectTxs = getProjectTransactions(selectedProject.id);
              const totalSpent = projectTxs.reduce((s: number, t: any) => s + t.amount / 100, 0);
              const target = selectedProject.targetAmount / 100;
              const projectMemberIds = getProjectMemberIds(selectedProject);
              const projectMembers = (members as any[]).filter((m: any) => projectMemberIds.includes(m.id));
              const settlements = calculateSplit(projectTxs, projectMembers, currency);

              return (
                <>
                  <View style={styles.projectDetailHeader}>
                    <TouchableOpacity onPress={() => setProjectDetailOpen(false)}>
                      <Text style={styles.backButton}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.projectDetailTitle}>{displayName}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => handleShareProject(selectedProject)}>
                        <Text style={styles.editIcon}>📤</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        const mIds = getProjectMemberIds(selectedProject);
                        setProjectForm({ name: getProjectDisplayName(selectedProject), currency: getProjectCurrency(selectedProject), targetAmount: (selectedProject.targetAmount / 100).toFixed(2) });
                        setProjectSelectedMembers(mIds);
                        setEditingProjectId(selectedProject.id);
                        setProjectDetailOpen(false);
                        setProjectModalOpen(true);
                      }}>
                        <Text style={styles.editIcon}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteProject(selectedProject)}>
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView style={styles.projectDetailContent}>
                    {/* Résumé */}
                    <View style={styles.projectSummaryCard}>
                      <Text style={styles.projectSummaryLabel}>{t('budget.totalSpent')}</Text>
                      <Text style={styles.projectSummaryAmount}>{totalSpent.toFixed(2)} {getCurrencySymbol(currency)}</Text>
                      <Text style={styles.projectSummaryTarget}>/ {target.toFixed(2)} {getCurrencySymbol(currency)}</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min(totalSpent / target, 1) * 100}%` as any }]} />
                      </View>
                    </View>

                    {/* Membres du projet */}
                    {projectMembers.length > 0 && (
                      <View style={styles.projectMembersSection}>
                        <Text style={styles.projectMembersLabel}>👥 {t('budget.projectParticipants')}</Text>
                        <View style={styles.projectMembersRow}>
                          {projectMembers.map((m: any) => (
                            <View key={m.id} style={styles.projectMemberBadge}>
                              <Text style={styles.projectMemberBadgeText}>{m.name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Calcul du split */}
                    {settlements.length > 0 && (
                      <View style={styles.splitSection}>
                        <Text style={styles.splitTitle}>💸 {t('budget.splitSummary')}</Text>
                        {settlements.map((s, i) => {
                          const key = getSettlementKey(s, selectedProject!.id);
                          const isPaid = paidSettlements.has(key);
                          return (
                            <View key={i} style={styles.settlementCard}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.settlementText}>
                                  <Text style={[styles.settlementFrom, isPaid && { color: '#10b981' }]}>{s.from}</Text>
                                  {` ${t('budget.owes')} `}
                                  <Text style={[styles.settlementAmount, isPaid && { color: '#10b981' }]}>{s.amount.toFixed(2)} {getCurrencySymbol(s.currency)}</Text>
                                  {` ${t('budget.to')} `}
                                  <Text style={styles.settlementTo}>{s.to}</Text>
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.settlementPaidBtn, isPaid && styles.settlementPaidBtnConfirmed]}
                                onPress={() => handleMarkSettlementPaid(s, selectedProject!.id)}
                                disabled={isPaid}
                              >
                                <Text style={[styles.settlementPaidBtnText, isPaid && styles.settlementPaidBtnTextConfirmed]}>
                                  {isPaid ? '\u2705 Payé' : 'Payé ?'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {settlements.length === 0 && projectTxs.length > 0 && (
                      <View style={styles.splitSection}>
                        <Text style={styles.splitTitle}>✅ {t('budget.allSettled')}</Text>
                      </View>
                    )}

                    {/* Bouton ajouter dépense */}
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => {
                        setProjectTxForm({ amount: '', category: 'Autre', description: '', payerId: user?.id || 0, date: new Date() });
                        setProjectTxModalOpen(true);
                      }}
                    >
                      <Text style={styles.addButtonText}>+ {t('budget.addExpense')}</Text>
                    </TouchableOpacity>

                    {/* Liste dépenses du projet */}
                    <Text style={styles.sectionTitle}>{t('budget.projectExpenses')}</Text>
                    {projectTxs.length === 0 ? (
                      <Text style={styles.settingsEmpty}>{t('budget.noProjectExpenses')}</Text>
                    ) : (
                      projectTxs.map((tx: any) => {
                        const payer = (members as any[]).find(m => m.id === tx.userId);
                        return (
                          <TouchableOpacity
                            key={tx.id}
                            style={styles.txCard}
                            onLongPress={() => handleDeleteTx(tx.id)}
                            onPress={() => handleEditTx(tx)}
                          >
                            <View style={styles.txInfo}>
                              <Text style={styles.txCategory}>{tx.description || tx.category}</Text>
                              <Text style={styles.txDate}>
                                {payer ? `👤 ${payer.name}` : ''} · {format(new Date(tx.date), 'dd/MM/yyyy')}
                              </Text>
                            </View>
                            <View style={styles.txRight}>
                              <Text style={[styles.txAmount, { color: '#ef4444' }]}>
                                -{(tx.amount / 100).toFixed(2)} {getCurrencySymbol(currency)}
                              </Text>
                              <TouchableOpacity onPress={() => handleDeleteTx(tx.id)} style={{ padding: 4 }}>
                                <Text style={{ fontSize: 14 }}>🗑️</Text>
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                    <View style={{ height: 60 }} />
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal Dépense Projet */}
      <Modal visible={projectTxModalOpen} animationType="slide" transparent onRequestClose={() => setProjectTxModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('budget.addExpense')}</Text>

            <Text style={styles.fieldLabel}>{t('budget.amount')} ({selectedProject ? getProjectCurrency(selectedProject) : 'CHF'})</Text>
            <TextInput
              style={styles.input}
              value={projectTxForm.amount}
              onChangeText={v => setProjectTxForm(f => ({ ...f, amount: v }))}
              placeholder="0.00"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>{t('budget.description')}</Text>
            <TextInput
              style={styles.input}
              value={projectTxForm.description}
              onChangeText={v => setProjectTxForm(f => ({ ...f, description: v }))}
              placeholder={t('budget.descriptionPlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />

            <Text style={styles.fieldLabel}>{t('budget.category')}</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowCatDropdown(v => !v)}
            >
              <Text style={styles.dropdownBtnText}>
                {PROJECT_CATEGORIES.find(c => c.value === projectTxForm.category)?.emoji} {projectTxForm.category}
              </Text>
              <Text style={styles.dropdownArrow}>{showCatDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showCatDropdown && (
              <View style={styles.dropdownList}>
                {PROJECT_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.dropdownItem, projectTxForm.category === cat.value && styles.dropdownItemActive]}
                    onPress={() => { setProjectTxForm(f => ({ ...f, category: cat.value })); setShowCatDropdown(false); }}
                  >
                    <Text style={styles.dropdownItemEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.dropdownItemText, projectTxForm.category === cat.value && styles.dropdownItemTextActive]}>{cat.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.fieldLabel}>{t('budget.paidBy')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {(selectedProject ? (members as any[]).filter((m: any) => getProjectMemberIds(selectedProject).includes(m.id)) : (members as any[])).map((m: any) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.catChip, projectTxForm.payerId === m.id && styles.catChipActive]}
                  onPress={() => setProjectTxForm(f => ({ ...f, payerId: m.id }))}
                >
                  <Text style={styles.catChipEmoji}>👤</Text>
                  <Text style={[styles.catChipText, projectTxForm.payerId === m.id && styles.catChipTextActive]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.dateButton} onPress={() => setShowProjectDatePicker(true)}>
              <Text style={styles.dateButtonText}>📅 {format(projectTxForm.date, 'dd/MM/yyyy')}</Text>
            </TouchableOpacity>
            {showProjectDatePicker && (
              <DateTimePicker
                value={projectTxForm.date}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowProjectDatePicker(false); if (d) setProjectTxForm(f => ({ ...f, date: d })); }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setProjectTxModalOpen(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProjectTx} disabled={createTx.isPending}>
                {createTx.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Catégorie */}
      <Modal visible={catModalOpen} animationType="slide" transparent onRequestClose={() => setCatModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('budget.newCategory')}</Text>
            <Text style={styles.fieldLabel}>{t('budget.categoryName')}</Text>
            <TextInput
              style={styles.input}
              value={catForm.name}
              onChangeText={v => setCatForm(f => ({ ...f, name: v }))}
              placeholder={t('budget.categoryNamePlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Text style={styles.fieldLabel}>{t('budget.icon')}</Text>
            <TextInput
              style={styles.input}
              value={catForm.icon}
              onChangeText={v => setCatForm(f => ({ ...f, icon: v }))}
              placeholder="💼"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCatModalOpen(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCat} disabled={createCat.isPending}>
                {createCat.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Budget Catégorie */}
      <Modal visible={catBudgetModalOpen} animationType="slide" transparent onRequestClose={() => setCatBudgetModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('budget.newCategoryBudget')}</Text>

            <Text style={styles.fieldLabel}>{t('budget.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {(categories as any[]).map((cat: any) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, catBudgetForm.categoryId === String(cat.id) && styles.catChipActive]}
                  onPress={() => setCatBudgetForm(f => ({ ...f, categoryId: String(cat.id) }))}
                >
                  <Text style={styles.catChipEmoji}>{getCategoryEmoji(cat.icon)}</Text>
                  <Text style={[styles.catChipText, catBudgetForm.categoryId === String(cat.id) && styles.catChipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{t('budget.budgetAmount')} ({defaultCurrency})</Text>
            <TextInput
              style={styles.input}
              value={catBudgetForm.budgetAmount}
              onChangeText={v => setCatBudgetForm(f => ({ ...f, budgetAmount: v }))}
              placeholder="0.00"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>{t('budget.alertThreshold')} (%)</Text>
            <TextInput
              style={styles.input}
              value={catBudgetForm.alertThreshold}
              onChangeText={v => setCatBudgetForm(f => ({ ...f, alertThreshold: v }))}
              placeholder="80"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              keyboardType="number-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCatBudgetModalOpen(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCatBudget} disabled={createCatBudget.isPending}>
                {createCatBudget.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    backgroundColor: isDark ? '#111827' : '#fff'},
  pageTitle: { fontSize: 24, fontWeight: '700', color: isDark ? '#fff' : '#111827', textAlign: 'center' },
  tabsContainer: {
    flexDirection: 'row', padding: 10, gap: 6,
    backgroundColor: isDark ? '#111827' : '#fff',
    borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb'},
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    alignItems: 'center'},
  activeTab: { backgroundColor: '#7c3aed' },
  tabEmoji: { fontSize: 16 },
  tabText: { fontSize: 11, fontWeight: '600', color: isDark ? '#d1d5db' : '#4b5563', marginTop: 2 },
  activeTabText: { color: '#fff' },
  content: { flex: 1 },
  // Stats
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 10, padding: 10, borderLeftWidth: 3,
    elevation: 1},
  statLabel: { fontSize: 10, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statCurrency: { fontSize: 10, color: isDark ? '#9ca3af' : '#6b7280' },
  // Filtres
  filtersSection: { paddingHorizontal: 12, marginBottom: 4 },
  filterRow: { marginBottom: 6 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 6,
    borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#1f2937' : '#fff'},
  filterChipActive: { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  filterChipText: { fontSize: 12, color: isDark ? '#d1d5db' : '#374151' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  // Bouton ajouter
  addButton: {
    marginHorizontal: 16, marginVertical: 8, paddingVertical: 12,
    backgroundColor: '#7c3aed', borderRadius: 10, alignItems: 'center'},
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Transactions
  txCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 12,
    elevation: 1, borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb'},
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 14, fontWeight: '600', color: isDark ? '#fff' : '#111827' },
  txDesc: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 1 },
  txDate: { fontSize: 11, color: isDark ? '#6b7280' : '#9ca3af', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txCurrency: { fontSize: 10, color: isDark ? '#9ca3af' : '#6b7280' },
  privateBadge: { fontSize: 12, marginTop: 2 },
  // Projets
  projectCard: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16,
    elevation: 2, borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb'},
  projectCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  projectName: { fontSize: 16, fontWeight: '700', color: isDark ? '#fff' : '#111827', flex: 1 },
  projectCurrencyBadge: {
    backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3},
  projectCurrencyText: { fontSize: 12, color: isDark ? '#d1d5db' : '#374151', fontWeight: '600' },
  projectStats: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  projectSpent: { fontSize: 20, fontWeight: '700', color: '#7c3aed' },
  projectTarget: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginLeft: 4 },
  progressBar: { height: 6, backgroundColor: isDark ? '#374151' : '#e5e7eb', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#7c3aed', borderRadius: 3 },
  projectMembers: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' },
  // Détail projet
  modalOverlayFull: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' },
  projectDetailContainer: { flex: 1 },
  projectDetailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    backgroundColor: isDark ? '#111827' : '#fff'},
  backButton: { fontSize: 14, color: '#7c3aed', fontWeight: '600' },
  projectDetailTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#fff' : '#111827', flex: 1, textAlign: 'center' },
  projectDetailContent: { flex: 1 },
  projectSummaryCard: {
    margin: 16, backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12, padding: 16, elevation: 2,
    borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb'},
  projectSummaryLabel: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 4 },
  projectSummaryAmount: { fontSize: 28, fontWeight: '700', color: '#7c3aed' },
  projectSummaryTarget: { fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 8 },
  splitSection: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12, padding: 14, elevation: 1,
    borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb'},
  splitTitle: { fontSize: 15, fontWeight: '700', color: isDark ? '#fff' : '#111827', marginBottom: 10 },
  settlementCard: {
    backgroundColor: isDark ? '#374151' : '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center', gap: 8},
  settlementText: { fontSize: 14, color: isDark ? '#e5e7eb' : '#374151' },
  settlementFrom: { fontWeight: '700', color: '#ef4444' },
  settlementAmount: { fontWeight: '700', color: '#7c3aed' },
  settlementTo: { fontWeight: '700', color: '#10b981' },
  settlementPaidBtn: {
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  settlementPaidBtnConfirmed: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'},
  settlementPaidBtnText: { color: isDark ? '#d1d5db' : '#374151', fontSize: 12, fontWeight: '700' },
  settlementPaidBtnTextConfirmed: { color: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: isDark ? '#fff' : '#111827', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  // Settings
  settingsSection: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12, padding: 14, elevation: 1,
    borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb'},
  settingsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  settingsSectionTitle: { fontSize: 15, fontWeight: '700', color: isDark ? '#fff' : '#111827' },
  settingsAddBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#7c3aed',
    justifyContent: 'center', alignItems: 'center'},
  settingsAddBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  settingsEmpty: { fontSize: 13, color: isDark ? '#6b7280' : '#9ca3af', fontStyle: 'italic' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  settingsItemIcon: { fontSize: 20 },
  settingsItemName: { flex: 1, fontSize: 14, color: isDark ? '#e5e7eb' : '#111827' },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  deleteIcon: { fontSize: 18 },
  editIcon: { fontSize: 18 },
  // Dropdown catégorie projet
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: isDark ? '#1f2937' : '#f9fafb', marginBottom: 4 },
  dropdownBtnText: { fontSize: 15, color: isDark ? '#e5e7eb' : '#111827' },
  dropdownArrow: { fontSize: 12, color: isDark ? '#6b7280' : '#9ca3af' },
  dropdownList: { borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb', borderRadius: 10, backgroundColor: isDark ? '#1f2937' : '#fff', marginBottom: 8, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6' },
  dropdownItemActive: { backgroundColor: '#7c3aed22' },
  dropdownItemEmoji: { fontSize: 20 },
  dropdownItemText: { fontSize: 15, color: isDark ? '#e5e7eb' : '#111827' },
  dropdownItemTextActive: { color: '#7c3aed', fontWeight: '600' },
  catBudgetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6' },
  catBudgetInfo: { flex: 1 },
  catBudgetName: { fontSize: 14, fontWeight: '600', color: isDark ? '#e5e7eb' : '#111827' },
  catBudgetPeriod: { fontSize: 11, color: isDark ? '#6b7280' : '#9ca3af' },
  catBudgetRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBudgetPct: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  catBudgetAmount: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' },
  // Devise
  currencyRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  currencyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 2, borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#1f2937' : '#fff'},
  currencyChipActive: { borderColor: '#7c3aed', backgroundColor: isDark ? '#1e1b4b' : '#ede9fe' },
  currencyFlag: { fontSize: 18 },
  currencyLabel: { fontSize: 13, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151' },
  currencyLabelActive: { color: '#7c3aed' },
  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'},
  modalContent: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%'},
  modalTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#fff' : '#111827', marginBottom: 16, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: isDark ? '#111827' : '#f3f4f6',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: isDark ? '#fff' : '#111827',
    borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#374151' : 'transparent'},
  catScroll: { marginBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, marginRight: 6,
    borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#111827' : '#f9fafb'},
  catChipActive: { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  catChipEmoji: { fontSize: 16 },
  catChipText: { fontSize: 12, color: isDark ? '#d1d5db' : '#374151' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  dateButton: {
    backgroundColor: isDark ? '#111827' : '#f3f4f6', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 10,
    borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#374151' : 'transparent'},
  dateButtonText: { fontSize: 14, color: isDark ? '#d1d5db' : '#374151' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  switchLabel: { fontSize: 14, color: isDark ? '#d1d5db' : '#374151' },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 2, borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#111827' : '#f9fafb'},
  typeBtnActive: { borderColor: '#ef4444', backgroundColor: '#ef444422' },
  typeBtnActiveIncome: { borderColor: '#10b981', backgroundColor: '#10b98122' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151' },
  typeBtnTextActive: { color: isDark ? '#fff' : '#111827' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db'},
  cancelBtnText: { fontSize: 15, color: isDark ? '#d1d5db' : '#374151', fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#7c3aed' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: isDark ? '#d1d5db' : '#1f2937', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: isDark ? '#6b7280' : '#9ca3af', textAlign: 'center' },
  // Sélection membres projet
  memberSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
    borderWidth: 2, borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#111827' : '#f9fafb'},
  memberChipActive: { borderColor: '#7c3aed', backgroundColor: isDark ? '#1e1b4b' : '#ede9fe' },
  memberChipEmoji: { fontSize: 16 },
  memberChipText: { fontSize: 13, color: isDark ? '#d1d5db' : '#374151', fontWeight: '500' },
  memberChipTextActive: { color: '#7c3aed', fontWeight: '700' },
  fieldHint: { fontSize: 11, color: isDark ? '#6b7280' : '#9ca3af', marginBottom: 6, fontStyle: 'italic' },
  // Membres dans le détail projet
  projectMembersSection: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12, padding: 12, elevation: 1,
    borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb'},
  projectMembersLabel: { fontSize: 13, fontWeight: '700', color: isDark ? '#d1d5db' : '#374151', marginBottom: 8 },
  projectMembersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  projectMemberBadge: {
    backgroundColor: isDark ? '#374151' : '#ede9fe',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4},
  projectMemberBadgeText: { fontSize: 12, color: isDark ? '#d1d5db' : '#7c3aed', fontWeight: '600' }});
