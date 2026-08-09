/**
 * GAS①: 各問題ファイル内に normalized タブへ「新規だけ追記」
 *
 * 使い方（スタンドアロン推奨）:
 * 1. このファイル全体を Apps Script に貼る
 * 2. CONFIG.FOLDER_ID を設定
 * 3. normalizeAllInFolder() を実行
 *    （1ファイルだけ試すなら normalizeOneById()）
 *
 * 動作:
 * - 元の複数行問題タブは読み取りのみ（書き換えない）
 * - 同じブックの normalized タブへ、未知 id の行だけ append
 * - 既存 id はスキップ（Gemini が直した問題文・解説を消さない）
 *
 * 列: id, category, question, choiceA, choiceB, choiceC, choiceD, answer, explanation
 *
 * リポジトリ保管用。Node では実行しない。
 */

const CONFIG = {
  FOLDER_ID: 'REPLACE_WITH_FOLDER_ID',
  FILE_NAME_INCLUDES: '問題集',
  NORMALIZED_SHEET: 'normalized',
  /** normalized 以外でスキップするタブ名 */
  SKIP_SHEET_NAMES: ['normalized'],
  MIN_CHOICES: 3,
  COL: { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 },
};

const HEADER = [
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

/** フォルダ内の対象ファイルすべてに追記正規化 */
function normalizeAllInFolder() {
  assertFolderId_();
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const logs = [];
  let fileCount = 0;
  let addedTotal = 0;

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
    const result = normalizeSpreadsheetAppend_(ss, name);
    fileCount += 1;
    addedTotal += result.added;
    logs.push(
      name +
        ' → +' +
        result.added +
        ' / skip ' +
        result.skipped +
        ' / 既存 ' +
        result.existing,
    );
  }

  const msg =
    'GAS①完了: ' +
    fileCount +
    ' ファイル / 新規追記 ' +
    addedTotal +
    '\n' +
    logs.join('\n');
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {}
}

/** 単一ファイル（動作確認用）。SP_ID をセットして実行 */
function normalizeOneById() {
  const SP_ID = 'REPLACE_WITH_SPREADSHEET_ID';
  if (SP_ID === 'REPLACE_WITH_SPREADSHEET_ID') {
    throw new Error('スプレッドシート ID を設定してください');
  }
  const ss = SpreadsheetApp.openById(SP_ID);
  const result = normalizeSpreadsheetAppend_(ss, ss.getName());
  Logger.log(JSON.stringify(result));
}

function normalizeSpreadsheetAppend_(ss, fileName) {
  const existingMap = readExistingNormalizedIds_(ss);
  const existingCount = Object.keys(existingMap).length;
  const sheets = ss.getSheets();
  const toAppend = [];
  let skipped = 0;

  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s];
    const sheetName = sheet.getName();
    if (shouldSkipSheet_(sheetName)) continue;

    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) continue;

    let parsed;
    try {
      parsed = parseQuestions_(values);
    } catch (err) {
      Logger.log(
        '[skip parse] ' + fileName + ' / ' + sheetName + ': ' + err.message,
      );
      continue;
    }
    if (!parsed.length) continue;

    const category = fileName + ' / ' + sheetName;
    for (let i = 0; i < parsed.length; i++) {
      try {
        const row = questionToRow_(
          parsed[i],
          ss.getId(),
          sheetName,
          category,
        );
        const id = row[0];
        if (existingMap[id]) {
          skipped += 1;
          continue;
        }
        existingMap[id] = true;
        toAppend.push(row);
      } catch (err) {
        Logger.log(
          '[skip q] ' +
            fileName +
            ' / ' +
            sheetName +
            ' #' +
            parsed[i].sheetNo +
            ': ' +
            err.message,
        );
      }
    }
  }

  if (toAppend.length) {
    appendNormalizedRows_(ss, toAppend);
  }

  return {
    added: toAppend.length,
    skipped: skipped,
    existing: existingCount,
  };
}

function readExistingNormalizedIds_(ss) {
  const map = {};
  const sheet = ss.getSheetByName(CONFIG.NORMALIZED_SHEET);
  if (!sheet) return map;
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return map;
  const header = values[0].map(function (h) {
    return String(h).trim();
  });
  const idIndex = header.indexOf('id');
  if (idIndex === -1) return map;
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][idIndex] || '').trim();
    if (id) map[id] = true;
  }
  return map;
}

function appendNormalizedRows_(ss, rows) {
  let sheet = ss.getSheetByName(CONFIG.NORMALIZED_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.NORMALIZED_SHEET);
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  } else {
    // ヘッダーが無ければ先頭に書く
    const first = String(sheet.getRange(1, 1).getValue()).trim();
    if (first !== 'id') {
      sheet.insertRowsBefore(1, 1);
      sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    }
  }
  const start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, start + rows.length - 1, HEADER.length).setValues(rows);
}

function shouldSkipSheet_(sheetName) {
  if (sheetName === CONFIG.NORMALIZED_SHEET) return true;
  const skip = CONFIG.SKIP_SHEET_NAMES || [];
  for (let i = 0; i < skip.length; i++) {
    if (sheetName === skip[i]) return true;
  }
  return false;
}

function assertFolderId_() {
  if (!CONFIG.FOLDER_ID || CONFIG.FOLDER_ID === 'REPLACE_WITH_FOLDER_ID') {
    throw new Error('CONFIG.FOLDER_ID を設定してください');
  }
}

/** 安定 id: spreadsheetId + sheetName + 問題文 */
function makeStableId_(spreadsheetId, sheetName, question) {
  const base =
    String(spreadsheetId) +
    '|' +
    String(sheetName) +
    '|' +
    normalizeQuestionKey_(question);
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    base,
    Utilities.Charset.UTF_8,
  );
  return 'q_' + toHex_(digest).slice(0, 16);
}

function normalizeQuestionKey_(question) {
  return String(question)
    .replace(/\s+/g, '')
    .replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    });
}

function toHex_(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    if (b < 0) b += 256;
    const h = b.toString(16);
    out += h.length === 1 ? '0' + h : h;
  }
  return out;
}

function parseQuestions_(values) {
  const results = [];
  let current = null;
  const startRow = 1;

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

function questionToRow_(q, spreadsheetId, sheetName, category) {
  const choices = q.choices.slice(0, 4);
  while (choices.length < 4) choices.push('');

  const filled = choices.filter(Boolean).length;
  if (filled < CONFIG.MIN_CHOICES) {
    throw new Error(
      '選択肢不足 sheetNo=' + q.sheetNo + ' ' + JSON.stringify(choices),
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
        JSON.stringify(choices),
    );
  }

  const id = makeStableId_(spreadsheetId, sheetName, q.question);
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

function cell_(row, index) {
  const v = row[index];
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function toHalfWidthDigits_(s) {
  return String(s)
    .replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    })
    .replace(/\u3000/g, ' ')
    .trim();
}

function isQuestionNumber_(a) {
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

  const s = toHalfWidthDigits_(raw);
  const n = Number(s);
  if (n >= 1 && n <= 4) return n - 1;
  if (n >= 0 && n <= 3 && String(n) === s) return n;

  throw new Error('未対応の正解形式: ' + raw);
}
