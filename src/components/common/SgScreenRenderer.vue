<script setup>
/**
 * SgScreenRenderer — 화면 레이아웃 메타(JSON)를 읽어 화면을 동적 렌더 (★ 2026-06-18, dspark)
 *
 * ⚠️ 원자 ui 아님 — components/common/. 메타 스키마: 04-admin-lane/dev-tools/08_screen-designer.md §2.
 *   SgSearchBar(검색) + 레이아웃 컨테이너(single|rows|cols) + SgGridSection×N(패널) 를 메타로 조립.
 *   백엔드 0 변경 — 각 패널은 보존 envelope(InDataTable self-managed)로 조회/저장.
 *
 * 확장점: LAYOUTS(레이아웃 추가) · resolveBindings(네임스페이스 추가) · 패널 kind(추후 form/chart).
 * v1: search(server 파라미터 + client 그리드필터) · 패널 N · 표준 툴바 · 단순 마스터-디테일(rowClick 링크).
 *
 * 사용: <SgScreenRenderer :meta="meta" />   // 메타 변경 시 부모가 :key 로 remount 권장
 */
import { ref, reactive, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import SgSearchBar from './SgSearchBar.vue';
import SgGridSection from './SgGridSection.vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const props = defineProps({ meta: { type: Object, required: true } });
const auth = useAuthStore();
const toast = useToast();

// 레이아웃 레지스트리 (확장: 항목 추가만) — direction = 패널 배치 축
const LAYOUTS = {
  single: { dir: 'col' }, rows: { dir: 'col' }, cols: { dir: 'row' },
};
const layoutDir = computed(() => (LAYOUTS[props.meta.layout]?.dir) || 'col');

const panels = computed(() => props.meta.panels || []);
const rootPanels = computed(() => panels.value.filter((p) => !p.link));
const rootPanelId = computed(() => rootPanels.value[0]?.id);

// ── 상태 ──
function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
function initSearch() {
  const o = {};
  for (const f of (props.meta.search?.fields || [])) o[f.key] = f.type === 'date' ? todayYmd() : '';
  return o;
}
const search = ref(initSearch());
const applied = ref({});                 // 확정 클라이언트 필터값 { fieldKey: value }
const gridRefs = reactive({});           // panelId → InDataTable ref
const selectedRows = reactive({});       // panelId → 선택 행(부모용)
const rowsByPanel = reactive({});        // panelId → 조회 행(건수)
function setRef(id, el) { if (el) gridRefs[id] = el; }

const clientFields = computed(() => (props.meta.search?.fields || []).filter((f) => f.role === 'client' && f.filter));
const hasClientFilter = computed(() => clientFields.value.some((f) => applied.value[f.key]));

// ── 바인딩 식 {namespace.path} 해석 (확장: 네임스페이스 추가) ──
function baseCtx(extra) {
  return { session: { companyCd: auth.companyCd || '01' }, search: search.value, today: todayYmd(), ...extra };
}
function resolve(tpl, ctx) {
  if (typeof tpl !== 'string') return tpl;
  return tpl.replace(/\{([^}]+)\}/g, (_m, path) => {
    const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
    return v == null ? '' : String(v);
  });
}
function resolveObj(obj, ctx) {
  const out = {};
  for (const k in (obj || {})) out[k] = resolve(obj[k], ctx);
  return out;
}

// ── 날짜/컬럼 정규화 ──
const DATE_EDITOR = { type: 'datePicker', options: { format: 'yyyy-MM-dd' } };
function toGridColumns(cols) {
  return (cols || []).map((c) => (c.editor === 'date' ? { ...c, editor: DATE_EDITOR } : c));
}
function toYmdDash(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  const iso = /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
  const d = dayjs(iso); return d.isValid() ? d.format('YYYY-MM-DD') : s;
}
function toYmd8(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim(); if (/^\d{8}$/.test(s)) return s;
  const d = dayjs(s); return d.isValid() ? d.format('YYYYMMDD') : s;
}
function mapRow(row) { const o = { ...row }; Object.keys(o).forEach((k) => { if (/_ymd$/.test(k)) o[k] = toYmdDash(o[k]); }); return o; }
function mapSave(row) { const o = { ...row }; Object.keys(o).forEach((k) => { if (/_ymd$/.test(k)) o[k] = toYmd8(o[k]); }); return o; }

// ── 건수 ──
function matchClient(r) {
  return clientFields.value.every((f) => {
    const v = applied.value[f.key]; if (!v) return true;
    const cell = String(r[f.filter.col] ?? '');
    return f.filter.op === 'eq' ? cell === String(v) : cell.toLowerCase().includes(String(v).toLowerCase());
  });
}
function countFor(p) {
  const rows = rowsByPanel[p.id] || [];
  if (p.id === rootPanelId.value && hasClientFilter.value) return rows.filter(matchClient).length;
  return rows.length;
}
function subFor(p) {
  if (p.id === rootPanelId.value && hasClientFilter.value) return `/ 전체 ${(rowsByPanel[p.id] || []).length.toLocaleString()}`;
  return '';
}
function subtitleFor(p) {
  if (!p.link) return '';
  const row = selectedRows[p.link.parent];
  return row ? `— ${resolve(p.link.label || '선택됨', baseCtx({ parent: { row } }))}` : '— 상위를 선택하세요';
}
function isDisabled(p) { return !!p.link && !selectedRows[p.link.parent]; }

