<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import { useToast } from '@/composables/useToast';

// AS-IS h5:Service + IBSheet GetSaveJson 흐름의 TO-BE 대응.
//   retrieve/save serviceId 만 주면 InDataTable 이 /serviceBroker.h5 envelope 를
//   내부 조립·POST·재조회. IBSheet 의 GetSaveJson()→서버저장→재조회 한 사이클이
//   grid.retrieve(body) / grid.save() 두 메서드로 들어온다. (실 백엔드 필요)
const toast = useToast();
const grid = ref(null);

const columns = [
  { name: 'demo_id',   header: 'ID(PK)', width: 90, align: 'right' },
  { name: 'demo_name', header: '이름',   width: 150, editor: 'text' },
  { name: 'demo_memo', header: '메모',   width: 220, editor: 'text' },
];

async function onRetrieve() {
  try {
    const rows = await grid.value.retrieve({ ME_TST0002_01: [{ keyword: '' }] });
    toast.success('조회 ' + (rows?.length || 0) + '행');
  } catch (e) { toast.error('조회 실패: ' + (e?.message || e)); }
}
function onAdd() { grid.value.addRow({ demo_id: '', demo_name: '신규', demo_memo: '' }); }
async function onSave() {
  try {
    const r = await grid.value.save();
    if (r.skipped) toast.info('변경분 0건');
    else toast.success('저장 ' + r.dirty.length + '건 + 재조회');
  } catch (e) { toast.error('저장 실패: ' + (e?.message || e)); }
}
</script>

<template>
  <div>
    <div style="display:flex; gap:6px; margin-bottom:8px;">
      <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onRetrieve">조회</InButton>
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onAdd">행 추가</InButton>
      <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onSave">저장</InButton>
    </div>
    <InDataTable
      ref="grid"
      :columns="columns"
      :height="260"
      :options="{ rowHeaders: ['rowNum', 'checkbox'], bodyHeight: 200 }"
      retrieve-service-id="TST0002_00_R01"
      save-service-id="TST0002_00_S01"
      slot-name="ME_TST0002_02"
      :header="{ objectId: 'TST0002' }"
    />
  </div>
</template>
