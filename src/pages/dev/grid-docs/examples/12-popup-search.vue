<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// IBSheet Type:Popup (사원/부서/코드 검색 팝업 → 선택값 셀 주입) 대응.
//   셀 버튼(renderer) 클릭 → 검색 모달 → 선택 행을 grid.setValue 로 주입.
const grid = ref(null);
const picker = ref({ open: false, rowKey: null });
const EMP_BOOK = [
  { empNo: 'E001', empNm: '김인사', org: '인사팀' },
  { empNo: 'E002', empNm: '이개발', org: '개발팀' },
  { empNo: 'E021', empNm: '정프론', org: '개발팀' },
];

class PickerRenderer {
  constructor(props) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = '🔍 검색';
    el.style.cssText = 'padding:2px 8px;border:1px solid #ccc;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      props.columnInfo.renderer.options.onPick(props.rowKey);
    });
    this.el = el;
  }
  getElement() { return this.el; }
  render() {}
}

const columns = [
  { name: 'empNo', header: '사번', width: 100 },
  { name: 'empNm', header: '이름', width: 120 },
  { name: 'org',   header: '부서', width: 120 },
  { name: '_pick', header: '선택', width: 90, align: 'center',
    renderer: { type: PickerRenderer, options: { onPick: (rowKey) => { picker.value = { open: true, rowKey }; } } } },
];
const data = ref([{ empNo: '', empNm: '', org: '' }]);

function choose(emp) {
  const g = grid.value.getInstance();
  const rk = picker.value.rowKey;
  g.setValue(rk, 'empNo', emp.empNo);
  g.setValue(rk, 'empNm', emp.empNm);
  g.setValue(rk, 'org', emp.org);
  picker.value.open = false;
}
</script>

<template>
  <div style="position:relative;">
    <InDataTable ref="grid" :columns="columns" :data="data" :height="160"
      :options="{ rowHeaders: ['rowNum'], bodyHeight: 120 }" />

    <div v-if="picker.open" style="position:absolute;inset:0;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:8px;padding:12px;min-width:240px;box-shadow:0 8px 24px rgba(0,0,0,.2);">
        <strong style="font-size:13px;">사원 검색</strong>
        <ul style="list-style:none;margin:8px 0 0;padding:0;">
          <li v-for="e in EMP_BOOK" :key="e.empNo"
            style="padding:6px 8px;cursor:pointer;border-radius:4px;"
            @mouseover="(ev)=>ev.target.style.background='#f5fbff'"
            @mouseout="(ev)=>ev.target.style.background='transparent'"
            @click="choose(e)">{{ e.empNo }} · {{ e.empNm }} ({{ e.org }})</li>
        </ul>
        <button type="button" style="margin-top:8px;font-size:12px;" @click="picker.open=false">닫기</button>
      </div>
    </div>
  </div>
</template>
