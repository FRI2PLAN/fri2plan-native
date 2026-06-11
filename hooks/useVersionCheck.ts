/**
 * useVersionCheck — Vérification de version au démarrage de l'app
 *
 * Interroge l'endpoint /api/app-version du serveur et compare la version
 * installée avec la version minimale requise et la dernière version disponible.
 *
 * Retourne :
 *   - needsUpdate : true si une mise à jour est disponible
 *   - forceUpdate : true si la mise à jour est obligatoire (bloque l'app)
 *   - storeUrl    : URL du store adapté à la plateforme (iOS / Android)
 *   - latestVersion : dernière version disponible
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const SERVER_URL = 'https://app.fri2plan.ch';

interface AppVersionResponse {
  minVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  storeUrlAndroid: string;
  storeUrlIos: string;
}

interface VersionCheckResult {
  needsUpdate: boolean;
  forceUpdate: boolean;
  storeUrl: string;
  latestVersion: string;
  isLoading: boolean;
}

/**
 * Compare deux versions sémantiques (ex: "1.1.2" vs "1.0.0")
 * Retourne true si versionA < versionB
 */
function isVersionLower(versionA: string, versionB: string): boolean {
  const partsA = versionA.split('.').map(Number);
  const partsB = versionB.split('.').map(Number);
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const a = partsA[i] ?? 0;
    const b = partsB[i] ?? 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false; // égales
}

export function useVersionCheck(): VersionCheckResult {
  const [result, setResult] = useState<VersionCheckResult>({
    needsUpdate: false,
    forceUpdate: false,
    storeUrl: '',
    latestVersion: '',
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const checkVersion = async () => {
      try {
        const currentVersion: string =
          Constants.expoConfig?.version ?? '0.0.0';

        const response = await fetch(`${SERVER_URL}/api/app-version`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Timeout de 5s pour ne pas bloquer l'app si le serveur est lent
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          console.warn('[VersionCheck] Réponse non-OK:', response.status);
          if (!cancelled) setResult(r => ({ ...r, isLoading: false }));
          return;
        }

        const data: AppVersionResponse = await response.json();

        // Choisir l'URL du store selon la plateforme
        const storeUrl =
          Platform.OS === 'ios' ? data.storeUrlIos : data.storeUrlAndroid;

        // Vérifier si la version courante est inférieure à la version minimale
        const belowMinimum = isVersionLower(currentVersion, data.minVersion);
        // Vérifier si une mise à jour est disponible (même non forcée)
        const updateAvailable = isVersionLower(currentVersion, data.latestVersion);

        const needsUpdate = belowMinimum || updateAvailable;
        // forceUpdate = true si le serveur le demande ET si la version est en dessous du minimum
        const forceUpdate = data.forceUpdate && belowMinimum;

        console.log(
          `[VersionCheck] current=${currentVersion} min=${data.minVersion} latest=${data.latestVersion} needsUpdate=${needsUpdate} force=${forceUpdate}`
        );

        if (!cancelled) {
          setResult({
            needsUpdate,
            forceUpdate,
            storeUrl,
            latestVersion: data.latestVersion,
            isLoading: false,
          });
        }
      } catch (error) {
        // Ne pas bloquer l'app si la vérification échoue (réseau indisponible, etc.)
        console.warn('[VersionCheck] Erreur:', error);
        if (!cancelled) setResult(r => ({ ...r, isLoading: false }));
      }
    };

    checkVersion();
    return () => { cancelled = true; };
  }, []);

  return result;
}
