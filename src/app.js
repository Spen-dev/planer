const STORAGE_KEY = "planer-data-v2";
const CRYPTO_META_KEY = "planer-crypto-v1";
const REMEMBER_KEY = "planer-remember-v1";
const DEVICE_KEY = "planer-device-key-v1";
const TASKS_PER_DAY = 15;
const NOTES_PER_DAY = 4;
const MATRIX_TASKS = 14;

const DAY_THEMES = [
  { name: "Пн", bg: "#FCEEE0", accent: "#F6C99E", light: "#FEF6EF" },
  { name: "Вт", bg: "#FEE3DE", accent: "#FDB4A6", light: "#FFF1EE" },
  { name: "Ср", bg: "#FAE2E3", accent: "#F1ABAE", light: "#FDF0F1" },
  { name: "Чт", bg: "#F3E9F0", accent: "#E1CADB", light: "#F9F4F8" },
  { name: "Пт", bg: "#C0DADE", accent: "#8BB4BE", light: "#F4F8F9" },
  { name: "Сб", bg: "#E7F5EA", accent: "#C7E6CE", light: "#F3FAF5" },
  { name: "Вс", bg: "#F9F6E3", accent: "#E6DC8E", light: "#FCFBF1" },
];

const QUADRANTS = [
  { id: "urgentImportant", title: "Срочно и важно", className: "q1" },
  { id: "urgentNotImportant", title: "Срочно, но не важно", className: "q2" },
  { id: "importantNotUrgent", title: "Важно, но не срочно", className: "q3" },
  { id: "notImportantNotUrgent", title: "Не важно и не срочно", className: "q4" },
];

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

let state = defaultState();
let sessionPassword = null;

function defaultDay() {
  return {
    tasks: Array.from({ length: TASKS_PER_DAY }, () => ({ text: "", done: false })),
    notes: Array.from({ length: NOTES_PER_DAY }, () => ""),
  };
}

function defaultWeek(weekStart) {
  return {
    weekStart,
    days: Array.from({ length: 7 }, () => defaultDay()),
  };
}

function defaultMatrix() {
  const matrix = {};
  for (const q of QUADRANTS) {
    matrix[q.id] = Array.from({ length: MATRIX_TASKS }, () => "");
  }
  return matrix;
}

function defaultState() {
  return {
    weekStart: toDateString(mondayOf(new Date())),
    weeks: {},
    matrix: defaultMatrix(),
  };
}

function b64(bytes) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function b64dec(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptText(text, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text),
  );
  return {
    v: 1,
    encrypted: true,
    salt: b64(salt),
    iv: b64(iv),
    data: b64(new Uint8Array(cipher)),
  };
}

async function decryptText(payload, password) {
  const key = await deriveKey(password, b64dec(payload.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64dec(payload.iv) },
    key,
    b64dec(payload.data),
  );
  return new TextDecoder().decode(plain);
}

function hasCryptoSetup() {
  return Boolean(localStorage.getItem(CRYPTO_META_KEY));
}

function parsePlainState(raw) {
  const parsed = JSON.parse(raw);
  return {
    weekStart: parsed.weekStart || defaultState().weekStart,
    weeks: parsed.weeks || {},
    matrix: { ...defaultMatrix(), ...parsed.matrix },
  };
}

async function loadState() {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) raw = localStorage.getItem("planer-data-v1");
  if (!raw) return defaultState();

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.encrypted) {
      if (!sessionPassword) throw new Error("NO_PASSWORD");
      const text = await decryptText(parsed, sessionPassword);
      return parsePlainState(text);
    }
    return parsePlainState(raw);
  } catch (err) {
    if (String(err?.message || err) === "NO_PASSWORD") throw err;
    return defaultState();
  }
}

async function saveState() {
  const plain = JSON.stringify(state);
  if (sessionPassword) {
    const encrypted = await encryptText(plain, sessionPassword);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
    localStorage.setItem(CRYPTO_META_KEY, "1");
    return;
  }
  localStorage.setItem(STORAGE_KEY, plain);
}

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

