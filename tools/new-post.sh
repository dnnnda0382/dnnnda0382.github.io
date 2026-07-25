#!/usr/bin/env bash
#
# 新增一篇文章。
#
#   npm run new "文章標題"
#
# 會用 scaffolds/post.md 當範本建立 source/_posts/<標題>.md，
# 然後印出路徑；如果有設定 $EDITOR 就直接開啟它。
#
# 注意：這個檔案放在 tools/ 而不是 scripts/，因為 Hexo 會把根目錄
#      scripts/ 底下的檔案當成外掛自動載入。

set -euo pipefail

cd "$(dirname "$0")/.."

TITLE="$*"

if [ -z "${TITLE// }" ]; then
    echo "用法: npm run new \"文章標題\"" >&2
    echo "例如: npm run new \"線性代數筆記\"" >&2
    exit 1
fi

# hexo new 的輸出長這樣（路徑可能以 ~ 開頭）：
#   INFO  Created: ~/homepage/source/_posts/標題.md
OUTPUT="$(npx hexo new "$TITLE" 2>&1)" || {
    echo "$OUTPUT" >&2
    exit 1
}

FILE="$(printf '%s\n' "$OUTPUT" | sed -n 's/.*Created: \(.*\.md\)$/\1/p' | tail -n 1)"

if [ -z "$FILE" ]; then
    echo "$OUTPUT" >&2
    echo "✗ 無法從 hexo 的輸出解析出檔案路徑" >&2
    exit 1
fi

# 把開頭的 ~ 展開成家目錄
FILE="${FILE/#\~/$HOME}"

if [ ! -f "$FILE" ]; then
    echo "✗ 檔案不存在：$FILE" >&2
    exit 1
fi

echo "✓ 已建立：$FILE"

# 自動開啟編輯器（選用）
# ------------------------------------------------------------------
# 這裡刻意「不」看 $EDITOR：npm run 會自動把 npm 自己的 editor 設定
# （預設值就是 vi）注入成環境變數 EDITOR，所以在 npm run 底下 $EDITOR
# 永遠有值。照著開下去就會莫名其妙跳進 vim，而且 stdin 是 pipe 的時候
# 會直接把終端機卡死、留下一堆 .swp 檔。
#
# 想要自動開啟的話，請設定 HEXO_EDITOR，例如在 ~/.bashrc 加：
#   export HEXO_EDITOR=nano
#
# 也刻意不自動啟動 VS Code：WSL 底下 `code` 是去呼叫 Windows 的 code.exe，
# 那個 interop 行程沒辦法跟 npm 的行程樹乾淨脫鉤（&、disown、setsid、
# 子 shell 都試過），會讓 `npm run new` 卡住不返回。改成印指令讓你自己開。
if [ -n "${HEXO_EDITOR:-}" ]; then
    "$HEXO_EDITOR" "$FILE"
elif command -v code >/dev/null 2>&1; then
    echo
    echo "  用 VS Code 開啟："
    echo "    code \"$FILE\""
fi
