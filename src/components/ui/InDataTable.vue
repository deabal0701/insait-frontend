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
import { ref, shallowRef, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { loadGrid, reapplyTheme } from '@/plugins/tui-grid';
import { resolveColumnFormats, extractDirtyForEnvelope } from '@/utils/grid';
import { useThemeStore } from '@/stores/theme';

const props = defineProps({
  columns: { type: Array, required: true },
  data: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) },
  rowKey: { type: String, default: undefined },         // → keyColumnName
  height: { type: [Number, String], default: 400 },     // wrapper outer height
  bodyHeight: { type: [Number, String], default: undefined },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits([
  // grid raw events — tui-grid 명칭 kebab-case 변환
  'click', 'dblclick',
  'check', 'uncheck', 'check-all', 'uncheck-all',
  'before-change', 'after-change',
  'editing-start', 'editing-finish',
  'selection-change', 'sort', 'filter', 'scroll-end',
  // wrapper events
  'instance-ready',
]);

const gridRef = ref(null);
const instance = shallowRef(null);
const themeStore = useThemeStore();

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

async function build() {
  if (!gridRef.value || instance.value) return;
  const Grid = await loadGrid();
  const opts = {
    el: gridRef.value,
    columns: resolvedColumns.value,
    data: props.data,
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
}

watch(() => props.data, (next) => {
  if (!instance.value) return;
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

onMounted(build);
onBeforeUnmount(destroyGrid);

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
    if (focused && focused.rowKey != null) at = g.getIndexOfRow(focused.rowKey) + 1;
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

defineExpose({
  getInstance, rebuild,
  addRow, removeCheckedRows, getCheckedRows,
  getModified, getDirty, clearModified, focusCell,
  on, off,
});
</script>

<template>
  <div
    class="in-dt"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
  >
    <div v-show="loading" class="in-dt__loading" aria-live="polite">
      <div class="in-dt__spinner" aria-label="loading"></div>
    </div>
    <div ref="gridRef" class="in-dt__grid"></div>
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
</style>
