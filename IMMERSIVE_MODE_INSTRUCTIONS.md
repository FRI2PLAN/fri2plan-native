# Instructions pour activer le mode immersif Android

## 🎯 Objectif
Masquer la barre de navigation Android (les 3 boutons en bas) pour que l'application utilise tout l'écran.

## 📁 Fichier à créer/modifier

### 1. MainActivity.kt

**Emplacement** : `android/app/src/main/java/com/fri2plan/native/MainActivity.kt`

**Action** : Remplacer le contenu existant par le fichier `MainActivity_IMMERSIVE_V2.kt` fourni.

## 🔧 Modifications apportées

### Fonctionnalités ajoutées :

1. **enableImmersiveMode()** - Fonction qui masque la barre de navigation
   - Compatible Android 11+ (API 30+) avec WindowInsetsController
   - Compatible Android 10 et inférieur avec systemUiVisibility (deprecated)

2. **onCreate()** - Active le mode immersif au démarrage de l'app

3. **onWindowFocusChanged()** - Réactive le mode immersif quand l'app reprend le focus
   - Important : quand l'utilisateur swipe depuis le bas pour afficher la barre, elle se cache automatiquement après

## 📱 Comportement

- ✅ Barre de navigation masquée par défaut
- ✅ L'utilisateur peut swiper depuis le bas pour l'afficher temporairement
- ✅ La barre se cache automatiquement après quelques secondes
- ✅ Compatible avec tous les appareils Android (API 21+)

## 🚀 Compilation

Après avoir modifié MainActivity.kt, recompilez l'APK :

```bash
# Sur votre PC Windows (dans le dossier fri2plan-native)
eas build --platform android --profile development --local
```

Ou utilisez EAS Build cloud :

```bash
eas build --platform android --profile development
```

## ✅ Test

1. Installer le nouvel APK sur votre téléphone
2. Ouvrir l'application
3. Vérifier que la barre de navigation est masquée
4. Swiper depuis le bas pour l'afficher temporairement
5. Vérifier qu'elle se cache automatiquement

## 📝 Notes

- Le mode immersif fonctionne uniquement sur Android
- iOS n'a pas de barre de navigation système en bas (sauf l'indicateur d'accueil sur iPhone X+)
- SafeAreaView dans React Native gère automatiquement les encoches et zones sûres
