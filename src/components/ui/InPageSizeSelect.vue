<script setup>
/**
 * InPageSizeSelect — 페이지당 표시 건수 셀렉터.
 * Figma 노드 ID = TBD (v2 InTableBottom 의 page-size selector 부분에 등가).
 *
 * 출처: design-system/v2 InTableBottom.vue 의 size selector 영역 패턴 모방
 *       (운영본은 단독 컴포넌트로 분리 — usePagedList 와 결합 친화).
 *
 * API:
 *   - v-model (modelValue = 현재 size)
 *   - options:  [10, 25, 50, 100, 200] 기본
 *   - label:    '페이지당'  (기본)
 *   - suffix:   '건'        (기본)
 *
 * 사용:
 *   <InPageSizeSelect v-model="list.size" @change="list.setSize" />
 */
import { computed } from 'vue';
import InSelect from '@/components/ui/InSelect.vue';

const props = defineProps({
  modelValue: { type: Number, default: 50 },
  options: { type: Array, default: () => [10, 25, 50, 100, 200] },
  label: { type: String, default: '페이지당' },
  suffix: { type: String, default: '건' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'change']);

const selectOptions = computed(() =>
  props.options.map((n) => ({ value: n, label: `${n}${props.suffix ? ' ' + props.suffix : ''}` }))
);

function onChange(v) {
  const n = Number(v);
  emit('update:modelValue', n);
  emit('change', n);
}
</script>

<template>
  <div class="in-pss" :class="{ 'in-pss--disabled': disabled }">
    <span v-if="label" class="in-pss__label">{{ label }}</span>
    <InSelect
      :model-value="modelValue"
      :options="selectOptions"
      :disabled="disabled"
      size="sm"
      @update:model-value="onChange"
    />
  </div>
</template>

<style scoped>
.in-pss {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--in-font-family-body);
}
.in-pss__label {
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-subtle);
}
.in-pss--disabled { opacity: 0.6; }
</style>
