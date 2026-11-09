// Stable reproducible identifiers and pseudo-random fractions. This helper is
// shared by scene weather and behavior without importing scene-specific logic.
export function hash32(text) {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function unitHash(key) {
  return hash32(key) / 4294967296;
}
