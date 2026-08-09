import { useEffect, useMemo, useState } from 'react'
import { questionRepository } from '../data'
import { historyStore } from '../history'
import type { HistorySummary } from '../history'
import { filterByChapter, listChapters } from '../lib/chapter'
import type { Question } from '../types/question'
import { QuestionCard } from '../components/QuestionCard'
import { ResultPanel } from '../components/ResultPanel'
import { StartPage, type StartSelection } from './StartPage'

type Phase = 'select' | 'quiz' | 'finished'

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function QuizPage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([])
  const [selection, setSelection] = useState<StartSelection | null>(null)
  const [phase, setPhase] = useState<Phase>('select')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [deviceSummary, setDeviceSummary] = useState<HistorySummary>(() =>
    historyStore.getSummary(),
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await questionRepository.getQuestions()
        if (cancelled) return
        setAllQuestions(data)
        setPhase('select')
        setSelection(null)
        setQuizQuestions([])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '読み込みに失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const chapters = useMemo(() => listChapters(allQuestions), [allQuestions])

  const current = quizQuestions[currentIndex]
  const isCorrect = useMemo(() => {
    if (!current || selectedIndex === null) return false
    return selectedIndex === current.answer
  }, [current, selectedIndex])

  function startQuiz(nextSelection: StartSelection) {
    const scoped = filterByChapter(allQuestions, nextSelection.chapter)
    if (scoped.length === 0) return

    setSelection(nextSelection)
    setQuizQuestions(shuffle(scoped))
    setCurrentIndex(0)
    setSelectedIndex(null)
    setAnswered(false)
    setCorrectCount(0)
    setPhase('quiz')
  }

  function handleSelect(index: number) {
    if (answered || !current) return
    setSelectedIndex(index)
    setAnswered(true)
    const correct = index === current.answer
    if (correct) {
      setCorrectCount((count) => count + 1)
    }
    historyStore.recordAnswer({
      questionId: current.id,
      correct,
      selectedIndex: index,
    })
  }

  function handleNext() {
    if (currentIndex >= quizQuestions.length - 1) {
      setDeviceSummary(historyStore.getSummary())
      setPhase('finished')
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelectedIndex(null)
    setAnswered(false)
  }

  function handleRestartSameScope() {
    if (!selection) {
      setPhase('select')
      return
    }
    startQuiz(selection)
  }

  function handleChangeScope() {
    setPhase('select')
    setSelection(null)
    setQuizQuestions([])
    setCurrentIndex(0)
    setSelectedIndex(null)
    setAnswered(false)
    setCorrectCount(0)
  }

  if (loading) {
    return <p className="status-message">問題を読み込み中…</p>
  }

  if (error) {
    return <p className="status-message error">{error}</p>
  }

  if (allQuestions.length === 0) {
    return <p className="status-message">問題がありません。</p>
  }

  if (phase === 'select') {
    return (
      <StartPage
        totalCount={allQuestions.length}
        chapters={chapters}
        onStart={startQuiz}
      />
    )
  }

  if (phase === 'finished') {
    const scopeLabel =
      selection?.chapter === null || selection?.chapter === undefined
        ? '全問題'
        : selection.chapter

    return (
      <section className="summary">
        <h1>終了</h1>
        <p className="summary-scope">{scopeLabel}</p>
        <p>
          {quizQuestions.length} 問中 {correctCount} 問正解
        </p>
        <p className="summary-device">
          この端末の累計: {deviceSummary.answeredCount} 問回答済み（最新が正解{' '}
          {deviceSummary.correctCount} 問）
        </p>
        <div className="summary-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleRestartSameScope}
          >
            もう一度解く
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleChangeScope}
          >
            出題範囲を変える
          </button>
        </div>
      </section>
    )
  }

  if (!current) {
    return <p className="status-message">問題を表示できません。</p>
  }

  return (
    <div className="quiz-page">
      <QuestionCard
        question={current}
        index={currentIndex}
        total={quizQuestions.length}
        selectedIndex={selectedIndex}
        answered={answered}
        onSelect={handleSelect}
      />
      {answered ? (
        <>
          <ResultPanel isCorrect={isCorrect} explanation={current.explanation} />
          <button type="button" className="primary-button" onClick={handleNext}>
            {currentIndex >= quizQuestions.length - 1 ? '結果を見る' : '次の問題'}
          </button>
        </>
      ) : null}
    </div>
  )
}
