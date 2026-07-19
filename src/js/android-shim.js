/* Android WebView bridge — maps PlanerNative to pywebview.api. */
(function initAndroidBridge() {
  if (!window.PlanerNative) return;

  window.__PLANER_ANDROID__ = true;

  function parseJson(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function promisify(methodName, callSync) {
    return (...args) => new Promise((resolve) => {
      const token = `${methodName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      window[`__planer_cb_${token}`] = resolve;
      callSync(token, ...args);
    });
  }

  const native = window.PlanerNative;

  window.pywebview = {
    api: {
      check_license: () => parseJson(native.checkLicense(), { ok: false }),
      activate_license: (key) => parseJson(native.activateLicense(String(key || "")), { ok: false }),
      get_device_secret: () => parseJson(native.getDeviceSecret(), { ok: false }),
      get_app_info: () => parseJson(native.getAppInfo(), { version: "1.1.0" }),
      save_backup: (payload) => promisify("save_backup", (token, data) => {
        native.requestSaveBackup(token, String(data || ""));
      }),
      load_backup: () => promisify("load_backup", (token) => {
        native.requestLoadBackup(token);
      }),
      auto_backup: (payload) => promisify("auto_backup", (token, data) => {
        native.requestAutoBackup(token, String(data || ""));
      }),
      save_text_file: (content, name) => promisify("save_text_file", (token, text, filename) => {
        native.requestSaveTextFile(token, String(text || ""), String(filename || "export.csv"));
      }),
      get_donation_info: () => parseJson(native.getDonationInfo(), { ok: false }),
      open_donation_payment: (amount, method) => parseJson(
        native.openDonationPayment(Number(amount) || 0, String(method || "")),
        { ok: false },
      ),
      copy_donation_details: (amount) => parseJson(
        native.copyDonationDetails(Number(amount) || 0),
        { ok: false },
      ),
      open_eula: () => parseJson(native.openEula(), { ok: false }),
      set_autostart: () => ({ ok: false, error: "Недоступно на Android." }),
      set_minimize_to_tray: () => ({ ok: true }),
    },
  };

  window.__planerResolveCallback = (token, json) => {
    const resolve = window[`__planer_cb_${token}`];
    if (typeof resolve === "function") {
      resolve(parseJson(json, { ok: false }));
      delete window[`__planer_cb_${token}`];
    }
  };

  window.dispatchEvent(new Event("pywebviewready"));
})();
