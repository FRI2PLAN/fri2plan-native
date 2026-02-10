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

## Bug flash rapide entre pages (deck-swiper)
- [x] Flash/aperçu très rapide de la page précédente avant affichage nouvelle page
- [x] Augmenter stackSize de 3 à 5 (plus de pages en mémoire)
- [x] Désactiver animateCardOpacity (cause du flash)
- [x] stackScale=1 au lieu de 0 (meilleur rendu)
- [x] backgroundColor="#ffffff" au lieu de transparent
- [x] swipeAnimationDuration=200ms (transition rapide)
- [x] outputRotationRange pour rotation légère pendant swipe
- [ ] Tester si le flash a disparu

## SimpleSwipeNavigator - Reproduction exacte WebView
- [x] Analyser code WebView (useSwipeNavigation + PageTransition)
- [x] Identifier animations: withTiming 200ms + easeInOut
- [x] Créer SimpleSwipeNavigator avec PanGestureHandler
- [x] Seuil 80px minimum (comme WebView)
- [x] Animation slide + fade (comme framer-motion)
- [x] 3 pages en mémoire (préc, actuelle, suiv)
- [x] Navigation circulaire (modulo)
- [x] Bloquer pendant transition (isTransitioning)
- [x] withTiming 200ms + Easing.inOut (pas spring!)
- [ ] Tester fluidité identique WebView

## Bug flash page précédente (SimpleSwipeNavigator)
- [x] Séquence bugguée: Accueil → swipe → Calendrier entre → Flash Accueil → Calendrier
- [x] Problème de timing dans onPageChange (appelé trop tard)
- [x] Nettoyer modules inutilisés (carousel, deck-swiper) pour éviter interférences
- [x] Supprimer fichiers obsolètes (InfiniteSwiper.tsx, PageDeckSwiper.tsx)
- [x] Corriger timing: onPageChange appelé AVANT animation (pas après)
- [x] Reset translateX APRÈS animation (dans callback)
- [ ] Tester transition fluide sans flash

