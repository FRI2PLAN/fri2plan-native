# Fri2Plan Native - Application Mobile React Native

Application mobile de gestion familiale connectée à l'API backend [app.fri2plan.ch](https://app.fri2plan.ch).

## 📱 Fonctionnalités

### Authentification
- ✅ Connexion avec email/password via API
- ✅ Stockage sécurisé du token (AsyncStorage)
- ✅ Persistance de session (auto-login)
- ✅ Déconnexion

### Écrans principaux
- **Dashboard** : Vue d'ensemble avec statistiques en temps réel
  - Tâches en cours / terminées
  - Événements du jour
  - Messages non lus
  - Tâches récentes et événements du jour

- **Calendar** : Calendrier mensuel avec événements
  - Navigation entre les mois
  - Affichage des événements par date
  - Détails des événements (heure, lieu, description)

- **Tasks** : Gestion des tâches
  - Liste des tâches avec filtres (toutes/en cours/terminées)
  - Complétion de tâches
  - Recherche par titre
  - Affichage priorité, statut, date d'échéance, points

### Écrans secondaires
- **Shopping** : Listes de courses
  - Plusieurs listes avec navigation par tabs
  - Barre de progression (articles cochés/total)
  - Toggle des articles (cocher/décocher)
  - Recherche d'articles

- **Messages** : Chat familial
  - Interface type messagerie
  - Envoi de messages
  - Différenciation messages propres/autres
  - Temps relatif ("il y a 5 min")

- **Requests** : Demandes familiales
  - Filtres par statut (en attente/approuvées/rejetées)
  - Actions admin (approuver/rejeter)
  - Recherche de demandes

- **Notes** : Notes personnelles
  - Affichage en grille (2 colonnes)
  - Filtres (toutes/privées/publiques)
  - Couleurs pastel
  - Icône cadenas pour notes privées

### Écrans de gestion
- **Budget** : Gestion financière
  - Vue d'ensemble (revenus/dépenses/solde)
  - Dépenses par catégorie avec barres de progression
  - Liste des transactions

- **Rewards** : Système de récompenses
  - Liste des récompenses disponibles
  - Échange de récompenses avec points
  - Carte de points utilisateur

- **Members** : Gestion de la famille
  - Informations de la famille
  - Code d'invitation
  - Profil utilisateur avec rôle

## 🛠 Technologies

- **React Native** avec Expo SDK 54
- **TypeScript** pour le typage
- **tRPC** pour la communication avec l'API
- **React Query** pour la gestion du cache
- **AsyncStorage** pour la persistance locale
- **date-fns** pour le formatage des dates

## 📦 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app sur votre téléphone (iOS/Android)

### Installation des dépendances
```bash
npm install --legacy-peer-deps
```

### Configuration

L'application est configurée pour se connecter à l'API backend :
- **URL API** : `https://app.fri2plan.ch/api/trpc`

Le fichier `lib/trpc.ts` contient la configuration du client tRPC.

## 🚀 Lancement

### Mode développement
```bash
npm start
```

Scannez le QR code avec :
- **iOS** : Caméra native
- **Android** : Expo Go app

### Build pour production

#### Android (APK)
```bash
npx expo build:android
```

#### iOS (IPA)
```bash
npx expo build:ios
```

## 📁 Structure du projet

```
fri2plan-native/
├── App.tsx                 # Point d'entrée avec providers
├── contexts/
│   └── AuthContext.tsx     # Contexte d'authentification global
├── lib/
│   ├── trpc.ts            # Configuration client tRPC
│   └── types.ts           # Types TypeScript pour l'API
├── screens/               # Tous les écrans de l'application
│   ├── LoginScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── CalendarScreen.tsx
│   ├── TasksScreen.tsx
│   ├── ShoppingScreen.tsx
│   ├── MessagesScreen.tsx
│   ├── RequestsScreen.tsx
│   ├── NotesScreen.tsx
│   ├── BudgetScreen.tsx
│   ├── RewardsScreen.tsx
│   └── MembersScreen.tsx
└── package.json
```

## 🔐 Authentification

L'authentification utilise le système de tokens JWT :

1. L'utilisateur se connecte avec email/password
2. L'API retourne un token JWT et les données utilisateur
3. Le token est stocké dans AsyncStorage
4. Toutes les requêtes incluent le token dans le header `Authorization`
5. Au démarrage, l'app vérifie si un token existe et auto-connecte l'utilisateur

## 🔄 Gestion des données

- **tRPC** : Communication typée avec l'API
- **React Query** : Cache automatique et invalidation
- **Pull-to-refresh** : Actualisation manuelle sur tous les écrans
- **Loading states** : Indicateurs de chargement pendant les requêtes

## 🧪 Tests

Pour tester l'application :

1. Créez un compte sur [app.fri2plan.ch](https://app.fri2plan.ch)
2. Lancez l'app mobile avec `npm start`
3. Connectez-vous avec vos identifiants
4. Testez toutes les fonctionnalités

### Comptes de test
Vous pouvez créer des comptes de test sur le site web pour tester l'application.

## 🐛 Dépannage

### Erreur de connexion à l'API
- Vérifiez que l'URL de l'API est correcte dans `lib/trpc.ts`
- Vérifiez votre connexion internet
- Vérifiez que le backend est accessible

### Problèmes d'installation
```bash
# Nettoyer le cache
npm cache clean --force
rm -rf node_modules
npm install --legacy-peer-deps
```

### Problèmes de build
```bash
# Nettoyer Expo
expo start -c
```

## 📝 Changelog

### Version 1.0.0 (Février 2026)
- ✅ Connexion complète à l'API backend
- ✅ Authentification avec tokens JWT
- ✅ Tous les écrans fonctionnels avec vraies données
- ✅ Pull-to-refresh sur tous les écrans
- ✅ Gestion des erreurs et loading states
- ✅ Interface utilisateur complète et responsive

## 🤝 Contribution

Ce projet est privé. Pour toute question ou suggestion, contactez l'équipe de développement.

## 📄 Licence

Propriétaire - Tous droits réservés

## 🔗 Liens utiles

- **Backend API** : [https://app.fri2plan.ch](https://app.fri2plan.ch)
- **Documentation tRPC** : [https://trpc.io](https://trpc.io)
- **Documentation Expo** : [https://docs.expo.dev](https://docs.expo.dev)
- **Documentation React Native** : [https://reactnative.dev](https://reactnative.dev)
