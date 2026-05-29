const APP_VERSION = "1.1.0";
const STORAGE_KEY = "planer-data-v2";
const CRYPTO_META_KEY = "planer-crypto-v1";
const REMEMBER_KEY = "planer-remember-v1";
const DEVICE_KEY = "planer-device-key-v1";
const TASKS_PER_DAY = 15;
const NOTES_MAX = 15;
const INITIAL_TASK_ROWS = 10;
const INITIAL_NOTE_ROWS = 5;
const MATRIX_TASKS = 15;
const INITIAL_MATRIX_ROWS = 6;

const DEFAULT_DAY_THEMES = [
  { name: "Пн", bg: "#FFD699", accent: "#F7931E", light: "#FFF0CC" },
  { name: "Вт", bg: "#FFB4A8", accent: "#FF5722", light: "#FFDED8" },
  { name: "Ср", bg: "#FFA8B8", accent: "#E91E63", light: "#FFD6E0" },
  { name: "Чт", bg: "#CEA8E0", accent: "#9C27B0", light: "#EAD4F2" },
  { name: "Пт", bg: "#7DD3E3", accent: "#0097A7", light: "#C2EEF5" },
  { name: "Сб", bg: "#8FE8A8", accent: "#43A047", light: "#D4F5DC" },
  { name: "Вс", bg: "#FFE97A", accent: "#FBC02D", light: "#FFF6C2" },
];

const COLOR_PRESETS = {
  default: DEFAULT_DAY_THEMES.map(({ bg, accent, light }) => ({ bg, accent, light })),
  pastel: [
    { bg: "#FFE8CC", accent: "#D4A056", light: "#FFF6E8" },
    { bg: "#FFD9D4", accent: "#C96A5A", light: "#FFEEEB" },
    { bg: "#FFD6E3", accent: "#C45A82", light: "#FFF0F5" },
    { bg: "#E8D4F5", accent: "#8E5CAD", light: "#F5ECFA" },
    { bg: "#C8EEF5", accent: "#4A9FB0", light: "#E8F8FB" },
    { bg: "#D4F5DC", accent: "#5AAD6A", light: "#EDFAF0" },
    { bg: "#FFF6C2", accent: "#C9A820", light: "#FFFAE8" },
  ],
  vivid: DEFAULT_DAY_THEMES.map(({ bg, accent, light }) => ({ bg, accent, light })),
  ocean: [
    { bg: "#A8D8EA", accent: "#0277BD", light: "#DDF2FA" },
    { bg: "#9AD0E8", accent: "#0288D1", light: "#D4EEF8" },
    { bg: "#8CC8E6", accent: "#039BE5", light: "#CBEBF7" },
    { bg: "#7EC0E4", accent: "#03A9F4", light: "#C2E8F6" },
    { bg: "#70B8E2", accent: "#29B6F6", light: "#B9E5F5" },
    { bg: "#62B0E0", accent: "#4FC3F7", light: "#B0E2F4" },
    { bg: "#54A8DE", accent: "#81D4FA", light: "#A7DDF3" },
  ],
  mono: [
    { bg: "#E8E8E8", accent: "#616161", light: "#F5F5F5" },
    { bg: "#E0E0E0", accent: "#757575", light: "#F0F0F0" },
    { bg: "#D8D8D8", accent: "#616161", light: "#ECECEC" },
    { bg: "#D0D0D0", accent: "#757575", light: "#E8E8E8" },
    { bg: "#C8C8C8", accent: "#616161", light: "#E4E4E4" },
    { bg: "#C0C0C0", accent: "#757575", light: "#E0E0E0" },
    { bg: "#B8B8B8", accent: "#616161", light: "#DCDCDC" },
  ],
};

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

const WEEKLY_CLIENT_WIDTH = 1280;
const MIN_WEEKLY_HEIGHT = 420;
const MIN_MATRIX_HEIGHT = 420;
const MIN_STATS_HEIGHT = 480;
/** Bottom gap under content (~0.6 cm at 96 dpi). */
const VIEW_BOTTOM_GAP_PX = 23;
/** Fixed layout metrics (px) — same window size on every PC. */
const WEEKLY_LAYOUT = {
  header: 76,
  mainPadY: 8,
  toolbar: 42,
  layoutGap: 16,
  cardHeader: 46,
  progress: 50,
  tasksHead: 26,
  dayRow: 26,
  stats: 30,
  notesTop: 16,
  notesHead: 26,
  cardPadBottom: 14,
  bottomGap: 23,
};

const MATRIX_LAYOUT = {
  header: 76,
  mainPadY: 8,
  gridGap: 6,
  quadrantHead: 46,
  matrixRow: 28,
  quadrantStats: 30,
  quadrantPadY: 11,
  quadrantFixed: null,
  bottomGap: 23,
};

