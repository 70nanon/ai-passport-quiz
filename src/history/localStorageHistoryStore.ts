import type { HistoryStore } from './historyStore'
import type { AnswerHistoryMap, AnswerRecord, HistorySummary } from './types'

const STORAGE_KEY = 'ai-passport-quiz:answer-history:v1'

function emptySummary(): HistorySummary {
  return { answeredCount: 0, correctCount: 0 }
}

function summarize(map: AnswerHistoryMap): HistorySummary {
  const records = Object.values(map)
  return {
    answeredCount: records.length,
    correctCount: records.filter((r) => r.correct).length,
  }
}

function readMap(): AnswerHistoryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as AnswerHistoryMap
  } catch {
    return {}
  }
}

function writeMap(map: AnswerHistoryMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 容量超過・プライベートモードなどでもクイズ自体は続行する
  }
}

export class LocalStorageHistoryStore implements HistoryStore {
  recordAnswer(
    input: Omit<AnswerRecord, 'answeredAt'> & { answeredAt?: string },
  ): void {
    const map = readMap()
    map[input.questionId] = {
      questionId: input.questionId,
      correct: input.correct,
      selectedIndex: input.selectedIndex,
      answeredAt: input.answeredAt ?? new Date().toISOString(),
    }
    writeMap(map)
  }

  getRecord(questionId: string): AnswerRecord | null {
    return readMap()[questionId] ?? null
  }

  getAll(): AnswerHistoryMap {
    return readMap()
  }

  getSummary(): HistorySummary {
    try {
      return summarize(readMap())
    } catch {
      return emptySummary()
    }
  }
}
