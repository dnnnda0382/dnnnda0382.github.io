# CLAUDE.md

給 Claude Code 的專案說明。動手改任何東西之前請先讀完這份文件。

---

## 這是什麼專案

一個用 **Hexo**（Node.js 靜態網站產生器）架的個人筆記網站，用途類似 HackMD：
用 Markdown 寫筆記，支援 LaTeX 數學公式、程式碼語法高亮、自動產生目錄。

寫好的 Markdown 放在 `source/_posts/`，push 到 `main` 後由 GitHub Actions 自動
build 成靜態 HTML 並發布到 `gh-pages` branch。

### 技術組成

| 項目 | 用什麼 | 備註 |
|------|--------|------|
| 靜態網站產生器 | Hexo 8 | 需要 Node >= 20.19 |
| 主題 | Fluid（npm 安裝） | `node_modules/hexo-theme-fluid/` |
| Markdown 渲染 | `hexo-renderer-markdown-it` | 已移除預設的 `hexo-renderer-marked` |
| 數學公式 | `@renbaoshuo/markdown-it-katex` + KaTeX | build 階段就渲染成 HTML |
| 程式碼高亮 | prismjs | build 階段就上色 (`preprocess: true`) |
| 目錄 (TOC) | Fluid 主題內建 | 瀏覽器端依標題 id 生成 |

**公式和程式碼高亮都是在 build 階段算完的**，瀏覽器不需要跑額外的 JS。改相關設定時
請維持這個特性，不要換成前端即時渲染的方案。

---

## 環境需求

Node 版本鎖在 `.nvmrc`（目前是 22）。本機用 nvm 管理：

```bash
nvm use          # 會讀 .nvmrc
node -v          # 應該是 v22.x
```

⚠️ **系統內建的 Node 18 跑不動 Hexo 8**，會噴 `ERR_REQUIRE_ESM`（Hexo 8 依賴
Node 20.19+ 才有的 `require(ESM)` 功能來載入 ESM-only 的 `strip-ansi`）。
如果遇到這個錯誤，先確認 `node -v`。

---

## 常用指令

```bash
npm run new "文章標題"        # 新增文章（進 _posts，會公開）
npm run draft "標題"          # 新增草稿（進 _drafts，私密）
npm run draft:publish "標題"  # 草稿 → 文章
npm run check                 # 盤點文章缺哪些 front-matter 欄位
npm run server                # 本機預覽 → http://localhost:4000
npm run server:draft          # 本機預覽，含草稿
npm run build                 # 產生靜態檔到 public/
npm run clean                 # 清掉 public/ 和快取 db.json
npm run rebuild               # clean + build，設定改壞時用這個
```

底層對應的是 `hexo new` / `hexo server` / `hexo generate` / `hexo clean`，
直接用 `npx hexo <指令>` 也可以。

> **不要用 `hexo deploy`。** 部署由 GitHub Actions 負責，專案裡刻意沒有裝
> `hexo-deployer-git`，根目錄 `_config.yml` 也刻意沒有設定 `deploy:` 區塊，
> 避免出現兩套互相打架的部署流程。

### 排版壞掉時

Hexo 的 `db.json` 快取有時候會讓改動看起來沒生效。先跑 `npm run rebuild`
再判斷是不是真的有問題。

---

## 檔案結構

```
.
├── _config.yml              # Hexo 主設定（站台資訊、markdown、高亮）
├── _config.fluid.yml        # Fluid 主題設定「覆寫檔」← 改主題設定看這裡
├── .nvmrc                   # Node 版本
├── scaffolds/post.md        # 新文章的範本（front-matter 長相）
├── source/
│   ├── _posts/              # ← 已發布的文章（公開）
│   ├── _drafts/             # ← 私人草稿庫（獨立 private repo，不進版控）
│   ├── about/index.md       # 關於頁
│   └── css/custom.css       # ← 自訂樣式覆寫
├── scripts/                 # ← Hexo 外掛（會被自動載入，不是一般腳本）
│   ├── markdown-it-spoiler.js     # ||暴雷|| 行內語法
│   ├── markdown-it-emoji.js       # :smile: 短碼
│   └── wordcount-skip-katex.js    # 字數統計扣掉 KaTeX 的 MathML 分身
├── tools/new-post.sh        # npm run new 背後的腳本
├── tools/publish-draft.sh   # npm run draft:publish 背後的腳本
├── tools/check-frontmatter.mjs # npm run check，也被 publish-draft.sh 呼叫
├── tools/import-hackmd.mjs  # HackMD 匯入工具
├── tools/localize-images.mjs # 把文章裡的外部圖片抓回 source/images/
├── tools/drop-bg.mjs        # 手寫圖去背（產生 logo.png / icon.png）
└── .github/workflows/deploy.yml  # 自動部署
```

