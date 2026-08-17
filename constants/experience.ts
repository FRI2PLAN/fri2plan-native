/**
 * Règles d’expérience communes.
 * Les durées restent courtes afin de rendre l’interface vivante sans ralentir
 * les actions quotidiennes ni créer de distraction.
 */
export const motion = {
  micro: 160,
  standard: 300,
  feedbackVisible: 900,
  completionSpring: {
    damping: 12,
    stiffness: 240,
    mass: 0.55,
  },
} as const;

export const familyPalette = {
  primaryAction: '#7C3AED',
  success: '#16A34A',
  reward: '#F59E0B',
  surfaceLight: '#FFFEFB',
  surfaceDark: '#0A0A0A',
  textLight: '#111111',
  textDark: '#FFFFFF',
} as const;
