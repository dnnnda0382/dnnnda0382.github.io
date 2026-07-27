#!/usr/bin/env node
/**
 * 手寫圖去背 + 裁切 + 縮放
 * ------------------------------------------------------------------
 * 把「純色底 + 白色筆畫」的圖轉成透明背景的 PNG，用來產生 source/img/logo.png
 * （導覽列標題）和 source/img/icon.png（網站圖示）這類素材。
 *
 * ⚠️ 需要 sharp，但它「不是」這個專案的相依套件 —— sharp 是很大的原生套件，
 *    加進 package.json 會讓 CI 每次 npm ci 都要編譯它，而部署根本用不到。
 *    要用的時候臨時裝就好：
 *
 *      npm install --no-save sharp
 *      node tools/drop-bg.mjs <輸入> <輸出> [輸出高度]
 *
 * 例：
 *      node tools/drop-bg.mjs ~/logo-raw.png source/img/logo.png 84
 *
 * 做法：把「亮度」直接映射成「透明度」，不用硬臨界值。這樣筆畫邊緣的灰階像素
 * 會變成半透明，縮放後不會有鋸齒或黑邊。前提是原圖的底色夠純、跟筆畫的亮度
 * 分得開 —— 繪圖軟體匯出的圖通常沒問題，手機翻拍紙本則會因為光線不均而失敗
 * （亮度分布的兩個峰會糊在一起）。
 *
 * 輸出的筆畫一律填純白，顏色交給 CSS 控制。
 */

'use strict';

import sharp from 'sharp';
import { statSync } from 'fs';

const [, , SRC, OUT, HEIGHT] = process.argv;
if (!SRC || !OUT) {
  console.error('用法：node tools/drop-bg.mjs <輸入> <輸出> [輸出高度]');
  process.exit(1);
}

const BG = 51;        // 底色亮度（#333333）
const FG = 255;       // 筆畫亮度（純白）
const THRESH = 110;   // 找筆畫邊界用的門檻，只影響裁切範圍，不影響邊緣品質

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
const lumAt = i => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

// 1. 找出筆畫的外接矩形，把四周留白裁掉，這樣 CSS 的尺寸才好算
let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (lumAt((y * info.width + x) * ch) > THRESH) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) {
  console.error('找不到任何筆畫 —— 原圖的底色跟筆畫亮度可能分不開');
  process.exit(1);
}

const w = maxX - minX + 1;
const h = maxY - minY + 1;

// 2. 亮度 → alpha
const rgba = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = ((y + minY) * info.width + (x + minX)) * ch;
    const j = (y * w + x) * 4;
    rgba[j] = rgba[j + 1] = rgba[j + 2] = 255;
    rgba[j + 3] = Math.round(Math.max(0, Math.min(1, (lumAt(i) - BG) / (FG - BG))) * 255);
  }
}

let img = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
if (HEIGHT) img = img.resize({ height: Number(HEIGHT) });
await img.png({ compressionLevel: 9 }).toFile(OUT);

const m = await sharp(OUT).metadata();
console.log(`${info.width}x${info.height} → 裁切 ${w}x${h} → 輸出 ${m.width}x${m.height}`
  + `（${(statSync(OUT).size / 1024).toFixed(0)}K，長寬比 ${(m.width / m.height).toFixed(2)}:1）`);
