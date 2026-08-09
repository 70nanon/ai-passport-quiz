import type { ChapterOption } from '../lib/chapter'

export type StartSelection = {
  /** null は全問題 */
  chapter: string | null
}

type StartPageProps = {
  totalCount: number
  chapters: ChapterOption[]
  onStart: (selection: StartSelection) => void
}

export function StartPage({ totalCount, chapters, onStart }: StartPageProps) {
  return (
    <section className="start-page">
      <h1 className="start-title">出題範囲を選ぶ</h1>
      <p className="start-lead">全問題、または章ごとに練習できます。</p>

      <ul className="start-options">
        <li>
          <button
            type="button"
            className="start-option"
            onClick={() => onStart({ chapter: null })}
          >
            <span className="start-option-label">全問題</span>
            <span className="start-option-count">{totalCount} 問</span>
          </button>
        </li>
        {chapters.map((item) => (
          <li key={item.chapter}>
            <button
              type="button"
              className="start-option"
              onClick={() => onStart({ chapter: item.chapter })}
            >
              <span className="start-option-label">{item.chapter}</span>
              <span className="start-option-count">{item.count} 問</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
