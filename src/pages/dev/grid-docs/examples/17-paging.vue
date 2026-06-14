<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// IBSheet SearchMode/Page(페이징) 대응 → tui-grid options.pageOptions.
//   클라이언트 페이징: { useClient: true, perPage: N } → 하단 페이지 내비 자동 표시.
//   서버 페이징(대용량)은 useClient:false + 서버가 startRow/endRow 로 잘라 응답
//   (self-managed retrieve 시 검색조건에 페이지 파라미터를 실어 보냄).
const columns = [
  { name: 'no',   header: 'No', width: 80, align: 'right' },
  { name: 'name', header: '이름', width: 160 },
  { name: 'dept', header: '부서', width: 160 },
];
// 12행 → perPage 5 면 3페이지
const DEPTS = ['인사팀', '개발팀', '회계팀', '영업팀'];
const data = ref(Array.from({ length: 12 }, (_, i) => ({
  no: i + 1,
  name: '직원' + String(i + 1).padStart(2, '0'),
  dept: DEPTS[i % DEPTS.length],
})));

const options = {
  rowHeaders: ['rowNum'],
  bodyHeight: 220,
  pageOptions: { useClient: true, perPage: 5 },   // 클라이언트 페이징
};
</script>

<template>
  <InDataTable :columns="columns" :data="data" :height="300" :options="options" />
</template>
