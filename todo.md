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


## Corrections design header (urgent)
- [x] Mettre tout le header sur 1 seule ligne (pas 2)
- [x] Remplacer texte "dashboard.quickActions" par juste icône flash
- [x] Réduire taille avatar (32px au lieu de 40px)
- [x] Optimiser espacements et padding
- [x] Corriger chargement du nom utilisateur (placeholder "Utilisateur")
- [x] Rendre le header plus compact et élégant


## Corrections safe zone et duplication (urgent)
- [x] Vérifier SafeAreaView dans FixedHeaderLayout
- [x] Header doit commencer sous la barre de statut (fond violet sur SafeAreaView)
- [x] Supprimer header utilisateur de DashboardScreen (avatar + nom + famille)
- [x] Garder uniquement titre "Accueil" et widgets dans Dashboard
- [x] Vérifier que le nom n'apparaît qu'une fois (dans header fixe)


## Correction header safe zone (urgent)
- [x] Utiliser SafeAreaView uniquement pour la zone de statut (fond violet)
- [x] Header commence APRÈS la safe zone (pas dedans)
- [x] Safe zone vide avec fond violet
- [x] Header fixe en dessous de la safe zone


## Optimisation swipe fluide (pre-loading + lazy loading)
- [x] Désactiver lazy loading dans Drawer Navigator (lazy={false})
- [x] Optimiser animation swipe avec withTiming au lieu de withSpring
- [x] Réduire seuil de swipe (30% au lieu de 50%)
- [x] Réduire velocity threshold (800 au lieu de 1200)
- [x] Animation plus rapide (250ms au lieu de spring)
- [x] Garder les pages en cache (pas de unmount)
- [ ] Tester fluidité du swipe horizontal


## Transition fondu entre pages (cross-fade)
- [x] Implémenter fade out de la page actuelle pendant swipe
- [x] Implémenter fade in de la page suivante pendant swipe
- [x] Ajouter opacity animée basée sur translateX (interpolate)
- [x] Transition douce comme WebView (pas de changement brusque)
- [x] Duration 300ms (0.3s) comme préférence utilisateur
- [ ] Tester que le texte ne "saute" plus


## Correction transition après fade out
- [x] Éliminer réapparition brève de la page après fade out
- [x] Ajouter délai avant reset translateX (50ms pour montage nouvelle page)
- [x] Corriger sursaut au premier swipe (isTransitioning state)
- [x] Garder opacity à 0 pendant changement de page (>90% translateX)
- [x] Bloquer swipe pendant transition
- [ ] Transition fluide sans artefacts visuels


## Séparation header et correction swipe bloqué (CRITIQUE)
- [x] Déplacer RichHeader EN DEHORS de SwipeNavigator (dans FixedHeaderLayout)
- [x] Header doit être TOUJOURS fixe (ne jamais bouger pendant swipe)
- [x] Seul le contenu doit swiper (pas le header)
- [x] Corriger bug swipe bloqué après un tour complet
- [x] Corriger logique isTransitioning (reset via useEffect)
- [x] Bloquer swipe pendant transition (onStart + onUpdate)
- [ ] Tester que header ne bouge plus pendant swipe


## Migration vers PagerView (swipe natif fluide)
- [x] Installer react-native-pager-view
- [x] Créer PagerNavigator avec toutes les 13 pages
- [x] Remplacer SwipeNavigator par PagerView
- [x] Synchroniser PagerView avec Drawer Navigator (useNavigationState)
- [x] Header reste fixe (en dehors de PagerView)
- [x] Toutes les pages restent montées (offscreenPageLimit=1)
- [ ] Tester swipe fluide sans sursaut
- [ ] Tester swipe infini (pas de blocage)


