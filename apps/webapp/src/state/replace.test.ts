import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAMPLE_DOCUMENT,
  emptyDocument,
  serializeDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";
import type { ImportWarning } from "@miragon/team-topologies-renderer";
import { useToastStore } from "@/ui/toast";
import { useUiStore } from "@/ui/uiStore";
import { loadBackup, saveBackup } from "./persistence";
import {
  openDocumentFile,
  replaceDocument,
  restorePreviousDiagram,
  type DocumentHost,
} from "./replace";

const OWN_DIAGRAM: TtDocument = { ...SAMPLE_DOCUMENT, title: "Own diagram" };

function fakeHost(initial: TtDocument, warnings: ImportWarning[] = []) {
  let current = initial;
  const imported: TtDocument[] = [];
  const host: DocumentHost = {
    exportDocument: () => current,
    importDocument: (doc: TtDocument) => {
      current = doc;
      imported.push(doc);
      return { warnings };
    },
  };
  return { host, imported, current: () => current };
}

function toastMessages(): string[] {
  return useToastStore.getState().toasts.map((item) => `${item.tone}: ${item.message}`);
}

function pendingConfirm() {
  return useUiStore.getState().confirm;
}

function sameDocument(first: TtDocument | null, second: TtDocument): boolean {
  return first !== null && serializeDocument(first) === serializeDocument(second);
}

beforeEach(() => {
  window.localStorage.clear();
  useUiStore.setState({ confirm: null, backupAvailable: false, welcome: "visible" });
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  useUiStore.getState().settleConfirm(false);
  vi.restoreAllMocks();
});

const BACKUP_KEY = "tt-modeler:document:v1:previous";

function failBackupWrites(): void {
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key: string,
    value: string,
  ) {
    if (key === BACKUP_KEY) throw new DOMException("Quota exceeded", "QuotaExceededError");
    setItem.call(this, key, value);
  });
}

