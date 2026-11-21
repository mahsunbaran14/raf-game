# Sprint 1 (day 1) report — template per brief.md §9.2

(1) **Build link + commit hash:** `npm run build` → `dist/` (local; no playtest host yet — see FAIL rows). HEAD `e42153f` (+ W2 fix commit `e42777e`). Branch `dev`.

(2) **AC table (Sprint 1 rows dev-side; human-facing ACs marked):**

| AC | Status | Evidence |
|---|---|---|
| AC1.1 Full run start→place→clear→collapse→fail→PLAY AGAIN | PASS (automation) | 55/55 unit tests; W2 headless-Chromium smoke: full run via real drags to overlay, PLAY AGAIN → ui_click + run_started, fresh seed; controller verified drag placement, tray refill, ring collapse (waste 17, −850 score), invalid drops, 465 telemetry events in live page |
| AC1.2 Determinism 10 seeds × 100 actions | PARTIAL | 3 seeds × 100 actions, hash equal at every step, two replays (test/sim.test.js:270-292). 7 more seeds = trivial extension; not blocking gate |
| AC1.3 Pressure perceptible (5 blind testers) | FAIL — not dev-measurable; needs Mahsun's §8 protocol | n/a |
| AC1.4 Perf: gz ≤5MB; first frame ≤3s; ≥55fps | PASS | gz 173.5 KB (check-size.mjs); first paint 112 ms (4x CPU + Fast 3G, local file); per-frame stress cost 0.16 ms avg / 2.2 ms p99 (64 cells + 60 particles, 4x CPU) — see 002-engine.md; wall-clock fps not meaningful in headless Chromium (30fps rAF cap, measured) |
| AC1.5 Input latency ≤100 ms | UNMEASURED (needs 20-sample median in real interaction) | drag→render path is 1-frame synchronous; formal measurement pending |
| AC1.6 Invalid drop feedback ≤100 ms | PASS (automation) | step returns invalid_drop with unchanged state; renderer flashes red + snap-back (W2 smoke verified visually); sound pending Sprint 2 (AC2.4) |
| AC1.7 Telemetry events + JSON export | PASS | all §5.3 events emitted; ring buffer 465 events live; `window.__rafTelemetry.toJSON()` works; export button UI pending (dev-only, Sprint 2) |
| AC1.8 Color blindness | PARTIAL | per-color glyphs (▲●■✦) implemented; palette has no red/green pair (blue/amber/teal/plum); formal protanopia simulation not run yet |
| §5.1 engine gates (day-1 18:00) | PASS | 002-engine.md: 173.5 KB gz ≤ 700 KB; stress render 0.16 ms/frame; first frame 112 ms ≤ 1.5 s. PixiJS 8 stands, no Canvas spike |
| §5.4 core gate (every PR) | PASS | 200 seeds: wave≥4 195/200 = 0.975 (min 0.90); 0 early deaths (< placement 12); 1245 ms ≤ 120 s |
| §5.4 daily gate (build CI) | PASS | 365/365 days wave ≥3; 0 retries; avg 6.01 ms/board ≤ 1000 ms; reports/daily-365.json committed |
| AC0.1/0.2 CI (build, paths, size, constants, determinism, gates) | PASS | `bash scripts/ci.sh` → ALL GREEN |

(3) **FAIL/PARTIAL items + why + estimate:**
- AC1.3 (blind-test pressure) — human protocol §8, owner Mahsun; not code work.
- AC1.5 latency median — needs real-input sampling session; ~1 h.
- AC1.2 7 more seeds — trivial; extend determinism test loop; ~15 min.
- AC1.8 formal protanopia sim — run palette through a color-blindness simulator; ~1 h.
- Playtest link (AC0.3) — needs a host/URL; deployment decision pending (9.6 default when asked: static host, e.g. any static file server; Mahsun question logged).

(4) **Biggest risk next sprint:** juice feel (AC2.1-2.3) is taste work with numeric gates; the day-3 kill gate (§8) can kill all of it — do not over-invest before gate results. Second risk: mobile drag (A3) untested on real hardware.

(5) **Decision-log additions:** 001-scope (ACCEPTED), 002-engine (ACCEPTED, Pixi 8 stands).

## Controller rulings (§9.6) this sprint
1. Wave advances by `waveAt(pieceId)` (piece-id parity with generator) — accepted from W3a's concern; sim implemented it.
2. Chain = per-group-in-placement (1st group mult 1, 2nd 1.5, cap 2.5); with no gravity a post-clear merged group is unreachable.
3. ring_restored gated on a clear happening in the same step (prevents re-fire).
4. step on non-playing state = no-op; unknown action = invalid_drop.
5. Telemetry events carry no ms; main.js stamps run_ended.ms (AC1.5 needs runtime timing).
6. TOUCH_OFFSET (AC2.5's +40px) not yet in tuning — render reads `TUNING.TOUCH_OFFSET ?? 0`; controller to add key in Sprint 2.

## Minor findings deferred (from task reviews)
- telemetry `all()` shares event object refs; `cap<=0` unguarded (W4).
- hash.js reimplements fnv1a (ASCII-equivalent); one tautological assertion sim.test.js:89 (W1).
- gate-daily retry ms overwrite; bot.test.js comment omission (W3b).
- recordRun reloads storage each run end → best can regress if localStorage writes persistently fail (W2 fix P3).
- amber/teal lightness separation weak (ΔL 0.066) — glyphs carry AC1.8 (W2).
- unused STRINGS keys (hint1-3, daily*, streak, invalidDrop) — Sprint 2/3 will consume.

## Open questions for Mahsun (§9.5 — work continues on defaults)
1. Playtest hosting: static URL for AC0.3 + §8 gate. Default: any static host, single link.
2. §11 items 1-5 restate (name by day 18; AI-art policy; 12-20 testers; revenue share; Full Launch date) — defaults in effect.
