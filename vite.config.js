// ★ (2026-05-27, dspark): insait-frontend 신규 격상 — design-system v2 의 In* 컴포넌트를
//   외부 패키지로 직접 import. design-system 내부 '@/' alias 가 insait-frontend src 와
//   충돌하므로 importer scope 별 재해석.
//   - dsAliasRewrite (vite plugin)     : 실제 빌드·HMR 단계
//   - dsAliasEsbuild (esbuild plugin)  : optimizeDeps dep-scan / pre-bundle 단계
//   두 플러그인이 동일 규칙을 양쪽 단계에 각각 적용.
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';
import fs from 'node:fs';

const DS_ROOT = fileURLToPath(new URL('../../design-system/v2', import.meta.url));
const DS_SRC = resolve(DS_ROOT, 'src');
const APP_SRC = fileURLToPath(new URL('./src', import.meta.url));

const DS_ROOT_NORM = DS_ROOT.replace(/\\/g, '/');
const DS_SRC_NORM = DS_SRC.replace(/\\/g, '/');

const TRY_EXTS = [
  '',
  '.vue', '.js', '.mjs', '.ts', '.tsx', '.json',
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif',
  '/index.js', '/index.ts',
];

function resolveDsCandidate(rawPath) {
  for (const ext of TRY_EXTS) {
    const candidate = rawPath + ext;
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch { /* not a file */ }
  }
  return null;
}

/** Vite/esbuild 가 importer 를 절대경로(D:/...) · 가상 prefix(script:/vue:) ·
 *  상대경로(../../design-system/v2/src/...) 등 다양한 형태로 전달하므로
 *  prefix·쿼리 제거 후 design-system path fragment 포함 여부로 매칭. */
const DS_PATH_FRAGMENT = 'design-system/v2/src';
function importerHitsDs(rawImporter) {
  if (!rawImporter) return false;
  const norm = rawImporter
    .replace(/\\/g, '/')
    .replace(/^[a-z-]+:/i, '')   // 'script:' / 'vue:' 등 가상 prefix 제거
    .split('?')[0]
    .split('#')[0];
  return norm.includes(DS_ROOT_NORM) || norm.includes(DS_PATH_FRAGMENT);
}

/** Vite plugin — design-system v2 파일을 transform 단계에서 직접 재작성.
 *  resolveId hook 으로 importer scope 매칭을 시도하면 vite 가 importer 를
 *  여러 형태로 전달해 매칭 누락이 발생하기에 (실측 실패 사례 발생),
 *  더 단순하고 안전한 방식인 transform 으로 소스 자체의 '@/' 를 절대경로로 치환.
 *  enforce:'pre' 로 vite 의 import-analysis 보다 먼저 실행. */
function dsAliasRewrite() {
  // import / from / require / @import (CSS) / url() 모든 '@/' 발생 지점 커버
  const PATTERNS = [
    /(from\s+["'])@\/([^"']+)(["'])/g,
    /(import\s+["'])@\/([^"']+)(["'])/g,
    /(require\(\s*["'])@\/([^"']+)(["']\s*\))/g,
    /(@import\s+["'])@\/([^"']+)(["'])/g,
    /(url\(\s*["']?)@\/([^"')]+)(["']?\s*\))/g,
  ];
  return {
    name: 'ds-alias-rewrite',
    enforce: 'pre',
    transform(code, id) {
      if (!importerHitsDs(id)) return null;
      if (!code.includes('@/')) return null;
      let changed = code;
      for (const re of PATTERNS) {
        changed = changed.replace(re, (_m, p1, p2, p3) => `${p1}${DS_SRC_NORM}/${p2}${p3}`);
      }
      return changed === code ? null : { code: changed, map: null };
    },
  };
}

/** esbuild plugin — optimizeDeps dep-scan / pre-bundle 단계에서 동일 규칙 적용.
 *  design-system 의 .vue / .svg / .ts 는 우리 소스 (deps 아님) → external 표시하여
 *  dep-scan 이 path 만 인지하고 내부 번들링은 건너뛰게 한다. */
function dsAliasEsbuild() {
  return {
    name: 'ds-alias-esbuild',
    setup(build) {
      build.onResolve({ filter: /^@\// }, (args) => {
        if (!importerHitsDs(args.importer)) return null;
        const base = args.path.replace(/^@\//, `${DS_SRC_NORM}/`);
        const hit = resolveDsCandidate(base);
        if (!hit) return null;
        return { path: hit, external: true };
      });
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
    extensions: ['.js', '.mjs', '.ts', '.tsx', '.vue', '.json'],
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [dsAliasEsbuild()],
    },
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
