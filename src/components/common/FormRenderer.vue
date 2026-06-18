<script setup>
/**
 * FormRenderer — 폼 메타(widgets[])를 12컬럼 CSS 그리드로 렌더 + 검색→그리드 배선 (런타임) (★ 2026-06-18, dspark)
 *
 * ⚠️ 원자 ui 아님 — common/. 디자이너가 저장한 메타를 실제 동작 화면으로 그림.
 *   - 레이아웃: 위젯 x/y/w/h → CSS grid 배치(의존성 0).
 *   - 데이터 배선: 검색바 @search → 화면 내 데이터그리드들의 retrieveIn(파라미터 매핑) 바인딩 해석
 *     → InDataTable.retrieve(serviceId/slot/IN) = envelope(/serviceBroker.h5) → 결과 렌더.
 *   바인딩 식 {session.companyCd}/{search.<fieldKey>}/{today} (확장: resolve 네임스페이스 추가).
 *   백엔드 0 변경.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import ControlView from '@/components/designer/ControlView.vue';
import SgSearchBar from './SgSearchBar.vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const props = defineProps({ meta: { type: Object, required: true } });
const auth = useAuthStore();
const toast = useToast();

const cols = computed(() => props.meta.grid?.cols || 12);
const rowH = computed(() => props.meta.grid?.rowHeight || 40);
const widgets = computed(() => props.meta.widgets || []);
const datagrids = computed(() => widgets.value.filter((w) => w.type === 'datagrid'));
function cellStyle(w) { return { gridColumn: `${w.x + 1} / span ${w.w}`, gridRow: `${w.y + 1} / span ${w.h}` }; }

// 검색바 → 그리드 공유 상태 + 그리드 인스턴스
const searchValues = ref({});
const grids = reactive({});               // widget.i → InDataTable ref
function setGrid(w, el) { if (el) grids[w.i] = el; }

// ── 바인딩 식 해석 {namespace.path} ──
function todayYmd() { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; }
function ctx() { return { session: { companyCd: auth.companyCd || '01' }, search: searchValues.value, today: todayYmd() }; }
function resolve(tpl, c) {
  if (typeof tpl !== 'string') return tpl;
  return tpl.replace(/\{([^}]+)\}/g, (_m, p) => { const v = p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), c); return v == null ? '' : String(v); });
}
function resolveObj(o, c) { const r = {}; for (const k in (o || {})) r[k] = resolve(o[k], c); return r; }

// ── 날짜 매퍼(그리드↔envelope) ──
const DATE_EDITOR = { type: 'datePicker', options: { format: 'yyyy-MM-dd' } };
function toGridColumns(cs) { return (cs || []).map((c) => (c.editor === 'date' ? { ...c, editor: DATE_EDITOR } : c)); }
function toYmdDash(v) { if (v == null || v === '') return ''; const s = String(v).trim(); const iso = /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s; const d = dayjs(iso); return d.isValid() ? d.format('YYYY-MM-DD') : s; }
function toYmd8(v) { if (v == null || v === '') return ''; const s = String(v).trim(); if (/^\d{8}$/.test(s)) return s; const d = dayjs(s); return d.isValid() ? d.format('YYYYMMDD') : s; }
function mapRow(row) { const o = { ...row }; Object.keys(o).forEach((k) => { if (/_ymd$/.test(k)) o[k] = toYmdDash(o[k]); }); return o; }
function mapSave(row) { const o = { ...row }; Object.keys(o).forEach((k) => { if (/_ymd$/.test(k)) o[k] = toYmd8(o[k]); }); return o; }

// ── 조회: 그리드 retrieve(파라미터 = retrieveIn 바인딩 해석) ──
async function retrieveGrid(w) {
  const g = grids[w.i]; if (!g || !w.props.retrieveServiceId) return;
  const inObj = resolveObj(w.props.retrieveIn || {}, ctx());
  const inSlot = w.props.retrieveSlot || w.props.slot;   // 조회 조건(IN) 메시지 — 결과(OUT) 슬롯과 다를 수 있음
  try { await g.retrieve(inSlot ? { [inSlot]: [inObj] } : inObj); }
  catch (e) { toast.error?.(`${w.props.title || '조회'} 실패: ${e?.message || e}`); }
}
function onSearch(values) { searchValues.value = values || {}; datagrids.value.forEach(retrieveGrid); }

// 검색값 초기화 — 검색바 필드에서 날짜는 오늘, 그 외 빈값(조회 시 base_ymd 등이 비지 않게).
function initSearch() {
  const sb = widgets.value.find((w) => w.type === 'searchbar');
  const o = {};
  if (sb) for (const f of (sb.props.fields || [])) o[f.key] = f.type === 'date' ? todayYmd() : '';
  searchValues.value = o;
}
onMounted(() => { initSearch(); datagrids.value.forEach((w) => { if (w.props.autoRetrieve) retrieveGrid(w); }); });
</script>

<template>
  <div class="fr" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: `${rowH}px` }">
    <div v-for="w in widgets" :key="w.i" class="fr__cell" :style="cellStyle(w)">
      <!-- 검색바 — @search 가 화면 내 그리드 조회를 구동 -->
      <SgSearchBar
        v-if="w.type === 'searchbar'"
        :fields="w.props.fields || []"
        :model-value="searchValues"
        @update:model-value="searchValues = $event"
        @search="onSearch"
        @reset="onSearch({})"
      />
      <!-- 데이터그리드 — self-managed envelope, retrieve 는 FormRenderer 가 파라미터 넣어 호출 -->
      <InDataTable
        v-else-if="w.type === 'datagrid'"
        :ref="(el) => setGrid(w, el)"
        :columns="toGridColumns(w.props.columns)"
        :height="(w.h * rowH) - 40"
        :options="{ rowHeaders: ['rowNum', 'checkbox'] }"
        :retrieve-service-id="w.props.retrieveServiceId || undefined"
        :save-service-id="w.props.saveServiceId || undefined"
        :slot-name="w.props.slot || undefined"
        :header="{ objectId: w.props.objectId }"
        :row-mapper="mapRow"
        :save-mapper="mapSave"
        show-status
      />
      <!-- 그 외 컨트롤 -->
      <ControlView v-else :widget="w" :design="false" />
    </div>
  </div>
</template>

<style scoped>
.fr { display: grid; gap: 8px; align-content: start; width: 100%; }
.fr__cell { min-width: 0; overflow: hidden; display: flex; }
</style>
