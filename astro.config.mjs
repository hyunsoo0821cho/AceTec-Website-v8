// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.acetronix.co.kr',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // CSRF는 미들웨어에서 직접 화이트리스트 기반 처리 (내부 IP + 외부 도메인 동시 지원)
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
});
