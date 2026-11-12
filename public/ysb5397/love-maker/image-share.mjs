// Call directly from a click handler with a prepared file to preserve user activation.
export async function shareResultImage(file, platform = navigator) {
  const data = { files: [file] };
  if (typeof platform.share !== 'function' || typeof platform.canShare !== 'function') return 'unsupported';
  try { if (!platform.canShare(data)) return 'unsupported'; }
  catch { return 'unsupported'; }
  try {
    await platform.share(data);
    return 'shared';
  } catch (error) {
    if (error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}
