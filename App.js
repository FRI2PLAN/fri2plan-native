import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FRI2PLAN</Text>
        <Text style={styles.headerSubtitle}>Version Native 🚀</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Bienvenue sur FRI2PLAN Native !</Text>
        <Text style={styles.subtitle}>
          Votre organiseur familial maintenant en version native
        </Text>

        {/* Test Counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterLabel}>Test de fonctionnalité :</Text>
          <Text style={styles.counterValue}>{count}</Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setCount(count + 1)}
          >
            <Text style={styles.buttonText}>Incrémenter</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setCount(0)}
          >
            <Text style={styles.buttonTextSecondary}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✅ React Native fonctionne !
          </Text>
          <Text style={styles.infoText}>
            ✅ Navigation tactile OK
          </Text>
          <Text style={styles.infoText}>
            ✅ Prêt pour les notifications push
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Prochaine étape : Connexion au backend
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7c3aed', // Purple theme
  },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e9d5ff',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e9d5ff',
    textAlign: 'center',
    marginBottom: 40,
  },
  counterContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    marginBottom: 30,
  },
  counterLabel: {
    fontSize: 16,
    color: '#6d28d9',
    marginBottom: 10,
  },
  counterValue: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  buttonTextSecondary: {
    color: '#7c3aed',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
  },
  footerText: {
    color: '#e9d5ff',
    fontSize: 14,
  },
});
