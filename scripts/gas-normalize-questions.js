/**
 * Google Apps Script: 複数ファイル・複数シートの問題を正規化し、別 CSV に保存する
 *
 * 使い方:
 * 1. 問題ファイルをまとめた Drive フォルダ用のスタンドアロン GAS にこの内容を貼る
 * 2. CONFIG.FOLDER_ID を設定する
 * 3. normalizeAllInFolder を実行（初回は Drive / Spreadsheet の承認が必要）
 *
 * 入力レイアウト（実 CSV より）:
 *   先頭行: A=番号（半角/全角可）, B=問題文, C=①選択肢, E=正解①〜④, F=正解1〜4
 *   続き行: C=②③④選択肢
 *   ※問題番号・正解の全角数字（１など）にも対応
 *
 * 出力:
 *   フォルダ内に CSV を新規作成／同名があれば更新
 *   （元の問題シートには書き込まない）
 *
 * 列契約（sync-questions 向け）:
 *   id, category, question, choiceA, choiceB, choiceC, choiceD, answer(0-based), explanation
 *
 * 注意: リポジトリ保管用。Node では実行しない。
 */

const CONFIG = {
  /** Drive フォルダ ID（URL の /folders/ の後） */
  FOLDER_ID: 'REPLACE_WITH_FOLDER_ID',

  /** ファイル名に含まれる文字。空文字ならフォルダ内の全スプレッドシート */
  FILE_NAME_INCLUDES: '問題集',

  /**
   * スキップするタブ名（完全一致）
   * 以前の実行でできた normalized など
   */
  SKIP_SHEET_NAMES: ['normalized'],

  /** 出力 CSV ファイル名（同じフォルダに保存） */
  OUTPUT_CSV_NAME: 'questions-normalized.csv',

  /**
   * true: 各スプレッドシート内にも normalized タブを書く（非推奨）
   * false: 元ファイルには一切書かず、CSV のみ（推奨）
   */
  ALSO_WRITE_NORMALIZED_TAB: false,

  /** 最低選択肢数（3択を許す） */
  MIN_CHOICES: 3,

  COL: { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 },
};

const CSV_HEADER = [
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

/**
 * フォルダ内の対象スプレッドシート × 全シートを正規化し、1つの CSV にまとめる
 */
function normalizeAllInFolder() {
  if (!CONFIG.FOLDER_ID || CONFIG.FOLDER_ID === 'REPLACE_WITH_FOLDER_ID') {
    throw new Error('CONFIG.FOLDER_ID を実際のフォルダ ID に設定してください');
  }

  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const allRows = [];
  const logs = [];
  let globalSeq = 0;
  let fileCount = 0;
  let sheetCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    if (
      CONFIG.FILE_NAME_INCLUDES &&
      fileName.indexOf(CONFIG.FILE_NAME_INCLUDES) === -1
    ) {
      continue;
    }

    if (fileName === CONFIG.OUTPUT_CSV_NAME) continue;

    const ss = SpreadsheetApp.openById(file.getId());
    const sheets = ss.getSheets();
    let fileTotal = 0;
    const fileRows = [];

    for (let s = 0; s < sheets.length; s++) {
      const sheet = sheets[s];
      const sheetName = sheet.getName();
      if (shouldSkipSheet_(sheetName)) continue;

      const values = sheet.getDataRange().getValues();
      if (!values || values.length < 2) continue;

      let questions;
      try {
        questions = parseQuestions_(values);
      } catch (err) {
        logs.push(
          '[skip parse] ' + fileName + ' / ' + sheetName + ': ' + err.message
        );
        continue;
      }

      if (!questions.length) {
        logs.push('[skip empty] ' + fileName + ' / ' + sheetName);
        continue;
      }

      const category = fileName + ' / ' + sheetName;
      const idPrefix = slugPrefix_(fileName + '-' + sheetName);

      for (let i = 0; i < questions.length; i++) {
        globalSeq += 1;
        try {
          const row = questionToRow_(
            questions[i],
            globalSeq,
            category,
            idPrefix
          );
          allRows.push(row);
          fileRows.push(row);
          fileTotal += 1;
        } catch (err) {
          logs.push(
            '[skip q] ' +
              fileName +
              ' / ' +
              sheetName +
              ' #' +
              questions[i].sheetNo +
              ': ' +
              err.message
          );
        }
      }

      sheetCount += 1;
      logs.push(
        fileName + ' / ' + sheetName + ' → ' + questions.length + '問候補'
      );
    }

    if (CONFIG.ALSO_WRITE_NORMALIZED_TAB && fileRows.length) {
      writeNormalizedTab_(ss, fileRows);
    }

    if (fileTotal > 0) fileCount += 1;
  }

  const csvFile = writeCsvToFolder_(folder, CONFIG.OUTPUT_CSV_NAME, allRows);

  const msg =
    '完了: ファイル ' +
    fileCount +
    ' / シート ' +
    sheetCount +
    ' / 出力 ' +
    allRows.length +
    '問\nCSV: ' +
    csvFile.getName() +
    ' (id=' +
    csvFile.getId() +
    ')\n' +
    logs.join('\n');
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(
      '正規化完了: ' + allRows.length + '問 → ' + CONFIG.OUTPUT_CSV_NAME
    );
  } catch (e) {
    // スタンドアロンでは UI 不可のことがある
  }
}

