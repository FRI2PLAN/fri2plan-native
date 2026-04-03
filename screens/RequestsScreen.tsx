import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import { formatDistanceToNow, format } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

interface RequestsScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const REQUEST_TYPES = [
  { value: 'outing', labelKey: 'requests.typeOuting', emoji: '✈️', color: '#3b82f6' },
  { value: 'purchase', labelKey: 'requests.typePurchase', emoji: '🛍️', color: '#10b981' },
  { value: 'permission', labelKey: 'requests.typePermission', emoji: '🔒', color: '#8b5cf6' },
  { value: 'other', labelKey: 'requests.typeOther', emoji: '❓', color: '#6b7280' },
] as const;

const STATUS_CONFIG = {
  pending: { emoji: '⏳', color: '#d97706' },
  approved: { emoji: '✅', color: '#16a34a' },
  rejected: { emoji: '❌', color: '#dc2626' },
};

type RequestType = 'outing' | 'purchase' | 'permission' | 'other';
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function RequestsScreen({ onNavigate, onPrevious, onNext }: RequestsScreenProps) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const styles = getStyles(isDark);

  const getLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'de': return de;
      default: return enUS;
    }
  };

  // États filtres
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterType, setFilterType] = useState<'all' | RequestType>('all');

  // États création
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formType, setFormType] = useState<RequestType>('outing');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // États détail / commentaires
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  // Récupérer la famille
  const { data: families = [] } = trpc.family.list.useQuery();
  const activeFamilyId = (families as any[])[0]?.id || 0;

  const { data: members = [] } = trpc.family.members.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );

  const currentMember = (members as any[]).find((m: any) => m.id === user?.id);
  const isParent = currentMember?.familyRole === 'admin';

  // Requêtes
  const { data: requests = [], isLoading, refetch } = trpc.requests.list.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );

  // Commentaires
  const { data: comments = [], refetch: refetchComments } = trpc.requests.listComments.useQuery(
    { requestId: selectedRequest?.id || 0 },
    { enabled: !!selectedRequest?.id && detailDialogOpen }
  );

  // Comptes non lus
  const { data: unreadCounts = {} } = trpc.requests.getUnreadCommentsCounts.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );

  const markCommentsRead = trpc.requests.markCommentsRead.useMutation();

  // Mutations
  const createRequest = trpc.requests.create.useMutation({
    onSuccess: () => {
      refetch();
      setCreateDialogOpen(false);
      resetForm();
      Alert.alert(t('common.success'), t('requests.created'));
    },
    onError: (err: any) => Alert.alert(t('common.error'), err.message || t('requests.createError')),
  });

  const reviewRequest = trpc.requests.review.useMutation({
    onSuccess: () => {
      refetch();
      setDetailDialogOpen(false);
      setReviewComment('');
      Alert.alert(t('common.success'), t('requests.reviewed'));
    },
    onError: (err: any) => Alert.alert(t('common.error'), err.message || t('requests.reviewError')),
  });

  const deleteRequest = trpc.requests.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDetailDialogOpen(false);
      Alert.alert(t('common.success'), t('requests.deleted'));
    },
    onError: (err: any) => Alert.alert(t('common.error'), err.message || t('requests.deleteError')),
  });

  const addComment = trpc.requests.addComment.useMutation({
    onSuccess: () => {
      setNewComment('');
      refetchComments();
    },
    onError: (err: any) => Alert.alert(t('common.error'), err.message || t('requests.commentError')),
  });

  const resetForm = () => {
    setFormType('outing');
    setFormTitle('');
    setFormDescription('');
    setFormDate(undefined);
  };

  const handleCreate = () => {
    if (!formTitle.trim()) {
      Alert.alert(t('common.error'), t('requests.titleRequired'));
      return;
    }
    if ((formType === 'outing' || formType === 'permission') && !formDate) {
      Alert.alert(t('common.error'), t('requests.dateRequired'));
      return;
    }
    createRequest.mutate({
      type: formType,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      requestedDate: formDate,
    });
  };

  const handleReview = (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    reviewRequest.mutate({
      requestId: selectedRequest.id,
      status,
      reviewComment: reviewComment.trim() || undefined,
    });
  };

  const handleDelete = () => {
    if (!selectedRequest) return;
    Alert.alert(
      t('requests.deleteConfirmTitle'),
      t('requests.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteRequest.mutate({ requestId: selectedRequest.id }) }
      ]
    );
  };

  const handleOpenDetail = (request: any) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
    if ((unreadCounts as any)[request.id] > 0) {
      markCommentsRead.mutate({ requestId: request.id });
    }
  };

  const handleSendComment = () => {
    if (!newComment.trim() || !selectedRequest) return;
    addComment.mutate({ requestId: selectedRequest.id, message: newComment.trim() });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filtrage
  const filteredRequests = (requests as any[]).filter((r: any) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (r.status === 'pending' && r.targetAdminId != null) {
      if (r.targetAdminId !== user?.id && r.userId !== user?.id) return false;
    }
    return true;
  });

  const getTypeConfig = (type: string) => REQUEST_TYPES.find(t => t.value === type) || REQUEST_TYPES[3];
  const getStatusConfig = (status: string) => STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

  const renderRequestCard = (request: any) => {
    const typeConfig = getTypeConfig(request.type);
    const statusConfig = getStatusConfig(request.status);
    const unreadCount = (unreadCounts as any)[request.id] || 0;

    return (
      <TouchableOpacity
        key={request.id}
        style={styles.requestCard}
        onPress={() => handleOpenDetail(request)}
      >
        <View style={styles.requestCardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '22' }]}>
            <Text style={styles.typeEmoji}>{typeConfig.emoji}</Text>
            <Text style={[styles.typeLabel, { color: typeConfig.color }]}>{t(typeConfig.labelKey)}</Text>
          </View>
          <View style={styles.requestCardRight}>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
            <Text style={styles.statusEmoji}>{statusConfig.emoji}</Text>
          </View>
        </View>

        <Text style={styles.requestTitle}>{request.title}</Text>
        {request.description && (
          <Text style={styles.requestDescription} numberOfLines={2}>{request.description}</Text>
        )}

        <View style={styles.requestMeta}>
          <Text style={styles.requestAuthor}>👤 {request.requesterName || t('common.unknown')}</Text>
          {request.requestedDate && (
            <Text style={styles.requestDate}>
              📅 {format(new Date(request.requestedDate), 'dd/MM/yyyy HH:mm', { locale: getLocale() })}
            </Text>
          )}
        </View>

        <Text style={styles.requestTime}>
          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: getLocale() })}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{t('requests.title')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setCreateDialogOpen(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres de statut (icônes seules) + menu 3 points pour les types */}
      <View style={styles.filterRow}>
        <View style={styles.filterContainer}>
          {(['pending', 'approved', 'rejected'] as FilterStatus[]).map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, filterStatus === status && styles.filterTabActive]}
              onPress={() => setFilterStatus(status === filterStatus ? 'all' : status)}
            >
              <Text style={styles.filterTabEmoji}>
                {status === 'pending' ? '⏳' : status === 'approved' ? '✅' : '❌'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu 3 points pour les types */}
        <View style={styles.typeMenuWrapper}>
          <TouchableOpacity
            style={[styles.typeMenuButton, filterType !== 'all' && styles.typeMenuButtonActive]}
            onPress={() => setTypeMenuOpen(!typeMenuOpen)}
          >
            <Text style={styles.typeMenuDots}>⋮</Text>
            {filterType !== 'all' && (
              <Text style={styles.typeMenuActiveIndicator}>
                {REQUEST_TYPES.find(t => t.value === filterType)?.emoji}
              </Text>
            )}
          </TouchableOpacity>
          {typeMenuOpen && (
            <Pressable style={styles.typeMenuOverlay} onPress={() => setTypeMenuOpen(false)}>
              <View style={styles.typeMenuDropdown}>
                <TouchableOpacity
                  style={[styles.typeMenuItem, filterType === 'all' && styles.typeMenuItemActive]}
                  onPress={() => { setFilterType('all'); setTypeMenuOpen(false); }}
                >
                  <Text style={styles.typeMenuItemText}>📋 {t('requests.allTypes')}</Text>
                </TouchableOpacity>
                {REQUEST_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeMenuItem, filterType === type.value && styles.typeMenuItemActive]}
                    onPress={() => { setFilterType(type.value); setTypeMenuOpen(false); }}
                  >
                    <Text style={styles.typeMenuItemText}>{type.emoji} {t(type.labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Liste */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
        ) : filteredRequests.length > 0 ? (
          filteredRequests.map(renderRequestCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('requests.empty')}</Text>
            <Text style={styles.emptySubtext}>{t('requests.emptySubtext')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal création */}
      <Modal visible={createDialogOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('requests.createTitle')}</Text>

              {/* Type */}
              <Text style={styles.fieldLabel}>{t('requests.type')}</Text>
              <View style={styles.typeSelector}>
                {REQUEST_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeOption, formType === type.value && { backgroundColor: type.color + '33', borderColor: type.color }]}
                    onPress={() => setFormType(type.value)}
                  >
                    <Text style={styles.typeOptionEmoji}>{type.emoji}</Text>
                    <Text style={[styles.typeOptionText, formType === type.value && { color: type.color, fontWeight: '700' }]}>
                      {t(type.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Titre */}
              <Text style={styles.fieldLabel}>{t('requests.requestTitle')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('requests.titlePlaceholder')}
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>{t('requests.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('requests.descriptionPlaceholder')}
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={3}
              />

              {/* Date */}
              <Text style={styles.fieldLabel}>
                {t('requests.requestedDate')}
                {(formType === 'outing' || formType === 'permission') && <Text style={styles.required}> *</Text>}
              </Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>
                  📅 {formDate ? format(formDate, 'dd/MM/yyyy HH:mm', { locale: getLocale() }) : t('requests.selectDate')}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setFormDate(date);
                      setShowTimePicker(true);
                    }
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={formDate || new Date()}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    setShowTimePicker(false);
                    if (date) setFormDate(date);
                  }}
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setCreateDialogOpen(false); resetForm(); }}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={createRequest.isPending}>
                  {createRequest.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('common.create')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal détail */}
      <Modal visible={detailDialogOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.detailModalContent]}>
            {selectedRequest && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>{selectedRequest.title}</Text>
                  <TouchableOpacity onPress={() => setDetailDialogOpen(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                  {/* Infos */}
                  <View style={styles.detailInfo}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('requests.type')} :</Text>
                      <Text style={styles.detailValue}>
                        {getTypeConfig(selectedRequest.type).emoji} {t(getTypeConfig(selectedRequest.type).labelKey)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('requests.status')} :</Text>
                      <Text style={[styles.detailValue, { color: getStatusConfig(selectedRequest.status).color }]}>
                        {getStatusConfig(selectedRequest.status).emoji} {t(`requests.status${selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}`)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('requests.author')} :</Text>
                      <Text style={styles.detailValue}>{selectedRequest.requesterName}</Text>
                    </View>
                    {selectedRequest.requestedDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('requests.requestedDate')} :</Text>
                        <Text style={styles.detailValue}>
                          {format(new Date(selectedRequest.requestedDate), 'dd/MM/yyyy HH:mm', { locale: getLocale() })}
                        </Text>
                      </View>
                    )}
                    {selectedRequest.description && (
                      <View style={styles.detailDescriptionContainer}>
                        <Text style={styles.detailLabel}>{t('requests.description')} :</Text>
                        <Text style={styles.detailDescription}>{selectedRequest.description}</Text>
                      </View>
                    )}
                    {selectedRequest.reviewComment && (
                      <View style={styles.reviewCommentContainer}>
                        <Text style={styles.reviewCommentLabel}>{t('requests.reviewComment')} :</Text>
                        <Text style={styles.reviewCommentText}>{selectedRequest.reviewComment}</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions admin */}
                  {isParent && selectedRequest.status === 'pending' && (
                    <View style={styles.reviewSection}>
                      <Text style={styles.sectionTitle}>{t('requests.reviewSection')}</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder={t('requests.reviewCommentPlaceholder')}
                        placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                        value={reviewComment}
                        onChangeText={setReviewComment}
                        multiline
                        numberOfLines={2}
                      />
                      <View style={styles.reviewActions}>
                        <TouchableOpacity
                          style={[styles.reviewButton, styles.approveButton]}
                          onPress={() => handleReview('approved')}
                          disabled={reviewRequest.isPending}
                        >
                          <Text style={styles.reviewButtonText}>✅ {t('requests.approve')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.reviewButton, styles.rejectButton]}
                          onPress={() => handleReview('rejected')}
                          disabled={reviewRequest.isPending}
                        >
                          <Text style={styles.reviewButtonText}>❌ {t('requests.reject')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Commentaires */}
                  <View style={styles.commentsSection}>
                    <Text style={styles.sectionTitle}>💬 {t('requests.comments')} ({(comments as any[]).length})</Text>
                    {(comments as any[]).map((comment: any) => (
                      <View key={comment.id} style={[
                        styles.commentCard,
                        comment.userId === user?.id && styles.ownCommentCard
                      ]}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{comment.userName || t('common.unknown')}</Text>
                          <Text style={styles.commentTime}>
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: getLocale() })}
                          </Text>
                        </View>
                        <Text style={styles.commentMessage}>{comment.message}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                {/* Zone de commentaire */}
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder={t('requests.addComment')}
                    placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.sendCommentButton, !newComment.trim() && styles.sendCommentButtonDisabled]}
                    onPress={handleSendComment}
                    disabled={!newComment.trim() || addComment.isPending}
                  >
                    <Text style={styles.sendCommentButtonText}>➤</Text>
                  </TouchableOpacity>
                </View>

                {/* Supprimer (créateur uniquement) */}
                {selectedRequest.userId === user?.id && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>🗑️ {t('requests.delete')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#111827' : '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: isDark ? '#fff' : '#111827',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  filterTab: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  filterTabActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#7c3aed',
  },
  filterTabEmoji: {
    fontSize: 20,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#374151',
    textAlign: 'center',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  typeMenuWrapper: {
    position: 'relative',
  },
  typeMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  typeMenuButtonActive: {
    borderColor: '#7c3aed',
    backgroundColor: isDark ? '#1e1b4b' : '#ede9fe',
  },
  typeMenuDots: {
    fontSize: 22,
    fontWeight: '700',
    color: isDark ? '#d1d5db' : '#374151',
    lineHeight: 26,
  },
  typeMenuActiveIndicator: {
    fontSize: 14,
  },
  typeMenuOverlay: {
    position: 'absolute',
    top: 50,
    right: 0,
    zIndex: 999,
  },
  typeMenuDropdown: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    padding: 6,
    minWidth: 160,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  typeMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  typeMenuItemActive: {
    backgroundColor: isDark ? '#312e81' : '#ede9fe',
  },
  typeMenuItemText: {
    fontSize: 14,
    color: isDark ? '#e5e7eb' : '#111827',
    fontWeight: '500',
  },
  typeFilterRow: {
    marginBottom: 8,
  },
  typeFilterContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  typeFilterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#1f2937' : '#fff',
  },
  typeFilterChipActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#7c3aed',
  },
  typeFilterChipText: {
    fontSize: 13,
    color: isDark ? '#d1d5db' : '#374151',
  },
  typeFilterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  requestCard: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeEmoji: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  requestCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  statusEmoji: {
    fontSize: 18,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginBottom: 8,
  },
  requestMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  requestAuthor: {
    fontSize: 13,
    color: isDark ? '#d1d5db' : '#374151',
  },
  requestDate: {
    fontSize: 13,
    color: isDark ? '#d1d5db' : '#374151',
  },
  requestTime: {
    fontSize: 12,
    color: isDark ? '#6b7280' : '#9ca3af',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#1f2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  detailModalContent: {
    maxHeight: '95%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: isDark ? '#fff' : '#111827',
    marginBottom: 16,
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  closeButton: {
    fontSize: 22,
    color: isDark ? '#9ca3af' : '#6b7280',
    padding: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  required: {
    color: '#ef4444',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#374151' : '#f9fafb',
    gap: 6,
  },
  typeOptionEmoji: {
    fontSize: 16,
  },
  typeOptionText: {
    fontSize: 13,
    color: isDark ? '#d1d5db' : '#374151',
  },
  input: {
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: isDark ? '#fff' : '#111827',
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
  },
  dateButtonText: {
    fontSize: 15,
    color: isDark ? '#d1d5db' : '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#fff' : '#374151',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  detailScroll: {
    maxHeight: 400,
  },
  detailInfo: {
    backgroundColor: isDark ? '#374151' : '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#6b7280',
    minWidth: 90,
  },
  detailValue: {
    fontSize: 14,
    color: isDark ? '#fff' : '#111827',
    flex: 1,
  },
  detailDescriptionContainer: {
    gap: 4,
  },
  detailDescription: {
    fontSize: 14,
    color: isDark ? '#e5e7eb' : '#374151',
    lineHeight: 20,
  },
  reviewCommentContainer: {
    backgroundColor: isDark ? '#4b5563' : '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  reviewCommentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#fbbf24' : '#92400e',
    marginBottom: 4,
  },
  reviewCommentText: {
    fontSize: 14,
    color: isDark ? '#fde68a' : '#78350f',
  },
  reviewSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
    marginBottom: 10,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  commentsSection: {
    marginBottom: 12,
  },
  commentCard: {
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  ownCommentCard: {
    backgroundColor: isDark ? '#312e81' : '#ede9fe',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#c4b5fd' : '#7c3aed',
  },
  commentTime: {
    fontSize: 11,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  commentMessage: {
    fontSize: 14,
    color: isDark ? '#e5e7eb' : '#374151',
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#374151' : '#e5e7eb',
  },
  commentInput: {
    flex: 1,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: isDark ? '#fff' : '#111827',
    maxHeight: 80,
  },
  sendCommentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCommentButtonDisabled: {
    backgroundColor: isDark ? '#4b5563' : '#d1d5db',
  },
  sendCommentButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: isDark ? '#fca5a5' : '#dc2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
