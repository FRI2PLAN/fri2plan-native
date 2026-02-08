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

