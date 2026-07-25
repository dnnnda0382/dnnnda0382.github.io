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
git remote add origin https://github.com/dnnnda0382/dnnnda0382.github.io.git
git push -u origin main
```

### 3. 開啟 GitHub Pages

推上去之後,GitHub Actions 會自動跑一次,建立出 `gh-pages` branch。等它跑完(repo 的 **Actions** 頁籤看得到進度),然後:

**Settings → Pages → Source** 選 **Deploy from a branch**,branch 選 **`gh-pages`**,資料夾選 **`/ (root)`**,按 Save。

首次部署通常要等幾分鐘網址才會生效。

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

```bash
node tools/import-hackmd.mjs --list                # 列出全部與 id
node tools/import-hackmd.mjs --id <id> --dry-run   # 預覽,不寫檔
node tools/import-hackmd.mjs --id <id>             # 匯入單篇
node tools/import-hackmd.mjs --all --draft         # 全搬,但標成未發布
```

`--draft` 會加上 `published: false`,不會出現在網站上。逐篇檢查完把那行刪掉就會發布。

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
├── source/_posts/          ← 文章都在這
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
npm run new "標題"   # 新增文章
npm run server       # 本機預覽 (localhost:4000)
npm run build        # 產生靜態檔到 public/
npm run clean        # 清快取
npm run rebuild      # clean + build
```

## 參考連結

- [Hexo 官方文件](https://hexo.io/zh-tw/docs/)
- [Fluid 主題文件](https://hexo.fluid-dev.com/docs/) — 所有可設定的選項
- [Hexo 外掛列表](https://hexo.io/plugins/) — 想加功能先來這找
- [KaTeX 支援的語法](https://katex.org/docs/supported.html) — 公式寫不出來時查這個
