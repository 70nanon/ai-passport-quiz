import type { Question } from '../types/question'

/** データ源を差し替えるための契約。UI はこのインターフェースだけに依存する。 */
export interface QuestionRepository {
  getQuestions(): Promise<Question[]>
}
