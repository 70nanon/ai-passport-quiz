/**
 * Google Apps Script: 問題シート（複数行1問）→ normalized（1行1問）
 *
 * 使い方:
 * 1. 問題ファイルをまとめた Drive フォルダでスタンドアロンの GAS を開く
 *    （または script.google.com でこの内容を貼る）
 * 2. CONFIG.FOLDER_ID をそのフォルダ ID に変更する
 * 3. エディタで normalizeAllInFolder を選んで実行（初回は承認が必要）
 *
 * 入力レイアウト（実 CSV より）:
 *   先頭行: A=番号, B=問題文, C=①選択肢, E=正解①〜④, F=正解1〜4
 *   続き行: C=②③④選択肢
 *
 * 出力タブ normalized の列:
 *   id, category, question, choiceA, choiceB, choiceC, choiceD, answer(0-based), explanation
 *
 * 注意: このファイルはリポジトリ保管用。Node では実行しない（Apps Script にコピーして使う）。
 */

const CONFIG = {
  /** Drive フォルダ ID（URL の /folders/ の後） */
  FOLDER_ID: 'REPLACE_WITH_FOLDER_ID',

  /** ファイル名に含まれる文字。空文字ならフォルダ内の全スプレッドシート */
  FILE_NAME_INCLUDES: '問題集',

  /** 各ファイル内の入力タブ。空文字なら先頭シート */
  SOURCE_SHEET_NAME: '',

  OUTPUT_SHEET: 'normalized',

  /** true: category / id 接頭辞にファイル名を使う */
  CATEGORY_FROM_FILE_NAME: true,
  ID_PREFIX_FROM_FILE: true,
  CATEGORY_DEFAULT: '未分類',
  ID_PREFIX_DEFAULT: 'q-',

  /** 最低選択肢数（3択を許すなら 3） */
  MIN_CHOICES: 3,

  COL: { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 },
};

/**
 * フォルダ内の対象スプレッドシートを順に正規化する（スタンドアロン用の入口）
 */
function normalizeAllInFolder() {
  if (!CONFIG.FOLDER_ID || CONFIG.FOLDER_ID === 'REPLACE_WITH_FOLDER_ID') {
    throw new Error('CONFIG.FOLDER_ID を実際のフォルダ ID に設定してください');
  }

  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const logs = [];
  let done = 0;

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (
      CONFIG.FILE_NAME_INCLUDES &&
      name.indexOf(CONFIG.FILE_NAME_INCLUDES) === -1
    ) {
      continue;
    }

    const ss = SpreadsheetApp.openById(file.getId());
    const count = normalizeOneSpreadsheet_(ss, name);
    done += 1;
    logs.push(name + ' → ' + count + '問');
  }

  const msg = '完了: ' + done + ' ファイル\n' + logs.join('\n');
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    // スタンドアロン実行では UI が使えないことがある
  }
}

/**
 * 単一スプレッドシートを ID 指定で正規化（動作確認用）
 * エディタで SP_ID を書き換えてから実行する
 */
function normalizeOneById() {
  const SP_ID = 'REPLACE_WITH_SPREADSHEET_ID';
  if (SP_ID === 'REPLACE_WITH_SPREADSHEET_ID') {
    throw new Error('normalizeOneById: スプレッドシート ID を設定してください');
  }
  const ss = SpreadsheetApp.openById(SP_ID);
  const count = normalizeOneSpreadsheet_(ss, ss.getName());
  Logger.log('完了: ' + count + '問');
}

/**
 * 先頭20行をログ出力（列確認用）
 * normalizeOneById と同様に SP_ID をセットしてから実行
 */
function dumpSample() {
  const SP_ID = 'REPLACE_WITH_SPREADSHEET_ID';
  if (SP_ID === 'REPLACE_WITH_SPREADSHEET_ID') {
    throw new Error('dumpSample: スプレッドシート ID を設定してください');
  }
  const ss = SpreadsheetApp.openById(SP_ID);
  const src = getSourceSheet_(ss);
  const values = src.getDataRange().getValues();
  const n = Math.min(20, values.length);
  for (let i = 0; i < n; i++) {
    Logger.log(
      'row %s | A=%s | B=%s | C=%s | D=%s | E=%s | F=%s',
      i + 1,
      values[i][0],
      values[i][1],
      values[i][2],
      values[i][3],
      values[i][4],
      values[i][5]
    );
  }
}

function normalizeOneSpreadsheet_(ss, fileName) {
  const src = getSourceSheet_(ss);
  const values = src.getDataRange().getValues();
  const questions = parseQuestions_(values);

  const category = CONFIG.CATEGORY_FROM_FILE_NAME
    ? fileName
    : CONFIG.CATEGORY_DEFAULT;
  const idPrefix = CONFIG.ID_PREFIX_FROM_FILE
    ? slugPrefix_(fileName)
    : CONFIG.ID_PREFIX_DEFAULT;

  const outRows = questions.map(function (q, idx) {
    return questionToRow_(q, idx + 1, category, idPrefix);
  });

  writeNormalized_(ss, outRows);
  return outRows.length;
}

