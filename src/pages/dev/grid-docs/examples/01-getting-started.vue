<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// columns: 그리드 컬럼 정의 (name=데이터 키, header=표시 헤더)
const columns = [
  { name: 'empNo', header: '사번', width: 100 },
  { name: 'name',  header: '이름', width: 140 },
  { name: 'dept',  header: '부서', width: 140 },
];

// data: 표시할 행 배열
const data = ref([
  { empNo: 'E001', name: '김인사', dept: '인사팀' },
  { empNo: 'E002', name: '이개발', dept: '개발팀' },
  { empNo: 'E003', name: '박회계', dept: '회계팀' },
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
