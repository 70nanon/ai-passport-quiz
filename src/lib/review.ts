import type { AnswerHistoryMap } from '../history'
import type { Question } from '../types/question'

export type AnswerStatus = 'unanswered' | 'correct' | 'incorrect'

/** 最新の履歴が不正解の問題だけ残す（未回答は含めない） */
export function filterWrongQuestions(
  questions: Question[],
  historyMap: AnswerHistoryMap,
): Question[] {
  return questions.filter((q) => historyMap[q.id]?.correct === false)
}

export function statusForQuestion(
  questionId: string,
  historyMap: AnswerHistoryMap,
): AnswerStatus {
  const record = historyMap[questionId]
  if (!record) return 'unanswered'
  return record.correct ? 'correct' : 'incorrect'
}

export function statusLabel(status: AnswerStatus): string {
  if (status === 'correct') return '正解'
  if (status === 'incorrect') return '不正解'
  return '未回答'
}
