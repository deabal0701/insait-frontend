<script setup>
/**
 * InMetaEnvelopePanel — 마지막 송신 envelope + 응답 raw JSON 표시 (개발자 디버그).
 *
 * AS-IS 운영자는 F12 DevTools Network 로 envelope 캡처 — Vue 재작성 시 마법사 내장.
 *
 * Figma 노드 ID = TBD
 */
import { computed } from 'vue';
import InMetaSidePanel from './InMetaSidePanel.vue';
import InMetaCodeBlock from './InMetaCodeBlock.vue';

const props = defineProps({
  envelope: { type: Object, default: null },
  response: { type: Object, default: null },
});

const envelopeJson = computed(() => props.envelope ? JSON.stringify(props.envelope, null, 2) : '');
const responseJson = computed(() => props.response ? JSON.stringify(props.response, null, 2) : '');

const resultType = computed(() => props.response?.HEADER?.resultType || '');
const tone = computed(() => {
  if (resultType.value === 'SUCCESS') return 'success';
  if (resultType.value === 'FAIL' || resultType.value === 'ERROR') return 'error';
  return 'default';
});
</script>

<template>
  <InMetaSidePanel
    title="Envelope debug"
    icon="info"
    :tone="tone"
    :default-open="false"
  >
    <div v-if="!envelope && !response" class="in-meta-env-panel__empty">
      이번 단계에서 송신한 envelope 가 아직 없습니다.
    </div>
    <div v-else class="in-meta-env-panel__sections">
      <div v-if="envelope" class="in-meta-env-panel__section">
        <h4 class="in-meta-env-panel__h">요청 envelope</h4>
        <InMetaCodeBlock lang="json" :code="envelopeJson" max-height="180px" />
      </div>
      <div v-if="response" class="in-meta-env-panel__section">
        <h4 class="in-meta-env-panel__h">
          응답 envelope
          <span v-if="resultType" class="in-meta-env-panel__result" :class="`in-meta-env-panel__result--${tone}`">{{ resultType }}</span>
        </h4>
        <InMetaCodeBlock lang="json" :code="responseJson" max-height="180px" />
      </div>
    </div>
  </InMetaSidePanel>
</template>

<style scoped>
.in-meta-env-panel__empty {
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}
.in-meta-env-panel__sections {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.in-meta-env-panel__h {
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--in-font-size-xs);
  line-height: var(--in-line-height-xs);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-subtle);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}
.in-meta-env-panel__result {
  padding: 1px 6px;
  border-radius: var(--in-radius-xxs);
  font-size: 10px;
  font-weight: var(--in-font-weight-medium);
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
.in-meta-env-panel__result--success { background: var(--in-surface-success, #e4faf0); color: var(--in-text-success); }
.in-meta-env-panel__result--error   { background: var(--in-surface-error, #fef2f2); color: var(--in-text-error); }
.in-meta-env-panel__result--default { background: var(--in-surface-default, #fafafa); color: var(--in-text-subtle); }
</style>
