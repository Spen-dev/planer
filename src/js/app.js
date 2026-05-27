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

function showLicenseOverlay() {
  document.getElementById("licenseError").hidden = true;
  showOverlay(document.getElementById("licenseOverlay"));
  document.getElementById("licenseKey").focus();
}

async function ensureLicense() {
  if (!isDesktopShell()) return true;

  // Desktop EXE loads main app only after Python-side license check.
  if (window.__PLANER_DESKTOP__ || new URLSearchParams(location.search).get("desktop") === "1") {
    return true;
  }

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
      } catch {
        sessionPassword = null;
        passwordError.textContent = "Неверный пароль.";
        passwordError.hidden = false;
      }
    };
  });
}

async function ensurePassword() {
  if (hasCryptoSetup() && (await tryRememberedPassword())) return;
  if (!hasCryptoSetup()) {
    await showPasswordOverlay("setup");
    return;
  }
  await showPasswordOverlay("unlock");
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    const inField = tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
    const overlayOpen = document.querySelector(".overlay:not([hidden])");

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
    } else if (e.key === "Escape" && overlayOpen) {
      hideOverlay(overlayOpen);
    }
  });
}

async function bootApp() {
  if (!(await ensureLicense())) return;
  await ensurePassword();
  state = await loadState();
  if (!state.appearance) state.appearance = defaultAppearance();
  applyAppearance();
  initSettings();
  setupWeeklyEvents();
  setupMatrixEvents();
  setupWeeklyToolbar();
  setupSearch();
  setupTabs();
  setupKeyboardShortcuts();
  setupWeeklyWindowListeners();
  renderWeekly();
  scheduleFitWeeklyWindow(false, true);
}

function startApp() {
  if (window.__planerBooted) return;
  window.__planerBooted = true;
  window.__planerMaximized = false;
  void bootApp();
}

async function startDesktopApp() {
  await waitForPyWebViewApi();
  startApp();
}

if (isDesktopShell()) {
  void startDesktopApp();
} else {
  startApp();
}
