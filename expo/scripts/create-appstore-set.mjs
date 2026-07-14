import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/fmss/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js';

const sourceDir = '/Users/fmss/Desktop/draft ss/captured-5';
const outputDir = '/Users/fmss/Desktop/draft ss/localized-preview/tr-TR/set-v1';
const width = 1284;
const height = 2778;
const phoneWidth = 920;
const phoneHeight = 1999;
const phoneX = 182;
const phoneY = 795;
const radius = 108;

const slides = [
  {
    file: '01-bookmarks.png',
    title: ['Kaydettiğin şeyleri', 'gerçekten geri bul.'],
    subtitle: 'Twitter, LinkedIn ve web’de beğenip unuttuklarını yönet.',
    chips: ['Sonra Oku', 'Hatırlat', 'Kaynağa göre filtrele'],
  },
  {
    file: '02-notes.png',
    title: ['Fikirlerin', 'dağılmasın.'],
    subtitle: 'Zengin metin notları, kategoriler ve görünürlük seçenekleri.',
    chips: ['Biçimlendir', 'Kategorize et', 'Görünürlüğü seç'],
  },
  {
    file: '03-collaboration.png',
    title: ['Doğru kişiye', 'doğru izin.'],
    subtitle: 'Arkadaşların yalnızca görüntülesin ya da seninle yönetsin.',
    chips: ['Görüntüleyebilir', 'Düzenleyebilir'],
  },
  {
    file: '04-project.png',
    title: ['Her projeyi', 'sonuca taşı.'],
    subtitle: 'Deadline, görseller, görevler ve ilerleme tek görünümde.',
    chips: ['Deadline', 'Todo', 'Galeri'],
  },
  {
    file: '05-kanban.png',
    title: ['İşi akışında', 'gör.'],
    subtitle: 'Kanban ile yapılacak, devam eden ve biten işleri kontrol et.',
    chips: ['Yapılacak', 'Devam ediyor', 'Tamamlandı'],
  },
];

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

function chipsSvg(items) {
  const widths = items.map((item) => Math.max(150, item.length * 18 + 60));
  const total = widths.reduce((sum, item) => sum + item, 0) + (items.length - 1) * 16;
  let x = (width - total) / 2;
  return items.map((item, index) => {
    const chipWidth = widths[index];
    const color = ['#FFE39A', '#BBD2FF', '#FFD0B3'][index % 3];
    const markup = `
      <g transform="translate(${x} 662)">
        <rect width="${chipWidth}" height="68" rx="34" fill="white" fill-opacity=".16" stroke="white" stroke-opacity=".22"/>
        <circle cx="34" cy="34" r="7" fill="${color}"/>
        <text x="55" y="44" fill="white" font-size="28" font-weight="650">${escapeXml(item)}</text>
      </g>`;
    x += chipWidth + 16;
    return markup;
  }).join('');
}

await fs.mkdir(outputDir, { recursive: true });

for (const [index, slide] of slides.entries()) {
  const source = path.join(sourceDir, slide.file);
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
        <feDropShadow dx="0" dy="36" stdDeviation="35" flood-color="#07133F" flood-opacity=".5"/>
      </filter>
    </defs>
    <rect width="1284" height="2778" fill="url(#bg)"/>
    <rect width="1284" height="2778" fill="url(#glow)"/>
    <circle cx="1125" cy="145" r="186" fill="#FFF2DC" opacity=".18"/>
    <circle cx="92" cy="736" r="250" fill="#78A7FF" opacity=".24"/>
    <path d="M-90 2190C250 2034 374 2250 641 2150C907 2051 1041 1802 1393 1958V2860H-90V2190Z" fill="#FFBE85" opacity=".26"/>

    <g font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif">
      <text x="642" y="170" text-anchor="middle" fill="#FFF1D8" font-size="38" font-weight="700" letter-spacing="7">DRAFT</text>
      <text x="642" y="350" text-anchor="middle" fill="white" font-size="88" font-weight="800" letter-spacing="-3">${escapeXml(slide.title[0])}</text>
      <text x="642" y="452" text-anchor="middle" fill="white" font-size="88" font-weight="800" letter-spacing="-3">${escapeXml(slide.title[1])}</text>
      <text x="642" y="562" text-anchor="middle" fill="#EEF3FF" font-size="36" font-weight="500">${escapeXml(slide.subtitle)}</text>
      ${chipsSvg(slide.chips)}
    </g>

    <rect x="166" y="779" width="952" height="2070" rx="126" fill="#07133F" opacity=".55" filter="url(#shadow)"/>
    <rect x="172" y="785" width="940" height="2058" rx="120" fill="#1B2658" stroke="white" stroke-opacity=".32" stroke-width="8"/>
  </svg>`);

  const output = path.join(outputDir, `${String(index + 1).padStart(2, '0')}-${path.basename(slide.file, '.png')}.png`);
  await sharp(background)
    .composite([{ input: clippedPhone, left: phoneX, top: phoneY }])
    .removeAlpha()
    .withMetadata({ density: 72, icc: 'srgb' })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(output);
}
