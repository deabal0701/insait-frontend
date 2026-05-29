<script setup>
/**
 * InMetaCodeBlock — 코드/SQL/JSON 표시 + 복사 버튼.
 *
 * Figma 노드 ID = TBD
 *
 * 마법사 우측 사이드 패널에서 SQL/envelope/검증SQL 표시에 공통 사용.
 * 텍스트 자체는 readonly. 인터랙티브 편집은 별도 SQL 에디터 컴포넌트.
 *
 * Props:
 *   code: string
 *   lang?: 'sql'|'json'|'text' (시각만 — 실제 syntax highlight 는 미적용, 추후 highlight.js 도입 검토)
 *   maxHeight?: string (default '200px')
 */
import { ref } from 'vue';
import InIcon from '@/components/ui/InIcon.vue';

const props = defineProps({
  code: { type: String, required: true },
  lang: { type: String, default: 'text', validator: (v) => ['sql', 'json', 'text'].includes(v) },
  maxHeight: { type: String, default: '200px' },
});

const copied = ref(false);
async function copy() {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  } catch {
    // clipboard 미지원 환경 — 무시
  }
}
</script>

<template>
  <div class="in-meta-code" :class="`in-meta-code--${lang}`">
    <button type="button" class="in-meta-code__copy" :title="copied ? '복사 완료' : '복사'" @click="copy">
      <InIcon :name="copied ? 'check' : 'content-copy'" :size="12" />
    </button>
    <pre class="in-meta-code__pre" :style="{ maxHeight }"><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.in-meta-code {
  position: relative;
  background: var(--in-surface-default, #fafafa);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-family: 'Consolas', 'Menlo', 'Source Code Pro', monospace;
  font-size: var(--in-font-size-xs);
  line-height: 1.5;
  overflow: hidden;
}

.in-meta-code__pre {
  margin: 0;
  padding: 10px 32px 10px 10px;
  overflow: auto;
  white-space: pre;
  color: var(--in-text-default);
}

.in-meta-code__copy {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  cursor: pointer;
  color: var(--in-text-subtle);
  transition: color 120ms ease, background 120ms ease;
}

.in-meta-code__copy:hover {
  color: var(--in-text-accent);
  background: var(--in-surface-default, #fafafa);
}

.in-meta-code__copy:focus-visible {
  outline: var(--in-focus-ring-style, solid) var(--in-focus-ring-width, 2px) var(--in-focus-ring-color, var(--in-brand));
  outline-offset: 1px;
}

/* lang variants — 추후 highlight.js 도입 시 토큰별 색상 적용 */
.in-meta-code--sql code,
.in-meta-code--json code { color: var(--in-text-accent); }
</style>
