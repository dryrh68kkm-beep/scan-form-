# Google Sheets backend (ยังไม่ได้ใช้งานจริง)

โฟลเดอร์นี้เป็นแบบร่างสำหรับสลับจาก Firestore ไป Google Sheets ตามที่ขอให้เตรียมไว้ดูก่อน
**ยังไม่ได้เชื่อมเข้ากับ `index.html`/`desktop.html`** — ต้องทดสอบความเร็วจริงก่อนตัดสินใจ

## คำเตือนเรื่องความเร็ว (สำคัญที่สุด)

Google Apps Script Web App มี cold start และ overhead ต่อ request สูงกว่า Firestore REST มาก
โดยทั่วไป:
- Firestore REST: ~100-400ms ต่อ request
- Apps Script Web App: ~1-3 วินาทีต่อ request (บางครั้งช้ากว่านี้ถ้า script "เย็น" ยังไม่เคยถูกเรียกมาสักพัก)

ผลกระทบกับแอปนี้ถ้าสลับจริง:
- **เปิดแอป/reload** (เช็ค version, `checkEmployee()`) จะช้าลงชัดเจน จากเกือบทันทีเป็นรอ 1-3 วิ
- **สแกนบาร์โค้ดที่เจอใน cache** (99%+ ของการสแกนหลังใช้งานไปสักพัก) **ไม่กระทบ** เพราะอ่านจาก
  IndexedDB ล้วน ไม่ยิง network เลย
- **สแกนบาร์โค้ดที่ไม่เจอใน cache** ก็ไม่กระทบการเปิดชีท (ยิงแบบ background ไม่บล็อก UI ตามที่ทำไว้
  ในรอบก่อน) แต่ข้อมูลที่เพิ่งเจอจะโผล่ช้ากว่าเดิม 1-3 วิ

## วิธีทดสอบก่อนตัดสินใจ

1. Deploy `Code.gs` ตามขั้นตอนในคอมเมนต์บนสุดของไฟล์นั้น
2. แก้ `gs-config.js` ใส่ URL ที่ได้
3. เปิด `test.html` ในเบราว์เซอร์ (เปิดตรง ๆ จาก local ก็ได้ ไม่ต้อง deploy) กดปุ่มทดสอบ
4. ดูตัวเลข ms ที่ได้จริง เทียบกับ Firestore ปัจจุบัน

## ถ้าตัดสินใจสลับจริง (ยังไม่ได้ทำ)

ต้องทำเพิ่มอีก 3 อย่าง:
1. ย้ายไฟล์ `gsheet.js`/`gs-config.js` เข้า `js/`/root แล้วสลับ `<script>` ใน `index.html`/`desktop.html`
   จาก `firebase-config.js`+`js/firestore.js` เป็นไฟล์ชุดนี้ (เหมือนที่เคยทำกับ Cloudflare)
2. ย้ายข้อมูลเดิมจาก Firestore (employees/products/documents) เข้า Sheets — ยังไม่ได้เขียนสคริปต์
   migrate ให้ (รอผลทดสอบความเร็วก่อนตามที่ตกลงกัน)
3. พิจารณาตัดขั้นตอนที่บล็อก UI ที่ยังเหลืออยู่ (version check ตอนเปิดแอป, `checkEmployee()` ตอน login)
   ให้ทำงานแบบ optimistic/background มากขึ้น เพื่อลดผลกระทบจาก latency สูงของ Apps Script
