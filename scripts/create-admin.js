// 產生一組管理員帳號的 SQL INSERT 語句（雜湊方式跟 src/auth.js 的 hashPassword() 完全一致）。
// 用法：node scripts/create-admin.js <帳號> <密碼>
// 產生的 SQL 貼到 wrangler d1 execute 執行即可建立/取代管理員帳號。

const crypto = require("crypto");

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error("用法：node scripts/create-admin.js <帳號> <密碼>");
  process.exit(1);
}
if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  console.error("密碼至少需要 8 碼，且需同時包含英文字母與數字。");
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
const hashB64 = hash.toString("base64");
const saltB64 = salt.toString("base64");

console.log("將以下 SQL 存成檔案（例如 create-admin.sql）後執行：");
console.log("");
console.log(`  npx wrangler d1 execute <你的 D1 資料庫名稱> --remote --file=create-admin.sql`);
console.log("");
console.log("SQL 內容：");
console.log("");
console.log(
  `DELETE FROM admin_users WHERE username = '${username.replace(/'/g, "''")}';\n` +
  `INSERT INTO admin_users (username, password_hash, password_salt, role)\n` +
  `VALUES ('${username.replace(/'/g, "''")}', '${hashB64}', '${saltB64}', 'admin');`
);