/**
 * 単一スプレッドシートの全シートを正規化し、同じフォルダに CSV を書く（確認用）
 * SP_ID / FOLDER_ID をセットして実行
 */
function normalizeOneSpreadsheetToCsv() {
  const SP_ID = 'REPLACE_WITH_SPREADSHEET_ID';
  if (SP_ID === 'REPLACE_WITH_SPREADSHEET_ID') {
    throw new Error('スプレッドシート ID を設定してください');
  }
  if (!CONFIG.FOLDER_ID || CONFIG.FOLDER_ID === 'REPLACE_WITH_FOLDER_ID') {
    throw new Error('CONFIG.FOLDER_ID も設定してください（CSV の保存先）');
  }

  const ss = SpreadsheetApp.openById(SP_ID);
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const fileName = ss.getName();
  const sheets = ss.getSheets();
  const allRows = [];
  let seq = 0;

  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s];
    if (shouldSkipSheet_(sheet.getName())) continue;
    const questions = parseQuestions_(sheet.getDataRange().getValues());
    const category = fileName + ' / ' + sheet.getName();
    const idPrefix = slugPrefix_(fileName + '-' + sheet.getName());
    for (let i = 0; i < questions.length; i++) {
      seq += 1;
      allRows.push(questionToRow_(questions[i], seq, category, idPrefix));
    }
  }

  const csvFile = writeCsvToFolder_(folder, CONFIG.OUTPUT_CSV_NAME, allRows);
  Logger.log('出力 ' + allRows.length + '問 → ' + csvFile.getId());
}

function shouldSkipSheet_(sheetName) {
  const skip = CONFIG.SKIP_SHEET_NAMES || [];
  for (let i = 0; i < skip.length; i++) {
    if (sheetName === skip[i]) return true;
  }
  return false;
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

    if (!current) continue;
    if (looksLikeChoice_(c) || (c !== '' && current.choices.length > 0)) {
      current.choices.push(stripChoiceMark_(c));
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
      '選択肢不足 sheetNo=' + q.sheetNo + ' ' + JSON.stringify(choices)
    );
  }

  const answer = toAnswerIndex_(q.answerRaw);
  if (answer < 0 || answer > 3 || !choices[answer]) {
    throw new Error(
      'answer不一致 sheetNo=' +
        q.sheetNo +
        ' answer=' +
        answer +
        ' ' +
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

/** 元ファイルには書かず、フォルダ上の CSV を作成／更新する */
function writeCsvToFolder_(folder, fileName, dataRows) {
  const lines = [CSV_HEADER].concat(dataRows).map(function (cols) {
    return cols.map(csvEscape_).join(',');
  });
  // Excel でも文字化けしにくいよう BOM 付き UTF-8
  const content = '\uFEFF' + lines.join('\n');

  const existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) {
    const file = existing.next();
    file.setContent(content);
    // 同名が複数ある場合は先頭だけ更新
    return file;
  }

  return folder.createFile(fileName, content, MimeType.CSV);
}

/** オプション: 各ブックに normalized タブも残す場合のみ */
function writeNormalizedTab_(ss, dataRows) {
  let out = ss.getSheetByName('normalized');
  if (!out) out = ss.insertSheet('normalized');
  out.clearContents();
  const values = [CSV_HEADER].concat(dataRows);
  out.getRange(1, 1, values.length, CSV_HEADER.length).setValues(values);
}

function csvEscape_(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function cell_(row, index) {
  const v = row[index];
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** 全角数字・全角スペースなどを半角寄りに正規化 */
function toHalfWidthDigits_(s) {
  return String(s)
    .replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    })
    .replace(/\u3000/g, ' ')
    .trim();
}

function isQuestionNumber_(a) {
  // 半角・全角のどちらでも「数字だけ」なら問題先頭行とみなす
  return /^\d+$/.test(toHalfWidthDigits_(a));
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
  const raw = String(value).trim();
  if (raw === '') throw new Error('正解が空');

  const map = { '①': 0, '②': 1, '③': 2, '④': 3 };
  if (map[raw] !== undefined) return map[raw];

  const m = raw.match(/[①②③④]/);
  if (m) return map[m[0]];

  // 全角数字（１〜４）や半角を統一してから数値化
  const s = toHalfWidthDigits_(raw);
  const n = Number(s);
  if (n >= 1 && n <= 4) return n - 1;
  if (n >= 0 && n <= 3 && String(n) === s) return n;

  throw new Error('未対応の正解形式: ' + raw);
}

function pad3_(n) {
  const s = String(n);
  if (s.length >= 3) return s;
  return ('000' + s).slice(-3);
}

function slugPrefix_(name) {
  const cleaned = String(name)
    .replace(/\s+/g, '')
    .replace(/[^\w\u3040-\u30ff\u3400-\u9fffー\-]/g, '');
  return (cleaned.slice(0, 16) || 'q') + '-';
}
