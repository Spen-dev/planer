function isMatrixTaskTransferred(quadrantId, index) {
  ensureMatrixState();
  return Boolean(state.matrixTransferred[quadrantId]?.[index]);
}

function getWeeklyTaskDone(link) {
  const week = state.weeks[link.weekStart];
  if (!week) return false;
  const day = week.days[link.dayIdx];
  if (!day) return false;
  const task = day.tasks[link.taskIdx];
  if (!task || !task.text.trim()) return false;
  return Boolean(task.done);
}

function isWeeklyTaskPresent(link) {
  const week = state.weeks[link.weekStart];
  if (!week) return false;
  const day = week.days[link.dayIdx];
  if (!day) return false;
  const task = day.tasks[link.taskIdx];
  return Boolean(task?.text?.trim());
}

function updateMatrixRowRestoredUI(quadrantId, index) {
  const checkbox = document.querySelector(
    `.matrix-row input[type="checkbox"][data-quadrant="${quadrantId}"][data-index="${index}"]`,
  );
  const row = checkbox?.closest(".matrix-row");
  if (!row) return;
  row.classList.remove("transferred", "done");
  if (checkbox) checkbox.checked = false;
  const sendBtn = row.querySelector(".matrix-send-btn");
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.title = "Добавить в день недели";
  }
}

function restoreMatrixTaskAt(quadrantId, index) {
  if (!isMatrixTaskTransferred(quadrantId, index)) return false;
  clearMatrixTaskTransferred(quadrantId, index);
  updateMatrixRowRestoredUI(quadrantId, index);
  refreshMatrixQuadrantStats(quadrantId);
  return true;
}

function restoreMatrixForWeeklyTask(weekStart, dayIdx, taskIdx) {
  ensureMatrixState();
  let changed = false;
  for (const q of QUADRANTS) {
    const rowCount = getMatrixRowCount(q.id);
    for (let i = 0; i < rowCount; i += 1) {
      const link = state.matrixLinks[q.id]?.[i];
      if (!link) continue;
      if (link.weekStart === weekStart && link.dayIdx === dayIdx && link.taskIdx === taskIdx) {
        if (restoreMatrixTaskAt(q.id, i)) changed = true;
      }
    }
  }
  return changed;
}

function updateMatrixRowDoneUI(quadrantId, index, done) {
  const checkbox = document.querySelector(
    `.matrix-row input[type="checkbox"][data-quadrant="${quadrantId}"][data-index="${index}"]`,
  );
  const row = checkbox?.closest(".matrix-row");
  if (!row) return;
  if (checkbox) checkbox.checked = done;
  row.classList.toggle("done", done);
}

function syncMatrixDoneFromWeeklyLink(quadrantId, index) {
  ensureMatrixState();
  const link = state.matrixLinks[quadrantId]?.[index];
  if (!link) return false;
  if (!isWeeklyTaskPresent(link)) {
    return restoreMatrixTaskAt(quadrantId, index);
  }
  const done = getWeeklyTaskDone(link);
  const task = normalizeMatrixTask(state.matrix[quadrantId][index]);
  if (task.done === done) return false;
  task.done = done;
  state.matrix[quadrantId][index] = task;
  updateMatrixRowDoneUI(quadrantId, index, done);
  refreshMatrixQuadrantStats(quadrantId);
  return true;
}

function syncMatrixForWeeklyTask(weekStart, dayIdx, taskIdx) {
  ensureMatrixState();
  let changed = false;
  for (const q of QUADRANTS) {
    const rowCount = getMatrixRowCount(q.id);
    for (let i = 0; i < rowCount; i += 1) {
      const link = state.matrixLinks[q.id]?.[i];
      if (!link) continue;
      if (link.weekStart === weekStart && link.dayIdx === dayIdx && link.taskIdx === taskIdx) {
        if (syncMatrixDoneFromWeeklyLink(q.id, i)) changed = true;
      }
    }
  }
  if (changed) scheduleSave();
}

function syncAllMatrixLinksFromWeekly(persist = true) {
  ensureMatrixState();
  let changed = false;
  for (const q of QUADRANTS) {
    const rowCount = getMatrixRowCount(q.id);
    for (let i = 0; i < rowCount; i += 1) {
      if (state.matrixLinks[q.id]?.[i] && syncMatrixDoneFromWeeklyLink(q.id, i)) {
        changed = true;
      }
    }
  }
  if (changed && persist) scheduleSave();
}

function setMatrixTaskLink(quadrantId, index, link) {
  ensureMatrixState();
  state.matrixLinks[quadrantId][index] = link;
  syncMatrixDoneFromWeeklyLink(quadrantId, index);
  scheduleSave();
}

