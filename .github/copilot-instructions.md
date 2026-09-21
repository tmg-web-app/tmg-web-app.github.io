# Copilot instructions

## Build, test, and lint

This repository is a plain static site. There is no `package.json`, dependency lockfile, build tool, test runner, or linter configured.

- Deploy the repository root as-is through GitHub Pages.
- For local browser testing, serve the repository root with any static HTTP server; do not introduce a build step unless the project is intentionally migrated to a framework or site generator.
- There is no configured single-test command. Validate changes by loading `index.html` through a local HTTP server and checking the affected navigation, responsive layout, and asset URLs in a browser.

## Architecture

- `index.html` is the page composition and content source. It contains the fixed navigation, hero section, services grid, and footer, and references assets with repository-relative paths.
- `css/styles.css` is the single stylesheet. It defines the dark/blue visual design through `:root` custom properties, the desktop layout, hover states, and responsive breakpoints at 992px and 768px.
- `js/main.js` is a small DOM-enhancement layer loaded with `defer`. It wires the mobile menu (`#navToggle` / `#navMenu`) and smooth scrolling for same-page hash links; it is not a framework entry point.
- `images/` contains the visual assets used by the page. Keep references compatible with a root-deployed static site.
- `snippets/` contains reusable content snippets, not runtime code.

## Repository-specific conventions

- Keep the site framework-free and preserve direct static hosting compatibility. Avoid adding generated output, package metadata, or Jekyll/framework configuration for ordinary content or styling changes.
- Use the existing CSS custom properties for colors, typography, transitions, and borders instead of duplicating theme values. Extend the existing component selectors and responsive media queries rather than creating parallel style systems.
- Preserve the current markup-to-script contract: navigation behavior depends on the `navToggle` and `navMenu` IDs, and smooth scrolling depends on matching `href="#..."` values to section IDs.
- Use semantic section IDs and ensure every user-facing hash link has a corresponding target section. Keep asset paths relative (`css/...`, `js/...`, `images/...`) so the site works under the repository's GitHub Pages URL.
- Keep JavaScript defensive around optional elements, as the current script checks for the navigation elements before attaching behavior.
- Keep inline SVG icons and image `alt` text in the HTML when they are part of the page content; update both visual content and accessible text together.
