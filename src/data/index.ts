import { LocalJsonRepository } from './localJsonRepository'
import type { QuestionRepository } from './repository'

/**
 * 使用する Repository をここで切り替える。
 * 将来: SheetsRepository / ApiRepository などに差し替え可能。
 */
export const questionRepository: QuestionRepository = new LocalJsonRepository()

export type { QuestionRepository } from './repository'
