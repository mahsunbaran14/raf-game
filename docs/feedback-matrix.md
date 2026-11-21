# RAF feedback matrix (AC2.1 / AC2.2)

Every runtime event from `src/core/events.js`. Channels:

| Channel | Meaning | Owner |
|---|---|---|
| **V** visual | spawned/flashed/vanished drawing | S1 juice (`src/render/app.js`, `src/render/fx.js`) |
| **M** motion | transform over time: pulse, thud, shake, flash | S1 juice |
| **N** number-motion | animated or changing numerals | S1 juice (HUD) |
| **S** sound | SFX/loop triggered from the same event | S2 audio (`src/audio/*`, wired to the event bus) |

Sound is **pending S2 audio** in every row; nothing is stubbed in the renderer.
Counts below are channels implemented now; after S2 adds **S** to each row the
"after S2" column is the AC2.1 gate value.

## Matrix

| Event | V | M | N | S | Now | After S2 |
|---|---|---|---|---|---|---|
| `run_started` | board, tray and HUD render for the new seed | — | score/best/wave/waste HUD reset | pending S2 audio | 2 | 3 |
| `piece_placed` | placed cells appear in the rack | thud `0.9 -> 1.0` in 80 ms on the placed cells | — | pending S2 audio | 2 | 3 |
| `invalid_drop` | ghost and tray slot tint red | ghost snaps back to its slot in 100 ms | — | pending S2 audio | 2 | 3 |
| `cluster_cleared` | particle burst, 6-10 particles per cleared cell (life 300 ms) + cleared-cell ghost | cleared cells pulse `1.0 -> 1.25 -> 1.0` in `TUNING.PULSE_MS` (180 ms) | `+N` score pop at the group centroid (600 ms) + `x1.5/x2/x2.5` multiplier line when `chain > 0` | pending S2 audio | 3 | 4 |
| `ring_collapsed` | destroyed ring cells vanish | whole board shakes, max `TUNING.SHAKE_PX` (6 px) for `TUNING.SHAKE_MS` (120 ms) | waste counter and score update in the HUD | pending S2 audio | 3 | 4 |
| `ring_restored` | active arena grows by one ring | 120 ms board flash | — | pending S2 audio | 2 | 3 |
| `wave_up` | wave HUD value changes | 120 ms wave-counter flash | wave number changes | pending S2 audio | 2 | 3 |
| `run_ended` | end overlay (dim + title + lines) | — | final score / wave / time / best | pending S2 audio | 2 | 3 |
| `ui_click` | overlay closes, fresh board drawn | — | HUD numbers reset for the new run | pending S2 audio | 2 | 3 |
| `daily_done` | **not emitted in the v1 renderer**: the daily screen arrives in Sprint 3 (AC3.3) | — | — | pending S2 audio | 0 | 0 (deferred) |

The only row below the gate is `daily_done`, which has no producer in this
build; it gets its channels together with the Sprint 3 daily UI.

## Timing and budget constants

| Effect | Value | Source |
|---|---|---|
| Cell pulse duration | 180 ms | `TUNING.PULSE_MS` |
| Cell pulse peak scale | 1.25 | `src/render/fx.js` (`1 / 4` rise) |
| Shake magnitude / duration | 6 px / 120 ms | `TUNING.SHAKE_PX`, `TUNING.SHAKE_MS` |
| Particle life | 300 ms | `src/render/fx.js` (`0x12c`) |
| Particles per cleared cell | 6-10 | `src/render/fx.js` (`particlesPerCell`) |
| Score pop | 600 ms, 2 font-size rise | `src/render/fx.js` (`0x258`) |
| Placement thud | 80 ms, `0.9 -> 1.0` | `src/render/fx.js` (`0x50`, no tuning key: visual-only) |
| State flash | 120 ms | `src/render/fx.js` (`0x78`, no tuning key: visual-only) |
| Hard particle cap | 256 live | `src/render/fx.js` (`MAX_PARTICLES`) |

Particle and overlay graphics are pooled (`createPool`), so the scene-graph
child count is bounded by the peak burst and does not grow across runs.

## Perf budget (AC2.2)

A 4-cluster chain spawns at most 40 particles per cluster plus one pulse ghost
per cleared cell; the live-particle cap (256) keeps the worst chain inside a
single batchable sprite load.
