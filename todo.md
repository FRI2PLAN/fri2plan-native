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


## CORRECTIONS URGENTES - Page Accueil

### Bugs de navigation et raccourcis
- [x] Favoris : Les raccourcis ne fonctionnent pas → corriger la navigation
- [ ] Flèches navigation droite/gauche dans PageHeader → ne fonctionnent pas (dépend de ArrowNavigator)
- [x] Carte "Tâches à faire" : Raccourci/renvoi ne fonctionne pas
- [x] Événements à venir : Rendre cliquables → navigation vers Calendrier + jour respectif
- [x] Messages : Raccourci/renvoi ne fonctionne pas
- [x] Anniversaires : Chaque ligne cliquable → navigation vers Calendrier + jour respectif

### Modifications design
- [x] Enlever le graphique de tendance de la page Accueil (le mettre dans Tâches plus tard)
- [x] Créer une carte séparée pour "Prochains anniversaires" (actuellement dans le widget)
- [x] Diminuer l'espace entre titre "Accueil" et étoile favoris de moitié (8px au lieu de 12px)

### RichHeader (App Header)
- [x] Icône Actions rapides : Doit être un "+" (15ème fois demandé !)
- [x] Dropdown Actions rapides : Tout doit être l'un sous l'autre (logo + titre "Nouveau")

### Vérifications
- [x] Compteur messages : Vérifier qu'il affiche le bon nombre (filtre isRead === 0)


## BUGS RESTANTS - Page Accueil (d'après captures d'écran)

