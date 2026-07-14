import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/fmss/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js';

const root = '/Users/fmss/Desktop/draft ss';
const sourceDir = path.join(root, 'localized-ui-v2');
const outputRoot = path.join(root, 'localized-campaign-v3');
const owlPath = path.resolve('assets/appstore/owl-mascot.png');
const W = 1284;
const H = 2778;

const slides = [
  { key: 'bookmarks', source: '01-bookmarks.png', bg: '#F04444', ink: '#FFF8EA', pattern: '#C9252E' },
  { key: 'notes', source: '02-notes.png', bg: '#8D49B7', ink: '#FFF8EA', pattern: '#6F3295' },
  { key: 'collaboration', source: '03-collaboration.png', bg: '#25A98D', ink: '#FFFDF4', pattern: '#148D77' },
  { key: 'projects', source: '04-projects.png', bg: '#FFBE38', ink: '#17233C', pattern: '#E29A16' },
  { key: 'kanban', source: '05-kanban.png', bg: '#2799DC', ink: '#102B46', pattern: '#167DBA' },
];

const locales = {
  'en-US': {
    bookmarks: ['Save it.', 'Actually find it later.'],
    notes: ['Keep every idea', 'in one place.'],
    collaboration: ['Share with', 'the right access.'],
    projects: ['Keep every project', 'on track.'],
    kanban: ['See work', 'move forward.'],
  },
  'ar-SA': {
    rtl: true,
    bookmarks: ['احفظه.', 'واعثر عليه عند الحاجة.'],
    notes: ['كل أفكارك', 'في مكان واحد.'],
    collaboration: ['شارك بالصلاحية', 'المناسبة.'],
    projects: ['أبقِ كل مشروع', 'على المسار.'],
    kanban: ['شاهد العمل', 'يتقدّم.'],
  },
  'zh-Hans': {
    bookmarks: ['轻松收藏。', '需要时快速找到。'],
    notes: ['所有灵感，', '井然有序。'],
    collaboration: ['轻松分享，', '权限尽在掌控。'],
    projects: ['让每个项目', '稳步推进。'],
    kanban: ['工作进度，', '一目了然。'],
  },
  'de-DE': {
    bookmarks: ['Speichern.', 'Später wiederfinden.'],
    notes: ['Alle Ideen', 'an einem Ort.'],
    collaboration: ['Teilen mit den', 'richtigen Rechten.'],
    projects: ['Jedes Projekt', 'auf Kurs.'],
    kanban: ['Fortschritt', 'auf einen Blick.'],
  },
  'it-IT': {
    bookmarks: ['Salva.', 'Ritrova davvero.'],
    notes: ['Tutte le idee', 'in un solo posto.'],
    collaboration: ['Condividi con', 'i permessi giusti.'],
    projects: ['Ogni progetto', 'sulla buona strada.'],
    kanban: ['Guarda il lavoro', 'avanzare.'],
  },
  'ja-JP': {
    bookmarks: ['保存する。', '必要な時に見つかる。'],
    notes: ['アイデアを', 'ひとつの場所に。'],
    collaboration: ['相手に合わせて', '権限を設定。'],
    projects: ['すべてのプロジェクトを', '順調に。'],
    kanban: ['進捗が', 'ひと目でわかる。'],
  },
  'pt-PT': {
    bookmarks: ['Guarde.', 'Encontre quando precisar.'],
    notes: ['Todas as ideias', 'num só lugar.'],
    collaboration: ['Partilhe com', 'a permissão certa.'],
    projects: ['Mantenha cada projeto', 'no rumo.'],
    kanban: ['Veja o trabalho', 'avançar.'],
  },
  'ru-RU': {
    bookmarks: ['Сохраняйте.', 'Находите, когда нужно.'],
    notes: ['Все идеи', 'в одном месте.'],
    collaboration: ['Делитесь с', 'нужным доступом.'],
    projects: ['Каждый проект —', 'по плану.'],
    kanban: ['Весь прогресс', 'как на ладони.'],
  },
  'es-ES': {
    bookmarks: ['Guarda.', 'Encuentra cuando quieras.'],
    notes: ['Todas tus ideas', 'en un solo lugar.'],
    collaboration: ['Comparte con', 'el permiso adecuado.'],
    projects: ['Mantén cada proyecto', 'en marcha.'],
    kanban: ['Mira cómo avanza', 'el trabajo.'],
  },
  'tr-TR': {
    bookmarks: ['Kaydet.', 'Sonra gerçekten bul.'],
    notes: ['Fikirlerini', 'tek yerde tut.'],
    collaboration: ['Doğru kişiye', 'doğru izin.'],
    projects: ['Her projeyi', 'yolunda tut.'],
    kanban: ['İşin ilerleyişini', 'tek bakışta gör.'],
  },
};

