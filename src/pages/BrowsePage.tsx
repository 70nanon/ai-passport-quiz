import { useMemo, useState } from 'react'
import { historyStore } from '../history'
import type { ChapterOption } from '../lib/chapter'
import { filterByChapter } from '../lib/chapter'
import {
  statusForQuestion,
  statusLabel,
  type AnswerStatus,
} from '../lib/review'
import type { Question } from '../types/question'

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

type BrowsePageProps = {
  questions: Question[]
  chapters: ChapterOption[]
  historyVersion: number
  onBack: () => void
}

type BrowseView =
  | { kind: 'chapters' }
  | { kind: 'list'; chapter: string | null }

function statusClass(status: AnswerStatus): string {
  if (status === 'correct') return 'is-correct'
  if (status === 'incorrect') return 'is-incorrect'
  return 'is-unanswered'
}

export function BrowsePage({
  questions,
  chapters,
  historyVersion,
  onBack,
}: BrowsePageProps) {
  const [view, setView] = useState<BrowseView>({ kind: 'chapters' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const historyMap = useMemo(() => {
    void historyVersion
    return historyStore.getAll()
  }, [historyVersion])

  const listQuestions = useMemo(() => {
    if (view.kind !== 'list') return []
    return filterByChapter(questions, view.chapter)
  }, [view, questions])

  const listTitle =
    view.kind === 'list'
      ? view.chapter === null
        ? '全問題'
        : view.chapter
      : '問題一覧'

  function openList(chapter: string | null) {
    setExpandedId(null)
    setView({ kind: 'list', chapter })
  }

  function handleBack() {
    if (view.kind === 'list') {
      setExpandedId(null)
      setView({ kind: 'chapters' })
      return
    }
    onBack()
  }

  function toggleExpand(id: string) {
    setExpandedId((current) => (current === id ? null : id))
  }

  if (view.kind === 'chapters') {
    return (
      <section className="browse-page">
        <header className="browse-header">
          <button type="button" className="browse-back" onClick={handleBack}>
            ← 戻る
          </button>
          <h1 className="browse-title">問題一覧</h1>
          <p className="browse-lead">
            章を選ぶと問題文と、この端末の正誤履歴を確認できます（閲覧のみ）。
          </p>
        </header>

        <ul className="start-options">
          <li>
            <button
              type="button"
              className="start-option"
              onClick={() => openList(null)}
            >
              <span className="start-option-label">すべて</span>
              <span className="start-option-count">{questions.length} 問</span>
            </button>
          </li>
          {chapters.map((item) => (
            <li key={item.chapter}>
              <button
                type="button"
                className="start-option"
                onClick={() => openList(item.chapter)}
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

  return (
    <section className="browse-page">
      <header className="browse-header">
        <button type="button" className="browse-back" onClick={handleBack}>
          ← 章を選ぶ
        </button>
        <h1 className="browse-title">{listTitle}</h1>
        <p className="browse-lead">{listQuestions.length} 問（タップで詳細）</p>
      </header>

      <ul className="browse-list">
        {listQuestions.map((question, index) => {
          const status = statusForQuestion(question.id, historyMap)
          const expanded = expandedId === question.id
          return (
            <li key={question.id} className="browse-item">
              <button
                type="button"
                className={`browse-item-toggle${expanded ? ' is-open' : ''}`}
                onClick={() => toggleExpand(question.id)}
                aria-expanded={expanded}
              >
                <span className="browse-item-index">{index + 1}</span>
                <span className="browse-item-body">
                  <span className="browse-item-question">{question.question}</span>
                  <span
                    className={`browse-status ${statusClass(status)}`}
                  >
                    {statusLabel(status)}
                  </span>
                </span>
              </button>
              {expanded ? (
                <div className="browse-item-detail">
                  {question.category ? (
                    <p className="browse-item-category">{question.category}</p>
                  ) : null}
                  <ol className="browse-choices">
                    {question.choices.map((choice, choiceIndex) => {
                      const isAnswer = choiceIndex === question.answer
                      return (
                        <li
                          key={`${question.id}-${choiceIndex}`}
                          className={isAnswer ? 'is-answer' : undefined}
                        >
                          <span className="browse-choice-label">
                            {CHOICE_LABELS[choiceIndex] ?? choiceIndex + 1}
                          </span>
                          <span className="browse-choice-text">{choice}</span>
                          {isAnswer ? (
                            <span className="browse-choice-mark">正解</span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ol>
                  {question.explanation ? (
                    <div className="browse-explanation">
                      <h2>解説</h2>
                      <p>{question.explanation}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
