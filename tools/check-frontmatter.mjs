#!/usr/bin/env node
/**
 * 檢查文章的 front-matter 有沒有缺欄位
 * ------------------------------------------------------------------
 *   npm run check                    # 掃 source/_posts
 *   npm run check -- --drafts        # 改掃 source/_drafts
 *   node tools/check-frontmatter.mjs <檔案>   # 單一檔案，印詳細說明
 *
 * 單檔模式是給 tools/publish-draft.sh 用的 —— 「哪些欄位算填了」這件事只在
 * 這裡定義一次，發布前的提醒和這個盤點表才不會各說各話。
 *
 * 用 hexo-front-matter 解析而不是 grep：YAML 的寫法太多（[a, b] / 條列式 /
 * 引號有無），grep 判斷不準，而這個 parser 就是 Hexo build 時用的那個。
 *
 * 一律以離開碼 0 結束，就算有缺也一樣 —— 這是給人看的提醒，不是把關。
 * 缺 tags / categories / description 都不影響網站能不能 build。
 */

'use strict';

import fm from 'hexo-front-matter';
import fs from 'fs';
import path from 'path';

// 要檢查的欄位，以及沒填的後果
const FIELDS = [
  ['tags', '標籤頁不會收錄這篇'],
  ['categories', '分類頁不會收錄這篇'],
  ['description', '分享連結時預覽會抓內文前 200 字，通常會斷在半句話'],
];

const isEmpty = v =>
  v == null || (Array.isArray(v) && v.length === 0) || String(v).trim() === '';

// 中文字在終端機佔兩格，要自己算寬度，不然表格會歪
const width = s => [...s].reduce((n, c) => n + (c.charCodeAt(0) > 127 ? 2 : 1), 0);
const pad = (s, w) => s + ' '.repeat(Math.max(0, w - width(s)));

const read = file => fm.parse(fs.readFileSync(file, 'utf8'));

/** 單一檔案：印出每個欄位的狀態和後果，給發布前的確認用 */
function checkOne(file) {
  const data = read(file);
  const missing = [];
  console.log('front-matter 檢查：');
  for (const [key, hint] of FIELDS) {
    const v = data[key];
    if (isEmpty(v)) {
      missing.push(key);
      console.log(`  ✗ ${pad(key, 12)}缺少 —— ${hint}`);
    } else {
      console.log(`  ✓ ${pad(key, 12)}${Array.isArray(v) ? `[${v.join(', ')}]` : v}`);
    }
  }
  if (missing.length) {
    console.log('');
    console.log(`⚠️  有 ${missing.length} 個欄位沒填：${missing.join('、')}`);
    console.log('   照樣可以發布，之後補上再 push 也會生效（不影響網址）。');
  }
}

/** 整個資料夾：印成表格 */
function checkDir(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`✗ 找不到 ${dir}`);
    return;
  }
  const rows = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => {
      const data = read(path.join(dir, f));
      return {
        name: f.replace(/\.md$/, ''),
        // published: false 的文章不會出現在網站上，缺欄位的影響小很多
        hidden: data.published === false,
        missing: FIELDS.filter(([k]) => isEmpty(data[k])).map(([k]) => k),
      };
    });

  if (!rows.length) {
    console.log(`${dir} 裡沒有文章`);
    return;
  }

  const labels = rows.map(r => r.name + (r.hidden ? ' (未發布)' : ''));
  const w = Math.max(width('文章'), ...labels.map(width));

  // 每個欄位固定 4 格寬（表頭取前 4 個字），符號置中
  const head = FIELDS.map(([k]) => k.slice(0, 4).padEnd(4)).join(' ');
  console.log(`${pad('文章', w)}  ${head}`);
  console.log('─'.repeat(w + 2 + head.length));
  rows.forEach((r, i) => {
    const marks = FIELDS.map(([k]) => ` ${r.missing.includes(k) ? '✗' : '✓'}  `).join(' ');
    console.log(`${pad(labels[i], w)}  ${marks}`);
  });

  const incomplete = rows.filter(r => r.missing.length && !r.hidden);
  console.log('');
  if (incomplete.length) {
    console.log(`${incomplete.length}/${rows.filter(r => !r.hidden).length} 篇還有欄位沒填`);
  } else {
    console.log('✓ 全部填齊了');
  }
}

const args = process.argv.slice(2);
const files = args.filter(a => !a.startsWith('--'));

if (files.length) files.forEach(checkOne);
else checkDir(args.includes('--drafts') ? 'source/_drafts' : 'source/_posts');
