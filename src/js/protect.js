function isEditableTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  return !!target.closest('input, textarea, select, [contenteditable="true"]');
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
    if (key === "u" || key === "s") {
      event.preventDefault();
    }
  }, true);
}
