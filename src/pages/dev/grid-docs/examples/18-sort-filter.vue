<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// IBSheet 정렬(헤더 Sort)·필터 대응 → 컬럼 단위 sortable / filter 옵션.
//   - sortable:true → 헤더 클릭 정렬 (sortingType 으로 초기 방향)
//   - filter:'text'|'select'|'number'|'date' → 헤더 필터 UI
const columns = [
  { name: 'name', header: '이름', width: 140, sortable: true, filter: 'text' },
  { name: 'dept', header: '부서', width: 150, sortable: true,
    filter: { type: 'select' } },
  { name: 'age',  header: '나이', width: 110, align: 'right',
    sortable: true, sortingType: 'desc', filter: 'number' },
];
const data = ref([
  { name: '김인사', dept: '인사팀', age: 41 },
  { name: '이개발', dept: '개발팀', age: 33 },
  { name: '박회계', dept: '회계팀', age: 38 },
  { name: '정프론', dept: '개발팀', age: 29 },
  { name: '한백엔', dept: '개발팀', age: 35 },
]);
</script>

<template>
  <InDataTable
    :columns="columns"
    :data="data"
    :height="260"
    :options="{ rowHeaders: ['rowNum'], bodyHeight: 220 }"
  />
</template>
