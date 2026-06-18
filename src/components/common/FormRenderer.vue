<script setup>
/**
 * FormRenderer — 폼 메타(widgets[])를 12컬럼 CSS 그리드로 렌더 (런타임 — 메뉴 클릭 시 동작) (★ 2026-06-18, dspark)
 *
 * ⚠️ 원자 ui 아님 — common/. 디자이너(ScreenDesigner)가 저장한 메타를 실제 화면으로 그림.
 *   런타임은 드래그/리사이즈 불필요 → 의존성 0(CSS grid). 각 위젯은 ControlView(design=false)로 렌더.
 *   메타 스키마: { objectId, title, grid:{cols,rowHeight}, widgets:[{i,type,x,y,w,h,props}] }.
 */
import { computed } from 'vue';
import ControlView from '@/components/designer/ControlView.vue';

const props = defineProps({ meta: { type: Object, required: true } });
const cols = computed(() => props.meta.grid?.cols || 12);
const rowH = computed(() => props.meta.grid?.rowHeight || 40);
const widgets = computed(() => props.meta.widgets || []);
function cellStyle(w) { return { gridColumn: `${w.x + 1} / span ${w.w}`, gridRow: `${w.y + 1} / span ${w.h}` }; }
</script>

<template>
  <div class="fr" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: `${rowH}px` }">
    <div v-for="w in widgets" :key="w.i" class="fr__cell" :style="cellStyle(w)">
      <ControlView :widget="w" :design="false" />
    </div>
  </div>
</template>

<style scoped>
.fr { display: grid; gap: 8px; align-content: start; width: 100%; }
.fr__cell { min-width: 0; overflow: hidden; display: flex; }
</style>
