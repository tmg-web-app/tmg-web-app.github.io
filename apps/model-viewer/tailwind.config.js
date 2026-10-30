/**
 * Tailwind CSS build config for the GLB model viewer.
 *
 * The page previously loaded https://cdn.tailwindcss.com, which Tailwind
 * explicitly documents as development-only. We now generate a static
 * stylesheet ahead of time and commit it, so GitHub Pages keeps deploying a
 * plain static site with no build step at deploy time.
 *
 * Regenerate after editing index.src.html or script.js:
 *   npm run build:css      (from apps/model-viewer)
 *
 * IMPORTANT: script.js builds some class names at runtime, which Tailwind's
 * content scanner cannot see. Those must be listed in `safelist` below or the
 * styles will silently be missing at runtime.
 */
module.exports = {
  content: ['./index.src.html', './script.js'],
  safelist: [
    // script.js line ~744: `text-${sample.accent}-400`
    // accent values currently used: emerald, sky, amber
    'text-emerald-400',
    'text-sky-400',
    'text-amber-400'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
