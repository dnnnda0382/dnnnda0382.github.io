/**
 * 行內暴雷語法：||被遮住的內容||
 * ------------------------------------------------------------------
 * 這是 HackMD 自己的擴充語法，markdown-it 沒有內建，所以從 HackMD 搬過來的筆記裡的
 * ||...|| 原本會原封不動印成文字。這個外掛把它補回來。
 *
 * 渲染結果是 <span class="spoiler" tabindex="0">，樣式寫在 source/css/custom.css，
 * 點一下（或用鍵盤 Tab 選到）才會顯示內容 —— 純 CSS 的 :focus，不需要 JS。
 *
 * 掛載方式是 hexo-renderer-markdown-it 提供的 markdown-it:renderer filter
 * （見 node_modules/hexo-renderer-markdown-it/lib/renderer.js 最後的 render()）。
 * 不能寫進 _config.yml 的 markdown.plugins，那個欄位只吃得下 npm 套件名稱。
 *
 * Hexo 會自動載入 scripts/ 底下的 .js 當外掛，所以這個檔案不需要被誰 require。
 */

'use strict';

const PIPE = 0x7c; // |
const BACKSLASH = 0x5c; // \

/**
 * 行內規則本體：在 || 的位置嘗試往後找收尾的 ||。
 */
function spoilerInline(state, silent) {
  const start = state.pos;
  const max = state.posMax;

  // 至少要有 ||x|| 這麼長
  if (start + 4 > max) return false;
  if (state.src.charCodeAt(start) !== PIPE) return false;
  if (state.src.charCodeAt(start + 1) !== PIPE) return false;

  // 往後找收尾的 ||，被反斜線跳脫的不算
  let found = -1;
  for (let pos = start + 2; pos + 1 < max; pos++) {
    if (
      state.src.charCodeAt(pos) === PIPE &&
      state.src.charCodeAt(pos + 1) === PIPE &&
      state.src.charCodeAt(pos - 1) !== BACKSLASH
    ) {
      found = pos;
      break;
    }
  }

  // 找不到收尾，或內容是空的（||||）→ 放棄，讓它照原樣印出來
  if (found < 0 || found === start + 2) return false;

  if (!silent) {
    const open = state.push('spoiler_open', 'span', 1);
    open.attrSet('class', 'spoiler');
    open.attrSet('tabindex', '0'); // 可被點擊 / 鍵盤 focus，CSS 才有辦法切換顯示

    // 內容再跑一次行內解析，這樣 ||**粗體**|| 或 ||$x^2$|| 裡面的語法都還會正常渲染
    const oldPos = state.pos;
    const oldMax = state.posMax;
    state.pos = start + 2;
    state.posMax = found;
    state.md.inline.tokenize(state);
    state.pos = oldPos;
    state.posMax = oldMax;

    state.push('spoiler_close', 'span', -1);
  }

  state.pos = found + 2;
  return true;
}

/**
 * 讓 tokenizer 有機會在 || 停下來。
 *
 * markdown-it 的 text 規則會一路吃掉普通字元，只在「終止字元」前停手，而 `|` 刻意
 * 不在那份清單裡（見 node_modules/markdown-it/lib/rules_inline/text.mjs）。結果就是
 * 句子中間的 ||...|| 永遠等不到任何規則來處理它。
 *
 * 這裡不去複製那份終止字元清單（markdown-it 一改版就會失準），而是包住原本的 text
 * 規則：讓它照常吃，吃完發現裡面有 || 就把多吃的吐回去，把游標停在 || 前面。
 */
function stopTextAtPipes(md) {
  const rule = md.inline.ruler.__rules__.find(r => r.name === 'text');
  if (!rule) {
    // 與其安靜地不生效，不如讓 build 直接失敗，比較好察覺
    throw new Error('[markdown-it-spoiler] 找不到 markdown-it 的 text 規則，請確認 markdown-it 版本');
  }
  const originalText = rule.fn;

  md.inline.ruler.at('text', function(state, silent) {
    const start = state.pos;
    if (!originalText(state, silent)) return false;

    const chunk = state.src.slice(start, state.pos);
    // 從 1 開始找：位置 0 的 || 代表 spoiler 規則剛剛已經試過而且放棄了，
    // 這時要讓 text 照常把它吃掉，不然會在原地無限迴圈。
    const idx = chunk.indexOf('||', 1);
    if (idx < 0) return true;

    if (!silent) {
      state.pending = state.pending.slice(0, state.pending.length - (chunk.length - idx));
    }
    state.pos = start + idx;
    return true;
  });
}

hexo.extend.filter.register('markdown-it:renderer', function(md) {
  // 這個 filter 每次 render 都會被呼叫，沒擋的話規則會被重複註冊
  if (md.__spoilerRuleLoaded) return;
  md.__spoilerRuleLoaded = true;

  stopTextAtPipes(md);

  // 排在 text 之前，才能在 || 的位置搶先處理。
  // 這樣也排在 backticks 之前，但不影響行內程式碼 —— `a || b` 的起點是反引號，
  // spoiler 規則在那個位置直接回 false，整段 code span 會被 backticks 規則整個吃掉。
  // ``` 圍起來的程式碼區塊是 block 層級的，根本不會進到行內解析。
  md.inline.ruler.before('text', 'spoiler', spoilerInline);
});
