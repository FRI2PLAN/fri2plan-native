// Ce plugin n'est plus nécessaire depuis l'ajout de expo-build-properties
// avec useFrameworks: "static" et forceStaticLinking: ["RNFBApp", "RNFBMessaging"].
// Conservé vide pour compatibilité au cas où il serait encore référencé.
// IMPORTANT: le plugin "withFirebasePodfile" a été retiré de app.json plugins[].

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebasePodfile(config) {
  // No-op: la correction Firebase est maintenant gérée par expo-build-properties
  return config;
};