`scripts/` 這個資料夾名稱被 Hexo 佔用了 —— Hexo 會把裡面的 `.js` 當**外掛**自動載入。
所以那裡只放真的要當外掛跑的東西，自己寫的工具腳本一律放 `tools/`。

⚠️ Hexo 是用 bluebird 的併發 `.map` 同時載入主題的 `scripts/` 和這裡的 `scripts/`
（見 `node_modules/hexo/dist/hexo/load_plugins.js` 的 `loadScripts`），**先後順序不保證**。
要覆寫主題註冊的東西（helper、filter 等），請掛在 `after_init` filter 裡註冊，
那個時間點所有外掛都載完了 —— `wordcount-skip-katex.js` 就是這樣做的。

---

## 改設定與樣式的規則

### 1. 主題設定 → 改 `_config.fluid.yml`

**絕對不要直接修改 `node_modules/hexo-theme-fluid/` 底下的任何檔案。**
那些改動會在下次 `npm install` 時被完全覆蓋掉。

`_config.fluid.yml` 只需要寫「跟主題預設值不同」的項目，Hexo 會把它深層合併
(deep merge) 到主題的預設設定上。

想知道有哪些可以設定的項目，去讀主題的預設檔（**只讀不改**）：

```bash
less node_modules/hexo-theme-fluid/_config.yml
```

官方文件：https://hexo.fluid-dev.com/docs/

### 2. 外觀微調 → 改 `source/css/custom.css`

這個檔案由 `_config.fluid.yml` 的 `custom_css` 掛載，載入順序在主題 CSS 之後。
深色模式的選擇器是 `[data-user-color-scheme="dark"]`。

只有在 CSS 真的做不到的時候，才考慮用 Fluid 的 `injects` 機制插入自訂模板片段。

### 3. 兩個設定檔要保持同步的地方

程式碼高亮的設定在兩邊都有，而且 **Fluid 會強制覆寫 Hexo 的設定**
（見 `node_modules/hexo-theme-fluid/scripts/events/lib/highlight.js`）：

| 設定 | 根目錄 `_config.yml` | `_config.fluid.yml` |
|------|----------------------|---------------------|
| 高亮器 | `syntax_highlighter: prismjs` | `code.highlight.lib: "prismjs"` |
| 行號 | `prismjs.line_number` | `code.highlight.line_number` |

實際生效的是 **`_config.fluid.yml`**，但兩邊請一起改，不然讀設定的人會被誤導。

### 4. KaTeX 的版本必須對齊

`package.json` 裡 `katex` 的版本，和 `_config.fluid.yml` 裡
`static_prefix.katex` 那條 CDN 網址的版本號，**必須完全一致**。

公式的 HTML 是本機的 katex 套件產生的，CSS 是從 CDN 載的，版本對不上會導致
字型 metrics 不符、公式排版錯位。升級 katex 時兩個地方要一起改。

---

## 新增功能的原則

**優先找現成的 Hexo plugin，不要自己重造輪子**，除非使用者明確要求客製化。

加新功能之前先確認 Fluid 是不是已經內建了 —— 這個主題內建的東西很多：

- 站內搜尋（`search.enable`，不需要裝 plugin）
- 目錄 TOC、程式碼複製鈕、字數統計、閱讀時間
- 留言系統（支援 giscus / utterances / waline / twikoo 等十幾種，
  在 `post.comments.type` 選一個再填對應設定即可）
- 深色模式、Mermaid 流程圖、圖片燈箱

找 plugin 的地方：https://hexo.io/plugins/

裝完 plugin 後，設定一樣寫在根目錄 `_config.yml`，不要寫進主題設定檔。

---

## 文章 front-matter 慣例

`npm run new "標題"` 會依 `scaffolds/post.md` 產生：

```yaml
---
title: 文章標題
date: 2026-07-25 16:21:21
tags: []
categories: []
description: ''
---
```

規則：

