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
# - awk: データ処理に使用
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
GIT_LOG_FILE="$TEMP_DIR/git_log.txt"
FILE_TYPES="$TEMP_DIR/file_types.txt"
LINE_COUNTS="$TEMP_DIR/line_counts.txt"

echo "一時ディレクトリ: $TEMP_DIR"

# スクリプト終了時に一時ファイルを削除
trap 'rm -rf "$TEMP_DIR"' EXIT

# Gitで無視されているファイルのリストを取得
echo "Gitで無視されているファイルのリストを取得中..."
git ls-files --others --ignored --exclude-standard > "$IGNORED_FILES"

# Git管理されているファイルの一覧を取得
echo "Git管理されているファイルの一覧を取得中..."
GIT_FILES=$(git ls-files --full-name)
TOTAL_FILES=$(echo "$GIT_FILES" | wc -l)
TOTAL_DIRS=$(echo "$GIT_FILES" | xargs -n1 dirname | sort -u | wc -l)
echo "トータル処理件数: $TOTAL_FILES ファイル、$TOTAL_DIRS ディレクトリ"

# 全ファイルのGit履歴を一括取得
echo "Git履歴を取得中..."
git log --name-only --format="COMMIT %H %ae" > "$GIT_LOG_FILE"

# 全ファイルのタイプを一括チェック
echo "ファイルタイプをチェック中..."
file $(echo "$GIT_FILES") > "$FILE_TYPES"

# 全ファイルの行数を一括カウント
echo "ファイルの行数をカウント中..."
wc -l $(echo "$GIT_FILES") > "$LINE_COUNTS"

# Git履歴から変更回数とユーザー数を集計
echo "Git履歴を解析中..."
# 変更回数とユーザーのマッピングファイルを作成
CHANGES_FILE="$TEMP_DIR/changes.txt"
AUTHORS_FILE="$TEMP_DIR/authors.txt"

awk '
    BEGIN { last_commit = ""; last_author = ""; }
    /^COMMIT/ {
        last_commit = $2;
        last_author = $3;
        next;
    }
    NF > 0 {
        if (last_commit != "" && last_author != "") {
            changes[$0]++;
            authors[$0] = authors[$0] "|" last_author;
        }
    }
    END {
        for (file in changes) {
            print file "\t" changes[file] > "'$CHANGES_FILE'";
            print file "\t" authors[file] > "'$AUTHORS_FILE'";
        }
    }
' "$GIT_LOG_FILE"

# JSONの開始
echo "JSONファイルの初期化..."
echo "{" > "$METRICS_FILE"
echo "  \"name\": \"root\"," >> "$METRICS_FILE"
echo "  \"children\": [" >> "$METRICS_FILE"

# ディレクトリごとの処理
first_dir=true
dir_count=0
file_count=0

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
        if grep -q "binary" <<< "$(grep "^$file:" "$FILE_TYPES")"; then
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
        loc=$(grep "^$file " "$LINE_COUNTS" | awk '{print $1}')

        # 変更回数を取得
        changes=$(grep "^$file\t" "$CHANGES_FILE" | cut -f2)
        if [ -z "$changes" ]; then
            changes=0
        fi

        # ユーザー数を取得
        authors=$(grep "^$file\t" "$AUTHORS_FILE" | cut -f2 | tr '|' '\n' | sort -u | wc -l)
        if [ -z "$authors" ]; then
            authors=0
        fi

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

# 実際のファイル数を計算（ディレクトリ数を除外）
ACTUAL_FILE_COUNT=$((file_count - dir_count))

echo "処理完了: $dir_count ディレクトリ、$ACTUAL_FILE_COUNT ファイルを処理しました"
echo "開始時刻: $(date -r $START_TIME '+%Y-%m-%d %H:%M:%S')"
echo "終了時刻: $(date -r $END_TIME '+%Y-%m-%d %H:%M:%S')"
echo "所要時間: $DURATION 秒"

# 整形されたJSONをoutput.jsonに出力
echo "JSONファイルを出力中..."
cat "$METRICS_FILE" | jq '.' > output.json
echo "出力完了: output.json"
