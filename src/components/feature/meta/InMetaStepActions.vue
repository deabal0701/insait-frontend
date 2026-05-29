<script setup>
/**
 * InMetaStepActions — 마법사 step 의 하단 액션 영역 (등록 + 우회 + 완료/에러 상태).
 *
 * Figma 노드 ID = TBD
 *
 * Step2~5 공통: 메타 등록 primary 버튼 + "학습 모드로 건너뛰기" text 버튼 +
 *              완료 상태 표시 (OID + check 아이콘) 또는 진행 중 표시.
 *
 * Props:
 *   submitLabel: string (default '메타 등록')
 *   submittingLabel: string (default '등록 중…')
 *   skipLabel: string (default '백엔드 미연결 — 학습 모드로 건너뛰기')
 *   status: 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped'
 *   canSubmit: boolean
 *   canSkip: boolean
 *   successLabel?: string — completed 시 표시할 텍스트 (예: 'OID: 12345')
 *
 * Emits:
 *   submit / skip
 */
import InButton from '@/components/ui/InButton.vue';
import InIcon from '@/components/ui/InIcon.vue';

defineProps({
  submitLabel: { type: String, default: '메타 등록' },
  submittingLabel: { type: String, default: '등록 중…' },
  skipLabel: { type: String, default: '백엔드 미연결 — 학습 모드로 건너뛰기' },
  status: { type: String, default: 'pending' },
  canSubmit: { type: Boolean, default: false },
  canSkip: { type: Boolean, default: true },
  successLabel: { type: String, default: '' },
});
defineEmits(['submit', 'skip']);
</script>

<template>
  <div class="in-meta-step-actions">
    <InButton
      variant="primary"
      size="md"
      :left-icon-show="false"
      :right-icon-show="false"
      :disabled="!canSubmit || status === 'in_progress'"
      @click="$emit('submit')"
    >
      {{ status === 'in_progress' ? submittingLabel : submitLabel }}
    </InButton>
    <InButton
      variant="text"
      size="sm"
      :left-icon-show="false"
      :right-icon-show="false"
      :disabled="!canSkip"
      @click="$emit('skip')"
    >
      {{ skipLabel }}
    </InButton>
    <span v-if="status === 'completed'" class="in-meta-step-actions__success">
      <InIcon name="check-circle" :size="14" />
      <slot name="success">{{ successLabel || '등록 완료' }}</slot>
    </span>
  </div>
</template>

<style scoped>
.in-meta-step-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
  flex-wrap: wrap;
  font-family: var(--in-font-family-body);
}
.in-meta-step-actions__success {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-success);
}
</style>
