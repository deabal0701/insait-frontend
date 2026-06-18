<script setup>
/**
 * SgCatalogPage — 04-admin-lane 카탈로그 "SG 규격" 공통 페이지 (★ 2026-06-18, dspark)
 *
 * 기존 CatalogPage(InTable + 수작업 필터 slot)의 **SG 컴포넌트 버전**.
 * 사업장관리(ORM9999) 와 동일한 표현 컴포넌트를 쓰되, 메타관리의 업무 프로세스
 * (직접 REST + 서버 페이징 + Drawer 편집)는 그대로 보존한다.
 *
 *   상단 검색  = SgSearchBar          (config 기반, 칩·접기 내장)
 *   목록 그리드 = InDataTable(tui-grid) controlled 모드 (:data = usePagedList 현재 페이지)
 *   목록 헤더  = SgGridSection        (제목 + 건수 + [+신규] 툴바)
 *   하단 페이징 = InPageSizeSelect + InPagination  (서버 페이징, usePagedList 그대로)
 *   편집      = #drawer slot          (MetaDetailEditor 등 — 페이지가 주입)
 *
 * 【프로세스 보존】 그리드는 **조회 + 행클릭→Drawer 전용**(인라인 편집 X). 등록/수정은
 *   전적으로 Drawer 에서 일어난다. → SgGridSection 의 입력/삭제/복원/저장 툴바 대신 [+신규]만.
 *
 * 【envelope 미사용】 InDataTable 에 retrieve/save-service-id 를 주지 않는다(controlled).
 *   데이터는 list(usePagedList) 가 adminApi 직접 REST 로 가져온 현재 페이지를 :data 로 주입.
 *
 * props:
 *   - title / subtitle      : 페이지 제목·부제
 *   - list                  : usePagedList 인스턴스 (rows/total/page/size/sort/loading/error + setPage/setSize/setSort/setFilter/resetFilter/reload)
 *   - columns               : tui-grid 컬럼 [{ name, header, width, align, formatter?, sortKey? }]
 *                             · sortKey 가 있으면 그 컬럼에 WinGrid 기본 클라 정렬을 켠다(현재 페이지 기준).
 *                               서버 전량 정렬 아님(목록은 usePagedList defaultSort 로 1차 정렬되어 로드).
 *   - searchFields          : SgSearchBar fields [{ key, label, type, options?, placeholder?, chip? }]
 *                             · key 는 list 의 filter 키와 일치시킨다(직접 setFilter 매핑)
 *   - rowKey                : (현재 미사용) keyColumnName 을 주면 tui-grid click 이벤트 rowKey 가 null 로
 *                             와 행클릭→Drawer 가 깨진다 → 숫자 rowKey 사용. prop 은 호환을 위해 보존.
 *   - gridTitle             : 목록 섹션 제목 (기본 '목록')
 *   - createLabel/showCreate: [+신규] 버튼 라벨/표시
 *   - gridHeight/bodyHeight : 그리드 외곽/본문 높이
 *   - gridOptions           : InDataTable options 추가 주입(merge)
 *   - rowHeaders            : 행 헤더(기본 ['rowNum'])
 *
 * emits:
 *   - row-click(row)        : 행 클릭 → 페이지가 openDetail(row)
 *   - create()              : [+신규] → 페이지가 openCreate()
 *   - retry()               : 에러 재시도
 *
 * slot:
 *   - filter-extra          : 검색바 우측 등 추가 필터 UI (선택)
 *   - toolbar-extra         : 목록 툴바에 추가 버튼(엑셀 등, [+신규] 좌측)
 *   - drawer                : 행 선택/신규 시 우측 Drawer (MetaDetailEditor 등)
 */
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import SgSearchBar from '@/components/common/SgSearchBar.vue';
import SgGridSection from '@/components/common/SgGridSection.vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import InPagination from '@/components/ui/InPagination.vue';
import InPageSizeSelect from '@/components/ui/InPageSizeSelect.vue';
import InEmptyState from '@/components/ui/InEmptyState.vue';
import ScreenHelpDrawer from '@/components/feature/admin/ScreenHelpDrawer.vue';   // [DEV-HELP] 제거 시 이 줄 + 아래 :help 블록 삭제

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  list: { type: Object, required: true },
  columns: { type: Array, required: true },
  searchFields: { type: Array, default: () => [] },
  rowKey: { type: String, default: undefined },
  gridTitle: { type: String, default: '목록' },
  createLabel: { type: String, default: '+ 신규' },
  showCreate: { type: Boolean, default: true },
  // 그리드 외곽 높이 — 기본 '100%'. 실제 높이는 flex(.grid-section→.win-grid flex:1) 가 잡고,
  //   body 는 fitToParent 로 그 외곽을 채운다(매직넘버 없이 main 영역을 정확히 채움 → 푸터 안 잘림).
  gridHeight: { type: [Number, String], default: '100%' },
  bodyHeight: { type: [Number, String], default: 'fitToParent' },
  gridOptions: { type: Object, default: () => ({}) },
  rowHeaders: { type: Array, default: () => ['rowNum'] },
  // 행 우클릭 컨텍스트 메뉴 [{ key, label, divider?, disabled? }]. 셀에 버튼을 못 넣는 tui-grid 대안
  //   (예: 서비스관리 행별 [테스트]/[JSON]). @context-action({ key, row }) 으로 받는다.
  contextMenuItems: { type: Array, default: () => [] },
  // [DEV-HELP] 화면 도움말 — { object, title, table, operations[], businessNotes[], tables[] }. 전달 시
  //   목록 제목 5클릭 → [?]도움말 버튼 노출 → ScreenHelpDrawer. 미전달 시 0 영향. (제거 시 이 prop 삭제)
  help: { type: Object, default: null },
});