// ── 클라이언트 필터 → tui-grid 네이티브 filter() (행 숨김, dirty 보존) ──
function applyClientFilters() {
  const rp = rootPanelId.value; const g = gridRefs[rp]?.getInstance?.(); if (!g) return;
  for (const f of clientFields.value) {
    const v = applied.value[f.key];
    if (v === '' || v == null) g.unfilter?.(f.filter.col);
    else g.filter?.(f.filter.col, [{ code: f.filter.op === 'eq' ? 'eq' : 'contain', value: v }]);
  }
}

// ── 패널 조회 ──
async function retrievePanel(p, ctx) {
  const ref = gridRefs[p.id]; if (!ref || !p.retrieve?.serviceId) return [];   // 미완성 메타(서비스ID 없음) 안전 스킵
  const inObj = resolveObj({ ...(p.link?.in || {}), ...(p.retrieve?.in || {}) }, ctx);
  const slot = p.retrieve?.slot;
  const rows = await ref.retrieve(slot ? { [slot]: [inObj] } : inObj);
  rowsByPanel[p.id] = Array.isArray(rows) ? rows : [];
  return rowsByPanel[p.id];
}

// ── 검색 ──
async function onSearch(values) {
  search.value = { ...search.value, ...values };
  const a = {}; for (const f of clientFields.value) a[f.key] = (String(values[f.key] ?? '').trim()); applied.value = a;
  // 루트 패널 조회 + 클라 필터, 링크 패널 초기화
  for (const p of rootPanels.value) {
    try { await retrievePanel(p, baseCtx()); } catch (e) { toast.error?.(`${p.title} 조회 실패: ${e?.message || e}`); }
  }
  for (const p of panels.value) {
    if (p.link) { gridRefs[p.id]?.clearRows?.(); rowsByPanel[p.id] = []; }
    if (rootPanels.value.includes(p)) { /* root */ }
  }
  for (const k in selectedRows) delete selectedRows[k];
  applyClientFilters();
}
function onReset() {
  search.value = initSearch(); applied.value = {};
  onSearch(search.value);
}

// ── 행 클릭 → 자식(링크) 패널 조회 ──
async function onPanelClick(p, e) {
  const g = gridRefs[p.id]?.getInstance?.(); if (!g || e?.rowKey == null) return;
  const row = g.getRow(e.rowKey) || {};
  selectedRows[p.id] = row;
  const children = panels.value.filter((c) => c.link?.parent === p.id);
  for (const c of children) {
    try { await retrievePanel(c, baseCtx({ parent: { row } })); }
    catch (err) { toast.error?.(`${c.title} 조회 실패: ${err?.message || err}`); }
  }
}

// ── 툴바 ──
function onAdd(p) {
  if (isDisabled(p)) { toast.info?.('상위를 먼저 선택하세요'); return; }
  const ctx = baseCtx(p.link ? { parent: { row: selectedRows[p.link.parent] } } : undefined);
  gridRefs[p.id]?.addRow?.(resolveObj({ ...(p.newRow || {}), ...(p.link?.fk || {}) }, ctx));
}
function onDelete(p) { if (!gridRefs[p.id]?.markDeleteChecked?.().length) toast.info?.('선택된 행이 없습니다'); }
function onRestore(p) { gridRefs[p.id]?.restoreChecked?.(); }
async function onSave(p) {
  if (isDisabled(p)) { toast.info?.('상위를 먼저 선택하세요'); return; }
  try {
    const r = await gridRefs[p.id]?.save?.();
    if (r?.skipped) toast.info?.('변경분 0건'); else toast.success?.(`저장 ${r?.dirty?.length ?? 0}건`);
  } catch (e) { toast.error?.(`저장 실패: ${e?.message || e}`); }
}
function hasToolbar(p) { return !!(p.toolbar && p.toolbar.length); }

onMounted(() => onSearch(search.value));
</script>

<template>
  <div class="ssr">
    <SgSearchBar
      v-if="meta.search?.fields?.length"
      :fields="meta.search.fields"
      v-model="search"
      @search="onSearch"
      @reset="onReset"
    />

    <div class="ssr__panels" :class="`ssr__panels--${layoutDir}`">
      <div v-for="p in panels" :key="p.id" class="ssr__panel">
        <SgGridSection
          :title="p.title"
          :count="countFor(p)"
          :sub="subFor(p)"
          :subtitle="subtitleFor(p)"
          :subtitle-muted="isDisabled(p)"
          :toolbar="hasToolbar(p)"
          :disabled="isDisabled(p)"
          @add="onAdd(p)"
          @delete="onDelete(p)"
          @restore="onRestore(p)"
          @save="onSave(p)"
        >
          <InDataTable
            :ref="(el) => setRef(p.id, el)"
            :columns="toGridColumns(p.columns)"
            :height="p.height || 400"
            :options="{ rowHeaders: ['rowNum', 'checkbox'], bodyHeight: p.bodyHeight || (p.height || 400) - 60 }"
            :retrieve-service-id="p.retrieve?.serviceId"
            :save-service-id="p.save?.serviceId"
            :slot-name="p.retrieve?.slot"
            :header="{ objectId: p.objectId }"
            :row-mapper="mapRow"
            :save-mapper="mapSave"
            show-status
            @click="onPanelClick(p, $event)"
          />
        </SgGridSection>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ssr { display: flex; flex-direction: column; gap: 12px; }
.ssr__panels { display: flex; gap: 12px; }
.ssr__panels--col { flex-direction: column; }
.ssr__panels--row { flex-direction: row; align-items: flex-start; }
.ssr__panels--row > .ssr__panel { flex: 1 1 0; min-width: 0; }
.ssr__panel { display: flex; flex-direction: column; }
</style>
