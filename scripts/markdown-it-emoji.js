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

hexo.extend.filter.register('markdown-it:renderer', function(md) {
  // 這個 filter 每次 render 都會被呼叫，沒擋的話會重複註冊
  if (md.__emojiLoaded) return;
  md.__emojiLoaded = true;

  md.use(full, { shortcuts: {} });
});
