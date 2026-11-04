// Preview can point to DEV without changing native runtime/build configuration.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://app.fri2plan.ch/api/trpc').replace(/\/+$/, '');
