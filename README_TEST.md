# FRI2PLAN Native - Guide de Test

## 🚀 Comment tester l'application sur votre téléphone Android

### Méthode 1 : Expo Go (Recommandé pour les tests rapides)

1. **Installer Expo Go sur votre téléphone Android**
   - Ouvrez le Play Store
   - Recherchez "Expo Go"
   - Installez l'application

2. **Lancer le serveur de développement**
   ```bash
   cd /home/ubuntu/fri2plan-native
   npx expo start
   ```

3. **Scanner le QR code**
   - Un QR code apparaîtra dans le terminal
   - Ouvrez Expo Go sur votre téléphone
   - Scannez le QR code
   - L'application se lancera automatiquement !

### Méthode 2 : Build APK pour tests (Plus proche de la production)

1. **Créer un compte Expo** (gratuit)
   ```bash
   npx expo login
   ```

2. **Builder l'APK**
   ```bash
   cd /home/ubuntu/fri2plan-native
   eas build --platform android --profile preview
   ```

3. **Télécharger et installer l'APK**
   - Expo vous donnera un lien de téléchargement
   - Téléchargez l'APK sur votre téléphone
   - Installez-le (autorisez les sources inconnues si nécessaire)

## 📱 Ce que vous devriez voir

- ✅ Écran violet avec le logo "FRI2PLAN"
- ✅ Un compteur fonctionnel (test d'interactivité)
- ✅ Boutons "Incrémenter" et "Réinitialiser"
- ✅ Liste des fonctionnalités prêtes

## 🔧 Prochaines étapes

1. **Connexion au backend**
   - Installer tRPC client pour React Native
   - Configurer l'URL de l'API
   - Tester l'authentification

2. **Écrans principaux**
   - Login
   - Dashboard
   - Calendrier
   - Tâches
   - Messages

3. **Notifications push natives**
   - Intégrer Firebase Cloud Messaging
   - Tester les notifications système
   - Vérifier sur la montre connectée

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
- Vérifiez que votre téléphone et l'ordinateur sont sur le même réseau WiFi
- Redémarrez le serveur Expo
- Vérifiez les logs dans le terminal

## 📝 Notes

- Cette version est un **prototype de test**
- Le design final sera plus proche de votre version web actuelle
- Les données ne sont pas encore connectées au backend
