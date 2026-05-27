function showTransferOverlay(text) {
  pendingTransfer = text;
  const overlay = document.getElementById("transferOverlay");
  document.getElementById("transferTaskText").textContent = text;
  const container = document.getElementById("transferDayButtons");
  container.innerHTML = DEFAULT_DAY_THEMES.map((day, i) =>
    `<button type="button" class="btn-secondary transfer-day-btn" data-day="${i}">${day.name}</button>`,
  ).join("");
  container.querySelectorAll(".transfer-day-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ok = addTaskToDay(Number(btn.dataset.day), pendingTransfer);
      hideOverlay(overlay);
      pendingTransfer = null;
      if (!ok) alert("Нет свободных слотов для задач в этом дне.");
      else document.querySelector('.tab[data-tab="weekly"]')?.click();
    });
  });
  showOverlay(overlay);
}

function renderMatrixRow(qId, index, value) {
  const row = document.createElement("div");
  row.className = "matrix-row";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "matrix-task";
  input.value = value || "";
  input.dataset.quadrant = qId;
  input.dataset.index = String(index);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "matrix-send-btn";
  btn.title = "Добавить в день недели";
  btn.textContent = "→";
  btn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;
    showTransferOverlay(text);
  });
  row.appendChild(input);
  row.appendChild(btn);
  return row;
}

function addMatrixRow(quadrantId) {
  ensureMatrixState();
  if (state.matrixRowCounts[quadrantId] >= MATRIX_TASKS) return;
  state.matrixRowCounts[quadrantId] += 1;
  renderMatrix();
  refitMatrixWindowAfterRows();
  scheduleSave();
}

function removeMatrixRow(quadrantId) {
  ensureMatrixState();
  if (state.matrixRowCounts[quadrantId] <= INITIAL_MATRIX_ROWS) return;
  const lastIdx = state.matrixRowCounts[quadrantId] - 1;
  state.matrix[quadrantId][lastIdx] = "";
  state.matrixRowCounts[quadrantId] -= 1;
  renderMatrix();
  refitMatrixWindowAfterRows();
  scheduleSave();
}

function renderMatrix() {
  window.__matrixLayoutCalibrated = false;
  ensureMatrixState();
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
      block.appendChild(renderMatrixRow(q.id, i, tasks[i]));
    }
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
    state.matrix[qId][idx] = el.value;
    scheduleSave();
  });

  document.getElementById("transferCancelBtn")?.addEventListener("click", () => {
    pendingTransfer = null;
    hideOverlay(document.getElementById("transferOverlay"));
  });
}
