import fs from 'node:fs/promises';

const translations = {
  ar: {
    projects: { addTask: { title: 'إضافة مهمة', status: 'الحالة', taskTitle: 'عنوان المهمة', createFailed: 'تعذّر إنشاء المهمة.' }, due: 'موعد الاستحقاق: ' },
    addNote: { title: 'إضافة ملاحظة', noteTitle: 'عنوان الملاحظة', visibility: 'إمكانية العرض', content: 'المحتوى', toolbarHint: 'حدّد النص لتنسيقه', editorHint: 'حدّد النص واستخدم شريط الأدوات لتنسيقه. سيظهر التنسيق أثناء الكتابة.', visibilityOptions: { private: 'أنت فقط تستطيع رؤية هذه الملاحظة', shared: 'شاركها مع أشخاص محددين', public: 'يمكن للجميع رؤية هذه الملاحظة' } },
    projectDetail: { notFound: 'لم يتم العثور على المشروع', progress: 'التقدّم', members: 'الأعضاء', nudgeMe: 'ذكّرني', addTaskPlaceholder: 'إضافة مهمة', swipeHint: 'اسحب المهمة لليسار لعرض المزيد من الخيارات', relatedContent: 'محتوى مرتبط', tabs: { tasks: 'المهام', timeline: 'الجدول الزمني', gallery: 'المعرض' }, deadline: { overdue: 'متأخر', daysLeft_one: 'متبقٍ يوم واحد', daysLeft_other: 'متبقي {{count}} أيام' } },
    projectMembers: { title: 'أعضاء المشروع', currentMembers: 'الأعضاء الحاليون', addMember: 'إضافة عضو', canView: 'يمكنه العرض', canEdit: 'يمكنه التعديل', permissionLabel: 'الصلاحية:', adding: 'جارٍ الإضافة...', dismiss: 'إغلاق', removeMember: { title: 'إزالة العضو', message: 'هل تريد بالتأكيد إزالة {{email}} من هذا المشروع؟', action: 'إزالة' } },
    projectCard: { overdue: 'متأخر', dueToday: 'موعده اليوم', daysLeft_one: 'متبقٍ يوم واحد', daysLeft_other: 'متبقي {{count}} أيام', weeksLeft_one: 'متبقٍ أسبوع واحد', weeksLeft_other: 'متبقي {{count}} أسابيع', monthsLeft_one: 'متبقٍ شهر واحد', monthsLeft_other: 'متبقي {{count}} أشهر', tasksDone: '{{completed}}/{{total}} مهام مكتملة' }
  },
  ru: {
    projects: { addTask: { title: 'Добавить задачу', status: 'Статус', taskTitle: 'Название задачи', createFailed: 'Не удалось создать задачу.' }, due: 'Срок: ' },
    addNote: { title: 'Добавить заметку', noteTitle: 'Название заметки', visibility: 'Видимость', content: 'Содержание', toolbarHint: 'Выделите текст для форматирования', editorHint: 'Выделите текст и используйте панель инструментов. Форматирование отображается по мере ввода.', visibilityOptions: { private: 'Эту заметку видите только вы', shared: 'Поделиться с выбранными людьми', public: 'Заметку могут видеть все' } },
    projectDetail: { notFound: 'Проект не найден', progress: 'Прогресс', members: 'Участники', nudgeMe: 'Напомнить', addTaskPlaceholder: 'Добавить задачу', swipeHint: 'Смахните задачу влево, чтобы увидеть больше действий', relatedContent: 'Связанные материалы', tabs: { tasks: 'Задачи', timeline: 'Хронология', gallery: 'Галерея' }, deadline: { overdue: 'Просрочено', daysLeft_one: 'Остался {{count}} день', daysLeft_few: 'Осталось {{count}} дня', daysLeft_many: 'Осталось {{count}} дней', daysLeft_other: 'Осталось {{count}} дня' } },
    projectMembers: { title: 'Участники проекта', currentMembers: 'Текущие участники', addMember: 'Добавить участника', canView: 'Только просмотр', canEdit: 'Может редактировать', permissionLabel: 'Доступ:', adding: 'Добавление...', dismiss: 'Закрыть', removeMember: { title: 'Удалить участника', message: 'Удалить {{email}} из проекта?', action: 'Удалить' } },
    projectCard: { overdue: 'Просрочено', dueToday: 'Срок сегодня', daysLeft_one: 'Остался {{count}} день', daysLeft_few: 'Осталось {{count}} дня', daysLeft_many: 'Осталось {{count}} дней', daysLeft_other: 'Осталось {{count}} дня', weeksLeft_one: 'Осталась {{count}} неделя', weeksLeft_few: 'Осталось {{count}} недели', weeksLeft_many: 'Осталось {{count}} недель', weeksLeft_other: 'Осталось {{count}} недели', monthsLeft_one: 'Остался {{count}} месяц', monthsLeft_few: 'Осталось {{count}} месяца', monthsLeft_many: 'Осталось {{count}} месяцев', monthsLeft_other: 'Осталось {{count}} месяца', tasksDone: '{{completed}}/{{total}} задач выполнено' }
  },
  de: {
    projectDetail: { notFound: 'Projekt nicht gefunden', progress: 'Fortschritt', members: 'Mitglieder', nudgeMe: 'Erinnern', addTaskPlaceholder: 'Aufgabe hinzufügen', swipeHint: 'Aufgabe nach links wischen, um weitere Optionen zu sehen', relatedContent: 'Verknüpfte Inhalte', tabs: { tasks: 'Aufgaben', timeline: 'Verlauf', gallery: 'Galerie' }, deadline: { overdue: 'Überfällig', daysLeft_one: 'Noch {{count}} Tag', daysLeft_other: 'Noch {{count}} Tage' } },
    projectMembers: { title: 'Projektmitglieder', currentMembers: 'Aktuelle Mitglieder', addMember: 'Mitglied hinzufügen', canView: 'Kann ansehen', canEdit: 'Kann bearbeiten', permissionLabel: 'Berechtigung:', adding: 'Wird hinzugefügt...', dismiss: 'Schließen', removeMember: { title: 'Mitglied entfernen', message: '{{email}} wirklich aus diesem Projekt entfernen?', action: 'Entfernen' } },
    projectCard: { overdue: 'Überfällig', dueToday: 'Heute fällig', daysLeft_one: 'Noch {{count}} Tag', daysLeft_other: 'Noch {{count}} Tage', weeksLeft_one: 'Noch {{count}} Woche', weeksLeft_other: 'Noch {{count}} Wochen', monthsLeft_one: 'Noch {{count}} Monat', monthsLeft_other: 'Noch {{count}} Monate', tasksDone: '{{completed}}/{{total}} Aufgaben erledigt' }
  },
  pt: {
    projectDetail: { notFound: 'Projeto não encontrado', progress: 'Progresso', members: 'Membros', nudgeMe: 'Lembrar-me', addTaskPlaceholder: 'Adicionar tarefa', swipeHint: 'Deslize a tarefa para a esquerda para ver mais opções', relatedContent: 'Conteúdo relacionado', tabs: { tasks: 'Tarefas', timeline: 'Cronologia', gallery: 'Galeria' }, deadline: { overdue: 'Atrasado', daysLeft_one: 'Falta {{count}} dia', daysLeft_other: 'Faltam {{count}} dias' } },
    projectMembers: { title: 'Membros do projeto', currentMembers: 'Membros atuais', addMember: 'Adicionar membro', canView: 'Pode ver', canEdit: 'Pode editar', permissionLabel: 'Permissão:', adding: 'A adicionar...', dismiss: 'Fechar', removeMember: { title: 'Remover membro', message: 'Pretende remover {{email}} deste projeto?', action: 'Remover' } },
    projectCard: { overdue: 'Atrasado', dueToday: 'Termina hoje', daysLeft_one: 'Falta {{count}} dia', daysLeft_other: 'Faltam {{count}} dias', weeksLeft_one: 'Falta {{count}} semana', weeksLeft_other: 'Faltam {{count}} semanas', monthsLeft_one: 'Falta {{count}} mês', monthsLeft_other: 'Faltam {{count}} meses', tasksDone: '{{completed}}/{{total}} tarefas concluídas' }
  },
  es: {
    projectDetail: { notFound: 'Proyecto no encontrado', progress: 'Progreso', members: 'Miembros', nudgeMe: 'Recordarme', addTaskPlaceholder: 'Añadir tarea', swipeHint: 'Desliza la tarea a la izquierda para ver más opciones', relatedContent: 'Contenido relacionado', tabs: { tasks: 'Tareas', timeline: 'Cronología', gallery: 'Galería' }, deadline: { overdue: 'Atrasado', daysLeft_one: 'Queda {{count}} día', daysLeft_other: 'Quedan {{count}} días' } },
    projectMembers: { title: 'Miembros del proyecto', currentMembers: 'Miembros actuales', addMember: 'Añadir miembro', canView: 'Puede ver', canEdit: 'Puede editar', permissionLabel: 'Permiso:', adding: 'Añadiendo...', dismiss: 'Cerrar', removeMember: { title: 'Eliminar miembro', message: '¿Quieres eliminar a {{email}} de este proyecto?', action: 'Eliminar' } },
    projectCard: { overdue: 'Atrasado', dueToday: 'Vence hoy', daysLeft_one: 'Queda {{count}} día', daysLeft_other: 'Quedan {{count}} días', weeksLeft_one: 'Queda {{count}} semana', weeksLeft_other: 'Quedan {{count}} semanas', monthsLeft_one: 'Queda {{count}} mes', monthsLeft_other: 'Quedan {{count}} meses', tasksDone: '{{completed}}/{{total}} tareas completadas' }
  },
  it: {
    projectDetail: { notFound: 'Progetto non trovato', progress: 'Avanzamento', members: 'Membri', nudgeMe: 'Ricordamelo', addTaskPlaceholder: 'Aggiungi attività', swipeHint: 'Scorri l’attività verso sinistra per altre opzioni', relatedContent: 'Contenuti correlati', tabs: { tasks: 'Attività', timeline: 'Cronologia', gallery: 'Galleria' }, deadline: { overdue: 'Scaduto', daysLeft_one: 'Manca {{count}} giorno', daysLeft_other: 'Mancano {{count}} giorni' } },
    projectMembers: { title: 'Membri del progetto', currentMembers: 'Membri attuali', addMember: 'Aggiungi membro', canView: 'Può visualizzare', canEdit: 'Può modificare', permissionLabel: 'Permesso:', adding: 'Aggiunta in corso...', dismiss: 'Chiudi', removeMember: { title: 'Rimuovi membro', message: 'Vuoi rimuovere {{email}} da questo progetto?', action: 'Rimuovi' } },
    projectCard: { overdue: 'Scaduto', dueToday: 'Scade oggi', daysLeft_one: 'Manca {{count}} giorno', daysLeft_other: 'Mancano {{count}} giorni', weeksLeft_one: 'Manca {{count}} settimana', weeksLeft_other: 'Mancano {{count}} settimane', monthsLeft_one: 'Manca {{count}} mese', monthsLeft_other: 'Mancano {{count}} mesi', tasksDone: '{{completed}}/{{total}} attività completate' }
  },
  ja: {
    projectDetail: { notFound: 'プロジェクトが見つかりません', progress: '進捗', members: 'メンバー', nudgeMe: 'リマインド', addTaskPlaceholder: 'タスクを追加', swipeHint: 'タスクを左にスワイプするとその他の操作が表示されます', relatedContent: '関連コンテンツ', tabs: { tasks: 'タスク', timeline: 'タイムライン', gallery: 'ギャラリー' }, deadline: { overdue: '期限超過', daysLeft_one: '残り{{count}}日', daysLeft_other: '残り{{count}}日' } },
    projectMembers: { title: 'プロジェクトメンバー', currentMembers: '現在のメンバー', addMember: 'メンバーを追加', canView: '閲覧のみ', canEdit: '編集可能', permissionLabel: '権限：', adding: '追加中...', dismiss: '閉じる', removeMember: { title: 'メンバーを削除', message: '{{email}}をこのプロジェクトから削除しますか？', action: '削除' } },
    projectCard: { overdue: '期限超過', dueToday: '本日締切', daysLeft_one: '残り{{count}}日', daysLeft_other: '残り{{count}}日', weeksLeft_one: '残り{{count}}週間', weeksLeft_other: '残り{{count}}週間', monthsLeft_one: '残り{{count}}か月', monthsLeft_other: '残り{{count}}か月', tasksDone: '{{total}}件中{{completed}}件完了' }
  },
  zh: {
    projectDetail: { notFound: '未找到项目', progress: '进度', members: '成员', nudgeMe: '提醒我', addTaskPlaceholder: '添加任务', swipeHint: '向左滑动任务查看更多操作', relatedContent: '相关内容', tabs: { tasks: '任务', timeline: '时间线', gallery: '图库' }, deadline: { overdue: '已逾期', daysLeft_one: '剩余{{count}}天', daysLeft_other: '剩余{{count}}天' } },
    projectMembers: { title: '项目成员', currentMembers: '当前成员', addMember: '添加成员', canView: '可查看', canEdit: '可编辑', permissionLabel: '权限：', adding: '正在添加...', dismiss: '关闭', removeMember: { title: '移除成员', message: '确定要将{{email}}移出此项目吗？', action: '移除' } },
    projectCard: { overdue: '已逾期', dueToday: '今天到期', daysLeft_one: '剩余{{count}}天', daysLeft_other: '剩余{{count}}天', weeksLeft_one: '剩余{{count}}周', weeksLeft_other: '剩余{{count}}周', monthsLeft_one: '剩余{{count}}个月', monthsLeft_other: '剩余{{count}}个月', tasksDone: '已完成{{completed}}/{{total}}项任务' }
  }
};

function merge(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] ??= {};
      merge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

for (const [locale, patch] of Object.entries(translations)) {
  const file = new URL(`../locales/${locale}.json`, import.meta.url);
  const json = JSON.parse(await fs.readFile(file, 'utf8'));
  merge(json, patch);
  await fs.writeFile(file, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`Updated ${locale}`);
}
