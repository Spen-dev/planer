function renderTaskRow(dayIdx, taskIdx, task) {
  const row = document.createElement("div");
  row.className = "task-row" + (task.done ? " done" : "");
  row.draggable = true;
  row.dataset.day = String(dayIdx);
  row.dataset.task = String(taskIdx);
  row.innerHTML = `
    <input type="checkbox" ${task.done ? "checked" : ""} data-day="${dayIdx}" data-task="${taskIdx}" aria-label="Выполнено" />
    <input type="text" value="${escapeHtml(task.text)}" placeholder="" data-day="${dayIdx}" data-task="${taskIdx}" data-field="text" />
  `;
  return row;
}

function renderWeekly(skipAutoFit = false) {
  window.__weeklyLayoutCalibrated = false;
  const daysGrid = document.getElementById("daysGrid");
  updateWeekLabel();
  const week = getWeek(state.weekStart);
  daysGrid.innerHTML = "";
  const todayStr = toDateString(new Date());

  for (let i = 0; i < 7; i++) {
    const theme = getDayThemes()[i];
    const dayDate = addDays(state.weekStart, i);
    const day = week.days[i];
    const stats = calcDayStats(day);
    const pct = Math.round(stats.progress * 100);
    const isTodayCol = dayDate === todayStr;

    const card = document.createElement("article");
    card.className = "day-card" + (isTodayCol ? " is-today" : "");
    card.dataset.day = String(i);
    card.style.setProperty("--day-accent", theme.accent);
    card.style.setProperty("--day-text", theme.text);

    card.innerHTML = `
      <div class="day-header" style="background:${theme.bg}">
        <div>${theme.name}</div>
        <div class="day-date">${formatDateLong(dayDate)}</div>
      </div>
      <div class="progress-block">
        <div class="progress-label" style="color:${theme.accent}">Прогресс за день</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${pct}%;background:${theme.accent}"></div>
        </div>
        <div class="progress-value" style="color:${theme.accent}">${totalLabel(stats)}</div>
      </div>
      <div class="tasks-section" style="background:${theme.light}">
        <div class="section-head">
          <div class="tasks-title">Задачи</div>
          <div class="row-btns">
            <button type="button" class="remove-row-btn" data-day="${i}" data-kind="task" title="Удалить строку задачи" aria-label="Удалить строку задачи">−</button>
            <button type="button" class="add-row-btn" data-day="${i}" data-kind="task" title="Добавить строку задачи" aria-label="Добавить строку задачи">+</button>
          </div>
        </div>
        <div class="tasks-list" data-day="${i}"></div>
      </div>
      <div class="stats-block" style="background:${theme.light}">
        <div class="stat-item stat-done" title="Завершено">
          <span class="stat-icon stat-icon-done" aria-label="Завершено">✓</span>
          <strong>${stats.completed}</strong>
        </div>
        <span class="stat-sep" aria-hidden="true">|</span>
        <div class="stat-item stat-pending" title="Невыполнено">
          <span class="stat-icon stat-icon-pending" aria-label="Невыполнено">✕</span>
          <strong>${stats.notDone}</strong>
        </div>
      </div>
      <div class="notes-section" style="background:${theme.bg}88">
        <div class="section-head">
          <div class="notes-title">Заметки</div>
          <div class="row-btns">
            <button type="button" class="remove-row-btn" data-day="${i}" data-kind="note" title="Удалить строку заметки" aria-label="Удалить строку заметки">−</button>
            <button type="button" class="add-row-btn" data-day="${i}" data-kind="note" title="Добавить строку заметки" aria-label="Добавить строку заметки">+</button>
          </div>
        </div>
        <div class="notes-list" data-day="${i}"></div>
      </div>
    `;

    const tasksList = card.querySelector(".tasks-list");
    for (let ti = 0; ti < day.taskRows; ti++) {
      tasksList.appendChild(renderTaskRow(i, ti, day.tasks[ti]));
    }

    const notesList = card.querySelector(".notes-list");
    for (let ni = 0; ni < day.noteRows; ni++) {
      notesList.appendChild(renderNoteRow(i, ni, day.notes[ni]));
    }

    daysGrid.appendChild(card);
    syncDayRowButtons(i);
  }
  if (!skipAutoFit && isDesktopShell()) scheduleFitWeeklyWindow();
}