function formatDateLong(dateStr) {
  const d = parseDate(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function getWeek(weekStart) {
  if (!state.weeks[weekStart]) {
    state.weeks[weekStart] = defaultWeek(weekStart);
  }
  return state.weeks[weekStart];
}

function calcDayStats(day) {
  const filled = day.tasks.filter((t) => t.text.trim());
  const total = filled.length;
  const completed = filled.filter((t) => t.done).length;
  const progress = total > 0 ? completed / total : 0;
  const notDone = Math.max(0, total - completed);
  return { total, completed, notDone, progress };
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const licenseOverlay = document.getElementById("licenseOverlay");
const licenseKeyInput = document.getElementById("licenseKey");
const licenseError = document.getElementById("licenseError");
const licenseActivate = document.getElementById("licenseActivate");
const passwordOverlay = document.getElementById("passwordOverlay");
const passwordTitle = document.getElementById("passwordTitle");
const passwordHint = document.getElementById("passwordHint");
const passwordInput = document.getElementById("passwordInput");
const passwordConfirm = document.getElementById("passwordConfirm");
const passwordError = document.getElementById("passwordError");
const passwordSubmit = document.getElementById("passwordSubmit");
const rememberWrap = document.getElementById("rememberWrap");
const rememberPassword = document.getElementById("rememberPassword");

let matrixReady = false;

function isPreLicensed() {
  return location.hash.includes("licensed=1");
}

async function saveRememberedPassword(password) {
  const wrapped = await encryptText(password, DEVICE_KEY);
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(wrapped));
}

async function tryRememberedPassword() {
  const raw = localStorage.getItem(REMEMBER_KEY);
  if (!raw) return false;
  try {
    sessionPassword = await decryptText(JSON.parse(raw), DEVICE_KEY);
    await loadState();
    return true;
  } catch {
    sessionPassword = null;
    localStorage.removeItem(REMEMBER_KEY);
    return false;
  }
}

function showOverlay(el) {
  el.hidden = false;
}

function hideOverlay(el) {
  el.hidden = true;
}

function showLicenseOverlay() {
  licenseError.hidden = true;
  showOverlay(licenseOverlay);
  licenseKeyInput.focus();
}

async function ensureLicense() {
  if (isPreLicensed()) return true;
  if (!window.pywebview?.api?.check_license) return true;
  const res = await window.pywebview.api.check_license();
  if (res?.ok) return true;
  return new Promise((resolve) => {
    showLicenseOverlay();
    licenseActivate.onclick = async () => {
      licenseError.hidden = true;
      const key = licenseKeyInput.value.trim();
      const activation = await window.pywebview.api.activate_license(key);
      if (activation?.ok) {
        hideOverlay(licenseOverlay);
        resolve(true);
        return;
      }
      licenseError.textContent = activation?.error || "Не удалось активировать ключ.";
      licenseError.hidden = false;
    };
  });
}

function showPasswordOverlay(mode) {
  passwordError.hidden = true;
  passwordInput.value = "";
  passwordConfirm.value = "";
  const isSetup = mode === "setup";
  passwordTitle.textContent = isSetup ? "Задайте пароль" : "Введите пароль";
  passwordHint.textContent = isSetup
    ? "Пароль шифрует задачи и заметки на этом компьютере."
    : "Для доступа к зашифрованным данным нужен пароль.";
  passwordConfirm.hidden = !isSetup;
  rememberWrap.hidden = false;
  rememberPassword.checked = Boolean(localStorage.getItem(REMEMBER_KEY));
  showOverlay(passwordOverlay);
  passwordInput.focus();
  return new Promise((resolve, reject) => {
    passwordSubmit.onclick = async () => {
      passwordError.hidden = true;
      const pass = passwordInput.value;
      if (pass.length < 6) {
        passwordError.textContent = "Пароль должен быть не короче 6 символов.";
        passwordError.hidden = false;
        return;
      }
      if (isSetup) {
        if (pass !== passwordConfirm.value) {
          passwordError.textContent = "Пароли не совпадают.";
          passwordError.hidden = false;
          return;
        }
        sessionPassword = pass;
        if (rememberPassword.checked) {
          await saveRememberedPassword(pass);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        hideOverlay(passwordOverlay);
        resolve(pass);
        return;
      }
      sessionPassword = pass;
      try {
        await loadState();
        if (rememberPassword.checked) {
          await saveRememberedPassword(pass);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        hideOverlay(passwordOverlay);
        resolve(pass);
      } catch {
        sessionPassword = null;
        passwordError.textContent = "Неверный пароль.";
        passwordError.hidden = false;
      }
    };
  });
}

async function ensurePassword() {
  if (hasCryptoSetup() && (await tryRememberedPassword())) {
    return;
  }
  if (!hasCryptoSetup()) {
    await showPasswordOverlay("setup");
    return;
  }
  await showPasswordOverlay("unlock");
}

async function bootApp() {
  if (!(await ensureLicense())) return;
  await ensurePassword();
  state = await loadState();
  renderWeekly();
}

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
    if (tab === "eisenhower" && !matrixReady) {
      renderMatrix();
      matrixReady = true;
    }
  });
});

