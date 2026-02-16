import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessagesScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

type TabType = 'family' | 'groups';

export default function MessagesScreen({ onNavigate, onPrevious, onNext }: MessagesScreenProps) {
  const { user } = useAuth();
  const { activeFamilyId } = useFamily();
  const [activeTab, setActiveTab] = useState<TabType>('family');
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    file: any;
    uploadedData: { url: string; type: string; name: string; size: number };
    preview?: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [offset, setOffset] = useState(0);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Liste d'émojis fréquemment utilisés
  const frequentEmojis = [
    '😀', '😂', '😍', '😘', '😊', '😉', '😜', '😁',
    '😎', '😔', '😢', '😭', '😡', '😠', '😱', '😨',
    '👍', '👎', '👏', '👌', '✌️', '✊', '✋', '👊',
    '❤️', '💔', '💕', '💖', '💗', '💙', '💚', '💛',
    '🎉', '🎈', '🎂', '🎁', '🎀', '⭐', '✨', '🌟',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🐻', '🐼', '🐨',
  ];

  // Fetch messages from API
  const { data: messagesData, isLoading, refetch } = trpc.messages.list.useQuery(
    { familyId: activeFamilyId || 0, limit: 50, offset },
    { enabled: !!activeFamilyId && activeTab === 'family' }
  );

  // Fusionner les nouveaux messages avec les anciens
  useEffect(() => {
    if (messagesData?.messages) {
      if (offset === 0) {
        setAllMessages(messagesData.messages);
      } else {
        setAllMessages(prev => [...messagesData.messages, ...prev]);
      }
    }
  }, [messagesData, offset]);

  const messages = allMessages;
  const hasMore = messagesData?.hasMore || false;

  // Mutation to send message
  const createMessage = trpc.messages.create.useMutation({
    onSuccess: () => {
      setNewMessage('');
      setSelectedFile(null);
      setIsUploading(false);
      setShouldAutoScroll(true);
      refetch();
    },
    onError: () => {
      setIsUploading(false);
      Alert.alert('Erreur', 'Erreur lors de l\'envoi du message');
    },
  });

  const uploadFileMutation = trpc.messages.uploadFile.useMutation();

  const deleteMessageMutation = trpc.messages.delete.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Succès', 'Message supprimé');
    },
    onError: () => {
      Alert.alert('Erreur', 'Erreur lors de la suppression');
    },
  });

  const addReaction = trpc.messages.addReaction.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      Alert.alert('Erreur', 'Erreur lors de l\'ajout de la réaction');
    },
  });

  const markAsRead = trpc.messages.markAsRead.useMutation();

  // Marquer les messages comme lus quand on ouvre la page
  useEffect(() => {
    if (activeFamilyId && activeTab === 'family') {
      markAsRead.mutate({ familyId: activeFamilyId });
    }
  }, [activeFamilyId, activeTab]);

  // Scroll automatique après envoi
  useEffect(() => {
    if (shouldAutoScroll && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        setShouldAutoScroll(false);
      }, 100);
    }
  }, [shouldAutoScroll, messages]);

  const onRefresh = async () => {
    setRefreshing(true);
    setOffset(0);
    await refetch();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      setOffset(prev => prev + 50);
    }
  };

  const handleReaction = (messageId: number, emoji: string) => {
    addReaction.mutate({ messageId, emoji });
  };

  const handleDeleteMessage = (messageId: number) => {
    Alert.alert(
      'Supprimer le message',
      'Êtes-vous sûr de vouloir supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteMessageMutation.mutate({ messageId }),
        },
      ]
    );
  };

  const compressImage = async (uri: string): Promise<string> => {
    // Compression d'image (simplifié pour React Native)
    // En production, utiliser expo-image-manipulator
    return uri;
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await handleFileUpload({
        uri: asset.uri,
        name: asset.fileName || 'image.jpg',
        type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
      });
    }
  };

  const handlePickCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la caméra');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await handleFileUpload({
        uri: asset.uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.type === 'success') {
      await handleFileUpload({
        uri: result.uri,
        name: result.name,
        type: result.mimeType || 'application/octet-stream',
      });
    }
  };

  const handleFileUpload = async (file: { uri: string; name: string; type: string }) => {
    setIsUploading(true);
    try {
      // Lire le fichier en base64
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        // Upload vers S3
        const uploadResult = await uploadFileMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileSize: blob.size,
          fileData: base64data,
        });

        setSelectedFile({
          file,
          uploadedData: {
            url: uploadResult.url,
            type: file.type,
            name: file.name,
            size: blob.size,
          },
          preview: file.type.startsWith('image/') ? file.uri : undefined,
        });
        setIsUploading(false);
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      setIsUploading(false);
      Alert.alert('Erreur', 'Erreur lors de l\'upload du fichier');
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !activeFamilyId) return;

    setIsUploading(true);

    try {
      let attachmentData = null;

      if (selectedFile) {
        attachmentData = {
          attachmentUrl: selectedFile.uploadedData.url,
          attachmentType: selectedFile.uploadedData.type,
          attachmentName: selectedFile.uploadedData.name,
          attachmentSize: selectedFile.uploadedData.size,
        };
      }

      createMessage.mutate({
        content: newMessage.trim() || `Fichier: ${selectedFile?.file.name}`,
        ...attachmentData,
      });
    } catch (error) {
      setIsUploading(false);
      Alert.alert('Erreur', 'Erreur lors de l\'envoi du message');
    }
  };

  const handleKeyPress = (e: any) => {
    // Envoi avec Enter (Shift+Enter pour nouvelle ligne)
    // Note: React Native ne supporte pas nativement Shift+Enter
    // On pourrait ajouter un bouton "Nouvelle ligne" si nécessaire
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 500);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return 'image-outline';
    if (type.startsWith('video/')) return 'videocam-outline';
    return 'document-text-outline';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header with tabs */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.tutorialButton}
          onPress={() => setShowTutorial(true)}
        >
          <Ionicons name="help-circle" size={24} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      {/* Tabs Container */}
      <View style={styles.tabsOuterContainer}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'family' && styles.tabActive]}
            onPress={() => setActiveTab('family')}
          >
            <Ionicons
              name="people-outline"
              size={18}
              color={activeTab === 'family' ? '#7c3aed' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === 'family' && styles.tabTextActive]}>
              Famille
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
            onPress={() => setActiveTab('groups')}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={18}
              color={activeTab === 'groups' ? '#7c3aed' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
              Groupes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      {activeTab === 'family' ? (
        <>
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
            }
          >
            {hasMore && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Charger plus</Text>
              </TouchableOpacity>
            )}

            {isLoading && offset === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : messages && messages.length > 0 ? (
              messages.map(message => {
                const isOwnMessage = message.senderId === user?.id;
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageCard,
                      isOwnMessage && styles.messageCardOwn
                    ]}
                  >
                    <View style={styles.messageHeader}>
                      <Text style={[styles.messageSender, isOwnMessage && styles.messageSenderOwn]}>
                        {isOwnMessage ? 'Vous' : (message.userName || `Utilisateur #${message.userId}`)}
                      </Text>
                      <Text style={[styles.messageTime, isOwnMessage && styles.messageTimeOwn]}>
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.messageContent, isOwnMessage && styles.messageContentOwn]}>
                      {message.content}
                    </Text>

                    {/* Pièce jointe */}
                    {message.attachmentUrl && (
                      <View style={styles.attachmentContainer}>
                        {message.attachmentType?.startsWith('image/') ? (
                          <Image
                            source={{ uri: message.attachmentUrl }}
                            style={styles.attachmentImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.attachmentFile}>
                            <Ionicons
                              name={getFileIcon(message.attachmentType || '')}
                              size={24}
                              color="#7c3aed"
                            />
                            <View style={styles.attachmentInfo}>
                              <Text style={styles.attachmentName} numberOfLines={1}>
                                {message.attachmentName}
                              </Text>
                              <Text style={styles.attachmentSize}>
                                {formatFileSize(message.attachmentSize || 0)}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => Linking.openURL(message.attachmentUrl)}
                            >
                              <Ionicons name="download-outline" size={24} color="#7c3aed" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Réactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <View style={styles.reactionsContainer}>
                        {message.reactions.map((reaction: any, index: number) => (
                          <View key={index} style={styles.reactionBadge}>
                            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                            <Text style={styles.reactionCount}>{reaction.count}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Actions */}
                    <View style={styles.messageActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setSelectedMessageId(message.id);
                          setShowReactionPicker(true);
                        }}
                      >
                        <Ionicons name="happy-outline" size={20} color="#6b7280" />
                      </TouchableOpacity>
                      {isOwnMessage && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteMessage(message.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucun message pour le moment</Text>
                <Text style={styles.emptyStateSubtext}>Envoyez le premier message à votre famille !</Text>
              </View>
            )}
          </ScrollView>

          {/* Scroll to top button */}
          {showScrollToTop && (
            <TouchableOpacity style={styles.scrollToTopButton} onPress={scrollToTop}>
              <Ionicons name="arrow-up" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Message Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
          >
            {/* Prévisualisation fichier */}
            {selectedFile && (
              <View style={styles.filePreviewContainer}>
                {selectedFile.preview ? (
                  <Image source={{ uri: selectedFile.preview }} style={styles.filePreviewImage} />
                ) : (
                  <View style={styles.filePreviewFile}>
                    <Ionicons
                      name={getFileIcon(selectedFile.uploadedData.type)}
                      size={32}
                      color="#7c3aed"
                    />
                    <Text style={styles.filePreviewName}>{selectedFile.uploadedData.name}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.filePreviewRemove}
                  onPress={() => setSelectedFile(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.iconButton} onPress={handlePickCamera}>
                <Ionicons name="camera-outline" size={24} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handlePickDocument}>
                <Ionicons name="attach-outline" size={24} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowEmojiPicker(true)}>
                <Ionicons name="happy-outline" size={24} color="#6b7280" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Écrivez un message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  ((!newMessage.trim() && !selectedFile) || isUploading) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={(!newMessage.trim() && !selectedFile) || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Groupes de discussion</Text>
          <Text style={styles.emptyStateSubtext}>Fonctionnalité à venir</Text>
        </View>
      )}

      {/* Emoji Picker Modal (pour messages) */}
      <Modal
        visible={showEmojiPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Choisir un emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.emojiGrid}>
              <View style={styles.emojiRow}>
                {frequentEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiButton}
                    onPress={() => insertEmoji(emoji)}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Ajouter une réaction</Text>
              <TouchableOpacity onPress={() => setShowReactionPicker(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.emojiGrid}>
              <View style={styles.emojiRow}>
                {frequentEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiButton}
                    onPress={() => {
                      if (selectedMessageId) {
                        handleReaction(selectedMessageId, emoji);
                      }
                      setShowReactionPicker(false);
                      setSelectedMessageId(null);
                    }}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tutorial Modal */}
      <Modal
        visible={showTutorial}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTutorial(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tutorialContainer}>
            <View style={styles.tutorialHeader}>
              <Text style={styles.tutorialTitle}>Guide des Messages</Text>
              <TouchableOpacity onPress={() => setShowTutorial(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tutorialContent}>
              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>📱 Onglets</Text>
                <Text style={styles.tutorialText}>
                  • Famille : Messages avec tous les membres de la famille{'\n'}
                  • Groupes : Discussions en groupes (à venir)
                </Text>
              </View>
              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>📎 Pièces jointes</Text>
                <Text style={styles.tutorialText}>
                  • Caméra : Prendre une photo{'\n'}
                  • Fichier : Joindre un document, image ou vidéo{'\n'}
                  • Les pièces jointes sont automatiquement uploadées
                </Text>
              </View>
              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>😀 Émojis et réactions</Text>
                <Text style={styles.tutorialText}>
                  • Bouton Smile : Insérer un emoji dans votre message{'\n'}
                  • Réagir : Ajouter une réaction emoji à un message
                </Text>
              </View>
              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>🗑️ Suppression</Text>
                <Text style={styles.tutorialText}>
                  • Vous pouvez supprimer vos propres messages{'\n'}
                  • Appuyez sur l'icône poubelle pour supprimer
                </Text>
              </View>
              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>📜 Navigation</Text>
                <Text style={styles.tutorialText}>
                  • Tirez vers le bas pour actualiser{'\n'}
                  • "Charger plus" pour voir les anciens messages{'\n'}
                  • Bouton flèche : Retour en haut de la conversation
                </Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.tutorialCloseButton}
              onPress={() => setShowTutorial(false)}
            >
              <Text style={styles.tutorialCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  pageTitleContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tutorialButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  tabsOuterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadMoreButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadMoreText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600',
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
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  messageCardOwn: {
    backgroundColor: '#7c3aed',
    alignSelf: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  messageSenderOwn: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  messageTimeOwn: {
    color: '#e9d5ff',
  },
  messageContent: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22,
  },
  messageContentOwn: {
    color: '#fff',
  },
  attachmentContainer: {
    marginTop: 8,
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  attachmentFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  attachmentSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  messageActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  scrollToTopButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    backgroundColor: '#7c3aed',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  filePreviewContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  filePreviewImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  filePreviewFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  filePreviewName: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  filePreviewRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  emojiPickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  emojiGrid: {
    padding: 16,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 24,
  },
  tutorialContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tutorialContent: {
    padding: 16,
  },
  tutorialSection: {
    marginBottom: 20,
  },
  tutorialSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  tutorialText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  tutorialCloseButton: {
    margin: 16,
    backgroundColor: '#7c3aed',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tutorialCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
