/**
 * Generates a crisp 256x256 PNG icon for Finance Tunisie.
 * Background: Deep Tunisian Carmin Red (#B91C1C / #991B1B) rounded rectangle.
 * Emblem: Scale of justice & ledger balance (Symbol of Tunisian Accounting Loi 96-112).
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const width = 256;
const height = 256;

// Create raw RGBA buffer
const raw = Buffer.alloc(height * (1 + width * 4));

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const offset = y * (1 + width * 4) + 1 + x * 4;
  raw[offset] = r;
  raw[offset + 1] = g;
  raw[offset + 2] = b;
  raw[offset + 3] = a;
}

// Draw rounded rectangle background
const cornerRadius = 48;
for (let y = 0; y < height; y++) {
  // scanline filter byte is already 0
  for (let x = 0; x < width; x++) {
    // Rounded corners check
    let inside = true;
    const dx = Math.min(x, width - 1 - x);
    const dy = Math.min(y, height - 1 - y);

    if (dx < cornerRadius && dy < cornerRadius) {
      const dist = Math.hypot(cornerRadius - dx, cornerRadius - dy);
      if (dist > cornerRadius) {
        inside = false;
      }
    }

    if (inside) {
      // Subtle gradient from #C91424 to #8A0A16
      const factor = y / height;
      const r = Math.round(201 - factor * 60);
      const g = Math.round(20 - factor * 10);
      const b = Math.round(36 - factor * 15);
      setPixel(x, y, r, g, b, 255);
    } else {
      setPixel(x, y, 0, 0, 0, 0); // Transparent outside rounded corner
    }
  }
}

// Draw Accounting Scale (Balance de Justice & Comptabilité) in Crisp White
function drawThickLine(x0, y0, x1, y1, thickness, r, g, b, a = 255) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(dist * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    for (let ox = -thickness; ox <= thickness; ox++) {
      for (let oy = -thickness; oy <= thickness; oy++) {
        if (Math.hypot(ox, oy) <= thickness) {
          setPixel(Math.round(cx + ox), Math.round(cy + oy), r, g, b, a);
        }
      }
    }
  }
}

function fillCircle(cx, cy, radius, r, g, b, a = 255) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (Math.hypot(x - cx, y - cy) <= radius) {
        setPixel(Math.round(x), Math.round(y), r, g, b, a);
      }
    }
  }
}

// 1. Central Pillar
drawThickLine(128, 55, 128, 195, 4, 255, 255, 255);
// Top finial circle
fillCircle(128, 55, 7, 255, 255, 255);
// Base plate
drawThickLine(90, 195, 166, 195, 5, 255, 255, 255);
drawThickLine(105, 185, 151, 185, 3, 255, 255, 255);

// 2. Horizontal Beam
drawThickLine(58, 85, 198, 85, 3.5, 255, 255, 255);

// 3. Left Scale Strings & Pan
drawThickLine(65, 85, 45, 135, 1.5, 255, 255, 255);
drawThickLine(65, 85, 85, 135, 1.5, 255, 255, 255);
// Left Pan (curved dish)
for (let a = 0; a <= Math.PI; a += 0.05) {
  const px = 65 + 20 * Math.cos(a);
  const py = 135 + 12 * Math.sin(a);
  fillCircle(px, py, 2, 255, 255, 255);
}
drawThickLine(45, 135, 85, 135, 1.5, 255, 255, 255);

// 4. Right Scale Strings & Pan
drawThickLine(191, 85, 171, 135, 1.5, 255, 255, 255);
drawThickLine(191, 85, 211, 135, 1.5, 255, 255, 255);
// Right Pan (curved dish)
for (let a = 0; a <= Math.PI; a += 0.05) {
  const px = 191 + 20 * Math.cos(a);
  const py = 135 + 12 * Math.sin(a);
  fillCircle(px, py, 2, 255, 255, 255);
}
drawThickLine(171, 135, 211, 135, 1.5, 255, 255, 255);

// Compress into PNG IDAT
const compressed = zlib.deflateSync(raw);

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crcVal = crc32(typeAndData);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(width, 0);
ihdrData.writeUInt32BE(height, 4);
ihdrData[8] = 8; // 8 bit per channel
ihdrData[9] = 6; // RGBA
ihdrData[10] = 0;
ihdrData[11] = 0;
ihdrData[12] = 0;

const ihdrChunk = makeChunk('IHDR', ihdrData);
const idatChunk = makeChunk('IDAT', compressed);
const iendChunk = makeChunk('IEND', Buffer.alloc(0));

const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

const assetsDir = path.join(path.dirname(__dirname), 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(path.join(assetsDir, 'icon.png'), png);
console.log('✅ Generated assets/icon.png (256x256)');