const weekStartInput = document.getElementById("weekStart");
const weekRangeEl = document.getElementById("weekRange");
const daysGrid = document.getElementById("daysGrid");
const saveBtn = document.getElementById("saveBtn");

function updateWeekLabel() {
  const start = state.weekStart;
  const end = addDays(start, 6);
  weekRangeEl.textContent = `${formatDateLong(start)} — ${formatDateLong(end)}`;
  weekStartInput.value = start;
}

function backupPayload() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    encrypted: Boolean(sessionPassword),
    state,
  };
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function saveBackup() {
  const payload = backupPayload();
  let output = payload;

  if (sessionPassword) {
    output = await encryptText(JSON.stringify(payload), sessionPassword);
    output.version = 2;
    output.exportedAt = payload.exportedAt;
  }

  const name = sessionPassword
    ? `planer-backup-${state.weekStart}.planer`
    : `planer-backup-${state.weekStart}.json`;

  try {
    if (window.pywebview?.api?.save_backup) {
      const res = await window.pywebview.api.save_backup(JSON.stringify(output));
      if (res?.ok) return;
      if (res?.cancelled) return;
      alert(res?.error || "Не удалось сохранить файл.");
      return;
    }
  } catch (e) {
    alert(String(e));
    return;
  }

  downloadJson(name, output);
}

document.getElementById("prevWeek").addEventListener("click", () => {
  state.weekStart = addDays(state.weekStart, -7);
  void saveState().then(renderWeekly);
});

document.getElementById("nextWeek").addEventListener("click", () => {
  state.weekStart = addDays(state.weekStart, 7);
  void saveState().then(renderWeekly);
});

document.getElementById("todayWeek").addEventListener("click", () => {
  state.weekStart = toDateString(mondayOf(new Date()));
  void saveState().then(renderWeekly);
});

if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    void saveBackup();
  });
}

weekStartInput.addEventListener("change", () => {
  const picked = parseDate(weekStartInput.value);
  state.weekStart = toDateString(mondayOf(picked));
  void saveState().then(renderWeekly);
});

