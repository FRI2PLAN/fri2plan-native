import * as Haptics from 'expo-haptics';

/**
 * Déclenche un retour tactile court après une validation confirmée.
 * Le booléen permet l’ajout ultérieur d’un réglage utilisateur sans modifier
 * les écrans qui consomment ce hook.
 */
export async function triggerCompletionHaptic(
  points = 0,
  enabled = true,
): Promise<void> {
  if (!enabled) return;

  try {
    if (points > 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Le retour tactile reste un embellissement : il ne doit jamais bloquer l’action.
  }
}
