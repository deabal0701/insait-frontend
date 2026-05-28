<script setup>
// ★ (2026-05-28, dspark): tui-grid Vue wrapper (얇은 layer). IBSheet 명칭 모사 X.
//   tui-grid native API 그대로 노출 — expose: getInstance() 로 사용자가 직접 호출.
//   책임:
//     1) props 통일 (columns / data / options / rowKey / height / loading)
//     2) lifecycle (mount / destroy)
//     3) Vue reactivity 통합 (watch(data) → resetData, watch(columns) → setColumns)
//     4) Figma theme 자동 적용 (loadGrid plugin)
//     5) raw grid event → emit forwarding (네이티브 명칭 kebab-case 변환)
//   columns 의 `format` 키는 utils/grid.js 의 formatRegistry 로 자동 변환.
//   dirty row 추출은 extractDirtyForEnvelope(grid.getModifiedRows()) 사용.
import { ref, shallowRef, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { loadGrid } from '@/plugins/tui-grid';
import { resolveColumnFormats } from '@/utils/grid';

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

onMounted(build);
onBeforeUnmount(() => {
  try { instance.value?.destroy?.(); } catch (_) { /* noop */ }
  instance.value = null;
});

function getInstance() {
  return instance.value;
}

defineExpose({ getInstance });
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
