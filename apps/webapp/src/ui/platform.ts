function detectApplePlatform(): boolean {
  try {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  } catch {
    return false;
  }
}

/** Apple keyboards label the modifier keys ⌘ and ⇧; everyone else reads Ctrl and Shift. */
export const IS_APPLE_PLATFORM = detectApplePlatform();
