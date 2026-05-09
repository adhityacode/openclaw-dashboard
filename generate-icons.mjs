// Run once: node generate-icons.mjs
// Generates PWA icons in public/icons/

import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const r = size * 0.12;

  // Background
  ctx.fillStyle = "#006f8d";
  roundRect(ctx, 0, 0, size, size, r);
  ctx.fill();

  // "OC" text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.38}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("OC", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

writeFileSync("public/icons/icon-192.png", drawIcon(192));
writeFileSync("public/icons/icon-512.png", drawIcon(512));
console.log("Icons generated in public/icons/");
