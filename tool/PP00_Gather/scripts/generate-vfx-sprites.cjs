/**
 * Generator for PP00 Gather PixelFX transparent PNG spritesheets.
 * Produces crisp, high-contrast pixel-art spritesheets with alpha channels.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    scanlines.writeUInt8(0, rowOffset); // filter: None
    rgbaBuffer.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = chunk('IDAT', zlib.deflateSync(scanlines));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, chunk('IHDR', ihdr), idat, iend]);
}

class CanvasGrid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 4); // all zero = transparent
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const idx = (y * this.w + x) * 4;
    this.buf[idx] = r;
    this.buf[idx + 1] = g;
    this.buf[idx + 2] = b;
    this.buf[idx + 3] = a;
  }

  fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, r, g, b, a);
      }
    }
  }

  fillCircle(cx, cy, radius, r, g, b, a = 255) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) {
          this.setPixel(cx + dx, cy + dy, r, g, b, a);
        }
      }
    }
  }

  toPng() {
    return encodePng(this.w, this.h, this.buf);
  }
}

const outDir = path.join(__dirname, '../static/assets/vfx');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 1. hit-spark.png (4 frames of 32x32 = 128x32)
{
  const g = new CanvasGrid(128, 32);
  // Frame 0: flash core (small)
  g.fillRect(16 - 2, 16 - 2, 5, 5, 30, 41, 59, 255); // dark border
  g.fillRect(16 - 1, 16 - 1, 3, 3, 255, 255, 255, 255); // white core
  // Frame 1: expanding star
  const ox1 = 32;
  g.fillRect(ox1 + 16 - 4, 16 - 4, 9, 9, 30, 41, 59, 255);
  g.fillRect(ox1 + 16 - 3, 16 - 3, 7, 7, 245, 158, 11, 255);
  g.fillRect(ox1 + 16 - 1, 16 - 1, 3, 3, 255, 255, 255, 255);
  // Frame 2: 4 sparks out
  const ox2 = 64;
  g.fillRect(ox2 + 16 - 2, 16 - 2, 5, 5, 255, 255, 255, 255);
  const sparks = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
  for (const [sx, sy] of sparks) {
    g.fillRect(ox2 + 16 + sx - 2, 16 + sy - 2, 5, 5, 30, 41, 59, 255);
    g.fillRect(ox2 + 16 + sx - 1, 16 + sy - 1, 3, 3, 245, 158, 11, 255);
  }
  // Frame 3: dispersed sparks fading
  const ox3 = 96;
  const farSparks = [[-12, -10], [12, -10], [-10, 12], [10, 12]];
  for (const [sx, sy] of farSparks) {
    g.fillRect(ox3 + 16 + sx - 1, 16 + sy - 1, 3, 3, 30, 41, 59, 200);
    g.fillRect(ox3 + 16 + sx, 16 + sy, 2, 2, 245, 158, 11, 200);
  }
  fs.writeFileSync(path.join(outDir, 'hit-spark.png'), g.toPng());
}

// 2. blunt-hit.png (3 frames of 32x32 = 96x32)
{
  const g = new CanvasGrid(96, 32);
  // Frame 0: flash
  g.fillCircle(16, 16, 4, 255, 255, 255, 255);
  // Frame 1: blunt impact shockwave diamond
  const ox1 = 32;
  g.fillRect(ox1 + 16 - 6, 16 - 6, 13, 13, 30, 41, 59, 255);
  g.fillRect(ox1 + 16 - 5, 16 - 5, 11, 11, 245, 158, 11, 255);
  g.fillRect(ox1 + 16 - 2, 16 - 2, 5, 5, 255, 255, 255, 255);
  // Frame 2: fading rings
  const ox2 = 64;
  g.fillCircle(ox2 + 16, 16, 9, 30, 41, 59, 180);
  g.fillCircle(ox2 + 16, 16, 7, 245, 158, 11, 180);
  g.fillCircle(ox2 + 16, 16, 4, 0, 0, 0, 0); // hollow
  fs.writeFileSync(path.join(outDir, 'blunt-hit.png'), g.toPng());
}

// 3. sword-slash.png (3 frames of 32x32 = 96x32)
{
  const g = new CanvasGrid(96, 32);
  // Frame 0: start arc
  for (let y = 8; y <= 24; y++) {
    const x = Math.round(16 + Math.sin((y - 8) / 16 * Math.PI) * 8);
    g.fillRect(x - 1, y, 4, 2, 30, 41, 59, 255);
    g.fillRect(x, y, 2, 2, 245, 158, 11, 255);
  }
  // Frame 1: full bright crescent
  const ox1 = 32;
  for (let y = 4; y <= 28; y++) {
    const x = Math.round(ox1 + 16 + Math.sin((y - 4) / 24 * Math.PI) * 12);
    g.fillRect(x - 2, y, 6, 2, 30, 41, 59, 255);
    g.fillRect(x - 1, y, 4, 2, 255, 255, 255, 255);
  }
  // Frame 2: fading slash tail
  const ox2 = 64;
  for (let y = 8; y <= 24; y += 2) {
    const x = Math.round(ox2 + 20 + Math.sin((y - 8) / 16 * Math.PI) * 8);
    g.fillRect(x, y, 2, 2, 245, 158, 11, 150);
  }
  fs.writeFileSync(path.join(outDir, 'sword-slash.png'), g.toPng());
}

// 4. thrust.png (2 frames of 32x32 = 64x32)
{
  const g = new CanvasGrid(64, 32);
  // Frame 0: jab spike
  g.fillRect(6, 15, 20, 3, 30, 41, 59, 255);
  g.fillRect(7, 16, 18, 1, 255, 255, 255, 255);
  // Frame 1: wind lines
  const ox1 = 32;
  g.fillRect(ox1 + 12, 12, 14, 2, 245, 158, 11, 200);
  g.fillRect(ox1 + 8, 16, 20, 2, 255, 255, 255, 255);
  g.fillRect(ox1 + 12, 20, 14, 2, 245, 158, 11, 200);
  fs.writeFileSync(path.join(outDir, 'thrust.png'), g.toPng());
}

// 5. dodge.png (2 frames of 32x32 = 64x32)
{
  const g = new CanvasGrid(64, 32);
  // Frame 0: cyan ghost blur
  for (let y = 6; y <= 26; y += 2) {
    g.fillRect(8, y, 16, 2, 56, 189, 248, 200);
  }
  // Frame 1: trailing speed lines
  const ox1 = 32;
  g.fillRect(ox1 + 4, 10, 24, 2, 56, 189, 248, 160);
  g.fillRect(ox1 + 8, 16, 20, 2, 56, 189, 248, 220);
  g.fillRect(ox1 + 6, 22, 22, 2, 56, 189, 248, 160);
  fs.writeFileSync(path.join(outDir, 'dodge.png'), g.toPng());
}

// 6. poof.png (3 frames of 40x40 = 120x40)
{
  const g = new CanvasGrid(120, 40);
  // Frame 0: small smoke burst
  g.fillCircle(20, 20, 6, 203, 213, 225, 255);
  // Frame 1: 5 expanding smoke circles
  const ox1 = 40;
  const offsets = [[-7, -7], [7, -7], [-7, 7], [7, 7], [0, 0]];
  for (const [dx, dy] of offsets) {
    g.fillCircle(ox1 + 20 + dx, 20 + dy, 6, 30, 41, 59, 255);
    g.fillCircle(ox1 + 20 + dx, 20 + dy, 5, 203, 213, 225, 255);
  }
  // Frame 2: dispersing particles
  const ox2 = 80;
  const disp = [[-12, -12], [12, -12], [-12, 12], [12, 12], [-14, 0], [14, 0]];
  for (const [dx, dy] of disp) {
    g.fillRect(ox2 + 20 + dx - 1, 20 + dy - 1, 4, 4, 148, 163, 184, 180);
  }
  fs.writeFileSync(path.join(outDir, 'poof.png'), g.toPng());
}

// 7. collect.png (2 frames of 32x32 = 64x32)
{
  const g = new CanvasGrid(64, 32);
  // Frame 0: 4 converging sparkles
  const pts = [[8, 8], [24, 8], [8, 24], [24, 24]];
  for (const [px, py] of pts) {
    g.fillRect(px - 1, py - 1, 3, 3, 254, 240, 138, 255);
  }
  // Frame 1: center golden burst
  const ox1 = 32;
  g.fillRect(ox1 + 16 - 4, 16 - 4, 9, 9, 66, 32, 6, 255);
  g.fillRect(ox1 + 16 - 3, 16 - 3, 7, 7, 234, 179, 8, 255);
  g.fillRect(ox1 + 16 - 1, 16 - 1, 3, 3, 255, 255, 255, 255);
  fs.writeFileSync(path.join(outDir, 'collect.png'), g.toPng());
}

// 8. zap.png (2 frames of 32x32 = 64x32)
{
  const g = new CanvasGrid(64, 32);
  // Frame 0: electric bolt
  const bolt = [[10, 8], [14, 14], [12, 16], [18, 24]];
  for (const [bx, by] of bolt) {
    g.fillRect(bx - 2, by - 2, 5, 5, 15, 23, 42, 255);
    g.fillRect(bx - 1, by - 1, 3, 3, 56, 189, 248, 255);
  }
  // Frame 1: spark burst
  const ox1 = 32;
  const zapSparks = [[-6, -6], [6, -6], [-6, 6], [6, 6]];
  for (const [zx, zy] of zapSparks) {
    g.fillRect(ox1 + 16 + zx - 1, 16 + zy - 1, 3, 3, 56, 189, 248, 220);
  }
  fs.writeFileSync(path.join(outDir, 'zap.png'), g.toPng());
}

// 9. stunned.png (3 frames of 32x32 = 96x32)
{
  const g = new CanvasGrid(96, 32);
  for (let f = 0; f < 3; f++) {
    const ox = f * 32;
    for (let i = 0; i < 3; i++) {
      const a = (f * Math.PI * 2) / 3 + (i * Math.PI * 2) / 3;
      const sx = Math.round(ox + 16 + Math.cos(a) * 10);
      const sy = Math.round(16 + Math.sin(a) * 4);
      g.fillRect(sx - 2, sy - 2, 5, 5, 66, 32, 6, 255);
      g.fillRect(sx - 1, sy - 1, 3, 3, 250, 204, 21, 255);
    }
  }
  fs.writeFileSync(path.join(outDir, 'stunned.png'), g.toPng());
}

// 10. sleep.png (3 frames of 32x32 = 96x32)
{
  const g = new CanvasGrid(96, 32);
  // Draw pixelated letter 'Z'
  function drawZ(ox, oy, color) {
    for (let x = 0; x < 6; x++) g.fillRect(ox + x, oy, 1, 1, ...color);
    for (let i = 0; i < 5; i++) g.fillRect(ox + 5 - i, oy + i, 1, 1, ...color);
    for (let x = 0; x < 6; x++) g.fillRect(ox + x, oy + 5, 1, 1, ...color);
  }
  // Frame 0: low Z
  drawZ(14, 20, [56, 189, 248, 255]);
  // Frame 1: mid Z
  drawZ(32 + 15, 14, [56, 189, 248, 255]);
  // Frame 2: high Z fading
  drawZ(64 + 17, 8, [56, 189, 248, 160]);
  fs.writeFileSync(path.join(outDir, 'sleep.png'), g.toPng());
}

console.log('Successfully generated 10/10 VFX spritesheets in static/assets/vfx/');
