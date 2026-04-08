// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.acetronix.co.kr',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
});
