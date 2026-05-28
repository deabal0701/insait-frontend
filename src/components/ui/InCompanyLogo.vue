<script setup>
import InsaitLogo from '@/assets/logos/insait-logo.png';
import CompanyLogoIcon from '@/assets/icons/company-logo.svg';
import HomeIcon from '@/assets/icons/home.svg';

/**
 * InCompanyLogo — Figma DS 1377:76974 (DataDisplay/CompanyLogo, master 1168:15859)
 *
 * Figma 진본 (32×32 단일 SVG, 사용자 제공 2026-05-27):
 *   bg     = Blue/600 (#0d9bdb) 원
 *   비행기 = #D9D9D9 옅은 회색 (mask 안 circle, Figma export 형식)
 *
 * variant 매트릭스:
 *   - logo=true (default) — Figma 진본 brand 마크 (파란 원 + 회색 비행기)
 *   - logo=true + src     — 외부 고객사 커스텀 로고 (운영 시 회사별 src 주입)
 *   - logo=true + variant='insait' — insa-IT 브랜드 PNG (Login 등 brand 페이지 전용)
 *   - logo=false          — home icon placeholder
 *
 * 우선순위 (logo=true 시): src > variant='insait' > 기본 (Figma 진본 brand)
 */
const props = defineProps({
  logo: { type: Boolean, default: true },
  src: { type: String, default: '' },
  variant: {
    type: String,
    default: 'brand',
    validator: (v) => ['brand', 'insait'].includes(v),
  },
  alt: { type: String, default: 'Company Logo' },
  size: { type: Number, default: 32 },
});

void props;
</script>

<template>
  <div class="in-clogo" :class="logo ? 'in-clogo--true' : 'in-clogo--false'" :style="{ width: size + 'px', height: size + 'px' }">
    <!-- Logo=True: src > variant=insait > Figma 진본 brand (default) -->
    <template v-if="logo">
      <img v-if="src" :src="src" :alt="alt" class="in-clogo__img" />
      <img v-else-if="variant === 'insait'" :src="InsaitLogo" :alt="alt" class="in-clogo__img" />
      <img v-else :src="CompanyLogoIcon" :alt="alt" class="in-clogo__img" />
    </template>

    <!-- Logo=False: home icon placeholder -->
    <template v-else>
      <img :src="HomeIcon" alt="" class="in-clogo__home" />
    </template>
  </div>
</template>

<style scoped>
.in-clogo {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.in-clogo__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* Logo=False (home icon) */
.in-clogo--false {
  padding: 10px;
}
.in-clogo__home {
  width: 100%;
  height: 100%;
  display: block;
  filter: brightness(0) saturate(100%) invert(46%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(94%);
}
</style>
