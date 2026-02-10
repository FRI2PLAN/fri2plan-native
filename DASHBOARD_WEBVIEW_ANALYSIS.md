# Analyse de la page Accueil WebView

## Structure générale

### 1. Header (RichHeader - déjà implémenté)
- Avatar utilisateur + nom
- Icône "+" pour Actions rapides
- Notifications
- Mode sombre
- Menu hamburger

### 2. Titre avec flèches de navigation
- "Accueil" centré
- Flèches < > de chaque côté (blanches sur fond violet)
- Bouton "Tutoriel" à droite

### 3. Barre de favoris (DashboardFavorites)
- **Boutons rectangulaires avec icône + texte**
- Max 5 favoris
- Exemples : Calendrier 📅, Notes 📝, Récompenses 🎁, Messages 💬, Tâches ✅
- Bouton "+" pour ajouter/gérer
- Icône étoile ⭐ à gauche
- Suppression avec X au survol

### 4. Widget "Résumé du jour"
- **Onglets Jour/Semaine** (sélection du mode)
- **Bouton Filtres** (dropdown avec filtres par type d'événement et membre)
- **Graphique de tendance** (7 derniers jours) - Tendance (7 derniers jours)
- **Carte verte "Tâches à faire aujourd'hui"**
  - Icône ✅
  - Compteur (ex: 0)
  - Flèche → à droite
  - Cliquable → navigation vers page Tâches
- **Section "Événements à venir"**
  - Icône 📅
  - Liste des événements (max 5)
  - Si aucun événement : "Aucun événement pour cette date"
- **Carte bleue "Messages non lus"**
  - Icône 💬
  - Compteur (ex: 0)
  - Flèche → à droite
  - Cliquable → navigation vers page Messages

### 5. Widget "Prochains anniversaires"
- Icône 🎂
- Liste des 3 prochains anniversaires
- Avatar avec initiale
- Nom + date
- Compte à rebours (ex: "Dans 9 jours")
- Flèche → à droite de chaque personne

## Différences avec l'app React Native actuelle

### À modifier :
1. **Favoris** : Remplacer cercles avec icônes par boutons rectangulaires avec texte
2. **Résumé du jour** : 
   - Ajouter onglets Jour/Semaine
   - Ajouter bouton Filtres
   - Ajouter graphique de tendance
   - Transformer compteurs en cartes colorées (vert pour tâches, bleue pour messages)
   - Ajouter section "Événements à venir" avec liste
3. **Anniversaires** : Ajouter flèches → à droite

## Composants WebView à reproduire

1. **DashboardFavorites** : Boutons rectangulaires avec icône + texte
2. **DailySummaryWidget** : 
   - Onglets Jour/Semaine
   - Bouton Filtres
   - Graphique de tendance
   - Carte verte "Tâches à faire aujourd'hui"
   - Section "Événements à venir"
   - Carte bleue "Messages non lus"
3. **UpcomingBirthdaysWidget** : Flèches → à droite

## Couleurs

- **Carte Tâches** : Vert (#10b981 ou similaire)
- **Carte Messages** : Bleu (#3b82f6 ou similaire)
- **Fond** : Blanc ou gris clair
- **Texte** : Noir/gris foncé
- **Accent** : Violet (#7c3aed)
