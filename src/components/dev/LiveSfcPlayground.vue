<script setup>
// ★ (2026-06-14, dspark): InDataTable 개발자 매뉴얼용 라이브 SFC 플레이그라운드.
//   W3Schools "Try it yourself" 모델 — 좌측 CodeMirror 에디터에서 Vue SFC 를 고치면
//   우측에 결과가 즉시 렌더된다. 핵심 기술 = vue3-sfc-loader 런타임 SFC 컴파일.
//   문서가 "진짜" InDataTable·실 테마·실 envelope 서비스를 import 해 돌리므로
//   구현과 문서가 갈라지지 않는다(drift 0). 예제 코드는 실 프로젝트에 그대로 복붙 가능.
//
//   moduleCache 로 허용 import 화이트리스트를 주입:
//     vue / element-plus / @/components/ui/InDataTable.vue / InButton / useToast / @/utils/grid
//   → 예제는 실제 코드와 동일한 import 경로를 쓴다(복붙 호환).
import { ref, shallowRef, markRaw, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as Vue from 'vue';
import * as ElementPlus from 'element-plus';
import { loadModule } from 'vue3-sfc-loader';
import { EditorView, basicSetup } from 'codemirror';
import { vue as cmVue } from '@codemirror/lang-vue';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';

import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import { useToast } from '@/composables/useToast';
import * as gridUtils from '@/utils/grid';

const props = defineProps({
  // 플레이그라운드 초기 코드 (SFC 원문). 예제 = examples.js 의 문자열.
  initialCode: { type: String, required: true },
  title: { type: String, default: 'Try it yourself' },
  // 편집 즉시 자동 재컴파일 여부 (false 면 [실행] 버튼으로만).
  autoRun: { type: Boolean, default: true },
  previewHeight: { type: [Number, String], default: 360 },
});

const toast = useToast();
const editorEl = ref(null);
const compiled = shallowRef(null);
const error = ref('');
const runtimeError = ref('');

let view = null;          // CodeMirror EditorView
let styleEls = [];        // vue3-sfc-loader 가 주입한 <style> 추적 → 재컴파일 시 제거
let debounceId = null;

// ── vue3-sfc-loader 허용 import 화이트리스트 ──────────────────────────────
//   예제 SFC 가 import 하는 경로를 실제 모듈로 매핑. 여기 없는 import 는 에러로 노출.
const moduleCache = {
  vue: Vue,
  'element-plus': ElementPlus,
  '@/components/ui/InDataTable.vue': { default: InDataTable, __esModule: true },
  '@/components/ui/InButton.vue': { default: InButton, __esModule: true },
  '@/composables/useToast': { useToast, __esModule: true },
  '@/utils/grid': { ...gridUtils, __esModule: true },
};

function makeLoaderOptions(getCode) {
  return {
    moduleCache,
    getFile(url) {
      if (url === '/playground.vue') return { getContentData: () => getCode(), type: '.vue' };
      throw new Error(`허용되지 않은 import: ${url}\n(사용 가능: vue, element-plus, @/components/ui/InDataTable.vue, @/components/ui/InButton.vue, @/composables/useToast, @/utils/grid)`);
    },
    addStyle(textContent) {
      const style = document.createElement('style');
      style.textContent = textContent;
      style.dataset.sfcPlayground = '1';
      document.head.appendChild(style);
      styleEls.push(style);
    },
    log() { /* 컴파일 경고 무시 */ },
  };
}

function clearInjectedStyles() {
  styleEls.forEach((e) => e.remove());
  styleEls = [];
}

async function recompile() {
  const code = view ? view.state.doc.toString() : props.initialCode;
  clearInjectedStyles();
  runtimeError.value = '';
  try {
    const comp = await loadModule('/playground.vue', makeLoaderOptions(() => code));
    error.value = '';
    compiled.value = markRaw(comp);
  } catch (e) {
    error.value = String(e?.message || e);
    // 컴파일 실패 시 직전 렌더는 유지(화면 깜빡임 방지)
  }
}

function scheduleRun() {
  if (!props.autoRun) return;
  clearTimeout(debounceId);
  debounceId = setTimeout(recompile, 450);
}

function reset() {
  if (!view) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: props.initialCode } });
  recompile();
}

async function copy() {
  try {
    await navigator.clipboard.writeText(view ? view.state.doc.toString() : props.initialCode);
    toast.success('코드 복사됨');
  } catch (_) {
    toast.error('복사 실패 (clipboard 권한)');
  }
}

