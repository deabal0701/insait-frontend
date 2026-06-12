<script setup>
/**
 * MetaDefForm — 메타 카탈로그 "정의(def) 편집 폼" 공통 컴포넌트 (config 기반).
 * ★ (2026-06-06, dspark): 5개 카탈로그에 인라인 복붙되던 def 폼(InTextField/InSelect)을
 *   필드 descriptor 배열로 일반화. MetaChildGrid 와 동일한 config-driven 패턴.
 *   신규 화면 등록 마법사도 동일 폼을 재사용.
 *
 * 레이아웃: 기존 .form-grid(flex column gap 14px) + .form-row(field + hint gap 4px) 재현.
 *
 * 필드 descriptor (fields: []):
 *   { key, type:'text'|'select', label, input(placeholder),
 *     required?, disabled?, status?('default'|'error'), message?, hint?, options?(select) }
 *   - model[key] 양방향 바인딩 (model = 편집 대상 reactive 객체, 예: form.def)
 *   - status/message/hint/disabled 는 호출측 computed 로 mode·값에 따라 산출 가능
 *   - 특수 필드는 #field-<key> 슬롯으로 직접 렌더 (escape hatch)
 */
import InTextField from '@/components/ui/InTextField.vue';
import InSelect from '@/components/ui/InSelect.vue';

defineProps({
  model: { type: Object, required: true },
  fields: { type: Array, required: true },
});
</script>

<template>
  <div class="meta-def-form">
    <!-- ★ (2026-06-12, dspark): data-field 마커 — useMetaEditor.focusField(key) 가 검증 실패 필드를
         찾아 포커스하는 anchor. 마크업 시각 영향 0. -->
    <div v-for="f in fields" :key="f.key" class="meta-def-form__row" :data-field="f.key">
      <slot :name="`field-${f.key}`" :field="f" :model="model">
        <InSelect
          v-if="f.type === 'select'"
          :model-value="model[f.key]"
          :options="f.options || []"
          :label="f.label"
          :input="f.input"
          layout="vertical"
          :show-required="!!f.required"
          @update:model-value="(v) => { model[f.key] = v; }"
        />
        <InTextField
          v-else
          :model-value="model[f.key]"
          :label="f.label"
          :input="f.input"
          layout="vertical"
          :show-required="!!f.required"
          :disabled="!!f.disabled"
          :status="f.status || 'default'"
          :message="f.message"
          @update:model-value="(v) => { model[f.key] = v; }"
        />
      </slot>
      <p v-if="f.hint" class="meta-def-form__hint">{{ f.hint }}</p>
    </div>
  </div>
</template>

<style scoped>
.meta-def-form { display: flex; flex-direction: column; gap: 14px; }
.meta-def-form__row { display: flex; flex-direction: column; gap: 4px; }
.meta-def-form__hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
