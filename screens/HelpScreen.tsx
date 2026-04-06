import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../i18n';

interface HelpScreenProps {
  onNavigate?: (pageIndex: number) => void;
}

const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=space.manus.fri2plan.twa';

const FAQ_ITEMS = [
  {
    id: 1,
    category: 'Démarrage',
    question: 'Comment créer ma famille ?',
    answer: "Allez dans l'onglet Cercles (👥), puis appuyez sur \"Créer un cercle\". Donnez un nom à votre famille, choisissez une couleur et invitez les membres via leur email ou un code d'invitation.",
  },
  {
    id: 2,
    category: 'Démarrage',
    question: 'Comment inviter un membre de ma famille ?',
    answer: "Dans Cercles → votre famille → onglet Invitations. Copiez le code d'invitation ou partagez-le directement. Le membre invité peut rejoindre depuis son app via \"Rejoindre un cercle\".",
  },
  {
    id: 3,
    category: 'Calendrier',
    question: 'Comment ajouter un événement partagé ?',
    answer: "Appuyez sur le bouton + dans le calendrier. Remplissez le titre, la date et l'heure. L'événement sera visible par tous les membres de votre famille.",
  },
  {
    id: 4,
    category: 'Calendrier',
    question: "Qu'est-ce que le Calendrier Intime ?",
    answer: "Le Calendrier Intime est un espace personnel et privé pour suivre votre cycle menstruel. Il doit être activé dans les Paramètres. Vos données restent strictement privées et ne sont jamais partagées avec les autres membres.",
  },
  {
    id: 5,
    category: 'Budget',
    question: 'Comment fonctionne "On Partage" ?',
    answer: "L'onglet \"On Partage\" vous permet de suivre les dépenses communes de votre famille. Ajoutez une dépense avec le montant, la catégorie et le payeur. Les statistiques vous montrent la répartition des dépenses par membre.",
  },
  {
    id: 6,
    category: 'Budget',
    question: "Puis-je attribuer une dépense à un autre membre ?",
    answer: "Oui ! Lors de la création ou modification d'une dépense, utilisez le champ \"Payé par\" pour sélectionner n'importe quel membre de la famille. Pratique si quelqu'un n'a pas son téléphone.",
  },
  {
    id: 7,
    category: 'Récompenses',
    question: 'Comment fonctionnent les points ?',
    answer: "Chaque tâche complétée rapporte des points. L'administrateur peut aussi attribuer des points manuellement. Les points s'accumulent et permettent de débloquer des récompenses définies par la famille.",
  },
  {
    id: 8,
    category: 'Récompenses',
    question: 'Comment créer une récompense ?',
    answer: 'Dans l\'onglet Récompenses → Catalogue → bouton "+ Nouvelle récompense". Définissez un nom, une description et un coût en points. Les membres peuvent ensuite échanger leurs points contre ces récompenses.',
  },
  {
    id: 9,
    category: 'Compte',
    question: 'Comment modifier mon avatar ?',
    answer: "Allez dans Cercles → votre famille → bouton \"👤 Mon profil\". Vous pouvez modifier votre nom, choisir une couleur et sélectionner un emoji comme avatar.",
  },
  {
    id: 10,
    category: 'Compte',
    question: "Comment changer le rôle d'un membre ?",
    answer: "Seul l'administrateur peut modifier les rôles. Dans Cercles → votre famille → appuyez sur un membre → \"Modifier le rôle\". Pour transférer le rôle admin, utilisez l'option \"Transférer l'administration\".",
  },
  {
    id: 11,
    category: 'Abonnement',
    question: "Qu'est-ce que le plan Premium ?",
    answer: "Le plan Premium débloque toutes les fonctionnalités : budget illimité, calendrier intime, statistiques avancées, badges, et plus. Gérez votre abonnement dans Paramètres → Abonnement.",
  },
  {
    id: 12,
    category: 'Abonnement',
    question: "Mon abonnement n'apparaît pas après paiement ?",
    answer: "Si votre paiement a été effectué mais que l'abonnement n'apparaît pas, allez dans Paramètres → Abonnement → \"Synchroniser l'abonnement\". Si le problème persiste, créez un ticket de support.",
  },
];

const CATEGORIES = ['Tous', 'Démarrage', 'Calendrier', 'Budget', 'Récompenses', 'Compte', 'Abonnement'];

const TICKET_CATEGORIES = [
  { value: 'technique', label: '🔧 Problème technique' },
  { value: 'facturation', label: '💳 Facturation' },
  { value: 'fonctionnalite', label: '💡 Suggestion' },
  { value: 'autre', label: '📋 Autre' },
];

