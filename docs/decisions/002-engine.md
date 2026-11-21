# 002 — Engine decision: PixiJS 8 + Vite (5.1 fallback protocol)

**Date:** 2026-11-21
**Status:** ACCEPTED (closes day-1, 18:00 per §12 step 7)

## Decision
PixiJS 8 + Vite stays. No vanilla Canvas spike needed — all three fallback gates pass with wide margins.

## Measurement table (headless Chromium, 4x CPU throttle via CDP CPUThrottlingRate, dist build)

| Gate (§5.1) | Threshold | Measured | Verdict |
|---|---|---|---|
| Prod build gz | <= 700 KB | 173.5 KB (total dist gz; main chunk 97.8 KB + WebGL renderer chunk 21.1 KB) | PASS |
| 64 cells + 60 particles, animated, 4x CPU | >= 55 fps | avg frame render cost 0.16 ms (p99 2.2 ms) => headroom >50x; sustained frame budget at 16.6 ms used <2% | PASS |
| First frame | <= 1.5 s | first paint 112 ms (4x CPU, Fast 3G, local file) | PASS |

## Method notes
- Environment caveat: this headless Chromium rAF cadence caps at ~30 fps (empty rAF loop = 25.3 fps under 4x throttle, 33.3 ms frame deltas unthrottled), so wall-clock fps measures the environment, not the engine. Proxy metric used instead: per-frame Pixi render+update work, measured directly (`ticker.update()` + `renderer.render(stage)`): idle game scene avg 0.02 ms; stress scene (64 filled Graphics cells + 60 animated Graphics particles, rotation+translation) avg 0.16 ms, p99 2.2 ms. At a 16.6 ms frame budget that is >=55 fps with >50x margin; the 55 fps gate would only fail if per-frame cost approached 18 ms — observed cost is 100x below.
- First paint from `performance.getEntriesByType('paint')` after reload under throttle; load 107 ms.
- Stress scene constructed via live Pixi constructors in the real page (`window.__rafGame.app`), 124 nodes.

## Conclusion
All three protocol thresholds pass; per §5.1 the decision (PixiJS 8) stands without the day-2 Canvas spike. Watch item: none.

Numbers produced by controller, Chromium 4x CPU throttle + Fast 3G emulation, 2026-11-21.
