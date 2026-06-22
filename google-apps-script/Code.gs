const SHEETS = {
  USERS: "Users",
  SCORE_RULES: "ScoreRules",
  UPLOAD_RECORDS: "UploadRecords",
  REWARD_USAGES: "RewardUsages",
};

const HEADERS = {
  Users: ["id", "name", "createdAt"],
  ScoreRules: ["id", "name", "points", "description", "isActive", "createdAt", "updatedAt"],
  UploadRecords: [
    "id",
    "userId",
    "url",
    "platform",
    "contentTypeId",
    "contentTypeName",
    "customTypeName",
    "isCustomType",
    "pointsEarned",
    "memo",
    "recordedAt",
    "createdAt",
  ],
  RewardUsages: ["id", "userId", "title", "amount", "pointsUsed", "memo", "usedAt", "createdAt"],
};

function doGet(e) {
  const action = e.parameter.action || "load";
  const callback = e.parameter.callback;
  const result = action === "load" ? loadData_() : { ok: true };
  const body = callback ? `${callback}(${JSON.stringify(result)});` : JSON.stringify(result);
  return ContentService.createTextOutput(body).setMimeType(
    callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON,
  );
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  if (payload.action === "save" && payload.data) {
    saveData_(payload.data);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

function loadData_() {
  ensureSheets_();
  return {
    users: readObjects_(SHEETS.USERS),
    scoreRules: readObjects_(SHEETS.SCORE_RULES).map((row) => ({
      ...row,
      points: Number(row.points || 0),
      isActive: row.isActive === true || row.isActive === "TRUE" || row.isActive === "true",
    })),
    uploadRecords: readObjects_(SHEETS.UPLOAD_RECORDS).map((row) => ({
      ...row,
      pointsEarned: Number(row.pointsEarned || 0),
      isCustomType: row.isCustomType === true || row.isCustomType === "TRUE" || row.isCustomType === "true",
    })),
    rewardUsages: readObjects_(SHEETS.REWARD_USAGES).map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
      pointsUsed: Number(row.pointsUsed || 0),
    })),
  };
}

function saveData_(data) {
  ensureSheets_();
  writeObjects_(SHEETS.USERS, data.users || []);
  writeObjects_(SHEETS.SCORE_RULES, data.scoreRules || []);
  writeObjects_(SHEETS.UPLOAD_RECORDS, data.uploadRecords || []);
  writeObjects_(SHEETS.REWARD_USAGES, data.rewardUsages || []);
}

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach((sheetName) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    const headers = HEADERS[sheetName];
    const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (existing.join("") !== headers.join("")) {
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function readObjects_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const object = {};
      headers.forEach((header, index) => {
        object[header] = row[index];
      });
      return object;
    });
}

function writeObjects_(sheetName, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  if (!rows.length) return;
  const values = rows.map((row) => headers.map((header) => row[header] ?? ""));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}