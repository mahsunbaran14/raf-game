// PixiJS 8 scene for RAF: board, tray, pointer drag & drop, HUD and the
// run-over overlay. The renderer only reads state; every mutation goes
// through step(state, action) from the pure sim.
import { Application, Container, Graphics, Text } from 'pixi.js';
import { TUNING } from '../config/tuning.js';
import { STRINGS } from '../config/strings.js';
import { EVENT } from '../core/events.js';
import { startRun } from '../sim/state.js';
import { step } from '../sim/step.js';
import { GLYPHS } from '../sim/shapes.js';
import { PALETTE } from './palette.js';
import { layoutFor } from './layout.js';
import { canPlace, pieceOf } from './validity.js';
import { loadSave, recordRun } from './save.js';

const N = TUNING.ARENA_START;
const TRAY = TUNING.TRAY_SIZE;
const FONT_FAMILY = 'system-ui, sans-serif';
const SECONDS_PER_MINUTE = 0x3c; // 60
const MS_PER_SECOND = 0x3e8; // 1000
const POPUP_MS = 0x258; // 600ms score pop flight
const INVALID_MS = 100; // AC1.6: visual response under 100ms

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms / MS_PER_SECOND));
  const minutes = Math.floor(total / SECONDS_PER_MINUTE);
  const seconds = total - minutes * SECONDS_PER_MINUTE;
  return minutes + ':' + String(seconds).padStart(2, '0');
}

function shapeBounds(shape) {
  let maxX = 0;
  let maxY = 0;
  for (const [dx, dy] of shape.cells) {
    if (dx > maxX) maxX = dx;
    if (dy > maxY) maxY = dy;
  }
  return { w: maxX + 1, h: maxY + 1 };
}

