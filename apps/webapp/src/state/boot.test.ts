import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAMPLE_DOCUMENT,
  emptyDocument,
  serializeDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";
import { encodeDocumentToHash } from "@/io/url";
import { useToastStore } from "@/ui/toast";
import { useUiStore } from "@/ui/uiStore";
import { bootModeler, planBoot } from "./boot";
import { loadBackup, saveToStorage } from "./persistence";
import type { DocumentHost } from "./replace";

const OWN_DIAGRAM: TtDocument = { ...SAMPLE_DOCUMENT, title: "Own diagram" };

describe("planBoot", () => {
  it("welcomes a first-time visitor on an empty canvas", () => {
    const plan = planBoot({ status: "absent" }, { status: "absent" });
    expect(plan.welcome).toBe(true);
    expect(plan.document.nodes).toHaveLength(0);
    expect(plan.seedAddressBar).toBe(false);
  });

  it("welcomes again when the autosave is empty", () => {
    const plan = planBoot({ status: "absent" }, { status: "ok", document: emptyDocument() });
    expect(plan.welcome).toBe(true);
  });

  it("continues a non-empty autosave without the welcome card", () => {
    const plan = planBoot({ status: "absent" }, { status: "ok", document: OWN_DIAGRAM });
    expect(plan.welcome).toBe(false);
    expect(plan.document).toBe(OWN_DIAGRAM);
    expect(plan.seedAddressBar).toBe(true);
  });

  it("treats a reload of the own tab as no shared link", () => {
    const plan = planBoot(
      { status: "ok", document: OWN_DIAGRAM },
      { status: "ok", document: OWN_DIAGRAM },
    );
    expect(plan.displacedOwnDiagram).toBeNull();
    expect(plan.welcome).toBe(false);
  });

  it("keeps the own diagram when a different shared diagram is opened", () => {
    const plan = planBoot(
      { status: "ok", document: SAMPLE_DOCUMENT },
      { status: "ok", document: OWN_DIAGRAM },
    );
    expect(plan.document).toBe(SAMPLE_DOCUMENT);
    expect(plan.displacedOwnDiagram).toBe(OWN_DIAGRAM);
  });

  it("shows the chrome for a shared empty diagram that displaces the own one", () => {
    const plan = planBoot(
      { status: "ok", document: emptyDocument() },
      { status: "ok", document: OWN_DIAGRAM },
    );
    expect(plan.displacedOwnDiagram).toBe(OWN_DIAGRAM);
    expect(plan.welcome).toBe(false);
  });

  it("reports a broken link, falls back to the autosave and leaves the link in place", () => {
    const plan = planBoot(
      { status: "invalid", detail: "truncated" },
      { status: "ok", document: OWN_DIAGRAM },
    );
    expect(plan.sharedLinkProblem).toBe("truncated");
    expect(plan.document).toBe(OWN_DIAGRAM);
    expect(plan.seedAddressBar).toBe(false);
  });

  it("reports a damaged autosave", () => {
    const plan = planBoot({ status: "absent" }, { status: "corrupt", detail: "bad json" });
    expect(plan.autosaveProblem).toBe("bad json");
    expect(plan.welcome).toBe(true);
  });
});

describe("bootModeler", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    useUiStore.setState({ welcome: "pending", backupAvailable: false, confirm: null });
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fakeHost() {
    let current = emptyDocument();
    const host: DocumentHost = {
      exportDocument: () => current,
      importDocument: (doc: TtDocument) => {
        current = doc;
        return { warnings: [] };
      },
    };
    return { host, current: () => current };
  }

  it("opens a shared link, keeps the own diagram and points to Restore", () => {
    saveToStorage(OWN_DIAGRAM);
    window.history.replaceState(null, "", `/#d=${encodeDocumentToHash(SAMPLE_DOCUMENT)}`);
    const { host, current } = fakeHost();

    bootModeler(host);

    expect(serializeDocument(current())).toBe(serializeDocument(SAMPLE_DOCUMENT));
    expect(serializeDocument(loadBackup()!)).toBe(serializeDocument(OWN_DIAGRAM));
    expect(useUiStore.getState()).toMatchObject({ welcome: "dismissed", backupAvailable: true });
    expect(useToastStore.getState().toasts.map((item) => item.tone)).toEqual(["info"]);
  });

  it("keeps the own diagram open when there is no room to keep a copy of it", () => {
    saveToStorage(OWN_DIAGRAM);
    window.history.replaceState(null, "", `/#d=${encodeDocumentToHash(SAMPLE_DOCUMENT)}`);
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.endsWith(":previous")) throw new DOMException("Quota exceeded", "QuotaExceededError");
      setItem.call(this, key, value);
    });
    const { host, current } = fakeHost();

    bootModeler(host);

    expect(serializeDocument(current())).toBe(serializeDocument(OWN_DIAGRAM));
    expect(useUiStore.getState().welcome).toBe("dismissed");
    const blocked = useToastStore
      .getState()
      .toasts.find((item) => item.message.startsWith("The shared diagram wasn't opened"));
    expect(blocked).toMatchObject({ tone: "error", sticky: true });
  });

  it("falls back to an empty canvas when the saved diagram can't be displayed", () => {
    saveToStorage(OWN_DIAGRAM);
    let current = emptyDocument();
    const host: DocumentHost = {
      exportDocument: () => current,
      importDocument: (doc: TtDocument) => {
        if (doc.nodes.length > 0) throw new Error("renderer failure");
        current = doc;
        return { warnings: [] };
      },
    };

    bootModeler(host);

    expect(current.nodes).toHaveLength(0);
    expect(useUiStore.getState().welcome).toBe("visible");
    expect(window.location.hash).toBe("");
    expect(useToastStore.getState().toasts.map((item) => item.tone)).toEqual(["error"]);
  });

  it("keeps a broken link in the address bar and says so", () => {
    window.history.replaceState(null, "", "/#d=broken");
    const { host } = fakeHost();

    bootModeler(host);

    expect(window.location.hash).toBe("#d=broken");
    expect(useUiStore.getState().welcome).toBe("visible");
    expect(useToastStore.getState().toasts.map((item) => item.tone)).toEqual(["error"]);
  });
});
