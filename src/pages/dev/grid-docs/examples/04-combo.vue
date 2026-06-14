<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// 콤보 셀 = IBSheet Type:Combo 대응.
//   editor: { type: 'select', options: { listItems: [{ text, value }] } }
//   저장값은 value, 화면은 formatter 로 text 표시.
const DEPTS = [
  { text: '인사팀', value: 'HR' },
  { text: '개발팀', value: 'DEV' },
  { text: '회계팀', value: 'ACC' },
];
const deptLabel = (v) => DEPTS.find((d) => d.value === v)?.text || v || '';

const columns = [
  { name: 'empNo', header: '사번', width: 100 },
  { name: 'name',  header: '이름', width: 130, editor: 'text' },
  {
    name: 'dept', header: '부서', width: 140,
    editor: { type: 'select', options: { listItems: DEPTS } },
    formatter: ({ value }) => deptLabel(value),
  },
];
const data = ref([
  { empNo: 'E001', name: '김인사', dept: 'HR' },
  { empNo: 'E002', name: '이개발', dept: 'DEV' },
]);
</script>

<template>
  <InDataTable
    :columns="columns"
    :data="data"
    :height="220"
    :options="{ rowHeaders: ['rowNum'], bodyHeight: 180 }"
  />
</template>
