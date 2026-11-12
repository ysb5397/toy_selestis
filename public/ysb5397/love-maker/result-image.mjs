// Render the result DOM itself so saving and sharing use the same design as the game.
export async function renderResultImage(story, resultCount) {
  const host = document.createElement('div');
  host.className = 'export-host'; host.setAttribute('aria-hidden', 'true'); host.inert = true;
  const snapshot = story.cloneNode(true);
  snapshot.classList.add('export-story');
  // The snapshot must not introduce duplicate app IDs while rendering asynchronously.
  snapshot.removeAttribute('id');
  snapshot.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  snapshot.style.fontFamily = getComputedStyle(story).fontFamily;
  // html2canvas does not implement isolation; flatten the background layer while
  // keeping the decorative star above it and below all content.
  snapshot.style.background = getComputedStyle(story, '::before').background;
  host.append(snapshot); document.body.append(host);
  try {
    await document.fonts.ready;
    if (typeof window.html2canvas !== 'function') throw new Error('Result renderer unavailable');
    const canvas = await window.html2canvas(snapshot, {
      scale: 2, backgroundColor: null, logging: false,
      // Freeze entrance/progress animations in the cloned document at their final state.
      onclone: doc => {
        const style = doc.createElement('style');
        style.textContent = '.export-story,.export-story *,.export-story::before,.export-story::after{animation:none!important;transition:none!important}.export-story .progress-track>div{width:100%!important}.export-story .summary{opacity:1!important;transform:none!important}';
        doc.head.append(style);
      },
    });
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Image generation failed');
    return new File([blob], `love-maker-${String(resultCount).padStart(3, '0')}.png`, { type: 'image/png' });
  } finally { host.remove(); }
}
