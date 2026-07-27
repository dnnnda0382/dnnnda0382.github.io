#!/usr/bin/env node
/**
 * 把文章裡的外部圖片抓回本機
 * ------------------------------------------------------------------
 *   node tools/localize-images.mjs                    # 預覽，不動任何檔案
 *   node tools/localize-images.mjs --apply            # 實際下載並改寫連結
 *   node tools/localize-images.mjs --drafts --apply   # 改處理 source/_drafts
 *
 * 為什麼要做這件事
 * ------------------------------------------------------------------
 * 從 HackMD 匯入的文章，圖片連結仍然指向 hackmd.io/_uploads/...。那是別人的
 * 伺服器 —— 對方刪檔、改政策或擋外連，文章的圖就全破，而且本地沒有備份。
 * 抓回 source/images/ 之後就跟著 repo 一起走。
 *
 * 用 curl 而不是 fetch
 * ------------------------------------------------------------------
 * 部分 CDN（實測 acfun）在某些環境下 node 的 fetch 會直接 TLS 失敗，
 * 但 curl 拿得到。既然只是下載檔案，用 curl 最省事也最穩。
 *
 * 檔名沿用原網址的 basename
 * ------------------------------------------------------------------
 * HackMD 的檔名是隨機 id（Bklj2ZlVbe.png），雖然沒有語意但不會撞名，而且
 * 之後再匯入同一張圖時會自然對應到同一個檔案。硬要改成有意義的名字反而
 * 得逐張看圖，也容易跟未來匯入的檔案撞名。
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const APPLY = process.argv.includes('--apply');
const SRC_DIR = process.argv.includes('--drafts') ? 'source/_drafts' : 'source/_posts';
const OUT_DIR = 'source/images';
const WEB_PREFIX = '/images';

// markdown 的 ![](url) 和 HTML 的 <img src="url"> 都要抓
const RE = /!\[[^\]]*\]\(\s*([^)\s]+)[^)]*\)|<img[^>]+src=["']([^"']+)["']/g;

if (!fs.existsSync(SRC_DIR)) {
  console.error(`✗ 找不到 ${SRC_DIR}`);
  process.exit(1);
}

// 1. 收集所有外部圖片網址
const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.md')).sort();
const urls = new Map();   // url -> [檔名...]
for (const f of files) {
  const raw = fs.readFileSync(path.join(SRC_DIR, f), 'utf8');
  let m; RE.lastIndex = 0;
  while ((m = RE.exec(raw))) {
    const url = m[1] || m[2];
    if (!/^https?:\/\//.test(url)) continue;
    if (!urls.has(url)) urls.set(url, []);
    if (!urls.get(url).includes(f)) urls.get(url).push(f);
  }
}

if (!urls.size) {
  console.log(`${SRC_DIR} 裡沒有外部圖片`);
  process.exit(0);
}

// 2. 決定各自的本機檔名，避免撞名
const taken = new Set(fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : []);
const plan = [];
for (const [url, inFiles] of urls) {
  let base = path.basename(new URL(url).pathname) || 'image';
  base = base.replace(/[^\w.-]/g, '_');
  if (!path.extname(base)) base += '.img';
  let name = base, n = 2;
  while (taken.has(name)) {
    const ext = path.extname(base);
    name = `${base.slice(0, -ext.length)}-${n++}${ext}`;
  }
  taken.add(name);
  plan.push({ url, name, inFiles });
}

console.log(`${SRC_DIR}：${plan.length} 張外部圖片\n`);

if (!APPLY) {
  for (const p of plan) {
    console.log(`  ${p.name.padEnd(42)} ← ${p.url.slice(0, 60)}`);
    console.log(`  ${' '.repeat(42)}   用於 ${p.inFiles.join(', ')}`);
  }
  console.log('\n這是預覽。要實際下載並改寫連結請加 --apply');
  process.exit(0);
}

// 3. 下載
fs.mkdirSync(OUT_DIR, { recursive: true });
const ok = [];
const failed = [];
for (const p of plan) {
  const dest = path.join(OUT_DIR, p.name);
  try {
    execFileSync('curl', [
      '-sSfL', '--max-time', '60',
      '-A', 'Mozilla/5.0',
      '-o', dest, p.url,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    const size = fs.statSync(dest).size;
    // 抓到 0 byte 或 HTML 錯誤頁都不算成功
    const head = fs.readFileSync(dest).subarray(0, 200).toString('latin1').toLowerCase();
    if (size === 0 || head.includes('<html')) {
      fs.unlinkSync(dest);
      throw new Error(size === 0 ? '空檔案' : '抓到的是 HTML 不是圖片');
    }
    ok.push({ ...p, size });
    console.log(`  ✓ ${p.name.padEnd(42)} ${(size / 1024).toFixed(0)}K`);
  } catch (e) {
    failed.push({ ...p, err: (e.stderr?.toString() || e.message).trim().split('\n')[0] });
    console.log(`  ✗ ${p.name.padEnd(42)} ${failed.at(-1).err.slice(0, 50)}`);
  }
}

// 4. 只改寫下載成功的那些，失敗的維持原樣（總比連結變成 404 好）
let rewritten = 0;
for (const f of files) {
  const p = path.join(SRC_DIR, f);
  let raw = fs.readFileSync(p, 'utf8');
  const before = raw;
  for (const img of ok) {
    if (!img.inFiles.includes(f)) continue;
    raw = raw.split(img.url).join(`${WEB_PREFIX}/${img.name}`);
  }
  if (raw !== before) { fs.writeFileSync(p, raw); rewritten++; }
}

const total = ok.reduce((a, b) => a + b.size, 0);
console.log(`\n下載成功 ${ok.length} 張（共 ${(total / 1024 / 1024).toFixed(1)}MB），改寫了 ${rewritten} 個檔案`);
if (failed.length) {
  console.log(`\n⚠️  ${failed.length} 張抓不到，連結維持原樣沒有改：`);
  failed.forEach(f => console.log(`   ${f.url}\n     ${f.err}`));
}
