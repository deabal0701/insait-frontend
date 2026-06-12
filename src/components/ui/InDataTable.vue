<script setup>
// ★ (2026-05-28, dspark): tui-grid Vue wrapper (얇은 layer). IBSheet 명칭 모사 X.
//   tui-grid native API 그대로 노출 — expose: getInstance() 로 사용자가 직접 호출.
// ★ (2026-05-29, dspark): design-system v2 의 동명 컴포넌트와 의도된 분기 — v2 는
//   InTableTop/Bottom 합성 패턴 (Top/Bottom UI 가 props 로 강결합). 운영본은
//   "tui-grid + 호출 측 자유 구성" 을 선호하여 wrapper 만 제공 (Top/Bottom 은
//   호출 측 페이지가 직접 배치). 따라서 1:1 사본 정책의 예외로 유지.
//   책임:
//     1) props 통일 (columns / data / options / rowKey / height / loading)
//     2) lifecycle (mount / destroy)
//     3) Vue reactivity 통합 (watch(data) → resetData, watch(columns) → setColumns)
//     4) Figma theme 자동 적용 (loadGrid plugin)
//     5) raw grid event → emit forwarding (네이티브 명칭 kebab-case 변환)
//   columns 의 `format` 키는 utils/grid.js 의 formatRegistry 로 자동 변환.
//   dirty row 추출은 extractDirtyForEnvelope(grid.getModifiedRows()) 사용.
// ★ (2026-06-02, dspark): [옵션 1 — 단일 창구 통합] AS-IS IBSheet 의 "sheet 객체 하나에
//   조회·저장·엑셀·dirty 가 전부 매달리던" 사용감을 복원한다. 기존 useEntityGrid composable
//   (조회→sStatus 저장→재조회 흐름) 을 본 컴포넌트 내부로 흡수 — 화면은 InDataTable 하나만
//   import 하면 된다 (useEntityGrid/useGrid/plugins/utils 직접 import 불필요).
//     · 서비스 props (retrieveServiceId/saveServiceId/slotName/header) 를 주면 self-managed 모드:
//       gridRef.retrieve() / gridRef.save() 만 호출 (envelope 조립·POST·재조회 내부 처리).
//     · 서비스 props 없이 :data 만 주면 controlled 모드 (부모가 데이터 소유 — 기존 동작).
//   내부 구현은 여전히 useEntityGrid 를 재사용(DRY) — 단 개발자 시야에서는 숨는다.
import { ref, shallowRef, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { loadGrid, reapplyTheme } from '@/plugins/tui-grid';
import { resolveColumnFormats, extractDirtyForEnvelope } from '@/utils/grid';
import { useEntityGrid } from '@/composables/useEntityGrid';
import { useThemeStore } from '@/stores/theme';

const props = defineProps({
  columns: { type: Array, required: true },
  data: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) },
  rowKey: { type: String, default: undefined },         // → keyColumnName
  height: { type: [Number, String], default: 400 },     // wrapper outer height
  bodyHeight: { type: [Number, String], default: undefined },
  loading: { type: Boolean, default: false },
  // ★ (2026-06-01, dspark): #1 우클릭 컨텍스트 메뉴 항목 [{key,label,disabled,divider}]. 비우면 비활성.
  contextMenuItems: { type: Array, default: () => [] },
  // ★ (2026-06-02, dspark): [옵션 1] self-managed 모드 — 서비스 props. 주면 조회·저장을
  //   InDataTable 이 내부 처리(useEntityGrid 흡수). :data 와는 배타적(서비스 props 우선).
  retrieveServiceId: { type: String, default: undefined },   // 조회 serviceId (예: 'ORM9999_01_R01')
  saveServiceId: { type: String, default: undefined },       // 저장 serviceId (예: 'INT_Y19_0001_01_S01')
  slotName: { type: String, default: undefined },            // BODY 메시지 슬롯명 (조회·저장 공통)
  retrieveSlot: { type: String, default: undefined },        // 조회 응답 슬롯 (slotName 과 다를 때)
  saveSlot: { type: String, default: undefined },            // 저장 요청 슬롯 (slotName 과 다를 때)
  header: { type: Object, default: () => ({}) },             // HEADER 옵션 ({ objectId, actionType, ... })
  statusKey: { type: String, default: 'sStatus' },           // 상태 컬럼명 (백엔드 계약)
  softDelete: { type: Boolean, default: false },             // 삭제를 sStatus='U' + sDelete='Y' 로 송신
  reloadAfterSave: { type: Boolean, default: true },         // 저장 성공 후 자동 재조회
  autoRetrieve: { type: Boolean, default: false },           // 마운트 직후 자동 조회 (retrieveServiceId 필요)
});