- **title**：中文標題直接寫，不用加引號（除非標題裡有 `:` 或開頭是特殊字元）。
  改 title **不會**影響網址（網址的 `:title` 取自檔名，不是這個欄位）。
- **date**：`npm run new` 會自動填當下時間，通常不用改。
  ⚠️ 改 date **會改掉網址**（permalink 是 `:year/:month/:day/:title/`），舊連結會壞。
  檔名同理。內容、title、tags 怎麼改都不影響網址。
- **description**：分享連結時預覽卡片顯示的那段文字，**請務必填**。
  不填的話 Fluid 會退而取內文的前 200 字（見
  `node_modules/hexo-theme-fluid/layout/_partials/head.ejs` 開頭那段
  `page.description || page.excerpt || (is_post() && page.content) || config.description`），
  結果是標題和內文擠在一起、句子斷在半路。通常複製第一段貼進來就夠了。
- **tags**：陣列，可以多個 → `tags: [演算法, C++]`
- **categories**：陣列，**通常只填一個**。Hexo 的 categories 寫多個會被當成
  階層關係（`[數學, 線性代數]` 代表「數學 > 線性代數」的子分類），不是並列。
  要並列得寫成 `[[數學], [程式]]`，但基本上用不到。
- **`<!-- more -->`**：以上的內容會被當成首頁的摘要。範本預設把它放在最前面，
  請把簡短的開場白寫在它上面。
- **`published: false`**：不要顯示在網站上，但檔案仍留在這個（公開的）repo 裡。
  適用於「不想放上網站，但被人在 repo 翻到也無所謂」的內容。
  ⚠️ **這不是隱私機制** —— 檔案在公開 repo 裡任何人都讀得到。
  真正不能外流的東西一律放 `source/_drafts/`（見上方「私人草稿庫」）。

常用的 tag（想到新的就往下加，但先看看有沒有語意重複的舊 tag 可以用）：

```
數學  演算法  資料結構  C++  Python  筆記  雜記  測試
修課心得  GPA  競程  APCS
```

分類目前用：`筆記`、`雜記`、`心得`。

`npm run draft:publish` 在發布前會檢查 `tags` / `categories` / `description`
有沒有填，缺的會列出來提醒（但不會擋，只是提醒）。這三個欄位事後補上再 push
都會生效，不影響網址。

想一次看所有文章缺什麼就跑 `npm run check`：

```bash
npm run check              # 掃 source/_posts
npm run check -- --drafts  # 改掃 source/_drafts
```

`published: false` 的文章會標成「(未發布)」，且不列入最後的統計 —— 它們不會
出現在網站上，缺欄位沒有影響。

判斷邏輯統一寫在 `tools/check-frontmatter.mjs`，`draft:publish` 也是呼叫它，
所以發布前的提醒和這張盤點表永遠一致。改「哪些欄位算填了」只要改那一個檔案。

---

## 分享預覽（Open Graph）

貼連結到 Discord / LINE / Twitter 時顯示的卡片，由 `<meta property="og:*">` 決定。

| 卡片上的東西 | 來源 |
|---|---|
| 標題 | 文章的 `title`（首頁是 `_config.yml` 的 `title`） |
| 說明文字 | 文章的 **`description`** ← 沒填就退而抓內文前 200 字 |
| 圖片 | `_config.fluid.yml` 的 `open_graph.image` |

**`open_graph.image` 一定要設。** 沒設的話 Hexo 會去掃文章內容裡的 `<img>` 當
預覽圖（見 `node_modules/hexo/dist/plugins/helper/open_graph.js` 第 77 行附近），
造成兩個問題：首頁沒有任何圖片就完全沒有 `og:image`，卡片變成光禿禿的純文字；
而從 HackMD 匯入的文章會抓到 `hackmd.io/_uploads/...` 的外部網址，對方刪檔預覽就壞。

⚠️ Fluid 是用 `Object.assign({ image: page.og_img || page.index_img }, theme.open_graph)`
合併的，**theme 的設定會蓋掉個別文章的 `index_img`**，所以目前全站共用同一張。
之後想讓某篇用自己的預覽圖，得把 `open_graph.image` 拿掉、改成每篇設 `index_img`。

改完要驗證的話直接檢查產出的 HTML：

```bash
npm run build
grep -oE '<meta property="og:[a-z:]+"[^>]*>' public/index.html
```

### RSS 與 sitemap

