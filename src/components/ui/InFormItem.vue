<script setup>
import { computed, inject } from 'vue';
import { FormContextKey } from './form-context-key.js';

/**
 * InFormItem — Figma 노드 ID = TBD (design-system v2 에 미정의, v1 SSOT)
 *
 * 출처: design-system/v1/src/components/ui/InFormItem.vue (Plain JS 변환)
 *
 * TODO(Figma 정합): v2 카탈로그에 FormItem 진본 정의 시 노드 ID 추가.
 *
 * NATIVE 구현 — el-form-item 미사용 (v1 SSOT 정합).
 *
 * 검증:
 *   - error prop 에 메시지 문자열을 사용처가 직접 전달 (외부 검증 결과)
 *   - help prop 은 입력 가이드 (error 와 동시 표시되지 않음 — error 우선)
 *
 *   <InFormItem label="이메일" required :error="errors.email" help="회사 도메인만 가능">
 *     <InTextField v-model="state.email" />
 *   </InFormItem>
 */

const props = defineProps({
  label: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  error: { type: String, default: undefined },
  help: { type: String, default: undefined },
  layout: {
    type: String,
    default: undefined,
    validator: (v) => v === undefined || ['vertical', 'horizontal'].includes(v),
  },
  labelWidth: { type: String, default: undefined },
  hideLabel: { type: Boolean, default: false },
});

const ctx = inject(FormContextKey, null);

const layout = computed(() => props.layout ?? ctx?.layout.value ?? 'vertical');
const labelWidth = computed(() => props.labelWidth ?? ctx?.labelWidth.value ?? '120px');
</script>

<template>
  <div :class="['in-fi', `in-fi--${layout}`, { 'in-fi--has-error': error }]">
    <label
      v-if="label && !hideLabel"
      class="in-fi__label"
      :style="layout === 'horizontal' ? { width: labelWidth } : {}"
    >
      <span>{{ label }}</span>
      <span v-if="required" class="in-fi__req" aria-hidden="true">*</span>
    </label>
    <div class="in-fi__field">
      <slot />
      <p v-if="error" class="in-fi__error">{{ error }}</p>
      <p v-else-if="help" class="in-fi__help">{{ help }}</p>
    </div>
  </div>
</template>

<style scoped>
.in-fi {
  display: flex;
  font-family: var(--in-font-family-body);
}
.in-fi--vertical { flex-direction: column; gap: 4px; }
.in-fi--horizontal { flex-direction: row; align-items: flex-start; gap: 10px; }

.in-fi__label {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 13px;
  line-height: 20px;
  letter-spacing: -0.1px;
  color: var(--in-text-accent);
}
.in-fi--horizontal .in-fi__label { padding-top: 6px; }
.in-fi__req {
  margin-left: 2px;
  color: var(--in-text-error);
  font-size: 12px;
}

.in-fi__field {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.in-fi__error {
  margin: 0;
  font-size: 12px;
  line-height: 19px;
  color: var(--in-text-error);
}
.in-fi__help {
  margin: 0;
  font-size: 12px;
  line-height: 19px;
  color: var(--in-text-subtle);
}
</style>
