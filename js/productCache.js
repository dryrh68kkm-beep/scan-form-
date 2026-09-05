/*
 * แคช Product Master ไว้ใน IndexedDB + เช็ค version กับ Firestore ก่อนโหลดใหม่
 * เป้าหมาย: เปิดแอปปกติ (version ไม่เปลี่ยน) ใช้ Firestore แค่ 1 read (เช็ค _meta/products)
 * ไม่ต้องอ่านทั้ง collection products ซ้ำทุกครั้งที่เปิดหน้า — ดาวน์โหลดเต็มเฉพาะตอน version เปลี่ยนจริง
 * ต้องโหลดไฟล์นี้ "หลัง" js/firestore.js เสมอ (ใช้ window.fsGet/fsList/fsUpsert จากไฟล์นั้น)
 *
 * ใช้ร่วมกับ index.html เท่านั้น (desktop.html ไม่ scan บาร์โค้ด ไม่ต้องอ่าน cache นี้)
 */

var PDC_DB_NAME = 'lpsf_db', PDC_STORE = 'products', PDC_VERSION_KEY = 'lpsf_products_version';
var PDC_DEV = (function () {
  try { return location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /[?&]debug=1\b/.test(location.search); }
  catch (e) { return false; }
})();
window.PDC_STATS = { source: null, version: null, cachedCount: 0, firestoreProductReads: 0, remoteConfirmed: false };

function pdcLog() {
  if (!PDC_DEV) return;
  try { console.log.apply(console, ['[products]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
}

var pdcDbPromise = null;
function pdcOpenDb() {
  if (!window.indexedDB) return Promise.reject(new Error('no indexedDB'));
  if (pdcDbPromise) return pdcDbPromise;
  pdcDbPromise = new Promise(function (resolve, reject) {
    var req = indexedDB.open(PDC_DB_NAME, 1);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(PDC_STORE)) db.createObjectStore(PDC_STORE, { keyPath: 'bc' });
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
  return pdcDbPromise;
}
function pdcGetAll() {
  return pdcOpenDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var req = db.transaction(PDC_STORE, 'readonly').objectStore(PDC_STORE).getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
  });
}
window.pdcPutMany = function (items) {
  if (!items || !items.length) return Promise.resolve();
  return pdcOpenDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PDC_STORE, 'readwrite'), st = tx.objectStore(PDC_STORE);
      items.forEach(function (it) { st.put(it); });
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
};
function pdcClear() {
  return pdcOpenDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PDC_STORE, 'readwrite');
      tx.objectStore(PDC_STORE).clear();
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}
function pdcRowsToMap(rows) {
  var map = {};
  rows.forEach(function (it) { map[it.bc] = { name: it.name, price: it.price, unit: it.unit }; });
  return map;
}

// โหลดจาก IndexedDB อย่างเดียว ไม่แตะ Firestore เลย — ใช้ตอนออฟไลน์
window.pdcLoadFromCacheOnly = async function () {
  var cached = []; try { cached = await pdcGetAll(); } catch (e) { cached = []; }
  window.PDC_STATS.source = 'IndexedDB(offline)'; window.PDC_STATS.remoteConfirmed = false;
  window.PDC_STATS.cachedCount = cached.length;
  pdcLog('offline load', JSON.parse(JSON.stringify(window.PDC_STATS)));
  return pdcRowsToMap(cached);
};

// กันเรียกซ้ำพร้อมกัน (เช่น initApp ถูกเรียกซ้ำ) — ถ้ากำลังโหลดอยู่ ให้รอผลเดิม ไม่ยิงซ้ำ
var pdcSyncPromise = null;
window.pdcLoadProductMaster = function () {
  if (pdcSyncPromise) return pdcSyncPromise;
  pdcSyncPromise = (async function () {
    var localVersion = null; try { localVersion = localStorage.getItem(PDC_VERSION_KEY); } catch (e) {}

    var remoteVersion = null, remoteOk = false;
    try {
      var meta = await window.fsGet('_meta', 'products');
      window.PDC_STATS.firestoreProductReads++;
      remoteVersion = (meta && meta.version != null) ? String(meta.version) : null;
      remoteOk = true;
    } catch (e) { /* ออฟไลน์/เข้าไม่ถึง — ใช้ cache เดิมทั้งหมด ไม่ throw ต่อ */ }

    var cached = []; try { cached = await pdcGetAll(); } catch (e) { cached = []; }

    var needFull = remoteOk && (!cached.length || localVersion !== remoteVersion);
    var source;
    if (needFull) {
      var rows = await window.fsList('products');
      window.PDC_STATS.firestoreProductReads += rows.length;
      var items = rows.map(function (r) { return { bc: String(r._id), name: r.name, price: r.price, unit: r.unit }; });
      try { await pdcClear(); await window.pdcPutMany(items); } catch (e) {}
      try { localStorage.setItem(PDC_VERSION_KEY, remoteVersion == null ? '' : remoteVersion); } catch (e) {}
      cached = items;
      source = 'Firestore';
    } else {
      source = 'IndexedDB';
    }

    window.PDC_STATS.source = source;
    window.PDC_STATS.version = remoteVersion != null ? remoteVersion : localVersion;
    window.PDC_STATS.remoteConfirmed = remoteOk;
    window.PDC_STATS.cachedCount = cached.length;
    pdcLog('sync done', JSON.parse(JSON.stringify(window.PDC_STATS)));
    return pdcRowsToMap(cached);
  })();
  return pdcSyncPromise.finally(function () { pdcSyncPromise = null; });
};

// สแกนไม่เจอใน cache -> query Firestore เฉพาะบาร์โค้ดนั้น 1 รายการ (ไม่ query ทั้ง collection)
// ถ้าเจอ cache กลับเข้า IndexedDB ทันที กันสแกนซ้ำแล้วต้องยิง Firestore อีก
window.pdcLookupOne = async function (bc) {
  try {
    var doc = await window.fsGet('products', bc);
    window.PDC_STATS.firestoreProductReads++;
    if (!doc) { pdcLog('single lookup miss', bc); return null; }
    var item = { bc: String(bc), name: doc.name, price: doc.price, unit: doc.unit };
    try { await window.pdcPutMany([item]); } catch (e) {}
    pdcLog('single lookup hit', bc);
    return item;
  } catch (e) { pdcLog('single lookup failed', bc, e); return null; }
};

// เรียกหลังเขียน products สำเร็จ (สแกนเจอสินค้าใหม่ / อัปโหลด CSV) — บอกเครื่องอื่นให้รู้ว่ามีของใหม่
// เก็บ version ใหม่ไว้ในเครื่องนี้เองด้วยเลย กันเครื่องที่เพิ่งเขียนเองต้องดาวน์โหลดซ้ำจากตัวเอง
window.pdcBumpVersion = async function () {
  var v = Date.now();
  try {
    await window.fsUpsert('_meta', 'products', { version: v });
    try { localStorage.setItem(PDC_VERSION_KEY, String(v)); } catch (e) {}
  } catch (e) { pdcLog('bump version failed (offline?)', e); }
  return v;
};
