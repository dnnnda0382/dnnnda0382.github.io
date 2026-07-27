#!/usr/bin/env bash
#
# 把草稿發布成文章（source/_drafts/ → source/_posts/）。
#
#   npm run draft:publish "114-1 台大資工大一上修課心得"
#   npm run draft:publish                      # 不給參數就列出所有草稿
#
# 為什麼不直接用 hexo publish
# ------------------------------------------------------------------
# hexo publish 會先把你給的字串丟進 slugize()，再拿結果去比對 _drafts/ 裡的
# 檔名開頭（見 node_modules/hexo/dist/hexo/post.js 的 publish()）。slugize 會
# 把空格換成 dash，所以檔名帶空格的草稿永遠比對不到：
#
#   slugize("114-1 台大資工大一上修課心得") → "114-1-台大資工大一上修課心得"
#   實際檔名                                 → "114-1 台大資工大一上修課心得.md"
#
# 也就是說 hexo publish 只找得到 hexo new draft 自己建的草稿（那些在建檔時就
# slugify 過了）。從 HackMD 匯進來的都帶空格（見 tools/import-hackmd.mjs 的
# safeFilename()），一律中不了。
#
# 這個腳本改成直接比對檔名，不做 slugify，所以空格、括號都沒問題。
# hexo publish 除了搬檔案之外只會把 layout 設成 post，而草稿的 front-matter
# 本來就有需要的欄位，所以搬過去就等價。
#
# 注意：這個檔案放在 tools/ 而不是 scripts/，因為 Hexo 會把根目錄 scripts/
#      底下的檔案當成外掛自動載入。

set -euo pipefail

cd "$(dirname "$0")/.."

DRAFTS="source/_drafts"
POSTS="source/_posts"

if [ ! -d "$DRAFTS" ]; then
    echo "✗ 找不到 $DRAFTS" >&2
    exit 1
fi

list_drafts() {
    find "$DRAFTS" -maxdepth 1 -name '*.md' -printf '%f\n' | sed 's/\.md$//' | sort
}

# 不給參數就列出草稿，順便當作「我有哪些草稿」的查詢指令
if [ $# -eq 0 ]; then
    echo "用法: npm run draft:publish \"草稿標題\""
    echo
    echo "目前的草稿："
    list_drafts | sed 's/^/  /'
    exit 1
fi

NAME="$*"
NAME="${NAME%.md}"          # 允許使用者順手帶上 .md

# 依序嘗試：完全相同 → 忽略大小寫 → 部分比對
SRC=""
if [ -f "$DRAFTS/$NAME.md" ]; then
    SRC="$DRAFTS/$NAME.md"
else
    MATCHES="$(list_drafts | grep -ixF "$NAME" || true)"
    [ -z "$MATCHES" ] && MATCHES="$(list_drafts | grep -iF "$NAME" || true)"

    COUNT="$(printf '%s' "$MATCHES" | grep -c . || true)"
    if [ "$COUNT" -eq 0 ]; then
        echo "✗ 找不到草稿：$NAME" >&2
        echo >&2
        echo "目前的草稿：" >&2
        list_drafts | sed 's/^/  /' >&2
        exit 1
    elif [ "$COUNT" -gt 1 ]; then
        echo "✗ 有多個草稿符合「$NAME」，請給更完整的名稱：" >&2
        printf '%s\n' "$MATCHES" | sed 's/^/  /' >&2
        exit 1
    fi
    SRC="$DRAFTS/$MATCHES.md"
fi

BASE="$(basename "$SRC")"
DEST="$POSTS/$BASE"

if [ -e "$DEST" ]; then
    echo "✗ $DEST 已經存在，不覆蓋" >&2
    exit 1
fi

# 發布前先確認
# ------------------------------------------------------------------
# 這一步是刻意的。搬進 _posts 之後只要 push 出去，內容就進了公開 repo，
# 而依照 CLAUDE.md 記錄的事故，那等於再也收不回來（改寫歷史 + force push
# 都清不掉，GitHub 仍可用舊 SHA 取回檔案）。所以寧可多按一次 y。
echo "準備發布："
echo "  來源  $SRC"
echo "  目標  $DEST"
echo

# front-matter 檢查
# ------------------------------------------------------------------
# 邏輯放在 tools/check-frontmatter.mjs（同一個檔案也是 npm run check 在用的），
# 「哪些欄位算填了」只定義一次，這裡的提醒和那張盤點表才不會各說各話。
node tools/check-frontmatter.mjs "$SRC"

echo
echo "⚠️  發布後 push 出去，內容就會進入公開 repo，實務上收不回來。"

if [ "${PUBLISH_YES:-}" != "1" ]; then
    if [ ! -t 0 ]; then
        echo "✗ 不是互動式終端機，無法確認。確定要發布請用：PUBLISH_YES=1 npm run draft:publish \"...\"" >&2
        exit 1
    fi
    printf '確定要發布嗎？[y/N] '
    read -r ANSWER
    case "$ANSWER" in
        [yY]|[yY][eE][sS]) ;;
        *) echo "已取消，沒有動任何檔案"; exit 0 ;;
    esac
fi

mv "$SRC" "$DEST"

echo
echo "✓ 已發布：$DEST"
echo
echo "接下來："
echo "  1. 補上 front-matter 的 tags 和 categories（匯入的草稿這兩欄是空的）"
echo "  2. npm run server        # 確認排版正常"
echo "  3. git add \"$DEST\" && git commit && git push"
echo
echo "另外 $DRAFTS 是獨立的私人 repo，那邊會多一筆刪除記錄，記得也去 commit。"
