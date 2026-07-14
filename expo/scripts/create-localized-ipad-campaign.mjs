import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/fmss/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js';

const root = '/Users/fmss/Desktop/draft ss';
const sourceRoot = path.join(root, 'localized-campaign-v3');
const outputRoot = path.join(root, 'localized-campaign-v3-ipad-13');
const owlPath = path.resolve('assets/appstore/owl-mascot.png');

const W = 2048;
const H = 2732;
const SCREEN_W = 1768;
const SCREEN_H = 2042;
const STATUS_H = 112;

const slides = [
  { key: 'bookmarks', file: '01-bookmarks.png', bg: '#F04444', ink: '#FFF8EA', pattern: '#C9252E' },
  { key: 'notes', file: '02-notes.png', bg: '#8D49B7', ink: '#FFF8EA', pattern: '#6F3295' },
  { key: 'collaboration', file: '03-collaboration.png', bg: '#25A98D', ink: '#FFFDF4', pattern: '#148D77' },
  { key: 'projects', file: '04-projects.png', bg: '#FFBE38', ink: '#17233C', pattern: '#E29A16' },
  { key: 'kanban', file: '05-kanban.png', bg: '#2799DC', ink: '#102B46', pattern: '#167DBA' },
];

const locales = {
  'en-US': {
    bookmarks: ['Save it.', 'Actually find it later.'], notes: ['Keep every idea', 'in one place.'],
    collaboration: ['Share with', 'the right access.'], projects: ['Keep every project', 'on track.'], kanban: ['See work', 'move forward.'],
  },
  'ar-SA': {
    rtl: true,
    bookmarks: ['احفظه.', 'واعثر عليه عند الحاجة.'], notes: ['كل أفكارك', 'في مكان واحد.'],
    collaboration: ['شارك بالصلاحية', 'المناسبة.'], projects: ['أبقِ كل مشروع', 'على المسار.'], kanban: ['شاهد العمل', 'يتقدّم.'],
  },
  'zh-Hans': {
    bookmarks: ['轻松收藏。', '需要时快速找到。'], notes: ['所有灵感，', '井然有序。'],
    collaboration: ['轻松分享，', '权限尽在掌控。'], projects: ['让每个项目', '稳步推进。'], kanban: ['工作进度，', '一目了然。'],
  },
  'de-DE': {
    bookmarks: ['Speichern.', 'Später wiederfinden.'], notes: ['Alle Ideen', 'an einem Ort.'],
    collaboration: ['Teilen mit den', 'richtigen Rechten.'], projects: ['Jedes Projekt', 'auf Kurs.'], kanban: ['Fortschritt', 'auf einen Blick.'],
  },
  'it-IT': {
    bookmarks: ['Salva.', 'Ritrova davvero.'], notes: ['Tutte le idee', 'in un solo posto.'],
    collaboration: ['Condividi con', 'i permessi giusti.'], projects: ['Ogni progetto', 'sulla buona strada.'], kanban: ['Guarda il lavoro', 'avanzare.'],
  },
  'ja-JP': {
    bookmarks: ['保存する。', '必要な時に見つかる。'], notes: ['アイデアを', 'ひとつの場所に。'],
    collaboration: ['相手に合わせて', '権限を設定。'], projects: ['すべてのプロジェクトを', '順調に。'], kanban: ['進捗が', 'ひと目でわかる。'],
  },
  'pt-PT': {
    bookmarks: ['Guarde.', 'Encontre quando precisar.'], notes: ['Todas as ideias', 'num só lugar.'],
    collaboration: ['Partilhe com', 'a permissão certa.'], projects: ['Mantenha cada projeto', 'no rumo.'], kanban: ['Veja o trabalho', 'avançar.'],
  },
  'ru-RU': {
    bookmarks: ['Сохраняйте.', 'Находите, когда нужно.'], notes: ['Все идеи', 'в одном месте.'],
    collaboration: ['Делитесь с', 'нужным доступом.'], projects: ['Каждый проект —', 'по плану.'], kanban: ['Весь прогресс', 'как на ладони.'],
  },
  'es-ES': {
    bookmarks: ['Guarda.', 'Encuentra cuando quieras.'], notes: ['Todas tus ideas', 'en un solo lugar.'],
    collaboration: ['Comparte con', 'el permiso adecuado.'], projects: ['Mantén cada proyecto', 'en marcha.'], kanban: ['Mira cómo avanza', 'el trabajo.'],
  },
  'tr-TR': {
    bookmarks: ['Kaydet.', 'Sonra gerçekten bul.'], notes: ['Fikirlerini', 'tek yerde tut.'],
    collaboration: ['Doğru kişiye', 'doğru izin.'], projects: ['Her projeyi', 'yolunda tut.'], kanban: ['İşin ilerleyişini', 'tek bakışta gör.'],
  },
};

const esc = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function headingSize(lines) {
  const longest = Math.max(...lines.map((line) => [...line].length));
  if (longest <= 13) return 164;
  if (longest <= 18) return 148;
  if (longest <= 23) return 132;
  return 116;
}

