<script setup>
/**
 * InSearchField — Figma 3240:181651 / 단일 variant 3240:181937
 * Figma 노드 ID = 3240:181651
 *
 * 출처: design-system/v2/src/components/ui/InSearchField.vue (Plain JS 변환, 2026-06-03)
 *
 * 시각: 밑줄형 + grey bg + 우측 search 아이콘
 * API: v-model + label + input(placeholder) + layout + color + size + disabled/readonly
 * emits: update:modelValue / search (Enter 키)
 */
import { computed } from 'vue';
import SearchIcon from '@/assets/icons/search.svg';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Label' },
  input: { type: String, default: 'Search' },           // placeholder (Figma prop)
  showLabel: { type: Boolean, default: true },
  showRequired: { type: Boolean, default: false },
  layout: { type: String, default: 'horizontal' },      // horizontal / vertical
  color: { type: String, default: 'default' },          // default / white
  size: { type: String, default: 'md' },                // sm / md / lg
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  // ★ (2026-06-05, dspark): 돋보기 아이콘 클릭으로 검색 발화 여부. false 면 장식(비클릭).
  //   별도 [조회] 버튼이 있는 카탈로그에선 false 로 둬 검색 트리거 중복/혼란 제거.
  iconClickable: { type: Boolean, default: true },
  helper: { type: String, default: '' },
  message: { type: String, default: '' },
  labelWidth: { type: [Number, String], default: 85 },
});

const emit = defineEmits(['update:modelValue', 'search']);

const elSize = computed(() => {
  if (props.size === 'sm') return 'small';
  if (props.size === 'lg') return 'large';
  return 'default';
});

const labelWidthValue = computed(() => {
  if (props.layout !== 'horizontal') return undefined;
  return typeof props.labelWidth === 'number' ? `${props.labelWidth}px` : props.labelWidth;
});

function onEnter(e) {
  if (props.disabled) return;
  emit('search', e?.target?.value ?? '');
}

const message = computed(() => props.message || props.helper);
</script>

<template>
  <div
    class="in-sf"
    :class="[
      `in-sf--${layout}`,
      `in-sf--c-${color}`,
      `in-sf--${size}`,
      { 'in-sf--disabled': disabled, 'in-sf--readonly': readonly },
    ]"
    :style="layout === 'horizontal' ? { '--in-sf-label-width': labelWidthValue } : undefined"
  >
    <div class="in-sf__row">
      <div v-if="showLabel" class="in-sf__label">
        <span class="in-sf__label-text">{{ label }}</span>
        <span v-if="showRequired" class="in-sf__req" aria-hidden="true">*</span>
      </div>
      <div class="in-sf__control">
        <el-input
          :model-value="modelValue"
          :placeholder="input"
          :size="elSize"
          :disabled="disabled"
          :readonly="readonly"
          @update:model-value="(v) => $emit('update:modelValue', v)"
          @keyup.enter="onEnter"
        >
          <template #suffix>
            <!-- ★ (2026-06-03, dspark): 검색 아이콘 클릭 시에도 검색 발화 (Enter 와 동일 emit).
                 ★ (2026-06-05, dspark): iconClickable=false 면 장식 span (별도 [조회] 버튼 화면용). -->
            <button
              v-if="iconClickable"
              type="button"
              class="in-sf__icon-btn"
              :disabled="disabled"
              :aria-label="'검색'"
              @click="onEnter({ target: { value: modelValue } })"
            >
              <span class="in-sf__icon" aria-hidden="true">
                <img :src="SearchIcon" alt="" />
              </span>
            </button>
            <span v-else class="in-sf__icon" aria-hidden="true">
              <img :src="SearchIcon" alt="" />
            </span>
          </template>
        </el-input>
      </div>
    </div>
    <span v-if="message" class="in-sf__msg">{{ message }}</span>
  </div>
</template>

<style scoped>
.in-sf { font-family: var(--in-font-family-body); display: flex; flex-direction: column; gap: 4px; }
.in-sf--horizontal .in-sf__row { display: flex; align-items: center; gap: 10px; }
.in-sf--horizontal .in-sf__label {
  min-width: var(--in-sf-label-width, 85px);
  width: var(--in-sf-label-width, 85px);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 16px;
}
.in-sf--vertical .in-sf__row { display: flex; flex-direction: column; gap: 4px; }
.in-sf__label-text {
  color: var(--in-text-accent);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
  font-weight: var(--in-font-weight-regular);
  letter-spacing: var(--in-letter-spacing-md);
}
.in-sf__req {
  margin-left: 2px;
  color: var(--in-text-error);
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
}
.in-sf__control { flex: 1 1 0; min-width: 0; display: flex; }
.in-sf :deep(.el-input) { flex: 1 1 0; min-width: 0; }
.in-sf :deep(.el-input__wrapper) {
  background: var(--in-surface-default);
  box-shadow: none !important;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--in-border-input);
  height: 30px;
  padding: 0 12px;
  gap: 8px;
}
.in-sf :deep(.el-input__inner) {
  color: var(--in-text-accent);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-md);
  line-height: var(--in-line-height-md);
}
.in-sf :deep(.el-input__inner::placeholder) { color: var(--in-text-subtler); }
.in-sf :deep(.el-input__wrapper:hover):not(:focus-within) { border-bottom-color: var(--in-text-default); }
.in-sf :deep(.el-input__wrapper:focus-within) { border-bottom-color: var(--in-border-brand); }
.in-sf__icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; }
.in-sf__icon img { width: 100%; height: 100%; display: block; }
/* ★ (2026-06-03, dspark): 검색 아이콘 클릭 버튼 — background 없이 hover 시 opacity 변화. */
.in-sf__icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 0; padding: 0; margin: 0;
  cursor: pointer; line-height: 0; color: inherit;
}
.in-sf__icon-btn:hover:not(:disabled) { opacity: 0.7; }
.in-sf__icon-btn:disabled { cursor: not-allowed; opacity: 0.5; }
.in-sf--c-white :deep(.el-input__wrapper) { background: var(--in-surface-white); }
.in-sf--disabled :deep(.el-input__wrapper) {
  background: var(--in-bg-state-disabled);
  border-bottom-color: var(--in-border-state-disabled);
}
.in-sf--readonly :deep(.el-input__wrapper) { background: var(--in-surface-default); }
.in-sf__msg { font-size: 11px; line-height: 16px; color: var(--in-text-subtle); }
</style>
