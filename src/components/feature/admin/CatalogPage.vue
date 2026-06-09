<script setup>
/**
 * CatalogPage — 04-admin-lane 카탈로그 공통 추상 페이지.
 * ★ (2026-06-03, dspark): 5 화면 (services/queries/messages/entities/objects) 공통 패턴.
 *
 * 책임:
 *   - 상단 제목·통계
 *   - 검색·필터 영역 (slot)
 *   - 활성 필터칩 자동 표시 (InChip — propDelete)
 *   - 정렬 가능한 헤더 (InTable + 클릭 시 setSort)
 *   - 자동 바인딩 함정 진단 dot 슬롯
 *   - 페이지 사이즈 셀렉터 + InPagination + 총 건수 표시
 *   - 로딩 / 빈 상태 / 에러
 *   - 행 클릭 → 우측 Drawer (slot)
 *
 * slot:
 *   - filters   : 검색·필터 UI (페이지 컴포넌트가 정의)
 *   - active-filters : 활성 필터칩 (자동 생성 외 커스텀)
 *   - stats     : 상단 통계 카드 (선택)
 *   - cell-{field}, header-{field} : InTable 셀/헤더 커스텀
 *   - drawer    : 행 선택 시 우측 패널
 *   - empty     : 빈 상태 메시지
 *
 * props:
 *   - title : 페이지 제목 (예: "서비스관리")
 *   - subtitle : 부제 (예: "FRM_SERVICE_DEF · 6,210건")
 *   - list  : usePagedList 인스턴스
 *   - columns : InTable 컬럼 정의 + sortKey?·sortable? 옵션
 *   - rowKey  : 행 식별 컬럼
 *   - activeFilters : [{ key, label, value }] (칩 자동 생성용)
 *
 * emits:
 *   - row-click(row, index)
 *   - filter-remove(key)
 *   - retry()
 */
import { computed, ref } from 'vue';
import InTable from '@/components/ui/InTable.vue';
import InPagination from '@/components/ui/InPagination.vue';
import InPageSizeSelect from '@/components/ui/InPageSizeSelect.vue';
import InChip from '@/components/ui/InChip.vue';
import InButton from '@/components/ui/InButton.vue';
import InCard from '@/components/ui/InCard.vue';
import InEmptyState from '@/components/ui/InEmptyState.vue';
import ScreenHelpDrawer from '@/components/feature/admin/ScreenHelpDrawer.vue';

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  list: { type: Object, required: true },        // usePagedList 인스턴스
  columns: { type: Array, required: true },
  rowKey: { type: String, default: undefined },
  activeFilters: { type: Array, default: () => [] },
  selectedRow: { type: [String, Number, Object], default: null },
  // ★ (2026-06-09, dspark): 화면 도움말 — { object, title, table, asOf, operations[], businessNotes[] }.
  //   전달되면 제목 옆 [?]도움말 버튼 + 우측 ScreenHelpDrawer 렌더. 미전달 시 0 영향.
  help: { type: Object, default: null },
});

// ★ (2026-06-09, dspark): 도움말 드로어 open 상태 (로컬). 행 클릭 편집 드로어와 별개 오버레이.
const helpOpen = ref(false);

const emit = defineEmits(['row-click', 'filter-remove', 'retry']);

const totalLabel = computed(() => {
  const total = props.list.total?.value ?? 0;
  return total.toLocaleString();
});

const pageOf = computed(() => {
  const page = props.list.page?.value ?? 1;
  const totalPages = props.list.totalPages?.value ?? 1;
  return `${page} / ${totalPages}`;
});

function currentSortDir(sortKey) {
  if (!sortKey) return null;
  const arr = props.list.sort?.value ?? [];
  const found = arr.find((s) => s.startsWith(`${sortKey},`));
  if (!found) return null;
  return found.endsWith(',asc') ? 'asc' : 'desc';
}

function onHeaderClick(col) {
  if (!col.sortable || !col.sortKey) return;
  props.list.setSort?.(col.sortKey);
}