`hexo-generator-feed` 產生 `/atom.xml`，`hexo-generator-sitemap` 產生
`/sitemap.xml`，設定都在根目錄 `_config.yml`。

RSS 的每篇摘要取用順序是 `post.description` → `post.excerpt` → 內文前
`content_limit` 字（見 `node_modules/hexo-generator-feed/lib/generator.js`
第 54 行），所以**文章的 `description` 沒填的話，RSS 的摘要也會很難看**。

⚠️ RSS 整體的說明文字取的是 `config.subtitle || config.description`（同檔案
第 33 行）—— **`subtitle` 有值就輪不到 `description`**。所以改站台說明時，
要記得這兩個欄位餵的是不同地方：`description` 給網頁的分享卡片，
`subtitle` 給 RSS。

`published: false` 的文章不會進 feed 也不會進 sitemap，已驗證。

---

## 私人草稿庫（重要）

> ### 預設規則：新內容一律先進 `_drafts`
>
> **新增文章或從 HackMD 匯入時，預設一律寫進 `source/_drafts/`，
> 除非使用者明確說「這篇要公開」。**
>
> 不確定的時候就放 `_drafts`，然後問。放錯邊的代價完全不對等：
> 放 `_drafts` 只是晚點發布，放 `_posts` 則是內容立刻公開。
>
> **這條規則是有代價換來的。** 2026-07-25 曾把一篇「尚未公開的比賽題解」
> 匯進 `_posts` 並推上公開 repo，網站實際對外服務了約一小時。事後發現
> 光是移除檔案不夠，連 `git filter-branch` 改寫歷史 + force push 都不夠 ——
> GitHub 不會立即回收孤立的 commit，舊 SHA 依然可以透過 API 取回檔案內容
> （實測 HTTP 200）。最後只能刪掉整個 repo 重建才清乾淨。
>
> 換句話說：**東西一旦進了公開 repo，就當作再也收不回來。**

`source/_drafts/` **不屬於這個 repo** —— 它被 `.gitignore` 排除，本身是一個獨立的
git repo，推到使用者的私人 remote。

**為什麼**：這個網站的 repo 是 public。`published: false` 只能讓文章不出現在網站上，
**擋不住 repo** —— 檔案還是躺在版控裡讓任何人讀得到。所以私人內容一律放 `_drafts`。

因此：

- **不要**把私人／未定稿的內容寫進 `source/_posts/`，即使加了 `published: false`
- **不要**把 `source/_drafts/` 從 `.gitignore` 拿掉
- 從 HackMD 匯入私人筆記時，一律加 `--out source/_drafts`
- 在 `source/_drafts/` 裡面下 git 指令時，操作的是「私人筆記庫」那個 repo，
  不是網站的 repo，別搞混

相關指令：

```bash
npm run draft "標題"          # 建立草稿
npm run server:draft          # 預覽時包含草稿
npm run draft:publish         # 不給參數 = 列出所有草稿
npm run draft:publish "標題"  # 把草稿移到 _posts（等於決定要公開了）
```

`draft:publish` 走的是 `tools/publish-draft.sh`，**不是 `hexo publish`**。

`hexo publish` 會先把參數丟進 `slugize()` 再比對 `_drafts/` 的檔名開頭（見
`node_modules/hexo/dist/hexo/post.js` 的 `publish()`），而 slugize 會把空格換成
dash，所以**檔名帶空格的草稿永遠比對不到**：

```
slugize("114-1 台大資工大一上修課心得") → "114-1-台大資工大一上修課心得"
實際檔名                                 → "114-1 台大資工大一上修課心得.md"
```

換句話說 `hexo publish` 只找得到 `hexo new draft` 建的草稿（那些建檔時就
slugify 過了）。從 HackMD 匯進來的檔名一律保留原標題的空格（見
`tools/import-hackmd.mjs` 的 `safeFilename()`），全部中不了。

自己寫的腳本改成直接比對檔名、不做 slugify，另外支援：忽略大小寫、部分比對、
命中多筆時列出候選、目標已存在時拒絕覆蓋，以及**發布前的 y/N 確認**（因為搬進
`_posts` 再 push 就收不回來了，見上面的事故記錄）。非互動式環境會直接拒絕，
要在腳本裡跑請加 `PUBLISH_YES=1`。

## 從 HackMD 匯入舊筆記

`tools/import-hackmd.mjs` 會透過 HackMD API 把筆記轉成 Hexo 文章。

