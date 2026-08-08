/**
 * 正規化済み CSV（公開 URL またはローカルパス）から
 * public/data/questions.json を生成する。
 *
 * 想定列:
 *   id | category | question | choiceA | choiceB | choiceC | choiceD | answer | explanation
 * answer は 0始まり、A-D、①-④、1-4 のいずれでも可。
 *
 * 使い方:
 *   SHEETS_CSV_URL="https://.../export?format=csv&gid=..." npm run sync:questions
 *   SHEETS_CSV_URL="./public/data/sample-questions-normalized.csv" npm run sync:questions
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputPath = path.resolve(__dirname, '../public/data/questions.json')

async function main() {
  const source = process.env.SHEETS_CSV_URL?.trim()
  if (!source) {
    console.error(`使い方:
  SHEETS_CSV_URL="<公開CSVのURLまたはローカルパス>" npm run sync:questions

出力: ${outputPath}`)
    process.exitCode = 1
    return
  }

  const csvText = await loadCsvText(source)
  const rows = parseCsv(stripBom(csvText))
  if (rows.length < 2) {
    throw new Error('CSV にヘッダー以外の行がありません')
  }

  const header = rows[0].map((h) => h.trim())
  const questions = rows
    .slice(1)
    .filter((cols) => cols.some((c) => String(c).trim() !== ''))
    .map((cols, index) => rowToQuestion(header, cols, index))

  const json = `${JSON.stringify(questions, null, 2)}\n`
  await writeFile(outputPath, json, 'utf8')
  console.log(`Wrote ${questions.length} questions → ${outputPath}`)
}

async function loadCsvText(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`CSV の取得に失敗しました (${response.status}) URL=${source}`)
    }
    return await response.text()
  }

  const filePath = path.resolve(process.cwd(), source)
  return await readFile(filePath, 'utf8')
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/** RFC4180 っぽい CSV パーサ（改行を含む引用フィールド対応） */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let i = 0
  let inQuotes = false

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }

    if (ch === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }

    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
      continue
    }

    if (ch === '\r') {
      i += 1
      continue
    }

    field += ch
    i += 1
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function rowToQuestion(header, cols, index) {
  const get = (name) => {
    const i = header.indexOf(name)
    if (i === -1) return ''
    return String(cols[i] ?? '').trim()
  }

  const choices = [
    get('choiceA'),
    get('choiceB'),
    get('choiceC'),
    get('choiceD'),
  ]

  const id = get('id') || `q-${String(index + 1).padStart(3, '0')}`
  const category = get('category')
  const question = get('question')
  const explanation = get('explanation')
  const answer = parseAnswer(get('answer'), choices)

  if (!question) {
    throw new Error(`行 ${index + 2}: question が空です (id=${id})`)
  }

  const filled = choices.filter(Boolean).length
  if (filled < 2) {
    throw new Error(`行 ${index + 2}: 選択肢が足りません (id=${id})`)
  }

  if (!choices[answer]) {
    throw new Error(
      `行 ${index + 2}: answer=${answer} が空の選択肢を指しています (id=${id})`,
    )
  }

  return {
    id,
    category,
    question,
    choices,
    answer,
    explanation,
  }
}

function parseAnswer(raw, choices) {
  const s = toHalfWidthDigits(String(raw).trim())
  if (s === '') {
    throw new Error('answer が空です')
  }

  const circled = { '①': 0, '②': 1, '③': 2, '④': 3 }
  if (circled[s] !== undefined) return circled[s]

  const circledMatch = s.match(/[①②③④]/)
  if (circledMatch) return circled[circledMatch[0]]

  const letter = s.toUpperCase()
  if (/^[A-D]$/.test(letter)) return letter.charCodeAt(0) - 65

  const n = Number(s)
  if (Number.isInteger(n) && n >= 0 && n <= 3) return n
  if (Number.isInteger(n) && n >= 1 && n <= 4) return n - 1

  const byText = choices.findIndex((c) => c === raw.trim())
  if (byText >= 0) return byText

  throw new Error(`answer を解釈できません: ${JSON.stringify(raw)}`)
}

function toHalfWidthDigits(s) {
  return s
    .replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/\u3000/g, ' ')
    .trim()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
