<script setup>
/**
 * SearchPickerModal — 검색 + 결과선택 공통 모달. AS-IS 검색팝업(EmpSearchButton·AUT0920 등) 대체.
 * ★ (2026-06-11, dspark): OrgAuth 사원 picker + Menu 오브젝트 picker 중복 추출(config 기반).
 *   호출측은 title/placeholder/columns/fetcher 만 주입. 선택 시 @select(row) emit (dedup·세팅은 호출측).
 *
 * props:
 *   - open       : v-model:open (boolean) 표시 여부
 *   - title      : 모달 제목 (예: '사원 검색')
 *   - placeholder: 검색 입력 placeholder
 *   - columns    : [{ key, label, width? }] 결과 테이블 컬럼
 *   - fetcher    : async (q) => rows[]  — 호출측이 정규화(예: meta.objects.list 는 .content 추출)
 *   - rowKey     : 결과 행 :key 컬럼명 (없으면 index)
 *   - minChars   : 검색 최소 글자(기본 1)
 * emits: update:open / select(row)
 * Figma 노드 ID = TBD.
 */
import { ref, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import InButton from '@/components/ui/InButton.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '검색' },
  placeholder: { type: String, default: '검색어' },
  columns: { type: Array, required: true },
  fetcher: { type: Function, required: true },
  rowKey: { type: String, default: '' },
  minChars: { type: Number, default: 1 },
});
const emit = defineEmits(['update:open', 'select']);

const toast = useToast();
const query = ref('');
const results = ref([]);
const loading = ref(false);

// 열릴 때마다 초기화
watch(() => props.open, (v) => { if (v) { query.value = ''; results.value = []; } });

async function run() {
  if (query.value.trim().length < props.minChars) return;
  loading.value = true;
  try { results.value = (await props.fetcher(query.value.trim())) || []; }
  catch (e) { toast.error('검색 실패: ' + (e?.response?.data?.error?.message || e?.message || e)); }
  finally { loading.value = false; }
}

function close() { emit('update:open', false); }
// 선택 = emit 만 (닫기는 호출측이 제어 — 중복 등 예외 시 열어둘 수 있게).
function pick(row) { emit('select', row); }
function keyOf(row, i) { return props.rowKey && row[props.rowKey] != null ? row[props.rowKey] : i; }
</script>

<template>
  <!-- ★ (2026-06-15, dspark): body 로 Teleport — 드로어(MetaDetailEditor) 등 상위 stacking context 에 갇혀 뒤에 깔리는 문제 해결. -->
  <Teleport to="body">
  <div v-if="open" class="spm__mask" @click.self="close">
    <div class="spm__modal">
      <div class="spm__head">
        <span>{{ title }}</span>
        <button type="button" class="spm__x" @click="close">✕</button>
      </div>
      <div class="spm__search">
        <input v-model="query" type="text" class="spm__input" :placeholder="placeholder" @keyup.enter="run" />
        <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="loading" @click="run">검색</InButton>
      </div>
      <div class="spm__results">
        <table class="spm__table">
          <thead>
            <tr>
              <th v-for="c in columns" :key="c.key" :style="c.width ? { width: c.width + 'px' } : null">{{ c.label }}</th>
              <th class="spm__pick-col" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in results" :key="keyOf(row, i)">
              <td v-for="c in columns" :key="c.key">{{ row[c.key] }}</td>
              <td><button type="button" class="spm__pick" @click="pick(row)">선택</button></td>
            </tr>
            <tr v-if="!results.length">
              <td :colspan="columns.length + 1" class="spm__empty">검색 결과 없음 (검색어 입력 후 [검색])</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
.spm__mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 10050; }
.spm__modal { width: 560px; max-width: 92vw; background: var(--in-bg-white); border-radius: var(--in-radius-md); box-shadow: 0 12px 40px rgba(0,0,0,.2); overflow: hidden; }
.spm__head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--in-border-default); font-weight: var(--in-font-weight-bold); }
.spm__x { border: none; background: transparent; cursor: pointer; font-size: 16px; color: var(--in-text-subtle); }
.spm__search { display: flex; gap: 8px; padding: 12px 16px; }
.spm__input { flex: 1; padding: 6px 10px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.spm__results { max-height: 360px; overflow: auto; padding: 0 16px 16px; }
.spm__table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.spm__table th, .spm__table td { border-bottom: 1px solid var(--in-border-default); padding: 6px 8px; text-align: left; }
.spm__table th { color: var(--in-text-subtle); }
.spm__pick-col { width: 56px; }
.spm__pick { border: 1px solid var(--in-border-default); background: var(--in-bg-white); border-radius: var(--in-radius-xs); padding: 3px 10px; cursor: pointer; font-size: var(--in-font-size-sm); }
.spm__pick:hover { background: var(--in-bg-brand-subtle, var(--in-bg-default)); }
.spm__empty { text-align: center; color: var(--in-text-subtle); padding: 16px; }
</style>
