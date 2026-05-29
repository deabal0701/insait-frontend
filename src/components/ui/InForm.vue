<script setup>
import { provide, toRef } from 'vue';
import { FormContextKey } from './form-context-key.js';

/**
 * InForm — Figma 노드 ID = TBD (design-system v2 에 미정의, v1 SSOT)
 *
 * 출처: design-system/v1/src/components/ui/InForm.vue (Plain JS 변환)
 *
 * TODO(Figma 정합): v2 카탈로그에 Form 진본 정의 시 노드 ID 추가.
 *   v1 패턴 — provide/inject 컨텍스트 (layout/labelWidth/density/disabled) 를 자손
 *   InFormItem 으로 전달. 검증 자동화 없음 — 사용처에서 error prop 으로 메시지 전달.
 *
 * NATIVE 구현 — el-form 미사용 (v1 SSOT 정합).
 *
 * 사용 예:
 *   <InForm layout="horizontal" labelWidth="100px" density="compact" @submit="save">
 *     <InFormItem label="이름" required :error="errors.name">
 *       <InTextField v-model="state.name" />
 *     </InFormItem>
 *   </InForm>
 */

const props = defineProps({
  layout: {
    type: String,
    default: 'vertical',
    validator: (v) => ['vertical', 'horizontal'].includes(v),
  },
  labelWidth: { type: String, default: '120px' },
  density: {
    type: String,
    default: 'comfortable',
    validator: (v) => ['compact', 'comfortable'].includes(v),
  },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['submit']);

provide(FormContextKey, {
  layout: toRef(props, 'layout'),
  labelWidth: toRef(props, 'labelWidth'),
  density: toRef(props, 'density'),
  disabled: toRef(props, 'disabled'),
});

const onSubmit = (e) => emit('submit', e);
</script>

<template>
  <form
    :class="['in-form', `in-form--${layout}`, `in-form--${density}`]"
    @submit.prevent="onSubmit"
  >
    <slot />
  </form>
</template>

<style scoped>
.in-form {
  display: flex;
  flex-direction: column;
  font-family: var(--in-font-family-body);
}
.in-form--comfortable { gap: 16px; }
.in-form--compact { gap: 10px; }
</style>