const STATS_LAYOUT = {
  header: 76,
  mainPadY: 8,
  toolbar: 36,
  layoutGap: 8,
  summary: 64,
  chart: 168,
  chartGap: 12,
  bottomGap: 23,
};

function readBottomGapPx() {
  const gap = document.querySelector(".app-bottom-gap");
  if (!gap) return VIEW_BOTTOM_GAP_PX;
  const h = gap.getBoundingClientRect().height;
  return h > 0 ? Math.ceil(h) : VIEW_BOTTOM_GAP_PX;
}

function measureLayoutClientHeight(layoutSelector) {
  const header = document.querySelector(".app-header");
  const main = document.querySelector("main");
  const layout = document.querySelector(layoutSelector);
  if (!header || !main || !layout) return 0;

  const padTop = parseFloat(getComputedStyle(main).paddingTop) || 0;
  return Math.ceil(header.offsetHeight + padTop + layout.offsetHeight + readBottomGapPx());
}

function measureAppClientHeight(layoutSelector, gridId, fallback, minHeight) {
  const grid = document.getElementById(gridId);
  if (!grid?.children.length) return fallback();

  const measured = measureLayoutClientHeight(layoutSelector);
  if (measured > 0) return Math.max(minHeight, measured);
  return fallback();
}

function measureWeeklyClientHeight() {
  const { taskRows, noteRows } = getWeeklyRowCounts();
  return measureAppClientHeight(
    ".week-layout",
    "daysGrid",
    () => fixedWeeklyClientHeight(taskRows, noteRows),
    MIN_WEEKLY_HEIGHT,
  );
}

function measureMatrixClientHeight() {
  return measureAppClientHeight(
    ".matrix-layout",
    "matrixGrid",
    () => fixedMatrixClientHeight(getMatrixRowCounts()),
    MIN_MATRIX_HEIGHT,
  );
}

function fixedStatsClientHeight() {
  const L = STATS_LAYOUT;
  const charts = 2 * L.chart + L.chartGap;
  const layout = L.toolbar + L.layoutGap + L.summary + L.layoutGap + charts;
  return Math.max(MIN_STATS_HEIGHT, Math.ceil(L.header + L.mainPadY + layout + VIEW_BOTTOM_GAP_PX));
}

function measureStatsClientHeight() {
  return measureAppClientHeight(
    ".stats-layout",
    "statsCharts",
    fixedStatsClientHeight,
    MIN_STATS_HEIGHT,
  );
}

function getWeeklyRowCounts() {
  const week = getWeek(state.weekStart);
  let maxTasks = INITIAL_TASK_ROWS;
  let maxNotes = INITIAL_NOTE_ROWS;
  for (const day of week.days) {
    maxTasks = Math.max(maxTasks, day.taskRows);
    maxNotes = Math.max(maxNotes, day.noteRows);
  }
  return { taskRows: maxTasks, noteRows: maxNotes };
}

function defaultWeeklyClientHeight() {
  return fixedWeeklyClientHeight(INITIAL_TASK_ROWS, INITIAL_NOTE_ROWS);
}

function getMatrixRowCounts() {
  ensureMatrixState();
  let maxRows = INITIAL_MATRIX_ROWS;
  for (const q of QUADRANTS) {
    maxRows = Math.max(maxRows, getMatrixRowCount(q.id));
  }
  return maxRows;
}

function fixedMatrixClientHeight(maxRows) {
  const L = MATRIX_LAYOUT;
  const quadrant = L.quadrantFixed != null
    ? L.quadrantFixed + maxRows * L.matrixRow
    : L.quadrantHead + maxRows * L.matrixRow + L.quadrantStats + L.quadrantPadY;
  const grid = quadrant + L.gridGap + quadrant;
  return Math.max(MIN_MATRIX_HEIGHT, Math.ceil(L.header + L.mainPadY + grid + VIEW_BOTTOM_GAP_PX));
}

function defaultMatrixClientHeight() {
  return fixedMatrixClientHeight(INITIAL_MATRIX_ROWS);
}