function renderWeekly() {
  updateWeekLabel();
  const week = getWeek(state.weekStart);
  daysGrid.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const theme = DAY_THEMES[i];
    const dayDate = addDays(state.weekStart, i);
    const day = week.days[i];
    const stats = calcDayStats(day);
    const pct = Math.round(stats.progress * 100);

    const card = document.createElement("article");
    card.className = "day-card";
    card.style.setProperty("--day-accent", theme.accent);

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
      <div class="tasks-section" style="background:${theme.bg}22">
        <div class="tasks-title">Задачи</div>
        <div class="tasks-list" data-day="${i}"></div>
      </div>
      <div class="stats-block" style="background:${theme.light}">
        <div class="stat-item"><span style="color:${theme.accent}">Завершено</span><strong>${stats.completed}</strong></div>
        <div class="stat-item"><span style="color:${theme.accent}">Невыполнено</span><strong>${stats.notDone}</strong></div>
      </div>
      <div class="notes-section" style="background:${theme.bg}44">
        <div class="notes-title">Заметки</div>
        <div class="notes-list" data-day="${i}"></div>
      </div>
    `;

    const tasksList = card.querySelector(".tasks-list");
    day.tasks.forEach((task, ti) => {
      const row = document.createElement("div");
      row.className = "task-row" + (task.done ? " done" : "");
      row.innerHTML = `
        <input type="checkbox" ${task.done ? "checked" : ""} data-day="${i}" data-task="${ti}" aria-label="Выполнено" />
        <input type="text" value="${escapeHtml(task.text)}" placeholder="" data-day="${i}" data-task="${ti}" data-field="text" />
      `;
      tasksList.appendChild(row);
    });

    const notesList = card.querySelector(".notes-list");
    day.notes.forEach((note, ni) => {
      const row = document.createElement("div");
      row.className = "note-row";
      row.innerHTML = `
        <span class="note-num">${ni + 1}</span>
        <input type="text" value="${escapeHtml(note)}" data-day="${i}" data-note="${ni}" />
      `;
      notesList.appendChild(row);
    });

    daysGrid.appendChild(card);
  }

  bindWeeklyEvents();
}

function totalLabel(stats) {
  if (stats.total === 0) return "—";
  return `${stats.completed} / ${stats.total} (${Math.round(stats.progress * 100)}%)`;
}

function bindWeeklyEvents() {
  daysGrid.querySelectorAll('input[type="checkbox"]').forEach((el) => {
    el.addEventListener("change", () => {
      const dayIdx = Number(el.dataset.day);
      const taskIdx = Number(el.dataset.task);
      const week = getWeek(state.weekStart);
      week.days[dayIdx].tasks[taskIdx].done = el.checked;
      el.closest(".task-row").classList.toggle("done", el.checked);
      void saveState().then(() => refreshDayStats(dayIdx));
    });
  });

  daysGrid.querySelectorAll('.task-row input[type="text"]').forEach((el) => {
    el.addEventListener("input", () => {
      const dayIdx = Number(el.dataset.day);
      const taskIdx = Number(el.dataset.task);
      getWeek(state.weekStart).days[dayIdx].tasks[taskIdx].text = el.value;
      void saveState().then(() => refreshDayStats(dayIdx));
    });
  });

  daysGrid.querySelectorAll(".note-row input").forEach((el) => {
    el.addEventListener("input", () => {
      const dayIdx = Number(el.dataset.day);
      const noteIdx = Number(el.dataset.note);
      getWeek(state.weekStart).days[dayIdx].notes[noteIdx] = el.value;
      void saveState();
    });
  });
}

function refreshDayStats(dayIdx) {
  const cards = daysGrid.children;
  if (!cards[dayIdx]) return;
  const week = getWeek(state.weekStart);
  const stats = calcDayStats(week.days[dayIdx]);
  const theme = DAY_THEMES[dayIdx];
  const pct = Math.round(stats.progress * 100);
  const card = cards[dayIdx];

  card.querySelector(".progress-bar").style.width = `${pct}%`;
  card.querySelector(".progress-value").textContent = totalLabel(stats);
  const statItems = card.querySelectorAll(".stat-item strong");
  statItems[0].textContent = stats.completed;
  statItems[1].textContent = stats.notDone;
}

const matrixGrid = document.getElementById("matrixGrid");

function renderMatrix() {
  matrixGrid.innerHTML = "";
  for (const q of QUADRANTS) {
    const block = document.createElement("div");
    block.className = `quadrant ${q.className}`;
    block.innerHTML = `<h2>${q.title}</h2>`;
    const tasks = state.matrix[q.id] || [];
    for (let i = 0; i < MATRIX_TASKS; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "matrix-task";
      input.value = tasks[i] || "";
      input.dataset.quadrant = q.id;
      input.dataset.index = String(i);
      input.addEventListener("input", () => {
        if (!state.matrix[q.id]) state.matrix[q.id] = defaultMatrix()[q.id];
        state.matrix[q.id][i] = input.value;
        void saveState();
      });
      block.appendChild(input);
    }
    matrixGrid.appendChild(block);
  }
}

void bootApp();
