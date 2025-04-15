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

# ファイルパスを正規化する関数
normalize_path() {
    local path="$1"
    # 相対パスを絶対パスに変換
    if [[ ! "$path" = /* ]]; then
        path="$PWD/$path"
    fi
    # パスの正規化（重複するスラッシュの削除、./ や ../ の解決）
    python3 -c "import os.path; print(os.path.normpath('$path'))"
}

# ファイルパスの比較用に正規化されたターゲットディレクトリを設定
TARGET_DIR=$(normalize_path "$1")

# 入力チェック
if [ -z "$TARGET_DIR" ]; then
    echo "エラー: ターゲットディレクトリが指定されていません"
    exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
    echo "エラー: 指定されたパス '$TARGET_DIR' はディレクトリではありません"
    exit 1
fi

# Gitリポジトリのチェック
if ! git -C "$TARGET_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "エラー: 指定されたディレクトリ '$TARGET_DIR' はGitリポジトリではありません"
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
while IFS= read -r file; do
    if [ -f "$file" ]; then
        file "$file" >> "$FILE_TYPES"
    fi
done <<< "$GIT_FILES"

# 全ファイルの行数を一括カウント
echo "ファイルの行数をカウント中..."
while IFS= read -r file; do
    if [ -f "$file" ]; then
        wc -l "$file" >> "$LINE_COUNTS"
    fi
done <<< "$GIT_FILES"

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

# ファイルの行数を取得する関数
get_loc() {
    local file="$1"
    local count
    if ! count=$(wc -l < "$file" 2>/dev/null); then
        echo "0"
        return
    fi
    echo "$count"
}

# 変更回数を取得する関数
get_changes() {
    local file="$1"
    local count
    count=$(grep -F "$file" "$CHANGES_FILE" 2>/dev/null | cut -f2 || echo "0")
    echo "${count:-0}"
}

# 作者数を取得する関数
get_authors() {
    local file="$1"
    local authors
    authors=$(grep -F "$file" "$AUTHORS_FILE" 2>/dev/null | cut -f2 | tr '|' '\n' | sort -u | wc -l || echo "0")
    echo "${authors:-0}"
}

for dir in $(echo "$GIT_FILES" | xargs -n1 dirname | sort -u); do
    ((dir_count++))
    echo "ディレクトリを処理中: $dir ($dir_count/$TOTAL_DIRS)"

    if [ "$first_dir" = true ]; then
        first_dir=false
    else
        echo "    }," >> "$METRICS_FILE"
    fi

    echo "    {" >> "$METRICS_FILE"
    echo "      \"name\": \"$dir\"," >> "$METRICS_FILE"
    echo "      \"children\": [" >> "$METRICS_FILE"

    first_file=true
    has_files=false

    for file in $(git ls-files --full-name "$dir"); do
        if [ ! -f "$file" ]; then
            echo "警告: ファイルが見つかりません: $file"
            continue
        fi

        if grep -q "binary" <(file "$file" 2>/dev/null); then
            echo "警告: バイナリファイルをスキップします: $file"
            continue
        fi

        ((file_count++))
        echo "ファイルを処理中: $file ($file_count/$TOTAL_FILES)"

        if [ "$first_file" = true ]; then
            first_file=false
        else
            echo "        }," >> "$METRICS_FILE"
        fi

        normalized_file=$(normalize_path "$file")
        if [[ ! -f "$normalized_file" ]]; then
            echo "警告: 正規化されたパスが見つかりません: $normalized_file"
            continue
        fi

        if [[ "$normalized_file" == */.* ]] || [[ "$normalized_file" == */node_modules/* ]]; then
            echo "警告: 無視するファイル: $normalized_file"
            continue
        fi

        has_files=true
        loc=$(get_loc "$normalized_file")
        changes=$(get_changes "$file")
        authors=$(get_authors "$file")

        echo "        {" >> "$METRICS_FILE"
        echo "          \"name\": \"$(basename "$file")\"," >> "$METRICS_FILE"
        echo "          \"loc\": $loc," >> "$METRICS_FILE"
        echo "          \"changes\": $changes," >> "$METRICS_FILE"
        echo "          \"authors\": $authors" >> "$METRICS_FILE"
    done

    if [ "$has_files" = true ]; then
        echo "        }" >> "$METRICS_FILE"
    fi
    echo "      ]" >> "$METRICS_FILE"
done

if [ "$dir_count" -gt 0 ]; then
    echo "    }" >> "$METRICS_FILE"
fi
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
