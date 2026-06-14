<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import InButton from '@/components/ui/InButton.vue';
import { ElSwitch } from 'element-plus';

// IBSheet DelCheck(행 체크 삭제) → sStatus='D' 프로토콜 시연.
//   행 헤더 체크박스를 켜고 [체크 삭제] → removeCheckedRows() 가 원본행을
//   삭제표시(deletedRows) 로 옮긴다. getDirty() 추출 시 그 행은 sStatus='D'.
//   ★ soft-delete 토글: 논리삭제 엔티티는 'D' 대신 sStatus='U' + sDelete='Y' 로 송신.
const grid = ref(null);
const soft = ref(false);
const dirtyJson = ref('(아직 없음 — 행 체크 후 [체크 삭제] → [dirty 확인])');

const columns = [
  { name: 'code', header: '코드', width: 100 },
  { name: 'name', header: '명칭', width: 160, editor: 'text' },
  { name: 'useYn', header: '사용', width: 90, align: 'center' },
];
// 원본(서버) 데이터 — 이 행을 삭제해야 deletedRows 로 추적되어 'D' 가 붙는다.
const data = ref([
  { code: 'C001', name: '재직', useYn: 'Y' },
  { code: 'C002', name: '휴직', useYn: 'Y' },
  { code: 'C003', name: '퇴직', useYn: 'N' },
]);

function removeChecked() {
  const removed = grid.value.removeCheckedRows();
  dirtyJson.value = removed.length
    ? `${removed.length}행 삭제 표시됨 — [dirty 확인] 을 눌러 sStatus 확인`
    : '체크된 행이 없습니다.';
}
// getDirty({ softDelete }) → envelope 송신 배열. 삭제행의 상태 플래그를 직접 보여준다.
function showDirty() {
  const dirty = grid.value.getDirty({ softDelete: soft.value });
  dirtyJson.value = JSON.stringify(dirty, null, 2);
}
</script>

<template>
  <div>
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
      <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="removeChecked">체크 삭제</InButton>
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="showDirty">dirty 확인</InButton>
      <label style="display:flex; gap:6px; align-items:center; font-size:13px;">
        soft-delete(논리삭제) <ElSwitch v-model="soft" />
      </label>
      <span style="font-size:12px; color:#888;">{{ soft ? "삭제행 → sStatus='U' + sDelete='Y'" : "삭제행 → sStatus='D'" }}</span>
    </div>
    <InDataTable
      ref="grid"
      :columns="columns"
      :data="data"
      :height="200"
      :options="{ rowHeaders: ['rowNum', 'checkbox'], bodyHeight: 160 }"
    />
    <pre style="margin-top:8px; font-size:12px; background:#f6f6f6; padding:10px; border-radius:6px; max-height:160px; overflow:auto;">{{ dirtyJson }}</pre>
  </div>
</template>
