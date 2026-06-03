<script setup>
/**
 * InPagination — Figma 6239:385102 (Navigation/Pagination)
 * Figma 노드 ID = 6239:385102
 *
 * 출처: design-system/v2/src/components/ui/InPagination.vue (Plain JS 변환, 2026-06-03)
 *
 * sub-components:
 *   - PageItem  (3 state): Enabled / Active / Disabled
 *   - PageButton(3 state) × 2 type: Prev / Next
 *
 * Vue 표준 API:
 *   - v-model (modelValue = currentPage, 1-based)
 *   - props:  pageSize · total · maxVisible · disabled
 *   - emits:  update:modelValue · change(page)
 *   - 페이지 수 max 초과 시 ellipsis (…) 자동 삽입
 */
import { computed } from 'vue';
import ArrowLeftIcon from '@/assets/icons/arrow-left.svg';
import ArrowRightIcon from '@/assets/icons/arrow-right.svg';

const props = defineProps({
  modelValue: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
  maxVisible: { type: Number, default: 7 },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'change']);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

const pages = computed(() => {
  const tp = totalPages.value;
  const cur = props.modelValue;
  const max = Math.max(5, props.maxVisible);

  if (tp <= max) return Array.from({ length: tp }, (_, i) => i + 1);

  const side = Math.max(1, Math.floor((max - 3) / 2));
  const result = [];
  const startWindow = Math.max(2, cur - side);
  const endWindow = Math.min(tp - 1, cur + side);

  result.push(1);
  if (startWindow > 2) result.push('ellipsis');
  for (let i = startWindow; i <= endWindow; i++) result.push(i);
  if (endWindow < tp - 1) result.push('ellipsis');
  result.push(tp);
  return result;
});

function go(p) {
  if (props.disabled) return;
  if (p < 1 || p > totalPages.value) return;
  if (p === props.modelValue) return;
  emit('update:modelValue', p);
  emit('change', p);
}

const prevDisabled = computed(() => props.disabled || props.modelValue <= 1);
const nextDisabled = computed(() => props.disabled || props.modelValue >= totalPages.value);
</script>

<template>
  <nav class="in-pg" role="navigation" aria-label="Pagination">
    <button
      type="button"
      class="in-pg__btn"
      :class="{ 'in-pg__btn--disabled': prevDisabled }"
      :disabled="prevDisabled"
      aria-label="Previous page"
      @click="go(modelValue - 1)"
    >
      <img :src="ArrowLeftIcon" alt="" class="in-pg__icon" />
    </button>

    <ul class="in-pg__num" role="list">
      <li v-for="(p, idx) in pages" :key="`${p}-${idx}`" class="in-pg__num-item">
        <span v-if="p === 'ellipsis'" class="in-pg__ellipsis" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="in-pg__item"
          :class="{
            'in-pg__item--active': p === modelValue && !disabled,
            'in-pg__item--disabled': disabled,
          }"
          :aria-current="p === modelValue ? 'page' : undefined"
          :disabled="disabled"
          @click="go(p)"
        >{{ p }}</button>
      </li>
    </ul>

    <button
      type="button"
      class="in-pg__btn"
      :class="{ 'in-pg__btn--disabled': nextDisabled }"
      :disabled="nextDisabled"
      aria-label="Next page"
      @click="go(modelValue + 1)"
    >
      <img :src="ArrowRightIcon" alt="" class="in-pg__icon" />
    </button>
  </nav>
</template>

<style scoped>
.in-pg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.in-pg__num {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.in-pg__num-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.in-pg__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--in-radius-full);
  cursor: pointer;
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  letter-spacing: var(--in-letter-spacing-md);
  font-weight: var(--in-font-weight-regular);
  color: var(--in-text-accent);
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.in-pg__item:hover:not(:disabled):not(.in-pg__item--active) {
  background: var(--in-surface-state-default);
}
.in-pg__item--active {
  background: var(--in-bg-info-default);
  border-color: var(--in-border-brand);
  color: var(--in-text-brand);
  font-weight: var(--in-font-weight-medium);
}
.in-pg__item--disabled {
  background: var(--in-surface-state-disabled);
  border-color: var(--in-border-state-disabled);
  color: var(--in-text-info-disabled);
  cursor: not-allowed;
}
.in-pg__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--in-text-subtle);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  user-select: none;
}
.in-pg__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--in-bg-white);
  border: 1px solid var(--in-border-neutral);
  border-radius: var(--in-radius-full);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.in-pg__btn:hover:not(:disabled) {
  background: var(--in-bg-brand);
  border-color: var(--in-border-brand);
}
.in-pg__btn:hover:not(:disabled) .in-pg__icon {
  filter: brightness(0) invert(1);
}
.in-pg__btn--disabled {
  background: var(--in-bg-info-disabled);
  border-color: var(--in-border-state-disabled);
  cursor: not-allowed;
}
.in-pg__btn--disabled .in-pg__icon {
  opacity: 0.5;
}
.in-pg__icon {
  width: 16px;
  height: 16px;
  display: block;
  transition: filter 120ms ease, opacity 120ms ease;
}
</style>
