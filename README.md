# scan-form-

**LP Scan Form (ADJ / RTC)** — Big C Hyper ไทรน้อย (Store 11252)

พนักงานสแกนบาร์โค้ดด้วยกล้องมือถือ ระบบสร้างเลขที่เอกสารให้อัตโนมัติและซิงก์ขึ้นส่วนกลาง
เดสก์ท็อปเห็นเอกสารจากมือถือแบบใกล้เคียงเรียลไทม์ เลือกเอกสารแล้วดาวน์โหลดเป็น Excel ตามฟอร์มจริงของ Big C

- **ADJ** — แบบฟอร์มใบแก้ไขรายการ Adjust code (หน้าละ 43 บรรทัด)
- **RTC** — เอกสารขออนุมัติปรับลดราคาสินค้าใกล้หมดอายุ / Markdown Price Form (หน้าละ 20 บรรทัด)

## โครงไฟล์

```
index.html                    แอปฝั่งมือถือ — login พนักงาน, สแกน, สร้าง/จบเอกสาร
desktop.html                  แอปฝั่งเดสก์ท็อป — รายการเอกสารเรียลไทม์, พิมพ์ Excel, ผู้ดูแลระบบ
firebase-config.js            ค่าตั้งค่า Firebase (ไม่ใช่ความลับ — ดูวิธีตั้งค่าด้านล่าง)
firestore.rules               Security Rules ที่ต้องนำไปวางใน Firebase Console
js/firestore.js               ฟังก์ชันอ่าน/เขียน Firestore ผ่าน REST API (ไม่ใช้ SDK/CDN)
js/export.js                  สร้างไฟล์ Excel จากเทมเพลตต้นฉบับ ใช้ร่วมกันทั้งสองหน้า
templates/ADJ_template.xlsx   เทมเพลต Excel ต้นฉบับ (ตำแหน่งเซลล์/รูปแบบ/การตั้งค่าหน้าพิมพ์เดิมทุกอย่าง)
templates/RTC_template.xlsx   เทมเพลต Excel ต้นฉบับ — คอลัมน์ H มีสูตรจริง คงไว้ไม่เขียนทับ
vendor/html5-qrcode.min.js    ตัวอ่านบาร์โค้ดจากกล้อง
vendor/jszip.min.js           ตัวอ่าน/เขียนไฟล์ xlsx
.nojekyll                     กัน GitHub Pages รัน Jekyll build ทับไฟล์
.github/workflows/pages.yml   deploy ขึ้น GitHub Pages อัตโนมัติทุกครั้งที่ push
```

ไม่ใช้ CDN ทุกไฟล์เสิร์ฟจาก repo เดียวกัน — Firebase เชื่อมต่อผ่าน REST API ล้วน (`fetch` ธรรมดา) ไม่ใช้ Firebase SDK

## ตั้งค่า Firebase (ทำครั้งเดียว)

ดูขั้นตอนละเอียดในคอมเมนต์บนสุดของ `firebase-config.js` สรุปสั้นๆ:

1. สร้างโปรเจกต์ใหม่ที่ [console.firebase.google.com](https://console.firebase.google.com)
2. เปิด **Firestore Database** (โหมด Production)
3. เปิด **Authentication > Sign-in method > Anonymous** (แอปนี้ล็อกอินเบื้องหลังแบบไม่มีรหัสผ่าน ไม่ฝังคีย์ลับในโค้ด)
4. เพิ่ม Web app แล้วคัดลอกค่ามาใส่ใน `firebase-config.js` แทน `REPLACE_ME_*`
5. นำเนื้อหาไฟล์ `firestore.rules` ไปวางที่ Firestore Database > Rules > Publish
6. เปิด `desktop.html` แท็บ **ผู้ดูแลระบบ** เพื่อเพิ่มรายชื่อพนักงาน และอัปโหลดฐานข้อมูลสินค้า (CSV หัวคอลัมน์
   `BARCODE, ชื่อสินค้า, ราคา, หน่วย`) — **ฐานข้อมูลสินค้าจริงของสาขาไม่ได้เก็บอยู่ใน repo นี้ (repo เป็น public)**
   ต้องอัปโหลดเองผ่านหน้านี้

## Firestore collections

| collection | doc id | ใช้เก็บ |
|---|---|---|
| `employees` | รหัสพนักงาน | `{name, active}` — รายชื่อพนักงานที่ login ได้ |
| `products` | บาร์โค้ด (normalize แล้ว) | `{name, price, unit}` — ฐานข้อมูลสินค้ากลาง |
| `documents` | เลขที่เอกสาร (`DOC-<mode>-<empCode>-<timestamp>-<rand>`) | เอกสารสแกน 1 ใบ พร้อม `items[]`, `status`, `downloadCount` |

## หมายเหตุการใช้งาน

- ต้องเปิดผ่าน https (GitHub Pages) กล้องถึงจะทำงาน — เปิดใน Safari บน iOS เท่านั้น
- มือถือรองรับออนไลน์เป็นหลัก ถ้าอินเทอร์เน็ตหลุดระหว่างสแกน รายการจะเก็บไว้ใน localStorage ของเครื่องนั้นก่อน
  แล้วซิงก์ขึ้น Firestore อัตโนมัติเมื่อกลับมามีเน็ต (ดูป้าย "ออนไลน์/ออฟไลน์" มุมขวาบน)
- เดสก์ท็อปดึงรายการเอกสารทุก 4 วินาที (REST API ไม่มี live listener แบบ Firebase SDK จึงใช้การ poll ถี่แทน
  ให้ความรู้สึกใกล้เคียงเรียลไทม์)
