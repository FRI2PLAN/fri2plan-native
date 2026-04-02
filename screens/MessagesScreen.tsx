import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, TextInput, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
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
  
  // États
  const [activeTab, setActiveTab] = useState<'general' | 'groups'>('general');
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [reactingToMessageId, setReactingToMessageId] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Récupérer la locale date-fns selon la langue
  const getLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'de': return de;
      case 'en': return enUS;
      default: return fr;
    }
  };
  
  // Récupérer l'ID de la famille active (à adapter selon votre contexte)
  const { data: families = [] } = trpc.family.list.useQuery();
  const activeFamilyId = families[0]?.id || 0;
  
  // Fetch messages - utiliser l'ancien endpoint simple pour l'instant
  const { data: messagesSimple, isLoading, refetch } = trpc.messages.list.useQuery();
  
  // Adapter le format des messages simples
  const messages = messagesSimple || [];
  
  // Mutation pour envoyer un message
  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setNewMessage('');
      refetch();
      // Scroll vers le bas après envoi
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (error) => {
      Alert.alert(t('common.error'), t('messages.sendError'));
    }
  });
  
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMutation.mutate({ content: newMessage.trim() });
    }
  };
  
  const handleEmojiSelected = (emoji: any) => {
    if (reactingToMessageId) {
      // Mode réaction : pour l'instant, juste fermer le picker (backend pas prêt)
      setReactingToMessageId(null);
    } else {
      // Mode saisie : ajouter l'emoji au message
      setNewMessage(prev => prev + emoji.emoji);
    }
    setIsEmojiPickerOpen(false);
  };
  
  const renderMessage = (message: any) => {
    const isOwnMessage = message.senderId === user?.id;
    
    return (
      <View key={message.id} style={[styles.messageCard, isOwnMessage && styles.ownMessageCard]}>
        {/* Avatar et nom */}
        <View style={styles.messageHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {isOwnMessage ? user?.name?.charAt(0).toUpperCase() : message.senderId?.toString().charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.messageHeaderInfo}>
            <Text style={styles.messageSender}>
              {isOwnMessage ? t('messages.you') : `${t('messages.user')} #${message.senderId}`}
            </Text>
            <Text style={styles.messageTime}>
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: getLocale() })}
            </Text>
          </View>
        </View>
        
        {/* Contenu */}
        <Text style={styles.messageContent}>{message.content}</Text>
        
        {/* Actions */}
        <View style={styles.messageActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setReactingToMessageId(message.id);
              setIsEmojiPickerOpen(true);
            }}
          >
            <Text style={styles.actionButtonText}>😊 {t('messages.react')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header avec titre */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{t('messages.title')}</Text>
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
      
      {/* Contenu selon l'onglet */}
      {activeTab === 'general' ? (
        <KeyboardAvoidingView
          style={styles.contentContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          {/* Liste des messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
            ) : messages.length > 0 ? (
              messages.map(renderMessage)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('messages.noMessages')}</Text>
                <Text style={styles.emptySubtext}>{t('messages.sendFirst')}</Text>
              </View>
            )}
          </ScrollView>
          
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
            />
            
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
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
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonText}>{t('messages.groupsComingSoon')}</Text>
          <Text style={styles.comingSoonSubtext}>{t('messages.groupsComingSoonDesc')}</Text>
        </View>
      )}
      
      {/* Emoji Picker */}
      <EmojiPicker
        onEmojiSelected={handleEmojiSelected}
        open={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        enableSearchBar
        enableRecentlyUsed
      />
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    backgroundColor: isDark ? '#111827' : '#fff',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: isDark ? '#111827' : '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#7c3aed',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#4b5563',
  },
  activeTabText: {
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
  },
  messageCard: {
    backgroundColor: isDark ? '#374151' : '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  ownMessageCard: {
    backgroundColor: isDark ? '#312e81' : '#ede9fe',
    borderColor: isDark ? '#4c1d95' : '#c4b5fd',
    alignSelf: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  messageHeaderInfo: {
    flex: 1,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#fff' : '#111827',
  },
  messageTime: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  messageContent: {
    fontSize: 15,
    color: isDark ? '#e5e7eb' : '#374151',
    lineHeight: 22,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#4b5563' : '#e5e7eb',
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: isDark ? '#111827' : '#fff',
    borderTopWidth: 1,
    borderTopColor: isDark ? '#374151' : '#e5e7eb',
    gap: 8,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 20,
  },
  emojiButtonText: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: isDark ? '#fff' : '#111827',
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: isDark ? '#4b5563' : '#d1d5db',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
  },
});
