<script setup>
/**
 * UserPickerModal — 사용자 검색·선택 공통 모달 (접근제어 차선 재사용).
 * ★ (2026-06-10, dspark): AUT0020 사용자그룹 멤버 추가에서 첫 사용. AUT0040(권한↔사용자) 등에서 재사용.
 *   AUT0010 목록 API(adminApi.access.users.list) 재사용 — 로그인ID/성명 검색, 다중 선택.
 *
 * props : modelValue(open) · excludeIds(이미 선택된 userId[] → 비활성) · title
 * emits : update:modelValue · confirm(선택된 사용자 [{userId, loginId, userNm, orgNm}])
 */
import { computed, ref, watch } from 'vue';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/composables/useToast';
import { adminErrMsg } from '@/composables/useMetaEditor';

import InModal from '@/components/ui/InModal.vue';
import InButton from '@/components/ui/InButton.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  excludeIds: { type: Array, default: () => [] },
  title: { type: String, default: '사용자 선택' },
});
const emit = defineEmits(['update:modelValue', 'confirm']);

const toast = useToast();

const q = ref('');
const loading = ref(false);
const rows = ref([]);
const picked = ref(new Set());   // 선택된 userId 집합
const total = ref(0);

const SIZE = 100;
const excludeSet = computed(() => new Set((props.excludeIds || []).map(String)));

function isExcluded(userId) {
  return excludeSet.value.has(String(userId));
}

async function search() {
  loading.value = true;
  try {
    const res = await adminApi.access.users.list({ q: q.value.trim(), size: SIZE, page: 1 });
    const data = res?.data ?? res ?? {};
    rows.value = data.content ?? [];
    total.value = data.total ?? rows.value.length;
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    loading.value = false;
  }
}

function toggle(userId) {
  if (isExcluded(userId)) return;
  const s = new Set(picked.value);
  const k = String(userId);
  if (s.has(k)) s.delete(k); else s.add(k);
  picked.value = s;
}

const pickedCount = computed(() => picked.value.size);

function confirm() {
  const selected = rows.value.filter((r) => picked.value.has(String(r.userId)));
  emit('confirm', selected);
  close();
}

function close() {
  emit('update:modelValue', false);
}

watch(() => props.modelValue, (v) => {
  if (v) {
    q.value = '';
    picked.value = new Set();
    rows.value = [];
    total.value = 0;
    search();   // 열릴 때 전체(상위 100) 한 번 로드
  }
});
</script>

<template>
  <InModal
    :model-value="modelValue"
    type="form"
    :title="title"
    :width="640"
    @update:model-value="(v) => { if (!v) close(); }"
    @close="close"
  >
    <div class="up">
      <div class="up__search">
        <input
          v-model="q"
          class="up__input"
          type="text"
          placeholder="로그인ID 또는 성명으로 검색 (Enter)"
          @keyup.enter="search"
        />
        <InButton variant="primary" size="md" :left-icon-show="false" :right-icon-show="false"
                  :disabled="loading" @click="search">{{ loading ? '검색 중…' : '검색' }}</InButton>
      </div>

      <div class="up__list">
        <div v-if="loading" class="up__empty">불러오는 중…</div>
        <div v-else-if="!rows.length" class="up__empty">검색 결과가 없습니다.</div>
        <table v-else class="up__table">
          <thead>
            <tr><th class="up__chk"></th><th>로그인ID</th><th>성명</th><th>소속</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.userId"
                :class="{ 'up__row--on': picked.has(String(r.userId)), 'up__row--off': isExcluded(r.userId) }"
                @click="toggle(r.userId)">
              <td class="up__chk">
                <input type="checkbox" :checked="picked.has(String(r.userId))"
                       :disabled="isExcluded(r.userId)" @click.stop="toggle(r.userId)" />
              </td>
              <td><code>{{ r.loginId }}</code><span v-if="isExcluded(r.userId)" class="up__tag">이미 추가됨</span></td>
              <td>{{ r.userNm || '—' }}</td>
              <td class="up__muted">{{ r.orgNm || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="up__hint">상위 {{ SIZE }}건까지 표시 (총 {{ total.toLocaleString() }}건). 더 좁히려면 검색하세요.</p>
    </div>

    <template #footer>
      <button type="button" class="up__btn up__btn--default" @click="close">취소</button>
      <button type="button" class="up__btn up__btn--primary" :disabled="!pickedCount" @click="confirm">
        {{ pickedCount ? `${pickedCount}명 추가` : '선택 후 추가' }}
      </button>
    </template>
  </InModal>
</template>

<style scoped>
.up { display: flex; flex-direction: column; gap: 12px; }
.up__search { display: flex; gap: 8px; }
.up__input {
  flex: 1 1 auto; height: 33px; padding: 0 10px;
  border: 1px solid var(--in-border-input, #ccc); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-md); color: var(--in-text-default); background: var(--in-bg-white);
}
.up__input:focus { outline: none; border-color: var(--in-bg-brand); }
.up__list { max-height: 340px; overflow-y: auto; border: 1px solid var(--in-border-subtle, #eee); border-radius: var(--in-radius-xs); }
.up__empty { padding: 18px; text-align: center; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.up__table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.up__table th, .up__table td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--in-border-subtle, #f0f0f0); }
.up__table th { color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); background: var(--in-bg-default); position: sticky; top: 0; }
.up__table tbody tr { cursor: pointer; }
.up__table tbody tr:hover { background: var(--in-bg-default); }
.up__row--on { background: color-mix(in srgb, var(--in-brand) 8%, transparent) !important; }
.up__row--off { opacity: .5; cursor: default !important; }
.up__chk { width: 36px; text-align: center; }
.up__table code { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
.up__tag { margin-left: 6px; font-size: var(--in-font-size-xs, 11px); color: var(--in-text-subtle); }
.up__muted { color: var(--in-text-subtle); }
.up__hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }

.up__btn {
  display: inline-flex; align-items: center; justify-content: center; min-width: 80px; height: 33px;
  padding: 0 16px; border-radius: var(--in-radius-xs); cursor: pointer;
  font-size: var(--in-font-size-md); font-weight: var(--in-font-weight-medium); border: 1px solid transparent;
}
.up__btn--default { background: var(--in-bg-white); color: var(--in-text-default); border-color: var(--in-border-default); }
.up__btn--default:hover { border-color: var(--in-border-input); color: var(--in-text-accent); }
.up__btn--primary { background: var(--in-bg-brand); color: var(--in-text-white); border-color: var(--in-bg-brand); }
.up__btn--primary:hover:not(:disabled) { background: var(--in-bg-state-hover); border-color: var(--in-bg-state-hover); }
.up__btn--primary:disabled { opacity: .5; cursor: default; }
</style>
