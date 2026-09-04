/*
 * ตั้งค่า Firebase — ไม่ใช่ความลับ (apiKey ของ Firebase เปิดเผยได้ตามการออกแบบ
 * ความปลอดภัยจริงอยู่ที่ Firestore Security Rules ใน firestore.rules ไม่ใช่การซ่อนไฟล์นี้)
 *
 * แอปนี้ใช้ Firebase Anonymous Authentication ล็อกอินอัตโนมัติเบื้องหลัง — "ไม่มีรหัสผ่านให้ฝังในโค้ด"
 * ตามข้อกำหนดห้ามฝังคีย์ลับ/รหัสผ่าน (ต่างจากแอปอื่นที่เคยใช้ shared account + password)
 *
 * วิธีตั้งค่า (ทำครั้งเดียว):
 * 1. เข้า https://console.firebase.google.com → Add project → ตั้งชื่อ (เช่น "scan-form-lp")
 * 2. ในโปรเจกต์ที่สร้าง: Build > Firestore Database > Create database (โหมด Production)
 * 3. Build > Authentication > Sign-in method > เปิดใช้ **"Anonymous"**
 * 4. Project settings (รูปเฟือง) > General > "Your apps" > Add app > Web (</>)
 *    คัดลอกค่าที่ได้มาใส่แทนที่ REPLACE_ME ด้านล่างทั้งหมด
 * 5. เอาเนื้อหาไฟล์ firestore.rules (root ของ repo นี้) ไปวางที่
 *    Firestore Database > Rules > Publish
 */
var FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCiSB77UsUXpikmd60TXh0We8GhQuHy8BI',
  projectId: 'scanning-829f5'
};
