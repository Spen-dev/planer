function syncSettingsControls() {
  document.getElementById("themeSelect").value = state.appearance.theme || "light";
  document.getElementById("colorPreset").value = state.appearance.preset || "custom";
  document.getElementById("fontColor").value = effectiveFontColor();
  document.getElementById("fontScaleSelect").value = String(state.appearance.fontScale || 100);
  const matrixHide = document.getElementById("matrixHideTransferred");
  if (matrixHide) matrixHide.checked = Boolean(state.appearance.matrixHideTransferred);
  document.getElementById("dayColorPickers").querySelectorAll('input[type="color"]').forEach((input) => {
    const dayIdx = Number(input.dataset.day);
    const theme = getDayThemes()[dayIdx];
    input.value = input.dataset.kind === "text" ? theme.text : theme.bg;
  });
}

async function loadAboutInfo() {
  const versionEl = document.getElementById("aboutVersion");
  const dataEl = document.getElementById("aboutDataDir");
  versionEl.textContent = `v${APP_VERSION}`;
  dataEl.textContent = "%APPDATA%\\Planer";
  try {
    const info = await window.pywebview?.api?.get_app_info?.();
    if (info?.version) versionEl.textContent = `v${info.version}`;
    if (info?.dataDir) dataEl.textContent = info.dataDir;
    const autostart = document.getElementById("autostartCheck");
    if (autostart && info) autostart.checked = Boolean(info.autostart);
  } catch (_) { /* browser dev */ }
}

async function loadSecurityInfo() {
  const keyEl = document.getElementById("securityLicenseKey");
  const errEl = document.getElementById("licenseSecurityError");
  if (keyEl) keyEl.value = "";
  if (errEl) {
    errEl.hidden = true;
    errEl.style.color = "";
  }
}

async function activateSecurityLicense() {
  const errEl = document.getElementById("licenseSecurityError");
  const keyEl = document.getElementById("securityLicenseKey");
  errEl.hidden = true;
  const key = keyEl?.value.trim() || "";
  if (!key) {
    errEl.textContent = "Введите лицензионный ключ.";
    errEl.hidden = false;
    keyEl?.focus();
    return;
  }
  const api = window.pywebview?.api;
  if (!api?.activate_license) {
    errEl.textContent = "Активация доступна только в приложении Planer.exe.";
    errEl.hidden = false;
    return;
  }
  const res = await api.activate_license(key);
  if (!res?.ok) {
    errEl.textContent = res?.error || "Не удалось активировать ключ.";
    errEl.hidden = false;
    return;
  }
  keyEl.value = "";
  errEl.textContent = "Лицензия активирована.";
  errEl.hidden = false;
  errEl.style.color = "var(--text)";
}