const ui = {
  'en-US': { members:'Project Members', current:'Current Members', add:'Add Member', email:'Enter email address', permission:'Permission', view:'Can View', edit:'Can Edit', project:'Launch Project', description:'Plan every detail for a smooth release.', progress:'Progress', tasks:'Tasks', timeline:'Timeline', gallery:'Gallery', left:'31 days left', addTask:'Add task', task1:'Prepare screenshots', task2:'Review store copy', projects:'Projects', list:'List', board:'Kanban', todo:'To do', doing:'In progress', done:'Done', card1:'Plan the release', card2:'Polish the visuals', card3:'Submit for review' },
  'tr-TR': { members:'Proje Üyeleri', current:'Mevcut Üyeler', add:'Üye Ekle', email:'E-posta adresini gir', permission:'İzin', view:'Görüntüleyebilir', edit:'Düzenleyebilir', project:'Lansman Projesi', description:'Sorunsuz bir yayın için her ayrıntıyı planla.', progress:'İlerleme', tasks:'Görevler', timeline:'Zaman Çizelgesi', gallery:'Galeri', left:'31 gün kaldı', addTask:'Görev ekle', task1:'Ekran görüntülerini hazırla', task2:'Mağaza metnini gözden geçir', projects:'Projeler', list:'Liste', board:'Kanban', todo:'Yapılacak', doing:'Devam Ediyor', done:'Tamamlandı', card1:'Yayını planla', card2:'Görselleri iyileştir', card3:'İncelemeye gönder' },
  'ar-SA': { members:'أعضاء المشروع', current:'الأعضاء الحاليون', add:'إضافة عضو', email:'أدخل البريد الإلكتروني', permission:'الصلاحية', view:'عرض فقط', edit:'يمكنه التعديل', project:'مشروع الإطلاق', description:'خطّط لكل التفاصيل من أجل إطلاق سلس.', progress:'التقدّم', tasks:'المهام', timeline:'الجدول الزمني', gallery:'المعرض', left:'متبقّي ٣١ يومًا', addTask:'إضافة مهمة', task1:'إعداد لقطات الشاشة', task2:'مراجعة نص المتجر', projects:'المشاريع', list:'قائمة', board:'لوحة كانبان', todo:'للإنجاز', doing:'قيد التنفيذ', done:'مكتمل', card1:'تخطيط الإطلاق', card2:'تحسين التصاميم', card3:'الإرسال للمراجعة' },
  'zh-Hans': { members:'项目成员', current:'当前成员', add:'添加成员', email:'输入电子邮件地址', permission:'权限', view:'仅查看', edit:'可编辑', project:'发布项目', description:'规划每个细节，让发布更顺利。', progress:'进度', tasks:'任务', timeline:'时间线', gallery:'图库', left:'还剩 31 天', addTask:'添加任务', task1:'准备屏幕截图', task2:'检查商店文案', projects:'项目', list:'列表', board:'看板', todo:'待办', doing:'进行中', done:'已完成', card1:'规划发布', card2:'完善视觉效果', card3:'提交审核' },
  'de-DE': { members:'Projektmitglieder', current:'Aktuelle Mitglieder', add:'Mitglied hinzufügen', email:'E-Mail-Adresse eingeben', permission:'Berechtigung', view:'Kann ansehen', edit:'Kann bearbeiten', project:'Launch-Projekt', description:'Plane jedes Detail für einen reibungslosen Start.', progress:'Fortschritt', tasks:'Aufgaben', timeline:'Zeitplan', gallery:'Galerie', left:'Noch 31 Tage', addTask:'Aufgabe hinzufügen', task1:'Screenshots vorbereiten', task2:'Store-Text prüfen', projects:'Projekte', list:'Liste', board:'Kanban', todo:'Offen', doing:'In Arbeit', done:'Erledigt', card1:'Veröffentlichung planen', card2:'Visuals optimieren', card3:'Zur Prüfung senden' },
  'it-IT': { members:'Membri del progetto', current:'Membri attuali', add:'Aggiungi membro', email:'Inserisci indirizzo email', permission:'Permesso', view:'Può visualizzare', edit:'Può modificare', project:'Progetto di lancio', description:'Pianifica ogni dettaglio per un lancio senza intoppi.', progress:'Avanzamento', tasks:'Attività', timeline:'Cronologia', gallery:'Galleria', left:'31 giorni rimasti', addTask:'Aggiungi attività', task1:'Prepara gli screenshot', task2:'Rivedi i testi dello store', projects:'Progetti', list:'Elenco', board:'Kanban', todo:'Da fare', doing:'In corso', done:'Fatto', card1:'Pianifica il lancio', card2:'Perfeziona le grafiche', card3:'Invia per la revisione' },
  'ja-JP': { members:'プロジェクトメンバー', current:'現在のメンバー', add:'メンバーを追加', email:'メールアドレスを入力', permission:'権限', view:'閲覧のみ', edit:'編集可能', project:'リリースプロジェクト', description:'スムーズな公開に向けて、すべてを計画。', progress:'進捗', tasks:'タスク', timeline:'タイムライン', gallery:'ギャラリー', left:'残り31日', addTask:'タスクを追加', task1:'スクリーンショットを準備', task2:'ストア文言を確認', projects:'プロジェクト', list:'リスト', board:'カンバン', todo:'未着手', doing:'進行中', done:'完了', card1:'リリースを計画', card2:'ビジュアルを仕上げる', card3:'審査に提出' },
  'pt-PT': { members:'Membros do projeto', current:'Membros atuais', add:'Adicionar membro', email:'Introduza o email', permission:'Permissão', view:'Pode ver', edit:'Pode editar', project:'Projeto de lançamento', description:'Planeie cada detalhe para um lançamento tranquilo.', progress:'Progresso', tasks:'Tarefas', timeline:'Cronologia', gallery:'Galeria', left:'Faltam 31 dias', addTask:'Adicionar tarefa', task1:'Preparar capturas de ecrã', task2:'Rever o texto da loja', projects:'Projetos', list:'Lista', board:'Kanban', todo:'Por fazer', doing:'Em curso', done:'Concluído', card1:'Planear o lançamento', card2:'Aperfeiçoar os visuais', card3:'Enviar para análise' },
  'ru-RU': { members:'Участники проекта', current:'Текущие участники', add:'Добавить участника', email:'Введите адрес эл. почты', permission:'Доступ', view:'Только просмотр', edit:'Может редактировать', project:'Проект запуска', description:'Спланируйте всё для уверенного запуска.', progress:'Прогресс', tasks:'Задачи', timeline:'Хронология', gallery:'Галерея', left:'Остался 31 день', addTask:'Добавить задачу', task1:'Подготовить скриншоты', task2:'Проверить текст магазина', projects:'Проекты', list:'Список', board:'Канбан', todo:'Нужно сделать', doing:'В работе', done:'Готово', card1:'Спланировать запуск', card2:'Доработать визуалы', card3:'Отправить на проверку' },
  'es-ES': { members:'Miembros del proyecto', current:'Miembros actuales', add:'Añadir miembro', email:'Introduce el correo', permission:'Permiso', view:'Puede ver', edit:'Puede editar', project:'Proyecto de lanzamiento', description:'Planifica cada detalle para un lanzamiento fluido.', progress:'Progreso', tasks:'Tareas', timeline:'Cronología', gallery:'Galería', left:'Quedan 31 días', addTask:'Añadir tarea', task1:'Preparar las capturas', task2:'Revisar los textos de la tienda', projects:'Proyectos', list:'Lista', board:'Kanban', todo:'Por hacer', doing:'En curso', done:'Hecho', card1:'Planificar el lanzamiento', card2:'Pulir los elementos visuales', card3:'Enviar a revisión' },
};

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function fontSize(lines) {
  const longest = Math.max(...lines.map((line) => [...line].length));
  if (longest <= 13) return 118;
  if (longest <= 18) return 104;
  if (longest <= 23) return 91;
  return 80;
}

