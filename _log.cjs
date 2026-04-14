const Database = require('better-sqlite3');
const db = new Database('data/acetec.db', { readonly: true });

let lastId = 0;

// 최근 10개 먼저 표시
const recent = db.prepare(`SELECT id, datetime(created_at/1000,'unixepoch','localtime') as t, role, substr(content,1,120) as c FROM messages ORDER BY id DESC LIMIT 10`).all().reverse();
recent.forEach(r => {
  const tag = r.role === 'user' ? '\x1b[36mUSER\x1b[0m' : '\x1b[33mBOT \x1b[0m';
  console.log(`${r.t} | ${tag} | ${r.c}`);
  lastId = r.id;
});

console.log('\n\x1b[32m--- 실시간 모니터링 중 (Ctrl+C 종료) ---\x1b[0m\n');

// 프로세스 안 죽게
process.stdin.resume();
process.on('SIGINT', () => { db.close(); process.exit(); });
process.on('SIGTERM', () => { db.close(); process.exit(); });

// 2초마다 새 메시지 확인
setInterval(() => {
  try {
    const rows = db.prepare(`SELECT id, datetime(created_at/1000,'unixepoch','localtime') as t, role, substr(content,1,120) as c FROM messages WHERE id > ? ORDER BY id`).all(lastId);
    rows.forEach(r => {
      const tag = r.role === 'user' ? '\x1b[36mUSER\x1b[0m' : '\x1b[33mBOT \x1b[0m';
      console.log(`${r.t} | ${tag} | ${r.c}`);
      lastId = r.id;
    });
  } catch (_) {}
}, 2000);