- [ ] Flèches navigation : Icônes Ionicons ne s'affichent pas (problème de build)
- [x] Dropdown titre : "dashboard.quickActions" au lieu de "Actions rapides"
- [x] Carte Anniversaires : Présente dans le code (s'affiche si anniversaires < 30 jours)
- [x] Navigation Favoris : Code correct (onNavigate passé)
- [x] Navigation Tâches : Code correct (onNavigate passé)
- [x] Navigation Messages : Code correct (onNavigate passé)
- [ ] REBUILD APK nécessaire pour voir les icônes et tester la navigation


## ONBOARDING - Reproduction WebView

### Phase 1 : Composants de base
- [x] Créer OnboardingScreen.tsx (Modal fullscreen)
- [x] Définir ONBOARDING_STEPS (9 étapes)

### Phase 2 : UI et animations
- [x] Layout Modal avec fond semi-transparent
- [x] Barre de progression en haut
- [x] Boutons Précédent/Suivant
- [x] Indicateurs de progression (dots)
- [ ] Animations de transition entre étapes (optionnel)

### Phase 3 : Logique
- [x] Navigation entre étapes (currentStep state)
- [x] Sauvegarde AsyncStorage (hasSeenOnboarding)
- [x] Intégration dans AuthContext
- [x] Affichage automatique à la première connexion

### Phase 4 : Actions
- [x] Boutons d'action pour chaque étape
- [ ] Navigation vers pages correspondantes (TODO: implémenter)
- [x] Bouton "Terminer" sur dernière étape


## BUG URGENT - CalendarScreen

- [x] Les événements ne s'affichent pas dans le calendrier
- [x] Vérifier la requête tRPC events.list (OK)
- [x] Vérifier le filtrage par date (OK)
- [x] Vérifier l'affichage sur le calendrier (marqueurs) (OK)
- [x] Corriger handleCreateEvent : startDate + durationMinutes + isPrivate (0/1)
- [x] Corriger handleUpdateEvent : startDate + durationMinutes + isPrivate (0/1)


## AMÉLIORATION Formulaire Création Événements

### Champs manquants par rapport à WebView
- [ ] Sélecteur de date (DatePicker) au lieu de date fixe
- [ ] Attribution : Sélection des participants (membres de la famille)
- [ ] Dropdown pour le type d'événement (au lieu de boutons)
- [ ] Récurrence (quotidien, hebdomadaire, mensuel, annuel)
- [ ] Date de fin de récurrence
- [ ] Approbation requise (oui/non)

### Améliorations UI
- [ ] Utiliser des Pickers natifs React Native
- [ ] Améliorer le layout du formulaire
- [ ] Ajouter validation des champs


## BUG URGENT - Navigation

### Erreurs de navigation
- [x] Actions rapides : "Notes" n'existe pas → utiliser pageIndex au lieu de nom
- [x] Actions rapides : "Calendar" n'existe pas → utiliser pageIndex au lieu de nom
- [x] Favoris Dashboard : Navigation fonctionne (utilise déjà pageIndex)
- [x] Confusion anglais/français dans les noms de pages → résolu

### Diagnostic nécessaire
- [x] Vérifier AppNavigator : système de carousel avec index 0-12
- [x] Vérifier si navigation par nom ou par index : INDEX
- [x] Harmoniser tous les appels de navigation : QuickActionsModal corrigé
- [x] Passer onNavigate : AppNavigator → FixedHeaderLayout → QuickActionsModal


## REFONTE NAVIGATION - Swipe Circulaire avec react-native-reanimated-carousel

### Phase 1 : Nettoyage
- [x] Supprimer ArrowNavigator.tsx
- [x] Supprimer PageHeaderWithArrows.tsx  
- [x] Nettoyer les imports dans AppNavigator
- [ ] Supprimer props onPrevious/onNext des pages (si nécessaire)

### Phase 2 : Installation
- [x] Installer react-native-reanimated-carousel
- [x] Vérifier react-native-reanimated (déjà installé)
- [x] Vérifier react-native-gesture-handler (déjà installé)

### Phase 3 : Implémentation
- [x] Créer nouveau AppNavigator avec Carousel
- [x] Configuration loop=true (swipe circulaire infini)
- [x] Configuration avec bonnes pratiques :
  - [x] useRef pour carouselRef
  - [x] windowSize=3 (optimisation mémoire)
  - [x] activeOffsetX=20 (pas d'interférence drawer)
  - [x] mode="parallax" (transition fluide)
  - [x] Animations fluides avec react-native-reanimated
- [x] Intégrer FixedHeaderLayout (header fixe)
- [x] Synchroniser avec CustomDrawerContent (carouselRef.scrollTo)

### Phase 4 : Tests
- [x] Code pushé sur GitHub (commit 95b6e99)
- [ ] Tester swipe gauche/droite (nécessite rebuild APK)
- [ ] Tester swipe circulaire (page 13 → page 1)
- [ ] Tester menu hamburger
- [ ] Vérifier header fixe
- [ ] Vérifier performance (60fps)

### Bonnes pratiques appliquées
- ✅ useRef pour éviter re-renders
- ✅ FlatList au lieu de ScrollView
- ✅ react-native-reanimated pour animations
- ✅ memo pour mémoriser composants
- ✅ Math.max/Math.min pour limites
- ✅ Bibliothèque mature et testée


---

## 🚨 BUGS CRITIQUES - 11 FÉVRIER 2026 (APK commit af9511a)

### Bug 1: Titres de pages manquants ✅ CORRIGÉ
- [x] Les titres de toutes les pages ont disparu (cachés ou supprimés)
- [x] Cause: Suppression de PageHeaderWithArrows sans remplacement
- [x] Solution: Ajouter un titre Text simple dans chaque page (sous RichHeader)
- [x] Affecter: Toutes les pages sauf Dashboard
- [x] Commit: 485f3a7 - Titres ajoutés dans 11 pages

### Bug 2: Conflit de gestes Scroll vs Swipe Navigation ✅ CORRIGÉ
- [x] Quand on swipe vers le bas (scroll vertical), la page swipe horizontalement (navigation)
- [x] Le ScrollView interfère avec le Carousel (react-native-reanimated-carousel)
- [x] La page affiche "recharger" au lieu de scroller normalement
- [x] Solution: Augmenter activeOffsetX à 50px (au lieu de 20px)
- [x] Solution: Ajouter failOffsetY à 30px pour donner priorité au scroll vertical
- [x] Affecter: Toutes les pages avec ScrollView (Tâches, Messages, Calendrier, etc.)
- [x] Commit: 485f3a7 - Gestes corrigés dans AppNavigator.tsx

### Bug 3: Layout et SafeArea ⚠️ À TESTER
- [ ] Les contenus commencent trop haut (cachés derrière le RichHeader)
- [ ] Revoir la structure SafeAreaView dans chaque page
- [ ] S'assurer que le contenu commence APRÈS le RichHeader (padding-top ou margin-top)
- [ ] Note: Les titres ajoutés devraient résoudre partiellement ce problème


## 🚨 NOUVEAUX BUGS - 11 FÉVRIER 2026 (APK commit 485f3a7)

### Bug 4: Page d'accueil sans titre ✅ CORRIGÉ
- [x] DashboardScreen n'a pas de titre "Accueil" comme les autres pages
- [x] Solution: Ajouter le titre "Accueil" en haut de DashboardScreen
- [x] Commit: 4a8bfa1 - Titre "Accueil" ajouté

### Bug 5: Barre de favoris supprimée ✅ PAS UN BUG
- [x] La barre de favoris (FavoritesBar) est présente dans DashboardScreen
- [x] Fausse alerte - la barre de favoris n'a jamais été supprimée

### Bug 6: Scroll vertical ne fonctionne toujours pas ⚠️ TENTATIVE 2
- [x] Malgré activeOffsetX=50 et failOffsetY=30, le scroll reste bloqué
- [x] Le refresh ne fonctionne pas non plus
- [x] Cause identifiée: failOffsetY BLOQUE le scroll vertical au lieu de le permettre!
- [x] Tentative 1: activeOffsetX=100 + failOffsetY=10 → Échec
- [x] Tentative 2: Supprimer failOffsetY complètement + activeOffsetX=80
- [x] Commit: ac449f7 - failOffsetY supprimé
- [ ] À TESTER: Vérifier si le scroll fonctionne maintenant
- [ ] Explication: failOffsetY désactive le geste si mouvement vertical détecté (inverse de ce qu'on veut)
- [ ] Si ça ne marche toujours pas: Désactiver complètement le swipe et garder uniquement le menu


---

## 🆘 SOLUTION DE SECOURS - FlatList Circular Pager

### Contexte
Si le scroll vertical ne fonctionne toujours pas après le commit `ac449f7` (suppression de failOffsetY), une solution de secours est prête.

### Fichiers créés
- ✅ `components/CircularPager.tsx` : Composant FlatList horizontal circulaire
- ✅ `navigation/AppNavigator.flatlist.tsx` : AppNavigator avec FlatList au lieu de Carousel
- ✅ `NAVIGATION_SWITCH.md` : Documentation pour basculer entre les deux solutions

### Comment activer la solution de secours

```bash
cd /home/ubuntu/fri2plan-native-work/navigation
mv AppNavigator.tsx AppNavigator.carousel.tsx
mv AppNavigator.flatlist.tsx AppNavigator.tsx
```

Puis rebuild :
```bash
npm install
eas build --profile development --platform android
```

### Avantages de la solution FlatList
- ✅ Composant natif React Native (pas de conflit de gestes)
- ✅ Scroll vertical fonctionne sans problème
- ✅ Plus simple et plus performant
- ✅ Swipe circulaire infini avec duplication des données

### Inconvénients
- ❌ Animations moins sophistiquées que Carousel
- ❌ Pas d'effets parallax
- ❌ Transitions plus basiques

### Décision
- [ ] Tester d'abord le build actuel (ac449f7)
- [ ] Si le scroll ne fonctionne toujours pas → Activer la solution FlatList
- [ ] Si le scroll fonctionne → Garder la solution Carousel


---

## ✅ SOLUTION FLATLIST ACTIVÉE - 11 FÉVRIER 2026

### Décision
La solution de secours FlatList a été activée (Commit `2cfa230`) car le scroll vertical ne fonctionnait toujours pas avec react-native-reanimated-carousel.

### Changements effectués
- ✅ `AppNavigator.tsx` utilise maintenant `CircularPager` (FlatList)
- ✅ Ancienne version Carousel sauvegardée dans `AppNavigator.carousel.tsx`
- ✅ Swipe horizontal circulaire infini avec duplication des données
- ✅ Composant natif React Native (pas de conflit de gestes)

### Avantages
- ✅ Scroll vertical devrait fonctionner sans problème
- ✅ Swipe horizontal fonctionne avec `pagingEnabled={true}`
- ✅ Plus simple et plus performant
- ✅ Pas de dépendance externe complexe

### À tester après rebuild
- [ ] Le scroll vertical fonctionne correctement
- [ ] Le swipe horizontal fonctionne (navigation entre pages)
- [ ] Le swipe circulaire infini fonctionne (dernière page → première page)
- [ ] Le menu hamburger fonctionne toujours
- [ ] Les transitions sont fluides

### Prochaines étapes
1. Rebuild l'APK : `eas build --profile development --platform android`
2. Tester le scroll et le swipe
3. Si ça fonctionne → Garder la solution FlatList
4. Si ça ne fonctionne pas → Investiguer plus en profondeur


---

## 🎨 REFONTE COMPLÈTE PAGE ACCUEIL - 11 FÉVRIER 2026

### 1. Titres de pages ✅
- [x] Centrer les titres de toutes les pages (actuellement alignés à gauche)
- [x] Appliquer le style cohérent : `textAlign: 'center'`
- [x] 6 fichiers modifiés automatiquement

### 2. Barre de favoris ⭐ ✅
- [x] Créer nouveau composant FavoritesBar.tsx
- [x] Enlever le texte sous les icônes (garder uniquement les icônes)
- [x] Passer de 3 à 5 favoris affichés
- [x] Implémenter appui long → Ouvrir modal pour sélectionner/désélectionner un favori
- [x] Implémenter appui bref → Redirection vers la page concernée
- [x] Intégrer dans DashboardScreen
- [ ] Stocker les favoris sélectionnés (AsyncStorage pour persistance - optionnel)

### 3. Widgets Tâches et Messages côte à côte 📊
- [ ] Réorganiser en layout horizontal (50% / 50%)
- [ ] Enlever le texte superflu ("à faire aujourd'hui", etc.)
- [ ] Garder uniquement : Titre ("Tâches" ou "Messages") + Compteur
- [ ] Centrer et justifier le contenu
- [ ] Implémenter navigation au clic → Redirection vers page Tâches/Messages

### 4. Widget Événements amélioré 📅
- [ ] Ajouter toggle Jour/Semaine
- [ ] Mode Jour : Afficher événements du jour uniquement
- [ ] Mode Semaine : Afficher événements de la semaine (lundi-dimanche)
- [ ] Limiter à 3 événements visibles
- [ ] Si plus de 3 → Ajouter scroll dans le widget
- [ ] Implémenter navigation au clic → Redirection vers Calendrier sur le jour de l'événement

### 5. Nouveau widget Anniversaires 🎂
- [ ] Créer composant BirthdaysWidget
- [ ] Afficher les 3 prochains anniversaires
- [ ] Design cohérent avec les autres widgets
- [ ] Implémenter navigation au clic → Redirection vers Calendrier sur le jour de l'anniversaire
- [ ] Gérer le cas où il n'y a pas d'anniversaires à venir

### Notes techniques
- Utiliser react-native-gesture-handler pour appui long
- Navigation : Utiliser le système de navigation existant (setCurrentPage)
- Widgets : Garder le design cohérent (couleurs, bordures, padding)
- Performance : Optimiser le rendu des listes (FlatList si nécessaire)


---

## 🐛 BUGS ET AMÉLIORATIONS - 11 FÉV 2026 (RETOUR UTILISATEUR)

### A. Titre "Accueil" pas centré ✅
- [x] Le titre "Accueil" est aligné à gauche au lieu d'être centré
- [x] Vérifier pourquoi le script de centrage n'a pas fonctionné pour DashboardScreen
- [x] Appliquer `textAlign: 'center'` au style pageTitle

### B. Modal favoris à améliorer ✅
- [x] Transformer la modal plein écran en menu déroulant (dropdown)
- [x] Structure souhaitée:
  * Header fixe: "Ajouter un Favoris"
  * Zone scrollable: Liste de toutes les pages avec icônes
  * Footer fixe: Bouton "Annuler"
- [x] Réduire la hauteur de la modal (60% au lieu de 80%)

### C. Navigation manquante dans FavoritesBar ✅
- [x] Implémenter la navigation quand on clique sur un favori
- [x] Utiliser onNavigate(pageIndex) pour changer de page
- [x] La navigation est déjà implémentée dans handleFavoritePress
- [x] onNavigate est bien passé depuis AppNavigator (ligne 64)

### D. Widgets Tâches et Messages ✅
- [x] Mettre les 2 widgets côte à côte (layout horizontal 50/50)
- [x] Widget Tâches: Titre "Tâches" centré + compteur + clic → navigation
- [x] Widget Messages: Titre "Messages" centré + compteur + clic → navigation
- [x] Enlever le texte superflu ("à faire aujourd'hui")

### E. Widget Événements ✅
- [x] Ajouter filtre Jour/Semaine fonctionnel
- [x] Mode Jour: Afficher événements du jour uniquement
- [x] Mode Semaine: Afficher événements de la semaine (lundi-dimanche)
- [x] Limiter à 3 événements visibles + scroll si plus
- [x] Clic sur un événement → Navigation vers Calendrier sur le jour concerné

### F. Widget Anniversaires (nouveau) ✅
- [x] Créer le widget Anniversaires
- [x] Afficher les 3 prochains anniversaires
- [x] Format: Nom + Date + Âge (si disponible)
- [x] Clic sur un anniversaire → Navigation vers Calendrier sur le jour concerné
- [x] Icône: 🎂
- [x] Widget déjà parfaitement implémenté dans DashboardScreen

### G. Navigation générale ✅
- [x] S'assurer que tous les widgets redirigent correctement vers les pages
- [x] Tous les widgets ont leur navigation implémentée (onNavigate)
- [ ] Tester la navigation depuis chaque widget sur appareil


---

## 🐛 BUGS NAVIGATION - 11 FÉV 2026 14:59

### Bugs critiques de navigation ✅
- [x] Menu hamburger : S'ouvre mais ne navigue pas quand on clique sur une page (le menu se ferme sans changer de page)
- [x] Favoris : Aucune navigation au clic (appui court ne fait rien)
- [x] Widget Tâches : Aucune navigation au clic
- [x] Widget Messages : Aucune navigation au clic
- [x] Widget Événements : Aucune navigation au clic sur un événement
- [x] Swipe gauche/droite fonctionne correctement ✅
- [x] Solution : useEffect dans CircularPager pour écouter initialIndex

### Problème d'affichage ✅
- [x] Widget Anniversaires : Invisible (ne s'affiche pas sur la page Accueil)
- [x] Solution : Toujours afficher le widget, même si vide avec message

### Améliorations texte/design ✅
- [x] Changer "Événements à venir" en "Événements" (car mode semaine inclut passé)
- [x] Réduire la taille des widgets Tâches et Messages (padding 12, minHeight 100)
- [x] Améliorer le texte des widgets Tâches et Messages ('Tâches du jour', 'Messages non lus')
- [x] Réduire taille icônes (24px), police titre (12px), compteur (28px)

### Diagnostic
- Swipe fonctionne → CircularPager OK
- Menu hamburger ne log plus rien → Fonction navigation pas appelée
- Problème probable : Synchronisation Drawer ↔ CircularPager cassée


---

## 🎨 AMÉLIORATIONS UX NAVIGATION - 11 FÉV 2026 15:30

### Navigation icône utilisateur
- [ ] Clic sur icône/nom utilisateur dans header → Navigation vers page Accueil

### Transition fade pour masquer défilement
- [ ] Ajouter fade out/in lors de la navigation (hamburger, favoris, widgets)
- [ ] Masquer le défilement rapide des pages intermédiaires
- [ ] Durée transition: 0.3s (cohérence UI)

### Optimisation rechargement circulaire
- [ ] Corriger le rechargement visible page 13→1 et 1→13
- [ ] Optimiser le "saut" du système circulaire

### Problèmes identifiés
- ❌ Défilement rapide visible quand on clique (pas élégant)
- ❌ Rechargement complet visible en boucle circulaire 13↔1
- ❌ Icône utilisateur non cliquable


---

## 🚀 FONCTIONNALITÉS FUTURES - TÂCHES

### Système de niveaux d'urgence (comme webview)
- [ ] 3 niveaux de tâches : Urgent, Moyen, Normal
- [ ] Couleur de carte selon niveau d'urgence
  - Rouge : Urgent
  - Orange/Jaune : Moyen
  - Vert : Normal

### Carte spéciale tâches urgentes déléguées
- [ ] Carte rouge dédiée sur l'Accueil
- [ ] Afficher uniquement les tâches urgentes déléguées à quelqu'un
- [ ] Alerte visuelle forte (rouge vif)

### Intégration Dashboard
- [ ] Widget Tâches : Couleur dynamique selon urgence des tâches en cours
- [ ] Compteur par niveau d'urgence (optionnel)
- [ ] Filtre rapide par niveau d'urgence

### Notes de conception
- Inspiration : Système webview avec 3 niveaux
- Priorité : Tâches urgentes déléguées (carte rouge)
- Design : Cohérence avec le système de couleurs actuel


---

## 📅 PLAN COMPLET - AMÉLIORATION CALENDRIER

### Phase 1 : Vues multiples (PRIORITÉ HAUTE) 🎯
**Objectif :** Offrir 4 modes de visualisation

#### A. Toggle vues (header)
- [x] Ajouter toggle 4 options : Mois / Semaine / Jour / Agenda
- [x] Design : Onglets horizontaux scrollables
- [x] Persistance : Sauvegarder la vue préférée (AsyncStorage)

#### B. Vue Mois (déjà présente) ✅
- [x] Grille calendrier classique
- [ ] Améliorer : Highlight jour actuel (cercle violet)
- [ ] Améliorer : Indicateurs visuels événements (points colorés)

#### C. Vue Semaine (à créer)
- [ ] 7 colonnes (Lun-Dim)
- [ ] Timeline horaire verticale (00h-23h)
- [ ] Événements positionnés selon heure de début
- [ ] Scroll vertical pour naviguer dans les heures
- [ ] Swipe horizontal pour changer de semaine

#### D. Vue Jour (✅ créée)
- [x] Une seule colonne
- [x] Timeline horaire détaillée (00h-23h, par tranches de 30min)
- [x] Événements empilés avec durée visuelle (hauteur dynamique)
- [x] Scroll vertical pour naviguer dans la journée
- [x] Navigation flèches pour changer de jour
- [x] Affichage "Aujourd'hui" si jour actuel

#### E. Vue Agenda (✅ créée)
- [x] Liste scrollable d'événements à venir
- [x] Groupement par jour (headers de date)
- [x] Format : Date + Heure (HH:mm) + Titre + Catégorie (icône + couleur)
- [x] Filtre événements futurs uniquement
- [x] Clic sur événement → Modal détails/modification

---

### Phase 2 : Améliorations visuelles (PRIORITÉ HAUTE) 🎨

#### A. Highlight jour actuel
- [ ] Vue Mois : Cercle violet autour de la date
- [ ] Vue Semaine : Colonne avec fond légèrement coloré
- [ ] Vue Jour : Indicateur "Aujourd'hui" en haut
- [ ] Vue Agenda : Header "Aujourd'hui" en violet

#### B. Indicateurs événements
- [ ] Vue Mois : Points colorés sous les dates (max 3 visibles)
- [ ] Couleur selon catégorie événement
- [ ] Si plus de 3 événements : "+X" en gris

#### C. Affichage heures précises
- [ ] Toujours afficher minutes (HH:mm) pas seulement HH:00
- [ ] Format 24h
- [ ] Cohérence dans toutes les vues

---

### Phase 3 : Filtres et recherche (PRIORITÉ MOYENNE) 🔍

#### A. Filtres par catégorie
- [ ] Bouton "Filtres" dans header
- [ ] Modal avec checkboxes pour chaque catégorie
  - [ ] 🍽️ Repas
  - [ ] 🎂 Anniversaire
  - [ ] 💼 Travail
  - [ ] ❤️ Personnel
  - [ ] ⚽ Sport
  - [ ] 📅 Autre
- [ ] Appliquer filtres à toutes les vues
- [ ] Persistance des filtres sélectionnés

#### B. Filtre événements privés
- [ ] Toggle "Afficher événements privés" (si user a accès)
- [ ] Par défaut : Afficher tous les événements

#### C. Recherche événements
- [ ] Barre de recherche dans header
- [ ] Recherche par titre/description
- [ ] Résultats en vue Agenda

---

### Phase 4 : Anniversaires automatiques (PRIORITÉ MOYENNE) 🎂

#### A. Synchronisation membres famille
- [ ] Détecter membres avec date de naissance renseignée
- [ ] Créer automatiquement événements anniversaire annuels
- [ ] Catégorie : Anniversaire (🎂)
- [ ] Titre : "Anniversaire de [Prénom]"
- [ ] Rappel : 1 jour avant (par défaut)

#### B. Gestion anniversaires
- [ ] Événements anniversaire marqués comme "automatiques"
- [ ] Modification possible (titre, rappel)
- [ ] Suppression = masquer (pas supprimer définitivement)
- [ ] Réapparaître chaque année

#### C. Widget Dashboard
- [ ] Afficher prochains anniversaires (déjà présent)
- [ ] Clic → Navigation vers Calendrier sur le jour de l'anniversaire

---

### Phase 5 : Import calendrier externe (PRIORITÉ BASSE) 📥

#### A. Import URL (ICS/iCal)
- [ ] Paramètres → "Importer calendrier externe"
- [ ] Input URL calendrier (Google Calendar, Outlook, etc.)
- [ ] Validation format ICS
- [ ] Import événements dans base de données

#### B. Synchronisation
- [ ] Option "Synchroniser automatiquement" (quotidien)
- [ ] Marquer événements importés comme "externes"
- [ ] Événements externes en lecture seule (pas modifiables)

#### C. Gestion imports
- [ ] Liste calendriers importés
- [ ] Supprimer un calendrier importé
- [ ] Rafraîchir manuellement

---

### Phase 6 : Améliorations UX (PRIORITÉ BASSE) ✨

#### A. Création rapide événement
- [ ] Appui long sur une date → Créer événement
- [ ] Pré-remplir date/heure selon vue
- [ ] Modal création simplifiée

#### B. Drag & Drop (optionnel)
- [ ] Vue Semaine/Jour : Déplacer événement par drag
- [ ] Modifier heure de début en glissant
- [ ] Confirmation avant sauvegarde

#### C. Notifications intelligentes
- [ ] Rappels configurables par défaut (Paramètres)
- [ ] Appliquer rétroactivement aux événements existants
- [ ] Résumé quotidien par email (optionnel)

---

### Phase 7 : Calendrier intime (FONCTIONNALITÉ FUTURE) 🔒

**Note :** Réservé pour plus tard, activation depuis Paramètres

#### A. Activation
- [ ] Paramètres → "Calendrier intime"
- [ ] Popup consentement (Accept/Refuse)
- [ ] Si refuse → Désactiver automatiquement
- [ ] Disponible uniquement si user est femme

#### B. Fonctionnalités
- [ ] Suivi cycles menstruels
- [ ] Prédictions périodes futures
- [ ] Historique modifiable/supprimable
- [ ] Données 100% privées (pas partagées famille)

#### C. Intégration
- [ ] Apparaît comme page supplémentaire dans navigation
- [ ] Icône dédiée dans menu hamburger
- [ ] Notifications rappel début cycle

---

## 🎯 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Sprint 1 (Essentiel)
1. Highlight jour actuel (vue Mois)
2. Toggle vues (Mois/Semaine/Jour/Agenda)
3. Vue Agenda (liste scrollable)

### Sprint 2 (Important)
4. Vue Semaine (timeline + 7 colonnes)
5. Vue Jour (timeline détaillée)
6. Indicateurs événements (points colorés)

### Sprint 3 (Utile)
7. Filtres par catégorie
8. Anniversaires automatiques
9. Affichage heures précises (HH:mm)

### Sprint 4 (Bonus)
10. Import calendrier externe
11. Recherche événements
12. Création rapide (appui long)

### Sprint 5 (Futur)
13. Calendrier intime (si demandé)

---

## 📝 NOTES TECHNIQUES

### Librairies recommandées
- `react-native-calendars` : Vues calendrier avancées
- `date-fns` : Manipulation dates (déjà présent ✅)
- `react-native-gesture-handler` : Drag & Drop (optionnel)

### Structure fichiers
```
screens/
  CalendarScreen.tsx (vue principale)
  CalendarMonthView.tsx
  CalendarWeekView.tsx
  CalendarDayView.tsx
  CalendarAgendaView.tsx
components/
  EventCard.tsx
  EventModal.tsx
  CategoryFilter.tsx
```

### Base de données
- Table `events` (déjà présente ✅)
- Ajouter champs :
  - `isAutomatic` (boolean) - Pour anniversaires auto
  - `isExternal` (boolean) - Pour imports externes
  - `externalCalendarId` (string) - Lien calendrier source


---

## 🚀 SPRINT 1 - EN COURS

### Corrections immédiates
- [ ] Highlight jour actuel : Fond violet + texte BLANC (pas violet sur violet)
- [ ] Dark mode : Fond sombre + cases grises + texte blanc/beige clair
- [ ] Vérifier traductions FR/EN/DE complètes

### Implémentation
- [ ] Toggle vues (Mois/Semaine/Jour/Agenda)
- [ ] Vue Agenda (liste scrollable)


---

## 🚀 SPRINT 2 - VUES MULTIPLES (Spécifications validées)

### 1. Toggle vues (4 onglets symétriques)
- [ ] Créer composant TabBar avec 4 onglets : Mois | Semaine | Jour | Agenda
- [ ] Positionner en haut du calendrier
- [ ] Style cohérent avec onglets Jour/Semaine du Dashboard
- [ ] État actif visible (fond violet)

### 2. Vue Semaine (Verticale scrollable)
- [ ] Affichage vertical : 7 jours empilés
- [ ] Chaque jour = une section
- [ ] Événements multiples par jour affichés en liste
- [ ] Scroll vertical pour naviguer dans la semaine
- [ ] Header : "Semaine du [date début] au [date fin]"

### 3. Vue Jour (Timeline demi-heure)
- [ ] Timeline verticale : 00:00 → 23:59
- [ ] Créneaux de 30 minutes (48 créneaux/jour)
- [ ] Événements positionnés selon heure de début
- [ ] Hauteur événement = durée
- [ ] Scroll vertical pour voir toute la journée
- [ ] Header : "[Jour] [Date complète]"

### 4. Vue Agenda (Liste groupée par jour)
- [ ] Liste scrollable d'événements
- [ ] Groupement par jour : **Lundi 11 Février 2026**
- [ ] Sous chaque jour : liste des événements
- [ ] Format événement : Heure | Titre | Catégorie (icône colorée)
- [ ] Afficher les 30 prochains jours avec événements
- [ ] Message si aucun événement : "Aucun événement à venir"

### 5. Logique de navigation
- [ ] Clic sur onglet → Change de vue
- [ ] Conserver la date sélectionnée entre les vues
- [ ] Vue Mois : clic sur jour → passe en Vue Jour sur ce jour
- [ ] Vue Semaine : clic sur jour → passe en Vue Jour sur ce jour
- [ ] Vue Agenda : clic sur événement → ouvre modal détails

### 6. Responsive & Performance
- [ ] Optimiser le rendu (VirtualizedList pour Agenda)
- [ ] Transitions fluides entre vues
- [ ] Dark mode pour toutes les vues
- [ ] Traductions FR/EN/DE pour tous les textes

---

**Ordre d'implémentation Sprint 2 :**
1. Toggle 4 onglets (structure de base)
2. Vue Agenda (la plus simple)
3. Vue Semaine (verticale)
4. Vue Jour (timeline demi-heure)
5. Logique navigation entre vues
6. Optimisations finales


## 📋 AMÉLIORATION PAGE TÂCHES - Plan complet

### Analyse comparative React Native vs PWA

**✅ Fonctionnalités présentes dans React Native :**
- Liste des tâches avec scroll
- 3 filtres : Toutes / En cours / Terminées
- Recherche par titre
- Pull-to-refresh
- 3 niveaux de priorité : Urgent (rouge) / Moyen (orange) / Faible (vert)
- 3 statuts : À faire / En cours / Terminée
- Date d'échéance
- Points (récompenses)
- Checkbox pour marquer comme terminée
- Description

**❌ Fonctionnalités manquantes (présentes dans PWA) :**
- Système "Favori" (filtre par favoris + long press pour marquer onglet favori)
- 4ème filtre : "Mes tâches" (assignées à moi)
- Délégation (assigner à un membre)
- Création de tâches (formulaire complet)
- Modification de tâches (dialog avec tous les champs)
- Suppression de tâches (bouton avec confirmation)
- Récurrence (none/daily/weekly/monthly/yearly)
- 4 niveaux de priorité (au lieu de 3) : 🔴 Urgent / 🟠 Haute / 🟡 Moyenne / 🟢 Faible
- Privé/Public (checkbox visibilité)
- Dark mode (ThemedBackground + styles dynamiques)
- Titre centré (PageTitleWithNavigation)
- Bouton "Nouvelle tâche" pour créer
- Dialog détails tâche (avec changement statut direct)
- Tutoriel interactif (bouton "?")
- Date + Heure d'échéance (pas juste date)
- Sauvegarde onglet favori en DB (tasksSelectedList)

### Sprint 1 : Fondations et Dark Mode ✅
**Objectif :** Préparer la base et ajouter le dark mode

- [x] Ajouter dark mode avec useColorScheme()
- [x] Créer fonction getStyles(isDark: boolean) pour styles dynamiques
- [x] Adapter tous les styles existants (backgroundColor, textColor, borderColor)
- [ ] Tester light mode et dark mode
- [x] Centrer le titre "Tâches" (textAlign: 'center')

### Sprint 2 : Création de tâches (formulaire complet)
**Objectif :** Implémenter le formulaire de création avec tous les champs

- [x] Créer state pour dialog création (createDialogOpen)
- [x] Créer formData state avec tous les champs :
  - title (string, requis)
  - description (string, optionnel)
  - assignedTo (number | undefined, dropdown membres)
  - dueDate (Date | undefined)
  - dueTime (string, format HH:MM)
  - recurrence (none/daily/weekly/monthly/yearly)
  - points (number, défaut 10)
  - priority (urgent/high/medium/low au lieu de high/medium/low)
  - isPrivate (boolean)
- [x] Créer bouton "Nouvelle tâche" (violet, avec icône Plus)
- [x] Créer Modal/Dialog avec formulaire complet
- [x] Implémenter picker pour "Assigner à" (récupérer membres via tRPC)
- [x] Implémenter DateTimePicker pour date + heure
- [x] Implémenter picker pour récurrence (5 options)
- [x] Implémenter picker pour priorité (4 niveaux avec emojis)
- [x] Ajouter checkbox "Privé" (Switch)
- [x] Connecter à trpc.tasks.create.useMutation
- [x] Gérer validation (titre requis)
- [x] Afficher Alert succès/erreur
- [ ] Tester création complète

### Sprint 3 : Modification et Suppression
**Objectif :** Permettre édition et suppression des tâches

- [x] Créer state selectedTask pour stocker tâche sélectionnée
- [x] Créer state detailDialogOpen pour dialog détails
- [x] Rendre les tâches cliquables (onPress → ouvrir détails)
- [x] Créer Dialog détails avec :
  - Titre et description
  - Statut
  - Date d'échéance
  - Points
  - Bouton "Modifier"
  - Bouton "Supprimer" (rouge)
- [x] Créer state editFormData pour formulaire modification
- [x] Créer state isEditing pour dialog modification
- [x] Créer Dialog modification (formulaire simplifié, pré-rempli)
- [x] Connecter à trpc.tasks.update.useMutation
- [x] Connecter à trpc.tasks.delete.useMutation
- [x] Ajouter confirmation avant suppression (Alert)
- [ ] Tester modification et suppression

### Sprint 4 : Filtres avancés et Système Favori
**Objectif :** Ajouter filtre "Mes tâches" et système favori

- [x] Ajouter 4ème filtre "Mes tâches" (tasks assignées à currentUser)
- [ ] Récupérer currentUser via trpc.auth.me.useQuery() - TODO
- [x] Créer state favoriteFilter
- [x] Implémenter long press sur onglets (500ms)
- [ ] Ajouter animation progression long press (barre ou cercle) - TODO
- [x] Marquer onglet comme favori (étoile ⭐)
- [ ] Sauvegarder favori en AsyncStorage - TODO
- [ ] Charger onglet favori au démarrage - TODO
- [ ] Afficher tooltip explicatif première fois (5 secondes) - TODO
- [ ] Tester système favori complet

### Sprint 5 : Récurrence et Date/Heure
**Objectif :** Implémenter récurrence et sélection heure

- [x] Ajouter champ recurrence dans formulaire création (déjà fait Sprint 2)
- [x] Ajouter champ recurrence dans formulaire modification (déjà fait Sprint 3)
- [x] Créer picker récurrence (5 options avec emojis) (déjà fait Sprint 2)
- [x] Implémenter DateTimePicker natif pour date + heure (déjà fait Sprint 2)
- [x] Afficher heure dans liste tâches (format HH:mm) (déjà fait Sprint 2)
- [x] Récurrence et date/heure complètement implémentés

### Sprint 6 : 4 niveaux de priorité
**Objectif :** Passer de 3 à 4 niveaux de priorité (✅ Déjà implémenté Sprint 2)

- [ ] Modifier type priority : "urgent" | "high" | "medium" | "low"
- [ ] Modifier getPriorityColor() pour 4 niveaux :
  - urgent: #dc2626 (rouge foncé) 🔴
  - high: #f59e0b (orange) 🟠
  - medium: #fbbf24 (jaune) 🟡
  - low: #10b981 (vert) 🟢
- [ ] Modifier getPriorityLabel() pour 4 niveaux
- [ ] Mettre à jour picker priorité (4 options avec emojis)
- [ ] Tester affichage 4 niveau### Sprint 7 : Tutoriel et Polissage final
**Objectif :** Ajouter tutoriel interactif et finaliser

- [x] Créer modal Tutorial
- [x] Ajouter bouton "?" dans header (cercle violet)
- [x] Créer 4 étapes tutoriel :
  - [x] Création tâche (10 champs)
  - [x] Filtres (4 onglets)
  - [x] Système favori (long press 500ms)
  - [x] Modification/Suppression
- [x] Navigation Précédent/Suivant/Terminé
- [x] Progress indicator (1/4, 2/4, etc.)
- [x] Dark mode complet
- [ ] Sauvegarder "tutoriel vu" dans AsyncStorage - TODO
- [ ] Afficher automatiquement au premier lancement - TODO techniques importantes :

**Composants React Native à utiliser :**
- Modal ou Dialog natif pour formulaires
- Picker ou Select pour dropdowns
- DateTimePicker (@react-native-community/datetimepicker)
- Switch pour checkbox Privé
- TouchableOpacity pour boutons et long press
- ActivityIndicator pour loading
- RefreshControl pour pull-to-refresh

**Mutations tRPC à utiliser :**
- trpc.tasks.create.useMutation()
- trpc.tasks.update.useMutation()
- trpc.tasks.delete.useMutation()
- trpc.tasks.complete.useMutation()
- trpc.family.members.useQuery() (pour dropdown assignation)
- trpc.auth.me.useQuery() (pour "Mes tâches")

**Stockage local :**
- AsyncStorage pour favoriteTab
- AsyncStorage pour "tutoriel vu"

**Ordre de priorité recommandé :**
1. Sprint 1 (Dark mode) - Base visuelle
2. Sprint 2 (Création) - Fonctionnalité critique
3. Sprint 3 (Modification/Suppression) - Fonctionnalité critique
4. Sprint 6 (4 niveaux priorité) - Amélioration rapide
5. Sprint 4 (Filtres + Favori) - UX avancée
6. Sprint 5 (Récurrence) - Feature avancée
7. Sprint 7 (Tutoriel) - Polissage final


## 🌙 CORRECTION DARK MODE CALENDRIER - Sprint 1 Tâches

**Problème :** Le Calendrier restait en mode clair même avec dark mode activé

**Cause :** pageTitleContainer avait backgroundColor fixé en '#fff' (ligne 603)

**Solution appliquée :**
- [x] Corriger pageTitleContainer backgroundColor : `isDark ? '#1f2937' : '#fff'`
- [x] Corriger borderBottomColor : `isDark ? '#374151' : '#e5e7eb'`

**Résultat attendu :**
- Fond noir (#000000) en dark mode
- Header gris foncé (#1f2937)
- Cases grises (#1a1a1a)
- Texte blanc (#ffffff)
- Couleurs conservées (violet pour jour actuel)



## 🌙 CORRECTION DARK MODE URGENT - TOUTES LES PAGES

**Problème :** Dark mode pas assez contrasté, cartes et texte peu visibles

**Nouvelle palette dark mode (stricte) :**
- [ ] Fond écran : #000000 (noir pur)
- [ ] Cartes/Containers principaux : #2a2a2a (gris clair visible)
- [ ] Cartes secondaires/Headers : #1f2937 (gris moyen)
- [ ] Bordures : #374151 (gris bordure)
- [ ] Texte principal : #ffffff (blanc pur)
- [ ] Texte secondaire : #d1d5db (gris très clair)
- [ ] Inputs fond : #374151 (gris foncé)
- [ ] Inputs texte : #ffffff (blanc)
- [ ] Accents violet : #7c3aed (conservé)

**Pages à corriger :**
- [ ] CalendarScreen.tsx
- [ ] TasksScreen.tsx
- [ ] HomeScreen.tsx
- [ ] ProfileScreen.tsx
- [ ] FamilyScreen.tsx
- [ ] Toutes les autres pages

**Règle stricte :** 
- Fond noir #000000
- Cartes grises #2a2a2a
- Texte blanc #ffffff
- Contraste élevé partout


## 🎨 CONTEXT GLOBAL DARK MODE

**Objectif :** Créer un Context global pour gérer le dark mode dans toute l'app

- [ ] Créer contexts/ThemeContext.tsx
- [ ] State darkMode (boolean)
- [ ] AsyncStorage persistance (clé: 'dark_mode_enabled')
- [ ] Hook useTheme() pour accès facile
- [ ] Wrapper App.tsx avec ThemeProvider
- [ ] Modifier tous les écrans :
  - [ ] CalendarScreen.tsx
  - [ ] TasksScreen.tsx
  - [ ] HomeScreen.tsx
  - [ ] SettingsScreen.tsx
  - [ ] ProfileScreen.tsx
  - [ ] FamilyScreen.tsx
  - [ ] Tous les autres écrans
- [ ] Connecter toggle SettingsScreen au Context
- [ ] Tester changement dark mode en temps réel

## Import ICS - Corrections
- [x] Corriger l'import des événements multi-jours (Olympic day manquant)
- [x] Corriger le bouton "Annuler" qui n'annule pas l'import en cours
- [x] Agrandir la fenêtre de prévisualisation pour mieux intégrer les boutons

## Affichage événements
- [ ] Corriger les erreurs "Text strings must be rendered within <Text> component" (nécessite stacktrace pour identifier l'origine)

## Fonctionnalité duplication
- [x] Ajouter bouton "Dupliquer" dans modal création d'événement (entre Annuler et Enregistrer)
- [x] Ajouter bouton "Dupliquer" dans modal modification d'événement (entre Annuler et Enregistrer)
