import { QuizPage } from './pages/QuizPage'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <p className="app-brand">生成AIパスポート</p>
        <p className="app-subtitle">問題練習</p>
      </header>
      <main className="app-main">
        <QuizPage />
      </main>
    </div>
  )
}

export default App
