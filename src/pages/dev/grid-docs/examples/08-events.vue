<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// 이벤트 = IBSheet onClick/onDblClick/onAfterChange 대응.
//   InDataTable 은 tui-grid 이벤트를 kebab-case emit 으로 전달.
const log = ref([]);
function push(msg) { log.value.unshift(msg); if (log.value.length > 6) log.value.pop(); }

const columns = [
  { name: 'empNo', header: '사번', width: 100 },
  { name: 'name',  header: '이름', width: 140, editor: 'text' },
];
const data = ref([
  { empNo: 'E001', name: '김인사' },
  { empNo: 'E002', name: '이개발' },
]);
</script>

<template>
  <div>
    <InDataTable
      :columns="columns"
      :data="data"
      :height="200"
      :options="{ rowHeaders: ['rowNum'], bodyHeight: 160 }"
      @click="(e) => push('click row=' + e.rowKey + ' col=' + e.columnName)"
      @dblclick="(e) => push('dblclick row=' + e.rowKey)"
      @after-change="(e) => push('after-change ' + JSON.stringify(e.changes || e))"
    />
    <pre style="margin-top:8px;font-size:12px;background:#f6f6f6;padding:8px;border-radius:6px;min-height:60px;">{{ log.join('\n') }}</pre>
  </div>
</template>
