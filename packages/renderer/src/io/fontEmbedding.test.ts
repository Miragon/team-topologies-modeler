import { describe, expect, it } from "vitest";
import { embedSvgStyles, geistFontFaceCss } from "./fontEmbedding.js";

describe("font embedding", () => {
  it("builds one Geist face per latin subset with a woff2 data URL", () => {
    const css = geistFontFaceCss({
      latin: "data:application/octet-stream;base64,AAAA",
      latinExt: "data:font/woff2;base64,BBBB",
    });

    expect(css.match(/@font-face/g)).toHaveLength(2);
    expect(css).toContain("font-family:'Geist Variable'");
    expect(css).toContain("src:url(data:font/woff2;base64,AAAA) format('woff2')");
    expect(css).toContain("src:url(data:font/woff2;base64,BBBB) format('woff2')");
    expect(css).toContain("unicode-range:U+0000-00FF");
  });

  it("puts the styles first in the SVG", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect/></svg>';

    const embedded = embedSvgStyles(svg, "text{fill:red}");

    expect(embedded).toMatch(/^<svg[^>]*><defs><style>text\{fill:red\}<\/style><\/defs><rect\/>/);
  });

  it("leaves markup it can't parse alone", () => {
    expect(embedSvgStyles("<svg", "text{}")).toBe("<svg");
  });
});