const emit = defineEmits(['row-click', 'create', 'retry', 'context-action']);

const gridRef = ref(null);

// ── list(usePagedList) ref 언랩 프록시 (prop 으로 받은 plain 객체 안의 ref 는 템플릿 자동 언랩 안 됨) ──
const rows = computed(() => props.list.rows?.value || []);
const total = computed(() => props.list.total?.value ?? 0);
const page = computed(() => props.list.page?.value ?? 1);
const size = computed(() => props.list.size?.value ?? 50);
const loading = computed(() => props.list.loading?.value ?? false);
const error = computed(() => props.list.error?.value || null);
const totalPages = computed(() => props.list.totalPages?.value ?? 1);

// ── 검색 (SgSearchBar) — searchFields.key 를 list filter 키로 직결 ──
const fieldKeys = computed(() => props.searchFields.map((f) => f.key));
function buildSearchDefaults() {
  const out = {};
  for (const f of props.searchFields) out[f.key] = f.value ?? '';
  return out;
}
// URL/초기 filter 복원분을 반영해 시드 (usePagedList syncUrl 정합)
function seedFromFilter() {
  const base = buildSearchDefaults();
  const cur = props.list.filter?.value || {};
  for (const k of fieldKeys.value) if (cur[k] != null) base[k] = cur[k];
  return base;
}
const search = ref(seedFromFilter());

function onSearch(values) {
  // staged 값을 list filter 로 확정 → page=1 + reload (서버 조회)
  props.list.setFilter({ ...values }, { debounce: false });
}
function onReset() {
  search.value = buildSearchDefaults();
  props.list.resetFilter();
}

// ── 정렬 ──
// ★ (2026-06-18, 사용자 결정) 서버 페이징 전량을 가로지르는 "서버 정렬"은 쓰지 않는다
//   ("정렬버튼 없어도 되거나 그냥 wingrid 기본기능 사용"). sortKey 가 선언된 컬럼은 WinGrid(tui-grid)
//   기본 클라 정렬만 켠다(현재 페이지 기준). 목록은 usePagedList defaultSort 로 서버에서 1차 정렬되어 로드.
const gridColumns = computed(() => props.columns.map((c) => {
  if (!c || !c.name) return c;
  const { sortKey, ...rest } = c;   // sortKey 는 tui-grid 비표준 키 → 제거. 있으면 클라 정렬 on.
  return sortKey ? { ...rest, sortable: true } : rest;
}));

