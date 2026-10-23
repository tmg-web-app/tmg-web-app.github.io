# AGENTS.md — TMG Web App (GitHub Pages)

## What this repo is

Tri-State Media Group (`tmg-web-app.github.io`) — a GitHub Pages marketing site. Two parallel architectures coexist:

1. **Static HTML site** (the live site): `index.html`, `css/styles.css`, `js/main.js`. Vanilla HTML/CSS/JS. No build step needed.
2. **React/Vite SPA** (scaffolded, not yet primary): `src/App.tsx`, `src/main.tsx`, `src/pages/Index.tsx`. Basic stubs — not yet wired to the landing page content.

## Critical: do not trust AI_RULES.md blindly

`AI_RULES.md` references Tailwind CSS, shadcn/ui, ESLint, and Prettier. **None of these are installed or configured.** No `tailwind.config.*`, no `.eslintrc*`, no `.prettierrc*`, no `vite.config.*` exist. Follow `AI_RULES.md` conventions only when the referenced tooling is actually present. Verify before assuming.

## Commands

- `npm run dev` — start Vite dev server for the React app
- `npm run build` — build React app to `dist/`
- `npm run preview` — preview production build locally

There is no lint, typecheck, or test command configured. TypeScript strict mode is on in `tsconfig.json` but there is no build-verification script exposed.

## Deployment

GitHub Pages serves `index.html` directly (the static HTML site). `_config.yml` sets a Jekyll remote theme, but since there's no Jekyll-processed content (no `.md` or `.liquid` files), it's effectively inert. The React app (`src/`) is **not** built or deployed — it would need a `vite build` + deploy workflow to replace the static site.

## File organization

- `index.html` — the actual landing page (static, self-contained)
- `css/styles.css` — all styling for the static site (CSS variables, glassmorphism, custom animations)
- `js/main.js` — vanilla JS for mobile nav toggle and smooth scrolling
- `src/App.tsx` — React app entrypoint; routes go here
- `src/pages/Index.tsx` — React homepage (stub, not the real landing page)
- `src/main.tsx` — React root mount
- `images/` — logo and badge assets
- `snippets/` — design prompts and favicon snippet (reference only)
- `research/` — research documents (competitive intel, market studies). **Always commit and index this folder** — never gitignore or exclude it; new research files go in here and get committed.
  - **Naming convention (Firecrawl/workflow-generated `.md` files):** `YYYY-MM-DD-<topic-slug>.md` — e.g. `2026-10-23-competitive-intel.md`. ISO date prefix (sorts chronologically) + kebab-case topic slug. The inner "Generated:" date in the doc should match the filename.
- `.dyad/` — Dyad AI tool screenshots (`.gitignore`d)

## Styling

The static site uses hand-written CSS with custom properties (`--bg-dark`, `--primary-blue`, etc.), glassmorphism, and gradient effects. This is **not** Tailwind — do not convert to Tailwind utilities without a full migration plan. If adding React components, either reference the existing CSS classes or introduce Tailwind incrementally with a proper config.

## Gotchas

- The React app and the static HTML are two separate things. Editing `src/` won't change the live site; editing `index.html` will.
- No `vite.config.ts` — Vite uses defaults. If you need custom plugins or base path config, create one.
- `src/main.tsx` mounts to `getElementById('root')` but `index.html` has no `#root` element — the React app is not connected to the static page.
- GitHub Pages branch: check which branch is set to deploy (`main` or `gh-pages`).
