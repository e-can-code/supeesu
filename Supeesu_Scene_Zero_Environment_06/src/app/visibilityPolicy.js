export function visibilityPolicy({ hidden, persistentSound, audioActive }) {
  return {
    animateVisuals: !hidden,
    allowSoundPlayback: Boolean(audioActive) && (!hidden || persistentSound),
    audioAction: !audioActive ? 'none' : hidden && !persistentSound ? 'pause' : !hidden ? 'resume' : 'keep'
  };
}
