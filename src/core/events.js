// Olay listesi — hem renderer hem telemetri tüketir (brief §5.3).
// step() bunları üretir; isimler SABİT, brief ile birebir.
export const EVENT = {
  PIECE_PLACED: 'piece_placed',
  INVALID_DROP: 'invalid_drop',
  CLUSTER_CLEARED: 'cluster_cleared', // {cells,chain,mult}
  RING_COLLAPSED: 'ring_collapsed',   // {n}
  RING_RESTORED: 'ring_restored',
  WAVE_UP: 'wave_up',                 // {n}
  RUN_STARTED: 'run_started',
  RUN_ENDED: 'run_ended',             // {reason,score,wave,ms}
  DAILY_DONE: 'daily_done',
  UI_CLICK: 'ui_click',               // {id}
};
