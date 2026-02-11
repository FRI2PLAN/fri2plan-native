# Navigation Switch - Carousel vs FlatList

## Problème

Le conflit entre le scroll vertical et le swipe horizontal du Carousel empêche le scroll de fonctionner correctement.

## Solutions disponibles

### Solution 1 : react-native-reanimated-carousel (Actuelle)

**Fichier** : `navigation/AppNavigator.tsx`

**Avantages** :
- Animations fluides et modernes
- Effets parallax et transitions avancées
- Bibliothèque mature et bien maintenue

**Inconvénients** :
- Conflit avec le scroll vertical
- Gestion complexe des gestes
- Paramètres `activeOffsetX` et `failOffsetY` difficiles à ajuster

**Tentatives de correction** :
- ❌ `activeOffsetX=50 + failOffsetY=30` → Échec
- ❌ `activeOffsetX=100 + failOffsetY=10` → Échec
- ⚠️ `activeOffsetX=80 + pas de failOffsetY` → À tester

---

### Solution 2 : FlatList horizontal (Solution de secours)

**Fichier** : `navigation/AppNavigator.flatlist.tsx`

**Avantages** :
- ✅ Composant natif React Native (pas de conflit de gestes)
- ✅ Scroll vertical fonctionne sans problème
- ✅ Plus simple et plus performant
- ✅ Swipe circulaire infini avec duplication des données

**Inconvénients** :
- Animations moins sophistiquées
- Pas d'effets parallax
- Transitions plus basiques

---

## Comment basculer entre les deux solutions ?

### Passer à la solution FlatList

1. **Renommer les fichiers** :
   ```bash
   cd /home/ubuntu/fri2plan-native-work/navigation
   mv AppNavigator.tsx AppNavigator.carousel.tsx
   mv AppNavigator.flatlist.tsx AppNavigator.tsx
   ```

2. **Rebuild l'app** :
   ```bash
   npm install
   eas build --profile development --platform android
   ```

### Revenir à la solution Carousel

1. **Renommer les fichiers** :
   ```bash
   cd /home/ubuntu/fri2plan-native-work/navigation
   mv AppNavigator.tsx AppNavigator.flatlist.tsx
   mv AppNavigator.carousel.tsx AppNavigator.tsx
   ```

2. **Rebuild l'app** :
   ```bash
   npm install
   eas build --profile development --platform android
   ```

---

## Recommandation

**Tester d'abord** : Attendez le résultat du build actuel (commit `ac449f7`) avec `activeOffsetX=80` sans `failOffsetY`.

**Si le scroll ne fonctionne toujours pas** : Basculez vers la solution FlatList.

**Si le scroll fonctionne** : Gardez la solution Carousel actuelle.

---

## Fichiers créés pour la solution de secours

- `components/CircularPager.tsx` : Composant FlatList circulaire
- `navigation/AppNavigator.flatlist.tsx` : AppNavigator avec FlatList
- `NAVIGATION_SWITCH.md` : Ce fichier (documentation)
