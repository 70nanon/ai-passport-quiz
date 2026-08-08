# 生成AIパスポート 問題練習

生成AIパスポートの試験対策向けに、4択問題を解いて正誤と解説を確認できる Web アプリです。

## 開発

```bash
npm install
npm run dev
```

## 問題データの更新

問題は [`public/data/questions.json`](public/data/questions.json) に置きます。UI は `QuestionRepository` 経由で読み込むため、データだけ差し替えれば反映されます。

想定スキーマ（1オブジェクト = 1問）:

| フィールド | 内容 |
|------------|------|
| `id` | 安定した識別子 |
| `category` | 分野 |
| `question` | 問題文 |
| `choices` | 選択肢配列 |
| `answer` | 正解のインデックス（0始まり） |
| `explanation` | 解説 |

正規化済み CSV から JSON を生成:

```bash
# 公開 CSV URL
SHEETS_CSV_URL="https://.../export?format=csv&gid=..." npm run sync:questions

# またはローカルの CSV
SHEETS_CSV_URL="./public/data/questions-normalized.csv" npm run sync:questions
```

CSV の列は `id, category, question, choiceA, choiceB, choiceC, choiceD, answer, explanation` を想定しています（GAS の出力と同じ）。

## ビルド

```bash
npm run build
npm run preview
```

GitHub Pages などの公開設定は、必要になったタイミングで行います。

## 今後のアップデート案

追加可能な機能のリスト（実施順は固定しません）は [docs/future-features.md](docs/future-features.md) を参照してください。
