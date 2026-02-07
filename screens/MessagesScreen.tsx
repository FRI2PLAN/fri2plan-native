import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface MessagesScreenProps {
  onNavigate?: (screen: string) => void;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  avatar: string;
}

export default function MessagesScreen({ onNavigate }: MessagesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Mock messages data
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'Papa',
      content: 'N\'oubliez pas les courses ce soir !',
      timestamp: 'Il y a 5 min',
      isRead: false,
      avatar: '👨',
    },
    {
      id: '2',
      sender: 'Maman',
      content: 'Le dîner est prêt à 19h',
      timestamp: 'Il y a 30 min',
      isRead: false,
      avatar: '👩',
    },
    {
      id: '3',
      sender: 'Enfant 1',
      content: 'J\'ai fini mes devoirs !',
      timestamp: 'Il y a 1h',
      isRead: true,
      avatar: '👦',
    },
    {
      id: '4',
      sender: 'Enfant 2',
      content: 'Qui veut jouer au foot ?',
      timestamp: 'Il y a 2h',
      isRead: true,
      avatar: '👧',
    },
    {
      id: '5',
      sender: 'Papa',
      content: 'Réunion de famille dimanche à 14h',
      timestamp: 'Hier',
      isRead: true,
      avatar: '👨',
    },
  ]);

  const toggleRead = (id: string) => {
    setMessages(messages.map(msg =>
      msg.id === id ? { ...msg, isRead: !msg.isRead } : msg
    ));
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'unread' && msg.isRead) return false;
    if (searchQuery && !msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const unreadCount = messages.filter(msg => !msg.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.composeButton}>
          <Text style={styles.composeButtonText}>✏️ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un message..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Tous ({messages.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Non lus ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <ScrollView style={styles.content}>
        {filteredMessages.length > 0 ? (
          filteredMessages.map(message => (
            <TouchableOpacity
              key={message.id}
              style={[styles.messageCard, !message.isRead && styles.messageCardUnread]}
              onPress={() => toggleRead(message.id)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{message.avatar}</Text>
              </View>
              
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSender}>{message.sender}</Text>
                  <Text style={styles.messageTimestamp}>{message.timestamp}</Text>
                </View>
                <Text
                  style={[styles.messageText, !message.isRead && styles.messageTextUnread]}
                  numberOfLines={2}
                >
                  {message.content}
                </Text>
              </View>

              {!message.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noMessages}>
            <Text style={styles.noMessagesText}>Aucun message trouvé</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton}>
          <Text style={styles.quickActionEmoji}>📢</Text>
          <Text style={styles.quickActionText}>Annonce</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Text style={styles.quickActionEmoji}>📋</Text>
          <Text style={styles.quickActionText}>Rappel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Text style={styles.quickActionEmoji}>🎉</Text>
          <Text style={styles.quickActionText}>Événement</Text>
        </TouchableOpacity>
      </View>
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
  composeButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  composeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#7c3aed',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  messageCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  messageCardUnread: {
    backgroundColor: '#f5f3ff',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  messageTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messageText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  messageTextUnread: {
    fontWeight: '500',
    color: '#1f2937',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
    marginLeft: 8,
  },
  noMessages: {
    padding: 40,
    alignItems: 'center',
  },
  noMessagesText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
});