```bash
node tools/import-hackmd.mjs --list                # 列出所有筆記與 id
node tools/import-hackmd.mjs --id <id> --dry-run   # 預覽轉換結果，不寫檔
node tools/import-hackmd.mjs --id <id> --id <id2>  # 匯入指定筆記
node tools/import-hackmd.mjs --all --draft         # 全部匯入，但標成未發布
```

Token 放在 `.env` 的 `HACKMD_TOKEN`（**`.env` 已被 `.gitignore` 排除，絕對不要 commit**）。
撤銷或重新申請：https://hackmd.io/settings#api

轉換時會自動處理：

| HackMD 的寫法 | 轉成什麼 | 為什麼 |
|---------------|----------|--------|
| 開頭的 `# 標題` | 移除 | 跟 front-matter 的 title 重複，Hexo 會另外顯示標題 |
| `[TOC]` | 移除 | Fluid 自己會產生目錄 |
| `:::spoiler 標題` | `{% fold %}` | Fluid 的摺疊區塊 |
| `:::info` / `:::warning` 等 | `{% note %}` | Fluid 的提示框 |
| 數學式裡的 `{{` | `{ {` | 不然 Nunjucks 會讓 build 失敗（見「已知的坑」） |
| `![image](...)` / `![IMG_9732](...)` | `![](...)` | 見下方「圖片的 alt 會變成圖說」 |

行內的 `||暴雷內容||` **不需要轉換**，原樣留著就好 —— 由
`scripts/markdown-it-spoiler.js` 在渲染階段處理（見下方「行內暴雷語法」）。

**含程式碼區塊的 `:::` 容器會退回轉成引言**，因為 Fluid 的 `note` / `fold` 標籤
會把渲染後的換行壓成空白（見 `node_modules/hexo-theme-fluid/scripts/tags/note.js`），
程式碼放進去會整段擠成一行。

匯入後每篇會多一個 `hackmd_id` front-matter 欄位，用來對照來源、避免重複匯入。

### 匯入後要人工確認的事

- **圖片仍指向 HackMD / imgur 的外部網址**，原始檔被刪掉就會失效。
  用 `tools/localize-images.mjs` 抓回本機（見下方「把外部圖片抓回本機」）。
- **沒標語言的程式碼區塊不會上色**，想上色要自己補上 ` ```cpp ` 之類的標記。
  （HackMD 的 ` ```cpp=1 ` 這種行號語法 Hexo 看得懂，不用改。）
- `tags` 和 `categories` 匯入後是空的，要自己補。

## 圖片的 alt 會變成圖說

Fluid 的 `post.image_caption.enable` 預設是開的，它的 JS 會把 `<img>` 的
`title` 或 `alt` 插成圖片下方的 `<figcaption>`（見
`node_modules/hexo-theme-fluid/source/js/plugins.js` 的 `imageCaption`）。

問題是 HackMD 貼圖時 alt 預設填 `image`，從相簿拖進去則是 `IMG_9732`，
於是每張圖底下都掛著一串沒意義的檔名。

**解法是把 alt 清成空的，不是關掉 `image_caption`** —— 關掉的話以後真的想寫
圖說也沒得寫。alt 是空字串時 Fluid 拿不到內容就不會產生 figcaption，而且空
alt 對螢幕閱讀器正好是「裝飾性圖片，略過」的正確標示，比 `alt="image"` 好。

```markdown
![](/images/xxx.png)          ← 不顯示圖說
![選訓營的午餐](/images/xxx.png)  ← 圖片下方顯示「選訓營的午餐」
```

`tools/import-hackmd.mjs` 匯入時會自動清掉 `image` / `IMG_xxxx` /
`Screenshot...` / `DSC1234` / 一長串數字這類自動產生的 alt，自己寫的圖說一律
保留（連 `image of the day` 這種以 image 開頭的真實圖說也不會被誤清）。

## 把外部圖片抓回本機

`tools/localize-images.mjs` 會掃出文章裡的外部圖片，下載到 `source/images/`
再把連結改成 `/images/檔名`。

```bash
node tools/localize-images.mjs                    # 預覽，不動任何檔案
node tools/localize-images.mjs --apply            # 實際下載並改寫
node tools/localize-images.mjs --drafts --apply   # 改處理 source/_drafts
```

