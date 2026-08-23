# 個人筆記網站 — 操作手冊

用 Markdown 寫筆記,push 就自動發布。支援 LaTeX 數學公式、程式碼高亮、自動目錄、
站內搜尋、深色模式、RSS,以及 HackMD 那套 `||暴雷||` 和 `:smile:` 語法。

- **網站**:https://dnnnda0382.github.io
- **本機預覽**:http://localhost:4000
- **技術**:Hexo 8 + Fluid 主題(細節見 [CLAUDE.md](CLAUDE.md))

> 這份是給**你自己**看的操作速查。`CLAUDE.md` 是給 Claude Code 看的專案規範,
> 內容是「不准改哪些檔案」「改完要驗證什麼」那類約束,平常不用讀。

---

## 日常:發一篇新文章

```bash
cd ~/homepage
npm run new "文章標題"     # 建立檔案並印出路徑
# ...用編輯器把內容寫完...
git add .
git commit -m "post: 文章標題"
git push
```

推上去之後 GitHub Actions 會自動 build 並發布,大約 1-2 分鐘後網站就更新了。
**不需要**在本機跑 build,也**不需要**碰 `public/` 資料夾。

想先在本機看看長怎樣:

```bash
npm run server      # 開 http://localhost:4000,存檔會自動重新整理
```

按 `Ctrl+C` 結束。

### 文章開頭的 front-matter

`npm run new` 會自動產生這段,把 `tags`、`categories`、`description` 填一填就好:

```yaml
---
title: 線性代數筆記
date: 2026-07-25 16:21:21
tags: [數學, 筆記]
categories: [筆記]
description: '用高中生看得懂的方式重新整理線性代數的核心概念。'
---

這段會出現在首頁當摘要。

<!-- more -->

這條線以下的內容要點進文章才看得到。
```

`categories` 通常只填一個。填兩個以上會被當成階層(`[數學, 線性代數]` = 「數學 > 線性代數」),不是並列。

`description` 是**把連結貼到 Discord / LINE 時,預覽卡片上顯示的那段字**,也會當成
首頁列表的摘要。不填的話系統會退而抓內文前 200 字,結果通常是標題和內文擠在一起、
句子斷在半句話。通常複製第一段貼進來就夠了。

想知道哪幾篇還沒填,跑:

```bash
npm run check              # 盤點 source/_posts 缺哪些欄位
npm run check -- --drafts  # 改看草稿
```

`npm run draft:publish` 在發布前也會自動提醒缺什麼。這三個欄位事後補上再 push 都會
生效,**不影響網址**——會改到網址的只有「檔名」和「date」。

### 文章擱了一陣子才發,想讓時間顯示成「現在」

`date` 填的是**建立**文章的時間,不是發布的時間。寫了一半放兩個月才發的話,那篇在
首頁排序、封存頁、RSS 裡用的都還是兩個月前的時間。要蓋成現在:

```bash
npm run redate "114-2 台大資工大一下修課心得"
```

它會先印出新舊時間和**新舊網址**再問你要不要改:

```
  date  2026-06-30 16:24:46
     →  2026-08-23 14:05:12

  網址  /2026/06/30/114-2 台大資工大一下修課心得/
     →  /2026/08/23/114-2 台大資工大一下修課心得/

確定要改嗎？ [y/N]
```

標題不用打全,打得出來能認出是哪篇就行(會做部分比對,有多篇符合會列出來讓你選)。

> ⚠️ **已經上線的文章不要改。** date 一動網址就跟著換,舊網址會變成 404 ——
> 別人存的書籤、貼出去的連結、搜尋引擎收錄的結果全部失效。
>
> 這個指令會自己判斷:如果那篇已經推上去而且是公開的,它會多印一段警告;
> 還沒發布過的(還沒 commit,或標了 `published: false`)則會告訴你沒有舊網址會壞。
> 看清楚再按 y。

從 `_drafts` 發布的文章**不用手動跑這個** —— `npm run draft:publish` 已經會自動蓋成
發布當下的時間了(見下方「私人草稿庫 → 日常用法」)。

### 藏答案 / 暴雷遮蔽

跟 HackMD 一樣,用兩條直線把內容包起來:

