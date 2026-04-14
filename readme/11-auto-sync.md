# 11. 자동 동기화 (Auto-Sync)

## 실행

```bash
npm run sync
```

---

## 동작 방식

```
[scripts/auto-sync.mjs 시작]
       |
       +-- 감시 대상: src/, public/, scripts/, CLAUDE.md
       +-- 무시 대상: .astro, node_modules, dist, data, .git
       |
       v
[fs.watch로 파일 변경 감지]
       |
       +-- 변경 발생 -> changedFiles Set에 추가
       +-- 30초 디바운스 타이머 리셋
       |
       v (마지막 변경 후 30초 경과)
       |
[gitSync() 실행]
       +-- git status --porcelain -uno (변경 확인)
       +-- git add src/ public/ scripts/ CLAUDE.md package.json astro.config.mjs tsconfig.json .gitignore
       +-- git diff --cached --name-only (staged 파일 목록)
       +-- git commit -m "auto: YYYY-MM-DD HH:MM (N files)"
       +-- git push hyunsoo main
```

---

## 설정

| 항목 | 값 |
|------|-----|
| Remote | `hyunsoo` |
| Branch | `main` |
| Debounce | 30초 (마지막 변경 후) |
| Watch Dirs | src/, public/, scripts/, CLAUDE.md |
| Ignore | .astro, node_modules, dist, data, .git |

---

## 특이 사항

- `Ctrl+C`로 종료 시 미커밋 변경사항 마지막 동기화 수행
- 커밋 메시지 형식: `auto: 2026-04-08 14:30 (5 files)`
