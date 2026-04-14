import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import DiscussionGroupsTab from '../components/DiscussionGroupsTab';
import { StatusBar } from 'expo-status-bar';
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { trpc } from '../lib/trpc';
import { formatDistanceToNow } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';
import EmojiPicker from 'rn-emoji-keyboard';

interface MessagesScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function MessagesScreen({ onNavigate, onPrevious, onNext }: MessagesScreenProps) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const styles = getStyles(isDark);

  const [activeTab, setActiveTab] = useState<'general' | 'groups'>('general');
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [reactingToMessageId, setReactingToMessageId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const getLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'de': return de;
      default: return enUS;
    }
  };

  // Corriger le fuseau horaire : le backend stocke en UTC sans 'Z'
  const parseUTCDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(normalized);
  };

  // Récupérer la famille active
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const { data: families = [] } = trpc.family.list.useQuery();
  const activeFamilyId = ctxFamilyId ?? (families as any[])[0]?.id ?? 1;

  // Fetch messages — endpoint enrichi qui retourne { messages, hasMore }
  const { data: messagesData, isLoading, refetch } = trpc.messages.list.useQuery(
    { familyId: activeFamilyId, limit: 50, offset: 0 },
    { enabled: !!activeFamilyId }
  );

  const messages: any[] = (messagesData as any)?.messages || [];

  // Marquer comme lus
  const markAsRead = trpc.messages.markAsRead.useMutation();

  // Réactions
  const addReaction = trpc.messages.addReaction.useMutation({
    onSuccess: () => refetch()});

  // Mutation pour envoyer un message (endpoint create)
  const sendMutation = trpc.messages.create.useMutation({
    onSuccess: () => {
      setNewMessage('');
      refetch();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    },
    onError: () => {
      Alert.alert(t('common.error'), t('messages.sendError'));
    }});

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSendMessage = () => {
    const content = newMessage.trim();
    if (!content || sendMutation.isPending) return;
    sendMutation.mutate({ content });
  };

  const handleEmojiSelected = (emoji: any) => {
    if (reactingToMessageId) {
      addReaction.mutate({ messageId: reactingToMessageId, emoji: emoji.emoji });
      setReactingToMessageId(null);
    } else {
      setNewMessage(prev => prev + emoji.emoji);
    }
    setIsEmojiPickerOpen(false);
  };

  const getSenderName = (msg: any): string => {
    if (msg.userName) return msg.userName;
    if (msg.userId === user?.id || msg.senderId === user?.id) return t('messages.you');
    return `#${msg.userId || msg.senderId || '?'}`;
  };

  const isOwnMessage = (msg: any): boolean => {
    return msg.userId === user?.id || msg.senderId === user?.id;
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const renderMessage = ({ item: message }: { item: any }) => {
    const own = isOwnMessage(message);
    const senderName = getSenderName(message);
    const reactions = message.reactions || {};

    return (
      <View style={[styles.messageBubbleWrapper, own ? styles.ownWrapper : styles.otherWrapper]}>
        {/* Avatar (autres seulement) */}
        {!own && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(senderName)}</Text>
          </View>
        )}

        <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}>
          {/* Nom de l'expéditeur (autres seulement) */}
          {!own && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}

          {/* Contenu texte */}
          <Text style={[styles.bubbleText, own && styles.ownBubbleText]}>{message.content}</Text>

          {/* Pièce jointe image */}
          {message.attachmentUrl && message.attachmentType?.startsWith('image') && (
            <Image
              source={{ uri: message.attachmentUrl }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
          )}

          {/* Timestamp */}
          <Text style={[styles.bubbleTime, own && styles.ownBubbleTime]}>
            {formatDistanceToNow(parseUTCDate(message.createdAt), { addSuffix: true, locale: getLocale() })}
          </Text>

          {/* Réactions existantes */}
          {Object.keys(reactions).length > 0 && (
            <View style={styles.reactionsRow}>
              {Object.entries(reactions).map(([emoji, users]: [string, any]) => (
                <View key={emoji} style={styles.reactionBadge}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={styles.reactionCount}>{(users as any[]).length}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bouton Réagir */}
          <TouchableOpacity
            style={styles.reactButton}
            onPress={() => {
              setReactingToMessageId(message.id);
              setIsEmojiPickerOpen(true);
            }}
          >
            <Text style={styles.reactButtonText}>😊 {t('messages.react')}</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar (soi-même à droite) */}
        {own && (
          <View style={[styles.avatar, styles.ownAvatar]}>
            <Text style={styles.avatarText}>{getInitials(user?.name || 'M')}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>💬 {t('messages.title')}</Text>
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'general' && styles.activeTab]}
          onPress={() => setActiveTab('general')}
        >
          <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>
            💬 {t('messages.general')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            👥 {t('messages.groups')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      {activeTab === 'general' ? (
        <KeyboardAvoidingView
          style={styles.contentContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={90}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 72, marginBottom: 16 }}>💬</Text>
                  <Text style={styles.emptyText}>{t('messages.noMessages')}</Text>
                  <Text style={styles.emptySubtext}>{t('messages.sendFirst')}</Text>
                </View>
              }
            />
          )}

          {/* Zone de saisie */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={() => {
                setReactingToMessageId(null);
                setIsEmojiPickerOpen(true);
              }}
            >
              <Text style={styles.emojiButtonText}>😊</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={t('messages.typeMessage')}
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              multiline
              maxLength={500}
              onSubmitEditing={handleSendMessage}
            />

            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <DiscussionGroupsTab activeFamilyId={activeFamilyId} />
      )}

      {/* Emoji Picker */}
      <EmojiPicker
        onEmojiSelected={handleEmojiSelected}
        open={isEmojiPickerOpen}
        onClose={() => {
          setIsEmojiPickerOpen(false);
          setReactingToMessageId(null);
        }}
        enableSearchBar
        enableRecentlyUsed
      />
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#111827' : '#f9fafb'},
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    backgroundColor: isDark ? '#111827' : '#fff'},
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
    textAlign: 'center'},
  tabsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: isDark ? '#111827' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb'},
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    alignItems: 'center'},
  activeTab: {
    backgroundColor: '#7c3aed'},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#4b5563'},
  activeTabText: {
    color: '#fff'},
  contentContainer: {
    flex: 1},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'},
  listContent: {
    padding: 12,
    paddingBottom: 8},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60},
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#1f2937',
    marginBottom: 8},
  emptySubtext: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280'},
  // Bulles de messages
  messageBubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    width: '100%'},
  ownWrapper: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start'},
  otherWrapper: {
    justifyContent: 'flex-start'},
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    flexShrink: 0},
  ownAvatar: {
    backgroundColor: '#5b21b6'},
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'},
  bubble: {
    borderRadius: 16,
    padding: 10,
    maxWidth: '75%',
    flexShrink: 1},
  otherBubble: {
    backgroundColor: isDark ? '#374151' : '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb'},
  ownBubble: {
    backgroundColor: '#7c3aed',
    borderTopRightRadius: 4},
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
    marginBottom: 4},
  bubbleText: {
    fontSize: 15,
    color: isDark ? '#e5e7eb' : '#111827',
    lineHeight: 21},
  ownBubbleText: {
    color: '#fff'},
  bubbleTime: {
    fontSize: 11,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 4,
    alignSelf: 'flex-end'},
  ownBubbleTime: {
    color: 'rgba(255,255,255,0.7)'},
  attachmentImage: {
    width: 200,
    height: 140,
    borderRadius: 8,
    marginTop: 6},
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6},
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#4b5563' : '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2},
  reactionEmoji: {
    fontSize: 14},
  reactionCount: {
    fontSize: 12,
    color: isDark ? '#d1d5db' : '#374151',
    fontWeight: '600'},
  reactButton: {
    marginTop: 6,
    alignSelf: 'flex-start'},
  reactButtonText: {
    fontSize: 12,
    color: isDark ? 'rgba(255,255,255,0.6)' : '#7c3aed',
    fontWeight: '500'},
  // Zone de saisie
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: isDark ? '#111827' : '#fff',
    borderTopWidth: 1,
    borderTopColor: isDark ? '#374151' : '#e5e7eb',
    gap: 8},
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 20},
  emojiButtonText: {
    fontSize: 22},
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: isDark ? '#fff' : '#111827',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#374151' : 'transparent'},
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'},
  sendButtonDisabled: {
    backgroundColor: isDark ? '#4b5563' : '#d1d5db'},
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'}});
