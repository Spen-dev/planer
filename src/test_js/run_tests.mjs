#!/usr/bin/env node
/** Autotests for PlanerStorage crypto, boot flow helpers, matrix links, save guards. */
import fs from "fs";
import path from "path";
import vm from "vm";
import { webcrypto } from "crypto";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function makeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    _dump() {
      return { ...data };
    },
  };
}

function loadModules() {
  const context = {
    crypto: webcrypto,
    btoa: (str) => Buffer.from(str, "binary").toString("base64"),
    atob: (str) => Buffer.from(str, "base64").toString("binary"),
    TextEncoder,
    TextDecoder,
    console,
    setTimeout,
    clearTimeout,
    PlanerStorage: undefined,
    PlanerMatrixLinks: undefined,
  };
  vm.createContext(context);
  for (const rel of ["js/storage.js", "js/matrix_links.js"]) {
    const code = fs.readFileSync(path.join(root, rel), "utf8");
    vm.runInContext(code, context, { filename: rel });
  }
  return { PlanerStorage: context.PlanerStorage, PlanerMatrixLinks: context.PlanerMatrixLinks };
}

const { PlanerStorage, PlanerMatrixLinks } = loadModules();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL: ${message}`);
}

async function assertRejects(promise, expectedMessage, label) {
  try {
    await promise;
    failed += 1;
    console.error(`FAIL: ${label} — expected rejection`);
  } catch (err) {
    if (err?.message === expectedMessage) passed += 1;
    else {
      failed += 1;
      console.error(`FAIL: ${label} — got ${err?.message}, expected ${expectedMessage}`);
    }
  }
}

async function testCryptoRoundtrip() {
  const payload = await PlanerStorage.encryptText('{"weekStart":"2026-05-25"}', "secret-pass");
  assert(payload.encrypted === true, "encryptText marks payload encrypted");
  const plain = await PlanerStorage.decryptText(payload, "secret-pass");
  assert(plain === '{"weekStart":"2026-05-25"}', "decryptText restores plaintext");

  let wrong = false;
  try {
    await PlanerStorage.decryptText(payload, "wrong-pass");
  } catch {
    wrong = true;
  }
  assert(wrong, "decryptText rejects wrong password");
}

async function testLoadStateGuards() {
  PlanerStorage._resetInternals();
  const storage = makeStorage({ "planer-data-v2": "{not-json" });
  await assertRejects(
    PlanerStorage.loadState(storage, null, JSON.parse, () => ({ empty: true })),
    PlanerStorage.LOAD_ERRORS.CORRUPT_STORAGE,
    "corrupt JSON",
  );
  assert(PlanerStorage.isStorageSaveBlocked(), "corrupt JSON blocks save");

  PlanerStorage._resetInternals();
  const enc = await PlanerStorage.encryptText("{}", "pw");
  const locked = makeStorage({ "planer-data-v2": JSON.stringify(enc) });
  await assertRejects(
    PlanerStorage.loadState(locked, null, JSON.parse, () => ({})),
    PlanerStorage.LOAD_ERRORS.NO_PASSWORD,
    "encrypted without password",
  );

  PlanerStorage._resetInternals();
  await assertRejects(
    PlanerStorage.loadState(locked, "bad-password", JSON.parse, () => ({})),
    PlanerStorage.LOAD_ERRORS.WRONG_PASSWORD,
    "wrong password",
  );

  PlanerStorage._resetInternals();
  const loaded = await PlanerStorage.loadState(locked, "pw", JSON.parse, () => ({}));
  assert(typeof loaded === "object", "correct password loads state");
  assert(PlanerStorage.isStorageUnlockVerified(), "unlock verified after good password");
}

async function testSaveGuards() {
  PlanerStorage._resetInternals();
  const storage = makeStorage({ "planer-crypto-v1": "1" });
  PlanerStorage.blockStorageSave();
  const blocked = await PlanerStorage.saveState(storage, "pw", { ok: true }, () => {});
  assert(blocked === false, "save blocked after blockStorageSave");

  PlanerStorage._resetInternals();
  const locked = makeStorage({ "planer-crypto-v1": "1" });
  const denied = await PlanerStorage.saveState(locked, "pw", { ok: true }, () => {});
  assert(denied === false, "save denied when crypto setup but not unlocked");

  PlanerStorage._resetInternals();
  const plain = makeStorage();
  PlanerStorage.setStorageUnlockVerified(true);
  const saved = await PlanerStorage.saveState(plain, null, { weekStart: "2026-05-25" }, () => {});
  assert(saved === true, "plain save succeeds when unlocked");
  assert(plain.getItem("planer-data-v2")?.includes("2026-05-25"), "plain save writes storage");
}

function testBootFlowModes() {
  PlanerStorage._resetInternals();
  const empty = makeStorage();
  assert(PlanerStorage.resolvePasswordMode(empty, false) === "setup", "empty storage -> setup");

  const enc = makeStorage({
    "planer-data-v2": JSON.stringify({ encrypted: true, salt: "x", iv: "y", data: "z" }),
  });
  assert(PlanerStorage.resolvePasswordMode(enc, false) === "unlock", "encrypted payload -> unlock");
  assert(PlanerStorage.resolvePasswordMode(enc, true) === "done", "remember worked -> done");

  const metaOnly = makeStorage({ "planer-crypto-v1": "1" });
  assert(PlanerStorage.resolvePasswordMode(metaOnly, false) === "unlock", "crypto meta -> unlock");
}

function testMatrixLinks() {
  const links = {
    urgentImportant: [
      { weekStart: "2026-05-25", dayIdx: 1, taskIdx: 2 },
      null,
    ],
    urgentNotImportant: [
      { weekStart: "2026-05-25", dayIdx: 3, taskIdx: 4 },
    ],
  };

  const moved = PlanerMatrixLinks.relocateMatrixLinksForWeeklyMove(
    links, "2026-05-25", 1, 2, 5, 0,
  );
  assert(moved.urgentImportant[0]?.dayIdx === 5, "link follows moved task");
  assert(moved.urgentImportant[0]?.taskIdx === 0, "link follows moved task index");

  const swapped = PlanerMatrixLinks.relocateMatrixLinksForWeeklyMove(
    links, "2026-05-25", 1, 2, 3, 4,
  );
  assert(swapped.urgentImportant[0]?.dayIdx === 3, "swap updates first link");
  assert(swapped.urgentNotImportant[0]?.dayIdx === 1, "swap updates second link");

  const weeks = {
    "2026-05-25": {
      days: [{
        tasks: [{ text: "linked", done: false }],
      }],
    },
  };
  const cleared = PlanerMatrixLinks.clearWeeklyTaskForLink(weeks, {
    weekStart: "2026-05-25", dayIdx: 0, taskIdx: 0,
  });
  assert(cleared["2026-05-25"].days[0].tasks[0].text === "", "clearWeeklyTaskForLink clears text");
}

async function testSaveMutex() {
  PlanerStorage._resetInternals();
  let runs = 0;
  const runSave = async () => {
    runs += 1;
    await new Promise((r) => setTimeout(r, 30));
    return true;
  };
  PlanerStorage.scheduleSave(runSave, () => {});
  PlanerStorage.scheduleSave(runSave, () => {});
  await PlanerStorage.flushPendingSave(runSave);
  assert(runs >= 1, "scheduled saves eventually run");
}

async function main() {
  await testCryptoRoundtrip();
  await testLoadStateGuards();
  await testSaveGuards();
  testBootFlowModes();
  testMatrixLinks();
  await testSaveMutex();

  console.log(`JS tests: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