function motifSvg(color) {
  return `
    <g fill="none" stroke="${color}" stroke-width="8" opacity=".45">
      <path d="M95 120h92v125l-46-30-46 30z"/>
      <path d="M1090 90h92v125l-46-30-46 30z" transform="rotate(14 1136 160)"/>
      <path d="M84 548c0-34 28-62 62-62h14v-25l44 44-44 44v-25h-14c-13 0-24 11-24 24s11 24 24 24h30"/>
      <path d="M1110 500l22 45 50 7-36 35 9 50-45-24-45 24 9-50-36-35 50-7z"/>
      <path d="M80 1110h92v125l-46-30-46 30z" transform="rotate(-12 126 1170)"/>
      <path d="M1110 1020l36-36m-18 18 38 38m-76-18 38-38"/>
      <circle cx="1160" cy="1420" r="34"/><path d="M1160 1380v80M1120 1420h80"/>
    </g>`;
}

const textEl = (x, y, value, size=42, weight=600, anchor='start') =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(value)}</text>`;

function localizedScreenSvg(key, locale) {
  if (!['collaboration', 'projects', 'kanban'].includes(key)) return null;
  const t = ui[locale];
  const rtl = locale === 'ar-SA';
  const font = rtl ? "Geeza Pro, Arial, sans-serif" : "Arial Unicode MS, Helvetica Neue, Arial, sans-serif";
  const dir = rtl ? ' direction="rtl" unicode-bidi="embed"' : '';
  // librsvg's RTL + end-anchor combination can place shaped Arabic outside the
  // phone frame. Centering long RTL labels keeps every locale deterministic.
  const x = rtl ? 603 : 126;
  const anchor = rtl ? 'middle' : 'start';
  let body = '';
  if (key === 'collaboration') body = `
    <rect x="55" y="250" width="1096" height="2100" rx="70" fill="#F8FAFC"/>
    ${textEl(603,390,t.members,64,800,'middle')}
    ${textEl(x,520,t.current,38,700,anchor)}
    <rect x="105" y="575" width="996" height="210" rx="38" fill="white" stroke="#E5E7EB" stroke-width="3"/>
    <circle cx="190" cy="680" r="48" fill="#EDE9FE"/><text x="190" y="696" text-anchor="middle" font-size="42" font-weight="800" fill="#6D4AFF">A</text>
    ${textEl(rtl?603:270,655,'alex@studio.co',35,700,anchor)}
    ${textEl(rtl?603:270,715,t.edit,30,500,anchor)}
    <rect x="105" y="850" width="996" height="950" rx="50" fill="white" stroke="#E5E7EB" stroke-width="3"/>
    ${textEl(x,970,t.add,47,800,anchor)}
    ${textEl(x,1090,t.email,28,600,anchor)}
    <rect x="125" y="1130" width="956" height="120" rx="28" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="3"/>
    ${textEl(rtl?603:175,1206,'name@example.com',32,400,anchor)}
    ${textEl(x,1350,t.permission,28,600,anchor)}
    <rect x="125" y="1390" width="450" height="115" rx="28" fill="#EDE9FE" stroke="#6D4AFF" stroke-width="4"/>
    ${textEl(350,1462,t.view,31,700,'middle')}
    <rect x="605" y="1390" width="476" height="115" rx="28" fill="#F3F4F6"/>
    ${textEl(843,1462,t.edit,31,700,'middle')}
    <rect x="125" y="1580" width="956" height="125" rx="34" fill="#5542E8"/>
    <text x="603" y="1660" text-anchor="middle" font-size="37" font-weight="800" fill="white">${esc(t.add)}</text>`;
  if (key === 'projects') body = `
    <rect x="0" y="250" width="1206" height="2200" fill="#F7F8FC"/>
    <rect x="45" y="300" width="1116" height="600" rx="55" fill="white"/>
    ${textEl(x,430,t.project,61,800,anchor)}
    ${textEl(x,505,t.description,31,400,anchor)}
    ${rtl ? textEl(320,625,t.progress,31,700,'middle') : textEl(x,625,t.progress,31,700,anchor)} ${textEl(rtl?900:1080,625,'68%',36,800,rtl?'middle':'end')}
    <rect x="126" y="665" width="954" height="22" rx="11" fill="#E5E7EB"/><rect x="126" y="665" width="649" height="22" rx="11" fill="#6D4AFF"/>
    <rect x="126" y="735" width="300" height="80" rx="40" fill="#DDFCF1"/>${textEl(276,788,t.left,28,700,'middle')}
    <rect x="45" y="940" width="1116" height="110" rx="30" fill="white"/>
    ${textEl(220,1010,t.tasks,31,800,'middle')}${textEl(603,1010,t.timeline,31,600,'middle')}${textEl(985,1010,t.gallery,31,600,'middle')}
    <rect x="45" y="1100" width="1116" height="230" rx="42" fill="white"/>${textEl(x,1200,t.task1,38,700,anchor)}${textEl(x,1260,t.left,27,400,anchor)}
    <rect x="45" y="1370" width="1116" height="230" rx="42" fill="white"/>${textEl(x,1470,t.task2,38,700,anchor)}${textEl(x,1530,'68%',27,700,anchor)}
    <rect x="45" y="1660" width="1116" height="120" rx="34" fill="white"/>${textEl(x,1738,t.addTask,34,500,anchor)}<text x="1080" y="1745" text-anchor="middle" font-size="64" fill="#6D4AFF">＋</text>`;
  if (key === 'kanban') body = `
    <rect width="1206" height="2450" fill="#F7F8FC"/>
    ${textEl(603,300,t.projects,66,800,'middle')}
    <rect x="240" y="370" width="726" height="105" rx="52" fill="#E8EAF2"/><rect x="595" y="378" width="363" height="89" rx="44" fill="white"/>
    ${textEl(420,438,t.list,30,600,'middle')}${textEl(777,438,t.board,30,800,'middle')}
    <rect x="30" y="540" width="366" height="1700" rx="35" fill="#EEF0F6"/><rect x="420" y="540" width="366" height="1700" rx="35" fill="#EEEAFE"/><rect x="810" y="540" width="366" height="1700" rx="35" fill="#E9F8F3"/>
    ${textEl(213,630,t.todo,31,800,'middle')}${textEl(603,630,t.doing,31,800,'middle')}${textEl(993,630,t.done,31,800,'middle')}
    <rect x="55" y="690" width="316" height="300" rx="30" fill="white"/>${textEl(213,770,t.card1,22,700,'middle')}<rect x="85" y="900" width="190" height="18" rx="9" fill="#FFBE38"/>
    <rect x="445" y="690" width="316" height="350" rx="30" fill="white"/>${textEl(603,770,t.card2,22,700,'middle')}<rect x="475" y="950" width="220" height="18" rx="9" fill="#8D49B7"/>
    <rect x="835" y="690" width="316" height="300" rx="30" fill="white"/>${textEl(993,770,t.card3,22,700,'middle')}<circle cx="890" cy="920" r="24" fill="#25A98D"/><path d="M878 920l9 10 18-24" fill="none" stroke="white" stroke-width="7"/>
    <circle cx="1060" cy="2100" r="72" fill="#5542E8"/><text x="1060" y="2125" text-anchor="middle" font-size="72" fill="white">＋</text>`;
  return Buffer.from(`<svg width="1206" height="2622" xmlns="http://www.w3.org/2000/svg"><g font-family="${font}" fill="#17233C"${dir}>${body}</g></svg>`);
}

await fs.mkdir(outputRoot, { recursive: true });
const owl = await sharp(owlPath).resize({ width: 570 }).png().toBuffer();

for (const [locale, copy] of Object.entries(locales)) {
  const localeDir = path.join(outputRoot, locale);
  await fs.mkdir(localeDir, { recursive: true });

  for (const [index, slide] of slides.entries()) {
    const lines = copy[slide.key];
    const size = fontSize(lines);
    const phoneWidth = 1120;
    const phoneHeight = 2010;
    const phoneX = 82;
    const phoneY = 780;
    const overlay = localizedScreenSvg(slide.key, locale);
    const localizedSource = overlay
      ? await sharp(path.join(sourceDir, locale, slide.source)).composite([{ input: overlay }]).png().toBuffer()
      : path.join(sourceDir, locale, slide.source);
    const screenshot = await sharp(localizedSource)
      .resize(phoneWidth, Math.round(phoneWidth * 2622 / 1206))
      .extract({ left: 0, top: 0, width: phoneWidth, height: phoneHeight })
      .png()
      .toBuffer();
    const phoneMask = Buffer.from(`<svg width="${phoneWidth}" height="${phoneHeight}"><rect width="${phoneWidth}" height="${phoneHeight}" rx="105" fill="white"/></svg>`);
    const clippedPhone = await sharp(screenshot).composite([{ input: phoneMask, blend: 'dest-in' }]).png().toBuffer();

    const rtl = copy.rtl ? ` direction="rtl" unicode-bidi="bidi-override"` : '';
    const font = locale === 'ar-SA'
      ? `'.SF Arabic Rounded', 'Geeza Pro', Arial, sans-serif`
      : `'Arial Rounded MT Bold', 'Arial Unicode MS', 'Helvetica Neue', Arial, sans-serif`;
    const lineGap = Math.round(size * 1.12);
    const firstY = 282;
    const background = Buffer.from(`
      <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#101828" flood-opacity=".38"/>
          </filter>
        </defs>
        <rect width="${W}" height="${H}" rx="0" fill="${slide.bg}"/>
        ${motifSvg(slide.pattern)}
        <g font-family="${font}" text-anchor="middle" fill="${slide.ink}"${rtl}>
          <text x="642" y="130" font-size="38" font-weight="700" letter-spacing="9">DRAFT</text>
          <text x="642" y="${firstY}" font-size="${size}" font-weight="800">${esc(lines[0])}</text>
          <text x="642" y="${firstY + lineGap}" font-size="${size}" font-weight="800">${esc(lines[1])}</text>
        </g>
        <rect x="64" y="762" width="1156" height="2070" rx="126" fill="#17233C" opacity=".35" filter="url(#shadow)"/>
        <rect x="70" y="768" width="1144" height="2058" rx="120" fill="#17233C" stroke="${slide.ink}" stroke-opacity=".32" stroke-width="8"/>
      </svg>`);

    const output = path.join(localeDir, `${String(index + 1).padStart(2, '0')}-${slide.key}.png`);
    await sharp(background)
      .composite([
        { input: clippedPhone, left: phoneX, top: phoneY },
        { input: owl, left: 357, top: 520 },
      ])
      .removeAlpha()
      .withMetadata({ density: 72, icc: 'srgb' })
      .png({ compressionLevel: 9 })
      .toFile(output);
    console.log(output);
  }
}
