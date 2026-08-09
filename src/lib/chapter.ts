import type { Question } from '../types/question'

/** category（例: "問題集1章 / 1⃣１－１"）から章名を取り出す */
export function getChapter(category: string): string {
  const trimmed = category.trim()
  if (!trimmed) return '未分類'
  const separator = trimmed.indexOf(' / ')
  if (separator === -1) return trimmed
  return trimmed.slice(0, separator).trim() || '未分類'
}

export type ChapterOption = {
  chapter: string
  count: number
}

/** 出現順を保ったまま章ごとの件数を集計する */
export function listChapters(questions: Question[]): ChapterOption[] {
  const counts = new Map<string, number>()

  for (const question of questions) {
    const chapter = getChapter(question.category)
    counts.set(chapter, (counts.get(chapter) ?? 0) + 1)
  }

  return [...counts.entries()].map(([chapter, count]) => ({ chapter, count }))
}

export function filterByChapter(
  questions: Question[],
  chapter: string | null,
): Question[] {
  if (chapter === null) return questions
  return questions.filter((q) => getChapter(q.category) === chapter)
}
