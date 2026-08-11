import { useMemo } from 'react'
import {
  formatProgress,
  historyStore,
  summarizeQuestions,
} from '../history'
import type { ChapterOption } from '../lib/chapter'
import { filterByChapter } from '../lib/chapter'
import { filterWrongQuestions } from '../lib/review'
import type { Question } from '../types/question'

export type StartSelection = {
  /** null は全問題 */
  chapter: string | null
  mode: 'all' | 'wrong'
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

  const wrongQuestions = useMemo(
    () => filterWrongQuestions(questions, historyMap),
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

  const wrongCount = wrongQuestions.length
  const wrongDisabled = wrongCount === 0

  return (
    <section className="start-page">
      <h1 className="start-title">出題範囲を選ぶ</h1>
      <p className="start-lead">
        全問題、章ごと、またはこの端末で間違えた問題だけを練習できます。進捗はこの端末に保存されます。
      </p>

      <ul className="start-options">
        <li>
          <button
            type="button"
            className="start-option"
            onClick={() => onStart({ chapter: null, mode: 'all' })}
          >
            <span className="start-option-main">
              <span className="start-option-label">全問題</span>
              <span className="start-option-progress">{allProgress}</span>
            </span>
            <span className="start-option-count">{questions.length} 問</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={`start-option${wrongDisabled ? ' is-disabled' : ''}`}
            disabled={wrongDisabled}
            onClick={() => onStart({ chapter: null, mode: 'wrong' })}
          >
            <span className="start-option-main">
              <span className="start-option-label">間違えた問題だけ</span>
              <span className="start-option-progress">
                {wrongDisabled
                  ? 'まだ誤答がありません'
                  : `最新が不正解の ${wrongCount} 問`}
              </span>
            </span>
            <span className="start-option-count">{wrongCount} 問</span>
          </button>
        </li>
        {chapters.map((item) => (
          <li key={item.chapter}>
            <button
              type="button"
              className="start-option"
              onClick={() => onStart({ chapter: item.chapter, mode: 'all' })}
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
