<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// 조건부 행 강조 = IBSheet 의 값 따라 셀/행 색 변경 대응.
//   각 행 데이터에 _attributes.className.row 로 클래스 부여(tui-grid 규약).
const STOCK = [
  { item: '노트북', stock: 3,  status: '부족' },
  { item: '모니터', stock: 25, status: '정상' },
  { item: '키보드', stock: 8,  status: '부족' },
];
const data = ref(STOCK.map((r) => ({
  ...r,
  _attributes: { className: { row: r.stock < 10 ? ['danger-row'] : [] } },
})));

const columns = [
  { name: 'item',   header: '품목', width: 140 },
  { name: 'stock',  header: '재고', width: 110, align: 'right' },
  { name: 'status', header: '상태', width: 100, align: 'center' },
];
</script>

<template>
  <InDataTable
    :columns="columns"
    :data="data"
    :height="220"
    :options="{ rowHeaders: ['rowNum'], bodyHeight: 180 }"
  />
</template>

<!-- 주: 플레이그라운드는 style 을 전역 주입하므로 scoped 미사용 (tui-grid 내부 td 도달) -->
<style>
.danger-row td { background-color: #fdecea !important; color: #c0392b; }
</style>