抓不到的會保留原連結不改（總比連結變成 404 好），最後會列出來。
下載用 `curl` 而不是 node 的 `fetch` —— 實測部分 CDN（acfun）在某些環境下
`fetch` 會 TLS 失敗，`curl` 拿得到。

⚠️ **手機拍的照片會帶 EXIF，裡面可能有 GPS 座標。**
HackMD 不會幫你清掉，所以從那邊抓回來的照片是連 metadata 一起下載的。
這個工具**刻意不動 EXIF**（原樣保留），因為「要不要清」是內容決定不是技術決定。
處理個人照片前請自己確認一次：

```bash
# 看有沒有 GPS 區段
node -e 'const d=require("fs").readFileSync(process.argv[1]);console.log(d.includes(Buffer.from("GPS"))?"可能有 GPS":"沒找到")' source/images/xxx.jpg
```

真的要清的話，裝 sharp 後 `sharp(f).rotate().toFile(out)` 會在套用完方向修正後
丟掉所有 metadata（`.rotate()` 不加參數 = 依 EXIF 自動轉正，不然清完照片可能會躺著）。

## HackMD 語法在這裡的支援狀況

markdown-it 沒有內建 HackMD 的全部語法。已經確認過的狀況：

| 語法 | 狀況 |
|------|------|
| `~~刪除線~~` | ✅ markdown-it 原生支援，不用處理 |
| `:smile:` emoji 短碼 | ✅ 由 `scripts/markdown-it-emoji.js` 補上 |
| `\|\|暴雷\|\|` | ✅ 由 `scripts/markdown-it-spoiler.js` 補上（見下一節） |
| `^上標^` / `~下標~` | ❌ **刻意不支援**，理由見下 |

⚠️ **不要為了上標／下標去裝 `markdown-it-sup` / `markdown-it-sub`。**
掃過全站文章後，`^...^` 和 `~...~` 的命中幾乎都不是上下標的意思：

```
@#^%&^&#$^#          ← 被消音的髒話
10:20~12:20          ← 時間區間
$O(n\cdot 2^n)$      ← LaTeX，本來就由 KaTeX 處理
```

裝下去這些全部都會被弄壞。真的要寫上下標就用 `$x^y$` 這種 LaTeX 寫法，
站上本來就有 KaTeX。

emoji 外掛刻意只開短碼、關掉 ASCII 表情（`:)` `:D` `:/` 那些）的自動轉換，
理由寫在 `scripts/markdown-it-emoji.js` 的檔頭。

## 行內暴雷語法 `||...||`

HackMD 的行內暴雷語法，markdown-it 沒有內建，由 `scripts/markdown-it-spoiler.js`
補上。渲染成 `<span class="spoiler" tabindex="0">`，樣式在 `source/css/custom.css`，
點一下或用鍵盤 Tab 選到才顯示 —— 靠 CSS 的 `:focus`，不需要 JS。

改這塊之前要知道的三件事：

**1. 不能改用 npm 上的 spoiler 外掛。** `markdown-it-spoiler`、`@mdit/plugin-spoiler`
之類的套件用的都是 `!!暴雷!!` 語法，不是 `||暴雷||`。換過去等於要把所有筆記裡的
`||` 全部改寫，而且從 HackMD 貼過來的新筆記又會再壞一次。

**2. 為什麼要包住 markdown-it 的 `text` 規則。** markdown-it 的 `text` 規則會一路吃掉
普通字元，只在「終止字元」前停手，而 `|` **刻意不在那份清單裡**（見
`node_modules/markdown-it/lib/rules_inline/text.mjs`）。所以光是註冊一條行內規則沒有用
—— tokenizer 根本不會在句子中間的 `||` 停下來給它機會。外掛的作法是包住原本的 `text`
規則，吃完發現裡面有 `||` 就把多吃的吐回去。

不要改成「複製一份終止字元清單再加上 `|`」，那樣 markdown-it 一升版就可能失準。

**3. 掛載走 filter，不是 `markdown.plugins`。** 根目錄 `_config.yml` 的
`markdown.plugins` 只吃得下 npm 套件名稱，本機檔案塞不進去。改用
`hexo-renderer-markdown-it` 提供的 `markdown-it:renderer` filter
（見 `node_modules/hexo-renderer-markdown-it/lib/renderer.js` 的 `render()`）。
那個 filter 每次 render 都會被呼叫，所以外掛裡有一個旗標擋重複註冊。

