# Analyse de l'onboarding WebView

## 📊 Structure

**Composant** : `ImprovedOnboarding.tsx`

**Format** : Modal/Dialog avec navigation par étapes

**Nombre d'étapes** : 9 étapes

---

## 🎯 Étapes de l'onboarding

### 1. Bienvenue 🎉
- **Titre** : "Bienvenue sur FRI2PLAN !"
- **Description** : Présentation générale
- **Icône** : Users
- **Catégorie** : Essential
- **Tips** : 3 conseils

### 2. Calendrier familial 📅
- **Titre** : "Calendrier familial"
- **Description** : Créer et partager des événements
- **Icône** : Calendar
- **Catégorie** : Essential
- **Tips** : 3 conseils
- **Action** : "Explorer le calendrier" → /calendar

### 3. Gestion des tâches ✅
- **Titre** : "Gestion des tâches"
- **Description** : Organiser et assigner des tâches
- **Icône** : CheckSquare
- **Catégorie** : Essential
- **Tips** : 3 conseils
- **Action** : "Voir les tâches" → /tasks

### 4. Messages et groupes 💬
- **Titre** : "Messages et groupes"
- **Description** : Communication en temps réel
- **Icône** : MessageSquare
- **Catégorie** : Essential
- **Tips** : 3 conseils
- **Action** : "Accéder aux messages" → /messages

### 5. Listes de courses 🛒
- **Titre** : "Listes de courses"
- **Description** : Listes partagées synchronisées
- **Icône** : ShoppingCart
- **Catégorie** : Essential
- **Tips** : 3 conseils
- **Action** : "Voir les courses" → /shopping

### 6. Budget et dépenses 💰
- **Titre** : "Budget et dépenses"
- **Description** : Suivi des dépenses (Premium)
- **Icône** : Wallet
- **Catégorie** : Premium
- **Tips** : 3 conseils
- **Action** : "Gérer le budget" → /budget

### 7. Notes partagées 📝
- **Titre** : "Notes partagées"
- **Description** : Notes personnelles ou partagées (Premium)
- **Icône** : FileText
- **Catégorie** : Premium
- **Tips** : 3 conseils
- **Action** : "Voir les notes" → /notes

### 8. Système de récompenses 🏆
- **Titre** : "Système de récompenses"
- **Description** : Points et récompenses (Premium)
- **Icône** : Trophy
- **Catégorie** : Premium
- **Tips** : 3 conseils
- **Action** : "Voir les récompenses" → /rewards

### 9. Vous êtes prêt ! 🚀
- **Titre** : "Vous êtes prêt !"
- **Description** : Conclusion
- **Icône** : Check
- **Catégorie** : Essential
- **Tips** : 3 conseils

---

## 🎨 Fonctionnalités

1. **Navigation** : Boutons Précédent/Suivant
2. **Progression** : Barre de progression (%)
3. **Animations** : Framer Motion (AnimatePresence)
4. **Catégories** : Essential, Premium, Advanced
5. **Actions** : Boutons pour naviguer vers les pages
6. **Persistance** : Sauvegarde dans `settings.hasSeenOnboarding`
7. **Réouverture** : Prop `forceOpen` pour revisiter

---

## 📱 Adaptation React Native

### Composants nécessaires

1. **OnboardingScreen.tsx** : Écran principal
2. **OnboardingStep.tsx** : Composant pour chaque étape
3. **Animations** : react-native-reanimated ou react-native-animatable
4. **Navigation** : react-navigation (Modal)
5. **Icônes** : Ionicons (déjà installé)
6. **Persistance** : AsyncStorage

### Différences à adapter

- **Dialog** → Modal (React Native)
- **lucide-react icons** → Ionicons
- **framer-motion** → react-native-reanimated
- **wouter** → react-navigation
- **Button/Card shadcn** → Composants React Native personnalisés

---

## 🎯 Plan d'implémentation

### Phase 1 : Composants de base
1. Créer `OnboardingScreen.tsx`
2. Créer `OnboardingStep.tsx`
3. Définir les étapes (ONBOARDING_STEPS)

### Phase 2 : UI et animations
1. Implémenter le layout (Modal fullscreen)
2. Ajouter la barre de progression
3. Ajouter les animations de transition

### Phase 3 : Logique
1. Gérer la navigation entre étapes
2. Sauvegarder dans AsyncStorage
3. Intégrer dans le flux d'authentification

### Phase 4 : Actions
1. Implémenter les boutons d'action
2. Navigation vers les pages correspondantes
