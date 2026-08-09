import { useMemo } from 'react'
import {
  formatProgress,
  historyStore,
  summarizeQuestions,
} from '../history'
import type { ChapterOption } from '../lib/chapter'
import { filterByChapter } from '../lib/chapter'
import type { Question } from '../types/question'

export type StartSelection = {
  /** null は全問題 */
  chapter: string | null
}

type StartPageProps = {
  questions: Question[]
  chapters: ChapterOption[]
  historyVersion: number
  onStart: (selection: StartSelection) => void
  onClearHistory: () => void
}

export function StartPage({
  questions,
  chapters,
  historyVersion,
  onStart,
  onClearHistory,
}: StartPageProps) {
  const historyMap = useMemo(() => {
    void historyVersion
    return historyStore.getAll()
  }, [historyVersion])

  const allProgress = useMemo(
    () => formatProgress(summarizeQuestions(questions, historyMap), questions.length),
    [questions, historyMap],
  )

  const chapterProgress = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of chapters) {
      const scoped = filterByChapter(questions, item.chapter)
      map.set(
        item.chapter,
        formatProgress(summarizeQuestions(scoped, historyMap), item.count),
      )
    }
    return map
  }, [chapters, questions, historyMap])

  function handleClear() {
    if (historyStore.getSummary().answeredCount === 0) {
      window.alert('まだこの端末に履歴はありません。')
      return
    }
    const ok = window.confirm(
      'この端末に保存した学習履歴をすべて削除します。よろしいですか？',
    )
    if (!ok) return
    onClearHistory()
  }

  return (
    <section className="start-page">
      <h1 className="start-title">出題範囲を選ぶ</h1>
      <p className="start-lead">
        全問題、または章ごとに練習できます。進捗はこの端末に保存されます。
      </p>

      <ul className="start-options">
        <li>
          <button
            type="button"
            className="start-option"
            onClick={() => onStart({ chapter: null })}
          >
            <span className="start-option-main">
              <span className="start-option-label">全問題</span>
              <span className="start-option-progress">{allProgress}</span>
            </span>
            <span className="start-option-count">{questions.length} 問</span>
          </button>
        </li>
        {chapters.map((item) => (
          <li key={item.chapter}>
            <button
              type="button"
              className="start-option"
              onClick={() => onStart({ chapter: item.chapter })}
            >
              <span className="start-option-main">
                <span className="start-option-label">{item.chapter}</span>
                <span className="start-option-progress">
                  {chapterProgress.get(item.chapter)}
                </span>
              </span>
              <span className="start-option-count">{item.count} 問</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="start-clear-button"
        onClick={handleClear}
      >
        この端末の履歴を消す
      </button>
    </section>
  )
}
