#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outputRoot = '/Users/fmss/Desktop/draft ss/google-play-android-v1/store-assets';
const featureRoot = join(outputRoot, 'feature-graphics');
const iconSource = join(root, 'assets/images/icon.png');
const mascot = join(root, 'assets/brand/owl-mascot-transparent.png');

const locales = {
  'en-US': { text: ['Save it.', 'Find it later.'], features: 'Bookmarks · Notes · Tasks · Projects', font: 'Arial', size: 74 },
  'tr-TR': { text: ['Kaydet.', 'Sonra kolayca bul.'], features: 'Yer imleri · Notlar · Görevler · Projeler', font: 'Arial', size: 53 },
  'ar-SA': { text: ['احفظه الآن.', 'واعثر عليه لاحقاً.'], features: 'روابط · ملاحظات · مهام · مشاريع', font: 'Geeza Pro', size: 48, rtl: true },
  'zh-Hans': { text: ['先保存。', '需要时轻松找到。'], features: '书签 · 笔记 · 任务 · 项目', font: 'Hiragino Sans', size: 59 },
  'de-DE': { text: ['Speichern.', 'Später wiederfinden.'], features: 'Lesezeichen · Notizen · Aufgaben · Projekte', font: 'Arial', size: 55 },
  'it-IT': { text: ['Salva ora.', 'Ritrova quando serve.'], features: 'Segnalibri · Note · Attività · Progetti', font: 'Arial', size: 55 },
  'ja-JP': { text: ['保存して、', '必要なときに見つける。'], features: 'ブックマーク · メモ · タスク · プロジェクト', font: 'Hiragino Sans', size: 55 },
  'pt-PT': { text: ['Guarde agora.', 'Encontre mais tarde.'], features: 'Favoritos · Notas · Tarefas · Projetos', font: 'Arial', size: 55 },
  'ru-RU': { text: ['Сохраните сейчас.', 'Найдите позже.'], features: 'Закладки · Заметки · Задачи · Проекты', font: 'Arial', size: 52 },
  'es-ES': { text: ['Guárdalo ahora.', 'Encuéntralo después.'], features: 'Marcadores · Notas · Tareas · Proyectos', font: 'Arial', size: 54 },
};

const esc = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

mkdirSync(featureRoot, { recursive: true });

// Google Play requires a single 512 px icon. It intentionally reuses the app's
// production master so the store listing and installed app remain identical.
execFileSync('magick', [iconSource, '-resize', '512x512!', '-colorspace', 'sRGB', '-alpha', 'off', '-strip', join(outputRoot, 'draft-google-play-icon-512.png')]);

for (const [locale, spec] of Object.entries(locales)) {
  const anchor = spec.rtl ? 'end' : 'start';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="#F04444"/>
  <path d="M-65 105 C 95 30 250 70 362 0 L 362 0 L 362 500 L -65 500 Z" fill="#E83D3D" opacity=".5"/>
  <path d="M710 0 C 878 32 919 140 1080 102 L 1080 0 Z" fill="#FF7471" opacity=".35"/>
  <g fill="none" stroke="#BC3037" stroke-width="6" opacity=".5">
    <path d="M60 74 h42 v54 l-21 -14 -21 14 z"/>
    <path d="M530 402 h36 v47 l-18 -12 -18 12 z"/>
    <path d="M617 67 l12 28 30 2 -23 20 7 30 -26 -16 -26 16 8 -30 -23 -20 30 -2 z"/>
  </g>
</svg>`;
  const svgPath = join(featureRoot, `${locale}.svg`);
  const backgroundPath = join(featureRoot, `${locale}-background.png`);
  const titlePath = join(featureRoot, `${locale}-title.png`);
  const wordmarkPath = join(featureRoot, `${locale}-wordmark.png`);
  const featurePath = join(featureRoot, `${locale}-features.png`);
  const finalPath = join(featureRoot, `${locale}.png`);
  writeFileSync(svgPath, svg);
  execFileSync('magick', [svgPath, '-colorspace', 'sRGB', backgroundPath]);
  const direction = spec.rtl ? ['--rtl', '--align=right'] : ['--align=left'];
  execFileSync('pango-view', ['--no-display', '--pixels', `--font=${spec.font} Bold ${spec.size}`, '--foreground=#FFF8EB', '--background=transparent', '--width=550', '--height=220', ...direction, `--text=${spec.text.join('\n')}`, '-o', titlePath]);
  execFileSync('pango-view', ['--no-display', '--pixels', '--font=Arial Bold 22', '--foreground=#FFF8EB', '--background=transparent', '--width=230', '--height=32', '--align=left', '--text=D R A F T', '-o', wordmarkPath]);
  execFileSync('pango-view', ['--no-display', '--pixels', `--font=${spec.font} 21`, '--foreground=#FFE7AA', '--background=transparent', '--width=560', '--height=34', ...direction, `--text=${spec.features}`, '-o', featurePath]);
  const titleGeometry = spec.rtl ? '+355+121' : '+60+121';
  const featureGeometry = spec.rtl ? '+355+323' : '+60+323';
  execFileSync('magick', [backgroundPath, '(', wordmarkPath, ')', '-gravity', 'northwest', '-geometry', '+62+47', '-compose', 'over', '-composite', '(', titlePath, ')', '-gravity', 'northwest', '-geometry', titleGeometry, '-compose', 'over', '-composite', '(', featurePath, ')', '-gravity', 'northwest', '-geometry', featureGeometry, '-compose', 'over', '-composite', '(', mascot, '-resize', '360x360', ')', '-gravity', 'east', '-geometry', '+42+24', '-compose', 'over', '-composite', '-alpha', 'off', '-strip', finalPath]);
  [svgPath, backgroundPath, titlePath, wordmarkPath, featurePath].forEach((path) => rmSync(path, { force: true }));
}

execFileSync('zip', ['-j', join(outputRoot, 'draft-google-play-feature-graphics.zip'), ...Object.keys(locales).map((locale) => join(featureRoot, `${locale}.png`))]);
console.log(`Created ${Object.keys(locales).length} localized feature graphics in ${featureRoot}`);