const mergedOptions = computed(() => ({
  rowHeaders: props.rowHeaders,
  bodyHeight: props.bodyHeight,
  ...props.gridOptions,
}));

// ── 행 선택 → Drawer + 시각 하이라이트 ──
let prevSelKey = null;
function clearSelection() {
  const g = gridRef.value?.getInstance?.();
  if (g && prevSelKey != null) { try { g.removeRowClassName(prevSelKey, 'sg-row-sel'); } catch (_) { /* noop */ } }
  prevSelKey = null;
}
function onGridClick(e) {
  if (e?.rowKey == null) return;                  // 헤더/빈영역 클릭 무시(정렬은 WinGrid 기본 처리)
  const g = gridRef.value?.getInstance?.();
  if (!g) return;
  const row = g.getRow(e.rowKey);
  if (!row) return;
  // 선택 하이라이트
  try {
    if (prevSelKey != null) g.removeRowClassName(prevSelKey, 'sg-row-sel');
    g.addRowClassName(e.rowKey, 'sg-row-sel');
    prevSelKey = e.rowKey;
  } catch (_) { /* tui-grid 버전별 미지원 무시 */ }
  emit('row-click', row);
}
// 데이터(페이지·조회·정렬) 바뀌면 선택 표시 해제 (resetData 가 rowKey 재배치)
watch(rows, () => { prevSelKey = null; });

// 우클릭 컨텍스트 메뉴 액션 → 행 객체 해석 후 상위로 전달
function onContextAction(e) {
  const g = gridRef.value?.getInstance?.();
  const row = (g && e?.rowKey != null) ? g.getRow(e.rowKey) : null;
  emit('context-action', { key: e?.key, row, rowKey: e?.rowKey });
}

function onPageChange(p) { props.list.setPage?.(p); }
function onSizeChange(s) { props.list.setSize?.(s); }

const pageOf = computed(() => `${page.value} / ${totalPages.value}`);

// ════════ [DEV-HELP] 화면 도움말(임시 개발 편의) — 제거 시 이 블록 + 템플릿 도움말 버튼/드로어 삭제 ════════
// 목록 제목 5클릭 → [?]도움말 버튼 노출(세션 유지) → ScreenHelpDrawer 열림. help prop 없으면 전부 no-op.
const helpOpen = ref(false);
const helpRevealed = ref(false);
const HELP_UNLOCK_KEY = 'insait.adminHelp.revealed';
let helpClickCount = 0;
function onTitleClick() {
  if (!props.help || helpRevealed.value) return;
  helpClickCount += 1;
  if (helpClickCount >= 5) {
    helpRevealed.value = true;
    helpClickCount = 0;
    try { sessionStorage.setItem(HELP_UNLOCK_KEY, '1'); } catch (_) { /* sessionStorage 불가 무시 */ }
  }
}
function onHelpOpenChange(v) {
  helpOpen.value = v;
  if (!v) {   // 닫으면 다시 숨김(잠금) — 재노출하려면 제목 5클릭
    helpRevealed.value = false;
    helpClickCount = 0;
    try { sessionStorage.removeItem(HELP_UNLOCK_KEY); } catch (_) { /* noop */ }
  }
}
// ════════ [DEV-HELP] 끝 ════════

