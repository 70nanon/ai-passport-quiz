/**
 * GAS②: 各ファイルの normalized タブを集め、統合スプレッドシートへ書き出す
 *
 * 使い方（スタンドアロン推奨）:
 * 1. このファイル全体を Apps Script に貼る（①とは別プロジェクトでも可）
 * 2. CONFIG.FOLDER_ID と CONFIG.MERGED_SPREADSHEET_ID を設定
 * 3. mergeNormalizedInFolder() を実行
 *
 * 動作:
 * - 元の複数行問題タブは見ない（normalized だけ読む）
 * - 統合シートは毎回ヘッダー＋全行を書き直す（正本は各ファイルの normalized）
 * - 人が編集するのは各 normalized。統合シートは公開・Actions 用コピー
 *
 * 列: id, category, question, choiceA, choiceB, choiceC, choiceD, answer, explanation
 *
 * リポジトリ保管用。Node では実行しない。
 */

const CONFIG = {
  FOLDER_ID: 'REPLACE_WITH_FOLDER_ID',
  /** 統合先スプレッドシート ID（空のブックを1つ作ってその ID を入れる） */
  MERGED_SPREADSHEET_ID: 'REPLACE_WITH_MERGED_SPREADSHEET_ID',
  FILE_NAME_INCLUDES: '問題集',
  NORMALIZED_SHEET: 'normalized',
  MERGED_SHEET: 'normalized',
  /** 統合先ファイル自身をソース走査から除外するための名前部分一致（任意） */
  SKIP_FILE_NAME_INCLUDES: '統合',
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

function mergeNormalizedInFolder() {
  assertConfig_();
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const byId = {};
  const logs = [];
  let sourceFiles = 0;

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (file.getId() === CONFIG.MERGED_SPREADSHEET_ID) continue;
    if (
      CONFIG.SKIP_FILE_NAME_INCLUDES &&
      name.indexOf(CONFIG.SKIP_FILE_NAME_INCLUDES) !== -1
    ) {
      continue;
    }
    if (
      CONFIG.FILE_NAME_INCLUDES &&
      name.indexOf(CONFIG.FILE_NAME_INCLUDES) === -1
    ) {
      continue;
    }

    const ss = SpreadsheetApp.openById(file.getId());
    const sheet = ss.getSheetByName(CONFIG.NORMALIZED_SHEET);
    if (!sheet) {
      logs.push('[skip no normalized] ' + name);
      continue;
    }

    const rows = readNormalizedRows_(sheet);
    sourceFiles += 1;
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i][0];
      if (!id) continue;
      byId[id] = rows[i];
      count += 1;
    }
    logs.push(name + ' → ' + count + ' 行');
  }

  const mergedRows = Object.keys(byId)
    .sort()
    .map(function (id) {
      return byId[id];
    });

  writeMergedSpreadsheet_(mergedRows);

  const msg =
    'GAS②完了: ソース ' +
    sourceFiles +
    ' ファイル / 統合 ' +
    mergedRows.length +
    ' 問\n' +
    logs.join('\n');
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(
      '統合完了: ' + mergedRows.length + ' 問 → 統合スプレッドシート',
    );
  } catch (e) {}
}

function readNormalizedRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const header = values[0].map(function (h) {
    return String(h).trim();
  });
  const index = {};
  for (let i = 0; i < HEADER.length; i++) {
    index[HEADER[i]] = header.indexOf(HEADER[i]);
  }
  if (index.id === -1) {
    throw new Error('normalized に id 列がありません: ' + sheet.getParent().getName());
  }

  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const src = values[r];
    const id = String(src[index.id] || '').trim();
    if (!id) continue;
    const row = [];
    for (let c = 0; c < HEADER.length; c++) {
      const key = HEADER[c];
      const idx = index[key];
      let v = idx === -1 ? '' : src[idx];
      if (v === null || v === undefined) v = '';
      if (key === 'answer') {
        row.push(typeof v === 'number' ? v : String(v).trim());
      } else {
        row.push(String(v).trim());
      }
    }
    rows.push(row);
  }
  return rows;
}

function writeMergedSpreadsheet_(rows) {
  const ss = SpreadsheetApp.openById(CONFIG.MERGED_SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.MERGED_SHEET);
  if (!sheet) sheet = ss.insertSheet(CONFIG.MERGED_SHEET);
  sheet.clearContents();
  const values = [HEADER].concat(rows);
  sheet.getRange(1, 1, values.length, HEADER.length).setValues(values);
}

function assertConfig_() {
  if (!CONFIG.FOLDER_ID || CONFIG.FOLDER_ID === 'REPLACE_WITH_FOLDER_ID') {
    throw new Error('CONFIG.FOLDER_ID を設定してください');
  }
  if (
    !CONFIG.MERGED_SPREADSHEET_ID ||
    CONFIG.MERGED_SPREADSHEET_ID === 'REPLACE_WITH_MERGED_SPREADSHEET_ID'
  ) {
    throw new Error('CONFIG.MERGED_SPREADSHEET_ID を設定してください');
  }
}