## Refonte architecture drawer + PagerView (STABLE)
- [x] Créer CustomDrawerContent avec liste des 13 pages
- [x] 1 seul écran Drawer "Home" (pas 13)
- [x] PagerView à l'intérieur du Drawer avec ref
- [x] Clic drawer → setPage() instantané (pas d'animation)
- [x] Swipe → Animation fluide PagerView
- [x] Synchronisation drawer/PagerView stable (ref partagée)
- [x] Header fixe (ne bouge jamais)
- [ ] Tester navigation drawer + swipe


## Corrections finales swipe + menu
- [x] Corriger synchronisation pagerRef dans CustomDrawerContent (handlePageSelect)
- [x] Activer liens menu hamburger (tous les onglets cliquables)
- [x] Nettoyer code AppNavigator (PAGES array)
- [x] Ajouter console.log pour debug menu
- [ ] Tester navigation menu hamburger
- [ ] Note: Swipe circulaire pas supporté nativement par PagerView (limitation)


## Refonte complète navigation + Dashboard

### Navigation (Swipe circulaire + Menu)
- [x] Installer react-native-reanimated-carousel
- [x] Remplacer PagerView par Carousel avec loop infini
- [x] Configurer carousel pour 13 pages circulaires
- [x] Carousel avec loop=true (swipe circulaire natif)
- [x] Améliorer sensibilité menu hamburger (activeOpacity=0.7 + hitSlop 10px)
- [ ] Tester swipe circulaire (page 13 → page 1)

### Dashboard - Page d'accueil
- [x] Récupérer nom utilisateur via tRPC (afficher dans header - Déjà fait dans RichHeader)
- [ ] Actions rapides → Fonctionnement identique bouton + WebView (TODO)
- [x] Enlever barre raccourcis (favorites bar supprimée)
- [x] Résumé du jour : Ajouter liens cliquables (TouchableOpacity)
  - [x] Événements → Onglet Calendrier
  - [x] Tâches → Onglet Tâches
  - [x] Messages → Onglet Messages
- [x] Enlever section "Tâches récentes" (supprimée)
- [x] Garder aperçu événements du jour (todayEventsList)
- [x] Ajouter aperçu 3 prochains anniversaires à venir (slice(0, 3))


## Amélioration transition swipe (Option 4)
- [x] Ajouter effet de fondu (opacity) pendant le swipe (customAnimation)
- [x] ~~Ajouter mode parallax pour effet de profondeur~~ (retiré car chevauchement)
- [x] ~~Ajouter léger zoom (scale 0.95) pendant transition~~ (retiré car chevauchement)
- [x] Retour au swipe horizontal classique avec fade léger (opacity 0.3)
- [x] Optimiser animation pour masquer freinage à 75%
- [ ] Tester transition ultra-douce comme WebView

## Amélioration transition swipe - Slide vertical avec fondu (comme WebView)
- [x] Remplacer translateX par translateY (slide de bas en haut)
- [x] Page actuelle : fade out pendant swipe (opacity 0.6)
- [x] Nouvelle page : entre par le bas avec fade in (translateY 30%)
- [x] Ajouter léger zoom (scale 0.1) pour effet de profondeur
- [x] Éliminer complètement le freinage/accroc en fin de transition
- [ ] Tester transition ultra-douce comme WebView

## Bug chevauchement pages + freinage persistant
- [x] Transition verticale cause chevauchement des pages (identifié)
- [x] Freinage en fin de transition toujours présent (75-100%)
- [x] Retirer customAnimation (cause chevauchement)
- [x] Utiliser animation native spring avec config optimisée
- [x] Config: damping=20, stiffness=90, mass=0.8 (ultra-fluide)
- [ ] Tester transition ultra-fluide comme WebView sans freinage

## Migration vers InfiniteSwiper personnalisé - Solution finale
- [x] Créer composant InfiniteSwiper personnalisé
- [x] Utiliser react-native-gesture-handler + reanimated (natif 60fps)
- [x] Remplacer react-native-reanimated-carousel par InfiniteSwiper
- [x] Implémenter navigation avec 3 pages en mémoire (préc, actuelle, suiv)
- [x] Swipe gauche/droite pour changer de page
- [x] Animation withTiming 250ms (ultra-fluide, pas d'accroc)
- [x] Swipe circulaire infini (page 13 → page 1, calcul modulo)
- [x] Seuil 30% ou vélocité > 500 pour déclencher swipe
- [x] activeOffsetX=20 + failOffsetY=10 (pas d'interférence drawer)
- [x] Effet fade léger pendant transition (opacity)
- [ ] Tester fluidité ultra-douce comme WebView

## Migration vers react-native-deck-swiper (bibliothèque mature)
- [x] Installer react-native-deck-swiper
- [x] Créer PageDeckSwiper wrapper pour navigation
- [x] Adapter pour navigation entre pages (pas juste cartes Tinder)
- [x] Implémenter swipe circulaire infini (3 copies des 13 pages)
- [x] Désactiver swipe vertical (horizontalSwipe only)
- [x] Configurer animation fluide (animateCardOpacity)
- [x] stackSize=3, stackSeparation=0, stackScale=0 (pas d'effet pile)
- [ ] Tester fluidité ultra-douce comme WebView
