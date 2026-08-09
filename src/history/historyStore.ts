import type { AnswerHistoryMap, AnswerRecord, HistorySummary } from './types'

/** 学習履歴の保存先を差し替えるための契約。 */
export interface HistoryStore {
  recordAnswer(record: Omit<AnswerRecord, 'answeredAt'> & { answeredAt?: string }): void
  getRecord(questionId: string): AnswerRecord | null
  getAll(): AnswerHistoryMap
  getSummary(): HistorySummary
  clear(): void
}
