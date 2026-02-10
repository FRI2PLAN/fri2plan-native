import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PageHeader from '../components/PageHeader';
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessagesScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function MessagesScreen({ onNavigate }: MessagesScreenProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch messages from API
  const { data: messages, isLoading, refetch } = trpc.messages.list.useQuery();

  // Mutation to send message
  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setNewMessage('');
      refetch();
    },
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <PageHeader
        title="Messages"
        buttonText="Nouveau message"
        onButtonPress={() => {/* TODO: Open create modal */}}
      />
      </View>

      {/* Messages List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >
        {isLoading ? (
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
                  <Text style={styles.messageSender}>
                    {isOwnMessage ? 'Vous' : `Utilisateur #${message.senderId}`}
                  </Text>
                  <Text style={styles.messageTime}>
                    {formatDistanceToNow(new Date(message.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </Text>
                </View>
                <Text style={styles.messageContent}>{message.content}</Text>
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

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputContainer}>
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
              (!newMessage.trim() || sendMutation.isLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sendMutation.isLoading}
          >
            {sendMutation.isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Envoyer</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerBadge: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
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
  messageTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  messageContent: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22,
  },
  emptyState: {
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
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
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
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
