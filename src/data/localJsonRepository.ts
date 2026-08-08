import type { Question } from '../types/question'
import type { QuestionRepository } from './repository'

const QUESTIONS_URL = `${import.meta.env.BASE_URL}data/questions.json`

function isQuestion(value: unknown): value is Question {
  if (typeof value !== 'object' || value === null) return false
  const q = value as Record<string, unknown>
  return (
    typeof q.id === 'string' &&
    typeof q.category === 'string' &&
    typeof q.question === 'string' &&
    Array.isArray(q.choices) &&
    q.choices.every((c) => typeof c === 'string') &&
    typeof q.answer === 'number' &&
    typeof q.explanation === 'string'
  )
}

/** リポジトリ内の JSON（public/data/questions.json）から問題を取得する。 */
export class LocalJsonRepository implements QuestionRepository {
  async getQuestions(): Promise<Question[]> {
    const response = await fetch(QUESTIONS_URL)
    if (!response.ok) {
      throw new Error(`問題データの取得に失敗しました (${response.status})`)
    }

    const data: unknown = await response.json()
    if (!Array.isArray(data) || !data.every(isQuestion)) {
      throw new Error('問題データの形式が不正です')
    }

    return data
  }
}
