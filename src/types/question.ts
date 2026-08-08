/** 1問分のデータ。将来のスプレッドシート1行と対応させる。 */
export type Question = {
  id: string
  category: string
  question: string
  /** 4択想定。長さは可変でも可 */
  choices: string[]
  /** 正解の choices インデックス（0始まり） */
  answer: number
  explanation: string
}
