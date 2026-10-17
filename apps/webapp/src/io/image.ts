/**
 * Image export from the renderer's standalone SVG snapshot (`modeler.saveSVG()`).
 * SVG downloads directly; PNG is rasterised through a canvas at 2×.
 */

import { MIRAGON, embedSvgStyles, geistFontFaceCss } from "@miragon/team-topologies-renderer";
import geistLatinUrl from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import geistLatinExtUrl from "@fontsource-variable/geist/files/geist-latin-ext-wght-normal.woff2?url";
import { downloadBlob, slugify } from "./download";

const MAX_PIXELS_AT_2X = 4_000_000;

export function downloadSvg(svg: string, title: string): void {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(`${slugify(title)}.svg`, blob);
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the font file"));
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font request failed with ${response.status}`);
  return readAsDataUrl(await response.blob());
}

let geistFontCss: Promise<string> | undefined;

/** The page's @font-face rules don't reach an SVG drawn as an image, so the font travels inline. */
function loadGeistFontCss(): Promise<string> {
  geistFontCss ??= Promise.all([fetchAsDataUrl(geistLatinUrl), fetchAsDataUrl(geistLatinExtUrl)])
    .then(([latin, latinExt]) => geistFontFaceCss({ latin, latinExt }))
    .catch((error: unknown) => {
      geistFontCss = undefined;
      throw error;
    });
  return geistFontCss;
}

async function svgForRaster(svg: string): Promise<string> {
  try {
    return embedSvgStyles(svg, await loadGeistFontCss());
  } catch (error) {
    console.warn("[tt-modeler] Geist could not be embedded; the PNG uses a system font:", error);
    return svg;
  }
}

async function loadImage(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterise the diagram"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  // Safari can fire load before the embedded font is ready; decode() waits for it.
  await img.decode().catch(() => undefined);
  return img;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG encoding failed"));
    }, "image/png");
  });
}

export async function downloadPng(svg: string, title: string): Promise<void> {
  const img = await loadImage(await svgForRaster(svg));

  const width = img.naturalWidth || 1000;
  const height = img.naturalHeight || 700;
  const scale = width * height > MAX_PIXELS_AT_2X ? 1 : 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = MIRAGON.weiss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);

  downloadBlob(`${slugify(title)}.png`, await canvasToPngBlob(canvas));
}
