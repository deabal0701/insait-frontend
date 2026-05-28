// ★ (2026-05-27, dspark): tui-grid Vue 통합 composable — 가이드 05_composables §5 정합.
//   인스턴스 라이프사이클 (마운트·destroy) + 컬럼/데이터 바인딩 + dirty rows 추출.
//   P2 Step 9 진입 시 본격 사용. 현재 골격.
import { ref, onBeforeUnmount, shallowRef } from 'vue';
import { loadGrid } from '@/plugins/tui-grid';

/**
 * @param {object} opts
 * @param {Array}  opts.columns       tui-grid columns 정의
 * @param {Array}  [opts.data]        초기 row 배열
 * @param {object} [opts.options]     tui-grid 추가 옵션 (rowHeaders, pageOptions 등)
 */
export function useGrid(opts = {}) {
  const gridRef = ref(null);              // <div ref="gridRef">
  const instance = shallowRef(null);      // tui-grid 인스턴스 (non-reactive 보관)
  const rows = ref(opts.data || []);

  async function mount() {
    if (!gridRef.value) return;
    const Grid = await loadGrid();
    instance.value = new Grid({
      el: gridRef.value,
      columns: opts.columns || [],
      data: rows.value,
      ...(opts.options || {}),
    });
  }

  function setData(next) {
    rows.value = next || [];
    instance.value?.resetData(rows.value);
  }

  function getDirty() {
    if (!instance.value) return [];
    return instance.value.getModifiedRows
      ? [
          ...(instance.value.getModifiedRows().createdRows || []),
          ...(instance.value.getModifiedRows().updatedRows || []),
          ...(instance.value.getModifiedRows().deletedRows || []),
        ]
      : [];
  }

  function destroy() {
    if (instance.value?.destroy) instance.value.destroy();
    instance.value = null;
  }

  onBeforeUnmount(destroy);

  return { gridRef, instance, rows, mount, setData, getDirty, destroy };
}
