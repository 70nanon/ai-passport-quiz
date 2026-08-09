import type { HistoryStore } from './historyStore'
import { emptySummary, summarizeMap } from './summary'
import type { AnswerHistoryMap, AnswerRecord, HistorySummary } from './types'

const STORAGE_KEY = 'ai-passport-quiz:answer-history:v1'

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
      return summarizeMap(readMap())
    } catch {
      return emptySummary()
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}
