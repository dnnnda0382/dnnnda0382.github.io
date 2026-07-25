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
npm run new "文章標題"   # 新增一篇文章，印出檔案路徑
npm run server           # 本機預覽 → http://localhost:4000
npm run build            # 產生靜態檔到 public/
npm run clean            # 清掉 public/ 和快取 db.json
npm run rebuild          # clean + build，設定改壞時用這個
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
│   ├── _posts/              # ← 文章都放這裡
│   ├── about/index.md       # 關於頁
│   └── css/custom.css       # ← 自訂樣式覆寫
├── tools/new-post.sh        # npm run new 背後的腳本
└── .github/workflows/deploy.yml  # 自動部署
```

`scripts/` 這個資料夾名稱被 Hexo 佔用了（Hexo 會把裡面的 `.js` 當外掛自動載入），
所以自己寫的工具腳本一律放 `tools/`。

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
---
```

規則：

- **title**：中文標題直接寫，不用加引號（除非標題裡有 `:` 或開頭是特殊字元）。
- **date**：`npm run new` 會自動填當下時間，通常不用改。
- **tags**：陣列，可以多個 → `tags: [演算法, C++]`
- **categories**：陣列，**通常只填一個**。Hexo 的 categories 寫多個會被當成
  階層關係（`[數學, 線性代數]` 代表「數學 > 線性代數」的子分類），不是並列。
  要並列得寫成 `[[數學], [程式]]`，但基本上用不到。
- **`<!-- more -->`**：以上的內容會被當成首頁的摘要。範本預設把它放在最前面，
  請把簡短的開場白寫在它上面。

常用的 tag（想到新的就往下加，但先看看有沒有語意重複的舊 tag 可以用）：

```
數學  演算法  資料結構  C++  Python  筆記  雜記  測試
```

分類目前用：`筆記`、`雜記`。

---

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
