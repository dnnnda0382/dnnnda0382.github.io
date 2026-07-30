/**
 * emoji 短碼：:smile: → 😄
 * ------------------------------------------------------------------
 * HackMD 支援這個語法，markdown-it 沒有內建，所以從 HackMD 搬過來的筆記裡的
 * :smile: 原本會原封不動印成文字。這裡掛上官方的 markdown-it-emoji 外掛。
 *
 * 為什麼不寫進 _config.yml 的 markdown.plugins
 * ------------------------------------------------------------------
 * 那個欄位的處理方式是 parser.use(require(套件名))（見
 * node_modules/hexo-renderer-markdown-it/lib/renderer.js 第 55 行），
 * 直接把 module 當函式用。但 markdown-it-emoji 從 v3 起匯出的是
 * { bare, full, light } 物件而不是函式，塞進去會壞。
 *
 * 所以跟 markdown-it-spoiler.js 一樣走 markdown-it:renderer filter，
 * 自己挑要用哪個字典。
 *
 * 用 full 而不是 light：light 的字典比較小，實際用到的 :clown_face: 就不在裡面。
 *
 * 補充別名表
 * ------------------------------------------------------------------
 * full 用的是 GitHub 的 gemoji 命名，但 HackMD 用的是 JoyPixels / CLDR 那套，
 * 同一個 emoji 名字對不上就會原封不動印出來，例如 🤯 在 gemoji 叫
 * :exploding_head:，HackMD 貼過來卻是 :shocked_face_with_exploding_head:。
 *
 * emoji-aliases.json 收了 JoyPixels / CLDR / emojibase 幾套命名裡「gemoji 沒有」
 * 的名字（約 1900 個），合併進字典當別名。那個檔案由 tools/gen-emoji-aliases.mjs
 * 產生，不要手改 —— 要補漏網之魚請改那支腳本裡的 OVERRIDES 再重跑。
 *
 * 合併時 gemoji 在前、別名在後，但別名表本來就已經扣掉 gemoji 有的鍵，
 * 所以誰蓋誰不影響結果。膚色變體（:wave_tone3:）沒收，數量太多又幾乎沒人手打。
 *
 * shortcuts 設成空物件，關掉 ASCII 表情的自動轉換
 * ------------------------------------------------------------------
 * full 預設會把 :) :D :P :/ :( ;) :| :O <3 這些也轉成 emoji。問題出在 :/ ——
 * 技術文章裡到處都是 https:// 這種東西，雖然實測 markdown-it 會把網址處理成
 * link token、不會誤轉，但那是「剛好沒事」而不是「保證沒事」：只要哪天有人在
 * 行內寫了不成網址的 a:/b，或是貼了沒被 linkify 認出來的字串，就會莫名其妙冒出
 * 一個 😕。
 *
 * emoji 短碼（:smile:）本來就是明確的意圖，ASCII 表情則是猜測，所以只留前者。
 * 真的想要 :) 自動變 emoji 的話，把 shortcuts 那行拿掉即可。
 */

'use strict';

const { full } = require('markdown-it-emoji');

// markdown-it-emoji 的 full 一收到 defs 就是「整份取代」而不是合併
// （見 node_modules/markdown-it-emoji/lib/full.mjs 的 Object.assign），
// 所以要自己把內建字典撈出來一起併。package.json 的 exports 有開 "./*"，
// 這條路徑是可以 require 的。
const gemojiModule = require('markdown-it-emoji/lib/data/full.mjs');
const gemoji = gemojiModule.default || gemojiModule;
// 別名表刻意放在 tools/ 而不是這裡 —— Hexo 載外掛時是 listDir(scripts/) 撈「全部
// 檔案」下去 loadPlugin，沒有濾副檔名（見 node_modules/hexo/dist/hexo/load_plugins.js
// 的 loadScripts），.json 放這個資料夾會被當成 .js 載入而噴 SyntaxError。
const aliases = require('../tools/emoji-aliases.json');

const defs = Object.assign({}, gemoji, aliases);

hexo.extend.filter.register('markdown-it:renderer', function(md) {
  // 這個 filter 每次 render 都會被呼叫，沒擋的話會重複註冊
  if (md.__emojiLoaded) return;
  md.__emojiLoaded = true;

  md.use(full, { defs, shortcuts: {} });
});

/**
 * 沒對到的短碼在 build 時警告
 * ------------------------------------------------------------------
 * 字典再大也一定有漏（HackMD 的舊命名就是這樣跑出來的），而漏掉的症狀是
 * 短碼原樣印在文章裡 —— 除非剛好讀到那一段，不然不會發現。這裡在算圖之後
 * 掃一次渲染結果，有殘留就在 build log 提醒，但不擋 build。
 *
 * 只掃內文、掃之前先把 <pre>/<code> 拿掉，避免程式碼裡的 a:b: 被誤報；
 * 純數字的（時間 10:45:30）也跳過。
 */
const SHORTCODE_RE = /:([a-z0-9][a-z0-9_+-]{1,58}[a-z0-9]):/g;

hexo.extend.filter.register('after_post_render', function(data) {
  const text = String(data.content || '')
    .replace(/<(pre|code|script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  const found = new Set();
  let m;
  while ((m = SHORTCODE_RE.exec(text)) !== null) {
    if (!/^\d+$/.test(m[1])) found.add(m[1]);
  }

  if (found.size) {
    hexo.log.warn(
      `[emoji] ${data.source}：有 ${found.size} 個短碼查不到對應的 emoji ——`
        + ` ${[...found].map((n) => ':' + n + ':').join(' ')}`
        + `（補在 tools/gen-emoji-aliases.mjs 的 OVERRIDES 再重跑那支腳本）`
    );
  }

  return data;
});
