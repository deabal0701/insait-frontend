<script setup>
// ★ (2026-05-27, dspark): admin 9 화면 진입 검증용 placeholder. 가이드 P4·P5·P6 진입 시 OBJECT_ID 별로 본 화면 교체.
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
  <div class="admin-placeholder">
    <h2 class="admin-placeholder__title">{{ route.meta?.title || route.name }}</h2>
    <p class="admin-placeholder__hint">
      이 화면은 placeholder 입니다. 가이드 P4 (CCD0020) → P5 (IST0050) → P6 (나머지) 순으로 본 화면을 교체합니다.
    </p>
    <dl class="admin-placeholder__meta">
      <dt>OBJECT_ID</dt><dd>{{ route.meta?.objectId || '-' }}</dd>
      <dt>menuId</dt><dd>{{ route.meta?.menuId || '-' }}</dd>
      <dt>path</dt><dd>{{ route.fullPath }}</dd>
    </dl>
  </div>
</template>

<style scoped>
.admin-placeholder { max-width: 720px; }
.admin-placeholder__title { margin: 0 0 8px; font-size: 16px; font-weight: 500; color: var(--in-text-accent, #010101); }
.admin-placeholder__hint { margin: 0 0 16px; font-size: 12px; color: var(--in-text-subtle, #888); }
.admin-placeholder__meta { display: grid; grid-template-columns: 80px 1fr; row-gap: 4px; font-size: 12px; color: var(--in-text-default, #565656); }
.admin-placeholder__meta dt { font-weight: 500; }
.admin-placeholder__meta dd { margin: 0; }
</style>