const emit = defineEmits([
  // grid raw events — tui-grid 명칭 kebab-case 변환
  'click', 'dblclick',
  'check', 'uncheck', 'check-all', 'uncheck-all',
  'before-change', 'after-change',
  'editing-start', 'editing-finish',
  'selection-change', 'sort', 'filter', 'scroll-end',
  // wrapper events
  'instance-ready', 'context-action',
]);

const gridRef = ref(null);
const instance = shallowRef(null);
const themeStore = useThemeStore();

// ★ (2026-06-07, dspark): self-managed(서비스 props) vs controlled(:data) 모드 판별.
//   두 데이터 소스(entity.rows / props.data)가 서로 resetData 로 덮어쓰지 않도록 배타 가드에 사용.
const selfManaged = computed(() => !!props.retrieveServiceId);

// ★ (2026-06-02, dspark): [옵션 1] 조회·저장 흐름 내부 흡수. useEntityGrid 를 그대로
//   재사용하되 grid 인스턴스를 본 컴포넌트 내부에서 공급(getInstance 게터)한다. 따라서
//   화면은 useEntityGrid 를 직접 import 하지 않는다 — IBSheet sheet 객체처럼 InDataTable
//   ref 하나에 retrieve/save 가 매달린다. (useEntityGrid 는 internal 부품으로 격하)
const entity = useEntityGrid({
  retrieveServiceId: props.retrieveServiceId,
  saveServiceId: props.saveServiceId,
  slot: props.slotName,
  retrieveSlot: props.retrieveSlot,
  saveSlot: props.saveSlot,
  gridRef: { getInstance: () => instance.value },   // 호출 시점에 살아있는 인스턴스 해석
  statusKey: props.statusKey,
  softDelete: props.softDelete,
  reloadAfterSave: props.reloadAfterSave,
  header: props.header,
});

// self-managed 조회/재조회 결과(entity.rows)를 그리드에 반영. controlled 모드(:data)는
// 아래 watch(() => props.data) 가 담당.
// ★ (2026-06-07, dspark): selfManaged 일 때만 entity.rows → resetData (이중 바인딩 경합 차단).
watch(entity.rows, (r) => {
  if (instance.value && selfManaged.value) instance.value.resetData(r || []);
});

const GRID_EVENT_MAP = [
  ['click', 'click'],
  ['dblclick', 'dblclick'],
  ['check', 'check'],
  ['uncheck', 'uncheck'],
  ['checkAll', 'check-all'],
  ['uncheckAll', 'uncheck-all'],
  ['beforeChange', 'before-change'],
  ['afterChange', 'after-change'],
  ['editingStart', 'editing-start'],
  ['editingFinish', 'editing-finish'],
  ['selection', 'selection-change'],
  ['sort', 'sort'],
  ['filter', 'filter'],
  ['scrollEnd', 'scroll-end'],
];

const resolvedColumns = computed(() => resolveColumnFormats(props.columns));

// ★ (2026-06-07, dspark): build 재진입 락. 기존엔 instance 가드가 await loadGrid() '이전'에만
//   검사돼, 동시 rebuild(options/rowKey/bodyHeight/theme watch 가 겹칠 때) 두 개의 Grid 가
//   같은 DOM 에 생성되고 첫 인스턴스가 destroy 안 돼 누수+이벤트 중복됐음. 진행 중 build 약속을
//   공유하고 await 후 instance 를 재확인해 단일 생성 보장.
let buildLock = null;
async function build() {
  if (!gridRef.value || instance.value) return;
  if (buildLock) return buildLock;
  buildLock = (async () => {
    const Grid = await loadGrid();
    if (!gridRef.value || instance.value) return;   // await 후 재확인 (그 사이 unmount/생성 가능)
    const opts = {
      el: gridRef.value,
      columns: resolvedColumns.value,
      data: selfManaged.value ? (entity.rows.value || []) : props.data,
      ...(props.bodyHeight != null ? { bodyHeight: props.bodyHeight } : {}),
      ...(props.rowKey ? { keyColumnName: props.rowKey } : {}),
      ...props.options,
    };
    instance.value = new Grid(opts);
    GRID_EVENT_MAP.forEach(([gridName, emitName]) => {
      try {
        instance.value.on(gridName, (ev) => emit(emitName, ev));
      } catch (_) { /* 일부 이벤트는 버전별 미지원 — 무시 */ }
    });
    emit('instance-ready', instance.value);
  })();
  try { await buildLock; } finally { buildLock = null; }
}

