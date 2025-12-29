const dotenv = require('dotenv');

function check(label, path) {
  const r = dotenv.config(path ? { path } : undefined);
  console.log(`\n[${label}]`);
  if (r.error) console.log('dotenv error:', r.error.message);
  console.log('DATABASE_URL set?', !!process.env.DATABASE_URL);
  console.log('JWT_SECRET set?', !!process.env.JWT_SECRET);
  if (process.env.DATABASE_URL) console.log('DATABASE_URL:', process.env.DATABASE_URL);
}

check('.env (default)', null);

// 一度環境変数をクリアしてから .env.test を読む（比較しやすくする）
delete process.env.DATABASE_URL;
delete process.env.JWT_SECRET;

check('.env.test', '.env.test');