let state = defaultState();
let sessionPassword = null;
let storageUnlockVerified = false;
let saveTimer = null;
let fitTimer = null;
let saveStatusTimer = null;
let weeklyEventsReady = false;
let matrixEventsReady = false;
let matrixReady = false;
let pendingTransfer = null;
let pendingTransferMeta = null;

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const full = value.length === 3
    ? value.split("").map((c) => c + c).join("")
    : value.padStart(6, "0").slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => clampByte(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function adjustColor(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  if (factor >= 1) {
    return rgbToHex(
      r + (255 - r) * (factor - 1),
      g + (255 - g) * (factor - 1),
      b + (255 - b) * (factor - 1),
    );
  }
  return rgbToHex(r * factor, g * factor, b * factor);
}

function contrastText(bg) {
  const { r, g, b } = hexToRgb(bg);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#434343" : "#FFFFFF";
}

function themeFromBg(bg) {
  const normalized = bg.toUpperCase();
  return {
    bg: normalized,
    accent: adjustColor(normalized, 0.72),
    light: adjustColor(normalized, 1.16),
    text: contrastText(normalized),
  };
}

function getDayThemes() {
  const colors = state.appearance?.dayColors || COLOR_PRESETS.default;
  return DEFAULT_DAY_THEMES.map((base, i) => {
    const color = colors[i] || base;
    const bg = (color.bg || base.bg).toUpperCase();
    const derived = themeFromBg(bg);
    return {
      name: base.name,
      bg,
      accent: color.accent || derived.accent,
      light: color.light || derived.light,
      text: color.text || contrastText(bg),
    };
  });
}

function effectiveFontColor() {
  if (state.appearance?.fontColor) return state.appearance.fontColor;
  return state.appearance?.theme === "dark" ? "#E8E4DF" : "#434343";
}

function applyAppearance() {
  const appearance = state.appearance || defaultAppearance();
  const rootStyle = document.documentElement.style;
  document.documentElement.dataset.theme = appearance.theme === "dark" ? "dark" : "light";
  const scale = Number(appearance.fontScale) || 100;
  document.documentElement.style.fontSize = `${16 * scale / 100}px`;
  if (appearance.fontColor) {
    rootStyle.setProperty("--text", appearance.fontColor);
    rootStyle.setProperty(
      "--muted",
      appearance.theme === "dark"
        ? adjustColor(appearance.fontColor, 1.4)
        : adjustColor(appearance.fontColor, 0.55),
    );
  } else {
    rootStyle.removeProperty("--text");
    rootStyle.removeProperty("--muted");
  }
}

function setSaveStatus(mode) {
  const el = document.getElementById("saveStatus");
  if (!el) return;
  clearTimeout(saveStatusTimer);
  if (mode === "saving") {
    el.textContent = "Сохранение…";
    el.dataset.state = "saving";
    return;
  }
  if (mode === "error") {
    el.textContent = "Ошибка сохранения";
    el.dataset.state = "error";
    saveStatusTimer = setTimeout(() => {
      el.textContent = "";
      el.dataset.state = "";
    }, 3000);
    return;
  }
  el.textContent = "Сохранено";
  el.dataset.state = "saved";
  saveStatusTimer = setTimeout(() => {
    el.textContent = "";
    el.dataset.state = "";
  }, 2000);
}

function scheduleSave() {
  setSaveStatus("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveState();
  }, 400);
}

function scheduleFitWeeklyWindow(expandOnly = false, initial = false) {
  if (shouldPauseWeeklyAutoResize()) return;
  clearTimeout(fitTimer);
  const delay = initial ? 0 : 0;
  fitTimer = setTimeout(() => fitWeeklyWindow(expandOnly, initial), delay);
}

function defaultDay() {
  return {
    taskRows: INITIAL_TASK_ROWS,
    noteRows: INITIAL_NOTE_ROWS,
    tasks: Array.from({ length: TASKS_PER_DAY }, () => ({ text: "", done: false })),
    notes: Array.from({ length: NOTES_MAX }, () => ""),
  };
}

function defaultWeek(weekStart) {
  return { weekStart, days: Array.from({ length: 7 }, () => defaultDay()) };
}

function defaultMatrixRowCounts() {
  const counts = {};
  for (const q of QUADRANTS) counts[q.id] = INITIAL_MATRIX_ROWS;
  return counts;
}

function defaultMatrix() {
  const matrix = {};
  for (const q of QUADRANTS) matrix[q.id] = Array.from({ length: MATRIX_TASKS }, () => defaultMatrixTask());
  return matrix;
}

function defaultMatrixTask() {
  return { text: "", done: false };
}

function normalizeMatrixTask(task) {
  if (task && typeof task === "object" && "text" in task) {
    return { text: String(task.text || ""), done: Boolean(task.done) };
  }
  return { text: String(task || ""), done: false };
}

function getMatrixTaskText(task) {
  return normalizeMatrixTask(task).text;
}

function defaultMatrixTransferred() {
  const transferred = {};
  for (const q of QUADRANTS) {
    transferred[q.id] = Array.from({ length: MATRIX_TASKS }, () => false);
  }
  return transferred;
}

function defaultMatrixLinks() {
  const links = {};
  for (const q of QUADRANTS) {
    links[q.id] = Array.from({ length: MATRIX_TASKS }, () => null);
  }
  return links;
}