// ★ (2026-06-07, dspark): controlled(:data) 모드에서만 props.data → resetData.
//   selfManaged 면 entity.rows watch 가 소유 (이중 바인딩 경합 차단).
watch(() => props.data, (next) => {
  if (!instance.value || selfManaged.value) return;
  instance.value.resetData(next || []);
});

watch(resolvedColumns, (next) => {
  if (!instance.value) return;
  if (typeof instance.value.setColumns === 'function') {
    instance.value.setColumns(next);
  }
});

function destroyGrid() {
  try { instance.value?.destroy?.(); } catch (_) { /* noop */ }
  instance.value = null;
}

// ★ (2026-06-01, dspark): #2 options 반응성. 마운트 시 1회만 spread 되던 props.options
//   (frozenCount/summary/pageOptions 등)를 변경하면 재생성(destroy+build)으로 반영.
//   생성자 옵션 다수는 runtime setter 가 없어 rebuild 가 가장 안전.
async function rebuild() {
  destroyGrid();
  await build();
}

watch(() => props.options, () => { if (instance.value) rebuild(); }, { deep: true });
watch(() => props.rowKey, () => { if (instance.value) rebuild(); });
watch(() => props.bodyHeight, (v) => {
  if (!instance.value) return;
  if (typeof v === 'number' && typeof instance.value.setBodyHeight === 'function') instance.value.setBodyHeight(v);
  else rebuild();
});

// ★ (2026-06-01, dspark): #4 green 테마 추종. 토글 시 현재 토큰으로 theme 재적용 후
//   마운트된 그리드를 rebuild 해 brand 색(focus/selection/current-row)을 즉시 반영.
watch(() => themeStore.theme, async () => {
  await reapplyTheme();
  if (instance.value) await rebuild();
});

// ★ (2026-06-02, dspark): [옵션 1] 마운트 후 autoRetrieve 옵션이면 즉시 1회 조회.
onMounted(async () => {
  await build();
  if (props.autoRetrieve && props.retrieveServiceId) {
    try { await entity.retrieve({}); } catch (_) { /* 조회 실패는 entity.error 로 노출 */ }
  }
});
onBeforeUnmount(destroyGrid);

// ★ (2026-06-02, dspark): 스피너는 수동 loading prop + 내부 조회/저장 통신 상태를 합산.
const showLoading = computed(() => props.loading || entity.loading.value);

function getInstance() {
  return instance.value;
}

// ★ (2026-06-01, dspark): #3 편의 메서드·이벤트 표준화. getInstance() 보일러플레이트 제거 +
//   IBSheet 동작 패리티. 모든 tui-grid native API 는 여전히 getInstance() 로 접근 가능.

/** IBSheet 동작: 행 추가 시 선택(focus)한 행 바로 다음에 삽입. at 미지정 + focus 없으면 맨 끝. */
function addRow(row = {}, opts = {}) {
  const g = instance.value;
  if (!g) return;
  let at = opts.at;
  if (at == null && typeof g.getFocusedCell === 'function' && typeof g.getIndexOfRow === 'function') {
    const focused = g.getFocusedCell();
    // ★ (2026-06-07, dspark): getIndexOfRow 가 -1(행 못 찾음) 이면 at=0 으로 맨 위 삽입되던 버그 →
    //   유효 인덱스일 때만 다음 위치 지정, 아니면 맨 끝(append).
    if (focused && focused.rowKey != null) {
      const fi = g.getIndexOfRow(focused.rowKey);
      if (fi >= 0) at = fi + 1;
    }
  }
  g.appendRow(row, { at, focus: opts.focus !== false });
}

