<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// IBSheet FrozenCol(고정열) + MergeSheet(멀티헤더 병합) 대응.
//   - 고정열: options.columnOptions.frozenCount (왼쪽 N개 컬럼 고정)
//   - 멀티헤더: options.header.complexColumns (자식 컬럼을 묶는 상위 헤더)
const columns = [
  { name: 'empNo', header: '사번', width: 90 },
  { name: 'name',  header: '이름', width: 110 },
  { name: 'jan',   header: '1월', width: 90, align: 'right', format: 'Integer' },
  { name: 'feb',   header: '2월', width: 90, align: 'right', format: 'Integer' },
  { name: 'mar',   header: '3월', width: 90, align: 'right', format: 'Integer' },
];
const data = ref([
  { empNo: 'E001', name: '김인사', jan: 3200000, feb: 3200000, mar: 3250000 },
  { empNo: 'E002', name: '이개발', jan: 3500000, feb: 3500000, mar: 3600000 },
]);

const options = {
  rowHeaders: ['rowNum'],
  bodyHeight: 180,
  columnOptions: { frozenCount: 2, resizable: true },   // 앞 2열 고정
  header: {
    height: 60,
    complexColumns: [
      { header: '1분기 급여', name: 'q1', childNames: ['jan', 'feb', 'mar'] },
    ],
  },
};
</script>

<template>
  <InDataTable :columns="columns" :data="data" :height="240" :options="options" />
</template>
