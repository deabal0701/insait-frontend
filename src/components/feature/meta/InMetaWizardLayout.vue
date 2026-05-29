<script setup>
/**
 * InMetaWizardLayout — 마법사 5-Step 공통 레이아웃.
 *
 * 구조:
 *   ┌────────────────────────────────────────────────────────┐
 *   │ Header (제목 + 상태 칩 + reset)                          │
 *   ├────────────────────────────────────────────────────────┤
 *   │ Stepper (5 step progress)                              │
 *   ├──────────────────────────────────┬─────────────────────┤
 *   │ Main (slot — 좌측 폼)            │ Side (slot — 우측 패널) │
 *   │                                  │ - 컨벤션 미리보기      │
 *   │                                  │ - envelope debug      │
 *   │                                  │ - 검증 SQL            │
 *   ├──────────────────────────────────┴─────────────────────┤
 *   │ Footer (slot — 이전/다음/저장 버튼)                       │
 *   └────────────────────────────────────────────────────────┘
 *
 * Figma 노드 ID = TBD (메타관리 특화 — 추후 정합)
 *
 * v2 의 Page 레이아웃과 카드 시각 어휘를 따른다: 흰 surface + border-default + radius-sm.
 *
 * Props:
 *   title: string — 마법사 제목
 *   subtitle?: string
 *   sideOpen?: boolean (default true) — 우측 패널 표시
 *
 * Slots:
 *   default — 좌측 메인 폼
 *   side — 우측 사이드바
 *   footer — 하단 액션 영역
 *   header-meta — 헤더 우측 메타 (옵션)
 */
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  sideOpen: { type: Boolean, default: true },
});
defineEmits(['toggle-side']);
</script>

<template>
  <div class="in-meta-wizard-layout">
    <header class="in-meta-wizard-layout__header">
      <div class="in-meta-wizard-layout__heading">
        <h2 class="in-meta-wizard-layout__title">{{ title }}</h2>
        <p v-if="subtitle" class="in-meta-wizard-layout__subtitle">{{ subtitle }}</p>
      </div>
      <div class="in-meta-wizard-layout__header-meta">
        <slot name="header-meta" />
      </div>
    </header>

    <div v-if="$slots.stepper" class="in-meta-wizard-layout__stepper">
      <slot name="stepper" />
    </div>

    <div class="in-meta-wizard-layout__body" :class="{ 'in-meta-wizard-layout__body--side-open': sideOpen }">
      <main class="in-meta-wizard-layout__main">
        <slot />
      </main>
      <aside v-if="sideOpen" class="in-meta-wizard-layout__side">
        <slot name="side" />
      </aside>
    </div>

    <footer v-if="$slots.footer" class="in-meta-wizard-layout__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.in-meta-wizard-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  font-family: var(--in-font-family-body);
}

.in-meta-wizard-layout__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--in-border-default);
}

.in-meta-wizard-layout__heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.in-meta-wizard-layout__title {
  margin: 0;
  font-size: var(--in-font-size-2xl);
  line-height: var(--in-line-height-2xl);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: var(--in-letter-spacing-2xl);
}

.in-meta-wizard-layout__subtitle {
  margin: 0;
  font-size: var(--in-font-size-sm);
  line-height: var(--in-line-height-sm);
  color: var(--in-text-subtle);
}

.in-meta-wizard-layout__header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.in-meta-wizard-layout__stepper {
  padding: 8px 0;
}

.in-meta-wizard-layout__body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
  min-height: 0;
}

.in-meta-wizard-layout__body--side-open {
  grid-template-columns: minmax(0, 1fr) 360px;
}

.in-meta-wizard-layout__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
  padding: 24px;
  box-shadow: 0 2px 4px 0 rgba(86, 106, 177, 0.05);
}

.in-meta-wizard-layout__side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  position: sticky;
  top: 16px;
}

.in-meta-wizard-layout__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--in-border-default);
}

@media (max-width: 1100px) {
  .in-meta-wizard-layout__body--side-open {
    grid-template-columns: minmax(0, 1fr);
  }
  .in-meta-wizard-layout__side {
    position: static;
  }
}
</style>