describe("replaceDocument", () => {
  it("replaces an empty diagram without asking and keeps no backup", async () => {
    const { host, imported } = fakeHost(emptyDocument());

    const outcome = await replaceDocument(host, SAMPLE_DOCUMENT, { kind: "example" });

    expect(outcome).toEqual({ replaced: true, warningCount: 0 });
    expect(imported).toEqual([SAMPLE_DOCUMENT]);
    expect(loadBackup()).toBeNull();
    expect(useUiStore.getState().welcome).toBe("dismissed");
  });

  it("asks before replacing a non-empty diagram and changes nothing on cancel", async () => {
    const { host, imported } = fakeHost(OWN_DIAGRAM);

    const pending = replaceDocument(host, emptyDocument(), { kind: "new" });
    expect(pendingConfirm()).toMatchObject({
      title: "Replace the current diagram?",
      confirmLabel: "Replace",
      tone: "destructive",
    });
    expect(pendingConfirm()?.message).toContain("“Own diagram”");

    useUiStore.getState().settleConfirm(false);

    expect(await pending).toEqual({ replaced: false });
    expect(imported).toHaveLength(0);
    expect(loadBackup()).toBeNull();
  });

  it("keeps the replaced diagram as the previous diagram once confirmed", async () => {
    const { host, current } = fakeHost(OWN_DIAGRAM);

    const pending = replaceDocument(host, emptyDocument(), { kind: "new" });
    useUiStore.getState().settleConfirm(true);

    expect(await pending).toMatchObject({ replaced: true });
    expect(current().nodes).toHaveLength(0);
    expect(sameDocument(loadBackup(), OWN_DIAGRAM)).toBe(true);
    expect(useUiStore.getState().backupAvailable).toBe(true);
  });

  it("does not ask when the diagram would not change", async () => {
    const { host, imported } = fakeHost(SAMPLE_DOCUMENT);

    await replaceDocument(host, SAMPLE_DOCUMENT, { kind: "example" });

    expect(pendingConfirm()).toBeNull();
    expect(imported).toHaveLength(1);
    expect(loadBackup()).toBeNull();
  });

  it("keeps the current diagram when the canvas can't display the new one", async () => {
    let current: TtDocument = OWN_DIAGRAM;
    const host: DocumentHost = {
      exportDocument: () => current,
      importDocument: (doc: TtDocument) => {
        if (doc.title === "Broken") throw new Error("renderer failure");
        current = doc;
        return { warnings: [] };
      },
    };

    const pending = replaceDocument(
      host,
      { ...SAMPLE_DOCUMENT, title: "Broken" },
      { kind: "example" },
    );
    useUiStore.getState().settleConfirm(true);

    expect(await pending).toEqual({ replaced: false });
    expect(current).toBe(OWN_DIAGRAM);
    expect(loadBackup()).toBeNull();
    expect(toastMessages()[0]).toMatch(/^error: Couldn't display this diagram/);
  });

  it("asks again before replacing when the copy can't be kept, and keeps everything on cancel", async () => {
    saveBackup(SAMPLE_DOCUMENT);
    failBackupWrites();
    const { host, imported } = fakeHost(OWN_DIAGRAM);

    const pending = replaceDocument(host, emptyDocument(), { kind: "new" });
    useUiStore.getState().settleConfirm(true);
    await vi.waitFor(() =>
      expect(pendingConfirm()).toMatchObject({
        title: "Replace without keeping a copy?",
        confirmLabel: "Replace anyway",
        tone: "destructive",
      }),
    );
    useUiStore.getState().settleConfirm(false);

    expect(await pending).toEqual({ replaced: false });
    expect(imported).toHaveLength(0);
    expect(sameDocument(loadBackup(), SAMPLE_DOCUMENT)).toBe(true);
  });

  it("replaces without a backup only when the user insists", async () => {
    failBackupWrites();
    const { host, current } = fakeHost(OWN_DIAGRAM);

    const pending = replaceDocument(host, emptyDocument(), { kind: "new" });
    useUiStore.getState().settleConfirm(true);
    await vi.waitFor(() => expect(pendingConfirm()?.confirmLabel).toBe("Replace anyway"));
    useUiStore.getState().settleConfirm(true);

    expect(await pending).toMatchObject({ replaced: true });
    expect(current().nodes).toHaveLength(0);
    expect(useUiStore.getState().backupAvailable).toBe(false);
  });

  it("puts the older backup back when the new diagram can't be displayed", async () => {
    saveBackup(SAMPLE_DOCUMENT);
    let current: TtDocument = OWN_DIAGRAM;
    const host: DocumentHost = {
      exportDocument: () => current,
      importDocument: (doc: TtDocument) => {
        if (doc.title === "Broken") throw new Error("renderer failure");
        current = doc;
        return { warnings: [] };
      },
    };

    const pending = replaceDocument(
      host,
      { ...OWN_DIAGRAM, title: "Broken" },
      { kind: "file", fileName: "broken.tt" },
    );
    useUiStore.getState().settleConfirm(true);

    expect(await pending).toEqual({ replaced: false });
    expect(current).toBe(OWN_DIAGRAM);
    expect(sameDocument(loadBackup(), SAMPLE_DOCUMENT)).toBe(true);
  });

  it("reports import warnings as a warning toast", async () => {
    const { host } = fakeHost(emptyDocument(), [{ message: "connector dropped" }]);

    const outcome = await replaceDocument(host, SAMPLE_DOCUMENT, { kind: "example" });

    expect(outcome).toEqual({ replaced: true, warningCount: 1 });
    expect(toastMessages()).toContain("warning: Imported with 1 warning. Details in the console.");
  });
});

describe("restorePreviousDiagram", () => {
  it("swaps the current and the previous diagram", async () => {
    saveBackup(OWN_DIAGRAM);
    const { host, current } = fakeHost(SAMPLE_DOCUMENT);

    const pending = restorePreviousDiagram(host);
    expect(pendingConfirm()).toMatchObject({ confirmLabel: "Restore", tone: "primary" });
    useUiStore.getState().settleConfirm(true);
    await pending;

    expect(sameDocument(current(), OWN_DIAGRAM)).toBe(true);
    expect(sameDocument(loadBackup(), SAMPLE_DOCUMENT)).toBe(true);
  });

  it("restores into an empty diagram without asking and uses up the backup", async () => {
    saveBackup(OWN_DIAGRAM);
    useUiStore.setState({ backupAvailable: true });
    const { host, current } = fakeHost(emptyDocument());

    await restorePreviousDiagram(host);

    expect(pendingConfirm()).toBeNull();
    expect(sameDocument(current(), OWN_DIAGRAM)).toBe(true);
    expect(loadBackup()).toBeNull();
    expect(useUiStore.getState().backupAvailable).toBe(false);
  });

  it("explains when there is nothing to restore", async () => {
    useUiStore.setState({ backupAvailable: true });
    const { host, imported } = fakeHost(SAMPLE_DOCUMENT);

    expect(await restorePreviousDiagram(host)).toEqual({ replaced: false });
    expect(imported).toHaveLength(0);
    expect(useUiStore.getState().backupAvailable).toBe(false);
    expect(toastMessages()[0]).toMatch(/^error: The previous diagram is no longer stored/);
  });
});

describe("openDocumentFile", () => {
  it("opens a .tt file and confirms with a success toast", async () => {
    const { host, imported } = fakeHost(emptyDocument());
    const file = new File([serializeDocument(SAMPLE_DOCUMENT)], "team-topology.tt");

    await openDocumentFile(host, file);

    expect(imported).toHaveLength(1);
    expect(toastMessages()).toEqual(["success: Opened “team-topology.tt”"]);
  });

  it("refuses other file types without reading them", async () => {
    const { host, imported } = fakeHost(OWN_DIAGRAM);

    await openDocumentFile(host, new File(["{}"], "diagram.png"));

    expect(imported).toHaveLength(0);
    expect(toastMessages()).toEqual([
      "error: Can't open “diagram.png”. Choose a .tt or .ttm.json file.",
    ]);
  });

  it("refuses JSON that is not a diagram before asking to replace anything", async () => {
    const { host, imported } = fakeHost(OWN_DIAGRAM);
    const file = new File([JSON.stringify({ name: "pkg", version: "1.0.0" })], "package.json");

    await openDocumentFile(host, file);

    expect(pendingConfirm()).toBeNull();
    expect(imported).toHaveLength(0);
    expect(toastMessages()[0]).toBe(
      "error: “package.json” doesn't contain a Team Topologies diagram. Choose a .tt or .ttm.json file.",
    );
  });
});
