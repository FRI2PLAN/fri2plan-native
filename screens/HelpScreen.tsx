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
import { useTranslation } from 'react-i18next';

interface HelpScreenProps {
  onNavigate?: (pageIndex: number) => void;
}

const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=space.manus.fri2plan.twa';

type TicketCategory = 'technique' | 'facturation' | 'fonctionnalite' | 'test_ferme' | 'autre';

export default function HelpScreen({
  onNavigate,
}: HelpScreenProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const auth = useAuth() as any;
  const { resetOnboarding } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('catAll');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showMyTickets, setShowMyTickets] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: 'technique' as TicketCategory,
    subject: '',
    message: '',
  });

  // Catégories de filtre (clés i18n)
  const CATEGORY_KEYS = ['catAll', 'catStart', 'catCalendar', 'catBudget', 'catRewards', 'catAccount', 'catSubscription'];

  // Catégories de ticket (clés i18n)
  const TICKET_CATEGORIES: { value: TicketCategory; key: string }[] = [
    { value: 'technique', key: 'catTechnical' },
    { value: 'facturation', key: 'catBilling' },
    { value: 'fonctionnalite', key: 'catSuggestion' },
    { value: 'test_ferme', key: 'catClosedTest' },
    { value: 'autre', key: 'catOther' },
  ];

  // FAQ items depuis les traductions
  const faqItems: Array<{ id: number; category: string; question: string; answer: string }> =
    t('help.faqItems', { returnObjects: true }) as any;

  const { data: myTickets = [], isLoading: ticketsLoading, refetch: refetchTickets } =
    trpc.supportTickets.listMyTickets.useQuery(undefined, { enabled: showMyTickets });

  const createTicketMutation = trpc.supportTickets.createTicket.useMutation({
    onSuccess: (data: any) => {
      Alert.alert(
        t('help.ticketCreatedTitle'),
        t('help.ticketCreatedMsg', { number: data.ticketNumber }),
        [{ text: 'OK', onPress: () => { setShowTicketModal(false); resetTicketForm(); refetchTickets(); } }]
      );
    },
    onError: (err: any) => {
      Alert.alert(t('common.error'), err.message || t('help.ticketError'));
    },
  });

  const resetTicketForm = () => setTicketForm({ category: 'technique', subject: '', message: '' });

  const handleCreateTicket = () => {
    if (!ticketForm.subject.trim()) {
      Alert.alert(t('help.fieldRequired'), t('help.subjectRequired'));
      return;
    }
    if (!ticketForm.message.trim()) {
      Alert.alert(t('help.fieldRequired'), t('help.messageRequired'));
      return;
    }
    createTicketMutation.mutate(ticketForm);
  };

  const handleRateApp = async () => {
    const marketUrl = 'market://details?id=space.manus.fri2plan.twa';
    try {
      const canOpenMarket = await Linking.canOpenURL(marketUrl);
      if (canOpenMarket) {
        await Linking.openURL(marketUrl);
      } else {
        await Linking.openURL(GOOGLE_PLAY_URL);
      }
    } catch {
      Linking.openURL(GOOGLE_PLAY_URL).catch(() =>
        Alert.alert(t('common.error'), t('help.openStoreError'))
      );
    }
  };

  const handleRestartOnboarding = () => {
    Alert.alert(
      t('help.restartGuideTitle'),
      t('help.restartGuideMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('help.restartGuideConfirm'),
          onPress: async () => {
            await resetOnboarding();
          },
        },
      ]
    );
  };

  const filteredFaq = Array.isArray(faqItems) ? faqItems.filter((item) => {
    const matchCat = selectedCategory === 'catAll' || item.category === selectedCategory;
    const matchSearch = !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  }) : [];

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
      case 'nouveau': return t('help.statusNew');
      case 'en_cours': return t('help.statusInProgress');
      case 'resolu': return t('help.statusResolved');
      case 'ferme': return t('help.statusClosed');
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const locale = i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-GB' : 'fr-FR';
    return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
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
            <Text style={styles.quickTitle}>{t('help.guideTitle')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => setShowMyTickets(!showMyTickets)}>
            <Text style={styles.quickIcon}>🎫</Text>
            <Text style={styles.quickTitle}>{t('help.myTicketsShort')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, styles.quickCardPurple]} onPress={() => setShowTicketModal(true)}>
            <Text style={styles.quickIcon}>✉️</Text>
            <Text style={[styles.quickTitle, { color: '#fff' }]}>{t('help.contactSupportShort')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, styles.quickCardGold]} onPress={handleRateApp}>
            <Text style={styles.quickIcon}>⭐</Text>
            <Text style={[styles.quickTitle, { color: '#92400e' }]}>{t('help.rateAppShort')}</Text>
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
                  <Text style={styles.ticketDate}>{formatDate(ticket.createdAt)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('help.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORY_KEYS.map((catKey) => (
            <TouchableOpacity
              key={catKey}
              style={[styles.categoryChip, selectedCategory === catKey && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(catKey)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === catKey && styles.categoryChipTextActive]}>
                {t(`help.${catKey}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('help.faq')}</Text>
          {filteredFaq.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('help.noResults')} "{searchQuery}"</Text>
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
                    <Text style={styles.categoryBadgeText}>{t(`help.${item.category}`)}</Text>
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
          <Text style={styles.rateBannerTitle}>{t('help.rateBannerTitle')}</Text>
          <Text style={styles.rateBannerText}>{t('help.rateBannerText')}</Text>
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
                    onPress={() => setTicketForm({ ...ticketForm, category: cat.value })}
                  >
                    <Text style={[styles.catBtnText, ticketForm.category === cat.value && styles.catBtnTextActive]}>
                      {t(`help.${cat.key}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>{t('help.subjectLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('help.subjectPlaceholder')}
                value={ticketForm.subject}
                onChangeText={(v) => setTicketForm({ ...ticketForm, subject: v })}
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.fieldLabel}>{t('help.descriptionLabel')}</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder={t('help.descriptionPlaceholder')}
                value={ticketForm.message}
                onChangeText={(v) => setTicketForm({ ...ticketForm, message: v })}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.fieldHint}>{t('help.emailHint')}</Text>
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
