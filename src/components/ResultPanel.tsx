type ResultPanelProps = {
  isCorrect: boolean
  explanation: string
}

export function ResultPanel({ isCorrect, explanation }: ResultPanelProps) {
  return (
    <section className="result-panel" aria-live="polite">
      <p className={`result-badge ${isCorrect ? 'correct' : 'wrong'}`}>
        {isCorrect ? '正解' : '不正解'}
      </p>
      <div className="explanation">
        <h2>解説</h2>
        <p>{explanation}</p>
      </div>
    </section>
  )
}
