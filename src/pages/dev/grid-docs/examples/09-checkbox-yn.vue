<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// IBSheet Type:CheckBox (Y/N 저장) 대응.
//   tui-grid 에는 단일 Y/N 셀 타입이 없어 select 에디터(Y/N) + formatter 로 표현.
//   행 선택용 체크박스는 options.rowHeaders:['checkbox'] (데이터 아님) 와 구분.
const columns = [
  { name: 'code', header: '코드', width: 110 },
  { name: 'name', header: '명칭', width: 160, editor: 'text' },
  {
    name: 'useYn', header: '사용', width: 90, align: 'center',
    editor: { type: 'select', options: { listItems: [
      { text: 'Y', value: 'Y' }, { text: 'N', value: 'N' },
    ] } },
    formatter: ({ value }) => (value === 'Y' ? '☑' : '☐'),
  },
];
const data = ref([
  { code: 'C001', name: '재직', useYn: 'Y' },
  { code: 'C002', name: '휴직', useYn: 'N' },
]);
</script>

<template>
  <InDataTable
    :columns="columns" :data="data" :height="200"
    :options="{ rowHeaders: ['rowNum', 'checkbox'], bodyHeight: 160 }"
  />
</template>
