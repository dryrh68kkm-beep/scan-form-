# scan-form-

ฟอร์มสแกนสต๊อก/ตรวจนับ LP — Big C Hyper ไทรน้อย (Store 11252)

เว็บแอปไฟล์เดียว (`index.html`) ใช้งานบนมือถือหน้างานได้ทันทีโดยไม่ต้องมีเซิร์ฟเวอร์ — เปิดไฟล์ในเบราว์เซอร์
(หรือ deploy ผ่าน GitHub Pages) ข้อมูลถูกเก็บไว้ในเครื่อง (localStorage) และ export เป็น CSV ได้

## ฟีเจอร์

- **สแกนนับ** — บันทึกรายการนับสต็อกตาม Fixture No. / บาร์โค้ด (สแกนกล้องผ่าน BarcodeDetector API หรือพิมพ์เอง),
  รองรับวิธี by Count และ Default by One, สถานะ Not Count / Not Found / สินค้าพลัดหลง
- **LP Focus Check** — บันทึกผลตรวจ Focus เทียบ Stock Take Editing Report พร้อมลงชื่อ "LP" ต่อท้ายอัตโนมัติ
- **Negative Stock** — บันทึกพร้อมสาเหตุอ้างอิง Adjust Code (8/9/10/11/12) และเหตุผล Reconcile (A/B/C)
- **Diff / Export** — ตรวจสอบมูลค่าผลต่างเทียบเกณฑ์ Reconcile Before Close/Apply (Hyper vs Market/Food Place)
  และ export ข้อมูลทั้งหมดเป็นไฟล์ CSV
- **Adjust Code Reference** — ตารางค้นหา Adjust Code ฉบับย่อ พร้อมหมวด Damage/Shrinkage

ข้อมูลอ้างอิงอิงตาม SOP-OPT-LP-001, เอกสาร Stock Count Process 2026, Reconcile Before Close/Apply Stock Take
และเอกสารที่เกี่ยวข้องของฝ่าย Loss Prevention
