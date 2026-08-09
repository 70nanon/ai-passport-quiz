import type { Question } from '../types/question'
import type { AnswerHistoryMap, HistorySummary } from './types'

export function emptySummary(): HistorySummary {
  return { answeredCount: 0, correctCount: 0 }
}

export function summarizeMap(map: AnswerHistoryMap): HistorySummary {
  const records = Object.values(map)
  return {
    answeredCount: records.length,
    correctCount: records.filter((r) => r.correct).length,
  }
}

/** 指定した問題集合のうち、履歴がある件数／うち最新が正解の件数 */
export function summarizeQuestions(
  questions: Question[],
  map: AnswerHistoryMap,
): HistorySummary {
  let answeredCount = 0
  let correctCount = 0
  for (const question of questions) {
    const record = map[question.id]
    if (!record) continue
    answeredCount += 1
    if (record.correct) correctCount += 1
  }
  return { answeredCount, correctCount }
}

export function formatProgress(
  summary: HistorySummary,
  totalCount: number,
): string {
  return `${summary.answeredCount}/${totalCount} 回答（正解 ${summary.correctCount}）`
}