function defaultAppearance() {
  return {
    theme: "light",
    preset: "default",
    fontColor: null,
    fontScale: 100,
    hideCompleted: false,
    autoBackupEnabled: true,
    autoBackupDays: 1,
    minimizeToTray: false,
    matrixHideTransferred: false,
    dayColors: COLOR_PRESETS.default.map((c) => ({ ...c, text: contrastText(c.bg) })),
  };
}

function defaultRecurringTasks() {
  return [];
}

function defaultState() {
  return {
    weekStart: toDateString(mondayOf(new Date())),
    weeks: {},
    matrix: defaultMatrix(),
    matrixRowCounts: defaultMatrixRowCounts(),
    matrixTransferred: defaultMatrixTransferred(),
    matrixLinks: defaultMatrixLinks(),
    recurringTasks: defaultRecurringTasks(),
    appearance: defaultAppearance(),
  };
}

function b64(bytes) {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
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
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

async function encryptText(text, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(text),
  );
  return { v: 1, encrypted: true, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(cipher)) };
}

async function decryptText(payload, password) {
  const key = await deriveKey(password, b64dec(payload.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64dec(payload.iv) }, key, b64dec(payload.data),
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
    matrixRowCounts: {
      ...defaultMatrixRowCounts(),
      ...parsed.matrixRowCounts,
    },
    matrixTransferred: {
      ...defaultMatrixTransferred(),
      ...parsed.matrixTransferred,
    },
    matrixLinks: {
      ...defaultMatrixLinks(),
      ...parsed.matrixLinks,
    },
    recurringTasks: Array.isArray(parsed.recurringTasks) ? parsed.recurringTasks : defaultRecurringTasks(),
    appearance: {
      ...defaultAppearance(),
      ...parsed.appearance,
      fontColor: parsed.appearance?.fontColor || null,
      dayColors: parsed.appearance?.dayColors?.length === 7
        ? parsed.appearance.dayColors.map((c, i) => ({
            ...COLOR_PRESETS.default[i],
            ...c,
            text: c.text || contrastText(c.bg || COLOR_PRESETS.default[i].bg),
          }))
        : defaultAppearance().dayColors,
    },
  };
}

async function loadState() {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) raw = localStorage.getItem("planer-data-v1");
  if (!raw) {
    storageUnlockVerified = !hasCryptoSetup();
    return defaultState();
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storageUnlockVerified = !hasCryptoSetup();
    return defaultState();
  }

  if (parsed?.encrypted) {
    if (!sessionPassword) {
      storageUnlockVerified = false;
      throw new Error("NO_PASSWORD");
    }
    try {
      const text = await decryptText(parsed, sessionPassword);
      storageUnlockVerified = true;
      return parsePlainState(text);
    } catch (err) {
      storageUnlockVerified = false;
      if (isLoadStateError(err?.message)) throw err;
      throw new Error("WRONG_PASSWORD");
    }
  }

  storageUnlockVerified = true;
  return parsePlainState(raw);
}

function isLoadStateError(message) {
  return message === "NO_PASSWORD" || message === "WRONG_PASSWORD";
}

