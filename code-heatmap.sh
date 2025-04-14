#!/bin/bash

# =============================================================================
# code-heatmap.sh
# =============================================================================
# 
# Gitリポジトリのコードベースを分析し、メトリクスをJSON形式で出力するスクリプト
# 
# 仕様:
# - 入力: Gitリポジトリのパス
# - 出力: 以下のメトリクスを含むJSON
#   - loc: ファイルの行数
#   - changes: Gitコミット履歴での変更回数
#   - authors: 変更を加えた一意のユーザー数
# - 出力形式: code-heatmap.tsxコンポーネントと互換性のある階層構造
# 
# 制限事項:
# - 隠しファイル（.から始まるファイル）は除外
# - バイナリファイルは除外
# - Gitリポジトリである必要がある
# 
# 依存関係:
# - jq: JSONの整形に使用
# - git: リポジトリの分析に使用
# 
# 使用方法:
#   ./code-heatmap.sh /path/to/git/repository
# 
# 出力例:
# {
#   "name": "root",
#   "children": [
#     {
#       "name": "src",
#       "children": [
#         {
#           "name": "main.ts",
#           "loc": 100,
#           "changes": 5,
#           "authors": 2
#         }
#       ]
#     }
#   ]
# }
# =============================================================================

# エラーが発生したら即座に終了
set -e

# 引数チェック
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <target_directory>"
    exit 1
fi

TARGET_DIR="$1"

# ターゲットディレクトリが存在し、Gitリポジトリであることを確認
if [ ! -d "$TARGET_DIR" ] || [ ! -d "$TARGET_DIR/.git" ]; then
    echo "Error: $TARGET_DIR is not a valid Git repository"
    exit 1
fi

cd "$TARGET_DIR"

# 一時ファイルの作成
TEMP_DIR=$(mktemp -d)
METRICS_FILE="$TEMP_DIR/metrics.json"

# スクリプト終了時に一時ファイルを削除
trap 'rm -rf "$TEMP_DIR"' EXIT

# JSONの開始
echo "{" > "$METRICS_FILE"
echo "  \"name\": \"root\"," >> "$METRICS_FILE"
echo "  \"children\": [" >> "$METRICS_FILE"

# ディレクトリごとの処理
first_dir=true
for dir in $(find . -type d -not -path "*/\.*" | sort); do
    # rootディレクトリはスキップ
    if [ "$dir" = "." ]; then
        continue
    fi

    # JSONのカンマ区切り
    if [ "$first_dir" = true ]; then
        first_dir=false
    else
        echo "    }," >> "$METRICS_FILE"
    fi

    # ディレクトリ情報の出力
    echo "    {" >> "$METRICS_FILE"
    echo "      \"name\": \"${dir#./}\"," >> "$METRICS_FILE"
    echo "      \"children\": [" >> "$METRICS_FILE"

    # ファイルごとの処理
    first_file=true
    for file in $(find "$dir" -maxdepth 1 -type f -not -path "*/\.*" | sort); do
        # ファイルが存在しない場合はスキップ
        if [ ! -f "$file" ]; then
            continue
        fi

        # バイナリファイルはスキップ
        if file "$file" | grep -q "binary"; then
            continue
        fi

        # JSONのカンマ区切り
        if [ "$first_file" = true ]; then
            first_file=false
        else
            echo "        }," >> "$METRICS_FILE"
        fi

        # ファイルの行数を取得
        loc=$(wc -l < "$file")

        # Git履歴から変更回数を取得
        changes=$(git log --follow --oneline "$file" | wc -l)

        # Git履歴から変更したユーザー数を取得
        authors=$(git log --follow --format="%ae" "$file" | sort -u | wc -l)

        # ファイル情報の出力
        echo "        {" >> "$METRICS_FILE"
        echo "          \"name\": \"${file#$dir/}\"," >> "$METRICS_FILE"
        echo "          \"loc\": $loc," >> "$METRICS_FILE"
        echo "          \"changes\": $changes," >> "$METRICS_FILE"
        echo "          \"authors\": $authors" >> "$METRICS_FILE"
    done

    # ディレクトリ内のファイルがある場合は最後のファイルのJSONを閉じる
    if [ "$first_file" = false ]; then
        echo "        }" >> "$METRICS_FILE"
    fi

    # ディレクトリの子要素（ファイル）リストを閉じる
    echo "      ]" >> "$METRICS_FILE"
done

# 最後のディレクトリのJSONを閉じる
if [ "$first_dir" = false ]; then
    echo "    }" >> "$METRICS_FILE"
fi

# JSONのルート要素を閉じる
echo "  ]" >> "$METRICS_FILE"
echo "}" >> "$METRICS_FILE"

# 整形されたJSONを出力
cat "$METRICS_FILE" | jq '.'
