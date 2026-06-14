<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// align(정렬) · width · formatter(표시 변환). 숫자/금액/날짜 포맷은
// utils/grid.js 의 formatRegistry 키를 format 으로 줘도 된다(IBSheet Format 대응).
const columns = [
  { name: 'item',   header: '품목',   width: 140 },
  { name: 'qty',    header: '수량',   width: 100, align: 'right', format: 'Integer' },
  { name: 'price',  header: '단가',   width: 130, align: 'right', format: 'KrwAmount' },
  { name: 'inDate', header: '입고일', width: 130, align: 'center', format: 'Ymd' },
  { name: 'rate',   header: '비율',   width: 100, align: 'right',
    formatter: ({ value }) => (value * 100).toFixed(1) + '%' },  // 인라인 formatter
];

const data = ref([
  { item: '노트북', qty: 3,  price: 1450000, inDate: '20260601', rate: 0.12 },
  { item: '모니터', qty: 25, price: 320000,  inDate: '20260605', rate: 0.48 },
  { item: '키보드', qty: 8,  price: 89000,   inDate: '20260610', rate: 0.21 },
]);
</script>

<template>
  <InDataTable
    :columns="columns"
    :data="data"
    :height="240"
    :options="{ rowHeaders: ['rowNum'], bodyHeight: 200, columnOptions: { resizable: true } }"
  />
</template>