export default function HelpScreen({
  onNavigate,
}: HelpScreenProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const auth = useAuth() as any;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showMyTickets, setShowMyTickets] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: 'technique' as 'technique' | 'facturation' | 'fonctionnalite' | 'autre',
    subject: '',
    message: '',
  });

  const { data: myTickets = [], isLoading: ticketsLoading, refetch: refetchTickets } =
    trpc.supportTickets.listMyTickets.useQuery(undefined, { enabled: showMyTickets });

  const createTicketMutation = trpc.supportTickets.createTicket.useMutation({
    onSuccess: (data: any) => {
      Alert.alert(
        '✅ Ticket créé',
        `Votre ticket ${data.ticketNumber} a été créé. Vous recevrez une réponse par email.`,
        [{ text: 'OK', onPress: () => { setShowTicketModal(false); resetTicketForm(); refetchTickets(); } }]
      );
    },
    onError: (err: any) => {
      Alert.alert('Erreur', err.message || 'Impossible de créer le ticket.');
    },
  });

  const resetTicketForm = () => setTicketForm({ category: 'technique', subject: '', message: '' });

  const handleCreateTicket = () => {
    if (!ticketForm.subject.trim()) { Alert.alert('Champ requis', 'Veuillez saisir un sujet.'); return; }
    if (!ticketForm.message.trim()) { Alert.alert('Champ requis', 'Veuillez décrire votre problème.'); return; }
    createTicketMutation.mutate(ticketForm);
  };

  const handleRateApp = () => {
    Linking.openURL(GOOGLE_PLAY_URL).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir le Google Play Store."));
  };

  const handleRestartOnboarding = () => {
    Alert.alert(
      '🚀 Guide de démarrage',
      'Voulez-vous revoir le guide de démarrage ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, relancer',
          onPress: async () => {
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.removeItem('hasSeenOnboarding');
              Alert.alert('✅', 'Fermez et rouvrez l\'app pour voir le guide de démarrage.');
            } catch {
              Alert.alert('Info', "Fermez et rouvrez l'app pour voir le guide de démarrage.");
            }
          },
        },
      ]
    );
  };

  const filteredFaq = FAQ_ITEMS.filter((item) => {
    const matchCat = selectedCategory === 'Tous' || item.category === selectedCategory;
    const matchSearch = !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'nouveau': return '#7c3aed';
      case 'en_cours': return '#f59e0b';
      case 'resolu': return '#10b981';
      case 'ferme': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'nouveau': return 'Nouveau';
      case 'en_cours': return 'En cours';
      case 'resolu': return 'Résolu';
      case 'ferme': return 'Fermé';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>{t('help.title')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickCard} onPress={handleRestartOnboarding}>
            <Text style={styles.quickIcon}>🚀</Text>
            <Text style={styles.quickTitle}>Guide{'\n'}démarrage</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => setShowMyTickets(!showMyTickets)}>
            <Text style={styles.quickIcon}>🎫</Text>
            <Text style={styles.quickTitle}>Mes{'\n'}tickets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, styles.quickCardPurple]} onPress={() => setShowTicketModal(true)}>
            <Text style={styles.quickIcon}>✉️</Text>
            <Text style={[styles.quickTitle, { color: '#fff' }]}>Contacter{'\n'}support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, styles.quickCardGold]} onPress={handleRateApp}>
            <Text style={styles.quickIcon}>⭐</Text>
            <Text style={[styles.quickTitle, { color: '#92400e' }]}>Noter{'\n'}l'app</Text>
          </TouchableOpacity>
        </View>

        {/* My Tickets */}
        {showMyTickets && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('help.myTickets')}</Text>
              <TouchableOpacity onPress={() => setShowMyTickets(false)}>
                <Text style={styles.closeLink}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            {ticketsLoading ? (
              <ActivityIndicator color="#7c3aed" style={{ marginVertical: 20 }} />
            ) : (myTickets as any[]).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t('help.noTickets')}</Text>
                <TouchableOpacity style={styles.createTicketBtn} onPress={() => setShowTicketModal(true)}>
                  <Text style={styles.createTicketBtnText}>{t('help.createTicket')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              (myTickets as any[]).map((ticket) => (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={styles.ticketHeaderRow}>
                    <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                        {getStatusLabel(ticket.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <Text style={styles.ticketDate}>
                    {new Date(ticket.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Rechercher dans la FAQ..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('help.faq')}</Text>
          {filteredFaq.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucun résultat pour "{searchQuery}"</Text>
            </View>
          ) : (
            filteredFaq.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.faqCard}
                onPress={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeaderRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                  <Text style={styles.expandIcon}>{expandedFaq === item.id ? '−' : '+'}</Text>
                </View>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                {expandedFaq === item.id && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Rate Banner */}
        <View style={styles.rateBanner}>
          <Text style={styles.rateBannerTitle}>⭐ Vous aimez FRI2PLAN ?</Text>
          <Text style={styles.rateBannerText}>
            Votre avis sur le Google Play Store nous aide énormément à nous améliorer et à atteindre d'autres familles !
          </Text>
          <TouchableOpacity style={styles.rateButton} onPress={handleRateApp}>
            <Text style={styles.rateButtonText}>{t('help.rateApp')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Ticket Modal */}
      <Modal visible={showTicketModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('help.contactSupport')}</Text>
              <TouchableOpacity onPress={() => { setShowTicketModal(false); resetTicketForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>{t('help.category')}</Text>
              <View style={styles.categoryButtons}>
                {TICKET_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.catBtn, ticketForm.category === cat.value && styles.catBtnActive]}
                    onPress={() => setTicketForm({ ...ticketForm, category: cat.value as any })}
                  >
                    <Text style={[styles.catBtnText, ticketForm.category === cat.value && styles.catBtnTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Sujet *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Problème de connexion..."
                value={ticketForm.subject}
                onChangeText={(v) => setTicketForm({ ...ticketForm, subject: v })}
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Décrivez votre problème en détail..."
                value={ticketForm.message}
                onChangeText={(v) => setTicketForm({ ...ticketForm, message: v })}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.fieldHint}>
                📧 Vous recevrez une confirmation par email et serez notifié des réponses.
              </Text>
              <TouchableOpacity
                style={[styles.submitBtn, createTicketMutation.isPending && styles.submitBtnDisabled]}
                onPress={handleCreateTicket}
                disabled={createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{t('help.sendTicket')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getStyles(isDark: boolean) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' },
  pageTitleContainer: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', textAlign: 'center' },
  content: { flex: 1 },
  quickActionsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  quickCardPurple: { backgroundColor: '#7c3aed' },
  quickCardGold: { backgroundColor: '#fef3c7' },
  quickIcon: { fontSize: 22, marginBottom: 5 },
  quickTitle: { fontSize: 11, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151', textAlign: 'center', lineHeight: 15 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 12 },
  closeLink: { fontSize: 14, color: '#7c3aed', fontWeight: '600' },
  emptyCard: { backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: 12, padding: 24, alignItems: 'center', elevation: 2 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginBottom: 12 },
  createTicketBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  createTicketBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  ticketCard: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  ticketHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketNumber: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  ticketSubject: { fontSize: 15, fontWeight: '600', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 4 },
  ticketDate: { fontSize: 12, color: '#9ca3af' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    color: isDark ? '#f9fafb' : '#1f2937',
  },
  categoryScroll: { marginBottom: 12 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  categoryChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' },
  categoryChipTextActive: { color: '#fff' },
  faqCard: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  faqHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { backgroundColor: isDark ? '#374151' : '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryBadgeText: { fontSize: 12, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' },
  expandIcon: { fontSize: 22, fontWeight: 'bold', color: '#7c3aed' },
  faqQuestion: { fontSize: 15, fontWeight: '600', color: isDark ? '#f9fafb' : '#1f2937' },
  faqAnswer: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    lineHeight: 21,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  rateBanner: { margin: 16, backgroundColor: '#fef3c7', borderRadius: 16, padding: 20 },
  rateBannerTitle: { fontSize: 17, fontWeight: 'bold', color: '#92400e', marginBottom: 8 },
  rateBannerText: { fontSize: 14, color: '#78350f', lineHeight: 20, marginBottom: 16 },
  rateButton: { backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rateButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937' },
  modalClose: { fontSize: 20, color: isDark ? '#9ca3af' : '#6b7280', fontWeight: 'bold' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151', marginBottom: 8, marginTop: 12 },
  fieldHint: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 12, marginBottom: 8, lineHeight: 18 },
  input: {
    backgroundColor: isDark ? '#111827' : '#f9fafb',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    color: isDark ? '#f9fafb' : '#1f2937',
  },
  inputMultiline: { minHeight: 120 },
  categoryButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  catBtnActive: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
  catBtnText: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', fontWeight: '500' },
  catBtnTextActive: { color: '#7c3aed', fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
}); }
