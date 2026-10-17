import { describe, expect, it } from "vitest";
import { slugify } from "./download";

describe("slugify", () => {
  it("transliterates German umlauts and ß", () => {
    expect(slugify("Übersicht für Zahlungen")).toBe("uebersicht-fuer-zahlungen");
    expect(slugify("Straße der Plattform")).toBe("strasse-der-plattform");
  });

  it("drops other diacritics instead of the whole letter", () => {
    expect(slugify("Café Señor")).toBe("cafe-senor");
  });

  it("keeps the default title's file name unchanged", () => {
    expect(slugify("Online shop — team topology")).toBe("online-shop-team-topology");
  });

  it("falls back when nothing usable is left", () => {
    expect(slugify("  —  ")).toBe("team-topology");
    expect(slugify("Team", "diagram")).toBe("team");
    expect(slugify("", "diagram")).toBe("diagram");
  });

  it("treats decomposed umlauts like composed ones", () => {
    expect(slugify("U\u0308bersicht")).toBe("uebersicht");
  });

  it("caps the length without leaving a trailing dash", () => {
    expect(slugify("a".repeat(100))).toHaveLength(60);
    expect(slugify(`${"a".repeat(59)} b`)).toBe("a".repeat(59));
  });
});
