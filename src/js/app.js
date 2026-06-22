const DEVICE_SECRET_KEY = "planer-device-secret-v1";
let deviceSecret = null;

async function initDeviceSecret() {
  if (deviceSecret) return deviceSecret;
  if (isDesktopShell()) {
    const hasApi = await waitForPyWebViewApi();
    if (hasApi && window.pywebview?.api?.get_device_secret) {
      const res = await window.pywebview.api.get_device_secret();
      if (res?.ok && res.secret) {
        deviceSecret = res.secret;
        return deviceSecret;
      }
    }
  }
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!secret) {
    secret = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
  }
  deviceSecret = secret;
  return deviceSecret;
}

async function saveRememberedPassword(password) {
  await initDeviceSecret();
  const wrapped = await encryptText(password, deviceSecret);
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(wrapped));
}

async function tryRememberedPassword() {
  const raw = localStorage.getItem(REMEMBER_KEY);
  if (!raw) return false;
  try {
    await initDeviceSecret();
    sessionPassword = await decryptText(JSON.parse(raw), deviceSecret);
    await loadState();
    return true;
  } catch {
    sessionPassword = null;
    localStorage.removeItem(REMEMBER_KEY);
    return false;
  }
}

function showLicenseOverlay() {
  document.getElementById("licenseError").hidden = true;
  showOverlay(document.getElementById("licenseOverlay"));
  document.getElementById("licenseKey").focus();
}

async function ensureLicense() {
  if (!isDesktopShell()) return true;

  document.body.classList.add("boot-pending");

  const hasApi = await waitForPyWebViewApi();
  if (!hasApi) {
    document.body.classList.remove("boot-pending");
    showLicenseOverlay();
    const err = document.getElementById("licenseError");
    err.textContent = "Не удалось подключить проверку лицензии. Перезапустите приложение.";
    err.hidden = false;
    return false;
  }

  const res = await window.pywebview.api.check_license();
  if (!res?.ok) {
    document.body.classList.remove("boot-pending");
    return new Promise((resolve) => {
      showLicenseOverlay();
      const activate = async () => {
        document.getElementById("licenseError").hidden = true;
        const key = document.getElementById("licenseKey").value.trim();
        const activation = await window.pywebview.api.activate_license(key);
        if (activation?.ok) {
          hideOverlay(document.getElementById("licenseOverlay"));
          resolve(true);
          return;
        }
        const err = document.getElementById("licenseError");
        err.textContent = activation?.error || "Не удалось активировать ключ.";
        err.hidden = false;
      };
      document.getElementById("licenseActivate").onclick = () => void activate();
      document.getElementById("licenseKey").onkeydown = (e) => {
        if (e.key === "Enter") void activate();
      };
    });
  }

  document.body.classList.remove("boot-pending");
  return true;
}

function showPasswordOverlay(mode) {
  const passwordError = document.getElementById("passwordError");
  const passwordInput = document.getElementById("passwordInput");
  const passwordConfirm = document.getElementById("passwordConfirm");
  passwordError.hidden = true;
  passwordInput.value = "";
  passwordConfirm.value = "";
  const isSetup = mode === "setup";
  document.getElementById("passwordTitle").textContent = isSetup ? "Задайте пароль" : "Введите пароль";
  document.getElementById("passwordHint").textContent = isSetup
    ? "Пароль шифрует задачи и заметки на этом компьютере."
    : "Для доступа к зашифрованным данным нужен пароль.";
  passwordConfirm.hidden = !isSetup;
  document.getElementById("rememberWrap").hidden = false;
  document.getElementById("rememberPassword").checked = Boolean(localStorage.getItem(REMEMBER_KEY));
  showOverlay(document.getElementById("passwordOverlay"));
  passwordInput.focus();
  return new Promise((resolve) => {
    document.getElementById("passwordSubmit").onclick = async () => {
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
        PlanerStorage.setStorageUnlockVerified(!hasCryptoSetup());
        if (document.getElementById("rememberPassword").checked) {
          await saveRememberedPassword(pass);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        hideOverlay(document.getElementById("passwordOverlay"));
        resolve(pass);
        return;
      }
      sessionPassword = pass;
      try {
        await loadState();
        if (document.getElementById("rememberPassword").checked) {
          await saveRememberedPassword(pass);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        hideOverlay(document.getElementById("passwordOverlay"));
        resolve(pass);
      } catch (err) {
        sessionPassword = null;
        if (err?.message === PlanerStorage.LOAD_ERRORS.CORRUPT_STORAGE) {
          passwordError.textContent = "Данные повреждены. Сохранение отключено, чтобы не перезаписать файл.";
        } else {
          passwordError.textContent = "Неверный пароль. Сохранённые данные не изменены.";
        }
        passwordError.hidden = false;
      }
    };
  });
}

async function ensurePassword() {
  const rememberWorked = await tryRememberedPassword();
  const mode = PlanerStorage.resolvePasswordMode(localStorage, rememberWorked);
  if (mode === "done") return;
  if (mode === "setup") {
    await showPasswordOverlay("setup");
    return;
  }
  await showPasswordOverlay("unlock");
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    const inField = tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;

    if (e.ctrlKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void saveBackup();
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      document.getElementById("searchBtn")?.click();
      return;
    }
    if (inField && !e.altKey) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrevWeek();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNextWeek();
    } else if (e.key.toLowerCase() === "t" || e.key === "Home") {
      e.preventDefault();
      goToTodayWeek();
    } else if (e.key === "Escape") {
      const overlays = [...document.querySelectorAll(".overlay:not([hidden])")];
      const top = overlays[overlays.length - 1];
      if (top?.dataset.escape === "block") return;
      if (overlays.length) {
        e.preventDefault();
        hideOverlay(top);
      }
    }
  });
}

function setupAppClock() {
  const el = document.getElementById("appClock");
  if (!el) return;
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    el.dateTime = now.toISOString();
  };
  tick();
  window.setInterval(tick, 1000);
}

function setupUndoShortcut() {
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || e.shiftKey) return;
    if (undoLastChange()) e.preventDefault();
  });
}

function setupFlushOnExit() {
  window.addEventListener("beforeunload", () => {
    void flushPendingSave();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushPendingSave();
  });
}

async function bootApp() {
  if (!(await ensureLicense())) return;
  await initDeviceSecret();
  await ensurePassword();
  try {
    state = await loadState();
  } catch (err) {
    if (err?.message === PlanerStorage.LOAD_ERRORS.CORRUPT_STORAGE) {
      PlanerStorage.blockStorageSave();
      alert(
        "Не удалось прочитать сохранённые данные. Файл повреждён или пароль не подходит.\n"
        + "Сохранение отключено, чтобы не перезаписать данные.",
      );
      return;
    }
    throw err;
  }
  if (!state.appearance) state.appearance = defaultAppearance();
  applyAppearance();
  setupWeeklyEvents();
  setupWeeklyToolbar();
  setupTabs();
  renderWeekly(true);
  scheduleFitWeeklyWindow(false, true);
  initSettings();
  setupKeyboardShortcuts();
  setupWeeklyWindowListeners();
  setupAppClock();
  setupUndoShortcut();
  setupSearch();
  setupMatrixEvents();
  setupStatsEvents();
  initFeatures();
  initDonate();
  setupFlushOnExit();
}

function startApp() {
  if (window.__planerBooted) return;
  window.__planerBooted = true;
  window.__planerMaximized = false;
  initCodeProtection();
  void bootApp();
}

startApp();
