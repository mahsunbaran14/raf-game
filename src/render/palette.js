// Renderer-owned palette. Hex literals are allowed by the constant lint.
// Cell hues are picked for lightness separation under protanopia:
// blue (dark) / amber (bright) / teal (mid) / plum (mid-dark), and each
// color also carries its own glyph (see GLYPHS).
export const PALETTE = {
  bg: 0x14161a,
  boardBg: 0x1c2027,
  outsideArena: 0x0e1013,
  gridLine: 0x2a2f38,
  arenaBorder: 0x3a4150,
  slot: 0x1b1f26,
  slotBorder: 0x2f353f,
  text: 0xe8e8e8,
  textDim: 0x9aa1ad,
  glyph: 0xf7f7f7,
  button: 0x2456d6,
  buttonText: 0xffffff,
  valid: 0x6ef2a0,
  invalid: 0xe04b4b,
  cells: [0x2456d6, 0xe6a119, 0x1db5a0, 0xb03aa0],
};