```markdown
答案是 ||C。因為前提不成立|| ,想清楚再點開。
```

顯示成一條色塊,**點一下才會露出來**(手機點、電腦用鍵盤 Tab 選到也可以)。
裡面照樣可以放粗體、連結、`$公式$`。

程式碼不會被誤傷 —— 行內的 `` `a || b` `` 和 ``` ``` ``` 圍起來的程式碼區塊裡的
`||` 都維持原樣,C++ 的「或」照樣是「或」。

### emoji 短碼

`:smile:` 這種寫法會變成 😄。HackMD 用的命名跟 GitHub 那套常常對不上(同一個 emoji
兩邊叫不同名字),所以額外補了一份約 1900 個的別名表,兩套寫法都吃得下。

查不到的短碼**會在 `npm run build` 時警告**,像這樣:

```
WARN [emoji] _posts/xxx.md：有 1 個短碼查不到對應的 emoji —— :foo_bar:
```

所以不用自己去翻文章找漏網之魚,build 的輸出會講。(`:)` `:D` 這種顏文字**不會**
被自動轉換,那是刻意關掉的,免得誤傷。)

### 上標下標寫不出來?

`^上標^` 和 `~下標~` 這兩個 HackMD 語法**刻意沒有支援**。掃過全站後發現 `^...^`
和 `~...~` 幾乎都不是上下標的意思 —— 被消音的髒話 `@#^%&^`、時間區間 `10:20~12:20`、
LaTeX 裡的 `$O(n\cdot 2^n)$`,支援下去這些全部會壞掉。

要寫上下標就用 LaTeX:`$x^2$`、`$a_1$`,站上本來就有 KaTeX。

### 三種「不公開」的差別

|  | 出現在網站 | 出現在公開 repo | 用在什麼情況 |
|---|---|---|---|
| 一般文章 | ✅ | ✅ | 要發布的 |
| `published: false` | ❌ | ✅ | 不想放上網站,但被翻到也無所謂 |
| 放 `source/_drafts/` | ❌ | ❌ | **真的不能外流的** |

`published: false` **不是隱私機制** —— 檔案還在公開 repo 裡,任何人都讀得到。
不能外流的東西一律放 `_drafts`。

---

## 架站設定(**已完成**,留存備查)

站台已經上線在 https://dnnnda0382.github.io ,以下留著是為了換電腦或哪天要重來時參考。
日常發文完全用不到這一節。

### 1. 在 GitHub 建立 repo

Repo 名稱必須**完全等於** `dnnnda0382.github.io`,大小寫和後綴都不能差。
名稱對了,網址才會是 `https://dnnnda0382.github.io`。

建立時**不要**勾選「Add a README file」或任何初始化選項,保持空的。

### 2. 推上去

```bash
cd ~/homepage
git remote add origin git@github.com:dnnnda0382/dnnnda0382.github.io.git
git push -u origin main
```

> 這裡用的是 **SSH** 網址(`git@github.com:帳號/repo.git`),因為這台機器是用 SSH key
> 連 GitHub。不要用 GitHub 網頁上預設顯示的 `https://` 網址 —— 那個會要求帳密,
> 而 GitHub 早就不接受密碼認證了。
>
> 如果不小心設成 https,不用重來,直接改掉就好:
>
> ```bash
> git remote set-url origin git@github.com:dnnnda0382/dnnnda0382.github.io.git
> git remote -v                     # 確認改好了
> ```
>
> 測試 SSH 通不通:`ssh -T git@github.com`
> (成功時會回 `Hi dnnnda0382! You've successfully authenticated...`,
> 然後以 exit code 1 結束 —— **這是正常的**,不是錯誤。)

### 3. 開啟 GitHub Pages(**已完成**)

推上去之後,GitHub Actions 會自動跑一次,建立出 `gh-pages` branch。等它跑完(repo 的 **Actions** 頁籤看得到進度),然後:

**Settings → Pages → Source** 選 **Deploy from a branch**,branch 選 **`gh-pages`**,資料夾選 **`/ (root)`**,按 Save。

首次部署通常要等幾分鐘網址才會生效。

---

## 私人草稿庫