function clearMatrixTaskLink(quadrantId, index) {
  ensureMatrixState();
  state.matrixLinks[quadrantId][index] = null;
  const task = normalizeMatrixTask(state.matrix[quadrantId][index]);
  task.done = false;
  state.matrix[quadrantId][index] = task;
}

function markMatrixTaskTransferred(quadrantId, index) {
  ensureMatrixState();
  state.matrixTransferred[quadrantId][index] = true;
  scheduleSave();
}

function clearMatrixTaskTransferred(quadrantId, index) {
  ensureMatrixState();
  if (!state.matrixTransferred[quadrantId]?.[index]) return;
  state.matrixTransferred[quadrantId][index] = false;
  clearMatrixTaskLink(quadrantId, index);
  scheduleSave();
}

function showTransferOverlay(text, quadrantId, index) {
  pendingTransfer = text;
  pendingTransferMeta = { quadrant: quadrantId, index };
  const overlay = document.getElementById("transferOverlay");
  document.getElementById("transferTaskText").textContent = text;
  const container = document.getElementById("transferDayButtons");
  container.innerHTML = DEFAULT_DAY_THEMES.map((day, i) =>
    `<button type="button" class="btn-secondary transfer-day-btn" data-day="${i}">${day.name}</button>`,
  ).join("");
  container.querySelectorAll(".transfer-day-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dayIdx = Number(btn.dataset.day);
      const taskIdx = addTaskToDay(dayIdx, pendingTransfer);
      hideOverlay(overlay);
      if (taskIdx >= 0 && pendingTransferMeta) {
        markMatrixTaskTransferred(pendingTransferMeta.quadrant, pendingTransferMeta.index);
        setMatrixTaskLink(pendingTransferMeta.quadrant, pendingTransferMeta.index, {
          weekStart: state.weekStart,
          dayIdx,
          taskIdx,
        });
      }
      pendingTransfer = null;
      pendingTransferMeta = null;
      if (taskIdx < 0) alert("Нет свободных слотов для задач в этом дне.");
      else document.querySelector('.tab[data-tab="weekly"]')?.click();
    });
  });
  showOverlay(overlay);
}

function renderMatrixRow(qId, index, taskData) {
  const task = normalizeMatrixTask(taskData);
  const transferred = isMatrixTaskTransferred(qId, index);
  const row = document.createElement("div");
  row.className = "matrix-row"
    + (transferred ? " transferred" : "")
    + (task.done ? " done" : "");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.disabled = true;
  checkbox.tabIndex = -1;
  checkbox.dataset.quadrant = qId;
  checkbox.dataset.index = String(index);
  checkbox.title = transferred
    ? "Статус синхронизируется с недельным планером"
    : "Перенесите задачу в день недели";
  checkbox.setAttribute("aria-label", "Выполнено");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "matrix-task";
  input.value = task.text || "";
  input.dataset.quadrant = qId;
  input.dataset.index = String(index);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "matrix-send-btn";
  btn.title = transferred ? "Уже перенесено в неделю" : "Добавить в день недели";
  btn.textContent = "→";
  btn.disabled = transferred;
  btn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text || isMatrixTaskTransferred(qId, index)) return;
    showTransferOverlay(text, qId, index);
  });
  row.appendChild(checkbox);
  row.appendChild(input);
  if (transferred) {
    const badge = document.createElement("span");
    badge.className = "matrix-link-badge";
    badge.textContent = getMatrixLinkLabel?.(qId, index) || "→";
    badge.title = "Перенесено в день недели";
    row.appendChild(badge);
    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.className = "matrix-restore-btn";
    restoreBtn.textContent = "↩";
    restoreBtn.title = "Вернуть в матрицу";
    restoreBtn.addEventListener("click", () => restoreMatrixFromWeekly(qId, index));
    row.appendChild(restoreBtn);
  }
  row.appendChild(btn);
  return row;
}

function renderMatrixStatsBlock(quadrantId) {
  const stats = calcMatrixQuadrantStats(quadrantId);
  const statsBlock = document.createElement("div");
  statsBlock.className = "stats-block matrix-stats";
  statsBlock.dataset.quadrant = quadrantId;
  statsBlock.innerHTML = `
    <div class="stat-item stat-done" title="Завершено">
      <span class="stat-icon stat-icon-done" aria-label="Завершено">✓</span>
      <strong>${stats.completed}</strong>
    </div>
    <span class="stat-sep" aria-hidden="true">|</span>
    <div class="stat-item stat-pending" title="Невыполнено">
      <span class="stat-icon stat-icon-pending" aria-label="Невыполнено">✕</span>
      <strong>${stats.notDone}</strong>
    </div>
  `;
  return statsBlock;
}

