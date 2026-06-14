<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';

// IBSheet 출력 대응 — 엑셀 다운로드(Down2Excel) · 엑셀 업로드(LoadExcel) · 인쇄.
//   InDataTable 메서드: exportExcel({fileName,sheetName}) / importExcel(file) / printGrid({title}).
//   엑셀은 exceljs 동적 import(번들 분리). PDF/OZ 리포트는 별도 리포트 엔진 영역.
const grid = ref(null);
const fileInput = ref(null);

const columns = [
  { name: 'item',  header: '품목', width: 160 },
  { name: 'qty',   header: '수량', width: 100, align: 'right', format: 'Integer' },
  { name: 'price', header: '금액', width: 140, align: 'right', format: 'KrwAmount' },
];
const data = ref([
  { item: '노트북', qty: 3,  price: 4350000 },
  { item: '모니터', qty: 25, price: 8000000 },
  { item: '키보드', qty: 8,  price: 712000 },
]);

function onExport() { grid.value.exportExcel({ fileName: '재고목록', sheetName: '재고' }); }
function onPrint() { grid.value.printGrid({ title: '재고 목록' }); }
function pickFile() { fileInput.value.click(); }
async function onFile(e) {
  const f = e.target.files?.[0];
  if (f) await grid.value.importExcel(f);     // 파싱 후 그리드에 반영
  e.target.value = '';
}
</script>

<template>
  <div>
    <div style="display:flex; gap:8px; margin-bottom:8px;">
      <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onExport">엑셀 다운로드</InButton>
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="pickFile">엑셀 업로드</InButton>
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onPrint">인쇄</InButton>
      <input ref="fileInput" type="file" accept=".xlsx" style="display:none" @change="onFile" />
    </div>
    <InDataTable
      ref="grid"
      :columns="columns"
      :data="data"
      :height="220"
      :options="{ rowHeaders: ['rowNum'], bodyHeight: 180 }"
    />
  </div>
</template>