// ── 그리드 폭/높이 재계산 (refreshLayout) ──
// ★ tui-grid 는 컨테이너 크기가 바뀌어도(창 리사이즈·LNB 토글·드로어 등) 컬럼 폭/높이를 자동
//   재계산하지 않아 "그리드가 폭의 일부만 차지" 하거나 우측이 잘리는 현상이 생긴다. 컨테이너 크기
//   변화를 ResizeObserver 로 감지해 refreshLayout 으로 폭(과 fitToParent 높이)을 다시 채운다.
//   레이아웃은 flexbox 로 main 영역을 정확히 채우므로(높이 매직넘버 없음) 짧은 화면에서도 푸터가
//   잘리지 않는다.
const rootRef = ref(null);
function refreshGridLayout() {
  const g = gridRef.value?.getInstance?.();
  if (g && typeof g.refreshLayout === 'function') { try { g.refreshLayout(); } catch (_) { /* noop */ } }
}
let resizeRaf = null;
function scheduleRefresh() {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(refreshGridLayout);
}
function onGridReady() { nextTick(scheduleRefresh); }
let ro = null;
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    ro = new ResizeObserver(scheduleRefresh);   // 창·LNB·컨테이너 어떤 크기 변화든 재계산
    ro.observe(rootRef.value);
  }
  window.addEventListener('resize', scheduleRefresh);
  onGridReady();
  // [DEV-HELP] 세션 내 이미 푼 상태면 도움말 버튼 복원
  try { if (sessionStorage.getItem(HELP_UNLOCK_KEY) === '1') helpRevealed.value = true; } catch (_) { /* noop */ }
});
onBeforeUnmount(() => {
  ro?.disconnect();
  window.removeEventListener('resize', scheduleRefresh);
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
});

defineExpose({ clearSelection, refreshGridLayout, grid: gridRef });
</script>

<template>
  <!-- ★ (2026-06-18) 사업장관리(ORM9999)와 동일 레이아웃: 페이지 제목은 상단 앱바(route.meta)가 표시.
       본문은 in-content 제목 없이 검색 → 그리드 → 페이징을 앱바 바로 아래에 바짝 붙인다.
       title/subtitle prop 은 호환 위해 보존(현재 본문 미렌더 — 앱바가 제목 출처). -->
  <div ref="rootRef" class="sg-catalog">
    <!-- 검색 (SG 규격) -->
    <div class="sg-catalog__search">
      <SgSearchBar :fields="searchFields" v-model="search" @search="onSearch" @reset="onReset" />
      <slot name="filter-extra" />
    </div>

    <!-- 목록 (제목 + 건수 + [+신규] 툴바 + 그리드). 제목 5클릭 → 도움말 버튼(개발용) -->
    <SgGridSection :title="gridTitle" :count="total" :toolbar="false" @title-click="onTitleClick">
      <template #toolbar-extra>
        <slot name="toolbar-extra" />
        <!-- [DEV-HELP] 화면 도움말 버튼 (목록 제목 5클릭으로 노출) — 제거 시 이 button 삭제 -->
        <button v-if="help && helpRevealed" type="button" class="sg-catalog__help-btn" title="이 화면이 실행하는 SQL·업무 도움말" @click="helpOpen = true">
          <span aria-hidden="true">?</span> 도움말
        </button>
        <InButton
          v-if="showCreate"
          variant="primary"
          size="md"
          :left-icon-show="false"
          :right-icon-show="false"
          @click="emit('create')"
        >{{ createLabel }}</InButton>
      </template>

      <!-- 에러 -->
      <InEmptyState
        v-if="error"
        :title="`에러 — ${error.code}`"
        :description="error.message"
      >
        <template #action>
          <InButton :left-icon-show="false" :right-icon-show="false" @click="emit('retry')">다시 시도</InButton>
        </template>
      </InEmptyState>

      <!-- 그리드 (controlled — :data = 직접 REST 현재 페이지) -->
      <!-- ★ row-key(keyColumnName) 미설정 의도적: keyColumnName 을 주면 tui-grid click 이벤트의
           rowKey 가 null 로 와서 행클릭→Drawer 가 동작하지 않는다(검증됨). 카탈로그는 페이지마다
           재조회하므로 안정적 업무키 rowKey 불필요 → 숫자 rowKey 사용(사업장관리 ORM9999 와 동일 패턴). -->
      <InDataTable
        v-else
        ref="gridRef"
        :columns="gridColumns"
        :data="rows"
        :height="gridHeight"
        :loading="loading"
        :options="mergedOptions"
        :column-menu="false"
        :context-menu-items="contextMenuItems"
        @click="onGridClick"
        @instance-ready="onGridReady"
        @context-action="onContextAction"
      />
    </SgGridSection>

    <!-- 하단: 페이지 사이즈 + 총건수 + 페이징 (서버 페이징 유지) -->
    <footer class="sg-catalog__footer">
      <div class="sg-catalog__footer-left">
        <InPageSizeSelect :model-value="size" @change="onSizeChange" />
        <span class="sg-catalog__total">
          총 <strong>{{ total.toLocaleString() }}</strong>건
          <span class="sg-catalog__page-of">· {{ pageOf }} 페이지</span>
        </span>
      </div>
      <div class="sg-catalog__footer-right">
        <InPagination :model-value="page" :page-size="size" :total="total" @change="onPageChange" />
      </div>
    </footer>

    <!-- Drawer (행 선택/신규 시) -->
    <slot name="drawer" />

    <!-- [DEV-HELP] 화면 도움말 드로어 (실행 SQL + 조건 + 업무주의 + 컬럼정보) — 제거 시 이 줄 삭제 -->
    <ScreenHelpDrawer v-if="help" :help="help" :open="helpOpen" @update:open="onHelpOpenChange" />
  </div>