function pointIn(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

export async function createGame(container, options = {}) {
  const emit = typeof options.onEvent === 'function' ? options.onEvent : () => {};
  const nextSeed =
    typeof options.newSeed === 'function' ? options.newSeed : () => 1;

  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const app = new Application();
  await app.init({
    width,
    height,
    background: PALETTE.bg,
    antialias: true,
    autoDensity: true,
    resolution: globalThis.devicePixelRatio || 1,
  });
  app.canvas.style.touchAction = 'none';
  container.appendChild(app.canvas);

  // --- scene graph -------------------------------------------------------
  const world = new Container();
  app.stage.addChild(world);

  const boardLayer = new Container();
  const fxLayer = new Container();
  const piecesLayer = new Container();
  const uiLayer = new Container();
  world.addChild(boardLayer, fxLayer, piecesLayer, uiLayer);

  const boardGfx = new Graphics();
  const cellGfx = new Graphics();
  const cellTexts = new Container();
  const highlightGfx = new Graphics();
  const trayLayer = new Container();
  const dragLayer = new Container();
  boardLayer.addChild(boardGfx, cellGfx, cellTexts);
  piecesLayer.addChild(highlightGfx, trayLayer, dragLayer);

  // --- HUD ---------------------------------------------------------------
  const hud = {
    score: new Text({ text: '', style: { fontFamily: FONT_FAMILY, fill: PALETTE.text } }),
    best: new Text({ text: '', style: { fontFamily: FONT_FAMILY, fill: PALETTE.textDim } }),
    wave: new Text({ text: '', style: { fontFamily: FONT_FAMILY, fill: PALETTE.textDim } }),
    waste: new Text({ text: '', style: { fontFamily: FONT_FAMILY, fill: PALETTE.textDim } }),
  };
  hud.best.anchor.set(1, 0);
  hud.waste.anchor.set(1, 0);
  for (const key of Object.keys(hud)) uiLayer.addChild(hud[key]);

  // --- overlay -----------------------------------------------------------
  const overlay = new Container();
  overlay.visible = false;
  uiLayer.addChild(overlay);
  const overlayDim = new Graphics();
  const overlayTitle = new Text({
    text: STRINGS.gameOver,
    style: { fontFamily: FONT_FAMILY, fontWeight: 'bold', fill: PALETTE.text },
  });
  overlayTitle.anchor.set(1 / 2);
  const overlayLines = {
    score: new Text({ text: '', style: { fontFamily: FONT_FAMILY, fill: PALETTE.text } }),
    wave: new Text({ text: '', style: { fontFamily: FONT_FAMILY, fill: PALETTE.text } }),
    time: new Text({ text: '', style: { fontFamily: FONT_FAMILY, fill: PALETTE.text } }),
    best: new Text({ text: '', style: { fontFamily: FONT_FAMILY, fill: PALETTE.textDim } }),
  };
  const overlayButton = new Container();
  const overlayButtonBg = new Graphics();
  const overlayButtonText = new Text({
    text: STRINGS.playAgain,
    style: { fontFamily: FONT_FAMILY, fontWeight: 'bold', fill: PALETTE.buttonText },
  });
  overlayButtonText.anchor.set(1 / 2);
  overlayButton.addChild(overlayButtonBg, overlayButtonText);
  overlay.addChild(overlayDim, overlayTitle);
  for (const key of Object.keys(overlayLines)) {
    overlayLines[key].anchor.set(1 / 2);
    overlay.addChild(overlayLines[key]);
  }
  overlay.addChild(overlayButton);

  // --- tray slots (persistent so drag feedback can tint them) -------------
  const slotRoots = [];
  const slotBackgrounds = [];
  const slotPreviews = [];
  const slotRects = [];
  for (let i = 0; i < TRAY; i += 1) {
    const root = new Container();
    const bg = new Graphics();
    const preview = new Container();
    root.addChild(bg, preview);
    trayLayer.addChild(root);
    slotRoots.push(root);
    slotBackgrounds.push(bg);
    slotPreviews.push(preview);
    slotRects.push({ x: 0, y: 0, w: 1, h: 1 });
  }

  // --- state -------------------------------------------------------------
  let layout = layoutFor(app.screen.width, app.screen.height);
  let state = null;
  let runStartedAt = 0;
  let runEndedAt = 0;
  let activeDrag = null;
  let buttonRect = null;
  let saveData = loadSave(options.storage);
  const tweens = [];

  function tween(duration, update, done) {
    tweens.push({ elapsed: 0, duration, update, done });
  }

  app.ticker.add((ticker) => {
    for (let i = tweens.length - 1; i >= 0; i -= 1) {
      const item = tweens[i];
      item.elapsed += ticker.deltaMS;
      const k = Math.min(1, item.elapsed / item.duration);
      item.update(k);
      if (k >= 1) {
        tweens.splice(i, 1);
        if (item.done) item.done();
      }
    }
  });

  // --- drawing -----------------------------------------------------------
  function drawPieceCells(target, piece, cellSize) {
    for (const child of target.removeChildren()) child.destroy();
    const inset = Math.max(1, Math.round(cellSize / 2 / 2 / 2 / 2));
    const radius = Math.max(1, Math.round(cellSize / 2 / 2));
    const fill = PALETTE.cells[piece.color] || PALETTE.cells[0];
    const g = new Graphics();
    for (const [dx, dy] of piece.shape.cells) {
      g.roundRect(
        dx * cellSize + inset,
        dy * cellSize + inset,
        cellSize - inset * 2,
        cellSize - inset * 2,
        radius,
      ).fill(fill);
    }
    target.addChild(g);
    for (const [dx, dy] of piece.shape.cells) {
      const glyph = new Text({
        text: piece.glyph,
        style: {
          fontFamily: FONT_FAMILY,
          fontSize: Math.max(1, Math.round(cellSize / 2)),
          fill: PALETTE.glyph,
        },
      });
      glyph.anchor.set(1 / 2);
      glyph.position.set(dx * cellSize + cellSize / 2, dy * cellSize + cellSize / 2);
      target.addChild(glyph);
    }
  }

  function syncBoard() {
    const { cell, boardX, boardY, boardW, boardH, gap, inset } = layout;
    boardGfx.clear();
    boardGfx.roundRect(boardX, boardY, boardW, boardH, gap).fill(PALETTE.boardBg);

    const arena = state.arena;
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const inside =
          x >= arena.x0 &&
          y >= arena.y0 &&
          x < arena.x0 + arena.w &&
          y < arena.y0 + arena.h;
        if (!inside) {
          boardGfx
            .rect(boardX + x * cell, boardY + y * cell, cell, cell)
            .fill(PALETTE.outsideArena);
        }
      }
    }

    const ax = boardX + arena.x0 * cell;
    const ay = boardY + arena.y0 * cell;
    const aw = arena.w * cell;
    const ah = arena.h * cell;
    for (let i = 0; i <= arena.w; i += 1) {
      boardGfx.moveTo(ax + i * cell, ay).lineTo(ax + i * cell, ay + ah);
    }
    for (let i = 0; i <= arena.h; i += 1) {
      boardGfx.moveTo(ax, ay + i * cell).lineTo(ax + aw, ay + i * cell);
    }
    boardGfx.stroke({ width: 1, color: PALETTE.gridLine });
    boardGfx
      .rect(ax, ay, aw, ah)
      .stroke({ width: 2, color: PALETTE.arenaBorder });

    cellGfx.clear();
    for (const child of cellTexts.removeChildren()) child.destroy();
    for (const cellData of state.cells) {
      const x = boardX + cellData.x * cell;
      const y = boardY + cellData.y * cell;
      cellGfx
        .roundRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2, gap)
        .fill(PALETTE.cells[cellData.c] || PALETTE.cells[0]);
      const glyph = new Text({
        text: GLYPHS[cellData.g] || GLYPHS[0],
        style: {
          fontFamily: FONT_FAMILY,
          fontSize: Math.max(1, Math.round(cell / 2)),
          fill: PALETTE.glyph,
        },
      });
      glyph.anchor.set(1 / 2);
      glyph.position.set(x + cell / 2, y + cell / 2);
      cellTexts.addChild(glyph);
    }
  }

  function syncTray() {
    const { slot, gap, trayX, trayY } = layout;
    const previewCell = Math.max(1, Math.floor(slot / 2 / 2));
    for (let i = 0; i < TRAY; i += 1) {
      const stepX = layout.trayHorizontal ? 0 : slot + gap;
      const stepY = layout.trayHorizontal ? slot + gap : 0;
      const x = trayX + i * stepX;
      const y = trayY + i * stepY;
      const root = slotRoots[i];
      root.position.set(x, y);
      root.alpha = 1;
      slotPreviews[i].alpha = 1;
      slotRects[i] = { x, y, w: slot, h: slot };

      const bg = slotBackgrounds[i];
      bg.tint = 0xffffff;
      bg.clear();
      bg.roundRect(0, 0, slot, slot, gap)
        .fill(PALETTE.slot)
        .stroke({ width: 2, color: PALETTE.slotBorder });

      const pieceId = state.tray[i];
      if (pieceId === undefined) {
        for (const child of slotPreviews[i].removeChildren()) child.destroy();
        continue;
      }
      const piece = pieceOf(state.seed, pieceId);
      drawPieceCells(slotPreviews[i], piece, previewCell);
      const bounds = shapeBounds(piece.shape);
      slotPreviews[i].position.set(
        (slot - bounds.w * previewCell) / 2,
        (slot - bounds.h * previewCell) / 2,
      );
    }
  }

  function syncHud() {
    const { cell } = layout;
    const fontSize = Math.max(1, Math.round(cell / 2 / 2));
    const pad = Math.max(2, Math.round(Math.min(app.screen.width, app.screen.height) / 100));
    for (const key of Object.keys(hud)) hud[key].style.fontSize = fontSize;
    hud.score.text = STRINGS.score + ' ' + state.score;
    hud.best.text = STRINGS.best + ' ' + saveData.best;
    hud.wave.text = STRINGS.wave + ' ' + state.wave;
    hud.waste.text = STRINGS.waste + ' ' + state.waste;
    hud.score.position.set(pad, pad);
    hud.best.position.set(app.screen.width - pad, pad);
    hud.wave.position.set(pad, pad * 2 + fontSize);
    hud.waste.position.set(app.screen.width - pad, pad * 2 + fontSize);
  }

  function drawOverlay() {
    if (state.status === 'playing') {
      overlay.visible = false;
      buttonRect = null;
      return;
    }
    overlay.visible = true;
    const w = app.screen.width;
    const h = app.screen.height;
    const { cell, gap } = layout;
    const pad = Math.max(2, Math.round(Math.min(w, h) / 100));
    const titleSize = Math.max(1, Math.round(cell / 2));
    const bodySize = Math.max(1, Math.round(cell / 2 / 2));
    const buttonW = Math.min(w - pad * 2 * 2, cell * 2 * 2);
    const buttonH = cell;

    overlayDim.clear();
    overlayDim.rect(0, 0, w, h).fill({ color: PALETTE.bg, alpha: 1 - 1 / 2 / 2 / 2 });

    const lines = [
      STRINGS.score + ': ' + state.score,
      STRINGS.wave + ': ' + state.wave,
      STRINGS.time + ': ' + formatMs(Math.max(0, runEndedAt - runStartedAt)),
      STRINGS.best + ': ' + saveData.best,
    ];
    const lineGap = gap;
    const blockH =
      titleSize + gap * 2 + lines.length * (bodySize + lineGap) + gap * 2 + buttonH;
    let y = Math.max(pad, Math.round((h - blockH) / 2));
    const cx = w / 2;

    overlayTitle.style.fontSize = titleSize;
    overlayTitle.position.set(cx, y + titleSize / 2);
    y += titleSize + gap * 2;
    for (const key of Object.keys(overlayLines)) {
      overlayLines[key].style.fontSize = bodySize;
      overlayLines[key].position.set(cx, y + bodySize / 2);
      y += bodySize + lineGap;
    }
    y += gap;
    buttonRect = { x: cx - buttonW / 2, y, w: buttonW, h: buttonH };
    overlayButton.position.set(buttonRect.x, y);
    overlayButtonBg.clear();
    overlayButtonBg
      .roundRect(0, 0, buttonW, buttonH, gap)
      .fill(PALETTE.button);
    overlayButtonText.style.fontSize = Math.max(1, Math.round(cell / 2));
    overlayButtonText.position.set(buttonW / 2, buttonH / 2);

    overlayTitle.text = STRINGS.gameOver;
    overlayLines.score.text = lines[0];
    overlayLines.wave.text = lines[1];
    overlayLines.time.text = lines[2];
    overlayLines.best.text = lines[lines.length - 1];
  }

  function sync() {
    syncBoard();
    syncTray();
    syncHud();
    drawOverlay();
  }

  // --- events ------------------------------------------------------------
  function spawnScorePop(event) {
    const { boardX, boardY, cell } = layout;
    let sumX = 0;
    let sumY = 0;
    for (const cellData of event.cells) {
      sumX += cellData.x;
      sumY += cellData.y;
    }
    const count = event.cells.length || 1;
    const x = boardX + (sumX / count + 1 / 2) * cell;
    const y = boardY + (sumY / count + 1 / 2) * cell;
    const points = Math.round(TUNING.SCORE_PER_CELL * event.cells.length * event.mult);
    const pop = new Text({
      text: '+' + points,
      style: {
        fontFamily: FONT_FAMILY,
        fontWeight: 'bold',
        fontSize: Math.max(1, Math.round(cell / 2)),
        fill: PALETTE.valid,
      },
    });
    pop.anchor.set(1 / 2);
    pop.position.set(x, y);
    fxLayer.addChild(pop);
    const startY = y;
    tween(POPUP_MS, (k) => {
      pop.y = startY - cell * k;
      pop.alpha = 1 - k;
    }, () => pop.destroy());
  }

  function applyEvents(events) {
    for (const event of events) {
      emit(event);
      if (event.type === EVENT.RUN_STARTED) {
        runStartedAt = performance.now();
        runEndedAt = 0;
      } else if (event.type === EVENT.RUN_ENDED) {
        runEndedAt = performance.now();
        saveData = recordRun(event.score ?? state.score, options.storage);
      } else if (event.type === EVENT.CLUSTER_CLEARED) {
        spawnScorePop(event);
      }
    }
  }

  // --- drag & drop -------------------------------------------------------
  function localPoint(event) {
    const rect = app.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: (event.clientX - rect.left) * (app.screen.width / rect.width),
      y: (event.clientY - rect.top) * (app.screen.height / rect.height),
    };
  }

  function positionGhost(drag, point) {
    const { cell, boardX, boardY } = layout;
    const off = TUNING.TOUCH_OFFSET ?? 0; // AC2.5 will lift the piece 40px on touch
    const bounds = shapeBounds(drag.piece.shape);
    drag.ghost.position.set(
      point.x - (bounds.w * cell) / 2,
      point.y - (bounds.h * cell) / 2 - off,
    );
    const originX = Math.round((drag.ghost.x - boardX) / cell);
    const originY = Math.round((drag.ghost.y - boardY) / cell);
    drag.origin = { x: originX, y: originY };
    drag.valid = canPlace(state, drag.pieceId, originX, originY);

    highlightGfx.clear();
    const color = drag.valid ? PALETTE.valid : PALETTE.invalid;
    const inset = layout.inset;
    const gap = layout.gap;
    for (const [dx, dy] of drag.piece.shape.cells) {
      const gx = originX + dx;
      const gy = originY + dy;
      if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue;
      const x = boardX + gx * cell;
      const y = boardY + gy * cell;
      highlightGfx
        .roundRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2, gap)
        .fill({ color, alpha: 1 / 2 })
        .stroke({ width: 2, color });
    }
    drag.ghost.alpha = drag.valid ? 1 : 1 / 2;
  }

  function beginDrag(slotIndex, point, pointerId) {
    const pieceId = state.tray[slotIndex];
    if (pieceId === undefined) return;
    const piece = pieceOf(state.seed, pieceId);
    const ghost = new Container();
    drawPieceCells(ghost, piece, layout.cell);
    dragLayer.addChild(ghost);
    activeDrag = { pointerId, slotIndex, pieceId, piece, ghost, origin: { x: 0, y: 0 } };
    slotPreviews[slotIndex].alpha = 1 / 2 / 2;
    positionGhost(activeDrag, point);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  }

  function detachDragListeners() {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
  }

  function handlePointerMove(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    const point = localPoint(event);
    if (!point) return;
    event.preventDefault();
    positionGhost(activeDrag, point);
  }

  function isInvalidDrop(event) {
    return event.type === EVENT.INVALID_DROP;
  }

  function handlePointerUp(event) {
    const drag = activeDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    detachDragListeners();
    activeDrag = null;
    const point = localPoint(event);
    if (point) positionGhost(drag, point);

    const action = {
      type: 'place',
      pieceId: drag.pieceId,
      x: drag.origin.x,
      y: drag.origin.y,
    };
    const result = step(state, action);
    const rejected = result.events.some(isInvalidDrop);
    state = result.state;
    highlightGfx.clear();
    applyEvents(result.events);
    sync();
    if (rejected) {
      feedbackInvalid(drag);
    } else {
      drag.ghost.destroy();
    }
  }

  function handlePointerCancel(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    detachDragListeners();
    activeDrag.ghost.destroy();
    activeDrag = null;
    highlightGfx.clear();
    syncTray();
  }

  function feedbackInvalid(drag) {
    const rect = slotRects[drag.slotIndex];
    const bounds = shapeBounds(drag.piece.shape);
    const cell = layout.cell;
    const fromX = drag.ghost.x;
    const fromY = drag.ghost.y;
    const toX = rect.x + (rect.w - bounds.w * cell) / 2;
    const toY = rect.y + (rect.h - bounds.h * cell) / 2;
    drag.ghost.tint = PALETTE.invalid;

    const bg = slotBackgrounds[drag.slotIndex];
    tween(INVALID_MS, (k) => {
      bg.tint = k < 1 ? PALETTE.invalid : 0xffffff;
      drag.ghost.x = fromX + (toX - fromX) * k;
      drag.ghost.y = fromY + (toY - fromY) * k;
      drag.ghost.alpha = 1 - k;
    }, () => {
      bg.tint = 0xffffff;
      drag.ghost.destroy();
      syncTray();
    });
  }

  function handleCanvasPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (activeDrag) return;
    const point = localPoint(event);
    if (!point) return;
    if (state.status !== 'playing') {
      if (buttonRect && pointIn(point, buttonRect)) {
        emit({ type: EVENT.UI_CLICK, id: 'play_again' });
        startNewRun();
      }
      return;
    }
    for (let i = 0; i < slotRects.length; i += 1) {
      if (pointIn(point, slotRects[i])) {
        event.preventDefault();
        beginDrag(i, point, event.pointerId);
        return;
      }
    }
  }

  function hookInput() {
    app.canvas.addEventListener('pointerdown', handleCanvasPointerDown);
  }

  // --- run lifecycle -----------------------------------------------------
  function startNewRun() {
    if (activeDrag) {
      detachDragListeners();
      activeDrag.ghost.destroy();
      activeDrag = null;
    }
    highlightGfx.clear();
    for (const child of fxLayer.removeChildren()) child.destroy();
    const started = startRun(nextSeed());
    state = started.state;
    runEndedAt = 0;
    applyEvents(started.events);
    sync();
  }

  // --- responsive --------------------------------------------------------
  function relayout() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    app.renderer.resize(w, h);
    layout = layoutFor(w, h);
    if (activeDrag) {
      detachDragListeners();
      activeDrag.ghost.destroy();
      activeDrag = null;
      highlightGfx.clear();
    }
    sync();
  }

  const resizeObserver = new ResizeObserver(() => relayout());
  resizeObserver.observe(container);
  hookInput();
  startNewRun();

  return {
    app,
    getState: () => state,
    destroy() {
      resizeObserver.disconnect();
      app.canvas.removeEventListener('pointerdown', handleCanvasPointerDown);
      detachDragListeners();
      app.destroy(true, { children: true });
    },
  };
}