function onRowClick({ row, index }) {
  emit('row-click', row, index);
}

function onPageChange(p) { props.list.setPage?.(p); }
function onSizeChange(s) { props.list.setSize?.(s); }
</script>

<template>
  <div class="catalog-page">
    <!-- 상단 헤더 -->
    <header class="catalog-page__header">
      <div class="catalog-page__title-area">
        <div class="catalog-page__title-row">
          <h1 class="catalog-page__title">{{ title }}</h1>
          <!-- ★ (2026-06-09, dspark): 화면 도움말 (실행 SQL + 조건 + 업무주의). help prop 있을 때만. -->
          <button v-if="help" type="button" class="catalog-page__help-btn" title="이 화면이 실행하는 SQL·업무 도움말" @click="helpOpen = true">
            <span aria-hidden="true">?</span> 도움말
          </button>
        </div>
        <p v-if="subtitle" class="catalog-page__subtitle">{{ subtitle }}</p>
      </div>
      <div class="catalog-page__actions">
        <slot name="header-actions" />
      </div>
    </header>

    <!-- 통계 카드 (선택) -->
    <section v-if="$slots.stats" class="catalog-page__stats">
      <slot name="stats" />
    </section>

    <!-- 필터 영역 -->
    <InCard v-if="$slots.filters" class="catalog-page__filters">
      <slot name="filters" />
    </InCard>

    <!-- 활성 필터 칩 -->
    <div v-if="activeFilters.length || $slots['active-filters']" class="catalog-page__chips">
      <InChip
        v-for="f in activeFilters"
        :key="f.key"
        :label="f.label"
        type="multi-select"
        prop-delete
        @close="emit('filter-remove', f.key)"
      />
      <slot name="active-filters" />
    </div>

    <!-- 테이블 -->
    <section class="catalog-page__table">
      <!-- 에러 -->
      <InEmptyState
        v-if="list.error?.value"
        :title="`에러 — ${list.error.value.code}`"
        :description="list.error.value.message"
      >
        <template #action>
          <InButton :left-icon-show="false" :right-icon-show="false" @click="emit('retry')">다시 시도</InButton>
        </template>
      </InEmptyState>

      <!-- 로딩 -->
      <div v-else-if="list.loading?.value" class="catalog-page__loading">
        조회 중…
      </div>

      <!-- 데이터 -->
      <template v-else>
        <InTable
          :columns="columns"
          :data="list.rows?.value || []"
          :row-key="rowKey"
          clickable-row
          :selected-row="selectedRow"
          @row-click="onRowClick"
        >
          <!-- 헤더: 정렬 가능한 컬럼은 클릭 화살표 -->
          <template
            v-for="c in columns"
            :key="`hdr-${c.field}`"
            #[`header-${c.field}`]="{ column }"
          >
            <span
              class="catalog-page__hdr"
              :class="{ 'catalog-page__hdr--sortable': column.sortable }"
              @click.stop="onHeaderClick(column)"
            >
              <slot :name="`header-${c.field}`" :column="column">{{ column.label }}</slot>
              <span v-if="column.sortable" class="catalog-page__hdr-arrow">
                <span :class="['arrow', currentSortDir(column.sortKey) === 'asc' ? 'arrow--asc' : '',
                                       currentSortDir(column.sortKey) === 'desc' ? 'arrow--desc' : '']" />
              </span>
            </span>
          </template>

          <!-- 셀: 부모 페이지가 자유롭게 정의 -->
          <template
            v-for="c in columns"
            :key="`cell-${c.field}`"
            #[`cell-${c.field}`]="slotProps"
          >
            <slot :name="`cell-${c.field}`" v-bind="slotProps">{{ slotProps.value }}</slot>
          </template>

          <template #empty>
            <slot name="empty">
              <InEmptyState
                title="결과가 없습니다"
                description="필터를 조정하거나 칩의 ✕ / [초기화] 후 다시 조회하세요."
              />
            </slot>
          </template>
        </InTable>
      </template>
    </section>

    <!-- 하단: 페이지 사이즈 + 페이징 + 총건수 -->
    <footer class="catalog-page__footer">
      <div class="catalog-page__footer-left">
        <InPageSizeSelect
          :model-value="list.size?.value"
          @change="onSizeChange"
        />
        <span class="catalog-page__total">
          총 <strong>{{ totalLabel }}</strong>건
          <span class="catalog-page__page-of">· {{ pageOf }} 페이지</span>
        </span>
      </div>
      <div class="catalog-page__footer-right">
        <InPagination
          :model-value="list.page?.value"
          :page-size="list.size?.value"
          :total="list.total?.value"
          @change="onPageChange"
        />
      </div>
    </footer>

    <!-- Drawer (행 선택 시) -->
    <slot name="drawer" />

    <!-- ★ (2026-06-09, dspark): 화면 도움말 드로어 (실행 SQL + 조건 + 업무주의) -->
    <ScreenHelpDrawer v-if="help" :help="help" :open="helpOpen" @update:open="(v) => { helpOpen = v; }" />
  </div>