> **原則:不確定能不能公開的,一律先放 `_drafts`。**
>
> 放錯邊的代價完全不對等 —— 放 `_drafts` 只是晚點發布,放 `_posts` 則是立刻公開。
> 而且**東西一旦進了公開 repo,實務上就收不回來了**:
> 2026-07-25 那次誤發一篇比賽題解,光移除檔案不夠、改寫 git 歷史也不夠
> (GitHub 不會立即回收孤立的 commit,舊 SHA 照樣拿得到內容),
> 最後是整個 repo 刪掉重建才清乾淨。

因為 repo 是 public,放進去的東西就等於公開 —— **即使文章標了未發布,檔案還是躺在 repo 裡讓人看得到**。所以寫到一半的、或根本不打算公開的筆記,要放在另一個地方。

作法是:`source/_drafts/` 這個資料夾**不進這個 repo**(已寫進 `.gitignore`),它自己是一個獨立的 git repo,推到你的**私人** remote。

### 一次性設定(**已完成**)

草稿庫用的是 private repo [`private_notes`](https://github.com/dnnnda0382/private_notes)。
GitHub 的私人 repo 是免費的 —— 要付費的只有「從 private repo 發布 Pages」,而我們不需要那個。

設定已經做好了,以下留存供換電腦時參考:

```bash
cd ~/homepage/source/_drafts
git init -b main
git remote add origin git@github.com:dnnnda0382/private_notes.git
git add -A && git commit -m "init: 私人筆記庫"
git push -u origin main
```

換新電腦時是用 clone 的,不是重跑上面那段:

```bash
git clone git@github.com:dnnnda0382/dnnnda0382.github.io.git ~/homepage
cd ~/homepage && npm install
git clone git@github.com:dnnnda0382/private_notes.git source/_drafts
```

### 日常用法

```bash
npm run draft "還沒想好的標題"    # 建立草稿（存到 source/_drafts/）
npm run server:draft              # 預覽時把草稿也顯示出來
npm run draft:publish "標題"      # 決定要發了 → 移到 source/_posts/
```

`draft:publish` 會**自動把 `date` 蓋成發布當下的時間**,因為草稿的 date 是建立時間,
放久了就過期了。確認畫面上會寫清楚時間會變成什麼:

```
準備發布：
  來源  source/_drafts/某某筆記.md
  目標  source/_posts/某某筆記.md
  時間  2026-05-01 09:00:00 → 2026-08-23 14:05:12（發布時間；要保留原本的請加 --keep-date）
```

想留著原本的日期就加 `--keep-date`:

```bash
npm run draft:publish --keep-date "某篇 HackMD 舊筆記"
```

從 HackMD 搬進來的舊筆記通常會想留當初寫的日期,不然時間軸會錯亂 —— 2024 年寫的
筆記變成今天發的,排在最上面。

草稿的備份跟發布是**兩個獨立的 repo**,各推各的:

```bash
cd ~/homepage/source/_drafts && git add -A && git commit -m "wip" && git push   # 備份草稿
cd ~/homepage && git add -A && git commit -m "post: 標題" && git push           # 發布文章
```

### 這樣設計的好處

- **草稿是私密的**,但一樣有版控、有雲端備份,不會因為電腦壞掉就沒了
- **本機預覽是完整的** —— `npm run server:draft` 會用跟正式站一樣的方式渲染,LaTeX 公式、程式碼高亮、目錄全都看得到,不像純文字編輯器只能看原始碼
- **發布只是移動檔案**,`npm run draft:publish` 會把檔案從 `_drafts` 搬到 `_posts`,不用複製貼上
- **不用依賴 HackMD**

---

## 常見任務速查

改完設定記得先 `npm run server` 看一下沒壞再 commit。

| 想做什麼 | 改哪個檔 | 改什麼 |
|----------|----------|--------|
| 改網站標題 | `_config.yml`<br>`_config.fluid.yml` | `title:`<br>`navbar.blog_title` (兩個都要改) |
| 改首頁那句標語 | `_config.fluid.yml` | `index.slogan.text` |
| 換網站上的圖片 | `_config.fluid.yml` | 見下方(橫幅、favicon、頭像) |
| 改程式碼配色 | `_config.fluid.yml` | `code.highlight.prismjs.style` / `style_dark` |
| 改網站配色 | `_config.fluid.yml` | `color:` 底下那一長串(每個顏色都有 `_dark` 版) |
| 改深色/淺色預設 | `_config.fluid.yml` | `dark_mode.default`(現在是 `dark`) |
| 微調任何樣式 | `source/css/custom.css` | 直接寫 CSS |
| 改文章網址格式 | `_config.yml` | `permalink:` |
| 讓發布時間顯示成現在 | — | `npm run redate "標題"`,見上方 |
| 改關於頁 | `source/about/index.md` | 直接寫 Markdown |
| 加留言系統 | `_config.fluid.yml` | 見下方(目前**沒裝**) |
| 看有多少人來看 | — | 見下方「訪問統計」 |
| 讓 Google 搜得到 | — | 見下方「搜尋引擎收錄」 |
| 搬 HackMD 筆記 | — | 見下方(已全部搬完) |

### 換網站上的圖片

網站上的圖**都已經換成你自己的了**,放在 `source/img/`:

| 你看到的東西 | 現在用的檔案 | 設定在哪(`_config.fluid.yml`) |
|---|---|---|
| **每一頁頂端的大橫幅** | `cover.jpg` | `index` / `archive` / `category` / `tag` / `about` / `post` 底下各自的 `banner_img` |
| 瀏覽器分頁的小圖示 | `icon.png` | `favicon`、`apple_touch_icon`(最上層,不在任何區塊底下) |
| 關於頁的頭像 | `avatar.jpg` | `about.avatar` |
| 導覽列左上角的站名 | `logo.png` | 不在這裡 —— 是 `source/css/custom.css` 用 CSS 換掉文字的 |
| 分享連結時的預覽圖 | `cover.jpg` | `open_graph.image` |

`logo.png` 和 `icon.png` 是手寫圖去背來的,`tools/drop-bg.mjs` 就是幹這個的。

橫幅看起來只有一張,但**設定項是每種頁面各自獨立的**。只改 `index.banner_img`
的話,就只有首頁會變,點進文章還是舊的那張——所以下面那段設定才會一路列下來。

要再換的話:

1. 新圖放進 `source/img/`。
   **檔名不要取跟主題一樣的**(`default.png` / `avatar.png` 等,那些是 Fluid 自帶的預設檔,
   放在 `node_modules/hexo-theme-fluid/source/img/`,**不要去改**,`npm install` 會蓋掉)。
2. 在 `_config.fluid.yml` 填路徑:

   ```yaml
   favicon: /img/icon.png
   apple_touch_icon: /img/icon.png

   index:
     banner_img: /img/cover.jpg
   archive:
     banner_img: /img/cover.jpg
   category:
     banner_img: /img/cover.jpg
   tag:
     banner_img: /img/cover.jpg
   post:
     banner_img: /img/cover.jpg
   about:
     banner_img: /img/cover.jpg
     avatar: /img/avatar.jpg

   open_graph:
     image: /img/cover.jpg
   ```

   路徑開頭的 `/` 指的是 **`source/`**,不是電腦的根目錄。
3. `npm run server` 確認圖有出來再 commit。

橫幅高度也可以一起調,單位是 vh(螢幕高度的百分比),例如 `index.banner_img_height: 100`
就是滿版。

> 順帶一提,**文章內文的圖片**是另一回事 —— 那些寫在 `.md` 裡的 `![](網址)`,
> 跟主題設定無關,而且放的是 `source/images/`(複數,跟上面的 `source/img/` 不同個)。
>
> 從 HackMD 匯進來的文章圖片本來指向 `hackmd.io`,原檔一刪就破圖。要抓回本機:
>
> ```bash
> node tools/localize-images.mjs                    # 先預覽,不動任何檔案
> node tools/localize-images.mjs --apply            # 實際下載並改寫連結
> node tools/localize-images.mjs --drafts --apply   # 改處理草稿
> ```
>
> `_posts` 的圖已經全部抓回來了,`_drafts` 還有一批沒處理。
>
> ⚠️ **手機拍的照片會帶 EXIF,裡面可能有 GPS 座標**,這個工具刻意不動它
> (要不要清是內容決定,不是技術決定)。放個人照片前自己確認一下。

> **圖片下面那行小字**是 Markdown 的 alt 文字變出來的:
>
> ```markdown
> ![](/images/xxx.png)             ← 沒有圖說
> ![選訓營的午餐](/images/xxx.png)  ← 圖片下方顯示「選訓營的午餐」
> ```
>
> 所以 alt 不要亂填 —— 填 `image` 或 `IMG_9732` 的話,那串字會直接印在圖片下面。

### 加留言系統(giscus,**目前沒裝**)

當初評估過但決定先不裝,產出的 HTML 現在沒有任何留言系統的痕跡。想裝的話 giscus
是首選,代價是**讀者要有 GitHub 帳號**才能留言(可匿名的 waline / twikoo 得自己
部署後端並長期維護,Disqus 會插廣告又追蹤讀者,都不推薦)。

giscus 是用 GitHub Discussions 當留言區,不用額外帳號。先到 https://giscus.app 依指示啟用 repo 的 Discussions 並取得參數,然後在 `_config.fluid.yml` 加:

```yaml
post:
  comments:
    enable: true
    type: giscus

giscus:
  repo: dnnnda0382/dnnnda0382.github.io
  repo-id: (從 giscus.app 複製)
  category: Announcements
  category-id: (從 giscus.app 複製)
  lang: zh-TW
```

### 搬 HackMD 舊筆記(**已全部搬完**)

31 篇在 2026-07-25 全數搬完,HackMD 那邊可以退休了 —— 其中 6 篇已經搬進 `_posts`,
另外 25 篇還躺在私人草稿庫等你挑。**API token 也已經撤銷**(`.env` 裡那串是失效的舊值,留著無害),之後真要
再匯入得先到 https://hackmd.io/settings#api 重新申請一組填回 `.env`。

以下留存供參考。當初的作法是**全部先搬進私人草稿庫**,再逐篇挑要發布的:

```bash
node tools/import-hackmd.mjs --all --out source/_drafts   # 全搬進私人草稿庫
npm run server:draft                                       # 預覽（草稿也會顯示）
npm run draft:publish "某篇標題"                           # 挑要發的移到 _posts
```

只想搬特定幾篇的話:

```bash
node tools/import-hackmd.mjs --list                # 列出全部與 id
node tools/import-hackmd.mjs --id <id> --dry-run   # 預覽,不寫檔
node tools/import-hackmd.mjs --id <id>             # 匯入單篇到 _posts
```

匯入過的筆記會在 front-matter 留下 `hackmd_id`,再跑一次會自動跳過,要重抓得加 `--force`。

> ⚠️ **不要用 `--all` 直接匯進 `source/_posts/`**,即使加了 `--draft`。
> `--draft` 只是加上 `published: false` 讓文章不出現在網站上,**檔案本身還是會進
> 這個公開的 repo**,任何人都讀得到。私人內容一律走 `--out source/_drafts`。

匯入後要自己補的:**tags / categories**(HackMD 那邊沒打)、**圖片**(還指向 HackMD 外部網址,
用 `tools/localize-images.mjs` 抓回本機)、**程式碼區塊的語言標記**(沒標就不會上色)。

### 訪問統計

兩套並行,一套給訪客看、一套給你自己看:

| | 看得到什麼 | 在哪看 |
|---|---|---|
| **不蒜子** | 頁尾的總訪問量／總訪客數、每篇文章的瀏覽次數 | 網站上直接顯示,訪客也看得到 |
| **GoatCounter** | 每日趨勢、哪篇熱門、流量從哪來 | https://dnnnda.goatcounter.com (只有你看得到) |

不蒜子只給「當下累計總數」,沒有後台也看不出趨勢 —— GoatCounter 就是來補這塊的。
設定分別在 `_config.fluid.yml` 的 `footer.statistics` / `post.meta.views`(不蒜子)
和 `custom_head`(GoatCounter 的 script)。

> 本機 `npm run server` 預覽時,不蒜子的數字會大得離譜 —— 它依網址計數,而 localhost
> 是全世界共用的 key。部署後看到的才是真的。GoatCounter 則內建擋掉 localhost,
> 本機預覽不會被記錄。

### 搜尋引擎收錄 ← **還有一步要你自己做**

站方這側該有的都有了:`/sitemap.xml`、`/robots.txt`、每頁的 `<link rel="canonical">`。
但**有 sitemap 不等於 Google 會收錄** —— sitemap 只是一個檔案,不會主動通知任何人,
而 `dnnnda0382.github.io` 這種沒有外部連結指進來的子網域,爬蟲根本沒理由發現它。
2026-08-18 實測 `site:dnnnda0382.github.io` 在 Google 是**零筆**。

剩下這步只有帳號擁有者做得到:

1. 到 [Google Search Console](https://search.google.com/search-console) 用
   **「URL 前置字元」**建立資源,填 `https://dnnnda0382.github.io/`
2. 驗證所有權選 **HTML 檔案**最單純 —— 下載下來的 `googlexxxx.html` 直接丟進
   `source/`,push 上去就會出現在網站根目錄(`_config.yml` 的 `skip_render` 已經
   先加了 `google*.html`,確保那個檔不會被 Hexo 渲染過而驗證失敗)
3. 提交 sitemap:`https://dnnnda0382.github.io/sitemap.xml`
4. 對首頁按一次「要求建立索引」

送出後**還要等數天到數週**才會出現在搜尋結果,這是正常的。想加速就從 GitHub profile
之類已經被收錄的地方連過來,爬蟲順著連結找過來比等 sitemap 快得多。
(Bing Webmaster Tools 可以從 Search Console 一鍵匯入,驗證過 Google 之後順手做掉。)

### RSS 訂閱

`/atom.xml`,別人可以用 RSS 閱讀器訂閱。它是**拉取式**的靜態檔 —— 你看不到誰訂閱了,
也不會主動寄信通知任何人。真的想要「發文自動寄信」得接 follow.it / Buttondown 這類
把 RSS 轉電子報的服務。

> 摘要取的是文章的 `description`,沒填就會退而抓內文,斷在半句話。又一個要填它的理由。
>
> ⚠️ 順帶一提,RSS 整份的說明文字取的是 `_config.yml` 的 **`subtitle`**,不是
> `description` —— 那兩個欄位餵的是不同地方(`description` 給分享卡片)。

---

## 出問題怎麼辦

### build 失敗,錯誤訊息有 `Nunjucks Error ... expected variable end`

數學公式裡有連續兩個左大括號。**在中間加一個空白**就好,LaTeX 會忽略空白,渲染結果一樣:

```latex
\frac{ {x}^{2} }{y}      ← 正確
\frac{{x}^{2}}{y}        ← 會爆
```

### push 了但網站沒更新

1. 去 repo 的 **Actions** 頁籤,看最新一次跑成功了沒(綠勾/紅叉)
2. 紅叉的話點進去看哪一步失敗,通常是 build error
3. 綠勾但網站還是舊的 → 等一兩分鐘,或用無痕視窗開(瀏覽器快取)

### 改了設定但本機看不出變化

Hexo 的快取有時候會卡住:

```bash
npm run rebuild     # 等同 hexo clean && hexo generate
```

### 公式沒渲染,直接顯示 `$...$` 原始碼

`$` 的位置有規定:開頭的 `$` 右邊不能緊接空白,結尾的 `$` 左邊不能緊接空白。

```
$x + y$       ← 正確
$ x + y $     ← 不會被當成公式
```

(這個規則是刻意的,才不會把 `$100` 這種金額誤判成公式。)

### `hexo: command not found` 或 `ERR_REQUIRE_ESM`

用到系統的舊 Node 了。這個專案需要 Node 22:

```bash
nvm use          # 會自動讀 .nvmrc
node -v          # 確認是 v22.x
```

正常情況下 nvm 已經寫進 `~/.bashrc`,新開終端機會自動切好,不用手動下。

### `Port 4000 has been used`

之前的預覽 server 還在背景跑。找出來砍掉:

```bash
lsof -ti:4000 | xargs kill
```

或直接換一個 port:`npx hexo server -p 5000`

---

## 檔案在哪

```
~/homepage/
├── source/
│   ├── _posts/             ← 已發布的文章（公開）
│   ├── _drafts/            ← 私人草稿庫（獨立的 private repo，不進這個 repo）
│   ├── about/index.md      ← 關於頁
│   ├── css/custom.css      ← 自訂樣式
│   ├── img/                ← 網站本身的圖（橫幅、頭像、logo、favicon）
│   ├── images/             ← 文章內文用的圖（複數，跟上面那個不同）
│   └── robots.txt          ← 允許搜尋引擎索引 + 指出 sitemap 位置
├── _config.yml             ← 網站基本設定
├── _config.fluid.yml       ← 外觀/主題設定
├── .env                    ← HackMD token(不進版控，目前是失效的舊值)
├── tools/                  ← 工具腳本（見下）
├── scripts/                ← Hexo 外掛，Hexo 會自動載入（不是一般腳本）
├── docs/commands.md        ← 架站過程的指令筆記
├── CLAUDE.md               ← 給 Claude Code 的專案規範
└── README.md               ← 這份
```

`source/img/` 和 `source/images/` 只差一個 s,但用途完全不同:前者是**網站的**圖
(橫幅、頭像、favicon,設定在 `_config.fluid.yml`),後者是**文章內文的**圖
(寫在 `.md` 裡的 `![](/images/xxx.png)`)。

`tools/` 裡面有:

| 檔案 | 用途 |
|------|------|
| `new-post.sh` | `npm run new` 背後的腳本 |
| `publish-draft.sh` | `npm run draft:publish` 背後的腳本 |
| `check-frontmatter.mjs` | `npm run check`,也被 publish-draft 呼叫 |
| `redate.mjs` | `npm run redate`,也被 publish-draft 呼叫 |
| `import-hackmd.mjs` | 從 HackMD 匯入筆記(已用不到,留著備查)|
| `localize-images.mjs` | 把文章裡的外部圖片抓回 `source/images/` |
| `drop-bg.mjs` | 手寫圖去背（產生 logo.png / icon.png）|
| `gen-emoji-aliases.mjs` | 產生 emoji 別名表(很少跑,要連網)|
| `emoji-aliases.json` | ↑ 的產物,**不要手改**|

`scripts/` 裡面是 Hexo **外掛**(Hexo 會自動載入,不能當一般腳本跑):
`markdown-it-spoiler.js`(`||暴雷||`)、`markdown-it-emoji.js`(`:smile:`)、
`wordcount-skip-katex.js`(字數統計扣掉公式的隱藏分身)。想加工具腳本請放 `tools/`,
放進 `scripts/` 會被當外掛載入而出錯。

**不要動的東西**:`node_modules/`(套件)、`public/`(build 產物)、`db.json`(快取)。這三個都不進版控,砍掉重跑 `npm install` / `npm run build` 就會回來。

---

## 指令總表

```bash
npm run new "標題"            # 新增文章（直接進 _posts，會發布）
npm run draft "標題"          # 新增草稿（進 _drafts，私密不發布）
npm run draft:publish         # 不給參數 = 列出所有草稿
npm run draft:publish "標題"  # 草稿 → 文章（發布前會確認並提醒缺的欄位）
npm run draft:publish --keep-date "標題"   # 同上，但保留草稿原本的 date
npm run check                 # 盤點文章缺哪些 front-matter 欄位
npm run redate "標題"         # 把該篇的 date 改成現在（＝真正的發布時間）
npm run server                # 本機預覽 (localhost:4000)
npm run server:draft          # 本機預覽，含草稿
npm run build                 # 產生靜態檔到 public/
npm run clean                 # 清快取
npm run rebuild               # clean + build
```

## 參考連結

- [指令筆記](docs/commands.md) — 架站過程用過的指令整理,附「當時為什麼要下它」
- [Hexo 官方文件](https://hexo.io/zh-tw/docs/)
- [Fluid 主題文件](https://hexo.fluid-dev.com/docs/) — 所有可設定的選項
- [Hexo 外掛列表](https://hexo.io/plugins/) — 想加功能先來這找
- [KaTeX 支援的語法](https://katex.org/docs/supported.html) — 公式寫不出來時查這個
