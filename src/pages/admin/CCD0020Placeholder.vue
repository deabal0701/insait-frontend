<script setup>
// ★ (2026-05-27, dspark): CCD0020 공통코드 진입점 placeholder.
//   가이드 P4 Step 13~15 (envelope 캡쳐 선행 → 검색-그리드 화면 → 회귀 검증) 진입 시 본 화면 교체.
//   가이드 11_as-is-capture-procedure.md 절차로 AS-IS 환경에서 envelope 자산 확보 후 본격 작성.
</script>

<template>
  <div class="ccd0020">
    <h2 class="ccd0020__title">CCD0020 공통코드 관리</h2>
    <p class="ccd0020__hint">
      Phase 1A 첫 admin 화면 (가이드 P4 Step 13~15). AS-IS envelope 캡쳐 자산 확보 후 검색-그리드 템플릿으로 본격 작성.
    </p>
    <ul class="ccd0020__todo">
      <li>Step 13 — AS-IS CCD0020 envelope 캡쳐 (manifest + cleanup.sql + replay PASS)</li>
      <li>Step 14 — 검색 영역 (InPanel + InSelect + InTextField + InButton) + 그리드 (InDataTable)</li>
      <li>Step 15 — Vue envelope vs AS-IS envelope 회귀 검증 (SMOKE_SESSIONS 등재)</li>
    </ul>
  </div>
</template>

<style scoped>
.ccd0020 { max-width: 720px; }
.ccd0020__title { margin: 0 0 8px; font-size: 16px; font-weight: 500; color: var(--in-text-accent, #010101); }
.ccd0020__hint { margin: 0 0 16px; font-size: 12px; color: var(--in-text-subtle, #888); }
.ccd0020__todo { margin: 0; padding-left: 18px; font-size: 12px; color: var(--in-text-default, #565656); line-height: 1.8; }
</style>
