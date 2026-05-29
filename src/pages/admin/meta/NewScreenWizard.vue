<script setup>
/**
 * NewScreenWizard — 메타관리 신규 화면 등록 마법사 진입점.
 *
 * URL: /admin/meta/new
 *
 * 책임:
 *  - 5 Step (idGate → sql → message → entity → service) 순차 진행
 *  - store (metaWizard) 의 상태를 stepper + 우측 사이드 패널에 반영
 *  - 각 step 컴포넌트는 store 만 참조 (props drilling 없음)
 *
 * Phase 1 진행 단계: P0 (본 파일 = shell), P1~P5 (각 step 내용 채움)
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useMetaWizardStore, WIZARD_STEPS } from '@/stores/metaWizard';

import InMetaWizardLayout from '@/components/feature/meta/InMetaWizardLayout.vue';
import InMetaStepper from '@/components/feature/meta/InMetaStepper.vue';
import InMetaConventionHint from '@/components/feature/meta/InMetaConventionHint.vue';
import InMetaEnvelopePanel from '@/components/feature/meta/InMetaEnvelopePanel.vue';
import InMetaVerifyPanel from '@/components/feature/meta/InMetaVerifyPanel.vue';
import InButton from '@/components/ui/InButton.vue';
import InBadge from '@/components/ui/InBadge.vue';

import Step1IdGate from './steps/Step1IdGate.vue';
import Step2Sql from './steps/Step2Sql.vue';
import Step3Message from './steps/Step3Message.vue';
import Step4Entity from './steps/Step4Entity.vue';
import Step5Service from './steps/Step5Service.vue';

const router = useRouter();
const store = useMetaWizardStore();
// ★ (2026-05-29, dspark): WIZARD_STEPS 는 frozen array (plain value) 라 storeToRefs 가 skip → undefined.
//   직접 import 로 사용. ref/computed/reactive 만 storeToRefs 로 destructure.
const {
  currentStepId,
  currentVerifyQueries,
  stepStatuses,
  derivedIds,
  requiresEntity,
  sqlStep,
  messageStep,
  entityStep,
  serviceStep,
  idGate,
} = storeToRefs(store);

const stepComponentMap = {
  idGate: Step1IdGate,
  sql: Step2Sql,
  message: Step3Message,
  entity: Step4Entity,
  service: Step5Service,
};

const CurrentStepComp = computed(() => stepComponentMap[currentStepId.value] || null);

const currentStepMeta = computed(() => {
  const cur = WIZARD_STEPS.find((s) => s.id === currentStepId.value);
  return cur || WIZARD_STEPS[0];
});

const oids = computed(() => ({
  sql: sqlStep.value.insertedOid,
  msgIn: messageStep.value.insertedOid?.in || null,
  msgOut: messageStep.value.insertedOid?.out || null,
  entity: entityStep.value.insertedOid,
  service: serviceStep.value.insertedOid,
  object: serviceStep.value.insertedOid ? null : null,
}));

const currentStepStateObj = computed(() => {
  switch (currentStepId.value) {
    case 'idGate':  return idGate.value;
    case 'sql':     return sqlStep.value;
    case 'message': return messageStep.value;
    case 'entity':  return entityStep.value;
    case 'service': return serviceStep.value;
    default: return null;
  }
});

function navigate(stepId) {
  store.goTo(stepId);
}

function goPrev() {
  const order = WIZARD_STEPS.map((s) => s.id);
  const idx = order.indexOf(currentStepId.value);
  for (let i = idx - 1; i >= 0; i--) {
    const id = order[i];
    if (id === 'entity' && !requiresEntity.value) continue;
    store.goTo(id);
    return;
  }
}

function goNext() {
  const order = WIZARD_STEPS.map((s) => s.id);
  const idx = order.indexOf(currentStepId.value);
  for (let i = idx + 1; i < order.length; i++) {
    const id = order[i];
    if (id === 'entity' && !requiresEntity.value) continue;
    if (store.goTo(id)) return;
  }
}

function onReset() {
  if (!confirm('마법사 진행 상태를 모두 초기화합니다. 계속할까요?')) return;
  store.reset();
}

function onClose() {
  router.push({ name: 'AUT0030' });
}

const canGoNext = computed(() => {
  const id = currentStepId.value;
  return stepStatuses.value[id] === 'completed';
});
const canGoPrev = computed(() => currentStepId.value !== 'idGate');
</script>

<template>
  <InMetaWizardLayout
    title="신규 화면 등록 마법사"
    :subtitle="`현재 단계: ${currentStepMeta.label} — ${currentStepMeta.description}`"
  >
    <template #header-meta>
      <InBadge v-if="store.screenId" state="primary" :label="store.screenId" />
      <InBadge v-if="store.cmdInfo" state="success" :label="store.cmdInfo.label" />
      <InButton variant="text" size="sm" :left-icon-show="false" :right-icon-show="false" @click="onReset">초기화</InButton>
      <InButton variant="default" size="sm" :left-icon-show="false" :right-icon-show="false" @click="onClose">닫기</InButton>
    </template>

    <template #stepper>
      <InMetaStepper
        :steps="WIZARD_STEPS"
        :statuses="stepStatuses"
        :current="currentStepId"
        @navigate="navigate"
      />
    </template>

    <component v-if="CurrentStepComp" :is="CurrentStepComp" />
    <div v-else class="new-screen-wizard__empty">단계 컴포넌트 로딩 실패.</div>

    <template #side>
      <InMetaConventionHint :ids="derivedIds" :step-statuses="stepStatuses" :oids="oids" :requires-entity="requiresEntity" />
      <InMetaEnvelopePanel
        :envelope="currentStepStateObj?.lastEnvelope"
        :response="currentStepStateObj?.lastResponse"
      />
      <InMetaVerifyPanel :queries="currentVerifyQueries" />
    </template>

    <template #footer>
      <InButton
        variant="default"
        size="md"
        :left-icon-show="true"
        :right-icon-show="false"
        :disabled="!canGoPrev"
        @click="goPrev"
      >
        이전
      </InButton>
      <InButton
        variant="primary"
        size="md"
        :left-icon-show="false"
        :right-icon-show="true"
        :disabled="!canGoNext"
        @click="goNext"
      >
        다음 단계로
      </InButton>
    </template>
  </InMetaWizardLayout>
</template>

<style scoped>
.new-screen-wizard__empty {
  padding: 40px;
  text-align: center;
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-sm);
}
</style>
