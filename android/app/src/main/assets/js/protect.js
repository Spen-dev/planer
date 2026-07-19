function isEditableTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  return !!target.closest('input, textarea, select, .day-text-wrap, .day-text-label, .day-text-input');
}

function initNoPastePasswordInputs(root = document) {
  root.querySelectorAll(".no-paste-password").forEach((input) => {
    if (input.dataset.noPasteBound === "1") return;
    input.dataset.noPasteBound = "1";
    input.addEventListener("paste", (event) => event.preventDefault());
    input.addEventListener("drop", (event) => event.preventDefault());
    input.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "v") event.preventDefault();
    });
  });
}

function initCodeProtection() {
  if (!isDesktopShell()) return;

  document.documentElement.classList.add("desktop-protected");

  document.addEventListener("contextmenu", (event) => {
    if (!isEditableTarget(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("copy", (event) => {
    if (!isEditableTarget(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("cut", (event) => {
    if (!isEditableTarget(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("selectstart", (event) => {
    if (!isEditableTarget(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("dragstart", (event) => {
    if (!isEditableTarget(event.target)) event.preventDefault();
  }, true);

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "f12") {
      event.preventDefault();
      return;
    }
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.shiftKey && (key === "i" || key === "j" || key === "c")) {
      event.preventDefault();
      return;
    }
    if (key === "u") {
      event.preventDefault();
    }
  }, true);

  initNoPastePasswordInputs();
}
