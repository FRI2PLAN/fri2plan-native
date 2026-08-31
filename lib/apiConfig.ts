/**
 * Cette branche est exclusivement destinée aux essais Repas : toutes les
 * requêtes applicatives doivent rester dans Railway/TiDB preview.
 * La branche main conserve sa propre configuration de production.
 */
export const API_ORIGIN = 'https://fri2plan-server-production-f184.up.railway.app';
export const TRPC_API_URL = `${API_ORIGIN}/api/trpc`;
export const WEB_APP_URL = API_ORIGIN;
