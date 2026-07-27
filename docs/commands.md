# 指令筆記

這份是架站過程中實際用過的指令整理,附上「當時為什麼要下它」。
建議不要從頭背,先看「每天會用到的」那幾個,其他當字典查就好。

符號約定:`<像這樣>` 代表要換成你自己的值。

---

## 目錄

- [每天會用到的](#每天會用到的)
- [Shell 基礎](#shell-基礎)
- [檔案操作](#檔案操作)
- [搜尋與文字處理](#搜尋與文字處理)
- [Node / npm / nvm](#node--npm--nvm)
- [Hexo](#hexo)
- [Git — 日常](#git--日常)
- [Git — 查詢與偵錯](#git--查詢與偵錯)
- [Git — 危險操作](#git--危險操作)
- [網路:curl 與 ssh](#網路curl-與-ssh)
- [行程與 port](#行程與-port)
- [這次踩過的坑](#這次踩過的坑)

---

## 每天會用到的

只記這幾個就能發文章:

```bash
cd ~/homepage              # 切到專案資料夾
npm run new "標題"         # 開一篇新文章
npm run server             # 本機預覽 → localhost:4000（Ctrl+C 結束）
git add .                  # 把改動加入待提交區
git commit -m "訊息"       # 存成一個版本
git push                   # 推上 GitHub（然後自動部署）
git status                 # 現在有哪些檔案被改了
git log --oneline          # 看過去的提交紀錄
```

---

## Shell 基礎

### 我在哪、有什麼

```bash
pwd                # 印出目前所在資料夾（print working directory）
ls                 # 列出檔案
ls -la             # -l 詳細資訊（權限/大小/時間）、-a 連隱藏檔（. 開頭）也列
cd ~/homepage      # 切換資料夾。~ 是你的家目錄 /home/dnnnda
cd ..              # 回上一層
```

> 這次用 `ls -la` 才看到 `.env`、`.gitignore` 這些 `.` 開頭的隱藏檔。

### 這個指令存在嗎

```bash
command -v code    # 印出 code 的完整路徑；沒裝就沒有輸出
which lsof         # 同上，較舊的寫法
```

> 用來確認能不能用某個工具。這次靠它發現 `code` 其實是指向 Windows 的
> `code.exe`(WSL interop),才找到 `npm run new` 卡住的原因。

### 串接與條件

```bash
指令A && 指令B     # A 成功才執行 B
指令A || 指令B     # A 失敗才執行 B
指令A | 指令B      # 把 A 的輸出餵給 B 當輸入（pipe，管線）
```

範例:

```bash
npm run build && git push        # build 成功才推
git check-ignore .env && echo "安全"
ls | wc -l                       # 列檔案 → 數行數 = 檔案數
```

### 輸出導向

```bash
指令 > file.txt      # 輸出寫進檔案（覆蓋）
指令 >> file.txt     # 附加到檔案結尾
指令 > /dev/null     # 丟掉輸出（/dev/null 是黑洞）
指令 2>&1            # 把錯誤訊息(2)併到正常輸出(1)
指令 >/dev/null 2>&1 # 完全安靜
```

> `2>&1` 很常見。編號:0=輸入 1=正常輸出 2=錯誤輸出。

### 變數

```bash
echo $HOME                  # 讀變數
echo "${EDITOR:-沒設定}"    # 有值就用，沒值用預設
VAR=值                      # 設定（只在這個 shell 有效）
export VAR=值               # 設定並讓子行程也看得到
```

### 一次跑很多次

```bash
for i in $(seq 1 10); do echo "第 $i 次"; sleep 2; done
```

> 這次用來輪詢等網站上線:每 20 秒檢查一次 HTTP 狀態碼。

### 寫多行文字進檔案(heredoc)

```bash
cat > 檔名.txt <<'EOF'
第一行
第二行
EOF
```

> `<<'EOF'` 的**單引號很重要**:加了引號,裡面的 `$變數` 不會被展開,
> 原封不動寫進去。這次寫 commit 訊息、產生設定檔都用它。

### 限時執行

```bash
timeout 60 指令      # 最多跑 60 秒，超過就砍掉
```

> 用來測試會不會卡住。`npm run new` 卡死時就是靠這個才沒把終端機鎖住。

---

## 檔案操作

```bash
mkdir -p a/b/c          # 建資料夾，-p = 中間層不存在就一起建，已存在也不報錯
touch 檔名              # 建立空檔案
cp 來源 目的            # 複製
mv 舊 新                # 移動 or 改名（同一個指令）
rm 檔名                 # 刪除
rm -f 檔名              # 強制，檔案不存在也不報錯
rm -rf 資料夾           # 遞迴刪整個資料夾 ⚠️ 沒有回收桶
cat 檔名                # 印出整個檔案
head -20 檔名           # 前 20 行
tail -20 檔名           # 後 20 行
du -h 檔名              # 檔案大小（-h = 人看得懂的單位）
```

### 權限

```bash
chmod +x script.sh      # 加上「可執行」權限
chmod 600 .env          # 只有自己能讀寫（保護機密檔案）
```

> 數字是三碼:擁有者/群組/其他人,4=讀 2=寫 1=執行。
> `600` = 自己讀寫、其他人完全不能碰。這次用在 `.env`。

---

## 搜尋與文字處理

### grep — 找內容

```bash
grep "字串" 檔案              # 找出含該字串的行
grep -n "字串" 檔案           # -n 顯示行號
grep -i "字串" 檔案           # -i 忽略大小寫
grep -c "字串" 檔案           # -c 只印出「幾行符合」
grep -o "字串" 檔案           # -o 只印出符合的部分，不印整行
grep -v "字串" 檔案           # -v 反向：印出「不含」的行
grep -r "字串" 資料夾/        # -r 遞迴搜整個資料夾
grep -l "字串" *              # -l 只印出檔名，不印內容
grep -E "a|b" 檔案            # -E 用進階正則表達式（| 是「或」）
grep -A 5 "字串" 檔案         # 連同符合行的「後」5 行一起印
grep -B 5 "字串" 檔案         # 「前」5 行
```

實際用過的:

```bash
# 確認公式真的在 build 階段渲染好了（數字 > 0 就對）
grep -c 'katex-display' "public/2026/07/25/功能測試.../index.html"

# 檢查有沒有把 token 誤加進版控
git diff --cached --name-only | grep -x ".env"
```

### sed — 取行、取代

```bash
sed -n '10,20p' 檔案           # 只印第 10~20 行（-n 不自動印，p 才印）
sed 's|舊|新|' 檔案            # 取代每行第一個符合的
sed 's|舊|新|g' 檔案           # g = 全部取代
```

> 分隔符不一定要 `/`,路徑裡有斜線時用 `|` 比較好讀。

### find — 找檔案

```bash
find . -name "*.md"                    # 目前資料夾往下找所有 .md
find source -type f -name "*.png"      # -type f 只找檔案（d 是資料夾）
find public -name index.html -regextype posix-extended -regex '...'
```

> 最後那個是用正則精確比對「年/月/日/標題」的路徑,
> 才不會把彙整頁也算成文章。我第一次寫錯 regex 少算了,重寫才對。

### 其他常用

```bash
wc -l           # 數行數（word count -lines）
sort            # 排序
sort -u         # 排序並去重
uniq -c         # 統計每個值出現幾次（要先 sort）
cut -d: -f1     # 用 : 分隔，取第 1 欄
tr -d ' '       # 刪掉空白
xargs 指令      # 把前面的輸出變成後面指令的「參數」
basename 路徑   # 取檔名
dirname 路徑    # 取資料夾部分
```

`xargs` 的用途最不直觀,比較一下:

```bash
ls | wc -l              # wc 從「輸入」讀 → 可以
echo "abc" | rm         # rm 不吃輸入，要的是「參數」→ 沒用
echo "abc" | xargs rm   # xargs 把 abc 轉成參數 → rm abc ✓
```

---

## Node / npm / nvm

### nvm — 管理 Node 版本

```bash
nvm install 22          # 安裝 Node 22
nvm use 22              # 這個終端機切到 Node 22
nvm use                 # 自動讀資料夾裡的 .nvmrc
nvm alias default 22    # 設成以後開終端機的預設版本
nvm ls                  # 列出裝了哪些版本
node -v                 # 現在是哪個版本
```

> **為什麼需要 nvm**:系統內建的 Node 18 跑不動 Hexo 8(會噴
> `ERR_REQUIRE_ESM`)。nvm 讓你在使用者層級裝新版,不用動到系統、不用 sudo。

在腳本裡要先載入 nvm 才能用(它是 shell 函式,不是一般指令):

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22
```

> 開頭的 `.` 等同 `source`,意思是「在目前的 shell 執行這個檔案」。

### npm — 套件管理

```bash
npm install                        # 依 package.json 裝好全部套件
npm install <套件>                 # 裝一個套件並寫進 package.json
npm install --save-exact <套件>@1.2.3   # 鎖死版本，不接受自動升級
npm uninstall <套件>               # 移除
npm ci                             # 依 package-lock.json 精準還原（CI 用）
npm run <script>                   # 執行 package.json 裡定義的指令
npm view <套件> version            # 查最新版號（不會安裝）
npm audit                          # 檢查已知漏洞
npm config get editor              # 看 npm 的設定值
```

**`npm install` vs `npm ci`**

| | `npm install` | `npm ci` |
|---|---|---|
| 依據 | `package.json`(允許小版本浮動) | `package-lock.json`(完全精確) |
| 會改 lock 檔嗎 | 會 | 不會 |
| 適用 | 平常開發 | CI / 要求可重現 |

> GitHub Actions 用 `npm ci`,確保雲端裝的版本跟你本機一模一樣。

### node — 直接執行

```bash
node script.mjs             # 執行檔案
node --check script.mjs     # 只檢查語法有沒有錯，不執行
node -e "console.log(1+1)"  # 直接執行一行程式
```

> `node --check` 在改完腳本後先跑一次,可以馬上抓到打錯字。

### npx

```bash
npx hexo generate           # 執行本地安裝的套件，不用全域安裝
```

---

## Hexo

```bash
npx hexo version            # 版本與環境資訊
npx hexo new "標題"         # 新文章 → source/_posts/
npx hexo new page about     # 新頁面 → source/about/
npx hexo new draft "標題"   # 新草稿 → source/_drafts/
npx hexo publish "標題"     # ⚠️ 這個在本專案用不了，見下方「坑 6」
npx hexo server             # 本機預覽
npx hexo server -p 5000     # 指定 port
npx hexo server --draft     # 預覽時也顯示草稿
npx hexo generate           # 產生靜態檔到 public/
npx hexo generate --draft   # 連草稿一起產生
npx hexo clean              # 清掉 public/ 和快取 db.json
```

包成 npm script 之後(這是專案裡設定好的):

```bash
npm run new "標題"
npm run draft "標題"
npm run draft:publish            # 不給參數 = 列出所有草稿
npm run draft:publish "標題"     # 發布前會 y/N 確認，並提醒缺的 front-matter 欄位
npm run check                    # 盤點文章缺哪些 front-matter 欄位
npm run check -- --drafts        # 改看草稿
npm run server
npm run server:draft
npm run build
npm run clean
npm run rebuild          # = clean + build，設定改壞時用
```

專案自己的工具腳本(不是 npm script,直接用 node 跑):

```bash
node tools/import-hackmd.mjs --list                # 列出 HackMD 上的筆記
node tools/import-hackmd.mjs --all --out source/_drafts   # 全部匯進草稿
node tools/localize-images.mjs                     # 預覽:文章裡有哪些外部圖片
node tools/localize-images.mjs --apply             # 抓回 source/images/ 並改連結
node tools/drop-bg.mjs <輸入> <輸出> [高度]        # 手寫圖去背(需先裝 sharp)
```

> **改了設定卻沒生效** → 先跑 `npm run rebuild`。Hexo 的 `db.json`
> 快取有時會讓改動看起來沒作用。

---

## Git — 日常

```bash
git init -b main                    # 初始化，主分支叫 main
git status                          # 現在有哪些改動
git status --short                  # 精簡版（M=修改 A=新增 ??=未追蹤）
git add 檔名                        # 加入待提交區
git add .                           # 加入目前資料夾底下所有改動
git add -A                          # 加入整個 repo 的所有改動（含刪除）
git commit -m "訊息"                # 提交
git log --oneline                   # 一行一個 commit
git push                            # 推上遠端
git push -u origin main             # 第一次推，並記住對應關係
git pull                            # 拉下遠端的更新
git clone <網址> <資料夾>           # 複製一個 repo 下來
```

### 遠端設定

```bash
git remote -v                       # 看目前設定的遠端網址
git remote add origin <網址>        # 新增遠端（叫 origin）
git remote set-url origin <網址>    # 改網址（不用刪掉重加）
git remote get-url origin           # 只印出網址
```

**SSH vs HTTPS 網址**

```
git@github.com:帳號/repo.git          ← SSH，用金鑰（我們用這個）
https://github.com/帳號/repo.git      ← HTTPS，要帳密（GitHub 已不接受密碼）
```

> ⚠️ `git remote add` **不會驗證網址對不對**,設錯了要到 `push` 才會失敗。
> 這次就是設成 HTTPS 才推不上去,用 `set-url` 改掉就好。

### .gitignore 相關

```bash
git check-ignore -v <檔案>     # 這個檔案有沒有被忽略？被哪一行規則擋的？
git ls-files                   # 列出所有「已被版控追蹤」的檔案
```

> `git check-ignore -v .env` 是**每次加機密檔案後都該跑**的確認動作。
> 有輸出 = 有被擋住 = 安全。

---

## Git — 查詢與偵錯

```bash
git log --oneline -- <路徑>          # 只看某個檔案的歷史
git log --all --format="%h %s"       # 所有分支的 commit（%h=短SHA %s=標題）
git show <SHA>:<檔案路徑>            # 取出某個 commit 當時的檔案內容
git cat-file -e <SHA>:<路徑>         # 只檢查存不存在（給腳本用）
git ls-tree -r --name-only <SHA>     # 列出某個 commit 的所有檔案
git rev-list --count main            # 數 main 有幾個 commit
git rev-list --all                   # 列出所有 commit 的 SHA
git rev-parse main                   # main 目前指向哪個 SHA
git branch -r --contains <SHA>       # 哪些遠端分支包含這個 commit
git ls-remote --heads origin         # 遠端有哪些分支（不用先 clone）
git diff --cached --name-only        # 待提交的檔案清單
git fetch origin <分支>              # 抓遠端更新但不合併
```

實際用過的組合技——**確認某個檔案是否真的從全部歷史消失**:

```bash
for c in $(git rev-list --all); do
  git ls-tree -r --name-only "$c" | grep -q "檔名" && echo "還在 $c"
done
```

---

## Git — 危險操作

> ⚠️ 這一區的指令會**改寫歷史**,做之前先備份。

### 備份

```bash
git bundle create backup.bundle --all    # 把整個 repo 打包成一個檔
```

> 出事了可以用 `git clone backup.bundle 資料夾` 還原。這次改寫歷史前先做了。

### 從所有歷史中移除某個檔案

```bash
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch "path/to/file.md"' \
  --prune-empty -- main
```

拆解:

| 部分 | 意思 |
|---|---|
| `--index-filter` | 對每個 commit 執行後面那段(比 tree-filter 快) |
| `git rm --cached` | 從版控移除但不刪本機檔案 |
| `--ignore-unmatch` | 該 commit 沒有這個檔案時不要報錯 |
| `--prune-empty` | 改完變成空的 commit 就刪掉 |
| `-- main` | 只處理 main 分支 |

清掉殘留:

```bash
rm -rf .git/refs/original          # filter-branch 留的備份參照
git reflog expire --expire=now --all
git gc --prune=now --aggressive    # 真正回收物件
```

### 強制推送

```bash
git push --force-with-lease origin main   # 較安全：遠端有別人的新提交就拒絕
git push --force origin main              # 無條件覆蓋 ⚠️ 會蓋掉別人的工作
git push origin --delete <分支>           # 刪除遠端分支
```

> 優先用 `--force-with-lease`。

### ⚠️ 最重要的一課

**改寫歷史 + force push 清不掉 GitHub 上的東西。**

這次實測:改寫完歷史推上去後,舊的 commit 用 API 查依然回 **HTTP 200**,
檔案內容照樣拿得回來——因為 GitHub 不會立即回收「無法從分支到達」的 commit,
只要知道 SHA 就還在。

最後是**刪掉整個 repo 重建**才真的清乾淨(舊 SHA 變成 404/409)。

所以:

- **東西一旦推上公開 repo,就當作再也收不回來**
- token 洩漏的正解是**撤銷重發**,不是想辦法從歷史刪掉
- 不確定能不能公開的,先放不進版控的地方

---

## 網路:curl 與 ssh

### curl

```bash
curl <網址>                                  # 抓網頁內容
curl -s <網址>                               # -s 安靜，不顯示進度條
curl -f <網址>                               # -f 失敗時回傳錯誤碼
curl -L <網址>                               # -L 跟隨轉址
curl -o 檔名 <網址>                          # 存成檔案
curl -fsSL <網址>                            # 常見組合（安靜+失敗報錯+跟轉址）
curl -H "Authorization: Bearer <token>" ...  # 加自訂 header（API 認證）
curl -s -o /dev/null -w '%{http_code}' <網址>  # 只要 HTTP 狀態碼
```

最後那個超好用,檢查網站活著沒:

```bash
curl -s -o /dev/null -w 'HTTP %{http_code}\n' -L https://dnnnda0382.github.io/
```

| 狀態碼 | 意思 |
|---|---|
| 200 | 正常 |
| 404 | 找不到 |
| 403 | 沒權限 |
| 409 | 衝突(GitHub 用它表示 repo 是空的) |
| 000 | curl 自己失敗(常見原因:網址有空白沒編碼) |

> 網址裡有中文或空白時要編碼,空白是 `%20`。這次好幾次拿到 `000`
> 都是這個原因,不是網站有問題。

### ssh

```bash
ssh -T git@github.com          # 測試 GitHub SSH 認證
ls ~/.ssh/*.pub                # 看有哪些公鑰
```

> ⚠️ 測試成功時 GitHub 會回 `Hi <帳號>! You've successfully authenticated`
> 然後以 **exit code 1** 結束。**這是正常的**(因為 GitHub 不提供 shell),
> 看到那句話就是通了,別被 exit code 嚇到。

### 讀 .env 到環境變數

```bash
set -a && . ./.env && set +a
```

> `set -a` = 之後定義的變數自動 export;載入檔案;`set +a` 關掉。
> 這樣 `.env` 裡的 `HACKMD_TOKEN` 就變成可用的環境變數了。

---

## 行程與 port

```bash
ps -eo pid,ppid,etime,cmd        # 列出所有行程
ss -ltnp                         # 列出正在監聽的 port
ss -ltnp | grep 4000             # 誰佔用了 4000
lsof -ti:4000                    # 佔用 4000 的行程 ID
lsof -ti:4000 | xargs kill       # 砍掉它
kill <PID>                       # 正常結束
kill -9 <PID>                    # 強制砍掉（前者無效時才用）
pkill -f "關鍵字"                # 用指令內容比對來砍
```

> **教訓**:這次 `pkill -f "hexo server"` 沒砍乾淨,舊 server 還在跑,
> 結果我以為驗證通過的 200 其實是**舊內容**。後來改用
> `ss -ltnp | grep 4000` 確認 port 真的空了才重測。
>
> 砍完一定要確認,不要假設它死了。

---

## 這次踩過的坑

把幾個實際發生的問題串起來看,比單記指令有用:

### 1. Node 版本

**症狀**:`ERR_REQUIRE_ESM`,Hexo 完全跑不起來
**原因**:系統 Node 18 太舊,Hexo 8 需要 ≥ 20.19
**解法**:裝 nvm + Node 22,版本鎖在 `.nvmrc`
**怎麼查的**:

```bash
node -v                                    # 看版本
node -e "console.log(require('./node_modules/hexo/package.json').engines)"
```

### 2. `npm run` 會偷偷注入 `EDITOR=vi`

**症狀**:`npm run new` 卡死,還留下 `.swp` 檔
**原因**:npm 執行 script 時會把自己的 `editor` 設定注入成環境變數,
所以腳本裡判斷 `$EDITOR` 永遠成立 → 開了 vim → stdin 是 pipe → 卡死
**怎麼查的**:

```bash
npm run env | grep -i editor      # 發現 EDITOR=vi
npm config get editor             # 確認來源
```

**解法**:腳本改用自訂變數 `HEXO_EDITOR`

### 3. `{% raw %}` 包數學公式沒用

**症狀**:公式沒渲染,直接吐出 LaTeX 原始碼
**原因**:`raw` 的內容會被抽換成佔位符、跳過 Markdown 渲染,KaTeX 看不到
**正解**:在連續兩個左大括號中間**加一個空白**,LaTeX 會忽略空白

```latex
\frac{ {x}^{2} }{y}      ← 正確
\frac{{x}^{2}}{y}        ← Nunjucks 誤判，整個 build 失敗
```

**怎麼驗證的**:寫兩篇測試文章,一篇裸寫一篇加空白,分別 build 看結果。

### 4. 舊 server 沒砍乾淨

見上面「行程與 port」。教訓:**驗證前先確認環境是乾淨的**。

### 5. 誤發不該公開的文章

**處理順序**(這個順序很重要):

1. 先止血——把檔案移出 `_posts`、push、確認網站變 404
2. 評估曝險——`forks` 數、repo 建立時間、有沒有人 clone 過
3. 備份——`git bundle create`
4. 改寫歷史——`git filter-branch`
5. **驗證**——結果發現舊 commit 還在(HTTP 200)
6. 刪 repo 重建——這才真的清乾淨

**最大的收穫**:網路上的教學講到第 4 步就停了,那是不完整的。
一定要做第 5 步驗證,才會發現前面白做了。

### 6. `hexo publish` 找不到帶空格的草稿

```bash
npm run draft:publish "114-1 台大資工大一上修課心得"
# Error: Draft "114-1-台大資工大一上修課心得" does not exist.
```

檔案明明就在,為什麼找不到?因為 `hexo publish` 會先把你給的字串丟進
`slugize()`,再拿結果去比對 `_drafts/` 裡的**檔名開頭**:

```
slugize("114-1 台大資工大一上修課心得")  →  "114-1-台大資工大一上修課心得"
實際檔名                                  →  "114-1 台大資工大一上修課心得.md"
                                                   ↑ 空格,不是 dash
```

也就是說 `hexo publish` **只找得到 `hexo new draft` 建的草稿**(那些在建檔時就
slugify 過了)。從 HackMD 匯進來的檔名保留了原標題的空格,一律中不了。

**解法**:專案的 `npm run draft:publish` 已經改成呼叫 `tools/publish-draft.sh`,
直接比對檔名、不做 slugify,所以空格、括號都沒問題。不要退回去用 `npx hexo publish`。

### 7. 找 bug 前先確認「這是不是真的壞了」

掃全站 HackMD 語法殘留時,正則抓到 14 個 `^上標^`,看起來滿嚴重。
把實際命中的字串印出來之後才發現:

```
$O(n\cdot 2^n)$   ← LaTeX,本來就該給 KaTeX 處理
@#^%&^&#$^#       ← 被消音的髒話
10:20~12:20       ← 時間區間,不是下標
```

真正壞掉的只有 1 個。如果當時直接裝 `markdown-it-sup`/`sub` 去「修」,
反而會把上面這些全部弄壞。

**教訓**:掃描結果只是「候選」,不是「結論」。動手改之前一定要把命中的
內容連同前後文印出來看過。

---

## 延伸閱讀

不用背指令,需要時查:

```bash
指令 --help          # 大部分指令都支援
man 指令             # 完整手冊（q 離開）
```

- [Git 官方書(中文)](https://git-scm.com/book/zh-tw/v2) — 免費,前三章就夠日常使用
- [explainshell.com](https://explainshell.com/) — **貼一整行指令進去,它會逐個參數解釋**,學 shell 很好用
