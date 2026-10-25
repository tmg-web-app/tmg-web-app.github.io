# Benchmark: Hoppy Home v0 vs v1 — Loading & Animation

Generated: 2026-10-23

## TL;DR

Two live builds of Digitalus's *Hoppy Home* on Rosebud AI. The no-suffix build (**v0**) is the lean, fast one: 6 runner scripts, 169 ms DOMContentLoaded, ~60 FPS animation. The `-1` build (**v1**) is heavier: 14 runner scripts, 477 ms DCL / 1.2 s load, and a stable **hard-locked 30 FPS**. The rosebud.ai hub pages are identical — every meaningful delta lives in the game runner iframe.

## What was benchmarked

| Label | URL | Runner server id |
|---|---|---|
| **v0** | https://rosebud.ai/play/hoppy-home | `a5ef3a78-0d1b-4fee-915f-9fd4988f78d3` |
| **v1** | https://rosebud.ai/play/hoppy-home-1 | `958c3757-f61e-423d-9061-d7c9f3f6afcf` |

Mapping verified three independent ways: two live DOM `iframe[src]` probes plus the browser frame list, across three tabs.

## Method

- OpenCode managed desktop browser; sequential same-machine runs, one URL at a time.
- Load timing: wall-clock `Date.now()` around awaited browser calls (tab open, reload, network listing) + in-page `performance.getEntriesByType('navigation' | 'resource')` for the runner iframe.
- Animation: in-game `requestAnimationFrame` sampling (frame-gap statistics) while the tab was the actively-rendered one.
- No human input — attract/idle loops measured.
- devicePixelRatio 1.71.
- **Throttle caveat (discovered live):** background tabs get rAF-throttled to ~1 FPS (~1015 ms gaps); only the focused tab renders. All foreground samples below are valid. One earlier v1 sample (avg 19 FPS, p50 50 ms) was taken while its tab was backgrounded — **withdrawn as throttle-contaminated, inconclusive. No proven decay.**

## Results

### Hub page (rosebud.ai shell — identical for both)

| Metric | v0 `hoppy-home` | v1 `hoppy-home-1` |
|---|---|---|
| Tab open | 968 ms | 886 ms |
| TTFB | 140 ms | 151 ms |
| DOMContentLoaded | 360 ms | 367 ms |
| Load | 705 ms | 684 ms |
| Document size | 30,364 B | 30,398 B |
| Resources | 32 (27 scripts) | 32 |
| Network requests | 64 | 62 |
| Warm reload | 427 ms | 356 ms |
| Hub UI rAF | 60.1 FPS | 60.1 FPS |

±20 ms differences = wash. The shell is identical; the difference is all in the game runner.

### Game runner frame (the actual game)

| Metric | v0 runner (`a5ef3a78…`) | v1 runner (`958c3757…`) |
|---|---|---|
| TTFB | 128 ms | 107 ms |
| DOMContentLoaded | **169 ms** | 477 ms |
| Load | **564 ms** | 1,177 ms |
| Document size | 300 B | 5,628 B |
| Scripts | **6** | 14 |
| Images | 16 | 16 |
| Audio | 5 | 5 |
| Slowest resource | 54 ms | 299 ms |
| Fresh tab → game live | ≈ 2.8 s | — (not measured) |
| Canvas | 2191×1232, 2D context | 2191×1232, 2D context |

Both runners: canvas 2191×1232, 2D context, no engine globals detected (no Phaser/THREE/etc.), runner title "Hoppy Home".

### Animation (in-game rAF, foreground samples)

| Sample | v0 | v1 |
|---|---|---|
| Initial (n=120) | 2.2 s window, avg 53.4 FPS (boot) | 4.0 s window, **locked 30.0 FPS** (33.3 ms, p95 33.6 ms) |
| Steady | n=180 / 3.1 s: **avg 58.1 FPS, p50 16.7 ms, p95 16.8 ms, 97% of frames at 60 Hz** | initial sample *is* the steady state — a hard 30 FPS lock |
| Backgrounded later sample | — | avg 19 FPS, p50 50 ms, p95 66.6 ms, max 99.8 ms — **throttle-contaminated, withdrawn** |

## Bottom line

- **v0 (`play/hoppy-home`) is the lean, fast build**: 6 runner scripts, 169 ms DCL / 564 ms load, and a live ~60 FPS loop (97% of frames at 16.7 ms).
- **v1 (`play/hoppy-home-1`) is the heavier build**: 14 scripts, ~3× slower DCL (477 ms), 1.2 s load, and a **stable hard-locked 30 FPS** — smooth but capped (p95 33.6 ms ≈ exactly one 30 Hz frame).
- v1's 30 FPS looks deliberate — too exact to be accidental — likely a frame-cap choice in that build.
- Numbers attach to URLs, not opinions: the runner IDs above pin each dataset to its build.

## Caveats

- Idle/attract loops, not human play sessions; human play can differ.
- Single machine, single run set — treat deltas as relative, not absolute.
- v1's "decay" sample was background-tab throttling; withdrawn (no proven decay).
- Rosebud pages expose near-empty body text/a11y tree to automation; the game iframe was probed via `iframe[src*=playground-gateway]`.
- FPS valid only in the actively-rendering tab (background = ~1 FPS throttle).

## Pointers

- v0 runner: `https://playground-gateway-v2-snduoq54tq-uc.a.run.app/api/server/a5ef3a78-0d1b-4fee-915f-9fd4988f78d3/index.html`
- v1 runner: `https://playground-gateway-v2-snduoq54tq-uc.a.run.app/api/server/958c3757-f61e-423d-9061-d7c9f3f6afcf/index.html`
- Browser tabs left open: v0 = `tab_00824b45…` (focused), v1 = `tab_227aca54…`; extra v0 tabs `tab_66fe3040…`, `tab_d1c5fe6e…` can be closed.
- Companion report: `research/2026-10-23-hoppy-home-similar-games.md`
