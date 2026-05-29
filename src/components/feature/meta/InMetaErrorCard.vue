<script setup>
/**
 * InMetaErrorCard — 메타 등록 실패 시 분류/힌트 카드.
 *
 * Figma 노드 ID = TBD
 *
 * 매뉴얼 99 §2.3 — AS-IS 의 압축된 에러 메시지 (FRM.ERRORMSG_0000/0002) 을
 * 분류별로 풀어 사용자에게 노출. classifyMetaError + getMetaErrorGuide 와 함께 사용.
 *
 * Tone:
 *  - 'error' (default) — 빨강. 일반 등록 실패
 *  - 'warning' — 노랑. SILENT_NOOP 등 모호한 상태 (등록은 됐는데 결과 미수신)
 *
 * Props:
 *   title: string
 *   hint: string
 *   category?: string — 분류 코드 (예: 'UNIQUE_VIOLATION')
 *   phase?: string — 다중 송신 실패 시 어느 phase 에서 실패했는지
 *   tone?: 'error' | 'warning'
 */
defineProps({
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  category: { type: String, default: '' },
  phase: { type: String, default: '' },
  tone: { type: String, default: 'error' },
});
</script>

<template>
  <div class="in-meta-err" :class="`in-meta-err--${tone}`">
    <h5 class="in-meta-err__title">{{ title }}</h5>
    <p v-if="hint" class="in-meta-err__hint">{{ hint }}</p>
    <p v-if="category || phase" class="in-meta-err__meta">
      <span v-if="category">분류: <code>{{ category }}</code></span>
      <span v-if="phase"> · 실패 단계: <code>{{ phase }}</code></span>
      <span v-if="!phase"> · 우측 "Envelope debug" 패널에서 응답 raw JSON 확인</span>
    </p>
  </div>
</template>

<style scoped>
.in-meta-err {
  padding: 12px 14px;
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
}
.in-meta-err--error {
  background: var(--in-surface-error, #fef2f2);
  border: 1px solid var(--in-text-error);
}
.in-meta-err--warning {
  background: var(--in-surface-warning, #fffbeb);
  border: 1px solid var(--in-text-warning);
}
.in-meta-err__title {
  margin: 0 0 4px;
  font-size: var(--in-font-size-md);
  font-weight: var(--in-font-weight-medium);
}
.in-meta-err--error .in-meta-err__title { color: var(--in-text-error); }
.in-meta-err--warning .in-meta-err__title { color: var(--in-text-warning); }
.in-meta-err__hint {
  margin: 0;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
  line-height: var(--in-line-height-sm);
}
.in-meta-err__meta {
  margin: 4px 0 0;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.in-meta-err__meta code {
  font-family: 'Consolas', monospace;
}
.in-meta-err--error .in-meta-err__meta code { color: var(--in-text-error); }
.in-meta-err--warning .in-meta-err__meta code { color: var(--in-text-warning); }
</style>
