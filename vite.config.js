// ★ (2026-05-27, dspark): insait-frontend Vite 설정. 단순화 (design-system v2 직접 import 종료
//   → 자체 컴포넌트 라이브러리 src/components/ui/ 단일 출처). 이전의 dsAliasRewrite /
//   dsAliasEsbuild 플러그인은 제거됨 (필요 없음).
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { fileURLToPath, URL } from 'node:url';

const APP_SRC = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
  ],
  resolve: {
    alias: { '@': APP_SRC },
    extensions: ['.js', '.mjs', '.ts', '.tsx', '.vue', '.json'],
  },
  server: {
    port: 5173,
    proxy: {
      // alpha 백엔드 (h5-saas-alpha/h5webapplication, develop-alpha-test) 8090 으로 프록시.
      // JWT 평문 envelope 모드 (commit 9bf46242) 가 전제.
      '/api': { target: 'http://localhost:8090', changeOrigin: true },
      '/serviceBroker.h5': { target: 'http://localhost:8090', changeOrigin: true },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
