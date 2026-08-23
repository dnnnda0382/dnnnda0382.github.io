#!/usr/bin/env node
/**
 * 把文章的 date 改成當下時間（＝真正的發布時間）
 * ------------------------------------------------------------------
 *   npm run redate "114-2 台大資工大一下修課心得"
 *   npm run redate                       # 不給參數就列出文章
 *   npm run redate -- --drafts "標題"    # 改找 source/_drafts
 *   node tools/redate.mjs <檔案路徑>      # 直接指定檔案（給腳本呼叫用）
 *
 * 為什麼需要這個
 * ------------------------------------------------------------------
 * date 是「建立文章的時間」，不是「發布的時間」。草稿放了兩個月才發，
 * date 就會停在兩個月前 —— 首頁排序、封存頁、RSS 全都會用那個過期的時間。
 *
 * 為什麼不做成 git hook 自動蓋
 * ------------------------------------------------------------------
 * permalink 是 :year/:month/:day/:title/，date 一動網址就跟著換。做成
 * pre-commit 自動蓋的話，改個錯字都會把已經上線的文章網址換掉，舊連結
 * 全部 404。改 date 必須是明確的動作，所以這裡要按 y。
 *
 * 只改 date: 那一行的原始字串，不重新序列化整段 YAML —— 不然引號、欄位
 * 順序、日期格式都可能被 parser 改掉，diff 會變得很難看。
 *
 * 注意：這個檔案放在 tools/ 而不是 scripts/，因為 Hexo 會把根目錄 scripts/
 *      底下的檔案當成外掛自動載入。
 */

'use strict';

import fs from 'fs';
import path from 'path';
import readline from 'node:readline/promises';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

const POSTS = 'source/_posts';
const DRAFTS = 'source/_drafts';

const pad2 = n => String(n).padStart(2, '0');
const fmt = d =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const die = msg => { console.error(`✗ ${msg}`); process.exit(1); };

const list = dir =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')).sort()
    : [];

/** 依序嘗試：檔案路徑 → 完全相同 → 忽略大小寫 → 部分比對（跟 publish-draft.sh 同一套） */
function resolveFile(name, dir) {
  if (name.endsWith('.md') && fs.existsSync(name)) return name;

  const bare = name.replace(/\.md$/, '');
  if (fs.existsSync(path.join(dir, `${bare}.md`))) return path.join(dir, `${bare}.md`);

  const names = list(dir);
  const lower = bare.toLowerCase();
  let hits = names.filter(n => n.toLowerCase() === lower);
  if (!hits.length) hits = names.filter(n => n.toLowerCase().includes(lower));

  if (!hits.length) {
    console.error(`✗ 找不到文章：${bare}\n`);
    console.error(`${dir} 裡有：`);
    names.forEach(n => console.error(`  ${n}`));
    process.exit(1);
  }
  if (hits.length > 1) {
    console.error(`✗ 有多篇符合「${bare}」，請給更完整的名稱：`);
    hits.forEach(n => console.error(`  ${n}`));
    process.exit(1);
  }
  return path.join(dir, `${hits[0]}.md`);
}

/**
 * 這篇現在是不是已經對外可見？
 *
 * 看的是 HEAD 裡的版本而不是工作目錄 —— 還沒 commit 的 published: true 不算
 * 上線，網站上還是舊的。只有「已經在版控裡」而且「HEAD 裡不是 published:
 * false」的文章才真的有一個活著的網址會被改壞。
 */
function isLive(file) {
  let head;
  try {
    head = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return false;   // 沒進版控 = 沒上線過
  }
  return !/^published:\s*false\s*$/m.test(head);
}

/** 用 _config.yml 的 permalink 算出網址，讓使用者看得到到底會變成什麼 */
function permalinkOf(file, y, m, d) {
  const cfg = fs.readFileSync('_config.yml', 'utf8');
  const pattern = (cfg.match(/^permalink:\s*(\S+)/m) || [])[1];
  if (!pattern || !/:year|:month|:day/.test(pattern)) return null;
  return '/' + pattern
    .replace(/:year/g, y).replace(/:month/g, m).replace(/:day/g, d)
    .replace(/:title/g, path.basename(file, '.md'));
}

