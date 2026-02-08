# Fri2Plan Native - Changelog

## Version 0.2.0 - Design Improvements (Février 2026)

### ✨ Nouvelles fonctionnalités

#### Écran d'inscription (RegisterScreen)
- ✅ Design sombre cohérent avec l'application web
- ✅ Card sombre (#1e293b) sur fond violet (#7c3aed)
- ✅ Logo FRI2PLAN centré en haut de la card
- ✅ Champs de saisie avec icônes (personne, email, cadenas)
- ✅ Bouton "œil" pour afficher/masquer les mots de passe
- ✅ Validation en temps réel (8 caractères minimum)
- ✅ Bouton rose/magenta "S'inscrire" (#ec4899)
- ✅ Options OAuth (Manus, Google, Apple, Microsoft)
- ✅ Séparateur "OU" avec ligne
- ✅ Lien "Déjà un compte ? Se connecter"

#### Écran mot de passe oublié (ForgotPasswordScreen)
- ✅ Design sombre cohérent avec l'application web
- ✅ Card sombre (#1e293b) sur fond violet (#7c3aed)
- ✅ Logo FRI2PLAN centré en haut de la card
- ✅ Champ email avec icône
- ✅ Bouton rose/magenta "Envoyer le lien de réinitialisation"
- ✅ Écran de confirmation avec emoji ✉️
- ✅ Bouton "← Retour à la connexion" avec flèche

### 🎨 Design System

#### Couleurs
- **Fond principal** : `#7c3aed` (violet)
- **Card sombre** : `#1e293b` (slate-800)
- **Inputs** : `#2d3748` (gray-800)
- **Bouton principal** : `#ec4899` (rose/magenta)
- **Texte secondaire** : `#9ca3af` (gray-400)
- **Liens** : `#c084fc` (violet clair)
- **Placeholder** : `#6b7280` (gray-500)

#### Typographie
- **Titre** : 28px, bold, blanc
- **Sous-titre** : 14px, gray-400
- **Label** : 14px, semi-bold, blanc
- **Input** : 16px, blanc
- **Bouton** : 16px, bold, blanc
- **Hint** : 12px, gray-500

### 📱 Compatibilité
- ✅ Android (testé)
- ✅ iOS (compatible)
- ✅ KeyboardAvoidingView pour iOS
- ✅ ScrollView pour petits écrans
- ✅ SafeAreaView pour encoche

### 🔧 Améliorations techniques
- Utilisation de `@expo/vector-icons` (Ionicons)
- Gestion d'état avec `useState`
- Intégration tRPC pour l'API backend
- Validation des formulaires côté client
- Gestion des erreurs avec Alert

### 📝 Prochaines étapes
- [ ] Implémenter le mode immersif (masquer barre navigation Android)
- [ ] Tester tous les écrans (Dashboard, Calendar, Tasks, etc.)
- [ ] Implémenter les fonctionnalités OAuth
- [ ] Ajouter les notifications push
- [ ] Intégrer Stripe pour les paiements
- [ ] Import/export calendrier (Outlook, Google)
- [ ] Gestion des rôles (Admin/Parent/Enfant)

---

## Version 0.1.0 - Version initiale

### ✅ Fonctionnalités de base
- Authentification (login/logout)
- Navigation avec Drawer
- 11 écrans principaux
- Connexion au backend tRPC (app.fri2plan.ch)
- Build APK avec Expo Dev Client

## Version 0.2.1 - UI Fixes & Immersive Mode (Février 2026)

### 🐛 Corrections de bugs

#### Écran de connexion (LoginScreen)
- ✅ Suppression du header "FRI2PLAN" en haut (dupliqué)
- ✅ Correction du débordement du texte "Mot de passe oublié ?"
- ✅ Amélioration du layout responsive avec flexWrap
- ✅ Centrage vertical de la card de connexion

#### Mode immersif Android
- ✅ Création de MainActivity.kt avec mode immersif
- ✅ Masquage automatique de la barre de navigation Android
- ✅ Compatible Android 11+ (WindowInsetsController)
- ✅ Compatible Android 10 et inférieur (systemUiVisibility)
- ✅ Réactivation automatique après swipe

### 📁 Fichiers ajoutés
- `MainActivity_IMMERSIVE_V2.kt` - MainActivity avec mode immersif
- `IMMERSIVE_MODE_INSTRUCTIONS.md` - Instructions d'installation

### 🔧 Modifications techniques
- Suppression du header dupliqué dans LoginScreen
- Ajout de flexWrap et gap pour éviter le débordement de texte
- justifyContent: 'center' pour centrer la card verticalement
- Mode immersive sticky pour Android


## Version 0.2.2 - Mode immersif React Native (Février 2026)

### ✨ Nouvelle fonctionnalité

#### Mode immersif Android
- ✅ Ajout du package `expo-navigation-bar`
- ✅ Masquage automatique de la barre de navigation Android au démarrage
- ✅ Comportement "overlay-swipe" : l'utilisateur peut swiper pour afficher temporairement la barre
- ✅ La barre se cache automatiquement après utilisation
- ✅ Fonctionne uniquement sur Android (iOS n'a pas de barre de navigation)

### 📦 Dépendances ajoutées
- `expo-navigation-bar`: ~4.0.5

### 🔧 Modifications
- `App.tsx`: Ajout du hook useEffect pour masquer la barre au démarrage
- `package.json`: Ajout de la dépendance expo-navigation-bar

### 📱 Installation

Après avoir fait `git pull`, exécutez :

```bash
npm install
```

Puis recompilez l'APK :

```bash
eas build --platform android --profile development
```

### ✅ Résultat attendu
- Application en plein écran sur Android
- Barre de navigation masquée par défaut
- Swipe depuis le bas pour afficher temporairement la barre
- Retour automatique en mode immersif


## Version 0.3.0 - Dashboard Web Design Recreation (Février 2026)

### ✨ Nouvelle fonctionnalité majeure : Dashboard complet

#### Design et structure
- ✅ Recreation complète du design du Dashboard web
- ✅ Header amélioré avec avatar, nom utilisateur, famille et nombre de membres
- ✅ Barre de favoris personnalisable (max 5 pages favorites)
- ✅ Design cohérent avec l'application web

#### Widgets intelligents
- ✅ **Widget Demandes en attente** : Visible uniquement pour les admins de famille
- ✅ **Widget Résumé du jour** : Statistiques (événements, tâches, messages)
- ✅ **Widget Prochains anniversaires** : Affiche les anniversaires du mois à venir
- ✅ **Widget Tâches récentes** : 5 dernières tâches avec priorités
- ✅ **Widget Événements du jour** : Liste des événements d'aujourd'hui

#### Intégration tRPC complète
- ✅ `trpc.family.list` - Liste des familles
- ✅ `trpc.family.members` - Membres de la famille avec rôles
- ✅ `trpc.tasks.list` - Liste des tâches avec filtres
- ✅ `trpc.events.list` - Liste des événements
- ✅ `trpc.messages.list` - Liste des messages avec compteur non lus
- ✅ `trpc.requests.list` - Liste des demandes (pour admins)
- ✅ `trpc.settings.get` - Paramètres utilisateur (favoris)

#### Fonctionnalités
- ✅ Pull-to-refresh pour actualiser toutes les données
- ✅ Calcul automatique des statistiques en temps réel
- ✅ Détection automatique du rôle admin dans la famille
- ✅ Calcul intelligent des anniversaires à venir
- ✅ Affichage conditionnel selon les données disponibles
- ✅ Message d'accueil si aucune famille n'est active

### 🔧 Modifications techniques
- `screens/DashboardScreen.tsx` : Refonte complète avec tous les widgets
- Utilisation de `useMemo` pour optimiser les calculs
- Gestion des états de chargement et d'erreur
- Format de date avec `date-fns` et locale française

### 📱 Résultat attendu
- Dashboard identique à la version web
- Données en temps réel depuis la base de données
- Interface fluide et réactive
- Widgets adaptatifs selon le rôle utilisateur


## Version 0.4.0 - Circular Swipe Navigation (Février 2026)

### ✨ Nouvelle fonctionnalité : Navigation par swipe circulaire

#### Fonctionnalité
- ✅ Navigation circulaire par swipe gauche/droite entre tous les écrans
- ✅ Swipe gauche → écran suivant dans l'ordre
- ✅ Swipe droite → écran précédent dans l'ordre
- ✅ Navigation circulaire : après le dernier écran, retour au premier
- ✅ Coexistence avec le Drawer (menu hamburger) pour accès direct

#### Ordre de navigation
1. Dashboard → 2. Calendar → 3. Tasks → 4. Shopping → 5. Messages → 6. Requests → 7. Notes → 8. Budget → 9. Rewards → 10. Members → 11. Referral → 12. Settings → 13. Help → (retour à 1)

#### Implémentation technique
- Nouveau composant `SwipeNavigator.tsx` avec React Native Gesture Handler
- Utilisation de `react-native-reanimated` pour animations fluides
- Détection de swipe avec seuil de 30% de la largeur de l'écran
- Animation de transition de 300ms
- Support de la vélocité du geste pour navigation rapide

#### Expérience utilisateur
- Header reste fixe pendant les transitions (pas de déplacement)
- Animation fluide et naturelle
- Double méthode de navigation : swipe + drawer
- Flexibilité maximale pour l'utilisateur

### 🔧 Modifications techniques
- `navigation/SwipeNavigator.tsx` : Nouveau composant de navigation par geste
- `navigation/AppNavigator.tsx` : Wrapper de tous les écrans avec SwipeNavigator
- Tous les écrans (Dashboard, Calendar, Tasks, etc.) supportent le swipe

### 📱 Résultat
- Navigation intuitive et rapide entre les écrans
- Expérience mobile moderne (comme Instagram, Twitter)
- Pas de conflit avec les fonctionnalités existantes

