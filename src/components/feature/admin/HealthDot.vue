<script setup>
/**
 * HealthDot — 자원 실존 여부 시각 dot.
 * ★ (2026-06-03, dspark): admin lane 카탈로그의 자동 바인딩 함정 진단 표시.
 *
 * AS-IS 매뉴얼 02 §4.2.3 — P_FRM_SERVICE_EASY_INPUT 가 7-char prefix 로 자동 생성한
 * 메시지/SQL/Entity ID 가 실존하지 않으면 자동 바인딩이 깨진 상태로 메타가 등록됨.
 * 우리 admin lane 의 ?expand= 응답이 *.exists 플래그를 회신 → 카탈로그가 시각화.
 *
 * tone:
 *   - ok      : 녹색 dot
 *   - missing : 빨강 dot (자원 미존재)
 *   - unknown : 회색 dot (확장 응답 미요청)
 *
 * props:
 *   - tone, title (툴팁)
 *   - size (sm/md)
 */
import InTooltip from '@/components/ui/InTooltip.vue';

defineProps({
  tone: { type: String, default: 'unknown' },     // ok / missing / unknown
  title: { type: String, default: '' },
  size: { type: String, default: 'md' },          // sm / md
});
</script>

<template>
  <InTooltip :text="title" :disabled="!title">
    <span
      class="health-dot"
      :class="[`health-dot--${tone}`, `health-dot--${size}`]"
      role="img"
      :aria-label="title || tone"
    />
  </InTooltip>
</template>

<style scoped>
.health-dot {
  display: inline-block;
  border-radius: var(--in-radius-full);
  vertical-align: middle;
  flex-shrink: 0;
}
.health-dot--sm { width: 6px; height: 6px; }
.health-dot--md { width: 8px; height: 8px; }

.health-dot--ok      { background: var(--in-text-success); box-shadow: 0 0 0 2px var(--in-bg-accent-success, rgba(0, 168, 84, 0.12)); }
.health-dot--missing { background: var(--in-text-error);   box-shadow: 0 0 0 2px var(--in-bg-accent-error,   rgba(220, 53, 69, 0.12)); }
.health-dot--unknown { background: var(--in-text-subtler); }
</style>
