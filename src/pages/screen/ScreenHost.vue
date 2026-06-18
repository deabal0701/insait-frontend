<script setup>
/**
 * ScreenHost — /screen/:objectId — 디자이너가 저장한 화면 메타를 실제로 렌더(메뉴 클릭 시 동작) (★ 2026-06-18, dspark)
 * v1: screenMetaRepo(localStorage)에서 메타 로드 → FormRenderer. 추후 동적 LNB 폴백 + REST 메타.
 */
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { screenMetaRepo } from '@/services/screenMetaRepo';
import FormRenderer from '@/components/common/FormRenderer.vue';

const route = useRoute();
const meta = ref(null);
function loadMeta() { meta.value = screenMetaRepo.get(route.params.objectId) || null; }
onMounted(loadMeta);
watch(() => route.params.objectId, loadMeta);
</script>

<template>
  <div class="sh">
    <FormRenderer v-if="meta" :meta="meta" />
    <p v-else class="sh__empty">화면 메타가 없습니다: <code>{{ route.params.objectId }}</code><br />화면 디자이너(SCR0010)에서 저장하세요.</p>
  </div>
</template>

<style scoped>
.sh { padding: 16px; }
.sh__empty { color: var(--in-text-subtle); text-align: center; padding: 48px 0; line-height: 1.7; }
.sh__empty code { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
</style>
