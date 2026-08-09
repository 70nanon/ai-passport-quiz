export type AnswerRecord = {
  questionId: string
  correct: boolean
  selectedIndex: number
  answeredAt: string
}

export type AnswerHistoryMap = Record<string, AnswerRecord>

export type HistorySummary = {
  answeredCount: number
  correctCount: number
}