function syncDayRowButtons(dayIdx) {
  const day = getWeek(state.weekStart).days[dayIdx];
  const card = document.getElementById("daysGrid")?.children[dayIdx];
  if (!card) return;
  const taskAdd = card.querySelector('.add-row-btn[data-kind="task"]');
  const taskRemove = card.querySelector('.remove-row-btn[data-kind="task"]');
  const noteAdd = card.querySelector('.add-row-btn[data-kind="note"]');
  const noteRemove = card.querySelector('.remove-row-btn[data-kind="note"]');
  if (taskAdd) taskAdd.disabled = day.taskRows >= TASKS_PER_DAY;
  if (taskRemove) taskRemove.disabled = day.taskRows <= INITIAL_TASK_ROWS;
  if (noteAdd) noteAdd.disabled = day.noteRows >= NOTES_MAX;
  if (noteRemove) noteRemove.disabled = day.noteRows <= INITIAL_NOTE_ROWS;
}

function refreshDayStats(dayIdx) {
  const daysGrid = document.getElementById("daysGrid");
  const cards = daysGrid.children;
  if (!cards[dayIdx]) return;
  const week = getWeek(state.weekStart);
  const day = week.days[dayIdx];
  const stats = calcDayStats(day);
  const pct = Math.round(stats.progress * 100);
  const card = cards[dayIdx];

  card.querySelector(".progress-bar").style.width = `${pct}%`;
  card.querySelector(".progress-value").textContent = totalLabel(stats);
  const statItems = card.querySelectorAll(".stat-item strong");
  statItems[0].textContent = stats.completed;
  statItems[1].textContent = stats.notDone;
  maybeRefreshStatsTab();
}

function addDayTaskRow(dayIdx) {
  const day = getWeek(state.weekStart).days[dayIdx];
  if (day.taskRows >= TASKS_PER_DAY) return;
  day.taskRows += 1;
  renderWeekly(true);
  refitWeeklyWindowAfterRows();
  scheduleSave();
}

function removeDayTaskRow(dayIdx) {
  const day = getWeek(state.weekStart).days[dayIdx];
  if (day.taskRows <= INITIAL_TASK_ROWS) return;
  const lastIdx = day.taskRows - 1;
  restoreMatrixForWeeklyTask(state.weekStart, dayIdx, lastIdx);
  day.tasks[lastIdx] = { text: "", done: false };
  day.taskRows -= 1;
  renderWeekly(true);
  refitWeeklyWindowAfterRows();
  scheduleSave();
}

function renderNoteRow(dayIdx, noteIdx, value) {
  const row = document.createElement("div");
  row.className = "note-row";
  row.innerHTML = `
    <span class="note-num">${noteIdx + 1}</span>
    <input type="text" value="${escapeHtml(value || "")}" data-day="${dayIdx}" data-note="${noteIdx}" />
  `;
  return row;
}

function addDayNoteRow(dayIdx) {
  const day = getWeek(state.weekStart).days[dayIdx];
  if (day.noteRows >= NOTES_MAX) return;
  day.noteRows += 1;
  renderWeekly(true);
  refitWeeklyWindowAfterRows();
  scheduleSave();
}

function removeDayNoteRow(dayIdx) {
  const day = getWeek(state.weekStart).days[dayIdx];
  if (day.noteRows <= INITIAL_NOTE_ROWS) return;
  const lastIdx = day.noteRows - 1;
  day.notes[lastIdx] = "";
  day.noteRows -= 1;
  renderWeekly(true);
  refitWeeklyWindowAfterRows();
  scheduleSave();
}