/** 체크된 행 일괄 삭제 (서버 row 는 deletedRows 로, 신규 row 는 즉시 제거). 삭제된 행 반환. */
function removeCheckedRows() {
  const g = instance.value;
  if (!g) return [];
  const checked = g.getCheckedRows?.() || [];
  checked.forEach((r) => g.removeRow?.(r.rowKey));
  return checked;
}

function getCheckedRows() { return instance.value?.getCheckedRows?.() || []; }

function getModified() {
  return instance.value?.getModifiedRows?.() || { createdRows: [], updatedRows: [], deletedRows: [] };
}

/** 편집 강제 커밋 후 dirty 추출 (sStatus/_seq). useEntityGrid 미사용 화면용 단축. */
function getDirty(options = {}) {
  const g = instance.value;
  if (!g) return [];
  try { g.finishEditing?.(); } catch (_) { /* 편집 중 아님 */ }
  return extractDirtyForEnvelope(g.getModifiedRows?.() || {}, options);
}

function clearModified() { instance.value?.clearModifiedData?.(); }
function focusCell(rowKey, columnName) { instance.value?.focus?.(rowKey, columnName, true); }

/** 14종 표준 emit 외 임의 tui-grid 이벤트 구독 (예: columnResize, onGridMounted). */
function on(eventName, handler) { instance.value?.on?.(eventName, handler); }
function off(eventName, handler) { instance.value?.off?.(eventName, handler); }

// ★ (2026-06-01, dspark): #1 결손기능 — Excel 다운/업(exceljs 동적 import) + 인쇄.
async function exportExcel(opts = {}) {
  const g = instance.value;
  if (!g) return;
  const { exportGridToExcel } = await import('@/utils/grid-excel');
  await exportGridToExcel(g, opts);
}

/** .xlsx File → rows. opts.append=true 면 기존에 추가, 아니면 resetData. 파싱 rows 반환. */
async function importExcel(file, opts = {}) {
  const g = instance.value;
  if (!g || !file) return [];
  const { importExcelToRows } = await import('@/utils/grid-excel');
  const rows = await importExcelToRows(file, { columns: props.columns, ...opts });
  if (opts.append) rows.forEach((r) => g.appendRow(r));
  else g.resetData(rows);
  return rows;
}