function initSettings() {
  const dayColorPickers = document.getElementById("dayColorPickers");
  dayColorPickers.innerHTML = DEFAULT_DAY_THEMES.map(
    (day, i) => `
      <label class="color-row">
        <span>${day.name}</span>
        <div class="color-row-inputs">
          <input type="color" data-day="${i}" data-kind="bg" value="${getDayThemes()[i].bg}" aria-label="Фон ${day.name}" title="Фон" />
          <input type="color" data-day="${i}" data-kind="text" value="${getDayThemes()[i].text}" aria-label="Текст ${day.name}" title="Текст" />
        </div>
      </label>
    `,
  ).join("");

  syncSettingsControls();
  void loadAboutInfo();

  document.getElementById("settingsBtn").addEventListener("click", () => {
    syncSettingsControls();
    void loadAboutInfo();
    showOverlay(document.getElementById("settingsOverlay"));
  });

  document.getElementById("securityBtn")?.addEventListener("click", () => {
    const errEl = document.getElementById("passwordChangeError");
    const licenseErrEl = document.getElementById("licenseSecurityError");
    errEl.hidden = true;
    errEl.style.color = "";
    if (licenseErrEl) {
      licenseErrEl.hidden = true;
      licenseErrEl.style.color = "";
    }
    document.getElementById("oldPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("newPasswordConfirm").value = "";
    void loadSecurityInfo();
    initNoPastePasswordInputs(document.getElementById("securityOverlay"));
    showOverlay(document.getElementById("securityOverlay"));
    document.getElementById("oldPassword").focus();
  });

  document.getElementById("securityCloseBtn")?.addEventListener("click", () => {
    hideOverlay(document.getElementById("securityOverlay"));
  });

  document.getElementById("settingsCloseBtn").addEventListener("click", () => {
    hideOverlay(document.getElementById("settingsOverlay"));
  });

  document.getElementById("themeSelect").addEventListener("change", (e) => {
    state.appearance.theme = e.target.value;
    applyAppearance();
    syncSettingsControls();
    renderMatrix();
    scheduleSave();
  });

  document.getElementById("fontColor").addEventListener("input", (e) => {
    state.appearance.fontColor = e.target.value.toUpperCase();
    applyAppearance();
    scheduleSave();
  });

  document.getElementById("resetFontColorBtn").addEventListener("click", () => {
    state.appearance.fontColor = null;
    applyAppearance();
    syncSettingsControls();
    scheduleSave();
  });

  document.getElementById("fontScaleSelect").addEventListener("change", (e) => {
    state.appearance.fontScale = Number(e.target.value) || 100;
    applyAppearance();
    scheduleSave();
    scheduleFitWeeklyWindow();
  });

  document.getElementById("colorPreset").addEventListener("change", (e) => {
    const preset = e.target.value;
    if (!COLOR_PRESETS[preset]) return;
    state.appearance.preset = preset;
    state.appearance.dayColors = COLOR_PRESETS[preset].map((c) => ({
      ...c,
      text: contrastText(c.bg),
    }));
    syncSettingsControls();
    renderWeekly();
    maybeRefreshStatsTab();
    scheduleSave();
  });

  document.getElementById("resetColorsBtn").addEventListener("click", () => {
    state.appearance.preset = "default";
    state.appearance.dayColors = COLOR_PRESETS.default.map((c) => ({
      ...c,
      text: contrastText(c.bg),
    }));
    document.getElementById("colorPreset").value = "default";
    syncSettingsControls();
    renderWeekly();
    maybeRefreshStatsTab();
    scheduleSave();
  });

  dayColorPickers.addEventListener("input", (e) => {
    const input = e.target;
    if (input.type !== "color") return;
    const dayIdx = Number(input.dataset.day);
    const kind = input.dataset.kind || "bg";
    if (kind === "text") {
      state.appearance.dayColors[dayIdx] = {
        ...state.appearance.dayColors[dayIdx],
        text: input.value.toUpperCase(),
      };
    } else {
      state.appearance.dayColors[dayIdx] = themeFromBg(input.value);
    }
    state.appearance.preset = "custom";
    document.getElementById("colorPreset").value = "custom";
    syncSettingsControls();
    renderWeekly();
    maybeRefreshStatsTab();
    scheduleSave();
  });

  document.getElementById("autostartCheck")?.addEventListener("change", async (e) => {
    const api = window.pywebview?.api;
    if (!api?.set_autostart) return;
    const res = await api.set_autostart(e.target.checked);
    if (!res?.ok) {
      alert(res?.error || "Не удалось изменить автозапуск.");
      e.target.checked = !e.target.checked;
    }
  });

  document.getElementById("activateLicenseBtn")?.addEventListener("click", () => void activateSecurityLicense());
  document.getElementById("securityLicenseKey")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void activateSecurityLicense();
  });

  document.getElementById("openEulaBtn")?.addEventListener("click", async () => {
    const api = window.pywebview?.api;
    if (!api?.open_eula) {
      window.open("../LICENSE", "_blank");
      return;
    }
    const res = await api.open_eula();
    if (!res?.ok) alert(res?.error || "Не удалось открыть EULA.");
  });

  document.getElementById("changePasswordBtn")?.addEventListener("click", () => void changePassword());

  const passwordChangedOverlay = document.getElementById("passwordChangedOverlay");
  const hidePasswordChangedOverlay = () => hideOverlay(passwordChangedOverlay);
  document.getElementById("passwordChangedCloseBtn")?.addEventListener("click", hidePasswordChangedOverlay);
  document.getElementById("passwordChangedOkBtn")?.addEventListener("click", hidePasswordChangedOverlay);
}

async function changePassword() {
  const errEl = document.getElementById("passwordChangeError");
  errEl.hidden = true;
  const oldPass = document.getElementById("oldPassword").value;
  const newPass = document.getElementById("newPassword").value;
  const confirmPass = document.getElementById("newPasswordConfirm").value;

  if (!sessionPassword) {
    errEl.textContent = "Шифрование не активно.";
    errEl.hidden = false;
    return;
  }
  if (oldPass !== sessionPassword) {
    errEl.textContent = "Неверный текущий пароль.";
    errEl.hidden = false;
    return;
  }
  if (newPass.length < 6) {
    errEl.textContent = "Новый пароль должен быть не короче 6 символов.";
    errEl.hidden = false;
    return;
  }
  if (newPass !== confirmPass) {
    errEl.textContent = "Пароли не совпадают.";
    errEl.hidden = false;
    return;
  }

  sessionPassword = newPass;
  await saveState();
  if (document.getElementById("rememberPassword")?.checked || localStorage.getItem(REMEMBER_KEY)) {
    await saveRememberedPassword(newPass);
  }
  document.getElementById("oldPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("newPasswordConfirm").value = "";
  showOverlay(document.getElementById("passwordChangedOverlay"));
}
