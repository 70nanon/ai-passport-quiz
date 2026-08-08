/**
 * 将来: Google スプレッドシート（または Drive 上の CSV）から
 * public/data/questions.json を生成するための同期スクリプト置き場。
 *
 * 想定フロー:
 * 1. シートを正本として問題を編集
 * 2. このスクリプトで JSON を生成
 * 3. コミット / GitHub Pages へデプロイ
 *
 * シート列（1行 = 1問）の想定:
 *   id | category | question | choiceA | choiceB | choiceC | choiceD | answer | explanation
 * answer は 0始まりのインデックス、または A/B/C/D。
 *
 * 使い方（実装後）:
 *   npm run sync:questions
 *
 * 環境変数（実装時の案）:
 *   SHEETS_CSV_URL  … ウェブ公開した CSV の URL など
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputPath = path.resolve(__dirname, '../public/data/questions.json')

async function main() {
  const csvUrl = process.env.SHEETS_CSV_URL

  if (!csvUrl) {
    console.log(`sync-questions: まだ未実装のスタブです。
シート同期を有効にするには SHEETS_CSV_URL を設定し、このスクリプトを実装してください。
出力先: ${outputPath}`)
    return
  }

  // TODO: CSV を取得して Question[] に変換し、outputPath へ書き出す
  throw new Error('Sheets 同期はまだ実装されていません。SHEETS_CSV_URL のみ設定済みです。')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
