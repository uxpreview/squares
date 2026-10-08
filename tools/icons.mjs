// The game's icons, drawn from public/favicon.svg (the goose on paper):
//
//   node tools/icons.mjs
//
// Writes into public/:
//   favicon.ico            32 px, for browsers and crawlers that ask for it
//   apple-touch-icon.png   180 px, square (iOS rounds the corners itself)
//   icon-192.png           192 px, rounded like the favicon (the manifest's)
//   icon-512.png           512 px, rounded
//   icon-maskable-512.png  512 px, square, the goose inside the middle 80%
//                          (Android cuts it to a circle or a squircle)
//
// Run it again if the favicon changes (the rename may give it a new one).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pub = path.join(root, 'public');
const svg = fs.readFileSync(path.join(pub, 'favicon.svg'), 'utf8');

// The favicon's paper square with square corners, and its goose shrunk into
// the safe middle (k: how big it is, 1 as drawn).
function square(k = 1) {
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const paper = inner.match(/<rect[^>]*\/>/)[0];
  const goose = inner.replace(paper, '');
  const flat = paper.replace(/\s*rx="[^"]*"/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${flat}<g transform="translate(16 16) scale(${k}) translate(-16 -16)">${goose}</g></svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(markup, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  return page.locator('svg').screenshot({ omitBackground: true });
}

const out = {
  'apple-touch-icon.png': await png(square(0.86), 180),
  'icon-192.png': await png(svg, 192),
  'icon-512.png': await png(svg, 512),
  'icon-maskable-512.png': await png(square(0.72), 512),
};
for (const [name, buf] of Object.entries(out)) {
  fs.writeFileSync(path.join(pub, name), buf);
  console.log('wrote public/' + name, buf.length, 'bytes');
}

// An .ico is a small header and a PNG inside it.
const ico32 = await png(svg, 32);
const head = Buffer.alloc(22);
head.writeUInt16LE(0, 0); // reserved
head.writeUInt16LE(1, 2); // an icon
head.writeUInt16LE(1, 4); // one image
head.writeUInt8(32, 6); // width
head.writeUInt8(32, 7); // height
head.writeUInt8(0, 8); // no palette
head.writeUInt8(0, 9);
head.writeUInt16LE(1, 10); // planes
head.writeUInt16LE(32, 12); // bits per pixel
head.writeUInt32LE(ico32.length, 14);
head.writeUInt32LE(22, 18); // where the image starts
fs.writeFileSync(path.join(pub, 'favicon.ico'), Buffer.concat([head, ico32]));
console.log('wrote public/favicon.ico', 22 + ico32.length, 'bytes');

await browser.close();
