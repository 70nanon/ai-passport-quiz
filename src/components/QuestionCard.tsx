import type { Question } from '../types/question'
import { ChoiceList } from './ChoiceList'

type QuestionCardProps = {
  question: Question
  index: number
  total: number
  selectedIndex: number | null
  answered: boolean
  onSelect: (index: number) => void
}

export function QuestionCard({
  question,
  index,
  total,
  selectedIndex,
  answered,
  onSelect,
}: QuestionCardProps) {
  return (
    <section className="question-card">
      <header className="question-meta">
        <span className="question-progress">
          問題 {index + 1} / {total}
        </span>
        {question.category ? (
          <span className="question-category">{question.category}</span>
        ) : null}
      </header>
      <h1 className="question-text">{question.question}</h1>
      <ChoiceList
        choices={question.choices}
        selectedIndex={selectedIndex}
        disabled={answered}
        correctIndex={answered ? question.answer : null}
        onSelect={onSelect}
      />
    </section>
  )
}