</template>

<style scoped>
/* ★ (2026-06-18) 반응형 풀 레이아웃 — main 콘텐츠 영역(높이 definite, overflow-y:auto)을 flexbox 로
   정확히 채운다. 매직넘버(calc(100vh-N)) 없이: 검색·푸터는 고정 높이, 그리드 섹션이 남는 높이를 채움
   (flex:1). overflow:hidden 으로 컨테이너를 넘지 않게 해 짧은 화면에서도 푸터가 잘리지 않는다.
   그리드 폭/높이는 ResizeObserver→refreshLayout 으로 모든 크기 변화에 추종(우측 잘림·세로 밀림 방지). */
.sg-catalog {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  font-family: var(--in-font-family-body);
}
.sg-catalog__search { display: flex; flex-direction: column; gap: 12px; flex: 0 0 auto; }
/* 그리드 섹션이 남는 세로 공간을 채우고, 그 안의 그리드(.win-grid)가 섹션 헤더를 뺀 나머지를 채운다.
   tui-grid bodyHeight:'fitToParent' 가 이 flex 높이를 읽어 본문을 맞춘다(WinGrid 인라인 height 무시). */
.sg-catalog :deep(.grid-section) { flex: 1 1 0; min-height: 0; }
.sg-catalog :deep(.grid-section > .win-grid) { flex: 1 1 0; min-height: 0; height: auto !important; }
.sg-catalog__footer { flex: 0 0 auto; }
.sg-catalog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px;
  flex-wrap: wrap;
}
.sg-catalog__footer-left { display: inline-flex; align-items: center; gap: 16px; }
.sg-catalog__total { font-size: var(--in-font-size-sm); color: var(--in-text-accent); }
.sg-catalog__total strong { color: var(--in-text-brand); }
.sg-catalog__page-of { color: var(--in-text-subtle); margin-left: 6px; }

/* ════════ [DEV-HELP] 도움말 버튼 — 제거 시 이 블록 통째 삭제 ════════ */
.sg-catalog__help-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  cursor: pointer;
  background: var(--in-bg-white);
  color: var(--in-text-subtle);
  border: 1px solid var(--in-border-default);
  border-radius: 999px;
  font-size: var(--in-font-size-sm);
  font-family: var(--in-font-family-body);
}
.sg-catalog__help-btn:hover { border-color: var(--in-border-input); color: var(--in-text-accent); }
.sg-catalog__help-btn > span { font-weight: var(--in-font-weight-bold); }
/* ════════ [DEV-HELP] 끝 ════════ */
</style>

<!-- 선택 행 하이라이트 — tui-grid 생성 DOM 은 scoped 속성이 없어 비scoped 로 칠한다.
     addRowClassName('sg-row-sel') 이 해당 행 셀(.tui-grid-cell)에 클래스를 부여. -->
<style>
.sg-catalog .tui-grid-cell.sg-row-sel {
  background-color: var(--in-bg-info-default, #e1f5fc) !important;
}
</style>