// ── 解析參數 ──────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const rest = argv.filter(a => !a.startsWith('--'));
const dir = flags.has('--drafts') ? DRAFTS : POSTS;

if (!rest.length) {
  console.log('用法: npm run redate "文章標題"');
  console.log('      把該篇的 date 改成現在，也就是真正的發布時間\n');
  console.log(`${dir} 裡有：`);
  list(dir).forEach(n => console.log(`  ${n}`));
  process.exit(1);
}

const file = resolveFile(rest.join(' '), dir);
const src = fs.readFileSync(file, 'utf8');

// ── 取出 front-matter ────────────────────────────────────────
const fmMatch = src.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
if (!fmMatch) die(`${file} 沒有 --- 圍起來的 front-matter`);

const [, open, body, close] = fmMatch;
const oldLine = (body.match(/^date:[^\r\n]*$/m) || [])[0];
const now = new Date();
const newLine = `date: ${fmt(now)}`;

if (oldLine && oldLine.trim() === newLine) {
  console.log(`date 已經是 ${fmt(now)} 了，沒有動任何東西`);
  process.exit(0);
}

// ── 說明會發生什麼事 ─────────────────────────────────────────
const ymd = oldLine ? oldLine.match(/(\d{4})-(\d{2})-(\d{2})/) : null;
const oldUrl = ymd ? permalinkOf(file, ymd[1], ymd[2], ymd[3]) : null;
const newUrl = permalinkOf(file, now.getFullYear(), pad2(now.getMonth() + 1), pad2(now.getDate()));

console.log(`${file}\n`);
console.log(`  date  ${oldLine ? oldLine.replace(/^date:\s*/, '') : '(沒有這個欄位，會補上)'}`);
console.log(`     →  ${fmt(now)}\n`);

if (oldUrl && newUrl && oldUrl !== newUrl) {
  console.log(`  網址  ${oldUrl}`);
  console.log(`     →  ${newUrl}\n`);
  if (isLive(file)) {
    console.log('⚠️  這篇已經上線了，改完舊網址會變成 404。');
    console.log('   別人存的書籤、貼出去的連結、搜尋引擎收錄的結果都會失效。\n');
  } else {
    console.log('這篇還沒對外發布過（不在版控裡，或 HEAD 裡是 published: false），');
    console.log('所以沒有舊網址會被弄壞。\n');
  }
} else if (/^updated:/m.test(body)) {
  console.log('（front-matter 有自己的 updated:，不會被動到）\n');
}

// ── 確認 ─────────────────────────────────────────────────────
if (process.env.REDATE_YES !== '1') {
  if (!process.stdin.isTTY) {
    die('不是互動式終端機，無法確認。要在腳本裡跑請加 REDATE_YES=1');
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('確定要改嗎？[y/N] ')).trim().toLowerCase();
  rl.close();
  if (answer !== 'y' && answer !== 'yes') {
    console.log('已取消，沒有動任何檔案');
    process.exit(0);
  }
}

// ── 寫回（只換 date: 那一行）──────────────────────────────────
let newBody;
if (oldLine) {
  newBody = body.replace(/^date:[^\r\n]*$/m, newLine);
} else if (/^title:[^\r\n]*$/m.test(body)) {
  // 沒有 date 欄位就補在 title 後面，跟 scaffolds/post.md 的順序一致
  newBody = body.replace(/^(title:[^\r\n]*)$/m, `$1\n${newLine}`);
} else {
  newBody = `${newLine}\n${body}`;
}

fs.writeFileSync(file, src.replace(fmMatch[0], open + newBody + close));

console.log(`\n✓ date 已改成 ${fmt(now)}`);
if (newUrl) console.log(`  網址：${newUrl}`);
