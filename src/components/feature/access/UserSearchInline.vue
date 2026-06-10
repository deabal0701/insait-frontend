<script setup>
/**
 * UserSearchInline — 사용자 검색·추가 인라인 패널 (팝업 아님, 탭/섹션 안에 임베드).
 * ★ (2026-06-10, dspark): AUT0020 멤버 추가에서 사용 (모달 대신 인라인). AUT0040 등 재사용.
 *   AUT0010 목록 API(adminApi.access.users.list) 재사용 — 로그인ID/성명 검색, 행별 [추가].
 *
 * props : excludeIds(이미 추가된 userId[] → '추가됨' 비활성) · placeholder · pageSize
 * emits : add(사용자 {userId, loginId, userNm, orgNm})  — 행별 즉시 추가
 */
import { computed, ref } from 'vue';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/composables/useToast';
import { adminErrMsg } from '@/composables/useMetaEditor';

import InButton from '@/components/ui/InButton.vue';

const props = defineProps({
  excludeIds: { type: Array, default: () => [] },
  placeholder: { type: String, default: '로그인ID 또는 성명으로 검색 (Enter)' },
  pageSize: { type: Number, default: 50 },
});
const emit = defineEmits(['add']);

const toast = useToast();

const q = ref('');
const rows = ref([]);
const total = ref(0);
const loading = ref(false);
const searched = ref(false);

const excludeSet = computed(() => new Set((props.excludeIds || []).map(String)));
function isAdded(userId) {
  return excludeSet.value.has(String(userId));
}

async function search() {
  loading.value = true;
  searched.value = true;
  try {
    const res = await adminApi.access.users.list({ q: q.value.trim(), size: props.pageSize, page: 1 });
    const data = res?.data ?? res ?? {};
    rows.value = data.content ?? [];
    total.value = data.total ?? rows.value.length;
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    loading.value = false;
  }
}

function add(r) {
  if (isAdded(r.userId)) return;
  emit('add', r);
}
</script>

<template>
  <div class="usi">
    <div class="usi__search">
      <input v-model="q" class="usi__input" type="text" :placeholder="placeholder" @keyup.enter="search" />
      <InButton variant="default" size="md" :left-icon-show="false" :right-icon-show="false"
                :disabled="loading" @click="search">{{ loading ? '검색 중…' : '검색' }}</InButton>
    </div>

    <div v-if="searched" class="usi__results">
      <div v-if="loading" class="usi__empty">불러오는 중…</div>
      <div v-else-if="!rows.length" class="usi__empty">검색 결과가 없습니다.</div>
      <template v-else>
        <table class="usi__table">
          <thead><tr><th>로그인ID</th><th>성명</th><th>소속</th><th class="usi__act"></th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.userId" :class="{ 'usi__row--added': isAdded(r.userId) }">
              <td><code>{{ r.loginId }}</code></td>
              <td>{{ r.userNm || '—' }}</td>
              <td class="usi__muted">{{ r.orgNm || '—' }}</td>
              <td class="usi__act">
                <button type="button" class="usi__add" :disabled="isAdded(r.userId)" @click="add(r)">
                  {{ isAdded(r.userId) ? '추가됨' : '+ 추가' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="usi__hint">상위 {{ pageSize }}건 표시 (총 {{ total.toLocaleString() }}건). 더 좁히려면 검색어를 입력하세요.</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.usi { display: flex; flex-direction: column; gap: 8px; }
.usi__search { display: flex; gap: 8px; }
.usi__input {
  flex: 1 1 auto; height: 33px; padding: 0 10px;
  border: 1px solid var(--in-border-input, #ccc); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-md); color: var(--in-text-default); background: var(--in-bg-white);
}
.usi__input:focus { outline: none; border-color: var(--in-bg-brand); }
.usi__results { border: 1px solid var(--in-border-subtle, #eee); border-radius: var(--in-radius-xs); max-height: 240px; overflow-y: auto; }
.usi__empty { padding: 14px; text-align: center; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.usi__table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.usi__table th, .usi__table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--in-border-subtle, #f0f0f0); }
.usi__table th { color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); background: var(--in-bg-default); position: sticky; top: 0; }
.usi__table code { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
.usi__muted { color: var(--in-text-subtle); }
.usi__act { width: 76px; text-align: center; }
.usi__add {
  background: transparent; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xs);
  cursor: pointer; font-size: var(--in-font-size-sm); padding: 3px 8px; color: var(--in-text-accent);
}
.usi__add:hover:not(:disabled) { border-color: var(--in-bg-brand); }
.usi__add:disabled { opacity: .5; cursor: default; color: var(--in-text-subtle); }
.usi__row--added { opacity: .6; }
.usi__hint { margin: 6px 10px; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