/** 현재 그리드 데이터를 인쇄용 HTML 표로 새 창에 출력 (IBSheet 인쇄 대체). */
function printGrid(opts = {}) {
  const g = instance.value;
  if (!g) return;
  const cols = (g.getColumns?.() || []).filter((c) => c && c.name && c.name !== '_number' && c.name !== '_checked');
  const data = g.getData?.() || [];
  const esc = (v) => String(v ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  // ★ (2026-06-12, dspark): 아래 hex 는 의도적 — window.open 새 문서에는 앱 :root 의 --in-* 토큰이
  //   존재하지 않아 var() 해석 불가. 인쇄 전용 standalone HTML 이므로 토큰화 대상 아님.
  const html =
    `<html><head><title>${esc(opts.title || '인쇄')}</title><style>` +
    'table{border-collapse:collapse;width:100%;font-family:Pretendard,sans-serif;font-size:12px}' +
    'th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f3f3f3}' +
    '</style></head><body>' +
    (opts.title ? `<h3>${esc(opts.title)}</h3>` : '') +
    '<table><thead><tr>' + cols.map((c) => `<th>${esc(c.header || c.name)}</th>`).join('') + '</tr></thead><tbody>' +
    data.map((r) => '<tr>' + cols.map((c) => `<td>${esc(r[c.name])}</td>`).join('') + '</tr>').join('') +
    '</tbody></table></body></html>';
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

// 우클릭 컨텍스트 메뉴
const ctxMenu = ref({ open: false, x: 0, y: 0, rowKey: null, columnName: null });
function onContextMenu(e) {
  if (!props.contextMenuItems.length) return;
  e.preventDefault();
  const td = e.target.closest?.('td[data-row-key]');
  ctxMenu.value = {
    open: true, x: e.clientX, y: e.clientY,
    rowKey: td ? Number(td.getAttribute('data-row-key')) : null,
    columnName: td ? td.getAttribute('data-column-name') : null,
  };
}
function closeCtx() { ctxMenu.value.open = false; }
function onCtxSelect(item) {
  if (item.disabled) return;
  emit('context-action', { key: item.key, rowKey: ctxMenu.value.rowKey, columnName: ctxMenu.value.columnName, item });
  closeCtx();
}

defineExpose({
  getInstance, rebuild,
  addRow, removeCheckedRows, getCheckedRows,
  getModified, getDirty, clearModified, focusCell,
  on, off,
  exportExcel, importExcel, printGrid,
  // ★ (2026-06-02, dspark): [옵션 1] 조회·저장 단일 창구. self-managed 모드 진입점.
  //   retrieve(body, options) / save(opts) — envelope 조립·POST·재조회 내부 처리.
  //   rows(조회 결과) · dirtyCount(직전 변경 건수) · loading · error 도 노출.
  retrieve: entity.retrieve,
  save: entity.save,
  collectDirty: entity.collectDirty,
  rows: entity.rows,
  dirtyCount: entity.dirtyCount,
  loading: entity.loading,
  error: entity.error,
});
</script>

<template>
  <div
    class="in-dt"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
  >
    <div v-show="showLoading" class="in-dt__loading" aria-live="polite">
      <div class="in-dt__spinner" aria-label="loading"></div>
    </div>
    <div ref="gridRef" class="in-dt__grid" @contextmenu="onContextMenu"></div>

    <!-- ★ (2026-06-01, dspark): #1 우클릭 컨텍스트 메뉴 -->
    <Teleport to="body">
      <div
        v-if="ctxMenu.open && contextMenuItems.length"
        class="in-dt__ctx-backdrop"
        @click="closeCtx"
        @contextmenu.prevent="closeCtx"
      >
        <ul class="in-dt__ctx" :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }" @click.stop>
          <template v-for="(it, i) in contextMenuItems">
            <li v-if="it.divider" :key="`d${i}`" class="in-dt__ctx-divider" role="separator"></li>
            <li
              v-else
              :key="it.key || i"
              class="in-dt__ctx-item"
              :class="{ 'is-disabled': it.disabled }"
              @click="onCtxSelect(it)"
            >{{ it.label }}</li>
          </template>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.in-dt {
  position: relative;
  width: 100%;
  font-family: var(--in-font-family-body);
}
.in-dt__grid {
  width: 100%;
  height: 100%;
}
.in-dt__loading {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--in-bg-white, #fff) 70%, transparent);
}
.in-dt__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--in-border-input-default, #d6d6d6);
  border-top-color: var(--in-brand, #13a9e9);
  border-radius: 50%;
  animation: in-dt-spin 0.8s linear infinite;
}
@keyframes in-dt-spin {
  to { transform: rotate(360deg); }
}

/* 우클릭 컨텍스트 메뉴 (Teleport to body — scoped attr 자동 적용) */
.in-dt__ctx-backdrop {
  position: fixed;
  inset: 0;
  /* ★ (2026-06-07, dspark): raw 9000(매직넘버 + --in-z-toast 9000 과 동률 충돌) → popover 토큰(1100).
   *   컨텍스트 메뉴는 드롭다운/popover 계층이 적절. 토스트(9000)가 항상 위 → 메뉴 열린 채 토스트가 떠도
   *   투명 backdrop(inset:0) 이 토스트 클릭을 가로채지 않음. (모듈화 점검 206e17e 누락분 보완) */
  z-index: var(--in-z-popover);
}
.in-dt__ctx {
  position: fixed;
  min-width: 140px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--in-bg-white, #fff);
  border: 1px solid var(--in-border-default, #e2e2e2);
  border-radius: var(--in-radius-xs, 6px);
  box-shadow: 0 4px 12px rgb(0 0 0 / 12%);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm, 13px);
}
.in-dt__ctx-item {
  padding: 7px 14px;
  color: var(--in-text-default, #565656);
  cursor: pointer;
  white-space: nowrap;
}
.in-dt__ctx-item:hover {
  background: var(--in-surface-accent-brand, #f5fbff);
  color: var(--in-brand, #13a9e9);
}
.in-dt__ctx-item.is-disabled {
  color: var(--in-text-state-disabled, #b0b0b0);
  cursor: not-allowed;
}
.in-dt__ctx-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--in-border-default, #e2e2e2);
}
</style>
