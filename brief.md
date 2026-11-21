# BRIEF v2 (English) — "RAF" (working title) — pressure-puzzle for CrazyGames
Single source of truth. 2026-11-21. Executor: omp director + workers. (Turkish original: brief-v2-tr.md)

## 0. How to use this document
- This text is the single source of truth. Chat history, earlier briefs, verbal handoffs are invalid.
- Workers start blank: each worker gets the relevant section of this document + the data contract (5.3). A worker may not make a decision not written in this document; if it must, it follows the default rule in 9.6 and logs it to the decision log.
- Every number carries one of three tags: MEASURED (a number we produced), FACT (sourced platform reality), ASSUMPTION (to be tested). ASSUMPTIONs are tested by the day-3 gate (section 8) and the table in section 10.
- Language: game-facing text is ENGLISH (QA requirement). Code identifiers English; comments may be Turkish.

## 1. Product
One sentence: a 2D puzzle where you place same-colored crates on an 8x8 rack and clear them by connecting 4+, while the outer ring of the rack collapses every 4 placements — chaining run after run in a single session.
Identity anchor (also written into the QA note): "Clearing gives you room back; failing to clear takes it away." This is the mechanical differentiator, not the visuals.
Working title: RAF. The final name will be English; decision owner is Mahsun, deadline day 18. Until then the code constant 'raf' is used; when the name changes, only config changes.

## 2. Core loop — specification
### 2.1 Board and pieces
- Single screen, single input: drag a piece from one of the 3 tray slots onto the board. NO rotation (v1).
- Active area starts 8x8. Each cell has 1 color + 1 glyph (▲ ● ■ ✦). Starts with 3 colors; the 4th unlocks at wave 4.
- Piece: 1-3 cells of a single color (single, domino, L-tromino). 3 pieces visible in the tray; when one is placed, the queue refills it. The queue is generated from the seed (deterministic).
- Placement: a piece may only be dropped on empty cells, fully inside the active area. Placed cells are permanent.
### 2.2 Clearing
- An orthogonally connected group of 4+ same-color cells clears. Score = 10 x cells. Chain (a new group forms after a clear) multiplier 1.5 / 2 / 2.5.
- Every 5th clear re-opens one ring (active area +1, max 8x8); the re-opened ring must be empty.
### 2.3 Pressure (collapse)
- Every 4 placements, the active area shrinks by one ring: 8→7→6→5→4. Filled cells in the collapsing ring are destroyed and added to the 'waste' counter (waste x 50 point penalty).
- Lower bound 4x4. At 4x4 collapsing stops; pressure then comes only from 'nothing fits'.
### 2.4 Run and wave
- Run = one board, one session fragment. Wave = 8 placements. At wave boundaries a difficulty step: wave 2 adds tromino+L, wave 4 adds the 4th color, wave 6 adds a 4-cell piece.
- In v1 no mechanics unlock mid-run: every run starts at wave 1. (Rationale: replayability; the first 10 seconds are always equally clear.)
- Persistent progression comes in Sprint 3: 1 perk unlocks every 2 waves (max 4), written to save.
### 2.5 Ending
- A run ends when NONE of the tray pieces fit anywhere in the active area. No lives, no timer, no move quota.
- End screen: score, wave, duration, best score and a single 'PLAY AGAIN' button. No countdown, no reward promises, no ad forcing.
### 2.6 Daily board and streak
- Seed = fnv1a('raf-' + YYYY-MM-DD). Same day, same first 10 pieces. No ranking.
- Streak is local: +1 when a day completes. Clock rule: rolled-back clocks are ignored; jumping forward 2+ days resets it; skipping a day resets it.
- The daily board is NOT the core: separate button; the run loop fully works without it.
### 2.7 Tuning table — SINGLE SOURCE: src/config/tuning.js
| Key | v1 value | Tag |
|---|---|---|
| arena start | 8x8 | ASSUMPTION A1 |
| collapse frequency | every 4 placements | ASSUMPTION A1 |
| ring re-open | every 5 clears | ASSUMPTION A1 |
| cluster threshold | 4 | ASSUMPTION |
| tray | 3 pieces | ASSUMPTION |
| wave length | 8 placements | ASSUMPTION |
| target run duration (median) | 5-8 min | ASSUMPTION A1 |
| target session (median) | >=10 min and >=2 runs | FACT: Basic Launch KPI threshold |
Rule: no game constants outside tuning.js. Lint rule in CI; violation = red build.