function moveTask(fromDay, fromTask, toDay, toTask) {
  const week = getWeek(state.weekStart);
  const src = week.days[fromDay].tasks[fromTask];
  const dst = week.days[toDay].tasks[toTask];
  if (!src.text.trim() && !src.done) return;

  if (fromDay === toDay && fromTask === toTask) return;

  if (!dst.text.trim() && !dst.done) {
    week.days[toDay].tasks[toTask] = { ...src };
    week.days[fromDay].tasks[fromTask] = { text: "", done: false };
    restoreMatrixForWeeklyTask(state.weekStart, fromDay, fromTask);
  } else {
    week.days[fromDay].tasks[fromTask] = { ...dst };
    week.days[toDay].tasks[toTask] = { ...src };
  }
  renderWeekly();
  scheduleSave();
}

function addTaskToDay(dayIdx, text) {
  const trimmed = text.trim();
  if (!trimmed) return -1;
  const day = getWeek(state.weekStart).days[dayIdx];
  const slot = firstEmptyTaskSlot(day);
  if (slot < 0) return -1;
  day.tasks[slot] = { text: trimmed, done: false };
  renderWeekly();
  scheduleSave();
  return slot;
}

function copyWeekToNext() {
  const srcStart = state.weekStart;
  const dstStart = addDays(srcStart, 7);
  const srcWeek = getWeek(srcStart);
  const dstWeek = getWeek(dstStart);
  for (let i = 0; i < 7; i++) {
    dstWeek.days[i].tasks = srcWeek.days[i].tasks.map((t) => ({ text: t.text, done: false }));
    dstWeek.days[i].notes = [...srcWeek.days[i].notes];
    dstWeek.days[i].taskRows = srcWeek.days[i].taskRows;
    dstWeek.days[i].noteRows = srcWeek.days[i].noteRows;
  }
  state.weekStart = dstStart;
  renderWeekly();
  scheduleSave();
}

function printWeekly() {
  document.body.classList.add("printing");
  window.print();
  setTimeout(() => document.body.classList.remove("printing"), 500);
}

function updateWeekLabel() {
  const weekRangeEl = document.getElementById("weekRange");
  const weekStartInput = document.getElementById("weekStart");
  const start = state.weekStart;
  weekRangeEl.textContent = `${formatDateLong(start)} — ${formatDateLong(addDays(start, 6))}`;
  weekStartInput.value = start;
  maybeRefreshStatsTab();
}

