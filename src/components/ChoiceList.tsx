import type { Question } from '../types/question'

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

type ChoiceListProps = {
  choices: Question['choices']
  selectedIndex: number | null
  disabled: boolean
  correctIndex: number | null
  onSelect: (index: number) => void
}

export function ChoiceList({
  choices,
  selectedIndex,
  disabled,
  correctIndex,
  onSelect,
}: ChoiceListProps) {
  return (
    <ul className="choice-list">
      {choices.map((choice, index) => {
        const label = LABELS[index] ?? String(index + 1)
        let stateClass = ''
        if (correctIndex !== null) {
          if (index === correctIndex) stateClass = 'is-correct'
          else if (index === selectedIndex) stateClass = 'is-wrong'
        } else if (index === selectedIndex) {
          stateClass = 'is-selected'
        }

        return (
          <li key={`${label}-${choice}`}>
            <button
              type="button"
              className={`choice-button ${stateClass}`}
              disabled={disabled}
              onClick={() => onSelect(index)}
            >
              <span className="choice-label">{label}</span>
              <span className="choice-text">{choice}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
