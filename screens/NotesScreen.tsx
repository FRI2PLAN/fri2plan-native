import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, RefreshControl, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform, Switch, Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import { formatDistanceToNow, format } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface NotesScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

interface Attachment {
  url: string;
  fileName: string;
  fileType: string;
}

export default function NotesScreen({ onNavigate, onPrevious, onNext }: NotesScreenProps) {
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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrivacy, setFilterPrivacy] = useState<'all' | 'private' | 'public'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // États création
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newIsPrivate, setNewIsPrivate] = useState(false);
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);

  // États édition
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Données
  const { data: notes = [], isLoading, refetch } = trpc.notes.list.useQuery();

  // Mutations
  const createMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      refetch();
      setCreateDialogOpen(false);
      resetCreateForm();
      Alert.alert(t('common.success'), t('notes.created'));
    },
    onError: (err: any) => Alert.alert(t('common.error'), err.message || t('notes.createError')),
  });

  const updateMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditDialogOpen(false);
      setSelectedNote(null);
      Alert.alert(t('common.success'), t('notes.updated'));
    },
    onError: (err: any) => Alert.alert(t('common.error'), err.message || t('notes.updateError')),
  });

  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      refetch();
      setEditDialogOpen(false);
      setSelectedNote(null);
      Alert.alert(t('common.success'), t('notes.deleted'));
    },
    onError: (err: any) => Alert.alert(t('common.error'), err.message || t('notes.deleteError')),
  });

  const uploadFileMutation = trpc.notes.uploadFile.useMutation({
    onError: (err: any) => Alert.alert(t('common.error'), err.message || t('notes.uploadError')),
  });

  const resetCreateForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewIsPrivate(false);
    setNewAttachments([]);
  };

  const openEditDialog = (note: any) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content || '');
    setEditIsPrivate(note.isPrivate === 1 || note.isPrivate === true);
    try {
      setEditAttachments(note.attachments ? JSON.parse(note.attachments) : []);
    } catch {
      setEditAttachments([]);
    }
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    if (!newTitle.trim()) {
      Alert.alert(t('common.error'), t('notes.titleRequired'));
      return;
    }
    createMutation.mutate({
      title: newTitle.trim(),
      content: newContent.trim() || undefined,
      isPrivate: newIsPrivate,
      attachments: newAttachments.length > 0 ? JSON.stringify(newAttachments) : undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedNote || !editTitle.trim()) {
      Alert.alert(t('common.error'), t('notes.titleRequired'));
      return;
    }
    updateMutation.mutate({
      noteId: selectedNote.id,
      title: editTitle.trim(),
      content: editContent.trim() || undefined,
      isPrivate: editIsPrivate ? 1 : 0,
      attachments: editAttachments.length > 0 ? JSON.stringify(editAttachments) : undefined,
    });
  };

  const handleDelete = () => {
    if (!selectedNote) return;
    Alert.alert(
      t('notes.deleteConfirmTitle'),
      t('notes.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate({ noteId: selectedNote.id }) }
      ]
    );
  };

  const handleTogglePin = (note: any) => {
    const newPinned = note.isPinned ? 0 : 1;
    updateMutation.mutate({ noteId: note.id, isPinned: newPinned });
  };

  const handlePickImage = async (isEdit: boolean) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('notes.permissionRequired'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await uploadFileFromBase64(asset.base64 || '', asset.fileName || 'photo.jpg', 'image/jpeg', isEdit);
    }
  };

  const handlePickFile = async (isEdit: boolean) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        await uploadFileFromBase64(base64, asset.name, asset.mimeType || 'application/octet-stream', isEdit);
      }
    } catch (err) {
      Alert.alert(t('common.error'), t('notes.uploadError'));
    }
  };

  const uploadFileFromBase64 = async (base64: string, fileName: string, fileType: string, isEdit: boolean) => {
    if (!base64) return;
    setUploadingFile(true);
    try {
      const result = await uploadFileMutation.mutateAsync({ fileName, fileData: base64, fileType });
      if (isEdit) {
        setEditAttachments(prev => [...prev, result]);
      } else {
        setNewAttachments(prev => [...prev, result]);
      }
    } catch (err) {
      // error handled by mutation
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index: number, isEdit: boolean) => {
    if (isEdit) {
      setEditAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setNewAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filtrage
  const filteredNotes = (notes as any[]).filter((note: any) => {
    const matchSearch = !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPrivacy = filterPrivacy === 'all' ||
      (filterPrivacy === 'private' && (note.isPrivate === 1 || note.isPrivate === true)) ||
      (filterPrivacy === 'public' && (note.isPrivate === 0 || note.isPrivate === false));
    return matchSearch && matchPrivacy;
  });

  const pinnedNotes = filteredNotes.filter((n: any) => n.isPinned === 1 || n.isPinned === true);
  const unpinnedNotes = filteredNotes.filter((n: any) => !n.isPinned || n.isPinned === 0);

  const renderNoteCard = (note: any) => {
    const isPinned = note.isPinned === 1 || note.isPinned === true;
    const isPrivate = note.isPrivate === 1 || note.isPrivate === true;
    const isOwner = note.userId === user?.id;
    let attachments: Attachment[] = [];
    try { attachments = note.attachments ? JSON.parse(note.attachments) : []; } catch {}

    return (
      <TouchableOpacity
        key={note.id}
        style={[styles.noteCard, isPinned && styles.pinnedNoteCard]}
        onPress={() => openEditDialog(note)}
        onLongPress={() => handleTogglePin(note)}
      >
        <View style={styles.noteCardHeader}>
          <View style={styles.noteTitleRow}>
            {isPinned && <Text style={styles.pinIcon}>📌</Text>}
            <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
            {isPrivate && <Text style={styles.lockIcon}>🔒</Text>}
            {attachments.length > 0 && <Text style={styles.attachIcon}>📎</Text>}
          </View>
          {isOwner && (
            <TouchableOpacity onPress={() => handleTogglePin(note)} style={styles.pinButton}>
              <Text style={[styles.pinButtonText, isPinned && styles.pinButtonActive]}>
                {isPinned ? '📌' : '📍'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {note.content && (
          <Text style={styles.noteContent} numberOfLines={3}>{note.content}</Text>
        )}

        <View style={styles.noteFooter}>
          {note.authorName && note.userId !== user?.id && (
            <Text style={styles.noteAuthor}>👤 {note.authorName}</Text>
          )}
          <Text style={styles.noteDate}>
            {note.updatedAt
              ? format(new Date(note.updatedAt), 'd MMM yyyy HH:mm', { locale: getLocale() })
              : formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: getLocale() })
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAttachmentList = (attachments: Attachment[], isEdit: boolean) => (
    <View style={styles.attachmentList}>
      {attachments.map((att, idx) => (
        <View key={idx} style={styles.attachmentItem}>
          <TouchableOpacity onPress={() => Linking.openURL(att.url)} style={styles.attachmentName}>
            <Text style={styles.attachmentNameText} numberOfLines={1}>
              {att.fileType?.startsWith('image/') ? '🖼️' : '📄'} {att.fileName}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeAttachment(idx, isEdit)} style={styles.attachmentRemove}>
            <Text style={styles.attachmentRemoveText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{t('notes.title')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setCreateDialogOpen(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('notes.searchPlaceholder')}
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {(['all', 'public', 'private'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filterPrivacy === f && styles.filterChipActive]}
            onPress={() => setFilterPrivacy(f)}
          >
            <Text style={[styles.filterChipText, filterPrivacy === f && styles.filterChipTextActive]}>
              {f === 'all' ? `📋 ${t('notes.filterAll')}` : f === 'public' ? `🌐 ${t('notes.filterPublic')}` : `🔒 ${t('notes.filterPrivate')}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
        ) : filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('notes.empty')}</Text>
            <Text style={styles.emptySubtext}>{t('notes.emptySubtext')}</Text>
          </View>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>📌 {t('notes.pinned')}</Text>
                {pinnedNotes.map(renderNoteCard)}
              </>
            )}
            {unpinnedNotes.length > 0 && (
              <>
                {pinnedNotes.length > 0 && <Text style={styles.sectionHeader}>📝 {t('notes.others')}</Text>}
                {unpinnedNotes.map(renderNoteCard)}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal création */}
      <Modal visible={createDialogOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('notes.createTitle')}</Text>

              <Text style={styles.fieldLabel}>{t('notes.noteTitle')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('notes.titlePlaceholder')}
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.fieldLabel}>{t('notes.content')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('notes.contentPlaceholder')}
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={newContent}
                onChangeText={setNewContent}
                multiline
                numberOfLines={6}
              />

              <View style={styles.privacyRow}>
                <Text style={styles.fieldLabel}>{t('notes.private')}</Text>
                <Switch
                  value={newIsPrivate}
                  onValueChange={setNewIsPrivate}
                  trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                  thumbColor={newIsPrivate ? '#fff' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.privacyHint}>
                {newIsPrivate ? `🔒 ${t('notes.privateHint')}` : `🌐 ${t('notes.publicHint')}`}
              </Text>

              {/* Pièces jointes */}
              <Text style={styles.fieldLabel}>📎 {t('notes.attachments')}</Text>
              <View style={styles.attachButtons}>
                <TouchableOpacity style={styles.attachButton} onPress={() => handlePickImage(false)} disabled={uploadingFile}>
                  <Text style={styles.attachButtonText}>📷 {t('notes.addPhoto')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachButton} onPress={() => handlePickFile(false)} disabled={uploadingFile}>
                  <Text style={styles.attachButtonText}>📄 {t('notes.addFile')}</Text>
                </TouchableOpacity>
              </View>
              {uploadingFile && <ActivityIndicator size="small" color="#7c3aed" style={{ marginTop: 8 }} />}
              {newAttachments.length > 0 && renderAttachmentList(newAttachments, false)}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setCreateDialogOpen(false); resetCreateForm(); }}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t('common.create')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal édition */}
      <Modal visible={editDialogOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalContent}>
              <View style={styles.editHeader}>
                <Text style={styles.modalTitle}>{t('notes.editTitle')}</Text>
                <TouchableOpacity onPress={() => setEditDialogOpen(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>{t('notes.noteTitle')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('notes.titlePlaceholder')}
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Text style={styles.fieldLabel}>{t('notes.content')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('notes.contentPlaceholder')}
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                numberOfLines={6}
              />

              <View style={styles.privacyRow}>
                <Text style={styles.fieldLabel}>{t('notes.private')}</Text>
                <Switch
                  value={editIsPrivate}
                  onValueChange={setEditIsPrivate}
                  trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                  thumbColor={editIsPrivate ? '#fff' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.privacyHint}>
                {editIsPrivate ? `🔒 ${t('notes.privateHint')}` : `🌐 ${t('notes.publicHint')}`}
              </Text>

              {/* Pièces jointes */}
              <Text style={styles.fieldLabel}>📎 {t('notes.attachments')}</Text>
              <View style={styles.attachButtons}>
                <TouchableOpacity style={styles.attachButton} onPress={() => handlePickImage(true)} disabled={uploadingFile}>
                  <Text style={styles.attachButtonText}>📷 {t('notes.addPhoto')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachButton} onPress={() => handlePickFile(true)} disabled={uploadingFile}>
                  <Text style={styles.attachButtonText}>📄 {t('notes.addFile')}</Text>
                </TouchableOpacity>
              </View>
              {uploadingFile && <ActivityIndicator size="small" color="#7c3aed" style={{ marginTop: 8 }} />}
              {editAttachments.length > 0 && renderAttachmentList(editAttachments, true)}

              {/* Actions */}
              <View style={styles.editActions}>
                {selectedNote?.userId === user?.id && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>🗑️ {t('common.delete')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditDialogOpen(false)}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t('common.save')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: isDark ? '#fff' : '#111827',
  },
  clearSearch: {
    fontSize: 16,
    color: isDark ? '#9ca3af' : '#6b7280',
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    alignItems: 'center',
  },
  filterChipActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#7c3aed',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#9ca3af' : '#6b7280',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteCard: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    minHeight: 90,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  pinnedNoteCard: {
    borderColor: '#7c3aed',
    backgroundColor: isDark ? '#1e1b4b' : '#faf5ff',
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  pinIcon: {
    fontSize: 14,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
    flex: 1,
  },
  lockIcon: {
    fontSize: 13,
  },
  attachIcon: {
    fontSize: 13,
  },
  pinButton: {
    padding: 4,
    marginLeft: 8,
  },
  pinButtonText: {
    fontSize: 16,
    opacity: 0.5,
  },
  pinButtonActive: {
    opacity: 1,
  },
  noteContent: {
    fontSize: 13,
    color: isDark ? '#9ca3af' : '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteAuthor: {
    fontSize: 11,
    color: isDark ? '#6b7280' : '#9ca3af',
  },
  noteDate: {
    fontSize: 11,
    color: isDark ? '#6b7280' : '#9ca3af',
    marginLeft: 'auto',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: isDark ? '#fff' : '#111827',
    marginBottom: 16,
    flex: 1,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  privacyHint: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 4,
    marginBottom: 4,
  },
  attachButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  attachButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    backgroundColor: isDark ? '#374151' : '#f9fafb',
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: 13,
    color: isDark ? '#d1d5db' : '#374151',
    fontWeight: '600',
  },
  attachmentList: {
    marginTop: 8,
    gap: 6,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  attachmentName: {
    flex: 1,
  },
  attachmentNameText: {
    fontSize: 13,
    color: isDark ? '#93c5fd' : '#2563eb',
    textDecorationLine: 'underline',
  },
  attachmentRemove: {
    padding: 4,
    marginLeft: 8,
  },
  attachmentRemoveText: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  editActions: {
    marginTop: 16,
  },
  deleteButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteButtonText: {
    color: isDark ? '#fca5a5' : '#dc2626',
    fontSize: 15,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
});
