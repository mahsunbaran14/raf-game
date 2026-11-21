# Sprint 2 report — brief.md §9.2 template

(1) **Build + commit:** `dist/` local build, gz 178.4 KB. HEAD `06088b0`. Commits this sprint: `e9964aa` (S3 touch/export/adhook), `77a66aa` (S2 audio+onboarding), `4152960` (S1 juice), `06088b0` (drop-origin fix).

(2) **AC table:**

| AC | Status | Evidence |
|---|---|---|
| AC2.1 Feedback matrix >=3 channels/event | PARTIAL | docs/feedback-matrix.md — all 10 events; sound column filled by S2 audio; daily_done row = 0 channels (no producer in v1, deferred to Sprint 3 AC3.3 — the only row below gate) |
| AC2.2 Clear juice: particles + pulse <=180ms + shake <=6px/120ms + number pop + sound | PASS | fx.js pooled particles (6-10/cell, 300ms), pulse peak 1.25, shake envelope, score pops with x1.5/x2/x2.5 chain text; unit tests lock budgets; browser-verified placement/collapse visuals |
| AC2.3 First clear median <=20s (5 people) | N/A-HUMAN (decision 003) | post-launch telemetry observation |
| AC2.4 8 SFX + 1 loop, persistent mute, ad duck | PASS | core/audio.js WebAudio synth, 9 sounds total; mute button toggles + persists `sound:false` in raf.save (browser-verified); duckForAd exposed (ad logic off, ADS_ENABLED=false) |
| AC2.5 Mobile: 360x640 fully visible, >=44px targets, +40px offset, portrait+landscape | PASS | layout tests: cell 44 portrait / 81 landscape, tray slots 88/116px; TOUCH_OFFSET=40 lifts ghost only — S3 tests lock `origin === cellAt(pointer)` across offsets 0/±40 both orientations; S1 applied resolveDrop in app.js (`06088b0`); browser drag verified drop lands visually under pointer |
| AC2.6 Ad: exactly 1 request at run_ended, none during run | PASS (logic) | adhook.js: no-op when ADS_ENABLED=false, reason assertion 'run_ended', no frequency logic; wiring deferred to Sprint 4 SDK task by design |
| AC2.7 Onboarding 3 hints, non-blocking, once, skippable | PASS | onboarding banner observed live; SKIP removes it; `onboarded:true` persisted; repeat runs show none (unit-tested) |

(3) **FAIL/PARTIAL:** AC2.1 daily_done row (no v1 producer — Sprint 3); AC2.3 N/A-human. Formal "4-chain >=50fps" browser graph not produced — headless Chromium caps rAF at ~30fps (measured); per-frame stress cost 0.16ms (002-engine) leaves >50x headroom; re-measure on real hardware at QA (AC4.6).

(4) **Biggest risk next sprint:** save/migration correctness under CrazyGames Data module dual-write (§5.6) — schema evolution must not lose best/streak; streak clock edge cases (AC3.2) are the highest-defect-density surface left.

(5) **Decision log:** 001, 002, 003 (gate relocation — binding Mahsun directive).

## Browser verification performed (controller, live dist build)
- Audio + telemetry + mute button + onboarding banner all present and functional (`__rafAudio`, `__rafTelemetry`, buttons, save shows sound:false after toggle)
- Drag placement visually correct under pointer with offset active; state cells match screenshot
- SKIP ends hints; mute persists to `raf.save`
- CI: ALL GREEN — 88/88 tests, core gate 195/200/0 deaths/781ms, daily 365/365/0 retries
