import type { HistoryStore } from './historyStore'
import { LocalStorageHistoryStore } from './localStorageHistoryStore'

/**
 * 使用する HistoryStore をここで切り替える。
 * 将来: クラウド実装などに差し替え可能。
 */
export const historyStore: HistoryStore = new LocalStorageHistoryStore()

export type { HistoryStore } from './historyStore'
export type { AnswerRecord, AnswerHistoryMap, HistorySummary } from './types'