// 예제 런타임 에러를 잡아 문서 전체가 깨지지 않게 격리.
import { onErrorCaptured } from 'vue';
onErrorCaptured((err) => {
  runtimeError.value = String(err?.message || err);
  return false; // 상위 전파 차단
});

onMounted(async () => {
  view = new EditorView({
    parent: editorEl.value,
    state: EditorState.create({
      doc: props.initialCode,
      extensions: [
        basicSetup,
        cmVue(),
        oneDark,
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => { if (u.docChanged) scheduleRun(); }),
      ],
    }),
  });
  await nextTick();
  recompile();
});

onBeforeUnmount(() => {
  clearTimeout(debounceId);
  clearInjectedStyles();
  view?.destroy();
});

defineExpose({ recompile, reset });
</script>

<template>
  <div class="sfc-pg">
    <div class="sfc-pg__bar">
      <span class="sfc-pg__title">{{ title }}</span>
      <span class="sfc-pg__actions">
        <button v-if="!autoRun" type="button" class="sfc-pg__btn sfc-pg__btn--run" @click="recompile">▶ 실행</button>
        <button type="button" class="sfc-pg__btn" @click="reset">↻ 초기화</button>
        <button type="button" class="sfc-pg__btn" @click="copy">⧉ 복사</button>
      </span>
    </div>
    <div class="sfc-pg__body">
      <div class="sfc-pg__pane sfc-pg__pane--code">
        <div ref="editorEl" class="sfc-pg__editor"></div>
      </div>
      <div
        class="sfc-pg__pane sfc-pg__pane--preview"
        :style="{ minHeight: typeof previewHeight === 'number' ? previewHeight + 'px' : previewHeight }"
      >
        <div v-if="error" class="sfc-pg__err">
          <strong>컴파일 오류</strong>
          <pre>{{ error }}</pre>
        </div>
        <div v-else-if="runtimeError" class="sfc-pg__err">
          <strong>실행 오류</strong>
          <pre>{{ runtimeError }}</pre>
        </div>
        <component :is="compiled" v-if="compiled" :key="compiled" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sfc-pg {
  border: 1px solid var(--in-border-default, #e2e2e2);
  border-radius: var(--in-radius-sm, 8px);
  overflow: hidden;
  background: var(--in-bg-white, #fff);
  margin: 16px 0;
}
.sfc-pg__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--in-bg-default, #fbfbfb);
  border-bottom: 1px solid var(--in-border-default, #e2e2e2);
}
.sfc-pg__title {
  font-size: var(--in-font-size-sm, 13px);
  font-weight: 600;
  color: var(--in-text-default, #565656);
}
.sfc-pg__actions { display: flex; gap: 6px; }
.sfc-pg__btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--in-border-default, #e2e2e2);
  border-radius: var(--in-radius-xs, 6px);
  background: var(--in-bg-white, #fff);
  color: var(--in-text-default, #565656);
  cursor: pointer;
}
.sfc-pg__btn:hover { background: var(--in-surface-accent-brand, #f5fbff); color: var(--in-brand, #13a9e9); }
.sfc-pg__btn--run { border-color: var(--in-brand, #13a9e9); color: var(--in-brand, #13a9e9); font-weight: 600; }
.sfc-pg__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 900px) {
  .sfc-pg__body { grid-template-columns: 1fr; }
}
.sfc-pg__pane--code { border-right: 1px solid var(--in-border-default, #e2e2e2); min-width: 0; }
@media (max-width: 900px) {
  .sfc-pg__pane--code { border-right: none; border-bottom: 1px solid var(--in-border-default, #e2e2e2); }
}
.sfc-pg__editor { height: 100%; min-height: 360px; font-size: 13px; }
.sfc-pg__editor :deep(.cm-editor) { height: 100%; }
.sfc-pg__editor :deep(.cm-scroller) { font-family: var(--in-font-family-mono, ui-monospace, monospace); }
.sfc-pg__pane--preview { padding: 14px; overflow: auto; background: var(--in-bg-white, #fff); }
.sfc-pg__err {
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: var(--in-radius-xs, 6px);
  background: color-mix(in srgb, var(--in-text-accent-red, #e33131) 8%, transparent);
  border: 1px solid var(--in-text-accent-red, #e33131);
  color: var(--in-text-accent-red, #e33131);
  font-size: 12px;
}
.sfc-pg__err pre { margin: 6px 0 0; white-space: pre-wrap; word-break: break-all; font-family: var(--in-font-family-mono, monospace); }
</style>
