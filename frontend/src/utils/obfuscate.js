/**
 * obfuscate.js
 *
 * Deterministic text obfuscation — same seed produces the same garbled output
 * every time, so the "corrupted" text looks stable across re-renders.
 *
 * Rules:
 *  - Lowercase letter  → random lowercase letter
 *  - Uppercase letter  → random uppercase letter
 *  - Digit             → random digit
 *  - Everything else   → unchanged (spaces, punctuation, newlines preserved)
 */

const LOWER  = 'abcdefghijklmnopqrstuvwxyz';
const UPPER  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

/** Linear congruential generator — fast, deterministic, good enough for this */
function lcg(seed) {
  let s = seed >>> 0;
  return function rand() {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Obfuscate `text` using `seed` (any integer).
 * Pass the post ID or a hash of the slug as seed for stable output.
 */
export function obfuscate(text, seed = 1337) {
  if (!text) return text;
  const rand = lcg(seed);
  return [...text].map((ch) => {
    if (/[a-z]/.test(ch)) return LOWER[Math.floor(rand() * LOWER.length)];
    if (/[A-Z]/.test(ch)) return UPPER[Math.floor(rand() * UPPER.length)];
    if (/[0-9]/.test(ch)) return DIGITS[Math.floor(rand() * DIGITS.length)];
    rand(); // consume a value so seed position stays consistent
    return ch;
  }).join('');
}
