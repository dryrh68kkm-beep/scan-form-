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
         templateUrl: 'templates/ADJ_template.xlsx?v=20260905-1600' },
  RTC: { first: 9, last: 28, hdrBranch: 'A4', hdrDate: 'A5',
         cols: { no: 'A', bc: 'B', name: 'C', unit: 'D', price: 'E', pct: 'F', qty: 'G',
                 newPrice: 'H', left: 'I', dateC25: 'J', exp: 'K' },
         templateUrl: 'templates/RTC_template.xlsx?v=20260905-1600' }
};
var EXPORT_SHEET_PATH = 'xl/worksheets/sheet2.xml';

function exportEsc(s) {
  // XML 1.0 ไม่อนุญาต control characters บางตัว หากปล่อยผ่าน Excel จะขึ้น [Repaired]
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function exportThDate(iso) { if (!iso) return ''; const p = iso.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }

function exportSetCell(xml, ref, val) {
  const re = new RegExp('<c r="' + ref + '"([^>]*?)(\\/>|>[\\s\\S]*?<\\/c>)');
  const m = xml.match(re);
  // รักษา attribute เดิมทั้งหมดของเซลล์ (โดยเฉพาะ style/metadata) และเปลี่ยนเฉพาะชนิดข้อมูล
  const attrs = m ? (m[1] || '').replace(/\s+t="[^"]*"/g, '') : '';
  let cell;
  if (val === null || val === undefined || val === '') {
    cell = '<c r="' + ref + '"' + attrs + '/>';
  } else if (typeof val === 'number' && Number.isFinite(val)) {
    cell = '<c r="' + ref + '"' + attrs + '><v>' + val + '</v></c>';
  } else {
    cell = '<c r="' + ref + '"' + attrs + ' t="inlineStr"><is><t xml:space="preserve">' + exportEsc(val) + '</t></is></c>';
  }
  if (m) return xml.replace(re, cell);
  const rowN = ref.replace(/\D/g, '');
  const rre = new RegExp('(<row r="' + rowN + '"[^>]*>)');
  if (rre.test(xml)) return xml.replace(rre, '$1' + cell);
  return xml;
}

var exportTemplateCache = {};
async function exportLoadTemplate(mode) {
  if (exportTemplateCache[mode]) return exportTemplateCache[mode];
  // ห้ามใช้ไฟล์ template เก่าจาก browser/CDN เพราะเคยทำให้รูปแบบคอลัมน์ไม่ตรงต้นฉบับ
  const res = await fetch(EXPORT_CFG[mode].templateUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error('โหลดแบบฟอร์มต้นฉบับไม่สำเร็จ (' + res.status + ')');
  const buf = await res.arrayBuffer();
  const probe = await JSZip.loadAsync(buf);
  if (!probe.file(EXPORT_SHEET_PATH)) throw new Error('แบบฟอร์มต้นฉบับไม่สมบูรณ์');
  exportTemplateCache[mode] = buf;
  return buf;
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
  // สร้าง workbook ใหม่จาก bytes ต้นฉบับทุกครั้ง ไม่ใช้ ZIP object ร่วมกันระหว่างเอกสาร
  const templateBytes = await exportLoadTemplate(mode);
  const zip = await JSZip.loadAsync(templateBytes.slice(0));
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
    // Barcode เป็นรหัสประจำสินค้า ไม่ใช่ตัวเลขคำนวณ ต้องเก็บเป็นข้อความเพื่อรักษาเลข 0 นำหน้า
    // และป้องกัน Excel ปัดค่าบาร์โค้ดที่ยาวเกิน 15 หลัก
    xml = exportSetCell(xml, C.bc + r, String(it.bc == null ? '' : it.bc).trim());
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

  zip.file(EXPORT_SHEET_PATH, xml);
  const out = await zip.generateAsync({ type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const docPart = meta.docId ? (meta.docId + '_') : '';
  const filename = mode + '_' + docPart + (branch || 'store').replace(/\s+/g, '') + '_' +
    (meta.date || 'form') + (page > 0 ? ('_p' + (page + 1)) : '') + '.xlsx';
  return { blob: out, filename: filename };
};

/*
 * ห่อเอกสารทั้งหมดเป็นไฟล์เดียว ไม่ว่าจะกี่หน้า — เอกสารที่มีรายการเกิน 1 หน้า (เกิน 43/20 แถว)
 * จะถูกรวมเป็นไฟล์ .zip เดียว (มีหลาย .xlsx ข้างในตามจำนวนหน้า) แทนการดาวน์โหลดหลายไฟล์แยกกัน
 * เพราะเทมเพลตต้นฉบับแต่ละหน้าเป็นฟอร์มพิมพ์แยกกันจริง (คนละใบกระดาษ) รวมเป็นชีทเดียวไม่ได้
 * โดยไม่เสี่ยงทำให้ไฟล์ .xlsx เสีย — แต่ยังเป็น "การดาวน์โหลดครั้งเดียว ไฟล์เดียว" ตามที่ต้องการ
 */
window.buildExportPackage = async function (mode, items, meta) {
  const cfg = EXPORT_CFG[mode], cap = cfg.last - cfg.first + 1;
  const pages = Math.max(1, Math.ceil((items || []).length / cap));
  if (pages <= 1) {
    return window.buildExportXlsx(mode, items, meta, 0);
  }
  const pkg = new JSZip();
  for (let p = 0; p < pages; p++) {
    const { blob, filename } = await window.buildExportXlsx(mode, items, meta, p);
    pkg.file(filename, blob);
  }
  const out = await pkg.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  const docPart = meta.docId ? (meta.docId + '_') : '';
  const filename = mode + '_' + docPart + (meta.branch || 'store').replace(/\s+/g, '') + '_' +
    (meta.date || 'form') + '_' + pages + 'pages.zip';
  return { blob: out, filename: filename };
};
