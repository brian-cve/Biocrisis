const PALETTE_HEX: readonly number[] = [
  0x050706, 0x0d1210, 0x16201c, 0x212f29, 0x2e4038, 0x3f5549, 0x56705f, 0x7a937c,
  0x14100c, 0x241b13, 0x37281b, 0x4d3924, 0x65502f, 0x806b40, 0x9c8858, 0xb8a672,
  0x1a0808, 0x2c0e0e, 0x421414, 0x5c1c1a, 0x7a2824, 0x9a3a30, 0x2a2a2e, 0x44444a,
  0x5e5e66, 0x7e7e84, 0x9c9ea0, 0xc4c4be, 0x3a4a52, 0x56707a, 0x8a7a2a, 0xc4b040,
];

export const PALETTE_SIZE = PALETTE_HEX.length;
export const LIGHT_LEVELS = 16;
const FOG_RGB: readonly [number, number, number] = [4, 7, 6];

function packRgb(r: number, g: number, b: number): number {
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export const PALETTE_U32: Uint32Array = Uint32Array.from(PALETTE_HEX, (c) =>
  packRgb((c >> 16) & 255, (c >> 8) & 255, c & 255),
);

export const SHADE: Uint32Array = (() => {
  const lut = new Uint32Array(LIGHT_LEVELS * PALETTE_SIZE);
  for (let l = 0; l < LIGHT_LEVELS; l++) {
    const t = Math.pow(l / (LIGHT_LEVELS - 1), 0.85);
    for (let c = 0; c < PALETTE_SIZE; c++) {
      const hex = PALETTE_HEX[c];
      const r = ((hex >> 16) & 255) * (1 - t) + FOG_RGB[0] * t;
      const g = ((hex >> 8) & 255) * (1 - t) + FOG_RGB[1] * t;
      const b = (hex & 255) * (1 - t) + FOG_RGB[2] * t;
      lut[l * PALETTE_SIZE + c] = packRgb(r | 0, g | 0, b | 0);
    }
  }
  return lut;
})();

export const BAYER4: Float32Array = Float32Array.from(
  [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
  (v) => (v + 0.5) / 16,
);