async function saveState() {
  if (hasCryptoSetup() && !storageUnlockVerified) {
    setSaveStatus("error");
    return;
  }
  try {
    const plain = JSON.stringify(state);
    if (sessionPassword) {
      const encrypted = await encryptText(plain, sessionPassword);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
      localStorage.setItem(CRYPTO_META_KEY, "1");
    } else {
      localStorage.setItem(STORAGE_KEY, plain);
    }
    setSaveStatus("saved");
  } catch {
    setSaveStatus("error");
  }
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

function isToday(dateStr) {
  return dateStr === toDateString(new Date());
}

function normalizeDay(day) {
  const normalized = { ...defaultDay(), ...day };
  while (normalized.tasks.length < TASKS_PER_DAY) {
    normalized.tasks.push({ text: "", done: false });
  }
  while (normalized.notes.length < NOTES_MAX) normalized.notes.push("");

  if (!day.taskRows) {
    let lastUsed = -1;
    normalized.tasks.forEach((task, i) => {
      if (task.text.trim() || task.done) lastUsed = i;
    });
    normalized.taskRows = Math.max(INITIAL_TASK_ROWS, lastUsed + 1);
  }
  if (!day.noteRows) {
    let lastUsed = -1;
    normalized.notes.forEach((note, i) => {
      if (note.trim()) lastUsed = i;
    });
    normalized.noteRows = Math.max(INITIAL_NOTE_ROWS, lastUsed + 1);
  }

  normalized.taskRows = Math.min(TASKS_PER_DAY, Math.max(INITIAL_TASK_ROWS, normalized.taskRows));
  normalized.noteRows = Math.min(NOTES_MAX, Math.max(INITIAL_NOTE_ROWS, normalized.noteRows));
  return normalized;
}

function getWeek(weekStart) {
  if (!state.weeks[weekStart]) state.weeks[weekStart] = defaultWeek(weekStart);
  state.weeks[weekStart].days = state.weeks[weekStart].days.map((day) => normalizeDay(day));
  return state.weeks[weekStart];
}

function ensureMatrixState() {
  if (!state.matrixRowCounts) state.matrixRowCounts = defaultMatrixRowCounts();
  if (!state.matrixTransferred) state.matrixTransferred = defaultMatrixTransferred();
  if (!state.matrixLinks) state.matrixLinks = defaultMatrixLinks();
  for (const q of QUADRANTS) {
    if (!state.matrix[q.id]) state.matrix[q.id] = defaultMatrix()[q.id];
    if (!state.matrixTransferred[q.id]) {
      state.matrixTransferred[q.id] = Array.from({ length: MATRIX_TASKS }, () => false);
    }
    if (!state.matrixLinks[q.id]) {
      state.matrixLinks[q.id] = Array.from({ length: MATRIX_TASKS }, () => null);
    }
    while (state.matrix[q.id].length < MATRIX_TASKS) state.matrix[q.id].push(defaultMatrixTask());
    while (state.matrixTransferred[q.id].length < MATRIX_TASKS) {
      state.matrixTransferred[q.id].push(false);
    }
    while (state.matrixLinks[q.id].length < MATRIX_TASKS) {
      state.matrixLinks[q.id].push(null);
    }
    state.matrix[q.id] = state.matrix[q.id].map(normalizeMatrixTask);
    let lastUsed = -1;
    state.matrix[q.id].forEach((task, i) => { if (getMatrixTaskText(task).trim()) lastUsed = i; });
    const stored = state.matrixRowCounts[q.id];
    state.matrixRowCounts[q.id] = Math.min(
      MATRIX_TASKS,
      Math.max(INITIAL_MATRIX_ROWS, stored || INITIAL_MATRIX_ROWS, lastUsed + 1),
    );
  }
}

function getMatrixRowCount(quadrantId) {
  ensureMatrixState();
  return state.matrixRowCounts[quadrantId] || INITIAL_MATRIX_ROWS;
}

function calcMatrixQuadrantStats(quadrantId) {
  ensureMatrixState();
  const rowCount = getMatrixRowCount(quadrantId);
  const tasks = state.matrix[quadrantId] || [];
  let completed = 0;
  let total = 0;
  for (let i = 0; i < rowCount; i += 1) {
    const task = normalizeMatrixTask(tasks[i]);
    if (!task.text.trim()) continue;
    total += 1;
    if (task.done) completed += 1;
  }
  return {
    total,
    completed,
    notDone: Math.max(0, total - completed),
    progress: total > 0 ? completed / total : 0,
  };
}

function calcDayStats(day) {
  const filled = day.tasks.filter((t) => t.text.trim());
  const total = filled.length;
  const completed = filled.filter((t) => t.done).length;
  return { total, completed, notDone: Math.max(0, total - completed), progress: total > 0 ? completed / total : 0 };
}

function firstEmptyTaskSlot(day) {
  for (let i = 0; i < day.taskRows; i++) {
    if (!day.tasks[i].text.trim() && !day.tasks[i].done) return i;
  }
  if (day.taskRows < TASKS_PER_DAY) {
    day.taskRows += 1;
    return day.taskRows - 1;
  }
  return -1;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showOverlay(el) { el.hidden = false; }
function hideOverlay(el) { el.hidden = true; }

let cachedWeeklySize = null;
let weeklyInitialFitDone = false;
let suppressWindowRefit = false;

function fixedWeeklyClientHeight(taskRows, noteRows) {
  const L = WEEKLY_LAYOUT;
  const rowH = L.dayRow;
  const totalRows = taskRows + noteRows;
  const card = L.cardFixed != null
    ? L.cardFixed + totalRows * rowH
    : L.cardHeader + L.progress + L.tasksHead + taskRows * rowH
      + L.stats + L.notesTop + L.notesHead + noteRows * rowH + L.cardPadBottom;
  const week = L.toolbar + L.layoutGap + card;
  return Math.max(MIN_WEEKLY_HEIGHT, Math.ceil(L.header + L.mainPadY + week + VIEW_BOTTOM_GAP_PX));
}

function calibrateWeeklyLayoutMetrics() {
  if (window.__weeklyLayoutCalibrated) return;
  const grid = document.getElementById("daysGrid");
  if (!grid?.children.length) return;

  const header = document.querySelector(".app-header");
  const toolbar = document.querySelector(".week-toolbar");
  const main = document.querySelector("main");
  const weekLayout = document.querySelector(".week-layout");
  const card = grid.children[0];
  const day = getWeek(state.weekStart).days[0];

  if (header) WEEKLY_LAYOUT.header = Math.ceil(header.getBoundingClientRect().height);
  if (toolbar) WEEKLY_LAYOUT.toolbar = Math.ceil(toolbar.getBoundingClientRect().height);
  if (main) {
    const st = getComputedStyle(main);
    WEEKLY_LAYOUT.mainPadY = parseFloat(st.paddingTop) || 0;
  }
  if (weekLayout) {
    WEEKLY_LAYOUT.layoutGap = parseFloat(getComputedStyle(weekLayout).rowGap
      || getComputedStyle(weekLayout).gap) || 0;
  }

  const taskRow = card.querySelector(".task-row");
  const noteRow = card.querySelector(".note-row");
  const taskH = taskRow ? Math.ceil(taskRow.getBoundingClientRect().height) : 0;
  const noteH = noteRow ? Math.ceil(noteRow.getBoundingClientRect().height) : 0;
  if (taskH || noteH) WEEKLY_LAYOUT.dayRow = Math.max(taskH, noteH, WEEKLY_LAYOUT.dayRow);

  const cardHeight = card.getBoundingClientRect().height;
  WEEKLY_LAYOUT.cardFixed = Math.ceil(
    cardHeight - (day.taskRows + day.noteRows) * WEEKLY_LAYOUT.dayRow,
  );
  window.__weeklyLayoutCalibrated = true;
}

function calibrateMatrixLayoutMetrics() {
  if (window.__matrixLayoutCalibrated) return;
  const grid = document.getElementById("matrixGrid");
  if (!grid?.children.length) return;

  const header = document.querySelector(".app-header");
  const main = document.querySelector("main");
  const matrixGrid = document.getElementById("matrixGrid");
  const quadrant = grid.children[0];
  const maxRows = getMatrixRowCounts();

  if (header) MATRIX_LAYOUT.header = Math.ceil(header.getBoundingClientRect().height);
  if (main) {
    const st = getComputedStyle(main);
    MATRIX_LAYOUT.mainPadY = parseFloat(st.paddingTop) || 0;
  }
  if (matrixGrid) {
    MATRIX_LAYOUT.gridGap = parseFloat(getComputedStyle(matrixGrid).rowGap
      || getComputedStyle(matrixGrid).gap) || 0;
  }

  const head = quadrant.querySelector(".quadrant-head");
  const matrixRow = quadrant.querySelector(".matrix-row");
  const statsBlock = quadrant.querySelector(".matrix-stats");
  if (head) MATRIX_LAYOUT.quadrantHead = Math.ceil(head.getBoundingClientRect().height);
  if (matrixRow) MATRIX_LAYOUT.matrixRow = Math.ceil(matrixRow.getBoundingClientRect().height);
  if (statsBlock) {
    MATRIX_LAYOUT.quadrantStats = Math.ceil(statsBlock.getBoundingClientRect().height);
  }

  const quadrantStyle = getComputedStyle(quadrant);
  MATRIX_LAYOUT.quadrantPadY = (parseFloat(quadrantStyle.paddingTop) || 0)
    + (parseFloat(quadrantStyle.paddingBottom) || 0);

  const quadrantHeight = quadrant.getBoundingClientRect().height;
  MATRIX_LAYOUT.quadrantFixed = Math.ceil(
    quadrantHeight - maxRows * MATRIX_LAYOUT.matrixRow - (MATRIX_LAYOUT.quadrantStats || 0),
  );
  window.__matrixLayoutCalibrated = true;
}

function calibrateStatsLayoutMetrics() {
  if (window.__statsLayoutCalibrated) return;
  const charts = document.getElementById("statsCharts");
  if (!charts?.children.length) return;

  const header = document.querySelector(".app-header");
  const main = document.querySelector("main");
  const statsLayout = document.querySelector(".stats-layout");
  const toolbar = document.querySelector(".stats-toolbar");
  const summary = document.getElementById("statsSummary");
  const chart = charts.querySelector(".stats-chart");

  if (header) STATS_LAYOUT.header = Math.ceil(header.getBoundingClientRect().height);
  if (main) {
    STATS_LAYOUT.mainPadY = parseFloat(getComputedStyle(main).paddingTop) || 0;
  }
  if (statsLayout) {
    STATS_LAYOUT.layoutGap = parseFloat(getComputedStyle(statsLayout).rowGap
      || getComputedStyle(statsLayout).gap) || 0;
  }
  if (toolbar) STATS_LAYOUT.toolbar = Math.ceil(toolbar.getBoundingClientRect().height);
  if (summary) STATS_LAYOUT.summary = Math.ceil(summary.getBoundingClientRect().height);
  if (chart) STATS_LAYOUT.chart = Math.ceil(chart.getBoundingClientRect().height);
  if (charts.children.length > 1) {
    STATS_LAYOUT.chartGap = parseFloat(getComputedStyle(charts).rowGap
      || getComputedStyle(charts).gap) || 0;
  }
  window.__statsLayoutCalibrated = true;
}

function getWeeklyWindowWidth() {
  return WEEKLY_CLIENT_WIDTH;
}

function isDesktopShell() {
  const params = new URLSearchParams(location.search);
  return params.get("desktop") === "1"
    || window.__PLANER_DESKTOP__
    || location.protocol === "file:"
    || !!window.pywebview;
}

function waitForPyWebViewApi(timeoutMs = 15000) {
  if (window.pywebview?.api?.check_license) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(!!window.pywebview?.api?.check_license);
    };
    window.addEventListener("pywebviewready", finish, { once: true });
    const poll = setInterval(() => {
      if (window.pywebview?.api?.check_license) {
        clearInterval(poll);
        finish();
      }
    }, 100);
    setTimeout(() => {
      clearInterval(poll);
      finish();
    }, timeoutMs);
  });
}

