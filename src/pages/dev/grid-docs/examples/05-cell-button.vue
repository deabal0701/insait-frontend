<script setup>
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

// 셀 안 버튼 = IBSheet Type:Html/Button(셀 버튼)·Popup 대응.
//   tui-grid CellRenderer 클래스를 column.renderer.type 에 지정.
class ButtonCellRenderer {
  constructor(props) {
    const el = document.createElement('button');
    el.type = 'button';
    const opt = props.columnInfo.renderer.options || {};
    el.textContent = opt.label || '버튼';
    el.style.cssText = 'padding:2px 10px;border:1px solid var(--in-brand,#13a9e9);'
      + 'border-radius:4px;background:#fff;color:var(--in-brand,#13a9e9);cursor:pointer;font-size:12px;';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      opt.onClick?.(props.grid.getRow(props.rowKey), props.rowKey);
    });
    this.el = el;
  }
  getElement() { return this.el; }
  render() {}
}

const columns = [
  { name: 'empNo', header: '사번', width: 100 },
  { name: 'name',  header: '이름', width: 130 },
  {
    name: '_view', header: '상세', width: 100, align: 'center',
    renderer: { type: ButtonCellRenderer, options: { label: '보기',
      onClick: (row) => toast.info(row.name + ' 상세 (팝업 호출 위치)') } },
  },
];
const data = ref([
  { empNo: 'E001', name: '김인사' },
  { empNo: 'E002', name: '이개발' },
]);
</script>

<template>
  <InDataTable
    :columns="columns"
    :data="data"
    :height="200"
    :options="{ rowHeaders: ['rowNum'], bodyHeight: 160 }"
  />
</template>
