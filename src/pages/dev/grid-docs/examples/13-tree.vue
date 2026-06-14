<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// IBSheet TreeCol + DataInsert(row, level) 계층 구조 대응 → tui-grid treeColumnOptions.
//   데이터는 _children 중첩 배열, treeColumnOptions.name 컬럼에 펼침/접힘 아이콘.
const columns = [
  { name: 'orgNm', header: '조직', width: 220 },
  { name: 'cnt',   header: '인원', width: 90, align: 'right', format: 'Integer' },
];
const data = ref([
  {
    orgNm: '본사', cnt: 6,
    _children: [
      { orgNm: '인사팀', cnt: 2 },
      { orgNm: '개발팀', cnt: 3, _children: [
        { orgNm: '프론트파트', cnt: 1 },
        { orgNm: '백엔드파트', cnt: 2 },
      ] },
    ],
  },
]);

const options = {
  rowHeaders: ['rowNum'],
  bodyHeight: 220,
  treeColumnOptions: { name: 'orgNm', useIcon: true, useCascadingCheckbox: false },
};
</script>

<template>
  <InDataTable :columns="columns" :data="data" :height="260" :options="options" />
</template>
