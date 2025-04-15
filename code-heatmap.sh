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
# - .gitignoreで指定されたファイルは除外
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

# 開始時刻を記録
START_TIME=$(date +%s)
echo "処理開始: $(date '+%Y-%m-%d %H:%M:%S')"

# 引数チェック
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <target_directory>"
    exit 1
fi

TARGET_DIR="$1"

# ターゲットディレクトリが存在し、Gitリポジトリであることを確認
if [ ! -d "$TARGET_DIR" ]; then
    echo "エラー: ディレクトリ $TARGET_DIR が存在しません"
    exit 1
fi

if [ ! -d "$TARGET_DIR/.git" ]; then
    echo "エラー: $TARGET_DIR はGitリポジトリではありません"
    exit 1
fi

cd "$TARGET_DIR"
echo "作業ディレクトリ: $(pwd)"

# 一時ファイルの作成
TEMP_DIR=$(mktemp -d)
METRICS_FILE="$TEMP_DIR/metrics.json"
IGNORED_FILES="$TEMP_DIR/ignored.txt"

echo "一時ディレクトリ: $TEMP_DIR"

# スクリプト終了時に一時ファイルを削除
trap 'rm -rf "$TEMP_DIR"' EXIT

# Gitで無視されているファイルのリストを取得
echo "Gitで無視されているファイルのリストを取得中..."
git ls-files --others --ignored --exclude-standard > "$IGNORED_FILES"

# JSONの開始
echo "JSONファイルの初期化..."
echo "{" > "$METRICS_FILE"
echo "  \"name\": \"root\"," >> "$METRICS_FILE"
echo "  \"children\": [" >> "$METRICS_FILE"

# ディレクトリごとの処理
first_dir=true
dir_count=0
file_count=0

# Gitで追跡されているファイルのみを処理
echo "Git管理されているファイルの一覧を取得中..."
GIT_FILES=$(git ls-files --full-name)
TOTAL_FILES=$(echo "$GIT_FILES" | wc -l)
TOTAL_DIRS=$(echo "$GIT_FILES" | xargs -n1 dirname | sort -u | wc -l)
echo "トータル処理件数: $TOTAL_FILES ファイル、$TOTAL_DIRS ディレクトリ"

for dir in $(echo "$GIT_FILES" | xargs -n1 dirname | sort -u); do
    dir_count=$((dir_count + 1))
    echo "ディレクトリを処理中: $dir ($dir_count/$TOTAL_DIRS)"

    # JSONのカンマ区切り
    if [ "$first_dir" = true ]; then
        first_dir=false
    else
        echo "    }," >> "$METRICS_FILE"
    fi

    # ディレクトリ情報の出力
    echo "    {" >> "$METRICS_FILE"
    echo "      \"name\": \"$dir\"," >> "$METRICS_FILE"
    echo "      \"children\": [" >> "$METRICS_FILE"

    # ファイルごとの処理
    first_file=true
    for file in $(git ls-files --full-name "$dir"); do
        # ファイルが存在しない場合はスキップ
        if [ ! -f "$file" ]; then
            echo "警告: ファイルが存在しません: $file"
            continue
        fi

        # バイナリファイルはスキップ
        if file "$file" | grep -q "binary"; then
            echo "バイナリファイルをスキップ: $file"
            continue
        fi

        file_count=$((file_count + 1))
        echo "ファイルを処理中: $file ($file_count/$TOTAL_FILES)"

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

# 終了時刻を記録
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "処理完了: $dir_count ディレクトリ、$file_count ファイルを処理しました"
echo "開始時刻: $(date -r $START_TIME '+%Y-%m-%d %H:%M:%S')"
echo "終了時刻: $(date -r $END_TIME '+%Y-%m-%d %H:%M:%S')"
echo "所要時間: $DURATION 秒"

# 整形されたJSONをoutput.jsonに出力
echo "JSONファイルを出力中..."
cat "$METRICS_FILE" | jq '.' > output.json
echo "出力完了: output.json"
