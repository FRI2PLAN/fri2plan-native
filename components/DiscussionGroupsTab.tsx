import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, Modal, FlatList, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import { formatDistanceToNow } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';
import EmojiPicker from 'rn-emoji-keyboard';

interface DiscussionGroupsTabProps {
  activeFamilyId: number;
}

export default function DiscussionGroupsTab({ activeFamilyId }: DiscussionGroupsTabProps) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const styles = getStyles(isDark);
  
  // États
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [reactingToMessageId, setReactingToMessageId] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
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

  // Corriger le fuseau horaire : le backend stocke en UTC sans 'Z'
  const parseUTCDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Ajouter 'Z' si pas déjà présent pour forcer l'interprétation UTC
    const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(normalized);
  };
  
  // Récupérer les membres de la famille
  const { data: familyMembers = [] } = trpc.family.members.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );
  
  // Récupérer les groupes
  const { data: groups = [], refetch: refetchGroups } = trpc.discussionGroups.list.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId }
  );
  
  // Récupérer le nombre de messages non lus par groupe
  const { data: unreadPerGroup = {} } = trpc.discussionGroups.unreadCountPerGroup.useQuery(
    { familyId: activeFamilyId },
    { enabled: !!activeFamilyId, refetchInterval: 30000 }
  );
  
  // Récupérer les messages du groupe sélectionné
  const { data: messages = [], refetch: refetchMessages } = trpc.discussionGroups.messages.useQuery(
    { groupId: selectedGroup || 0 },
    { enabled: !!selectedGroup }
  );
  
  // Récupérer les membres du groupe sélectionné
  const { data: groupMembers = [], refetch: refetchGroupMembers } = trpc.discussionGroups.getMembers.useQuery(
    { groupId: selectedGroup || 0 },
    { enabled: !!selectedGroup && membersDialogOpen }
  );
  
  // Mutations
  const createGroup = trpc.discussionGroups.create.useMutation({
    onSuccess: () => {
      setCreateDialogOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedMembers([]);
      refetchGroups();
      Alert.alert(t('common.success'), t('messages.groupCreated'));
    },
    onError: () => {
      Alert.alert(t('common.error'), t('messages.groupCreateError'));
    }
  });
  
  const sendMessage = trpc.discussionGroups.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage('');
      refetchMessages();
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: () => {
      Alert.alert(t('common.error'), t('messages.sendError'));
    }
  });
  
  const addReaction = trpc.discussionGroups.addReaction.useMutation({
    onSuccess: () => {
      refetchMessages();
      setReactingToMessageId(null);
    },
    onError: () => {
      Alert.alert(t('common.error'), t('messages.reactionError'));
    }
  });
  
  const deleteGroup = trpc.discussionGroups.delete.useMutation({
    onSuccess: () => {
      setSelectedGroup(null);
      refetchGroups();
      Alert.alert(t('common.success'), t('messages.groupDeleted'));
    },
    onError: () => {
      Alert.alert(t('common.error'), t('messages.groupDeleteError'));
    }
  });
  
  const leaveGroup = trpc.discussionGroups.leaveGroup.useMutation({
    onSuccess: () => {
      setSelectedGroup(null);
      refetchGroups();
      Alert.alert(t('common.success'), t('messages.groupLeft'));
    },
    onError: () => {
      Alert.alert(t('common.error'), t('messages.groupLeaveError'));
    }
  });
  
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      Alert.alert(t('common.error'), t('messages.groupNameRequired'));
      return;
    }
    createGroup.mutate({
      name: newGroupName.trim(),
      description: newGroupDescription.trim(),
      familyId: activeFamilyId,
      memberIds: selectedMembers
    });
  };
  
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedGroup) return;
    sendMessage.mutate({
      groupId: selectedGroup,
      message: newMessage.trim()
    });
  };
  
  const handleEmojiSelected = (emoji: any) => {
    if (reactingToMessageId) {
      addReaction.mutate({ messageId: reactingToMessageId, emoji: emoji.emoji });
    } else {
      setNewMessage(prev => prev + emoji.emoji);
    }
    setIsEmojiPickerOpen(false);
  };
  
  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    Alert.alert(
      t('messages.deleteGroupConfirmTitle'),
      t('messages.deleteGroupConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteGroup.mutate({ groupId: selectedGroup }) }
      ]
    );
  };
  
  const handleLeaveGroup = () => {
    if (!selectedGroup) return;
    Alert.alert(
      t('messages.leaveGroupConfirmTitle'),
      t('messages.leaveGroupConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('messages.leave'), style: 'destructive', onPress: () => leaveGroup.mutate({ groupId: selectedGroup }) }
      ]
    );
  };
  
  const toggleMemberSelection = (memberId: number) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };
  
  const renderMessage = (message: any) => {
    const isOwnMessage = message.userId === user?.id;
    
    return (
      <View key={message.id} style={[styles.messageRow, isOwnMessage ? styles.messageRowOwn : styles.messageRowOther]}>
        {/* Bulle avec avatar intégré (style Général) */}
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          {/* En-tête : avatar + nom (seulement pour les autres) */}
          {!isOwnMessage && (
            <View style={styles.messageHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {message.userName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.messageSender}>
                {message.userName || t('messages.unknownUser')}
              </Text>
            </View>
          )}
          {/* En-tête pour mes messages : avatar + nom à droite */}
          {isOwnMessage && (
            <View style={[styles.messageHeader, { justifyContent: 'flex-end' }]}>
              <View style={[styles.avatar, styles.ownAvatar]}>
                <Text style={styles.avatarText}>
                  {message.userName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            </View>
          )}

          {/* Contenu */}
          <Text style={[styles.messageContent, isOwnMessage && styles.ownMessageContent]}>
            {message.message || message.content || ''}
          </Text>

          {/* Pièce jointe image */}
          {message.attachmentUrl && message.attachmentType === 'image' && (
            <TouchableOpacity onPress={() => setLightboxImage(message.attachmentUrl)}>
              <Image source={{ uri: message.attachmentUrl }} style={styles.attachmentImage} />
            </TouchableOpacity>
          )}

          {/* Réactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(message.reactions).map(([emoji, users]: [string, any]) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionBubble}
                  onPress={() => {
                    setReactingToMessageId(message.id);
                    addReaction.mutate({ messageId: message.id, emoji });
                  }}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={styles.reactionCount}>{users.length}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Timestamp + bouton Réagir amélioré */}
          <View style={styles.bubbleFooter}>
            <Text style={[styles.messageTime, isOwnMessage && { color: 'rgba(255,255,255,0.65)' }]}>
              {formatDistanceToNow(parseUTCDate(message.createdAt), { addSuffix: true, locale: getLocale() })}
            </Text>
            <TouchableOpacity
              style={[styles.reactButton, isOwnMessage && styles.reactButtonOwn]}
              onPress={() => {
                setReactingToMessageId(message.id);
                setIsEmojiPickerOpen(true);
              }}
            >
              <Text style={[styles.reactButtonLabel, isOwnMessage && { color: 'rgba(255,255,255,0.8)' }]}>😊 Réagir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  // Vue liste des groupes
  if (!selectedGroup) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.groupsList} contentContainerStyle={styles.groupsListContent}>
          {groups.length > 0 ? (
            groups.map((group: any) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => setSelectedGroup(group.id)}
              >
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>👥 {group.name}</Text>
                  {unreadPerGroup[group.id] > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadPerGroup[group.id]}</Text>
                    </View>
                  )}
                </View>
                {group.description && (
                  <Text style={styles.groupDescription}>{group.description}</Text>
                )}
                <Text style={styles.groupCreator}>
                  {t('messages.createdBy')} {group.creatorName || t('messages.unknownUser')}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('messages.noGroups')}</Text>
              <Text style={styles.emptySubtext}>{t('messages.createFirstGroup')}</Text>
            </View>
          )}
        </ScrollView>
        
        <TouchableOpacity style={styles.fab} onPress={() => setCreateDialogOpen(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
        
        {/* Dialog création de groupe */}
        <Modal visible={createDialogOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('messages.createGroup')}</Text>
              
              <TextInput
                style={styles.input}
                placeholder={t('messages.groupName')}
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('messages.groupDescription')}
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={newGroupDescription}
                onChangeText={setNewGroupDescription}
                multiline
                numberOfLines={3}
              />
              
              <Text style={styles.sectionTitle}>{t('messages.selectMembers')}</Text>
              <ScrollView style={styles.membersList}>
                {familyMembers.map((member: any) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.memberItem}
                    onPress={() => toggleMemberSelection(member.id)}
                  >
                    <Text style={styles.memberName}>{member.name}</Text>
                    <View style={[styles.checkbox, selectedMembers.includes(member.id) && styles.checkboxChecked]}>
                      {selectedMembers.includes(member.id) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setCreateDialogOpen(false)}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                  <Text style={styles.createButtonText}>{t('common.create')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        <EmojiPicker
          onEmojiSelected={handleEmojiSelected}
          open={isEmojiPickerOpen}
          onClose={() => setIsEmojiPickerOpen(false)}
          enableSearchBar
          enableRecentlyUsed
        />
      </View>
    );
  }
  
  // Vue conversation du groupe
  const currentGroup = groups.find((g: any) => g.id === selectedGroup);
  const isCreator = currentGroup?.creatorId === user?.id;
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 90 : 0}
    >
      {/* Header du groupe */}
      <View style={styles.groupConversationHeader}>
        <TouchableOpacity onPress={() => setSelectedGroup(null)} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.groupInfo}>
          <Text style={styles.groupConversationName}>{currentGroup?.name}</Text>
          {currentGroup?.description && (
            <Text style={styles.groupConversationDescription}>{currentGroup.description}</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setMembersDialogOpen(true)} style={styles.settingsButton}>
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>
      
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesListContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length > 0 ? (
          messages.map(renderMessage)
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('messages.noMessagesInGroup')}</Text>
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
          disabled={!newMessage.trim() || sendMessage.isPending}
        >
          {sendMessage.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Dialog paramètres du groupe */}
      <Modal visible={membersDialogOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('messages.groupSettings')}</Text>
            
            <Text style={styles.sectionTitle}>{t('messages.members')}</Text>
            <ScrollView style={styles.membersList}>
              {groupMembers.map((member: any) => (
                <View key={member.id} style={styles.memberItem}>
                  <Text style={styles.memberName}>{member.name}</Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setMembersDialogOpen(false)}>
                <Text style={styles.cancelButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
              
              {isCreator ? (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteGroup}>
                  <Text style={styles.deleteButtonText}>{t('messages.deleteGroup')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.deleteButton} onPress={handleLeaveGroup}>
                  <Text style={styles.deleteButtonText}>{t('messages.leaveGroup')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Lightbox pour les images */}
      <Modal visible={!!lightboxImage} transparent animationType="fade">
        <View style={styles.lightboxContainer}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxImage(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
          {lightboxImage && (
            <Image source={{ uri: lightboxImage }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
      
      <EmojiPicker
        onEmojiSelected={handleEmojiSelected}
        open={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        enableSearchBar
        enableRecentlyUsed
      />
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
  },
  groupsList: {
    flex: 1,
  },
  groupsListContent: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: isDark ? '#374151' : '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
  },
  unreadBadge: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  groupDescription: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#6b7280',
    marginBottom: 8,
  },
  groupCreator: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#9ca3af',
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  groupConversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: isDark ? '#111827' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: isDark ? '#fff' : '#111827',
  },
  groupInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  groupConversationName: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
  },
  groupConversationDescription: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    padding: 16,
  },
  // Layout des bulles de messages
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageSpacer: {
    flex: 1,
    minWidth: 40,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 10,
    maxWidth: '70%',
    flexShrink: 1,
  },
  otherBubble: {
    backgroundColor: isDark ? '#374151' : '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
  },
  ownBubble: {
    backgroundColor: '#7c3aed',
    borderTopRightRadius: 4,
  },
  ownAvatar: {
    backgroundColor: '#5b21b6',
  },
  ownMessageSender: {
    color: 'rgba(255,255,255,0.8)',
  },
  ownMessageContent: {
    color: '#fff',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  reactButtonText: {
    fontSize: 16,
    color: '#7c3aed',
  },
  reactButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.2)',
    flexShrink: 0,
    marginRight: 4,
  },
  reactButtonOwn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  reactButtonLabel: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '500',
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
    marginHorizontal: 6,
    flexShrink: 0,
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
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#e5e7eb' : '#374151',
    marginBottom: 4,
    textAlign: 'left',
  },
  messageTime: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  messageContent: {
    fontSize: 15,
    color: isDark ? '#e5e7eb' : '#374151',
    lineHeight: 22,
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#4b5563' : '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#6b7280',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: isDark ? '#374151' : '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  membersList: {
    maxHeight: 200,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#4b5563' : '#e5e7eb',
  },
  memberName: {
    fontSize: 15,
    color: isDark ? '#fff' : '#111827',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: isDark ? '#9ca3af' : '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#fff' : '#111827',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lightboxCloseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  lightboxImage: {
    width: '90%',
    height: '80%',
  },
});