## 3. Out of scope (v1)
| Excluded | Rationale |
|---|---|
| Multiplayer / backend | CrazyGames provides no server; solo developer |
| Local 2P hot-seat | Evidence exists (2P median 28.6M) but scope. Trigger: if Basic Launch D1 <10%, candidate for v1.1 |
| Merge/decoration meta, idle, clicker | Saturated stock (256 merge, 582 idle) + live-ops burden |
| .io, brainrot clone | Backend + clone rejection |
| Leaderboard | Invite-only, one per game, weekly reset; zero dependency |
| IAP | none in v1 |
| Rewarded ads | none in v1; the cost is quantified in 4.6 |
| Story, level map, multiple modes | Scope |
| Non-English language | QA requires English |
| Rotation, hold slot | Hold evaluated in Sprint 3; rotation never |

## 4. Platform rules — inviolable
Source: docs.crazygames.com, read live 2026-11-21. All verified facts.
### 4.1 Technical
- Total build <=250 MB, <=1500 files, initial download <=50 MB; mobile homepage <=20 MB. Our target: <=5 MB.
- All paths RELATIVE (absolute paths don't work). Vite base './'; CI greps for src="/ and href="/.
- Chrome + Edge mandatory; must run smoothly on a 4 GB Chromebook or it gets shut down on ChromiumOS.
- Load <10 s (our target <3 s); time-to-gameplay <=20 s.
- Desktop must be playable in landscape; portrait accepted (bars on the sides).
- Device detection via the platform's system info; do NOT use ontouchstart (touchscreen laptops).
### 4.2 Ads (rejection reasons)
- Midgame only at run end. Midgame on navigation buttons (menu, settings, shop) is FORBIDDEN.
- The SDK manages frequency: at most once per 3 minutes; early requests are silently ignored. We build NO extra frequency logic; request at the right moment, leave the rest to the SDK.
- During an ad the game pauses and audio mutes; on adError the game continues.
- No banners (v1). No rewarded (v1).
- Adblock users must be able to play fully; punishment is forbidden.
### 4.3 Basic Launch drill
- With the SDK integrated but ads DISABLED, the game must not freeze and must not show dead buttons. This is a QA rejection reason; mandatory config-flag test (AC4.4).
### 4.4 KPIs (Basic Launch: 7 days AND >=500 plays, both)
- Average session >=10 min. D1 10-15% (platform average 6.7%). Conversion (>1 min play) >=80%. Load <10 s. Build <20 MB.
- Basic Launches starting after 2026-11-23 have CTR as a 4th metric. Our launch is after that date: CTR is a gate.
### 4.5 Originality
- QA rejects: clones/asset flips, inappropriate themes, content beyond PEGI-12, missing English.
- The mechanical originality rationale (the identity anchor in section 1) goes into the QA note. Every asset's source+license is kept in /docs/licenses.md; no asset/name/icon may be taken from existing games.
### 4.6 The cost of the rewarded decision (inference)
- Puzzle category: 8.9 impressions/play (4.2 rewarded + 4 midgame). Without rewarded the ceiling is ~4.7.
- At $4 per 1000 impressions, 100k plays is ~$1,880 gross instead of ~$3,560; roughly half.
- This loss is knowingly accepted (scope). v1.1 candidate: one per run, wave >=3 condition, compliant rewarded with a no-ad alternative path.

## 5. Technical decisions
### 5.1 Engine: PixiJS 8 + Vite. DECIDED, not up for debate.
Rationale: (a) 2D cell/particle load is exactly Pixi's job; sprite batch + ticker + simple tweens make 60 fps low-risk. (b) Phaser's scene/asset/physics pipeline is unnecessary here; the extra concepts mislead blank-starting workers. (c) Raw Canvas means hand-writing juice (tween, particles, text), costing Sprint 2 3-5 days. (d) Unity is off by default on iOS + WebGL memory risk; Godot web export has size/perf risk; Construct has weak solver/CI control.
Fallback protocol (one-shot, end of day 1): prod build gz <=700 KB; on Chrome 4x CPU throttle, 64 cells + 60 particles >=55 fps; first frame <=1.5 s. If any fails, day 2 gets a 4-hour vanilla Canvas spike (same scene) and comparison. Result in /docs/decisions/002-engine.md: measurement table + choice. Mahsun is not asked; closes day 2 at 18:00.
### 5.2 Constraints
- Plain JS (ES modules). No framework, no TypeScript (JSDoc is enough — worker speed).
- 60 fps definition: under 4x CPU throttle, average >=55, 1% low >=40.
- First frame <=3 s (Fast 3G + 4x CPU). Build gz <=5 MB (target 2 MB).
- All game text in English, single strings file.
### 5.3 Data contract — the precondition for parallel work
state = { v:1, seed, mode:'run'|'daily', placements, wave, arena:{x0,y0,w,h}, cells:[{x,y,c,g}], tray:[id,id,id], queue:[...], score, clears, waste, status:'playing'|'over' }
step(state, action) -> { state, events:[] }   // pure function
Rules:
- step() imports neither DOM nor Pixi.
- Randomness only via mulberry32(seed).
- Same seed + same action sequence = same state (hash test mandatory).
- The renderer reads state, never writes it. The generator only produces the queue.
Event list (consumed by both renderer and telemetry): piece_placed, invalid_drop, cluster_cleared{cells,chain,mult}, ring_collapsed{n}, ring_restored, wave_up{n}, run_started, run_ended{reason,score,wave,ms}, daily_done, ui_click{id}.
### 5.4 Generation and validation
- Bot: fixed heuristic (placement maximizing neighboring matches; ties broken by proximity to center), deterministic, code in /tools/bot.js.
- Core run gate (every PR): 200 seeds x bot -> >=90% of seeds reach wave 4; no seed dies before placement 12. Duration <=120 s.
- Daily board gate (build CI): 365 days x 1 run, budget 1 s/board (~6 min total). Rule: bot must reach wave 3. If not, append '-r1', '-r2' to the seed (max 3 attempts); the derivation rule is written down, so the date-seed promise isn't broken. Result in /reports/daily-365.json.
- This bot is NOT a 'solvability proof' (A4). No optimal-play claim; the only claim is 'no death-by-nothing-fits before move 12'.
### 5.5 Single tuning source: src/config/tuning.js (2.7).
### 5.6 Saving: localStorage + CG Data module dual write; schema {v, best, totalRuns, streak, dailyDone, lastDay, sound, unlocks}; on conflict the higher value; version bumps get a migration function.
### 5.7 Art/sound: AI generation + CC0 packs; every asset recorded in /docs/licenses.md with source+license.

## 6. Telemetry and KPI measurement
### 6.1 Local log
- The 5.3 events go into an in-memory ring buffer (max 5000), with a JSON export button (hidden in dev builds). No network calls.
### 6.2 Who measures what
| Metric | Source | Note |
|---|---|---|
| Average session | CG panel (primary) + local log (secondary) | platform measures |
| D1 retention | CG panel | not measurable locally |
| Conversion (>1 min) | CG panel | not measurable locally |
| CTR | CG panel (cover art) | depends on cover quality |
| Runs/session, run duration, time to first clear, 2nd-run rate | local log / observation | section 8 gate |
Critical: D1 and conversion cannot be measured locally (no user identity). That is why the day-3 gate looks at our own behavioral metrics, not platform metrics.

## 7. Schedule and sprint acceptance criteria
35 days (5 weeks) total to Basic Launch; Full Launch in weeks 6-8. Proven comparable games took 1-3 months; this schedule only holds if scope stays narrow. A promise of gates, not dates.

### Day 0 (half day) — skeleton
- AC0.1 npm run build -> dist; all paths relative (grep test passes); CI green.
- AC0.2 CI: build + gz size report + determinism test + lint (constant ban outside tuning).
- AC0.3 Playtest link live; opens on phone and desktop.
Evidence: link, CI screenshot, size report.

### Sprint 1 — days 1-3 — core
- AC1.1 Full single run: start -> place -> clear -> collapse -> fail -> PLAY AGAIN. Mouse alone is sufficient.
- AC1.2 Determinism: 10 seeds x 100 random actions -> state hash matches 100%.
- AC1.3 Pressure is perceptible: >=4 of 5 blind testers see a fail within 8 minutes.
- AC1.4 Performance: gz <=5 MB; first frame <=3 s (Fast 3G + 4x CPU); >=55 fps average, 1% low >=40.
- AC1.5 Input latency: drop -> visual response <=100 ms (median of 20 samples, log-backed).
- AC1.6 Invalid drop: visual + sound feedback <=100 ms; piece returns to tray.
- AC1.7 Telemetry: 5.3 events recorded, JSON export works.
- AC1.8 Color blindness: 4 colors distinguishable under protanopia simulation; each color has its own glyph.
Evidence: 90 s recording (full run), CI output, perf report, 5 test notes.
End: STOP. Section 8 gate.

### Sprint 2 — days 4-10 — feel + mobile
- AC2.1 Feedback matrix: >=3 simultaneous channels per event (visual/sound/number-motion); table in the repo.
- AC2.2 Clearing: particle burst + cell pulse 1.0->1.25->1.0 <=180 ms + shake <=6 px / <=120 ms + number pop + sound. >=50 fps during a 4-chain clear.
- AC2.3 Time to first clear: median <=20 s for new players (5 people).
- AC2.4 Audio: 8 SFX + 1 loop; persistent mute; the ad hook pulls audio to 0.
- AC2.5 Mobile: arena fully visible at 360x640; touch target >=44 px; finger offset +40 px; playable in portrait and landscape.
- AC2.6 Ad placement: exactly 1 request at run_ended; no requests during a run (log proof).
- AC2.7 Onboarding: 3 hints, non-blocking, once in the first run, skippable, English.
Evidence: 3 min recording (2 runs), mobile recording, fps graph, feedback matrix.

### Sprint 3 — days 11-17 — meta, daily, save
- AC3.1 Saving: best, totalRuns, streak, sound survive reload; schema v + migration exist.
- AC3.2 Streak clock tests: 10 scenarios (rolled-back clock, +2-day jump, skipped day, first day) all pass.
- AC3.3 Daily: same day two devices same first 10 pieces (test); separate button; tied to streak.
- AC3.4 Generation gates: core 200 seeds >=90% wave 4 (<=120 s); 365-day report <=10 min and all days pass.
- AC3.5 Persistent unlocks: 4 perks, 1 per 2 waves, unlock notification exists, written to save.
Evidence: CI timings, /reports/daily-365.json, test list, 60 s recording (daily flow).

### Sprint 4 — days 18-28 — identity, cover, SDK, QA
- AC4.1 Visual identity: the collapse/rack metaphor on every screen; palette 3+1; font license documented; licenses.md complete.
- AC4.2 Cover/icon: 3 variants in CG dimensions. Winner chosen with a 12-person 10-second comprehensibility test ('what are you doing?' -> correct verb >=70%). NO A/B: new-game traffic (thousands) cannot separate two variants.
- AC4.3 SDK: init; gameplayStart/Stop at every run boundary; happytime at run end; midgame only at run_ended; continue on adError; fully playable with adblock; pause + mute during ads.
- AC4.4 Basic Launch drill: ads OFF via config; game doesn't freeze; no dead buttons (screen recording).
- AC4.5 English: all UI strings in an external file; no Turkish text in the build (grep).
- AC4.6 QA matrix: Chrome / Edge / 4 GB Chromebook / landscape / portrait / relative paths / file count / size — every row PASS.
Evidence: test matrix, cover test notes, dist report, 2 min recording.

### Sprint 5 — days 29-35 — release
- AC5.1 QA submission day 29. If rejected, a fix loop <=5 days.
- AC5.2 Basic Launch begins; when the 7-day AND >=500-plays window closes, the KPI table is filled in.
- AC5.3 Decision: session >=10 min and D1 >=10% -> Full Launch prep. Below that, 1 iteration (cover + first 30 s) and re-measure; still below -> stop + report.

## 8. Day-3 kill gate
Purpose: measure whether the core makes people start a second run on their own. No content work (meta, daily board) starts before this gate passes; only bug fixes and feel continue.
Who: Mahsun recruits 12-20 people (min 12). At least 4 who never play block/puzzle games, at least 4 on mobile.
When: within 24 hours after Sprint 1 delivery.
Protocol (non-negotiable):
1. Person alone, quiet environment. One sentence: 'Play as long as you like.' No other explanation, hints, or time pressure.
2. Observer notes: seconds to first placement, first clear, first fail; spontaneous new run within 30 s after fail (Y/N); total runs; total time.
3. 10-minute hard cap; the person may quit earlier.
4. At the end one question: 'What were you trying to do?' Correct answer: connect same colors 4+ and clear them.
Primary metric: spontaneous second-run rate (definition: a new run within 30 s after fail, without prompting).
Thresholds (recorded BEFORE the test):
- PASS: rate >=50% and median session >=8 min -> Sprint 2 full speed.
- RETRY (one right): rate 30-49%; OR rate <50% but >=60% of participants describe the rule wrong -> 3-day focused fix (first-10-seconds clarity + the fail/restart moment), same protocol with 12 new people.
- STOP: rate <30% with good comprehension; OR median session <5 min; OR still below threshold in the retry round -> report + stop.
Decision owner: Mahsun. If no decision within 48 hours, default RETRY (once); if that is also below threshold, STOP.
Honesty note: n=12-20 is directional, not a statistical test. With a true rate of 30%, seeing 6/12 in 12 people has a ~12% chance; hence the single retry. Schedule pressure does not change thresholds.
Gate report (1 page): n, rate, median session, run distribution, comprehension rate, 3 quotes, decision recommendation.

## 9. Working protocol
### 9.1 Workstreams (parallel; contract 5.3)
| W | Work | Tier | First delivery |
|---|---|---|---|
| W1 | Sim: state, step(), rules, determinism tests | good | end of day 1 |
| W2 | Renderer + juice + mobile input | fast | end of day 2 |
| W3 | Generator + bot + CI gates | fast | end of day 2 |
| W4 | UI shell, i18n strings, telemetry, SDK | fast | end of day 3 |
Rule: W1 and W2 never import each other; communication only via state + events. W2 does not merge visuals for new events until W1's tests pass.
### 9.2 Every sprint report (mandatory template)
(1) build link + commit hash. (2) AC table row by row PASS/FAIL + evidence links. (3) FAIL items + why + estimated time. (4) The biggest risk of the next sprint. (5) Decision-log additions.
The word 'done' may not be used without evidence. No measurement = the item FAILED.
### 9.3 Definition of evidence
Screen recording (specified duration and content), perf report (numbers), test notes (who, how many, what happened), CI log. A single screenshot is not evidence.
### 9.4 Decision log
/docs/decisions/NNN-title.md: decision, options, rationale, numbers, date, status (ACCEPTED / PENDING-MAHSUN).
### 9.5 Questions to Mahsun don't stop work
Question + default branch + response deadline are written down; the director continues on the default branch.
### 9.6 Default-branch rule
For situations not covered by this document, apply the smallest reversible option and log it to the decision log.
### 9.7 Blockers
If blocked for more than 2 hours, don't stall: proceed on the default branch and record the blocker in the report.
### 9.8 Commits
Small, single-topic, English messages. The 5.4 gates must be green in every PR.

## 10. Assumptions and falsification conditions
| # | Assumption | Falsifying measurement | Then |
|---|---|---|---|
| A1 | 8x8 + collapse every 4 placements yields 5-8 min runs | G1 median run <3 min or >12 min | tuning: collapse frequency / arena size |
| A2 | The pressure is fun, a second run is wanted | G1 second-run rate <50% | retry round; still low -> STOP |
| A3 | Mobile drag is usable | wrong-drop rate >15% in mobile test | retarget offset; if needed a 'tap-then-tap' mode |
| A4 | The bot threshold (wave 4) represents real difficulty | G1 players reach half of the bot's result | retune threshold and difficulty curve |
| A5 | Daily board + streak lift D1 | Basic Launch D1 <10% | reduce daily-board investment; invest in cover + first 30 s |
| A6 | The 10-second cover test predicts CTR | live CTR is low | change cover, revise the test protocol |
| A7 | $4/1000 impressions and 8.9 impressions/play hold for this game | first real payout | revise the revenue model |
| A8 | 4-6 weeks is enough | at the end of Sprint 3 <80% of ACs passed | scope cut |
Scope-cut order (written, non-negotiable): daily board first, then persistent unlocks, feel last.

## 11. Open questions for Mahsun (work doesn't stop)
1. Final English name: 3 candidates, decision by day 18. (default: keep RAF working title)
2. Art: is AI generation allowed, any budget? (default: AI + CC0, budget 0)
3. Can 12-20 testers be found for two rounds? (default: yes; if not, the gate runs with 8 and the report says so)
4. Developer portal: the main-contract revenue share must be confirmed (the evidence package has 60% only for jam terms).
5. Is the Full Launch date fixed or KPI-dependent? (default: KPI-dependent)

## 12. First 24 hours (in order)
1. /docs/decisions/001-scope.md: acceptance of this brief + the A-list.
2. Repo skeleton: Vite + Pixi, base './', tuning.js, strings.js.
3. W1: state schema + step() skeleton + 3 unit tests (placement, clearing, collapse).
4. W3: mulberry32 + queue generator + bot skeleton + 200-seed run (placeholder threshold until rules are done).
5. W4: telemetry event list + JSON export + CI (size, relative paths, determinism).
6. W2: Pixi scene, 8x8 grid, drag & drop, invalid-drop feedback.
7. Day 1, 18:00: 5.1 measurement table -> engine decision closes.
8. Day 3, 18:00: AC1.1-AC1.8 table + 90 s recording + gate report draft.

There is no context outside this document.
