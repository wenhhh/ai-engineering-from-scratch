#!/usr/bin/env bash
set -euo pipefail

# 将智能体工作台包安装到当前仓库。
# 警告：仅检查 AGENTS.md 的覆盖条件；其余同名目录文件仍可能被 cp 覆盖。
# 用法：bin/install.sh [--force]；请先在临时仓库或备份中试用。

FORCE="${1:-}"
TARGET="$(pwd)"
PACK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

required=("AGENTS.md" "VERSION" "docs" "schemas" "scripts")
for path in "${required[@]}"; do
    if [[ ! -e "$PACK_ROOT/$path" ]]; then
        echo "工作台包缺少源文件：$PACK_ROOT/$path" >&2
        exit 1
    fi
done

if [[ -e "$TARGET/AGENTS.md" && "$FORCE" != "--force" ]]; then
    echo "AGENTS.md 已存在；传入 --force 才允许覆盖。" >&2
    exit 1
fi

cp "$PACK_ROOT/AGENTS.md" "$TARGET/AGENTS.md"
mkdir -p "$TARGET/docs" "$TARGET/schemas" "$TARGET/scripts"
cp -r "$PACK_ROOT/docs/." "$TARGET/docs/"
cp -r "$PACK_ROOT/schemas/." "$TARGET/schemas/"
cp -r "$PACK_ROOT/scripts/." "$TARGET/scripts/"
cat "$PACK_ROOT/VERSION" > "$TARGET/.workbench-version"

echo "已安装工作台包，版本 $(cat "$PACK_ROOT/VERSION")"
echo "下一步：准备并编辑 task_board.json，设置验收命令，然后运行 scripts/init_agent.py"