function isWindowMaximizedHeuristic() {
  const slack = 16;
  const w = window.outerWidth || 0;
  const h = window.outerHeight || 0;
  const maxW = window.screen.availWidth || w;
  const maxH = window.screen.availHeight || h;
  return w >= maxW - slack && h >= maxH - slack;
}

function shouldPauseWeeklyAutoResize() {
  if (document.visibilityState === "hidden") return true;
  if (window.__planerMaximized === true) return true;
  return isWindowMaximizedHeuristic();
}

function getWindowChromeSize() {
  const outerW = window.outerWidth || 0;
  const outerH = window.outerHeight || 0;
  const innerW = window.innerWidth || 0;
  const innerH = window.innerHeight || 0;
  if (outerW > 0 && outerH > 0 && innerW > 0 && innerH > 0) {
    return {
      width: Math.max(0, outerW - innerW),
      height: Math.max(0, outerH - innerH),
    };
  }
  return { width: 8, height: 39 };
}

function resizeAppWindow(clientWidth, clientHeight) {
  const api = window.pywebview?.api;
  if (!api?.resize_window) return;
  if (shouldPauseWeeklyAutoResize()) return;
  suppressWindowRefit = true;
  void api.resize_window(Math.round(clientWidth), Math.round(clientHeight)).finally(() => {
    setTimeout(() => {
      suppressWindowRefit = false;
    }, 250);
  });
}

