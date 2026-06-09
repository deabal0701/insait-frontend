<script setup>
/**
 * ScreenHelpDrawer — 화면별 "실행 SQL + 조건 + 업무 도움말 + 테이블 컬럼정보" 우측 드로어 (학습용).
 * ★ (2026-06-09, dspark): admin lane 카탈로그 화면이 실제로 실행하는 SQL(복붙 실행 가능)과
 *   각 조건(필터/바인드) 설명 + 업무 주의사항 + 테이블 컬럼정보(하단 접이식)를 화면에서 직접 학습.
 *   CatalogPage 제목 5클릭으로 노출되는 [?]도움말 버튼으로 열림.
 *   데이터 = 화면별 사이드카 `<Screen>.help.js` (operations[] / businessNotes[] / tables[]). InModal type="detail" 래핑.
 *   출처: 신규 (design-system 대응 컴포넌트 없음 — admin lane 전용). Figma 노드 ID = TBD.
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * ★★ [DEV-HELP] 임시 개발 편의용 — 운영 전 제거 대상 ★★ (2026-06-09, dspark, 사용자 명시)
 *   본 도움말은 개발 편의를 위한 임시 기능. 제거 시 grep 키 "DEV-HELP" 로 일괄 추적:
 *     1) 이 파일(ScreenHelpDrawer.vue) 삭제
 *     2) 모든 `*.help.js` 삭제 (src/pages/admin/**​/*.help.js)
 *     3) CatalogPage.vue 의 [DEV-HELP] 표시 블록 삭제 (import / prop / script / template 2곳 / CSS)
 *     4) 각 카탈로그 .vue 의 [DEV-HELP] 표시 2줄 삭제 (help import + :help prop)
 *   → 모든 help 코드는 `help` prop 가드 + 추가 전용이라, 제거해도 나머지 동작은 100% 동일.
 * ════════════════════════════════════════════════════════════════════════════════
 */
import { ref } from 'vue';
import InModal from '@/components/ui/InModal.vue';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  // { object, title, table, asOf, operations:[{key,label,sql,conditions:[{name,effect}],note}], businessNotes:[] }
  help: { type: Object, default: null },
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open']);

const toast = useToast();
const copiedKey = ref('');

async function copySql(op) {
  try {
    await navigator.clipboard.writeText(op.sql);
    copiedKey.value = op.key;
    toast.success?.(`SQL 복사됨 — ${op.label}`);
    setTimeout(() => { if (copiedKey.value === op.key) copiedKey.value = ''; }, 1500);
  } catch (e) {
    toast.error?.('복사 실패');
  }
}
function close() { emit('update:open', false); }
</script>

