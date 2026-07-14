import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/fmss/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js';

const source = '/Users/fmss/Desktop/draft ss/Simulator Screenshot - iPhone 17 Pro - 2026-07-12 at 15.57.20.png';
const output = '/Users/fmss/Desktop/draft ss/localized-preview/tr-TR/01-hero.png';
const width = 1284;
const height = 2778;

await fs.mkdir(path.dirname(output), { recursive: true });

const phoneWidth = 920;
const phoneHeight = 1999;
const phoneX = 182;
const phoneY = 795;
const radius = 108;

const screenshot = await sharp(source)
  .resize(phoneWidth, Math.round(phoneWidth * 2622 / 1206))
  .extract({ left: 0, top: 0, width: phoneWidth, height: phoneHeight })
  .png()
  .toBuffer();

const mask = Buffer.from(`
  <svg width="${phoneWidth}" height="${phoneHeight}">
    <rect width="${phoneWidth}" height="${phoneHeight}" rx="${radius}" fill="white"/>
  </svg>`);

const clippedPhone = await sharp(screenshot)
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toBuffer();

const background = Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="40" y1="80" x2="1240" y2="2700" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1737C8"/>
      <stop offset="0.52" stop-color="#315FE7"/>
      <stop offset="1" stop-color="#FF9D67"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(1065 385) rotate(128) scale(735 735)">
      <stop stop-color="#FFD2A5" stop-opacity=".78"/>
      <stop offset="1" stop-color="#FFD2A5" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="36" stdDeviation="35" flood-color="#07030F" flood-opacity=".58"/>
    </filter>
  </defs>
  <rect width="1284" height="2778" fill="url(#bg)"/>
  <rect width="1284" height="2778" fill="url(#glow)"/>
  <circle cx="1125" cy="145" r="186" fill="#FFF2DC" opacity=".18"/>
  <circle cx="92" cy="736" r="250" fill="#78A7FF" opacity=".24"/>
  <path d="M-90 2190C250 2034 374 2250 641 2150C907 2051 1041 1802 1393 1958V2860H-90V2190Z" fill="#FFBE85" opacity=".26"/>

  <g font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif">
    <text x="642" y="188" text-anchor="middle" fill="#FFF1D8" font-size="40" font-weight="700" letter-spacing="7">DRAFT</text>
    <text x="642" y="365" text-anchor="middle" fill="white" font-size="92" font-weight="800" letter-spacing="-3">Önemli olanı kaydet.</text>
    <text x="642" y="472" text-anchor="middle" fill="white" font-size="92" font-weight="800" letter-spacing="-3">Tam zamanında bul.</text>
    <text x="642" y="581" text-anchor="middle" fill="#D9D3EA" font-size="40" font-weight="500">Bağlantılar, notlar ve projeler — tek bir yerde.</text>

    <g transform="translate(314 660)">
      <rect width="198" height="68" rx="34" fill="white" fill-opacity=".12" stroke="white" stroke-opacity=".18"/>
      <circle cx="37" cy="34" r="7" fill="#FFCF4A"/>
      <text x="59" y="44" fill="white" font-size="30" font-weight="650">Bağlantılar</text>
    </g>
    <g transform="translate(529 660)">
      <rect width="132" height="68" rx="34" fill="white" fill-opacity=".12" stroke="white" stroke-opacity=".18"/>
      <circle cx="34" cy="34" r="7" fill="#9B7CFF"/>
      <text x="55" y="44" fill="white" font-size="30" font-weight="650">Notlar</text>
    </g>
    <g transform="translate(678 660)">
      <rect width="174" height="68" rx="34" fill="white" fill-opacity=".12" stroke="white" stroke-opacity=".18"/>
      <circle cx="35" cy="34" r="7" fill="#FF5A5F"/>
      <text x="57" y="44" fill="white" font-size="30" font-weight="650">Projeler</text>
    </g>
  </g>

  <rect x="166" y="779" width="952" height="2070" rx="126" fill="#0B0715" opacity=".7" filter="url(#shadow)"/>
  <rect x="172" y="785" width="940" height="2058" rx="120" fill="#201B31" stroke="white" stroke-opacity=".25" stroke-width="8"/>
</svg>`);

await sharp(background)
  .composite([{ input: clippedPhone, left: phoneX, top: phoneY }])
  .removeAlpha()
  .withMetadata({ density: 72, icc: 'srgb' })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(output);
