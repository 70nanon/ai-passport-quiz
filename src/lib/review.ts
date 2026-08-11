import type { AnswerHistoryMap } from '../history'
import type { Question } from '../types/question'

/** 最新の履歴が不正解の問題だけ残す（未回答は含めない） */
export function filterWrongQuestions(
  questions: Question[],
  historyMap: AnswerHistoryMap,
): Question[] {
  return questions.filter((q) => historyMap[q.id]?.correct === false)
}
