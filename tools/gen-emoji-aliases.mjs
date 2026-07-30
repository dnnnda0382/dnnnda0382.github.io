#!/usr/bin/env node
/**
 * 產生 scripts/emoji-aliases.json —— emoji 短碼的「補充別名表」
 * ------------------------------------------------------------------
 * 背景：scripts/markdown-it-emoji.js 用的 markdown-it-emoji 內建字典是
 * GitHub 的 gemoji（1900 個左右）。但 HackMD 之類的編輯器用的是別套命名
 * （JoyPixels / CLDR），同一個 emoji 名字常常對不上，例如：
 *
 *     🤯  gemoji: :exploding_head:   HackMD 貼出來: :shocked_face_with_exploding_head:
 *
 * 名字對不上的結果是短碼原封不動印在文章裡。這支腳本把幾套常見命名的短碼
 * 蒐集起來，扣掉 gemoji 已經有的，剩下的當成「別名」補進字典。
 *
 * 為什麼是產生檔案而不是加一個 dependency
 * ------------------------------------------------------------------
 * 來源資料（emoji-toolkit）解壓縮後有 6MB，而我們只需要其中的名字對照。
 * 每次 CI 跑 npm ci 都拉一份不划算，所以在本機產生一份 ~100KB 的 JSON
 * 進版控，build 時直接讀。要更新時重跑這支腳本即可（需要網路）。
 *
 *     node tools/gen-emoji-aliases.mjs
 *
 * 產物是「差集」不是完整字典 —— gemoji 的部分仍然由 markdown-it-emoji
 * 自己提供，套件升級時那邊會跟著更新，不會被這個檔案凍住。
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 放 tools/ 不放 scripts/：Hexo 會把 scripts/ 底下「每一個檔案」都當外掛載入
// （listDir 沒濾副檔名），.json 擺進去會噴 SyntaxError
const OUT = path.join(ROOT, 'tools', 'emoji-aliases.json');

const EMOJIBASE = '17.0.0';
const EMOJI_TOOLKIT = '10.0.0';

/**
 * 任何資料集裡都查不到的名字，手動補在這裡。
 *
 * :shocked_face_with_exploding_head: 是 U+1F92F 在 Emoji 5.0 剛出時的舊名，
 * 後來 Unicode 把它改名成 exploding head，於是現行的 emoji-toolkit、
 * emojibase（cldr / joypixels / emojibase / github 四套都查過）通通沒有這個字串。
 * 但使用者的舊筆記裡就是這樣寫的，只能手動對上去。
 */
const OVERRIDES = {
  shocked_face_with_exploding_head: '\u{1F92F}', // 🤯
};

// 下載一律用 curl —— 見 CLAUDE.md，實測部分 CDN 在這個環境下 node 的 fetch 會 TLS 失敗
function getJSON(url) {
  const buf = execFileSync('curl', ['-sfL', '--retry', '2', url], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(buf.toString('utf8'));
}

const hexToChar = (hex) =>
  hex
    .split('-')
    .map((h) => String.fromCodePoint(parseInt(h, 16)))
    .join('');

// 膚色變體（:wave_tone3:）數量龐大又幾乎沒人手打，排除掉
const isToneVariant = (hexcode, name) =>
  /1F3F[B-F]/i.test(hexcode) || /_tone\d/.test(name);

const gemojiMod = require('markdown-it-emoji/lib/data/full.mjs');
const gemoji = gemojiMod.default || gemojiMod;

const extra = Object.create(null);
const stats = {};
let skippedTone = 0;

function add(name, char, source) {
  name = String(name).replace(/^:|:$/g, '');
  if (!name || !char) return;
  if (Object.hasOwn(gemoji, name)) return; // gemoji 已經有了，不重複
  if (Object.hasOwn(extra, name)) return; // 先來的優先
  extra[name] = char;
  stats[source] = (stats[source] || 0) + 1;
}

// --- 來源 1：emojibase 的四套短碼命名 -------------------------------
for (const preset of ['joypixels', 'cldr', 'emojibase', 'github']) {
  const url = `https://unpkg.com/emojibase-data@${EMOJIBASE}/en/shortcodes/${preset}.json`;
  const data = getJSON(url);
  for (const [hexcode, value] of Object.entries(data)) {
    for (const name of [].concat(value)) {
      if (isToneVariant(hexcode, name)) {
        skippedTone++;
        continue;
      }
      add(name, hexToChar(hexcode), preset);
    }
  }
}

// --- 來源 2：emoji-toolkit（JoyPixels 官方包，含較舊的 alternates）---
{
  const data = getJSON(`https://unpkg.com/emoji-toolkit@${EMOJI_TOOLKIT}/emoji.json`);
  for (const e of Object.values(data)) {
    const hexcode = e.code_points?.fully_qualified || e.code_points?.base;
    if (!hexcode) continue;
    for (const name of [e.shortname, ...(e.shortname_alternates || [])]) {
      if (!name) continue;
      if (isToneVariant(hexcode, name)) {
        skippedTone++;
        continue;
      }
      add(name, hexToChar(hexcode), 'emoji-toolkit');
    }
  }
}

// --- 來源 3：手動補的 -----------------------------------------------
for (const [name, char] of Object.entries(OVERRIDES)) add(name, char, 'overrides');

// 排序後輸出，讓 diff 看得懂
const sorted = Object.fromEntries(
  Object.keys(extra)
    .sort()
    .map((k) => [k, extra[k]])
);

fs.writeFileSync(OUT, JSON.stringify(sorted, null, 0) + '\n');

console.log(`gemoji 內建     : ${Object.keys(gemoji).length}`);
for (const [k, v] of Object.entries(stats)) console.log(`  + ${k.padEnd(14)}: ${v}`);
console.log(`補充別名合計    : ${Object.keys(sorted).length}`);
console.log(`（略過膚色變體 ${skippedTone} 個）`);
console.log(`已寫入 ${path.relative(ROOT, OUT)}（${fs.statSync(OUT).size} bytes）`);
