---
name: extract-inline-assets
description: Extract the inline <style> and inline <script> from a self-contained single-file HTML app into sibling style.css and script.js files, wiring them back with a <link> in the head and a <script src> before </body>. Use when a single-file HTML page should be split into external assets while staying build-step-free and static-host compatible.
---

# Extract Inline Assets

Split a self-contained single-file HTML page into external `style.css` and `script.js` files that sit next to the HTML, then reference them from the HTML. No build step, no bundler, no module system — the result must deploy as-is to static hosting (e.g. GitHub Pages).

## When to use

- A single HTML file embeds a large `<style>` block in `<head>` and/or a large inline `<script>` before `</body>`.
- The page should keep working when served directly with no build tooling.
- You need the CSS and JS to be separate, editable files.

Do NOT use this skill to:
- Introduce a bundler, module imports, or a `package.json` build step.
- Touch external CDN `<script src="https://...">` or `<link href="https://...">` tags — those stay in place.
- Reformat, minify, or otherwise "clean up" the extracted code.

## Procedure

Work relative to the target HTML file; extract into siblings in the same directory.

1. **Locate the blocks.** Find:
   - the single `<style>...</style>` block inside `<head>`, and
   - the single inline `<script>...</script>` block that has no `src` attribute, before `</body>`.
   Confirm exactly one of each. If there are multiple inline script blocks, stop and ask which one(s) to extract.

2. **Extract the CSS.** Copy everything strictly *between* `<style>` and `</style>` (exclusive of the tags) into `style.css` in the same directory as the HTML. Preserve the exact interior text, including original indentation and line endings — do not dedent or reformat.

3. **Extract the JS.** Copy everything strictly *between* the inline `<script>` and `</script>` tags (exclusive of the tags) into `script.js` in the same directory. Preserve the exact interior text — do not dedent, reindent, or reformat.

4. **Replace the `<style>` block** in `<head>` with a single line at the same position:
   ```html
   <link rel="stylesheet" href="style.css">
   ```
   Use a **relative** path (`style.css`), not `/style.css`, so it resolves under the repository's GitHub Pages base path.

5. **Replace the inline `<script>` block** with the same relative reference, keeping its position immediately before `</body>`:
   ```html
   <script src="script.js"></script>
   ```
   A plain classic `<script>` (no `type="module"`, no `defer`) preserves the original top-level execution semantics for a single inline block; only add `defer` if you also move it to `<head>`.

6. **Leave everything else untouched.** All CDN `<script src>` tags, comments, and markup stay exactly as they were.

## Verification

After editing, confirm:

- No inline `<style>` or inline `<script>` bodies remain in the HTML (grep for `<style>` and bare `<script>`).
- `style.css` and `script.js` exist next to the HTML and are non-empty.
- The `<link>` sits inside `<head>` and the `<script src>` sits just before `</body>`.
- Paths are relative, so opening the page from a local static server under the repo sub-path still loads both files.
- The page behaves identically: styles applied, and all `window.onload` / DOM wiring runs.

## Guardrails

- **Byte-for-byte interior content.** The only intended change to the moved code is its container. If a reviewer diffs the extracted file against the original inline block, it should match exactly.
- **No build step.** Per this repo's `AGENTS.md` and `.github/copilot-instructions.md`, the site is deployed as-is; never add generated output, package metadata, or framework config.
- **Relative paths only.** Absolute (`/...`) asset paths break under the GitHub Pages project URL.
- **One block each.** Do not merge multiple inline scripts into one file if they have distinct execution timing/ordering requirements — ask first.
