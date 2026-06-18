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
import { computed, ref, watch } from 'vue';
import SgSearchBar from '@/components/common/SgSearchBar.vue';
import SgGridSection from '@/components/common/SgGridSection.vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import InPagination from '@/components/ui/InPagination.vue';
import InPageSizeSelect from '@/components/ui/InPageSizeSelect.vue';
import InEmptyState from '@/components/ui/InEmptyState.vue';

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
  gridHeight: { type: [Number, String], default: 560 },
  bodyHeight: { type: Number, default: 500 },
  gridOptions: { type: Object, default: () => ({}) },
  rowHeaders: { type: Array, default: () => ['rowNum'] },
});

const emit = defineEmits(['row-click', 'create', 'retry']);

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

function onPageChange(p) { props.list.setPage?.(p); }
function onSizeChange(s) { props.list.setSize?.(s); }

const pageOf = computed(() => `${page.value} / ${totalPages.value}`);

defineExpose({ clearSelection, grid: gridRef });
</script>

<template>
  <div class="sg-catalog">
    <!-- 상단 헤더 -->
    <header class="sg-catalog__header">
      <div class="sg-catalog__title-area">
        <h1 class="sg-catalog__title">{{ title }}</h1>
        <p v-if="subtitle" class="sg-catalog__subtitle">{{ subtitle }}</p>
      </div>
    </header>

    <!-- 검색 (SG 규격) -->
    <div class="sg-catalog__search">
      <SgSearchBar :fields="searchFields" v-model="search" @search="onSearch" @reset="onReset" />
      <slot name="filter-extra" />
    </div>

    <!-- 목록 (제목 + 건수 + [+신규] 툴바 + 그리드) -->
    <SgGridSection :title="gridTitle" :count="total" :toolbar="false">
      <template #toolbar-extra>
        <slot name="toolbar-extra" />
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
        @click="onGridClick"
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
  </div>
</template>

<style scoped>
.sg-catalog {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px 24px;
  font-family: var(--in-font-family-body);
}
.sg-catalog__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.sg-catalog__title {
  margin: 0;
  font-size: 22px;
  line-height: 28px;
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-default);
}
.sg-catalog__subtitle {
  margin: 4px 0 0;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-subtle);
}
.sg-catalog__search { display: flex; flex-direction: column; gap: 12px; }
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
</style>

<!-- 선택 행 하이라이트 — tui-grid 생성 DOM 은 scoped 속성이 없어 비scoped 로 칠한다.
     addRowClassName('sg-row-sel') 이 해당 행 셀(.tui-grid-cell)에 클래스를 부여. -->
<style>
.sg-catalog .tui-grid-cell.sg-row-sel {
  background-color: var(--in-bg-info-default, #e1f5fc) !important;
}
</style>