</template>

<style scoped>
.catalog-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  font-family: var(--in-font-family-body);
}

.catalog-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.catalog-page__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.catalog-page__title {
  margin: 0;
  font-size: 22px;
  line-height: 28px;
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-default);
}
.catalog-page__help-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  cursor: pointer;
  background: var(--in-bg-white);
  color: var(--in-text-subtle);
  border: 1px solid var(--in-border-default);
  border-radius: 999px;
  font-size: var(--in-font-size-sm);
  font-family: var(--in-font-family-body);
}
.catalog-page__help-btn:hover {
  border-color: var(--in-border-input);
  color: var(--in-text-accent);
}
.catalog-page__help-btn > span {
  font-weight: var(--in-font-weight-bold);
}
.catalog-page__subtitle {
  margin: 4px 0 0;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-subtle);
}

.catalog-page__stats { display: flex; gap: 12px; flex-wrap: wrap; }

.catalog-page__filters { padding: 16px; }
/* ★ (2026-06-03, dspark): InSelect 가 label 없이 placeholder 만 표시될 때 width 멸실 회피용 fallback.
   각 카탈로그가 flex 기반 폭을 직접 부여하는 게 우선이며, 본 규칙은 단순히 최소 폭 보장. */
.catalog-page__filters :deep(.in-sel) { min-width: 120px; }

.catalog-page__chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.catalog-page__table {
  background: var(--in-bg-white);
  border-radius: var(--in-radius-xxs);
}
.catalog-page__loading {
  text-align: center;
  padding: 48px 12px;
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-sm);
}

.catalog-page__hdr {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.catalog-page__hdr--sortable { cursor: pointer; user-select: none; }
.catalog-page__hdr--sortable:hover { opacity: 0.85; }

.catalog-page__hdr-arrow {
  display: inline-flex;
  width: 12px;
  height: 12px;
  align-items: center;
  justify-content: center;
}
/* 기본(정렬 비활성): 흐린 아래 삼각형으로 "정렬 가능" 표식 — 정렬 시 진하게.
   (이전: border 없어 투명 → sortable 컬럼인지 알 수 없던 버그, 2026-06-05) */
.arrow {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 5px solid currentColor;
  opacity: 0.3;
}
.arrow--asc { border-top: 0; border-bottom: 5px solid currentColor; opacity: 1; }
.arrow--desc { border-bottom: 0; border-top: 5px solid currentColor; opacity: 1; }

.catalog-page__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 4px;
}
.catalog-page__footer-left {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}
.catalog-page__total {
  font-size: var(--in-font-size-sm);
  color: var(--in-text-accent);
}
.catalog-page__total strong { color: var(--in-text-brand); }
.catalog-page__page-of { color: var(--in-text-subtle); margin-left: 6px; }
</style>
