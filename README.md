# 個人筆記網站 — 操作手冊

用 Markdown 寫筆記,push 就自動發布。支援 LaTeX 數學公式、程式碼高亮、自動目錄。

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

`npm run new` 會自動產生這段,把 `tags` 和 `categories` 填一填就好:

```yaml
---
title: 線性代數筆記
date: 2026-07-25 16:21:21
tags: [數學, 筆記]
categories: [筆記]
---

這段會出現在首頁當摘要。

<!-- more -->

這條線以下的內容要點進文章才看得到。
```

`categories` 通常只填一個。填兩個以上會被當成階層(`[數學, 線性代數]` = 「數學 > 線性代數」),不是並列。

### 三種「不公開」的差別

|  | 出現在網站 | 出現在公開 repo | 用在什麼情況 |
|---|---|---|---|
| 一般文章 | ✅ | ✅ | 要發布的 |
| `published: false` | ❌ | ✅ | 不想放上網站,但被翻到也無所謂 |
| 放 `source/_drafts/` | ❌ | ❌ | **真的不能外流的** |

`published: false` **不是隱私機制** —— 檔案還在公開 repo 裡,任何人都讀得到。
不能外流的東西一律放 `_drafts`。

---

## 首次設定(只做一次)

目前 repo **還沒推上 GitHub**,以下是完整流程。

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

### 3. 開啟 GitHub Pages ← **還沒做**

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
| 改首頁大圖 | `_config.fluid.yml` | `index.banner_img`(圖放 `source/img/`) |
| 改程式碼配色 | `_config.fluid.yml` | `code.highlight.prismjs.style` / `style_dark` |
| 微調任何樣式 | `source/css/custom.css` | 直接寫 CSS |
| 改文章網址格式 | `_config.yml` | `permalink:` |
| 改關於頁 | `source/about/index.md` | 直接寫 Markdown |
| 加留言系統 | `_config.fluid.yml` | 見下方 |
| 搬 HackMD 筆記 | — | 見下方 |

### 加留言系統(giscus)

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

### 搬 HackMD 舊筆記

31 篇裡目前搬了 4 篇,剩 27 篇。

**推薦作法:全部先搬進私人草稿庫**,再逐篇挑要發布的。這樣就能徹底不用再開 HackMD:

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

> ⚠️ **不要用 `--all` 直接匯進 `source/_posts/`**,即使加了 `--draft`。
> `--draft` 只是加上 `published: false` 讓文章不出現在網站上,**檔案本身還是會進
> 這個公開的 repo**,任何人都讀得到。私人內容一律走 `--out source/_drafts`。

匯入後要自己補的:**tags / categories**(HackMD 那邊沒打)、**圖片**(還指向 HackMD 外部網址,原檔刪掉會失效)、**程式碼區塊的語言標記**(沒標就不會上色)。

### 改 HackMD token

Token 存在 `.env`(這個檔**不進版控**)。要換的話直接編輯:

```bash
nano ~/homepage/.env
```

撤銷或重新申請:https://hackmd.io/settings#api

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
├── source/_posts/          ← 已發布的文章（公開）
├── source/_drafts/         ← 私人草稿庫（獨立的 private repo，不進這個 repo）
├── source/about/index.md   ← 關於頁
├── source/css/custom.css   ← 自訂樣式
├── source/img/             ← 圖片放這
├── _config.yml             ← 網站基本設定
├── _config.fluid.yml       ← 外觀/主題設定
├── .env                    ← HackMD token(不進版控)
├── tools/                  ← 工具腳本
├── CLAUDE.md               ← 給 Claude Code 的專案規範
└── README.md               ← 這份
```

**不要動的東西**:`node_modules/`(套件)、`public/`(build 產物)、`db.json`(快取)。這三個都不進版控,砍掉重跑 `npm install` / `npm run build` 就會回來。

---

## 指令總表

```bash
npm run new "標題"            # 新增文章（直接進 _posts，會發布）
npm run draft "標題"          # 新增草稿（進 _drafts，私密不發布）
npm run draft:publish "標題"  # 草稿 → 文章
npm run server                # 本機預覽 (localhost:4000)
npm run server:draft          # 本機預覽，含草稿
npm run build                 # 產生靜態檔到 public/
npm run clean                 # 清快取
npm run rebuild               # clean + build
```

## 參考連結

- [Hexo 官方文件](https://hexo.io/zh-tw/docs/)
- [Fluid 主題文件](https://hexo.fluid-dev.com/docs/) — 所有可設定的選項
- [Hexo 外掛列表](https://hexo.io/plugins/) — 想加功能先來這找
- [KaTeX 支援的語法](https://katex.org/docs/supported.html) — 公式寫不出來時查這個
