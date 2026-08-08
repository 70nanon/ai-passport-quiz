import { useEffect, useMemo, useState } from 'react'
import { questionRepository } from '../data'
import type { Question } from '../types/question'
import { QuestionCard } from '../components/QuestionCard'
import { ResultPanel } from '../components/ResultPanel'

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await questionRepository.getQuestions()
        if (cancelled) return
        setQuestions(shuffle(data))
        setCurrentIndex(0)
        setSelectedIndex(null)
        setAnswered(false)
        setCorrectCount(0)
        setFinished(false)
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

  const current = questions[currentIndex]
  const isCorrect = useMemo(() => {
    if (!current || selectedIndex === null) return false
    return selectedIndex === current.answer
  }, [current, selectedIndex])

  function handleSelect(index: number) {
    if (answered || !current) return
    setSelectedIndex(index)
    setAnswered(true)
    if (index === current.answer) {
      setCorrectCount((count) => count + 1)
    }
  }

  function handleNext() {
    if (currentIndex >= questions.length - 1) {
      setFinished(true)
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelectedIndex(null)
    setAnswered(false)
  }

  function handleRestart() {
    setQuestions((prev) => shuffle(prev))
    setCurrentIndex(0)
    setSelectedIndex(null)
    setAnswered(false)
    setCorrectCount(0)
    setFinished(false)
  }

  if (loading) {
    return <p className="status-message">問題を読み込み中…</p>
  }

  if (error) {
    return <p className="status-message error">{error}</p>
  }

  if (questions.length === 0) {
    return <p className="status-message">問題がありません。</p>
  }

  if (finished) {
    return (
      <section className="summary">
        <h1>終了</h1>
        <p>
          {questions.length} 問中 {correctCount} 問正解
        </p>
        <button type="button" className="primary-button" onClick={handleRestart}>
          もう一度解く
        </button>
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
        total={questions.length}
        selectedIndex={selectedIndex}
        answered={answered}
        onSelect={handleSelect}
      />
      {answered ? (
        <>
          <ResultPanel isCorrect={isCorrect} explanation={current.explanation} />
          <button type="button" className="primary-button" onClick={handleNext}>
            {currentIndex >= questions.length - 1 ? '結果を見る' : '次の問題'}
          </button>
        </>
      ) : null}
    </div>
  )
}
