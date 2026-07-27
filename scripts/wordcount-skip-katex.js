/**
 * 字數統計：把 KaTeX 的 MathML 分身扣掉
 * ------------------------------------------------------------------
 * Fluid 的字數統計是「把文章的 HTML 去標籤、去空白，數剩下幾個字元」
 * （見 node_modules/hexo-theme-fluid/scripts/helpers/wordcount.js）。
 *
 * 問題出在 KaTeX 的輸出裡，同一條公式會被寫兩份：
 *
 *   <span class="katex">
 *     <span class="katex-mathml"><math>…<annotation>\frac{a}{b}</annotation></math></span>
 *     <span class="katex-html" aria-hidden="true">…實際看得到的字…</span>
 *   </span>
 *
 * 前者是給螢幕閱讀器和複製貼上用的，畫面上看不到，而且 annotation 裡放的是
 * LaTeX 原始碼（連反斜線和大括號都算進去）。去標籤之後兩份都會被數到，
 * 公式越多灌水越兇。這裡在計算前先把 katex-mathml 那一份拿掉，只留畫面上
 * 真的讀得到的內容。
 *
 * 掛載方式：覆寫主題註冊的三個 helper。
 *
 * 不能直接在檔案最外層註冊 —— Hexo 是用 bluebird 的 .map 併發載入主題的
 * scripts/ 和這裡的 scripts/（見 node_modules/hexo/dist/hexo/load_plugins.js
 * 的 loadScripts），誰先誰後不保證。所以改成掛在 after_init filter，那個時間
 * 點所有外掛都載完了，覆寫一定蓋得過去。
 *
 * 三個 helper 要一起覆寫：主題那邊每個 helper 各自閉包了一份 getWordCount，
 * 只換掉其中一個會讓「字數」和「閱讀時間」用不同的基準。
 */

'use strict';

const { stripHTML } = require('hexo-util');

// KaTeX 一定會把 mathml 這份包成 <span class="katex-mathml">…</math></span>，
// 用 </math></span> 收尾比數巢狀 <span> 可靠。
const KATEX_MATHML = /<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g;

const getWordCount = (post) => {
  if (!post.wordcount) {
    // post.origin 是 hexo-blog-encrypt 加密前的原文，跟著主題一起保留
    const content = stripHTML((post.origin || post.content || '').replace(KATEX_MATHML, ''))
      .replace(/[\s\r\n]/g, '');
    post.wordcount = content.length;
  }
  return post.wordcount;
};

// 以下兩個函式與主題行為一致，只是改用上面的 getWordCount
const symbolsCount = (count) => {
  if (count > 9999) {
    count = Math.round(count / 1000) + 'k'; // > 9999 => 11k
  } else if (count > 999) {
    count = (Math.round(count / 100) / 10) + 'k'; // > 999 => 1.1k
  } // < 999 => 111
  return count;
};

hexo.extend.filter.register('after_init', function() {
  const helper = this.extend.helper;

  helper.register('min2read', (post, { awl, wpm }) => {
    return Math.floor(getWordCount(post) / ((awl || 2) * (wpm || 60))) + 1;
  });

  helper.register('wordcount', (post) => {
    return symbolsCount(getWordCount(post));
  });

  helper.register('wordtotal', (site) => {
    let count = 0;
    site.posts.forEach(post => {
      count += getWordCount(post);
    });
    return symbolsCount(count);
  });
});
