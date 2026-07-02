import sharp from 'sharp';

const SRC = 'public/images/logo/logo-rxbooq.png';

// --- 1. Key out the light/neutral background -> real transparency ---
const { width: W, height: H } = await sharp(SRC).metadata();
const { data } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const out = Buffer.from(data); // copy
for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const chroma = max - min;          // how colorful
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  // Background = near-neutral AND bright. Logo glyphs are saturated blue/teal
  // or dark gray (.com), so they survive.
  if (chroma < 30 && lum > 200) {
    // smooth ramp: lum 205 -> keep, 235+ -> fully gone
    let keep = (235 - lum) / 30;
    keep = Math.max(0, Math.min(1, keep));
    out[i + 3] = Math.round(data[i + 3] * keep);
  }
}

const keyed = sharp(out, { raw: { width: W, height: H, channels: 4 } });

// content bounding box (alpha > 20)
let minX = W, minY = H, maxX = 0, maxY = 0;
const colHasContent = new Array(W).fill(false);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (out[(y * W + x) * 4 + 3] > 40) {
      colHasContent[x] = true;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}

// --- 2. Full lockup (trimmed, small pad) ---
const pad = 16;
const fx = Math.max(0, minX - pad), fy = Math.max(0, minY - pad);
const fw = Math.min(W - 1, maxX + pad) - fx + 1;
const fh = Math.min(H - 1, maxY + pad) - fy + 1;
await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: fx, top: fy, width: fw, height: fh })
  .png({ compressionLevel: 9 })
  .toFile('public/images/logo/rxbooq-logo.png');
console.log('lockup', fw, 'x', fh, 'ratio', (fw / fh).toFixed(3));

// --- 3. Icon only (left blob, up to first column gap after icon) ---
let iconRight = minX;
let gapRun = 0;
for (let x = minX; x <= maxX; x++) {
  if (colHasContent[x]) { gapRun = 0; iconRight = x; }
  else { gapRun++; if (gapRun > 25 && iconRight > minX) break; }
}
const ix0 = minX, ix1 = iconRight;
// icon vertical extent within those columns
let iy0 = H, iy1 = 0;
for (let y = 0; y < H; y++)
  for (let x = ix0; x <= ix1; x++)
    if (out[(y * W + x) * 4 + 3] > 40) { if (y < iy0) iy0 = y; if (y > iy1) iy1 = y; }

const iw = ix1 - ix0 + 1, ih = iy1 - iy0 + 1;
const side = Math.max(iw, ih);
const canvas = side + Math.round(side * 0.12) * 2; // 12% padding
const iconBuf = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: ix0, top: iy0, width: iw, height: ih })
  .png().toBuffer();

const square = sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: iconBuf, gravity: 'center' }])
  .png();

await square.clone().resize(512, 512).png({ compressionLevel: 9 }).toFile('public/images/logo/rxbooq-icon.png');
console.log('icon source', iw, 'x', ih, '-> 512 square canvas', canvas);

// App-router favicon assets
await square.clone().resize(512, 512).png({ compressionLevel: 9 }).toFile('src/app/icon.png');
await square.clone().resize(180, 180).png({ compressionLevel: 9 }).toFile('src/app/apple-icon.png');
console.log('wrote src/app/icon.png + apple-icon.png');