function refreshMatrixQuadrantStats(quadrantId) {
  const statsEl = document.querySelector(`#matrixGrid .matrix-stats[data-quadrant="${quadrantId}"]`);
  if (!statsEl) return;
  const stats = calcMatrixQuadrantStats(quadrantId);
  const strongs = statsEl.querySelectorAll(".stat-item strong");
  if (strongs[0]) strongs[0].textContent = stats.completed;
  if (strongs[1]) strongs[1].textContent = stats.notDone;
}

function addMatrixRow(quadrantId) {
  ensureMatrixState();
  if (state.matrixRowCounts[quadrantId] >= MATRIX_TASKS) return;
  state.matrixRowCounts[quadrantId] += 1;
  renderMatrix();
  scheduleSave();
}

function removeMatrixRow(quadrantId) {
  ensureMatrixState();
  if (state.matrixRowCounts[quadrantId] <= INITIAL_MATRIX_ROWS) return;
  const lastIdx = state.matrixRowCounts[quadrantId] - 1;
  state.matrix[quadrantId][lastIdx] = defaultMatrixTask();
  state.matrixTransferred[quadrantId][lastIdx] = false;
  state.matrixLinks[quadrantId][lastIdx] = null;
  state.matrixRowCounts[quadrantId] -= 1;
  renderMatrix();
  scheduleSave();
}

function renderMatrix() {
  window.__matrixLayoutCalibrated = false;
  ensureMatrixState();
  syncAllMatrixLinksFromWeekly(false);
  const hideTransferred = Boolean(state.appearance?.matrixHideTransferred);
  const hideCheck = document.getElementById("matrixHideTransferred");
  if (hideCheck) hideCheck.checked = hideTransferred;
  const matrixGrid = document.getElementById("matrixGrid");
  matrixGrid.innerHTML = "";
  for (const q of QUADRANTS) {
    const block = document.createElement("div");
    block.className = `quadrant ${q.className}`;
    const head = document.createElement("div");
    head.className = "section-head quadrant-head";
    head.innerHTML = `<h2>${q.title}</h2>`;
    const rowBtns = document.createElement("div");
    rowBtns.className = "row-btns";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-row-btn";
    removeBtn.textContent = "−";
    removeBtn.title = "Удалить строку";
    removeBtn.dataset.quadrant = q.id;
    removeBtn.disabled = getMatrixRowCount(q.id) <= INITIAL_MATRIX_ROWS;
    removeBtn.addEventListener("click", () => removeMatrixRow(q.id));
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "add-row-btn";
    addBtn.textContent = "+";
    addBtn.title = "Добавить строку";
    addBtn.dataset.quadrant = q.id;
    addBtn.disabled = getMatrixRowCount(q.id) >= MATRIX_TASKS;
    addBtn.addEventListener("click", () => addMatrixRow(q.id));
    rowBtns.appendChild(removeBtn);
    rowBtns.appendChild(addBtn);
    head.appendChild(rowBtns);
    block.appendChild(head);

    const tasks = state.matrix[q.id] || [];
    const rowCount = getMatrixRowCount(q.id);
    for (let i = 0; i < rowCount; i++) {
      if (hideTransferred && isMatrixTaskTransferred(q.id, i)) continue;
      block.appendChild(renderMatrixRow(q.id, i, tasks[i]));
    }
    block.appendChild(renderMatrixStatsBlock(q.id));
    matrixGrid.appendChild(block);
  }
}

function setupMatrixEvents() {
  if (matrixEventsReady) return;
  matrixEventsReady = true;
  const matrixGrid = document.getElementById("matrixGrid");
  matrixGrid.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.classList.contains("matrix-task")) return;
    const qId = el.dataset.quadrant;
    const idx = Number(el.dataset.index);
    ensureMatrixState();
    const task = normalizeMatrixTask(state.matrix[qId][idx]);
    task.text = el.value;
    state.matrix[qId][idx] = task;
    if (isMatrixTaskTransferred(qId, idx)) {
      clearMatrixTaskTransferred(qId, idx);
      el.closest(".matrix-row")?.classList.remove("transferred");
      const sendBtn = el.closest(".matrix-row")?.querySelector(".matrix-send-btn");
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.title = "Добавить в день недели";
      }
    }
    refreshMatrixQuadrantStats(qId);
    scheduleSave();
  });

  document.getElementById("transferCancelBtn")?.addEventListener("click", () => {
    pendingTransfer = null;
    pendingTransferMeta = null;
    hideOverlay(document.getElementById("transferOverlay"));
  });
}