function getSourceSheet_(ss) {
  if (CONFIG.SOURCE_SHEET_NAME) {
    const named = ss.getSheetByName(CONFIG.SOURCE_SHEET_NAME);
    if (!named) {
      throw new Error(
        '入力タブが見つかりません: ' +
          CONFIG.SOURCE_SHEET_NAME +
          ' / file=' +
          ss.getName()
      );
    }
    return named;
  }
  return ss.getSheets()[0];
}

/**
 * @returns {{ sheetNo: string, question: string, choices: string[], answerRaw: * }[]}
 */
function parseQuestions_(values) {
  const results = [];
  let current = null;
  const startRow = 1; // 0行目はヘッダー

  for (let i = startRow; i < values.length; i++) {
    const row = values[i];
    const a = cell_(row, CONFIG.COL.A);
    const b = cell_(row, CONFIG.COL.B);
    const c = cell_(row, CONFIG.COL.C);
    const e = cell_(row, CONFIG.COL.E);
    const f = cell_(row, CONFIG.COL.F);

    if (a === '' && b === '' && c === '') {
      if (current) {
        results.push(current);
        current = null;
      }
      continue;
    }

    // 先頭行: A が数字
    if (isQuestionNumber_(a)) {
      if (current) results.push(current);
      current = {
        sheetNo: a,
        question: b,
        choices: [],
        answerRaw: f !== '' ? f : e,
      };
      if (c !== '') current.choices.push(stripChoiceMark_(c));
      continue;
    }

    // 続きの選択肢は C 列（実 CSV 確認済み）
    if (!current) continue;
    if (looksLikeChoice_(c) || c !== '') {
      // ②③④が付いていない行もあるので、空でなければ候補にする
      if (looksLikeChoice_(c) || current.choices.length > 0) {
        current.choices.push(stripChoiceMark_(c));
      }
    }
  }

  if (current) results.push(current);
  return results;
}

function questionToRow_(q, seq, category, idPrefix) {
  const id = idPrefix + pad3_(seq);
  const choices = q.choices.slice(0, 4);
  while (choices.length < 4) choices.push('');

  const filled = choices.filter(Boolean).length;
  if (filled < CONFIG.MIN_CHOICES) {
    throw new Error(
      id +
        ' (sheetNo=' +
        q.sheetNo +
        ') の選択肢が足りません: ' +
        JSON.stringify(choices)
    );
  }

  let answer;
  try {
    answer = toAnswerIndex_(q.answerRaw);
  } catch (err) {
    throw new Error(
      id +
        ' (sheetNo=' +
        q.sheetNo +
        ') の正解が解釈できません: [' +
        q.answerRaw +
        '] ' +
        err.message
    );
  }

  if (answer < 0 || answer > 3 || !choices[answer]) {
    throw new Error(
      id +
        ' の answer=' +
        answer +
        ' が choices と合いません: ' +
        JSON.stringify(choices)
    );
  }

  return [
    id,
    category,
    q.question,
    choices[0],
    choices[1],
    choices[2],
    choices[3],
    answer,
    '',
  ];
}

function writeNormalized_(ss, dataRows) {
  let out = ss.getSheetByName(CONFIG.OUTPUT_SHEET);
  if (!out) out = ss.insertSheet(CONFIG.OUTPUT_SHEET);

  out.clearContents();
  const header = [
    'id',
    'category',
    'question',
    'choiceA',
    'choiceB',
    'choiceC',
    'choiceD',
    'answer',
    'explanation',
  ];
  const values = [header].concat(dataRows);
  out.getRange(1, 1, values.length, header.length).setValues(values);
}

function cell_(row, index) {
  const v = row[index];
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function isQuestionNumber_(a) {
  return /^\d+$/.test(String(a).trim());
}

function looksLikeChoice_(s) {
  return /^[①②③④]/.test(String(s).trim());
}

function stripChoiceMark_(s) {
  return String(s)
    .trim()
    .replace(/^[①②③④]\s*/, '');
}

function toAnswerIndex_(value) {
  const s = String(value).trim();
  if (s === '') throw new Error('空です');

  const map = { '①': 0, '②': 1, '③': 2, '④': 3 };
  if (map[s] !== undefined) return map[s];

  const m = s.match(/[①②③④]/);
  if (m) return map[m[0]];

  const n = Number(s);
  if (n >= 1 && n <= 4) return n - 1;
  if (n >= 0 && n <= 3 && String(n) === s) return n;

  throw new Error('未対応の形式');
}

function pad3_(n) {
  const s = String(n);
  if (s.length >= 3) return s;
  return ('000' + s).slice(-3);
}

function slugPrefix_(name) {
  const cleaned = String(name)
    .replace(/\s+/g, '')
    .replace(/[^\w\u3040-\u30ff\u3400-\u9fffー]/g, '');
  return (cleaned.slice(0, 12) || 'q') + '-';
}
