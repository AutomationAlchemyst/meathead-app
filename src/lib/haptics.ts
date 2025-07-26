/**
 * Triggers haptic feedback on supported devices.
 * This provides a physical confirmation for user actions on mobile.
 * @param pattern The vibration pattern. Can be a single number for milliseconds,
 * or an array of numbers for a pattern of vibration and pause.
 * e.g., 50 for a short buzz, [100, 50, 100] for buzz-pause-buzz.
 * Defaults to a short, crisp 50ms vibration.
 */
export const triggerHapticFeedback = (pattern: number | number[] = 50): void => {
  // First, check if the code is running in a browser environment.
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Use the browser's built-in Vibration API.
      navigator.vibrate(pattern);
    } catch (error) {
      // Log any errors, but don't crash the app if it fails.
      console.error("Haptic feedback failed:", error);
    }
  }
};