function setupWeeklyEvents() {
  if (weeklyEventsReady) return;
  weeklyEventsReady = true;
  const daysGrid = document.getElementById("daysGrid");
  let dragFrom = null;

  daysGrid.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-row-btn");
    if (removeBtn) {
      const dayIdx = Number(removeBtn.dataset.day);
      if (removeBtn.dataset.kind === "task") removeDayTaskRow(dayIdx);
      else removeDayNoteRow(dayIdx);
      return;
    }
    const btn = e.target.closest(".add-row-btn");
    if (!btn) return;
    const dayIdx = Number(btn.dataset.day);
    if (btn.dataset.kind === "task") addDayTaskRow(dayIdx);
    else addDayNoteRow(dayIdx);
  });

  daysGrid.addEventListener("change", (e) => {
    const el = e.target;
    if (el.type !== "checkbox" || el.dataset.task === undefined) return;
    const dayIdx = Number(el.dataset.day);
    const taskIdx = Number(el.dataset.task);
    getWeek(state.weekStart).days[dayIdx].tasks[taskIdx].done = el.checked;
    el.closest(".task-row")?.classList.toggle("done", el.checked);
    refreshDayStats(dayIdx);
    syncMatrixForWeeklyTask(state.weekStart, dayIdx, taskIdx);
    scheduleSave();
  });

  daysGrid.addEventListener("input", (e) => {
    const el = e.target;
    if (el.tagName !== "INPUT" || el.type === "checkbox") return;
    const dayIdx = Number(el.dataset.day);
    if (Number.isNaN(dayIdx)) return;

    if (el.dataset.task !== undefined) {
      const taskIdx = Number(el.dataset.task);
      getWeek(state.weekStart).days[dayIdx].tasks[taskIdx].text = el.value;
      if (!el.value.trim()) {
        restoreMatrixForWeeklyTask(state.weekStart, dayIdx, taskIdx);
      } else {
        syncMatrixForWeeklyTask(state.weekStart, dayIdx, taskIdx);
      }
      refreshDayStats(dayIdx);
      scheduleSave();
      return;
    }

    if (el.dataset.note !== undefined) {
      getWeek(state.weekStart).days[dayIdx].notes[Number(el.dataset.note)] = el.value;
      scheduleSave();
    }
  });

  daysGrid.addEventListener("dragstart", (e) => {
    const row = e.target.closest(".task-row");
    if (!row) return;
    dragFrom = { day: Number(row.dataset.day), task: Number(row.dataset.task) };
    row.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${dragFrom.day}:${dragFrom.task}`);
  });

  daysGrid.addEventListener("dragend", (e) => {
    e.target.closest(".task-row")?.classList.remove("dragging");
    daysGrid.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
    dragFrom = null;
  });

  daysGrid.addEventListener("dragover", (e) => {
    const row = e.target.closest(".task-row");
    const card = e.target.closest(".day-card");
    if (!row && !card) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    daysGrid.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
    (row || card)?.classList.add("drop-target");
  });

  daysGrid.addEventListener("dragleave", (e) => {
    e.target.closest(".task-row, .day-card")?.classList.remove("drop-target");
  });

  daysGrid.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!dragFrom) return;
    const row = e.target.closest(".task-row");
    let toDay = dragFrom.day;
    let toTask = dragFrom.task;
    if (row) {
      toDay = Number(row.dataset.day);
      toTask = Number(row.dataset.task);
    } else {
      const card = e.target.closest(".day-card");
      if (card) {
        toDay = Number(card.dataset.day);
        toTask = firstEmptyTaskSlot(getWeek(state.weekStart).days[toDay]);
        if (toTask < 0) return;
      }
    }
    daysGrid.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
    moveTask(dragFrom.day, dragFrom.task, toDay, toTask);
  });
}

function setupWeeklyToolbar() {
  document.getElementById("prevWeek").addEventListener("click", () => {
    state.weekStart = addDays(state.weekStart, -7);
    scheduleSave();
    renderWeekly();
  });

  document.getElementById("nextWeek").addEventListener("click", () => {
    state.weekStart = addDays(state.weekStart, 7);
    scheduleSave();
    renderWeekly();
  });

  document.getElementById("todayWeek").addEventListener("click", () => {
    state.weekStart = toDateString(mondayOf(new Date()));
    scheduleSave();
    renderWeekly();
  });

  document.getElementById("weekStart").addEventListener("change", (e) => {
    state.weekStart = toDateString(mondayOf(parseDate(e.target.value)));
    scheduleSave();
    renderWeekly();
  });

  document.getElementById("saveBtn")?.addEventListener("click", () => void saveBackup());
  document.getElementById("loadBtn")?.addEventListener("click", () => void importBackup());
  document.getElementById("copyWeekBtn")?.addEventListener("click", copyWeekToNext);
  document.getElementById("printBtn")?.addEventListener("click", printWeekly);
}

function goToTodayWeek() {
  state.weekStart = toDateString(mondayOf(new Date()));
  scheduleSave();
  renderWeekly();
}

function goPrevWeek() {
  state.weekStart = addDays(state.weekStart, -7);
  scheduleSave();
  renderWeekly();
}

function goNextWeek() {
  state.weekStart = addDays(state.weekStart, 7);
  scheduleSave();
  renderWeekly();
}

function runSearch(query) {
  const q = query.trim().toLowerCase();
  const results = [];
  if (!q) return results;

  for (const [weekStart, week] of Object.entries(state.weeks)) {
    week.days.forEach((day, dayIdx) => {
      day.tasks.forEach((task, taskIdx) => {
        if (task.text.toLowerCase().includes(q)) {
          results.push({
            kind: "task",
            weekStart,
            dayIdx,
            taskIdx,
            text: task.text,
            label: `${DEFAULT_DAY_THEMES[dayIdx].name}, ${formatDateLong(addDays(weekStart, dayIdx))}: ${task.text}`,
          });
        }
      });
      day.notes.forEach((note, noteIdx) => {
        if (note.toLowerCase().includes(q)) {
          results.push({
            kind: "note",
            weekStart,
            dayIdx,
            noteIdx,
            text: note,
            label: `${DEFAULT_DAY_THEMES[dayIdx].name}, заметка: ${note}`,
          });
        }
      });
    });
  }

  for (const quadrant of QUADRANTS) {
    (state.matrix[quadrant.id] || []).forEach((task, idx) => {
      const text = getMatrixTaskText(task);
      if (text.toLowerCase().includes(q)) {
        results.push({
          kind: "matrix",
          quadrant: quadrant.id,
          index: idx,
          text,
          label: `${quadrant.title}: ${text}`,
        });
      }
    });
  }
  return results.slice(0, 50);
}

function openSearchResult(item) {
  hideOverlay(document.getElementById("searchOverlay"));
  if (item.kind === "matrix") {
    document.querySelector('.tab[data-tab="eisenhower"]')?.click();
    requestAnimationFrame(() => {
      const input = document.querySelector(
        `.matrix-task[data-quadrant="${item.quadrant}"][data-index="${item.index}"]`,
      );
      input?.focus();
      input?.select();
    });
    return;
  }
  document.querySelector('.tab[data-tab="weekly"]')?.click();
  state.weekStart = item.weekStart;
  renderWeekly();
  scheduleFitWeeklyWindow();
  requestAnimationFrame(() => {
    const selector = item.kind === "task"
      ? `.task-row input[data-day="${item.dayIdx}"][data-task="${item.taskIdx}"]`
      : `.note-row input[data-day="${item.dayIdx}"][data-note="${item.noteIdx}"]`;
    const input = document.querySelector(selector);
    input?.focus();
    input?.select();
  });
}

function setupSearch() {
  const overlay = document.getElementById("searchOverlay");
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("searchResults");

  document.getElementById("searchBtn")?.addEventListener("click", () => {
    input.value = "";
    resultsEl.innerHTML = "";
    showOverlay(overlay);
    input.focus();
  });

  document.getElementById("searchCloseBtn")?.addEventListener("click", () => hideOverlay(overlay));

  input.addEventListener("input", () => {
    const items = runSearch(input.value);
    if (!items.length) {
      resultsEl.innerHTML = `<p class="search-empty">${input.value.trim() ? "Ничего не найдено" : "Введите запрос"}</p>`;
      return;
    }
    resultsEl.innerHTML = items.map((item, i) =>
      `<button type="button" class="search-hit" data-idx="${i}">${escapeHtml(item.label)}</button>`,
    ).join("");
    resultsEl.querySelectorAll(".search-hit").forEach((btn) => {
      btn.addEventListener("click", () => openSearchResult(items[Number(btn.dataset.idx)]));
    });
  });
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const tab = btn.dataset.tab;
      document.querySelectorAll(".panel").forEach((p) => {
        const active = p.id === tab;
        p.classList.toggle("active", active);
        p.hidden = !active;
      });
      document.body.classList.remove("view-weekly", "view-matrix", "view-stats");
      if (tab === "weekly") document.body.classList.add("view-weekly");
      else if (tab === "eisenhower") document.body.classList.add("view-matrix");
      else if (tab === "stats") document.body.classList.add("view-stats");
      document.getElementById("printBtn")?.toggleAttribute("hidden", tab !== "weekly");
      if (tab === "eisenhower") {
        renderMatrix();
        if (!matrixReady) matrixReady = true;
        fitMatrixWindow();
      } else if (tab === "stats") {
        renderWeeklyStats();
      } else {
        restoreWeeklyWindow();
      }
    });
  });
}
