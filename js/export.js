/*
 * สร้างไฟล์ Excel จากเทมเพลตต้นฉบับ (templates/ADJ_template.xlsx, templates/RTC_template.xlsx)
 * ใช้ร่วมกันทั้งฝั่งมือถือ (index.html) และเดสก์ท็อป (desktop.html)
 * ต้องโหลด vendor/jszip.min.js (ตัวแปร JSZip) ให้พร้อมก่อนเรียกฟังก์ชันในไฟล์นี้
 *
 * สำคัญ: RTC_template.xlsx คอลัมน์ H (ราคาใหม่) เป็นสูตร Excel จริง
 * (IFERROR(ROUNDUP(E-(E*F),0),"")) — ห้ามเขียนค่าทับคอลัมน์นี้ ปล่อยให้ Excel คำนวณเองตอนเปิดไฟล์
 * เพื่อคงสูตรตามต้นฉบับ (แก้บั๊กที่โค้ดเดิมเคยเขียนทับสูตรนี้ด้วยตัวเลขนิ่ง)
 */

var EXPORT_CFG = {
  ADJ: { first: 5, last: 47, hdrBranch: 'A2', hdrDate: 'A3',
         cols: { no: 'A', bc: 'B', name: 'C', code: 'D', qty: 'E', reason: 'F', exp: 'G' },
         templateUrl: 'templates/ADJ_template.xlsx' },
  RTC: { first: 9, last: 28, hdrBranch: 'A4', hdrDate: 'A5',
         cols: { no: 'A', bc: 'B', name: 'C', unit: 'D', price: 'E', pct: 'F', qty: 'G',
                 newPrice: 'H', left: 'I', dateC25: 'J', exp: 'K' },
         templateUrl: 'templates/RTC_template.xlsx' }
};
var EXPORT_SHEET_PATH = 'xl/worksheets/sheet2.xml';

function exportEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function exportThDate(iso) { if (!iso) return ''; const p = iso.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }

function exportSetCell(xml, ref, val) {
  const re = new RegExp('<c r="' + ref + '"([^>]*?)(\\/>|>[\\s\\S]*?<\\/c>)');
  const m = xml.match(re);
  const sm = m ? (m[1] || '').match(/ s="\d+"/) : null;
  const s = sm ? sm[0] : '';
  let cell;
  if (val === null || val === undefined || val === '') { cell = '<c r="' + ref + '"' + s + '/>'; }
  else if (typeof val === 'number') { cell = '<c r="' + ref + '"' + s + '><v>' + val + '</v></c>'; }
  else { cell = '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + exportEsc(val) + '</t></is></c>'; }
  if (m) return xml.replace(re, cell);
  const rowN = ref.replace(/\D/g, '');
  const rre = new RegExp('(<row r="' + rowN + '"[^>]*>)');
  if (rre.test(xml)) return xml.replace(rre, '$1' + cell);
  return xml;
}

var exportTemplateCache = {};
async function exportLoadTemplate(mode) {
  if (exportTemplateCache[mode]) return exportTemplateCache[mode];
  const res = await fetch(EXPORT_CFG[mode].templateUrl);
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  exportTemplateCache[mode] = zip;
  return zip;
}

/*
 * mode: 'ADJ' | 'RTC'
 * items: array ของรายการ (โครงสร้างเดียวกับ S.items[mode] เดิม)
 * meta: {branch, dept, date} (date เป็น 'YYYY-MM-DD')
 * page: เลขหน้า (0 = หน้าแรก) — 1 หน้ากรอกได้ cap แถวตาม cfg
 * คืนค่า {blob, filename}
 */
window.buildExportXlsx = async function (mode, items, meta, page) {
  const cfg = EXPORT_CFG[mode], cap = cfg.last - cfg.first + 1;
  const pageItems = items.slice(page * cap, page * cap + cap);
  const zip = await exportLoadTemplate(mode);
  let xml = await zip.file(EXPORT_SHEET_PATH).async('string');

  const branch = (meta.branch || '').trim(), dept = (meta.dept || '').trim();
  const d = meta.date ? exportThDate(meta.date) : '';
  xml = exportSetCell(xml, cfg.hdrBranch, 'สาขา ' + (branch || '.......................') +
      '     แผนก ' + (dept || '.......................'));
  xml = exportSetCell(xml, cfg.hdrDate, 'วันที่ ' + (d || '.......................'));

  const C = cfg.cols;
  for (let i = 0; i < cap; i++) {
    const r = cfg.first + i, it = pageItems[i];
    if (!it) {
      for (const k in C) { if (mode === 'RTC' && k === 'newPrice') continue; xml = exportSetCell(xml, C[k] + r, ''); }
      continue;
    }
    xml = exportSetCell(xml, C.no + r, page * cap + i + 1);
    xml = exportSetCell(xml, C.bc + r, Number(it.bc));
    xml = exportSetCell(xml, C.name + r, it.name);
    if (mode === 'RTC') {
      xml = exportSetCell(xml, C.unit + r, it.unit);
      xml = exportSetCell(xml, C.price + r, it.price);
      xml = exportSetCell(xml, C.pct + r, it.pct);
      xml = exportSetCell(xml, C.qty + r, it.qty);
      // C.newPrice (คอลัมน์ H) ไม่แตะ — ปล่อยให้สูตรเดิมในเทมเพลตคำนวณเองตอนเปิดไฟล์
      xml = exportSetCell(xml, C.exp + r, exportThDate(it.expIso));
    } else {
      xml = exportSetCell(xml, C.code + r, it.code);
      xml = exportSetCell(xml, C.qty + r, it.qty);
      xml = exportSetCell(xml, C.reason + r, it.reason);
      xml = exportSetCell(xml, C.exp + r, exportThDate(it.expIso));
    }
  }

  // ใช้สำเนา zip ใหม่ทุกครั้ง ไม่แก้ต้นฉบับที่ cache ไว้ (เผื่อ export ซ้ำ/export หลายเอกสารต่อเนื่อง)
  const zipCopy = await JSZip.loadAsync(await zip.generateAsync({ type: 'arraybuffer' }));
  zipCopy.file(EXPORT_SHEET_PATH, xml);
  const out = await zipCopy.generateAsync({ type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = mode + '_' + (branch || 'store').replace(/\s+/g, '') + '_' +
    (meta.date || 'form') + (page > 0 ? ('_p' + (page + 1)) : '') + '.xlsx';
  return { blob: out, filename: filename };
};
