# FRI2PLAN React Native - TODO

## Page de connexion
- [x] Ajouter le logo à côté du nom "FRI2PLAN"
- [x] Rendre visible le bouton "S'inscrire" (actuellement caché)
- [x] Implémenter la fonctionnalité "Mot de passe oublié"

## Navigation
- [x] Pas de Bottom Navigation (déjà correct - utilise Drawer Navigator)

## Fonctionnalités à tester
- [ ] Tester l'écran Dashboard
- [ ] Tester l'écran Calendrier
- [ ] Tester l'écran Tâches
- [ ] Tester l'écran Messages
- [ ] Tester l'écran Courses
- [ ] Tester l'écran Notes
- [ ] Tester l'écran Budget
- [ ] Tester l'écran Récompenses
- [ ] Tester l'écran Membres

## Fonctionnalités manquantes
- [ ] Stripe (paiements)
- [ ] Notifications push
- [ ] Import/Export Outlook/Google
- [ ] Paramètres avancés
- [ ] Gestion des rôles (admin/parent/enfant)
- [ ] Approbation des demandes enfants

## Inscription et Mot de passe oublié
- [x] Analyser le processus d'inscription dans l'app web
- [x] Analyser le processus de mot de passe oublié dans l'app web
- [x] Créer l'écran RegisterScreen avec formulaire complet
- [x] Créer l'écran ForgotPasswordScreen avec formulaire complet
- [x] Connecter RegisterScreen aux routes tRPC
- [x] Connecter ForgotPasswordScreen aux routes tRPC
- [ ] Tester le processus d'inscription complet
- [ ] Tester le processus de récupération de mot de passe

## Mode immersif Android
- [x] Configurer app.json pour cacher la barre de navigation en mode immersif

