/*
 * Client library คุยกับ Google Apps Script Web App (gs-backend/Code.gs) แทน Firestore
 * ยังไม่ได้ใช้งานจริง — ไฟล์นี้อยู่แยกไว้ให้ทดสอบความเร็วเองก่อน (ดู README.md ในโฟลเดอร์นี้)
 * ถ้าตัดสินใจใช้จริง ค่อยย้ายไปไว้ที่ js/ และสลับ <script> ใน index.html/desktop.html
 * (เหมือนที่เคยทำกับ cf-worker/ — แทนที่ firebase-config.js + js/firestore.js)
 *
 * สำคัญเรื่อง CORS: Apps Script Web App ไม่รองรับ CORS preflight (OPTIONS) แบบที่ fetch()
 * จะยิงอัตโนมัติเมื่อ POST ด้วย Content-Type: application/json — ต้องส่งเป็น text/plain แทน
 * (เซิร์ฟเวอร์ฝั่ง Code.gs อ่าน e.postData.contents แล้ว JSON.parse เองอยู่แล้ว ไม่สนใจ Content-Type จริง)
 */

function gsUrl(params) {
  var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  return GS_WEB_APP_URL + (q ? '?' + q : '');
}
function gsPost(body) {
  return fetch(GS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // กัน CORS preflight — ดูคอมเมนต์ด้านบน
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); });
}

window.fsAutoLogin = async function () {
  var r = await fetch(gsUrl({}));
  var d = await r.json();
  if (!d.ok) throw new Error('Apps Script unreachable');
  return true;
};

window.fsList = async function (col) {
  var d = await (await fetch(gsUrl({ sheet: col }))).json();
  if (d.error) throw new Error(d.error.message);
  return d.documents || [];
};

window.fsGet = async function (col, id) {
  var d = await (await fetch(gsUrl({ sheet: col, id: id }))).json();
  if (d.error) return d.error.code === 404 || /NOT_FOUND/.test(d.error.message) ? null : (function () { throw new Error(d.error.message); })();
  return d;
};

window.fsCreate = async function (col, id, obj) {
  var d = await gsPost({ sheet: col, id: id, op: 'create', data: obj });
  if (d.error) {
    var err = new Error(d.error.message);
    err.alreadyExists = /already exists/i.test(d.error.message || '');
    throw err;
  }
  return d;
};

window.fsUpdate = async function (col, id, obj) {
  var d = await gsPost({ sheet: col, id: id, op: 'update', data: obj });
  if (d.error) throw new Error(d.error.message);
  return d;
};

window.fsUpsert = async function (col, id, obj) {
  try { return await window.fsCreate(col, id, obj); }
  catch (e) { return await window.fsUpdate(col, id, obj); }
};

// เอาไว้วัด latency จริงก่อนตัดสินใจสลับ — เปิด console แล้วรัน gsLatencyTest() หลังตั้งค่า GS_WEB_APP_URL แล้ว
window.gsLatencyTest = async function (n) {
  n = n || 5;
  var times = [];
  for (var i = 0; i < n; i++) {
    var t0 = performance.now();
    await window.fsAutoLogin();
    times.push(performance.now() - t0);
  }
  console.log('Apps Script round-trip (ms) over ' + n + ' calls:', times, 'avg:', (times.reduce((a, b) => a + b, 0) / n).toFixed(0));
  return times;
};