<template>
  <InModal
    :model-value="open"
    type="detail"
    :title="help ? `도움말 — ${help.title} (${help.object})` : '도움말'"
    :width="760"
    @update:model-value="(v) => { if (!v) close(); }"
    @close="close"
  >
    <div v-if="help" class="help">
      <p class="help__meta">
        <span class="help__table">{{ help.table }}</span>
        <span v-if="help.asOf" class="help__asof">· 현재 구현 기준 {{ help.asOf }}</span>
      </p>

      <!-- 실행 SQL (동작별) -->
      <section class="help__sec">
        <h3 class="help__h">▸ 이 화면이 실행하는 SQL (동작별)</h3>
        <p class="help__lead">아래 SQL 은 실제 화면이 실행하는 쿼리를 bind 자리에 예시값을 채운 <strong>그대로 실행 가능한</strong> 형태입니다. 조건(필터·바인드)별 동작은 표로 설명합니다.</p>
        <div v-for="op in help.operations" :key="op.key" class="help__op">
          <div class="help__op-head">
            <strong class="help__op-label">{{ op.label }}</strong>
            <button type="button" class="help__copy" @click="copySql(op)">
              {{ copiedKey === op.key ? '복사됨 ✓' : '복사' }}
            </button>
          </div>
          <pre class="help__sql">{{ op.sql }}</pre>
          <table v-if="op.conditions && op.conditions.length" class="help__cond">
            <thead><tr><th>조건 / 바인드</th><th>설명</th></tr></thead>
            <tbody>
              <tr v-for="(c, i) in op.conditions" :key="i">
                <td><code>{{ c.name }}</code></td>
                <td>{{ c.effect }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="op.note" class="help__op-note">{{ op.note }}</p>
        </div>
      </section>

      <!-- 업무 주의사항 -->
      <section v-if="help.businessNotes && help.businessNotes.length" class="help__sec">
        <h3 class="help__h">▸ 업무 주의사항</h3>
        <ul class="help__notes">
          <li v-for="(n, i) in help.businessNotes" :key="i">{{ n }}</li>
        </ul>
      </section>

      <!-- 테이블 컬럼 정보 (하단 접이식 — 필요할 때만 펼침) -->
      <section v-if="help.tables && help.tables.length" class="help__sec">
        <h3 class="help__h">▸ 테이블 컬럼 정보 <span class="help__h-sub">(필요할 때만 펼쳐보기)</span></h3>
        <details v-for="t in help.tables" :key="t.name" class="help__tbl">
          <summary class="help__tbl-sum">
            <code class="help__tbl-name">{{ t.name }}</code>
            <span class="help__tbl-label">{{ t.label }}</span>
            <span class="help__tbl-cnt">{{ t.columns.length }} 컬럼</span>
          </summary>
          <table class="help__cols">
            <thead><tr><th>#</th><th>컬럼</th><th>타입</th><th>NULL</th><th>키</th><th>설명</th></tr></thead>
            <tbody>
              <tr v-for="(c, i) in t.columns" :key="c.col">
                <td class="help__cols-num">{{ i + 1 }}</td>
                <td><code>{{ c.col }}</code></td>
                <td class="help__cols-type">{{ c.type }}</td>
                <td class="help__cols-nn">{{ c.nn ? 'NOT NULL' : '' }}</td>
                <td><span v-if="c.key" class="help__cols-key">{{ c.key }}</span></td>
                <td>{{ c.desc }}</td>
              </tr>
            </tbody>
          </table>
        </details>
      </section>
    </div>
    <div v-else class="help__empty">도움말 데이터가 없습니다.</div>
  </InModal>
</template>

<style scoped>
.help { display: flex; flex-direction: column; gap: 20px; }
.help__meta { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.help__table { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
.help__asof { margin-left: 6px; }

.help__sec { display: flex; flex-direction: column; gap: 10px; }
.help__h { margin: 0; font-size: var(--in-font-size-md); font-weight: var(--in-font-weight-medium); color: var(--in-text-accent); }
.help__lead { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); line-height: var(--in-line-height-sm); }

.help__op { border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xs); padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.help__op-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.help__op-label { font-size: var(--in-font-size-md); color: var(--in-text-default); }
.help__copy {
  flex: 0 0 auto; height: 24px; padding: 0 10px; cursor: pointer;
  background: var(--in-bg-white); color: var(--in-text-default);
  border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
}
.help__copy:hover { border-color: var(--in-border-input); color: var(--in-text-accent); }

.help__sql {
  margin: 0; padding: 10px 12px; overflow-x: auto;
  background: var(--in-surface-state-default, #f6f7f9); border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xxs);
  font-family: var(--in-font-family-mono, ui-monospace); font-size: 12px; line-height: 18px; color: var(--in-text-accent);
  white-space: pre; tab-size: 2;
}

.help__cond { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.help__cond th { text-align: left; padding: 4px 8px; background: var(--in-surface-state-default); color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); }
.help__cond td { padding: 4px 8px; border-top: 1px solid var(--in-border-default); vertical-align: top; color: var(--in-text-default); }
.help__cond td:first-child { white-space: nowrap; }
.help__cond code { font-family: var(--in-font-family-mono, ui-monospace); font-size: 11px; color: var(--in-text-accent); }
.help__op-note { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }

.help__notes { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
.help__notes li { font-size: var(--in-font-size-sm); line-height: var(--in-line-height-sm); color: var(--in-text-default); }
.help__empty { color: var(--in-text-subtle); }

/* 테이블 컬럼 정보 (접이식) */
.help__h-sub { font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-regular); color: var(--in-text-subtle); }
.help__tbl { border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xs); margin-bottom: 8px; }
.help__tbl-sum { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; font-size: var(--in-font-size-sm); user-select: none; }
.help__tbl-sum:hover { background: var(--in-surface-state-default); }
.help__tbl-name { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
.help__tbl-label { color: var(--in-text-default); }
.help__tbl-cnt { color: var(--in-text-subtle); margin-left: auto; }
.help__cols { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.help__cols th { text-align: left; padding: 4px 8px; background: var(--in-surface-state-default); color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); }
.help__cols td { padding: 4px 8px; border-top: 1px solid var(--in-border-default); vertical-align: top; color: var(--in-text-default); }
.help__cols code { font-family: var(--in-font-family-mono, ui-monospace); font-size: 11px; color: var(--in-text-accent); }
.help__cols-num { color: var(--in-text-subtle); white-space: nowrap; }
.help__cols-type { color: var(--in-text-subtle); white-space: nowrap; font-family: var(--in-font-family-mono, ui-monospace); font-size: 11px; }
.help__cols-nn { white-space: nowrap; color: var(--in-text-subtle); font-size: 11px; }
.help__cols-key { display: inline-block; padding: 1px 6px; border-radius: var(--in-radius-xxs); background: var(--in-surface-accent-success, #f0f9ff); color: var(--in-text-accent); font-size: 11px; white-space: nowrap; }
</style>
