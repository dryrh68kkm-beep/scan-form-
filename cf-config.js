/*
 * ตั้งค่า Cloudflare Worker API — แทนที่ firebase-config.js เดิม
 *
 * วิธีตั้งค่า (ทำครั้งเดียว):
 * 1. ติดตั้ง wrangler CLI: npm install -g wrangler
 * 2. เข้าโฟลเดอร์ cf-worker/ แล้ว deploy: wrangler deploy
 *    (D1 database "scan-form-lp" ถูกสร้างและผูกไว้ใน wrangler.toml แล้ว)
 * 3. เอา URL ที่ wrangler แสดงหลัง deploy สำเร็จ (รูปแบบ https://scan-form-lp-api.<subdomain>.workers.dev)
 *    มาใส่แทน REPLACE_ME ด้านล่าง
 * 4. ถ้าเคยมีข้อมูลใน Firebase มาก่อน ให้เปิด cf-worker/migrate.html ครั้งเดียวเพื่อย้ายข้อมูล
 */
var CF_API_BASE = 'https://REPLACE_ME.workers.dev';