function applyWeeklyWindowSize(force = false) {
  calibrateWeeklyLayoutMetrics();
  const width = WEEKLY_CLIENT_WIDTH;
  const height = measureWeeklyClientHeight();
  const sizeKey = `${width}|${height}`;
  if (!force && cachedWeeklySize?.key === sizeKey) return;
  cachedWeeklySize = { width, height, key: sizeKey };
  resizeAppWindow(width, height);
}

function fitWeeklyWindow(_expandOnly = false, initial = false) {
  if (!isDesktopShell()) return;
  if (shouldPauseWeeklyAutoResize()) return;
  if (initial && !weeklyInitialFitDone) {
    weeklyInitialFitDone = true;
    requestAnimationFrame(() => {
      calibrateWeeklyLayoutMetrics();
      if (shouldPauseWeeklyAutoResize()) return;
      const width = WEEKLY_CLIENT_WIDTH;
      const height = measureWeeklyClientHeight();
      const innerH = window.innerHeight || 0;
      if (Math.abs(innerH - height) > 8) applyWeeklyWindowSize(true);
      else cachedWeeklySize = { width, height, key: `${width}|${height}` };
    });
    return;
  }
  applyWeeklyWindowSize();
}

function restoreWeeklyWindow() {
  if (!document.body.classList.contains("view-weekly")) return;
  if (shouldPauseWeeklyAutoResize()) return;
  cachedWeeklySize = null;
  window.__weeklyLayoutCalibrated = false;
  const refit = () => {
    if (shouldPauseWeeklyAutoResize()) return;
    applyWeeklyWindowSize(true);
  };
  requestAnimationFrame(() => requestAnimationFrame(refit));
  setTimeout(refit, 150);
}

function setupWeeklyWindowListeners() {
  if (!isDesktopShell() || window.__planerMaximizeWatcher) return;
  window.__planerMaximizeWatcher = true;

  let wasMaximized = isWindowMaximizedHeuristic();
  window.__planerMaximized = wasMaximized;
  let refitTimer = null;

  window.addEventListener("resize", () => {
    const maximized = isWindowMaximizedHeuristic();
    window.__planerMaximized = maximized;

    if (wasMaximized && !maximized) {
      clearTimeout(refitTimer);
      refitTimer = setTimeout(() => {
        if (document.body.classList.contains("view-weekly")) restoreWeeklyWindow();
        else if (document.body.classList.contains("view-matrix")) restoreMatrixWindow();
        else if (document.body.classList.contains("view-stats")) restoreStatsWindow();
      }, 400);
    }
    wasMaximized = maximized;
  }, { passive: true });
}

