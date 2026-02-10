# Analyse comparative : Page Calendrier WebView vs React Native

## 📊 Structure WebView (Calendar.tsx)

### 1. Header
- Titre "Calendrier" avec flèches de navigation
- Bouton "Tutoriel"

### 2. Barre d'outils
- **Gauche** : Bouton "Filtres Catégories" avec dropdown (6 catégories)
- **Centre** : Bouton "Recherche" (recherche par titre, date from/to)
- **Droite** : Boutons "Export" (ICS) et "Import" (fichier ICS ou URL)

### 3. Boutons de vue (4 vues)
- **Mois** : Calendrier mensuel avec grille
- **Semaine** : Vue hebdomadaire avec heures
- **Jour** : Vue journalière avec heures
- **Agenda** : Liste des événements à venir

### 4. Catégories d'événements
- Repas 🍽️ (#f59e0b)
- Anniversaire 🎂 (#ec4899)
- Travail 💼 (#3b82f6)
- Personnel ❤️ (#ef4444)
- Sport ⚽ (#10b981)
- Autre 📅 (#6b7280)

### 5. Fonctionnalités avancées
- **Récurrence** : Aucune, Quotidien, Hebdomadaire, Mensuel, Annuel
- **Rappels** : 5min, 15min, 30min, 1h, 2h, 1 jour, 1 semaine
- **Événements privés** : Checkbox
- **Export/Import** : Format ICS
- **Recherche** : Par titre et plage de dates
- **Appui long** : Marquer une vue comme favorite

---

## 📱 Structure actuelle React Native (CalendarScreen.tsx)

### ✅ Ce qui existe
- Header avec flèches de navigation
- Vue mois uniquement (calendrier mensuel)
- 6 catégories d'événements (mêmes que WebView)
- Création/édition/suppression d'événements
- Rappels (6 options)
- Événements privés
- Connexion backend via tRPC

### ❌ Ce qui manque
- **Bouton Filtres catégories** (dropdown)
- **Bouton Recherche**
- **Boutons de vue** : Semaine, Jour, Agenda
- **Export/Import** ICS
- **Récurrence** des événements
- **Vue semaine** avec heures
- **Vue jour** avec heures
- **Vue agenda** (liste)
- **Appui long** pour favoris

---

## 🎯 Plan de refonte

### Phase 1 : Barre d'outils
1. Ajouter bouton "Filtres" avec modal de sélection catégories
2. Ajouter bouton "Recherche" avec modal de recherche
3. Ajouter boutons "Export/Import" (optionnel pour mobile)

### Phase 2 : Boutons de vue
1. Créer 4 boutons : Mois, Semaine, Jour, Agenda
2. Implémenter la vue Semaine (grille avec heures)
3. Implémenter la vue Jour (liste avec heures)
4. Implémenter la vue Agenda (liste chronologique)

### Phase 3 : Fonctionnalités avancées
1. Ajouter récurrence dans le formulaire
2. Améliorer les rappels (7 options)
3. Ajouter export ICS (optionnel)

---

## 🔌 Connexion backend

**Déjà connecté via tRPC** :
- `trpc.events.list.useQuery()` ✅
- `trpc.events.create.useMutation()` ✅
- `trpc.events.update.useMutation()` ✅
- `trpc.events.delete.useMutation()` ✅

**Backend URL** : `https://app.fri2plan.ch/api/trpc`

---

## 💡 Recommandations

1. **Priorité 1** : Boutons de vue (Mois/Semaine/Jour/Agenda)
2. **Priorité 2** : Filtres catégories
3. **Priorité 3** : Recherche
4. **Priorité 4** : Récurrence
5. **Optionnel** : Export/Import (moins utile sur mobile)
