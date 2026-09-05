/*
 * Google Apps Script Web App — ทางเลือกแทน Firestore โดยเก็บข้อมูลใน Google Sheet
 * ยังไม่ได้เชื่อมเข้ากับแอปจริง (ดูคำเตือนเรื่องความเร็วใน README.md ในโฟลเดอร์นี้ก่อนตัดสินใจสลับ)
 *
 * โครงสร้าง: 1 sheet tab ต่อ 1 collection (employees, products, documents, system)
 * แต่ละแถว: id | data_json | updatedAt — เก็บฟิลด์ทั้งหมดเป็น JSON string ในคอลัมน์เดียว
 * (เหมือนกับ cf-worker/worker.js ที่เคยเขียนไว้ ใช้ document-store shape เดียวกัน
 *  เพื่อให้ client library หน้าตาเหมือนเดิมที่สุด ไม่ต้องเขียน parsing โครงสร้างพิเศษ)
 *
 * วิธี deploy (ทำเองที่ script.google.com เพราะ deploy จากตรงนี้ไม่ได้):
 * 1. เปิด Google Sheet ที่จะใช้เป็นฐานข้อมูล (สร้างใหม่เปล่า ๆ ก็ได้ ไม่ต้องมี sheet tab ล่วงหน้า)
 * 2. เมนู Extensions > Apps Script
 * 3. ลบโค้ดเริ่มต้นในไฟล์ Code.gs ทั้งหมด แล้ว copy ไฟล์นี้ไปวางแทน
 * 4. กด Deploy > New deployment > เลือกประเภท "Web app"
 *    - Execute as: Me
 *    - Who has access: Anyone (ต้องเป็น Anyone ไม่งั้นเรียกจากเว็บแอปไม่ได้เพราะไม่มีการ login)
 * 5. กด Deploy จะได้ URL แบบ https://script.google.com/macros/s/XXXX/exec
 * 6. เอา URL นั้นไปใส่ใน gs-backend/gs-config.js แทน REPLACE_ME
 */

var LOCK_TIMEOUT_MS = 10000;

function getOrCreateSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, 3).setValues([['id', 'data_json', 'updatedAt']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRow_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // แถวจริงใน sheet (1-indexed, แถว 1 คือ header)
  }
  return -1;
}

function rowToDoc_(id, dataJson) {
  var o;
  try { o = JSON.parse(dataJson); } catch (e) { o = {}; }
  o._id = id;
  return o;
}

function jsonOut_(obj, code) {
  var out = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  return out; // Apps Script Web App ไม่รองรับการตั้ง HTTP status code เอง (ตอบ 200 เสมอ) —
              // client library เลยต้องเช็ค error จาก field "error" ใน body แทน status code
}

function doGet(e) {
  var params = e.parameter;
  var sheetName = params.sheet;
  if (!sheetName) return jsonOut_({ ok: true }); // health check เหมือนของ Firebase/Cloudflare
  var sheet = getOrCreateSheet_(sheetName);

  if (params.id) {
    var row = findRow_(sheet, params.id);
    if (row < 0) return jsonOut_({ error: { message: 'NOT_FOUND', code: 404 } });
    var vals = sheet.getRange(row, 1, 1, 2).getValues()[0];
    return jsonOut_(rowToDoc_(vals[0], vals[1]));
  }

  var last = sheet.getLastRow();
  if (last < 2) return jsonOut_({ documents: [] });
  var rows = sheet.getRange(2, 1, last - 1, 2).getValues();
  var documents = rows.filter(function (r) { return r[0] !== ''; })
    .map(function (r) { return rowToDoc_(r[0], r[1]); });
  return jsonOut_({ documents: documents });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return jsonOut_({ error: { message: 'bad request body' } }); }
  var sheetName = body.sheet, id = String(body.id || ''), op = body.op;
  if (!sheetName || !id || !op) return jsonOut_({ error: { message: 'missing sheet/id/op' } });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_TIMEOUT_MS);
  } catch (e2) {
    return jsonOut_({ error: { message: 'LOCKED: server busy, try again' } });
  }
  try {
    var sheet = getOrCreateSheet_(sheetName);
    var row = findRow_(sheet, id);
    var now = new Date().toISOString();

    if (op === 'create') {
      if (row > 0) return jsonOut_({ error: { message: 'ALREADY_EXISTS: document already exists' } });
      sheet.appendRow([id, JSON.stringify(body.data || {}), now]);
      var o = Object.assign({}, body.data); o._id = id;
      return jsonOut_(o);
    }

    if (op === 'update') {
      if (row < 0) return jsonOut_({ error: { message: 'NOT_FOUND' } });
      var existing = JSON.parse(sheet.getRange(row, 2).getValue() || '{}');
      var merged = Object.assign(existing, body.data || {});
      sheet.getRange(row, 2, 1, 2).setValues([[JSON.stringify(merged), now]]);
      var o2 = Object.assign({}, merged); o2._id = id;
      return jsonOut_(o2);
    }

    return jsonOut_({ error: { message: 'unsupported op: ' + op } });
  } finally {
    lock.releaseLock();
  }
}
