<script setup>
/**
 * ScreenHelpDrawer — 화면별 "실행 SQL + 조건 + 업무 도움말" 우측 드로어 (학습용).
 * ★ (2026-06-09, dspark): admin lane 카탈로그 화면이 실제로 실행하는 SQL(복붙 실행 가능)과
 *   각 조건(필터/바인드) 설명 + 업무 주의사항을 화면에서 직접 학습. CatalogPage [?]도움말 버튼으로 열림.
 *   데이터 = 화면별 사이드카 `<Screen>.help.js` (operations[] / businessNotes[]). InModal type="detail" 래핑.
 *   출처: 신규 (design-system 대응 컴포넌트 없음 — admin lane 전용). Figma 노드 ID = TBD.
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
</style>