function applyMatrixWindowSize(force = false) {
  calibrateMatrixLayoutMetrics();
  const width = WEEKLY_CLIENT_WIDTH;
  const height = measureMatrixClientHeight();
  const sizeKey = `${width}|${height}`;
  if (!force && cachedWeeklySize?.key === sizeKey) return;
  cachedWeeklySize = { width, height, key: sizeKey };
  resizeAppWindow(width, height);
}

function restoreMatrixWindow() {
  if (!document.body.classList.contains("view-matrix")) return;
  if (shouldPauseWeeklyAutoResize()) return;
  cachedWeeklySize = null;
  window.__matrixLayoutCalibrated = false;
  const refit = () => {
    if (shouldPauseWeeklyAutoResize()) return;
    applyMatrixWindowSize(true);
  };
  requestAnimationFrame(() => requestAnimationFrame(refit));
  setTimeout(refit, 150);
}

function fitMatrixWindow() {
  restoreMatrixWindow();
}

function applyStatsWindowSize(force = false) {
  calibrateStatsLayoutMetrics();
  const width = WEEKLY_CLIENT_WIDTH;
  const height = measureStatsClientHeight();
  const sizeKey = `${width}|${height}`;
  if (!force && cachedWeeklySize?.key === sizeKey) return;
  cachedWeeklySize = { width, height, key: sizeKey };
  resizeAppWindow(width, height);
}

function restoreStatsWindow() {
  if (!document.body.classList.contains("view-stats")) return;
  if (shouldPauseWeeklyAutoResize()) return;
  cachedWeeklySize = null;
  window.__statsLayoutCalibrated = false;
  const refit = () => {
    if (shouldPauseWeeklyAutoResize()) return;
    applyStatsWindowSize(true);
  };
  requestAnimationFrame(() => requestAnimationFrame(refit));
  setTimeout(refit, 150);
}

function fitStatsWindow() {
  restoreStatsWindow();
}

function totalLabel(stats) {
  if (stats.total === 0) return "—";
  return `${stats.completed} / ${stats.total} (${Math.round(stats.progress * 100)}%)`;
}

function backupPayload() {
  return { version: 2, exportedAt: new Date().toISOString(), encrypted: Boolean(sessionPassword), state };
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
      if (res?.ok || res?.cancelled) return;
      alert(res?.error || "Не удалось сохранить файл.");
      return;
    }
  } catch (e) {
    alert(String(e));
    return;
  }
  downloadJson(name, output);
}

async function parseBackupContent(rawText) {
  const parsed = JSON.parse(rawText);
  if (parsed?.encrypted && parsed?.data) {
    if (!sessionPassword) throw new Error("NEED_PASSWORD");
    const inner = await decryptText(parsed, sessionPassword);
    return JSON.parse(inner);
  }
  if (parsed?.state) return parsed;
  if (parsed?.weeks || parsed?.weekStart) return { version: 1, state: parsed };
  throw new Error("INVALID_BACKUP");
}

async function importBackup() {
  try {
    let rawText = null;
    if (window.pywebview?.api?.load_backup) {
      const res = await window.pywebview.api.load_backup();
      if (res?.cancelled) return;
      if (!res?.ok) {
        alert(res?.error || "Не удалось открыть файл.");
        return;
      }
      rawText = res.content;
    } else {
      rawText = await new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".planer,.json";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => resolve(null);
          reader.readAsText(file, "utf-8");
        };
        input.click();
      });
      if (!rawText) return;
    }

    const backup = await parseBackupContent(rawText);
    const imported = backup.state ? parsePlainState(JSON.stringify(backup.state)) : parsePlainState(JSON.stringify(backup));
    const report = formatImportReport(backup, imported);
    if (!confirm(`Восстановить данные из файла?\n\n${report}\n\nТекущие несохранённые изменения будут заменены.`)) return;
    state = imported;
    matrixReady = false;
    applyAppearance();
    syncSettingsControls?.();
    renderWeekly();
    renderMatrix?.();
    matrixReady = true;
    scheduleSave();
    scheduleFitWeeklyWindow();
  } catch (err) {
    if (String(err?.message) === "NEED_PASSWORD") {
      alert("Файл зашифрован. Сначала разблокируйте приложение паролем.");
      return;
    }
    alert("Не удалось прочитать файл резервной копии.");
  }
}