不會被誤判的情況（已驗證）：行內程式碼 `` `a || b` ``、``` ``` ``` 圍起來的 C++ 程式碼區塊、
數學式裡的 `$\|x\|_2$`、表格的 `|` 分隔線。`||` 沒有收尾或內容是空的 `||||` 也會原樣印出。

## 部署

### 流程

push 到 `main` → GitHub Actions（`.github/workflows/deploy.yml`）自動跑
`npm ci` → `hexo clean && hexo generate` → 把 `public/` 推到 `gh-pages` branch。

**發布一篇新文章的完整流程就是：寫 md 檔 → `git add` → `git commit` → `git push`。**
不需要在本機 build，也不需要手動處理 `public/`。

### 版控範圍

`node_modules/`、`public/`、`.deploy_git/`、`db.json` **都不進版控**（見 `.gitignore`）。
`package-lock.json` **要進版控**，CI 靠它跑 `npm ci` 還原一致的依賴版本。

### 站台網址設定

根目錄 `_config.yml` 的 `url` 要跟實際的 GitHub Pages 網址一致，否則 RSS、
sitemap、Open Graph 的連結會是錯的：

- repo 叫 `<帳號>.github.io` → `url: https://<帳號>.github.io`，且 `root: /`
- repo 叫其他名字（例如 `blog`）→ `url: https://<帳號>.github.io/blog`，
  而且**必須另外加上** `root: /blog/`，不然 CSS/JS 的路徑會全部 404

---

## 改完之後

**任何設定變動，都要先在本機跑過 `npm run server` 確認沒有 build error，
再幫使用者 commit。** 光是 `hexo generate` 沒報錯還不夠，有些問題只在實際
渲染頁面時才會出現。

驗證數學公式有沒有正常渲染，可以直接檢查產出的 HTML：

```bash
npm run build
grep -c 'katex-display' "public/2026/07/25/功能測試-數學公式與程式碼高亮/index.html"
```

有數字且大於 0 就表示公式是在 build 階段渲染好的。

---

## 已知的坑

### LaTeX 裡不能出現連續兩個左大括號

Hexo 在 Markdown 渲染前會先跑一層 Nunjucks 模板引擎，它會把 `{{` 當成模板變數
的開頭，導致**整個 build 直接失敗**：

```
FATAL Nunjucks Error: _posts/xxx.md [Line 2, Column 275] expected variable end
```

**解法是在兩個大括號中間加一個空白**，LaTeX 在數學模式會忽略空白，渲染結果一樣：

```latex
\frac{ {x}^{2} }{y}      ← 正確
\frac{{x}^{2}}{y}        ← 會讓 build 掛掉
```

⚠️ 網路上常見的建議是用 `{% raw %}` 把公式包起來——**這招對數學公式沒有用**。
`raw` 標籤的內容會被抽換成佔位符、跳過 Markdown 渲染階段，KaTeX 根本看不到那段
公式，最後會原封不動吐出 LaTeX 原始碼。

### `npm run` 會自己注入 `EDITOR=vi`

npm 執行 script 時會把自己的 `editor` 設定（預設值就是 `vi`）注入成環境變數
`EDITOR`。所以在 npm script 裡判斷 `$EDITOR` 有沒有設定是不可靠的——它永遠有值，
照著開下去會跳進 vim 並把終端機卡死。

`tools/new-post.sh` 因此改用自訂的 `HEXO_EDITOR` 變數。想要 `npm run new` 之後
自動開啟編輯器的話：

```bash
export HEXO_EDITOR=nano
```

（在 WSL 底下刻意不自動啟動 VS Code：`code` 實際上是去呼叫 Windows 的 `code.exe`，
那個 interop 行程沒辦法跟 npm 的行程樹乾淨脫鉤，會讓指令卡住不返回。）

### 檔名開頭不能是底線

Hexo 會忽略 `source/` 底下所有以 `_` 開頭的檔案和資料夾。想寫暫時不發布的草稿，
用 `hexo new draft` 放到 `source/_drafts/`，或在 front-matter 加 `published: false`。

### npm audit 的警告

`npm audit` 會回報幾個 high 等級的 DoS 漏洞（`brace-expansion`、`linkify-it`）。
這些都是 **build 階段**的依賴，最終產物是純靜態 HTML，沒有執行期的攻擊面。
**不要跑 `npm audit fix --force`**，它會把 Hexo 降到不相容的版本。
