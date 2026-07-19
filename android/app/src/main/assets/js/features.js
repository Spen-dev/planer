const MAX_UNDO = 25;
const undoStack = [];
let undoCaptureSession = false;

function cloneStateSnapshot() {  return JSON.stringify(state);
}

function captureUndo() {
  undoStack.push(cloneStateSnapshot());
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function beginUndoCapture() {
  if (undoCaptureSession) return;
  undoCaptureSession = true;
  captureUndo();
}

function endUndoCapture() {
  undoCaptureSession = false;
}

function undoLastChange() {
  if (!undoStack.length) return false;
  const snapshot = undoStack.pop();
  state = parsePlainState(snapshot);
  applyAppearance();
  syncSettingsControls?.();
  renderWeekly();
  renderMatrix?.();
  maybeRefreshStatsTab?.();
  scheduleSave();
  scheduleFitWeeklyWindow();
  return true;
}

function applyRecurringTasks() {
  const recurring = state.recurringTasks || [];
  if (!recurring.length) return;
  const week = getWeek(state.weekStart);
  let changed = false;
  for (const item of recurring) {
    const day = week.days[item.dayIdx];
    if (!day) continue;
    if (day.tasks.some((t) => t.text.trim() === item.text)) continue;
    const slot = firstEmptyTaskSlot(day);
    if (slot < 0) continue;
    day.tasks[slot] = { text: item.text, done: false };
    changed = true;
  }
  if (changed) renderWeekly(true);
}

function applyHideCompletedSetting() {
  const hide = Boolean(state.appearance?.hideCompleted);
  document.querySelectorAll("#daysGrid .task-row.done").forEach((row) => {
    row.hidden = hide;
  });
}

function scrollToTodayColumn() {
  const todayStr = toDateString(new Date());
  if (state.weekStart !== toDateString(mondayOf(new Date()))) {
    goToTodayWeek();
    return;
  }
  const start = parseDate(state.weekStart);
  const today = parseDate(todayStr);
  const idx = Math.max(0, Math.min(6, Math.round((today - start) / 86400000)));
  const card = document.getElementById("daysGrid")?.children[idx];
  card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  card?.classList.add("day-flash");
  setTimeout(() => card?.classList.remove("day-flash"), 1200);
}

function formatImportReport(backup, imported) {
  const weeks = Object.keys(imported.weeks || {}).length;
  const exportedAt = backup.exportedAt
    ? new Date(backup.exportedAt).toLocaleString("ru-RU")
    : "не указана";
  return [
    `Версия файла: ${backup.version ?? 1}`,
    `Экспорт: ${exportedAt}`,
    `Недель в файле: ${weeks}`,
    `Текущая неделя в файле: ${imported.weekStart || "—"}`,
    backup.encrypted ? "Файл: зашифрован" : "Файл: без шифрования",
  ].join("\n");
}

function getSearchFilters() {
  return {
    tasks: document.getElementById("searchFilterTasks")?.checked !== false,
    notes: document.getElementById("searchFilterNotes")?.checked !== false,
    matrix: document.getElementById("searchFilterMatrix")?.checked !== false,
  };
}

function runSearchFiltered(query) {
  const filters = getSearchFilters();
  const q = query.trim().toLowerCase();
  const results = [];
  if (!q) return results;

  if (filters.tasks || filters.notes) {
    for (const [weekStart, week] of Object.entries(state.weeks)) {
      week.days.forEach((day, dayIdx) => {
        if (filters.tasks) {
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
        }
        if (filters.notes) {
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
        }
      });
    }
  }

  if (filters.matrix) {
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
  }
  return results.slice(0, 50);
}

function getMatrixLinkLabel(quadrantId, index) {
  const link = state.matrixLinks?.[quadrantId]?.[index];
  if (!link) return "";
  return `${DEFAULT_DAY_THEMES[link.dayIdx]?.name || "?"}`;
}

function restoreMatrixFromWeekly(quadrantId, index) {
  captureUndo();
  const link = state.matrixLinks?.[quadrantId]?.[index];
  if (link) {
    state.weeks = PlanerMatrixLinks.clearWeeklyTaskForLink(state.weeks, link);
  }
  restoreMatrixTaskAt(quadrantId, index);
  renderMatrix?.();
  renderWeekly();
  scheduleSave();
}

let autoBackupTimer = null;

function scheduleAutoBackup() {
  clearTimeout(autoBackupTimer);
  if (!state.appearance?.autoBackupEnabled) return;
  const days = Math.max(1, Number(state.appearance.autoBackupDays) || 1);
  const ms = days * 24 * 60 * 60 * 1000;
  autoBackupTimer = setTimeout(() => void runAutoBackup(), ms);
}

async function runAutoBackup() {
  if (!state.appearance?.autoBackupEnabled) return;
  const payload = backupPayload();
  let output = payload;
  if (sessionPassword) {
    output = await encryptText(JSON.stringify(payload), sessionPassword);
    output.version = 2;
    output.exportedAt = payload.exportedAt;
  }
  try {
    if (window.pywebview?.api?.auto_backup) {
      await window.pywebview.api.auto_backup(JSON.stringify(output));
    }
  } catch (_) { /* ignore */ }
  scheduleAutoBackup();
}

function setupTextSelectionFix() {
  /* task/note fields: label view + textarea editor */
}

function setupFeatureHooks() {
  const grid = document.getElementById("daysGrid");
  grid?.addEventListener("focusin", (e) => {
    const t = e.target;
    if (!isDayField(t)) return;
    if (!t.closest(".task-row, .note-row, .matrix-row")) return;
    beginUndoCapture();
  });

  grid?.addEventListener("click", (e) => {
    const header = e.target.closest(".day-header");
    if (!header) return;
    const card = header.closest(".day-card");
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    card.classList.add("day-flash");
    setTimeout(() => card.classList.remove("day-flash"), 1200);
  });

  document.getElementById("matrixHideTransferred")?.addEventListener("change", (e) => {
    state.appearance.matrixHideTransferred = e.target.checked;
    renderMatrix();
    scheduleSave();
  });

  document.getElementById("statsExportBtn")?.addEventListener("click", () => void exportStatsCsv());
}

async function exportStatsCsv() {
  const days = collectWeeklyDayStats?.() || [];
  const lines = ["day;completed;pending;progress"];
  for (const d of days) {
    lines.push(`${d.name};${d.completed};${d.notDone};${Math.round(d.progress * 100)}`);
  }
  const csv = `\uFEFF${lines.join("\r\n")}`;
  const filename = `planer-stats-${state.weekStart}.csv`;
  try {
    if (window.pywebview?.api?.save_text_file) {
      const res = await window.pywebview.api.save_text_file(csv, filename);
      if (res?.cancelled) return;
      if (!res?.ok) alert(res?.error || "Не удалось сохранить CSV.");
      return;
    }
  } catch (e) {
    alert(String(e));
    return;
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function wrapWeekNavigation() {
  const wrap = (fn) => () => {
    fn();
    applyRecurringTasks();
  };
  window.goToTodayWeek = wrap(goToTodayWeek);
  window.goPrevWeek = wrap(goPrevWeek);
  window.goNextWeek = wrap(goNextWeek);
}

function initFeatures() {
  setupTextSelectionFix();
  setupFeatureHooks();
  wrapWeekNavigation();
  applyHideCompletedSetting();
  setTimeout(() => {
    scheduleAutoBackup();
    applyRecurringTasks();
  }, 1500);
  void window.pywebview?.api?.set_minimize_to_tray?.(Boolean(state.appearance?.minimizeToTray));
}
