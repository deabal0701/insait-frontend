<script setup>
/**
 * MetaCodeEditor — 메타 본문(SQL 등) 큰 텍스트 편집 textarea.
 * ★ (2026-06-05, dspark): IST0010 SQL 본문 편집에서 추출 (99 backlog #8). monospace + 세로 resize.
 * Figma 노드 ID = TBD.
 */
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  minHeight: { type: Number, default: 240 },
});
defineEmits(['update:modelValue']);
</script>

<template>
  <textarea
    class="meta-code"
    :value="modelValue"
    :placeholder="placeholder"
    :style="{ minHeight: minHeight + 'px' }"
    spellcheck="false"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<style scoped>
.meta-code {
  width: 100%; resize: vertical; box-sizing: border-box;
  padding: 12px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-mono, ui-monospace);
  font-size: var(--in-font-size-sm); line-height: var(--in-line-height-sm);
  color: var(--in-text-default); background: var(--in-bg-white);
}
</style>