## Design de la page de connexion (style app web)
- [x] Refaire LoginScreen avec card sombre (#1f2937 ou plus foncé)
- [x] Ajouter bouton rose/magenta pour "Se connecter" (au lieu de violet)
- [x] Ajouter checkbox "Se souvenir de moi"
- [x] Centrer le logo en haut de la card (pas dans le header)
- [x] Ajouter description "Connectez-vous à votre compte Fri2Plan - Votre agenda familial"
- [x] Mettre à jour RegisterScreen avec le même design
- [x] Mettre à jour ForgotPasswordScreen avec le même design

## PRIORITÉS ACTUELLES (ordre d'implémentation)

### Priorité 1 : Copier le design de la page d'accueil (Dashboard)
- [x] Créer DashboardScreen.tsx avec structure complète
- [x] Implémenter le header avec avatar, nom, famille
- [x] Créer DashboardFavorites component (barre de favoris)
- [x] Créer PendingRequestsWidget (demandes en attente pour admins)
- [x] Créer DailySummaryWidget (résumé quotidien)
- [x] Créer UpcomingBirthdaysWidget (prochains anniversaires)
- [x] Intégrer tRPC pour récupérer les données réelles
- [ ] Tester l'affichage avec données de la BD

### Priorité 2 : Fixer le mode immersif
- [x] Ajouter expo-navigation-bar
- [ ] Tester une autre approche si nécessaire (le swipe ne fonctionne pas)

### Priorité 3 : Traduction EN/FR
- [ ] Implémenter react-i18next
- [ ] Créer fichiers de traduction (fr.json, en.json)
- [ ] Ajouter détection automatique de la langue

### Priorité 4 : OAuth natif
- [ ] Configuration Google Sign-In
- [ ] Configuration Apple Auth
- [ ] Configuration Microsoft Auth


## Navigation par swipe (nouvelle demande)
- [x] Implémenter navigation circulaire par swipe gauche/droite entre les écrans
- [x] Swipe gauche → écran suivant
- [x] Swipe droite → écran précédent
- [x] Navigation circulaire (après le dernier écran, retour au premier)
- [x] Garder le header fixe pendant les transitions
- [x] Animation de transition fluide
- [x] Coexistence avec le Drawer (menu hamburger)


## Priorité 3 : Traduction EN/FR (terminé)
- [x] Installer i18next et react-i18next
- [x] Créer fichiers de traduction (locales/fr.json, locales/en.json)
- [x] Créer configuration i18n (i18n.ts)
- [x] Détecter automatiquement la langue du téléphone
- [x] Créer traductions complètes (auth, navigation, dashboard, etc.)
- [x] Ajouter sélecteur de langue dans SettingsScreen avec modal
- [x] Sauvegarder la préférence de langue dans AsyncStorage
- [x] Changement de langue en temps réel fonctionnel


## Ajout de l'Allemand (DE) - Terminé
- [x] Créer fichier de traduction locales/de.json
- [x] Ajouter l'Allemand dans i18n.ts
- [x] Ajouter l'option Deutsch dans SettingsScreen
- [x] Changement de langue vers l'Allemand fonctionnel


## Implémentation Calendrier (terminé ✅)
- [x] Analyser le code du Calendrier web
- [x] Créer CalendarScreen avec vue mois
- [x] Implémenter ajout d'événement (modal complet)
- [x] Implémenter modification d'événement (modal complet)
- [x] Implémenter suppression d'événement
- [x] Intégrer requêtes tRPC (events.list, events.create, events.update, events.delete)
- [x] Ajouter catégories avec icônes et couleurs (6 catégories)
- [x] Highlight du jour actuel (bordure violette)
- [x] Affichage heures précises (HH:mm)
- [x] Système de rappels (5min, 15min défaut, 30min, 1h, 2h, 1 jour)
- [x] Option privé (🔒)
- [x] Support multilingue (FR/EN/DE)
- [ ] Tester toutes les fonctionnalités


## Bug swipe navigation - Worklet error
- [x] Corriger l'erreur "Tried to synchronously call a non-worklet function getNextScreen"
- [x] Marquer getNextScreen et getPreviousScreen comme 'worklet' pour React Native Reanimated
- [ ] Tester le swipe gauche/droite après correction


## Problèmes UI/UX à corriger
- [x] LoginScreen : Carte commence trop haut, doit commencer après la safe zone (ajout padding-top: 60)
- [x] Swipe navigation saccadé et lent (amélioration avec withSpring)
- [x] Scroll vertical bloqué par le SwipeNavigator (détection horizontal vs vertical)
- [x] Différencier swipe horizontal (navigation) vs vertical (scroll) (activeOffsetX + failOffsetY)
- [ ] Tester les corrections


## Amélioration swipe navigation (version optimisée)
- [x] Augmenter seuil à 50% pour éviter navigations accidentelles
- [x] Augmenter vélocité threshold à 1200 pour swipes intentionnels
- [x] Ajouter rubber band effect (limite à 70% de l'écran)
- [x] Améliorer animation withSpring (damping: 25, stiffness: 120)
- [x] Ratio plus strict pour détection horizontale (2x au lieu de 1.5x)
- [x] Augmenter activeOffsetX à 15px et failOffsetY à 25px
- [ ] Tester la nouvelle version


## Refonte architecture : Header fixe + Swipe fluide (comme WebView)
- [x] Analyser structure actuelle AppNavigator
- [x] Créer composant FixedHeaderLayout avec header en haut
- [x] Extraire le header du Drawer Navigator (headerShown: false)
- [x] Créer zone de contenu swipable en dessous du header
- [x] Adapter SwipeNavigator pour fonctionner avec le nouveau layout
- [x] Garder le Drawer (menu hamburger) fonctionnel
- [ ] Tester navigation swipe avec header fixe
- [ ] Tester que tous les écrans fonctionnent correctement


## Header fixe complet comme WebView
- [x] Créer composant RichHeader avec layout complet
- [x] Ajouter avatar + nom utilisateur (récupéré via tRPC)
- [x] Intégrer menu hamburger dans le header
- [x] Déplacer Actions Rapides depuis Dashboard vers header (modal)
- [x] Implémenter onglet Notifications avec badge (nombre non lues)
- [x] Ajouter toggle mode sombre (clair/sombre)
- [x] Ajouter bouton déconnexion avec icône
- [x] Supprimer titre du header (garder uniquement dans contenu pages)
- [ ] Tester que le header reste fixe pendant swipe
- [ ] Vérifier responsive et safe area
