<script setup>
/**
 * InCard — Figma 1247:24387 / 단일 variant 1255:26008
 *
 * Figma Props: state(6) × type(2: Content/Title)
 * 시각: white bg + border #e2e2e2 + radius 8px + shadow elev-2 + padding 20/24/20/15 + gap 12
 * 검증: docs/verification-card.md
 */

defineProps({
  state: {
    type: String,
    default: 'enabled',
    validator: (v) => ['enabled', 'hovered', 'picked', 'empty', 'drag-drop', 'before-creation'].includes(v),
  },
  type: {
    type: String,
    default: 'content',
    validator: (v) => ['content', 'title'].includes(v),
  },
  title: { type: String, default: undefined },
});
</script>

<template>
  <section
    class="in-card"
    :class="[`in-card--${state}`, `in-card--${type}`]"
  >
    <header v-if="title || $slots.title" class="in-card__header">
      <slot name="title">
        <h3 class="in-card__title">{{ title }}</h3>
      </slot>
    </header>
    <div class="in-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="in-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.in-card {
  background: var(--in-surface-overlay);                   /* Surface/Overlay/Default #ffffff */
  border: 1px solid var(--in-border-default);              /* Border/Default #e2e2e2 */
  border-radius: var(--in-radius-sm);                       /* Corner/sm 8px */
  box-shadow: var(--in-shadow-elev-2);                     /* ★ (2026-06-07, dspark): raw rgba → 토큰 (Elevation Light/2) */
  padding: 20px 20px 15px 24px;                            /* Figma 정합 */
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--in-font-family-body);
}

.in-card__header {
  display: flex;
  align-items: center;
  width: 100%;
}
.in-card__title {
  margin: 0;
  font-size: var(--in-font-size-lg);
  line-height: var(--in-line-height-lg);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: var(--in-letter-spacing-lg);
}

.in-card__body {
  /* flex: 1 1 0 + min-height: 0 was collapsing body to 0 in non-constrained parents
     (block flow). Use auto sizing so body grows to fit content; the in-card itself
     still uses column flex for header/body/footer stacking. */
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.in-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* === State === */
.in-card--hovered { box-shadow: var(--in-shadow-elev-3); cursor: pointer; }
.in-card--picked { border-color: var(--in-border-brand); }
.in-card--empty .in-card__body { color: var(--in-text-subtle); justify-content: center; align-items: center; }
.in-card--drag-drop { border-style: dashed; }
.in-card--before-creation { opacity: 0.6; }
</style>
