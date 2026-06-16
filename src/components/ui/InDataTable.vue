<script setup>
// ★ (2026-06-14, dspark): [winGrid 1.0 분리] 본 컴포넌트는 이제 라이브러리 @win/grid 의
//   WinGrid 위에 얹은 **앱 전용 shim** 이다. 공개 API(props/emits/expose)는 기존과 100% 동일 —
//   기존 사용처(grid-docs 플레이그라운드·admin·GridGallery 등) 전부 무수정으로 동작한다.
//
//   왜 shim 인가 (AS-IS IBSheet 책임 경계 재현):
//     · WinGrid(@win/grid) = 순수 그리드. tui-grid 격리 + 메모리 데이터/변경분만. 서버 지식 0.
//     · 본 shim   = insa-IT 전용 결합을 흡수 →
//         (1) Figma 테마 주입 (buildFigmaTheme + useThemeStore 토글 추종) → WinGrid :theme
//         (2) self-managed envelope 모드 (retrieveServiceId/saveServiceId → useEntityGrid →
//             /serviceBroker.h5). = AS-IS execute() 의 현대판. 이 결합은 앱에만 존재.
//   → 라이브러리 코어는 깨끗하게 유지, 인사 도메인 결합은 여기로 격리.
//
//   tui-grid native API 가 필요하면 getInstance() (WinGrid 인스턴스를 그대로 반환).
import { ref, watch, onMounted, computed } from 'vue';
import { WinGrid } from '@win/grid';
import { useEntityGrid } from '@/composables/useEntityGrid';
import { useThemeStore } from '@/stores/theme';
import { buildFigmaTheme } from '@/themes/tui-grid-figma';

const props = defineProps({
  columns: { type: Array, required: true },
  data: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) },
  rowKey: { type: String, default: undefined },
  height: { type: [Number, String], default: 400 },
  bodyHeight: { type: [Number, String], default: undefined },
  loading: { type: Boolean, default: false },
  contextMenuItems: { type: Array, default: () => [] },
  // 공통 컬럼 헤더(필수* + ⋮메뉴) — WinGrid 기본값(true) 그대로 전달. 끄려면 :column-menu="false"
  columnMenu: { type: Boolean, default: true },
  columnMenuItems: { type: Array, default: undefined },
  // self-managed 모드 — 서비스 props (주면 조회·저장을 내부 처리). :data 와 배타.
  retrieveServiceId: { type: String, default: undefined },
  saveServiceId: { type: String, default: undefined },
  slotName: { type: String, default: undefined },
  retrieveSlot: { type: String, default: undefined },
  saveSlot: { type: String, default: undefined },
  header: { type: Object, default: () => ({}) },
  statusKey: { type: String, default: 'sStatus' },
  softDelete: { type: Boolean, default: false },
  reloadAfterSave: { type: Boolean, default: true },
  autoRetrieve: { type: Boolean, default: false },
});

const emit = defineEmits([
  'click', 'dblclick',
  'check', 'uncheck', 'check-all', 'uncheck-all',
  'before-change', 'after-change',
  'editing-start', 'editing-finish',
  'selection-change', 'sort', 'filter', 'scroll-end',
  'instance-ready', 'context-action', 'column-menu-action',
]);

const winRef = ref(null);
const themeStore = useThemeStore();

// 테마 토글(white/green) 추종 — 토글 시 buildFigmaTheme() 가 :root 현재 토큰으로 재계산되어
// WinGrid 가 :theme 변경을 감지 → applyTheme + rebuild (brand 색 즉시 반영).
const themeObj = computed(() => {
  // themeStore.theme 의존성 등록 (토글 시 재계산). 클래스 적용은 store action 에서 선반영됨.
  void themeStore.theme;
  return buildFigmaTheme();
});

const selfManaged = computed(() => !!props.retrieveServiceId);

// self-managed envelope 흐름 (AS-IS execute() 현대판). grid 인스턴스는 WinGrid 에서 해석.
const entity = useEntityGrid({
  retrieveServiceId: props.retrieveServiceId,
  saveServiceId: props.saveServiceId,
  slot: props.slotName,
  retrieveSlot: props.retrieveSlot,
  saveSlot: props.saveSlot,
  gridRef: { getInstance: () => winRef.value?.getInstance() },
  statusKey: props.statusKey,
  softDelete: props.softDelete,
  reloadAfterSave: props.reloadAfterSave,
  header: props.header,
});

// 단일 데이터 소스: self-managed → entity.rows / controlled → props.data. WinGrid :data 가 주입.
const gridData = computed(() => (selfManaged.value ? (entity.rows.value || []) : props.data));
const showLoading = computed(() => props.loading || entity.loading.value);

onMounted(async () => {
  if (props.autoRetrieve && props.retrieveServiceId) {
    try { await entity.retrieve({}); } catch (_) { /* 조회 실패는 entity.error 로 노출 */ }
  }
});

// ── 그리드 편의 메서드 위임 (WinGrid 인스턴스로 forward) ──
const w = () => winRef.value;
function getInstance() { return w()?.getInstance() || null; }
function rebuild() { return w()?.rebuild(); }
function addRow(row, opts) { return w()?.addRow(row, opts); }
function removeCheckedRows() { return w()?.removeCheckedRows() || []; }
function getCheckedRows() { return w()?.getCheckedRows() || []; }
function getModified() { return w()?.getModified() || { createdRows: [], updatedRows: [], deletedRows: [] }; }
function getDirty(options) { return w()?.getDirty(options) || []; }
function clearModified() { return w()?.clearModified(); }
function focusCell(rowKey, columnName) { return w()?.focusCell(rowKey, columnName); }
function on(eventName, handler) { return w()?.on(eventName, handler); }
function off(eventName, handler) { return w()?.off(eventName, handler); }
function exportExcel(opts) { return w()?.exportExcel(opts); }
function importExcel(file, opts) { return w()?.importExcel(file, opts); }
function printGrid(opts) { return w()?.printGrid(opts); }

defineExpose({
  getInstance, rebuild,
  addRow, removeCheckedRows, getCheckedRows,
  getModified, getDirty, clearModified, focusCell,
  on, off,
  exportExcel, importExcel, printGrid,
  // self-managed 단일 창구
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
  <WinGrid
    ref="winRef"
    :columns="columns"
    :data="gridData"
    :options="options"
    :row-key="rowKey"
    :height="height"
    :body-height="bodyHeight"
    :loading="showLoading"
    :theme="themeObj"
    :context-menu-items="contextMenuItems"
    :column-menu="columnMenu"
    :column-menu-items="columnMenuItems"
    @click="(e) => emit('click', e)"
    @dblclick="(e) => emit('dblclick', e)"
    @check="(e) => emit('check', e)"
    @uncheck="(e) => emit('uncheck', e)"
    @check-all="(e) => emit('check-all', e)"
    @uncheck-all="(e) => emit('uncheck-all', e)"
    @before-change="(e) => emit('before-change', e)"
    @after-change="(e) => emit('after-change', e)"
    @editing-start="(e) => emit('editing-start', e)"
    @editing-finish="(e) => emit('editing-finish', e)"
    @selection-change="(e) => emit('selection-change', e)"
    @sort="(e) => emit('sort', e)"
    @filter="(e) => emit('filter', e)"
    @scroll-end="(e) => emit('scroll-end', e)"
    @instance-ready="(e) => emit('instance-ready', e)"
    @context-action="(e) => emit('context-action', e)"
    @column-menu-action="(e) => emit('column-menu-action', e)"
  />
</template>
