<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// IBSheet AutoSum(합계행) 대응 → tui-grid options.summary.
//   columnContent 에 template + sum/avg/max/min 등 내장 집계 사용.
const columns = [
  { name: 'item',  header: '품목', width: 160 },
  { name: 'qty',   header: '수량', width: 110, align: 'right', format: 'Integer' },
  { name: 'price', header: '금액', width: 140, align: 'right', format: 'KrwAmount' },
];
const data = ref([
  { item: '노트북', qty: 3,  price: 4350000 },
  { item: '모니터', qty: 25, price: 8000000 },
  { item: '키보드', qty: 8,  price: 712000 },
]);

const options = {
  rowHeaders: ['rowNum'],
  bodyHeight: 160,
  summary: {
    height: 36,
    position: 'bottom',
    columnContent: {
      item:  { template: () => '합계' },
      qty:   { template: (v) => String(v.sum) },
      price: { template: (v) => v.sum.toLocaleString('ko-KR') + '원' },
    },
  },
};
</script>

<template>
  <InDataTable :columns="columns" :data="data" :height="240" :options="options" />
</template>
