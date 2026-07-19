/* Storage, crypto, and save guards — testable without DOM. */
const PlanerStorage = (() => {
  const STORAGE_KEY = "planer-data-v2";
  const CRYPTO_META_KEY = "planer-crypto-v1";
  const LEGACY_STORAGE_KEY = "planer-data-v1";

  const LOAD_ERRORS = {
    NO_PASSWORD: "NO_PASSWORD",
    WRONG_PASSWORD: "WRONG_PASSWORD",
    CORRUPT_STORAGE: "CORRUPT_STORAGE",
  };

  let storageUnlockVerified = false;
  let storageSaveBlocked = false;
  let saveChain = Promise.resolve();
  let saveTimer = null;
  let pendingSave = false;

  function isLoadStateError(message) {
    return message === LOAD_ERRORS.NO_PASSWORD
      || message === LOAD_ERRORS.WRONG_PASSWORD
      || message === LOAD_ERRORS.CORRUPT_STORAGE;
  }

  function readRawStorage(storage) {
    return storage.getItem(STORAGE_KEY) || storage.getItem(LEGACY_STORAGE_KEY);
  }

  function storageHasEncryptedPayload(storage) {
    const raw = readRawStorage(storage);
    if (!raw) return false;
    try {
      return Boolean(JSON.parse(raw)?.encrypted);
    } catch {
      return false;
    }
  }

  function hasCryptoSetup(storage) {
    return Boolean(storage.getItem(CRYPTO_META_KEY)) || storageHasEncryptedPayload(storage);
  }

  function needsPasswordUnlock(storage) {
    return storageHasEncryptedPayload(storage);
  }

  function resetSaveGuards() {
    storageUnlockVerified = false;
    storageSaveBlocked = false;
  }

  function blockStorageSave() {
    storageSaveBlocked = true;
    storageUnlockVerified = false;
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

  async function loadState(storage, sessionPassword, parsePlainState, defaultState) {
    const raw = readRawStorage(storage);
    if (!raw) {
      storageUnlockVerified = !hasCryptoSetup(storage);
      storageSaveBlocked = false;
      return defaultState();
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      storageUnlockVerified = false;
      storageSaveBlocked = true;
      throw new Error(LOAD_ERRORS.CORRUPT_STORAGE);
    }

    if (parsed?.encrypted) {
      if (!sessionPassword) {
        storageUnlockVerified = false;
        storageSaveBlocked = true;
        throw new Error(LOAD_ERRORS.NO_PASSWORD);
      }
      try {
        const text = await decryptText(parsed, sessionPassword);
        try {
          storageUnlockVerified = true;
          storageSaveBlocked = false;
          return parsePlainState(text);
        } catch {
          storageUnlockVerified = false;
          storageSaveBlocked = true;
          throw new Error(LOAD_ERRORS.CORRUPT_STORAGE);
        }
      } catch (err) {
        storageUnlockVerified = false;
        storageSaveBlocked = true;
        if (isLoadStateError(err?.message)) throw err;
        throw new Error(LOAD_ERRORS.WRONG_PASSWORD);
      }
    }

    try {
      storageUnlockVerified = true;
      storageSaveBlocked = false;
      return parsePlainState(raw);
    } catch {
      storageUnlockVerified = false;
      storageSaveBlocked = true;
      throw new Error(LOAD_ERRORS.CORRUPT_STORAGE);
    }
  }

  async function saveState(storage, sessionPassword, stateObject, onStatus) {
    if (storageSaveBlocked) {
      onStatus?.("error");
      return false;
    }
    if (hasCryptoSetup(storage) && !storageUnlockVerified) {
      onStatus?.("error");
      return false;
    }
    try {
      const plain = JSON.stringify(stateObject);
      if (sessionPassword) {
        const encrypted = await encryptText(plain, sessionPassword);
        storage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
        storage.setItem(CRYPTO_META_KEY, "1");
      } else {
        storage.setItem(STORAGE_KEY, plain);
      }
      pendingSave = false;
      onStatus?.("saved");
      return true;
    } catch {
      onStatus?.("error");
      return false;
    }
  }

  function scheduleSave(runSave, onSaving) {
    pendingSave = true;
    onSaving?.();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveChain = saveChain.then(() => runSave()).catch(() => {});
    }, 400);
  }

  async function flushPendingSave(runSave) {
    clearTimeout(saveTimer);
    saveTimer = null;
    await saveChain;
    if (pendingSave) {
      pendingSave = false;
      await runSave();
    }
  }

  function resolvePasswordMode(storage, rememberWorked) {
    if (hasCryptoSetup(storage) && rememberWorked) return "done";
    if (needsPasswordUnlock(storage) || hasCryptoSetup(storage)) return "unlock";
    return "setup";
  }

  return {
    STORAGE_KEY,
    CRYPTO_META_KEY,
    LOAD_ERRORS,
    readRawStorage,
    storageHasEncryptedPayload,
    hasCryptoSetup,
    needsPasswordUnlock,
    resolvePasswordMode,
    encryptText,
    decryptText,
    loadState,
    saveState,
    scheduleSave,
    flushPendingSave,
    resetSaveGuards,
    blockStorageSave,
    isLoadStateError,
    isStorageUnlockVerified: () => storageUnlockVerified,
    setStorageUnlockVerified: (value) => { storageUnlockVerified = Boolean(value); },
    isStorageSaveBlocked: () => storageSaveBlocked,
    _resetInternals: () => {
      storageUnlockVerified = false;
      storageSaveBlocked = false;
      saveChain = Promise.resolve();
      saveTimer = null;
      pendingSave = false;
    },
  };
})();
