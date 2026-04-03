import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

interface HelpScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function HelpScreen({ onNavigate , onPrevious, onNext}: HelpScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Mock FAQ data
  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'Comment ajouter un nouveau membre à ma famille ?',
      answer: 'Allez dans l\'onglet "Membres", cliquez sur "+ Inviter", entrez l\'email du membre et envoyez l\'invitation. Il recevra un email pour rejoindre votre famille.',
      category: 'Membres',
    },
    {
      id: '2',
      question: 'Comment créer une nouvelle tâche ?',
      answer: 'Dans l\'onglet "Tâches", cliquez sur le bouton "+", remplissez les détails de la tâche (titre, description, assignation, date limite) et sauvegardez.',
      category: 'Tâches',
    },
    {
      id: '3',
      question: 'Comment fonctionne le système de récompenses ?',
      answer: 'Les enfants gagnent des points en complétant des tâches. Ces points peuvent être échangés contre des récompenses définies par les parents (sorties, cadeaux, etc.).',
      category: 'Récompenses',
    },
    {
      id: '4',
      question: 'Puis-je synchroniser le calendrier avec Google Calendar ?',
      answer: 'Oui ! Allez dans Paramètres > Intégrations > Google Calendar et autorisez la synchronisation. Les événements seront synchronisés automatiquement.',
      category: 'Calendrier',
    },
    {
      id: '5',
      question: 'Comment gérer les permissions des membres ?',
      answer: 'Dans Paramètres > Famille > Permissions, vous pouvez définir les droits de chaque membre : lecture seule, modification, ou administration complète.',
      category: 'Sécurité',
    },
    {
      id: '6',
      question: 'Comment créer une liste de courses partagée ?',
      answer: 'Dans l\'onglet "Courses", créez une nouvelle liste, ajoutez des articles, et tous les membres de la famille pourront la voir et la modifier en temps réel.',
      category: 'Courses',
    },
    {
      id: '7',
      question: 'Que faire si j\'ai oublié mon mot de passe ?',
      answer: 'Sur l\'écran de connexion, cliquez sur "Mot de passe oublié ?", entrez votre email, et suivez les instructions reçues par email pour réinitialiser votre mot de passe.',
      category: 'Compte',
    },
    {
      id: '8',
      question: 'Comment supprimer mon compte ?',
      answer: 'Allez dans Paramètres > À propos > Supprimer mon compte. Attention : cette action est irréversible et supprimera toutes vos données.',
      category: 'Compte',
    },
  ];

  const filteredFAQs = faqs.filter(faq =>
    searchQuery === '' ||
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Centre d'aide</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une question..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

            {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Centre d'aide</Text>
      </View>


      


      <ScrollView style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionTitle}>Chat en direct</Text>
            <Text style={styles.actionDescription}>Discutez avec notre équipe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📧</Text>
            <Text style={styles.actionTitle}>Email</Text>
            <Text style={styles.actionDescription}>support@fri2plan.app</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionTitle}>Téléphone</Text>
            <Text style={styles.actionDescription}>01 23 45 67 89</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Questions fréquentes</Text>
          
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map(faq => (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqCard}
                onPress={() => toggleFAQ(faq.id)}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{faq.category}</Text>
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedFAQ === faq.id ? '−' : '+'}
                  </Text>
                </View>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                {expandedFAQ === faq.id && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Aucune question trouvée</Text>
            </View>
          )}
        </View>

        {/* Guides Section */}
        <View style={styles.guidesSection}>
          <Text style={styles.sectionTitle}>Guides et tutoriels</Text>
          
          <TouchableOpacity style={styles.guideCard}>
            <Text style={styles.guideIcon}>📚</Text>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>Guide de démarrage</Text>
              <Text style={styles.guideDescription}>
                Découvrez comment configurer votre famille et commencer à utiliser FRI2PLAN
              </Text>
            </View>
            <Text style={styles.guideArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.guideCard}>
            <Text style={styles.guideIcon}>🎥</Text>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>Tutoriels vidéo</Text>
              <Text style={styles.guideDescription}>
                Regardez nos vidéos pour maîtriser toutes les fonctionnalités
              </Text>
            </View>
            <Text style={styles.guideArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.guideCard}>
            <Text style={styles.guideIcon}>💡</Text>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>Astuces et conseils</Text>
              <Text style={styles.guideDescription}>
                Optimisez votre organisation familiale avec nos meilleures pratiques
              </Text>
            </View>
            <Text style={styles.guideArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Besoin d'aide supplémentaire ?</Text>
          
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Contactez notre équipe</Text>
            <Text style={styles.contactDescription}>
              Notre équipe de support est disponible du lundi au vendredi de 9h à 18h
            </Text>
            <TouchableOpacity style={styles.contactButton}>
              <Text style={styles.contactButtonText}>Envoyer un message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>Votre avis compte !</Text>
          
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>💬 Partagez votre expérience</Text>
            <Text style={styles.feedbackDescription}>
              Aidez-nous à améliorer FRI2PLAN en partageant vos suggestions et commentaires
            </Text>
            <TouchableOpacity style={styles.feedbackButton}>
              <Text style={styles.feedbackButtonText}>Envoyer un feedback</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
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
  content: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  faqSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  expandIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  noResults: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  guidesSection: {
    padding: 16,
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guideIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  guideDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  guideArrow: {
    fontSize: 24,
    color: '#9ca3af',
  },
  contactSection: {
    padding: 16,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackSection: {
    padding: 16,
  },
  feedbackCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  feedbackDescription: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
    marginBottom: 16,
  },
  feedbackButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  pageTitleContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
});
