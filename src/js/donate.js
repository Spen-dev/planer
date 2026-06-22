let donateInfo = null;
let donateSelectedAmount = 100;

function formatRubles(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)} ₽`;
}

function hideDonateMessage() {
  const err = document.getElementById("donateError");
  const ok = document.getElementById("donateSuccess");
  if (err) err.hidden = true;
  if (ok) ok.hidden = true;
}

function showDonateError(text) {
  const err = document.getElementById("donateError");
  const ok = document.getElementById("donateSuccess");
  if (ok) ok.hidden = true;
  if (!err) return;
  err.textContent = text;
  err.hidden = false;
}

function showDonateSuccess(text) {
  const err = document.getElementById("donateError");
  const ok = document.getElementById("donateSuccess");
  if (err) err.hidden = true;
  if (!ok) return;
  ok.textContent = text;
  ok.hidden = false;
}

function getDonateAmountInput() {
  const custom = document.getElementById("donateCustomAmount");
  const raw = custom?.value?.trim();
  if (raw) return Number(raw);
  return donateSelectedAmount;
}

function syncDonatePresetButtons() {
  document.querySelectorAll(".donate-preset-btn").forEach((btn) => {
    btn.classList.toggle("is-selected", Number(btn.dataset.amount) === donateSelectedAmount);
  });
}

function renderDonatePresets(presets) {
  const wrap = document.getElementById("donatePresets");
  if (!wrap) return;
  const values = Array.isArray(presets) && presets.length ? presets : [100, 300, 500, 1000];
  if (!values.includes(donateSelectedAmount)) {
    donateSelectedAmount = Number(values[0]) || 100;
  }
  wrap.innerHTML = values
    .map(
      (amount) =>
        `<button type="button" class="donate-preset-btn" data-amount="${amount}">${formatRubles(amount)}</button>`,
    )
    .join("");
  wrap.querySelectorAll(".donate-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      donateSelectedAmount = Number(btn.dataset.amount) || 100;
      const custom = document.getElementById("donateCustomAmount");
      if (custom) custom.value = "";
      syncDonatePresetButtons();
      hideDonateMessage();
    });
  });
  syncDonatePresetButtons();
}

function applyDonateInfo(info) {
  donateInfo = info;
  const hint = document.getElementById("donateHint");
  if (hint) hint.textContent = info?.message || "Поддержите развитие Планера.";
  renderDonatePresets(info?.presets);

  const custom = document.getElementById("donateCustomAmount");
  if (custom) {
    custom.min = String(info?.minAmount || 50);
    custom.max = String(info?.maxAmount || 100000);
    custom.placeholder = `от ${custom.min} ₽`;
  }

  const yoomoneyBtn = document.getElementById("donateYoomoneyBtn");
  const sbpBtn = document.getElementById("donateSbpBtn");
  if (yoomoneyBtn) {
    yoomoneyBtn.textContent = info?.yoomoneyLabel || "Оплатить через ЮMoney";
    yoomoneyBtn.disabled = !info?.yoomoneyEnabled;
  }
  if (sbpBtn) {
    sbpBtn.textContent = info?.sbpLabel || "СБП — скопировать номер";
    sbpBtn.disabled = !info?.sbpEnabled;
  }
}

async function loadDonateInfo() {
  const fallback = {
    ok: true,
    message: "Поддержите развитие Планера — любая сумма помогает улучшать приложение.",
    presets: [100, 300, 500, 1000],
    minAmount: 50,
    maxAmount: 100000,
    yoomoneyEnabled: false,
    sbpEnabled: false,
    yoomoneyLabel: "Оплатить через ЮMoney",
    sbpLabel: "СБП — скопировать номер",
  };
  try {
    const info = await window.pywebview?.api?.get_donation_info?.();
    if (info?.ok) return info;
  } catch (_) { /* browser dev */ }
  return fallback;
}

async function openDonationPayment(method) {
  hideDonateMessage();
  const amount = getDonateAmountInput();
  const api = window.pywebview?.api;

  if (method === "yoomoney") {
    if (api?.open_donation_payment) {
      const res = await api.open_donation_payment(amount, "yoomoney");
      if (!res?.ok) {
        showDonateError(res?.error || "Не удалось открыть оплату.");
        return;
      }
      showDonateSuccess(`Открыта оплата через ЮMoney на ${formatRubles(res.amount || amount)}.`);
      return;
    }
    showDonateError("Оплата через ЮMoney доступна только в Planer.exe.");
    return;
  }

  if (method === "sbp") {
    if (api?.copy_donation_details) {
      const res = await api.copy_donation_details(amount);
      if (!res?.ok) {
        showDonateError(res?.error || "Не удалось скопировать реквизиты.");
        return;
      }
      showDonateSuccess("Реквизиты СБП скопированы в буфер обмена.");
      return;
    }
    showDonateError("Копирование СБП доступно только в Planer.exe.");
  }
}

function initDonate() {
  const overlay = document.getElementById("donateOverlay");
  if (!overlay) return;

  document.getElementById("donateBtn")?.addEventListener("click", async () => {
    hideDonateMessage();
    const custom = document.getElementById("donateCustomAmount");
    if (custom) custom.value = "";
    applyDonateInfo(await loadDonateInfo());
    showOverlay(overlay);
    overlay.querySelector(".donate-preset-btn.is-selected")?.focus();
  });

  document.getElementById("donateCloseBtn")?.addEventListener("click", () => hideOverlay(overlay));

  document.getElementById("donateCustomAmount")?.addEventListener("input", () => {
    hideDonateMessage();
    document.querySelectorAll(".donate-preset-btn").forEach((btn) => btn.classList.remove("is-selected"));
  });

  document.getElementById("donateYoomoneyBtn")?.addEventListener("click", () => void openDonationPayment("yoomoney"));
  document.getElementById("donateSbpBtn")?.addEventListener("click", () => void openDonationPayment("sbp"));
}
