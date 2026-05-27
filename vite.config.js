// ★ (2026-05-27, dspark): insait-frontend 신규 격상 — design-system v2 의 In* 컴포넌트를
//   외부 패키지로 직접 import. design-system 내부 '@/' alias 가 insait-frontend src 와
//   충돌하므로 dsAliasRewrite 플러그인으로 importer 가 design-system 디렉토리일 때만
//   '@/' → design-system/v2/src 로 재해석. tailwindcss v4 + Element Plus auto-import 동시 적용.
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

const DS_ROOT = fileURLToPath(new URL('../../design-system/v2', import.meta.url));
const DS_SRC = resolve(DS_ROOT, 'src');
const APP_SRC = fileURLToPath(new URL('./src', import.meta.url));

/** design-system v2 내부 파일이 '@/' 로 import 할 때 design-system/v2/src 로 재해석.
 *  insait-frontend 본체 import 는 영향 받지 않음. */
function dsAliasRewrite() {
  return {
    name: 'ds-alias-rewrite',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || !source.startsWith('@/')) return null;
      const importerNormalized = importer.replace(/\\/g, '/');
      const dsRootNormalized = DS_ROOT.replace(/\\/g, '/');
      if (!importerNormalized.startsWith(dsRootNormalized)) return null;
      const rewritten = source.replace(/^@\//, `${DS_SRC.replace(/\\/g, '/')}/`);
      const resolved = await this.resolve(rewritten, importer, { skipSelf: true });
      return resolved ? resolved.id : rewritten;
    },
  };
}

export default defineConfig({
  plugins: [
    dsAliasRewrite(),
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
    alias: {
      '@': APP_SRC,
      '@ds': DS_SRC,
    },
    extensions: ['.js', '.mjs', '.vue', '.json'],
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