function motifs(color) {
  return `<g fill="none" stroke="${color}" stroke-width="11" opacity=".42">
    <path d="M92 110h126v168l-63-41-63 41z"/>
    <path d="M1775 86h126v168l-63-41-63 41z" transform="rotate(12 1838 170)"/>
    <path d="M90 430c0-47 38-85 85-85h18v-34l60 60-60 60v-34h-18c-18 0-33 15-33 33s15 33 33 33h41"/>
    <path d="M1780 370l31 62 68 10-49 48 12 68-62-33-62 33 12-68-49-48 68-10z"/>
    <path d="M75 1430h126v168l-63-41-63 41z" transform="rotate(-10 138 1510)"/>
    <circle cx="1880" cy="1450" r="48"/><path d="M1880 1390v120M1820 1450h120"/>
  </g>`;
}

function backgroundSvg(slide, lines, locale) {
  const size = headingSize(lines);
  const lineGap = Math.round(size * 1.02);
  const rtl = locale === 'ar-SA' ? ' direction="rtl" unicode-bidi="bidi-override"' : '';
  const font = locale === 'ar-SA'
    ? "'.SF Arabic Rounded', 'Geeza Pro', Arial, sans-serif"
    : "'Arial Rounded MT Bold', 'Arial Unicode MS', 'Helvetica Neue', Arial, sans-serif";
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="38" stdDeviation="38" flood-color="#101828" flood-opacity=".42"/></filter></defs>
    <rect width="${W}" height="${H}" fill="${slide.bg}"/>
    ${motifs(slide.pattern)}
    <g font-family="${font}" text-anchor="middle" fill="${slide.ink}"${rtl}>
      <text x="1024" y="84" font-size="44" font-weight="700" letter-spacing="13">DRAFT</text>
      <text x="1024" y="245" font-size="${size}" font-weight="800">${esc(lines[0])}</text>
      <text x="1024" y="${245 + lineGap}" font-size="${size}" font-weight="800">${esc(lines[1])}</text>
    </g>
    <rect x="82" y="630" width="1884" height="2180" rx="138" fill="#17233C" opacity=".35" filter="url(#shadow)"/>
    <rect x="96" y="644" width="1856" height="2152" rx="126" fill="#17233C" stroke="${slide.ink}" stroke-opacity=".34" stroke-width="10"/>
  </svg>`);
}

function statusBarSvg() {
  return Buffer.from(`<svg width="${SCREEN_W}" height="${STATUS_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${SCREEN_W}" height="${STATUS_H}" fill="#F8FAFC"/>
    <g fill="#111827" font-family="Helvetica Neue, Arial, sans-serif" font-weight="700">
      <text x="52" y="73" font-size="38">9:41</text>
      <text x="884" y="73" text-anchor="middle" font-size="31" letter-spacing="7">DRAFT</text>
      <path d="M1575 69h12v-17h12v17h12V43h12v26h12V34h12v35h12V25h12v44z"/>
      <path d="M1690 53c24-24 63-24 87 0M1704 67c16-16 42-16 59 0M1727 82h1" fill="none" stroke="#111827" stroke-width="9" stroke-linecap="round"/>
      <rect x="1792" y="37" width="78" height="40" rx="10" fill="none" stroke="#111827" stroke-width="6"/><rect x="1874" y="49" width="7" height="16" rx="3"/><rect x="1800" y="45" width="58" height="24" rx="5"/>
    </g>
  </svg>`);
}

await fs.mkdir(outputRoot, { recursive: true });
const owl = await sharp(owlPath).resize({ width: 520 }).png().toBuffer();

for (const [locale, copy] of Object.entries(locales)) {
  const localeDir = path.join(outputRoot, locale);
  await fs.mkdir(localeDir, { recursive: true });

  for (const slide of slides) {
    const source = path.join(sourceRoot, locale, slide.file);
    const content = await sharp(source)
      .extract({ left: 82, top: 930, width: 1120, height: 1848 })
      .resize({ width: SCREEN_W })
      .extract({ left: 0, top: 0, width: SCREEN_W, height: SCREEN_H - STATUS_H })
      .png()
      .toBuffer();
    const screen = await sharp({
      create: { width: SCREEN_W, height: SCREEN_H, channels: 4, background: '#F8FAFC' },
    })
      .composite([{ input: statusBarSvg(), top: 0, left: 0 }, { input: content, top: STATUS_H, left: 0 }])
      .png()
      .toBuffer();
    const mask = Buffer.from(`<svg width="${SCREEN_W}" height="${SCREEN_H}"><rect width="${SCREEN_W}" height="${SCREEN_H}" rx="92" fill="white"/></svg>`);
    const clippedScreen = await sharp(screen).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    const lines = copy[slide.key];
    const output = path.join(localeDir, slide.file);

    await sharp(backgroundSvg(slide, lines, locale))
      .composite([
        { input: clippedScreen, left: 140, top: 690 },
        { input: owl, left: 764, top: 472 },
      ])
      .removeAlpha()
      .withMetadata({ density: 72, icc: 'srgb' })
      .png({ compressionLevel: 9 })
      .toFile(output);
    console.log(output);
  }
}
