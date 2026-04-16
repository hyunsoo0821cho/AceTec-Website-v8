/**
 * AceTec 웹 서버 PM2 안정화 설정
 *   - 위치: C:\Users\user\Desktop\acetec-pm2.config.cjs
 *   - 프로젝트 폴더(AceTec-Website-v8) 밖에 있음 → 소스/CSS/아키텍처 무영향
 *
 * 적용:
 *   pm2 delete acetec 2>$null
 *   pm2 start C:\Users\user\Desktop\acetec-pm2.config.cjs
 *   pm2 save
 *
 * 상태 확인:
 *   pm2 status
 *   pm2 logs acetec --lines 50
 *   pm2 monit
 *
 * 설계 근거:
 *   - 이전 8080 서버가 14:20 에 기동된 뒤 1시간 넘게 돌면서 /api/chat 500 발생
 *   - 원인: 오래 실행 시 메모리·내부 상태 누적 (Node 특성)
 *   - 해결: max_memory_restart + 매일 새벽 4시 예방 재기동 + 로그 로테이션
 */
module.exports = {
  apps: [
    {
      name: 'acetec',
      script: 'C:\\Users\\user\\Desktop\\AceTec-Website-v8\\dist\\server\\entry.mjs',
      cwd:    'C:\\Users\\user\\Desktop\\AceTec-Website-v8',

      // ===== 실행 환경 =====
      env: {
        HOST: '0.0.0.0',       // 외부 네트워크에서 접근 허용 (기존 설정 유지)
        PORT: '8080',           // 운영 서버 포트 (기존 설정 유지)
        NODE_ENV: 'production',
      },

      instances: 1,
      exec_mode: 'fork',

      // ===== 자동 복구 =====
      autorestart: true,                    // 크래시 시 자동 재기동
      max_memory_restart: '500M',           // 메모리 500MB 초과 시 재기동 (누수 방어)
      restart_delay: 5000,                  // 재기동 간격 5초 (flap 방지)
      exp_backoff_restart_delay: 200,       // 연속 실패 시 지수 백오프
      max_restarts: 10,                     // 1분 내 10회 실패 시 정지 (무한 루프 방지)
      min_uptime: 10000,                    // 10초 이상 유지돼야 '정상 기동' 으로 인정

      // ===== 예방 재기동 =====
      cron_restart: '0 4 * * *',            // 매일 새벽 4시 재기동 (상태 누적 초기화)
                                            // 접속량 적은 시간대 선택 → 사용자 영향 최소

      // ===== 로그 =====
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'C:\\Users\\user\\.pm2\\logs\\acetec-error.log',
      out_file:   'C:\\Users\\user\\.pm2\\logs\\acetec-out.log',
      merge_logs: true,

      // ===== 종료 처리 =====
      kill_timeout: 5000,                   // SIGTERM 보낸 뒤 5초 기다리고 SIGKILL
      wait_ready: false,                    // Astro 는 ready 시그널 안 보냄
      listen_timeout: 30000,                // 30초 내 리스닝 안 되면 실패 처리
    },
  ],
};
