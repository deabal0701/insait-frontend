<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const grid = ref(null);

// editor: 'text' → 셀 더블클릭 시 편집. IBSheet 의 Edit:1 대응.
const columns = [
  { name: 'empNo', header: '사번', width: 100 },
  { name: 'name',  header: '이름', width: 140, editor: 'text' },
  { name: 'memo',  header: '메모', width: 220, editor: 'text' },
];
const data = ref([
  { empNo: 'E001', name: '김인사', memo: '' },
  { empNo: 'E002', name: '이개발', memo: '' },
]);

// 행 추가 → 새 행은 sStatus='I'. 셀 편집 → 'U'. 체크 삭제 → 'D'.
function addRow() {
  grid.value.addRow({ empNo: '', name: '신규', memo: '' });
}
function removeChecked() {
  const removed = grid.value.removeCheckedRows();
  if (!removed.length) toast.warning('체크된 행 없음');
}
// getDirty() → [{ ..., sStatus:'I'|'U'|'D', _seq }] envelope 송신용 dirty 배열
function showDirty() {
  const dirty = grid.value.getDirty();
  toast.info('dirty ' + dirty.length + '건: ' + JSON.stringify(dirty.map((r) => r.sStatus)));
}
</script>

<template>
  <div>
    <div style="display:flex; gap:6px; margin-bottom:8px;">
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="addRow">행 추가(I)</InButton>
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="removeChecked">체크 삭제(D)</InButton>
      <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="showDirty">dirty 보기</InButton>
    </div>
    <InDataTable
      ref="grid"
      :columns="columns"
      :data="data"
      :height="240"
      :options="{ rowHeaders: ['rowNum', 'checkbox'], bodyHeight: 180 }"
    />
  </div>
</template>
