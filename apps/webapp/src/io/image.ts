/**
 * Image export from the renderer's standalone SVG snapshot (`modeler.saveSVG()`).
 * SVG downloads directly; PNG is rasterised through a canvas at 2×.
 */

import { downloadBlob, slugify, triggerDownload } from "./download";

const BG = "#ffffff";

export function downloadSvg(svg: string, title: string): void {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(`${slugify(title)}.svg`, blob);
}

export async function downloadPng(svg: string, title: string): Promise<void> {
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterise the diagram"));
    img.src = url;
  });

  const w = img.naturalWidth || 1000;
  const h = img.naturalHeight || 700;
  const scale = w * h > 4_000_000 ? 1 : 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, w, h);

  triggerDownload(`${slugify(title)}.png`, canvas.toDataURL("image/png"));
}
