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
