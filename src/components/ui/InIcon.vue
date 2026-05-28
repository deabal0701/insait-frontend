<script setup>
import { computed } from 'vue';
import { ICON_REGISTRY } from '@/assets/icons/registry';

/**
 * InIcon — Figma 1152:23501 (DataDisplay/Icon)
 *
 * Figma 정책: 100+ 아이콘 라이브러리. v2 는 사용처에 필요한 아이콘만 registry 에 점진 추가.
 * Props:
 *   - name: registry 키 ('language' | 'search' | ...)
 *   - src: 직접 자산 경로 (custom svg)
 *   - size: number (px) | string (CSS)
 *   - color: 토큰 색상 또는 'inherit'
 *   - colorize: ★ W6 #4 #3 — true 시 mask-image CSS 로 CSS color 제어
 *     · false (default): `<img>` 직 렌더 — Figma 원본 색상 보존
 *     · true:           `<span style="mask:url(...); background:currentColor">` — CSS color 제어
 *
 * Figma 정합 절대 원칙: SVG 파일 무수정. colorize 는 Figma 원본 + CSS mask 합성으로 색상 제어 (파일 미변경).
 *
 * 임의 SVG 작성 금지. 모든 아이콘은 Figma 원본 (feedback_figma_no_arbitrary_svg.md).
 * 검증: docs/verification-icon.md + docs/verification-w6-svg-currentcolor.md
 */

const props = defineProps({
  name: { type: String, default: undefined },
  src: { type: String, default: undefined },
  size: { type: [Number, String], default: 20 },
  color: {
    type: String,
    default: 'inherit',
    validator: (v) => ['inherit', 'default', 'subtle', 'brand', 'error', 'warning', 'success', 'white'].includes(v),
  },
  alt: { type: String, default: undefined },
  colorize: { type: Boolean, default: false },
});

const iconSrc = computed(() => {
  if (props.src) return props.src;
  if (props.name) return ICON_REGISTRY[props.name];
  return '';
});

const sizeValue = computed(() => {
  return typeof props.size === 'number' ? `${props.size}px` : props.size;
});

// W6 #4 #3 — mask-image CSS 패턴 (Figma SVG 무변경 + CSS color 제어)
const maskStyle = computed(() => {
  if (!props.colorize || !iconSrc.value) return {};
  return {
    width: sizeValue.value,
    height: sizeValue.value,
    backgroundColor: 'currentColor',
    WebkitMaskImage: `url(${iconSrc.value})`,
    maskImage: `url(${iconSrc.value})`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    display: 'inline-block',
  };
});
</script>

<template>
  <span
    class="in-icon"
    :class="[`in-icon--c-${color}`]"
    :style="{ width: sizeValue, height: sizeValue }"
  >
    <!-- colorize=false (default) — Figma 원본 색상 -->
    <img v-if="iconSrc && !colorize" :src="iconSrc" :alt="alt || ''" />
    <!-- colorize=true — mask-image CSS 로 currentColor 적용 -->
    <span
      v-else-if="iconSrc && colorize"
      class="in-icon__mask"
      :style="maskStyle"
      :aria-label="alt || undefined"
      :role="alt ? 'img' : undefined"
    />
  </span>
</template>

<style scoped>
.in-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.in-icon img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;   /* W6+ — Figma export 의 비대칭 viewBox 보호망 (정규화 + 이중 안전장치) */
}

/* 색상 토큰 — colorize=true 시 in-icon__mask 의 currentColor 가 참조 */
.in-icon--c-inherit { color: inherit; }
.in-icon--c-default { color: var(--in-icon-default); }
.in-icon--c-subtle  { color: var(--in-icon-subtle); }
.in-icon--c-brand   { color: var(--in-icon-brand); }
.in-icon--c-error   { color: var(--in-text-error); }
.in-icon--c-warning { color: var(--in-text-warning); }
.in-icon--c-success { color: var(--in-text-success); }
.in-icon--c-white   { color: var(--in-icon-white); }
</style>