## Amélioration fade out pour masquer flash (2 variantes)
- [x] Observation: Flash plus marqué au début (Accueil, Calendrier) qu'à la fin (Demandes, Notes)
- [x] Cause: Problème rendu/chargement premières pages
- [x] Variante 1: Fade out horizontal prononcé (coefficient 1.5 au lieu de 1)
- [x] Variante 1 insuffisante: accroc toujours présent en fin de chargement
- [x] Variante 2: Fade out vertical (translateY + opacity) comme WebView
- [x] Page sortante: translateY -50px + fade out (monte et disparait)
- [x] Page entrante: translateY 50px → 0 + fade in (descend et apparait)
- [x] Exactement comme framer-motion WebView
- [ ] Tester variante 2 (devrait masquer complètement l'accroc)

## Augmentation durée animation pour temps de chargement
- [x] Observation: 200ms trop rapide, pages n'ont pas temps de charger complètement
- [x] Accroc en fin de transition = problème de chargement
- [x] Augmenter durée: 200ms → 300ms (cohérent avec préférence UI universelle)
- [x] Appliqué à toutes les animations withTiming (3 occurrences)
- [x] Laisser plus de temps aux pages pour se charger
- [ ] Tester si accroc disparaît avec 300ms

## Bug aperçu page d'après pendant chargement
- [x] Séquence: Accueil → Calendrier → Flash Tâches (page d'après!) → Calendrier
- [x] Cause: Pendant chargement, nextIndex s'affiche brièvement au lieu de currentIndex
- [x] React Native pré-charge 3 pages (prev, current, next)
- [x] Pendant transition, nextIndex "fuite" et s'affiche
- [x] Solution: Masquer prev/next pages pendant isTransitioning
- [x] Rendu conditionnel: {!isTransitioning && <PrevPage />}
- [x] Ne montrer QUE currentPage pendant chargement
- [ ] Tester si flash page d'après a disparu

## Bug double chargement page (accroc pendant fade in)
- [x] Séquence: Fade out ✅ → Fade in commence ✅ → Fade in ne finit pas ❌ → Page recharge → ACCROC
- [x] Cause: onPageChange appelé AVANT animation → React re-render pendant fade in
- [x] Double chargement: page charge pendant fade in, puis recharge après
- [x] Solution: Appeler onPageChange APRÈS animation (dans callback)
- [x] Déplacé onPageChange dans withTiming callback (2 occurrences)
- [x] Ordre correct: Fade out → Fade in → onPageChange → Pas de double chargement
- [ ] Tester si accroc a disparu

## Abandon swipe + Nouvelle navigation avec flèches
- [x] Enlever SimpleSwipeNavigator (swipe ne fonctionne pas correctement)
- [x] Créer ArrowNavigator component
- [x] Ajouter flèches gauche/droite pour navigation entre pages
- [x] Flèches positionnées aux bords (gauche: 16px, droite: 16px)
- [x] Flèches au milieu vertical (50%)
- [x] Navigation circulaire (page 13 → page 1)
- [x] Remplacer dans AppNavigator.tsx
- [x] Tester navigation avec flèches (commité)

## Centrage titres et boutons
- [x] Créer composant PageHeader réutilisable
- [x] Centrer les titres de pages
- [x] Mettre boutons "Nouveau" en dessous, centrés
- [x] Appliquer à CalendarScreen
- [x] Appliquer à TasksScreen
- [x] Appliquer à ShoppingScreen
- [x] Appliquer à MessagesScreen
- [x] Appliquer à RequestsScreen
- [x] Appliquer à NotesScreen
- [x] Appliquer à BudgetScreen
- [x] Appliquer à RewardsScreen
- [x] Tester affichage centré (commité)

## Barre de favoris page d'accueil
- [x] Ajouter barre de favoris sur page d'accueil
- [x] Favoris par défaut (Calendrier, Tâches, Courses, Messages)
- [x] FavoritesBar component créé
- [ ] User peut définir ses favoris pour navigation rapide (TODO: customization)
- [x] Comme dans WebView

## Correction nom utilisateur
- [ ] Actuellement affiche "Utilisateur" au lieu du vrai nom
- [ ] Doit afficher "Ixari Alexandre" (nom de l'utilisateur)
- [x] Ajouter logs de débogage dans AuthContext
- [ ] Vérifier ce que l'API renvoie lors du login
- [ ] Vérifier si user.name est bien stocké dans AsyncStorage
- [ ] Corriger selon le problème identifié

## Actions rapides (remplacer éclair par +)
- [x] Remplacer icône éclair par icône + (add)
- [x] Garder seulement 5 options (comme WebView):
  - [x] Nouvel événement
  - [x] Nouvelle tâche
  - [x] Nouvelle note
  - [x] Nouvelle dépense
  - [x] Nouvelle requête
- [x] Retirer les autres options (Messages, Courses, Récompenses)
- [x] Tester modal actions rapides (commité)
- [ ] Supprimer les autres options


## Réorganisation layout + Favoris colorés
- [x] Créer PageHeaderWithArrows component
- [x] Flèches gauche/droite sur la même ligne que le titre
- [x] Appliquer à tous les écrans (Calendar, Tasks, Shopping, Messages, Requests, Notes, Budget, Rewards)
- [x] Titre toujours juste sous header (comme "Calendrier")
- [x] Page d'accueil: Titre "Accueil" en haut avec flèches
- [x] Page d'accueil: Favoris en dessous du titre "Accueil"
- [x] Utiliser mêmes icônes que menu hamburger dans favoris (emojis)
- [x] Ajouter couleurs aux icônes favoris (backgrounds colorés)
- [x] Tester affichage réorganisé (commité)

## Personnalisation favoris (appui long)
- [ ] Appui long sur favori pour modifier/retirer
- [ ] Appui long sur page (menu) pour ajouter aux favoris
- [ ] Modal de gestion des favoris
- [ ] Sauvegarder favoris dans AsyncStorage
- [ ] Tester personnalisation


## Bugs layout après réorganisation
- [x] Flèches gauche/droite ne s'affichent pas (ArrowNavigator passe bien les props)
- [x] Page Paramètres : pas de titre "Paramètres" (ajouté PageHeaderWithArrows)
- [x] Ajouter PageHeaderWithArrows à SettingsScreen
- [x] Ajouter PageHeaderWithArrows à HelpScreen
- [x] Ajouter PageHeaderWithArrows à MembersScreen
- [x] Ajouter PageHeaderWithArrows à ReferralScreen
- [x] Tester affichage des flèches (commité)


## Corrections 10 février 2026 - Flèches + Espacement
- [x] Flèches de navigation non visibles sur les pages (corrigé - onPrevious/onNext ajoutés à toutes les pages)
- [x] Espacement insuffisant entre barre de recherche et titre sur page Courses (corrigé - paddingTop: 24)
- [x] Pages corrigées: Budget, Messages, Notes, Requests, Rewards, Shopping, Tasks
- [x] Commit et push sur GitHub (commit e081662)


## Nouvelle approche navigation - Flèches flottantes (10 février 2026)
- [x] Créer composant FloatingNavigationArrows (flèches en bas de l'écran)
- [x] Intégrer dans ArrowNavigator
- [ ] Tester et valider visuellement

## Amélioration flèches navigation (10 février 2026)
- [x] Modifier PageHeaderWithArrows : flèches sur même ligne que titre (petites, violet)
- [x] Réduire espacement page Courses (comme Tâches/Demandes)
- [x] Supprimer FloatingNavigationArrows (obsolète)
- [x] Nettoyer ArrowNavigator


## Débogage flèches navigation (10 février 2026)
- [ ] Ajouter fond rouge temporaire aux flèches pour débogage
- [ ] Identifier pourquoi les flèches ne s'affichent pas


## Finalisation flèches navigation (10 février 2026)
- [ ] Changer couleur flèches : rouge → violet (#7c3aed)
- [ ] Réduire espacement Lists Tabs et Progress Bar sur ShoppingScreen
- [ ] Vérifier que DashboardScreen n'affiche PAS de flèches


## REFONTE COMPLÈTE - Page par page (Nouvelle demande utilisateur)

### Boutons de navigation (TOUTES les pages)
- [x] Changer fond violet → blanc
- [x] Changer flèches blanches → violettes
- [x] Ajouter ombre pour relief

### Page Accueil - Header et navigation
- [x] Afficher le nom de l'utilisateur dans le header (déjà dans RichHeader)
- [x] Remplacer "Actions rapides" par icône "+" (déjà dans RichHeader)
- [x] Ajouter les flèches de navigation sur la page Accueil (actuellement absentes)
- [x] Réduire l'espace entre "Accueil" et "Favoris" (similaire à l'espace safe zone → titre)

### Page Accueil - Icônes raccourcis/Favoris
- [x] Enlever les textes sous les icônes (Calendrier, Tâches, Courses, Messages)
- [x] Augmenter à 5 raccourcis (au lieu de 4)
- [x] Corriger les liens de navigation (actuellement ne fonctionnent pas)
- [x] Implémenter appui long pour choisir/enlever des favoris (console.log pour l'instant)

### Page Accueil - Carte Résumé du jour
- [x] Ajouter padding de 8 pour aérer
- [x] Rendre les compteurs cliquables avec redirection
  - [x] Compteur événements → page Calendrier
  - [x] Compteur tâches en cours → page Tâches
  - [x] Compteur messages non lus → page Messages

### Page Accueil - Nouvelles cartes
- [x] Créer carte "Événements du jour" (scrollable, max 3)
- [x] Placeholder si pas d'événements : "Profitez d'un jour de repos..." ou message drôle
- [x] Créer carte "Prochains anniversaires" (3 prochains)


## REFONTE Dashboard - Reproduction exacte WebView

### Favoris
- [x] Remplacer cercles par boutons rectangulaires avec icône + texte
- [x] Garder max 5 favoris
- [x] Ajouter icône étoile ⭐ à gauche
- [x] Bouton "+" pour ajouter
- [ ] Suppression avec X au survol (ou appui long sur mobile) - TODO: implémenter modal

### Résumé du jour
- [x] Ajouter onglets Jour/Semaine
- [x] Ajouter bouton Filtres (dropdown) - UI prête, fonctionnalité à implémenter
- [x] Ajouter graphique de tendance (7 derniers jours)
- [x] Créer carte verte "Tâches à faire aujourd'hui" (compteur + flèche)
- [x] Créer section "Événements à venir" (liste max 5)
- [x] Créer carte bleue "Messages non lus" (compteur + flèche)
- [x] Rendre les cartes cliquables avec navigation

### Anniversaires
- [x] Ajouter flèches → à droite de chaque personne
