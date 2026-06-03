<script setup>
/**
 * InTable — Figma 1241:52990 (DataDisplay/Table)
 * Figma 노드 ID = 1241:52990
 *
 * 출처: design-system/v2/src/components/ui/InTable.vue (Plain JS 변환, 2026-06-03)
 *
 * 책임: simple read-only / form-grid 용 가벼운 HTML 테이블 wrapper.
 *   비즈니스 화면 dirty/sStatus/그리드 cell 편집은 InDataTable (tui-grid) 사용.
 *   본 InTable 은 04-admin-lane 카탈로그 화면 등 관리자/조회 위주에 사용.
 *
 * slot:
 *   - header / header-{field} : 헤더 커스텀 (정렬 화살표·필터 트리거 등 합성)
 *   - cell   / cell-{field}   : 셀 커스텀 (배지·링크·툴팁 등)
 *
 * Vue API:
 *   - columns: [{ field, label, label2?, width?, align? }]
 *   - data:    [row 객체]
 *   - headerRows: 1 | 2  (2행 시 label2 표시)
 *   - showTotalRows / totalRowsLabel
 *   - rowKey (개별 row 의 :key — 정렬·페이징 시 reactivity 안정)
 *   - clickableRow (행 클릭 가능 시 hover·cursor 변경)
 *   - selectedRow (현재 선택된 row — 시각 강조)
 */
import { computed } from 'vue';

const props = defineProps({
  columns: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
  headerRows: { type: Number, default: 1 },
  showTotalRows: { type: Boolean, default: false },
  totalRowsLabel: { type: String, default: 'Total Rows' },
  rowKey: { type: String, default: undefined },
  clickableRow: { type: Boolean, default: false },
  selectedRow: { type: [String, Number, Object], default: null },
});

const emit = defineEmits(['row-click']);

const totalRowsText = computed(() => `${props.totalRowsLabel}: ${props.data.length}`);

function getRowKey(row, i) {
  return props.rowKey ? row[props.rowKey] : i;
}

function isSelected(row) {
  if (props.selectedRow == null) return false;
  if (typeof props.selectedRow === 'object') return props.selectedRow === row;
  if (props.rowKey) return row[props.rowKey] === props.selectedRow;
  return false;
}

function onRowClick(row, i, e) {
  if (!props.clickableRow) return;
  emit('row-click', { row, index: i, event: e });
}
</script>

<template>
  <div class="in-table" role="table">
    <table>
      <thead>
        <tr class="in-table__head-primary">
          <th
            v-for="c in columns"
            :key="c.field"
            scope="col"
            :style="{ width: typeof c.width === 'number' ? c.width + 'px' : c.width, textAlign: c.align || 'left' }"
          >
            <slot :name="`header-${c.field}`" :column="c">
              <slot name="header" :column="c">{{ c.label }}</slot>
            </slot>
          </th>
        </tr>
        <tr v-if="headerRows === 2" class="in-table__head-secondary">
          <th
            v-for="c in columns"
            :key="c.field + '-2'"
            scope="col"
            :style="{ textAlign: c.align || 'left' }"
          >{{ c.label2 || '' }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, ri) in data"
          :key="getRowKey(row, ri)"
          class="in-table__row"
          :class="{ 'in-table__row--clickable': clickableRow, 'in-table__row--selected': isSelected(row) }"
          @click="onRowClick(row, ri, $event)"
        >
          <td
            v-for="c in columns"
            :key="c.field"
            :style="{ textAlign: c.align || 'left' }"
          >
            <slot :name="`cell-${c.field}`" :value="row[c.field]" :row="row" :column="c" :index="ri">
              <slot name="cell" :value="row[c.field]" :row="row" :column="c" :index="ri">{{ row[c.field] }}</slot>
            </slot>
          </td>
        </tr>
        <tr v-if="!data.length">
          <td :colspan="columns.length" class="in-table__empty">
            <slot name="empty">No data</slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showTotalRows" class="in-table__num">
      <span class="in-table__num-text">{{ totalRowsText }}</span>
    </div>
  </div>
</template>

<style scoped>
.in-table {
  display: block;
  width: 100%;
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xxs);
  background: var(--in-bg-white);
  overflow: hidden;
}

.in-table table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--in-font-family-body);
}

.in-table__head-primary > th {
  background: var(--in-bg-brand);
  color: var(--in-text-white);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  letter-spacing: var(--in-letter-spacing-md);
  font-weight: var(--in-font-weight-medium);
  padding: 10px 12px;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  text-align: left;
  white-space: nowrap;
}
.in-table__head-primary > th:last-child { border-right: none; }

.in-table__head-secondary > th {
  background: var(--in-bg-default);
  color: var(--in-text-accent);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  letter-spacing: var(--in-letter-spacing-sm);
  font-weight: var(--in-font-weight-regular);
  padding: 8px 12px;
  border-top: 1px solid var(--in-border-default);
  border-right: 1px solid var(--in-border-default);
}
.in-table__head-secondary > th:last-child { border-right: none; }

.in-table__row > td {
  background: var(--in-bg-white);
  color: var(--in-text-accent);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  letter-spacing: var(--in-letter-spacing-sm);
  font-weight: var(--in-font-weight-regular);
  padding: 10px 12px;
  border-top: 1px solid var(--in-border-default);
  border-right: 1px solid var(--in-border-default);
  vertical-align: middle;
}
.in-table__row > td:last-child { border-right: none; }
.in-table__row:hover > td { background: var(--in-surface-accent-brand); }

.in-table__row--clickable { cursor: pointer; }
.in-table__row--selected > td { background: var(--in-bg-info-default, var(--in-surface-accent-brand)); }

.in-table__empty {
  text-align: center;
  padding: 32px 12px;
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-sm);
}

.in-table__num {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px;
  background: var(--in-bg-white);
  border-top: 1px solid var(--in-border-default);
}
.in-table__num-text {
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-accent);
}
</style>
