/*
 * Firestore + Auth ผ่าน REST API ล้วน (ไม่ใช้ Firebase SDK / ไม่มี CDN)
 * ตามมาตรฐาน firebase-github-deploy — apiKey เปิดเผยได้ตามปกติ ความปลอดภัยอยู่ที่ Firestore Security Rules
 * ต้องโหลดไฟล์นี้ "หลัง" firebase-config.js เสมอ (ใช้ FIREBASE_CONFIG จากไฟล์นั้น)
 */

var fsIdToken = null;
var fsOnline = true;

function fsBase() {
  return 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_CONFIG.projectId + '/databases/(default)/documents';
}

// ---------- login แบบ Anonymous Auth (auto, ไม่มีรหัสผ่าน ไม่ต้องให้ผู้ใช้พิมพ์อะไร) ----------
window.fsAutoLogin = async function () {
  const r = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + FIREBASE_CONFIG.apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    }
  );
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  fsIdToken = d.idToken;
  fsOnline = true;
  return fsIdToken;
  // token อายุ 1 ชม. — เรียก fsAutoLogin() ซ้ำเมื่อเจอ 401 (ดู fsFetch ด้านล่าง)
  // signUp แบบ anonymous จะคืน uid ใหม่ทุกครั้งที่เรียกไม่มี refreshToken เก็บไว้ใช้ต่อ — ยอมรับได้เพราะ
  // Security Rules อนุญาตทุก request.auth != null อยู่แล้ว ไม่ผูกสิทธิ์กับ uid ใดเป็นพิเศษ
};

// ---------- แปลงค่า JS <-> Firestore value ----------
function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const k in v) fields[k] = toFs(v[k]);
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(v) };
}
function fromFs(f) {
  if (!f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('integerValue' in f) return parseInt(f.integerValue, 10);
  if ('doubleValue' in f) return f.doubleValue;
  if ('timestampValue' in f) return new Date(f.timestampValue);
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(fromFs);
  if ('mapValue' in f) {
    const o = {};
    const fl = f.mapValue.fields || {};
    for (const k in fl) o[k] = fromFs(fl[k]);
    return o;
  }
  return null;
}
function docToObj(doc) {
  const o = fromFs({ mapValue: { fields: doc.fields || {} } });
  o._id = doc.name.split('/').pop();
  return o;
}

// ---------- fetch wrapper: แนบ token, retry ครั้งเดียวถ้า 401 (token หมดอายุ) ----------
// สำคัญ: ต้องคำนวณ header ใหม่ทุกครั้ง (ไม่ mutate opts.headers เดิม) ไม่งั้นตอน retry หลัง
// fsAutoLogin() ได้ token ใหม่แล้ว opts.headers ที่ยังค้าง Authorization ตัวเก่าจะทับ token ใหม่
// (Object.assign ตัวหลังชนะ) ทำให้ retry ยังใช้ token หมดอายุซ้ำ แล้วพังเงียบๆ
async function fsFetch(url, opts, retried) {
  opts = opts || {};
  const callOpts = Object.assign({}, opts, {
    headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {},
      fsIdToken ? { Authorization: 'Bearer ' + fsIdToken } : {})
  });
  const r = await fetch(url, callOpts);
  if (r.status === 401 && !retried) {
    await window.fsAutoLogin();
    return fsFetch(url, opts, true);
  }
  return r;
}

// ---------- CRUD ----------
window.fsList = async function (col) {
  let out = [], token = '';
  do {
    const url = fsBase() + '/' + col + '?pageSize=300' + (token ? '&pageToken=' + token : '');
    const d = await (await fsFetch(url)).json();
    if (d.error) throw new Error(d.error.message);
    (d.documents || []).forEach(function (doc) { out.push(docToObj(doc)); });
    token = d.nextPageToken || '';
  } while (token);
  return out;
};

window.fsGet = async function (col, id) {
  const r = await fsFetch(fsBase() + '/' + col + '/' + encodeURIComponent(id));
  if (r.status === 404) return null;
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return docToObj(d);
};

window.fsCreate = async function (col, id, obj) {
  const fields = {};
  for (const k in obj) fields[k] = toFs(obj[k]);
  const r = await fsFetch(fsBase() + '/' + col + '?documentId=' + encodeURIComponent(id), {
    method: 'POST', body: JSON.stringify({ fields: fields })
  });
  const d = await r.json();
  if (d.error) {
    const err = new Error(d.error.message);
    err.alreadyExists = r.status === 409 || /already exists/i.test(d.error.message || '');
    throw err;
  }
  return docToObj(d);
};

// อัปเดตเฉพาะฟิลด์ที่ระบุ — ต้องใส่ updateMask ไม่งั้นฟิลด์อื่นหายหมด
window.fsUpdate = async function (col, id, obj) {
  const fields = {};
  const mask = Object.keys(obj).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
  for (const k in obj) fields[k] = toFs(obj[k]);
  const r = await fsFetch(fsBase() + '/' + col + '/' + encodeURIComponent(id) + '?' + mask, {
    method: 'PATCH', body: JSON.stringify({ fields: fields })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return docToObj(d);
};

// สร้างหรือแทนที่ทั้ง document (ใช้ POST ก่อน ถ้ามีอยู่แล้วให้ fallback เป็น fsUpdate เต็มฟิลด์)
window.fsUpsert = async function (col, id, obj) {
  try {
    return await window.fsCreate(col, id, obj);
  } catch (e) {
    return await window.fsUpdate(col, id, obj);
  }
};

window.fsDelete = function (col, id) {
  return fsFetch(fsBase() + '/' + col + '/' + encodeURIComponent(id), { method: 'DELETE' });
};

window.fsQuery = async function (col, field, op, value) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: col }],
      where: { fieldFilter: { field: { fieldPath: field }, op: op, value: toFs(value) } }
    }
  };
  const r = await fsFetch(fsBase() + ':runQuery', { method: 'POST', body: JSON.stringify(body) });
  const rows = await r.json();
  if (!Array.isArray(rows) && rows && rows.error) throw new Error(rows.error.message);
  return (Array.isArray(rows) ? rows : []).filter(function (x) { return x.document; }).map(function (x) { return docToObj(x.document); });
};
