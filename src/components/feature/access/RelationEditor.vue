<script setup>
/**
 * RelationEditor — 관계편집 공통 부품 (검색 → [+추가] → 현재 목록 → [제거]).
 * ★ (2026-06-10, dspark): AUT0020 멤버 / AUT0040 권한바인딩 / AUT0060 조직권한 등에서 재사용.
 *   "A에 연결된 B 목록을 편집"하는 모든 화면을 동일한 UI/UX 로 통일 (UserSearchInline + 손수 테이블 흡수).
 *
 * props
 *   - list       : 편집 대상 배열(in-place 변형 — rowStatus I/D 내장 처리). 항목 = { rowStatus, [idField], ...컬럼키 }
 *   - idField    : 중복판정·제외용 고유키 (예: 'userId')
 *   - columns    : 목록·검색결과 공통 표시 컬럼 [{ key, label, width?, muted? }]
 *   - search     : async (q) => 원시 결과행[]  (검색 소스 — 사용자/그룹/메뉴/조직 주입). 없으면 검색영역 숨김
 *   - mapResult  : (원시행) => { [idField], ...컬럼키 }  (검색결과를 목록 항목 형태로 정규화). 기본 = 그대로
 *   - readOnly   : 보기 전용(검색·추가·제거 숨김)
 *   - 라벨류     : addSectionLabel / searchPlaceholder / listLabel / emptyText
 *
 * 동작: 추가=mapResult 후 rowStatus 'I' push(중복은 skip, 기존 'D'면 되살림) / 제거='I'면 splice, 그 외 'D'.
 * 부모는 list(=form.xxx)를 그대로 넘기면 됨(참조 공유 → 반응성). save 시 list 의 rowStatus 로 I/D 전송.
 */
import { computed, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { adminErrMsg } from '@/composables/useMetaEditor';
import InButton from '@/components/ui/InButton.vue';

const props = defineProps({
  list: { type: Array, required: true },
  idField: { type: String, required: true },
  columns: { type: Array, required: true },
  search: { type: Function, default: null },
  mapResult: { type: Function, default: (r) => r },
  readOnly: { type: Boolean, default: false },
  addSectionLabel: { type: String, default: '추가 — 검색' },
  searchPlaceholder: { type: String, default: '검색어 입력 (Enter)' },
  listLabel: { type: String, default: '현재 목록' },
  emptyText: { type: String, default: '항목이 없습니다.' },
  pageSize: { type: Number, default: 100 },
});

const toast = useToast();

const visibleList = computed(() => props.list.filter((r) => r.rowStatus !== 'D'));
const excludeSet = computed(() => new Set(visibleList.value.map((r) => String(r[props.idField]))));
function isAdded(id) { return excludeSet.value.has(String(id)); }

// ── 검색 ──
const q = ref('');
const results = ref([]);
const total = ref(0);
const loading = ref(false);
const searched = ref(false);

async function doSearch() {
  if (!props.search) return;
  loading.value = true;
  searched.value = true;
  try {
    const rows = await props.search(q.value.trim());
    results.value = Array.isArray(rows) ? rows : (rows?.content ?? []);
    total.value = rows?.total ?? results.value.length;
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    loading.value = false;
  }
}

// ── 추가/제거 ──
function add(rawRow) {
  const mapped = props.mapResult(rawRow);
  const id = mapped[props.idField];
  const dup = props.list.find((r) => String(r[props.idField]) === String(id));
  if (dup) {
    if (dup.rowStatus === 'D') dup.rowStatus = '';   // 되살림
    return;                                          // 이미 있음
  }
  props.list.push({ rowStatus: 'I', ...mapped });
}
function remove(item) {
  if (item.rowStatus === 'I') {
    const idx = props.list.indexOf(item);
    if (idx >= 0) props.list.splice(idx, 1);   // 신규 추가분 즉시 제거
  } else {
    item.rowStatus = 'D';                       // 기존분 D 마크
  }
}

function cellVal(row, c) {
  const v = row[c.key];
  return v == null || v === '' ? '—' : v;
}
function resultVal(rawRow, c) {
  const m = props.mapResult(rawRow);
  const v = m[c.key];
  return v == null || v === '' ? '—' : v;
}
</script>

<template>
  <div class="rel">
    <!-- 추가 (검색) — readOnly 면 숨김 -->
    <div v-if="!readOnly && search" class="rel__block">
      <div class="rel__label">{{ addSectionLabel }}</div>
      <div class="rel__search">
        <input v-model="q" class="rel__input" type="text" :placeholder="searchPlaceholder" @keyup.enter="doSearch" />
        <InButton variant="default" size="md" :left-icon-show="false" :right-icon-show="false"
                  :disabled="loading" @click="doSearch">{{ loading ? '검색 중…' : '검색' }}</InButton>
      </div>
      <div v-if="searched" class="rel__results">
        <div v-if="loading" class="rel__empty">불러오는 중…</div>
        <div v-else-if="!results.length" class="rel__empty">검색 결과가 없습니다.</div>
        <template v-else>
          <table class="rel__table">
            <thead>
              <tr><th v-for="c in columns" :key="c.key">{{ c.label }}</th><th class="rel__act"></th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in results" :key="r[idField] ?? i" :class="{ 'rel__row--added': isAdded(mapResult(r)[idField]) }">
                <td v-for="c in columns" :key="c.key" :class="{ 'rel__muted': c.muted }">
                  <code v-if="c.code">{{ resultVal(r, c) }}</code><template v-else>{{ resultVal(r, c) }}</template>
                </td>
                <td class="rel__act">
                  <button type="button" class="rel__add" :disabled="isAdded(mapResult(r)[idField])" @click="add(r)">
                    {{ isAdded(mapResult(r)[idField]) ? '추가됨' : '+ 추가' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="rel__hint">상위 {{ pageSize }}건 표시 (총 {{ total.toLocaleString() }}건). 더 좁히려면 검색어를 입력하세요.</p>
        </template>
      </div>
    </div>

    <!-- 현재 목록 -->
    <div class="rel__block">
      <div v-if="!readOnly" class="rel__label">{{ listLabel }} ({{ visibleList.length }})</div>
      <table v-if="visibleList.length" class="rel__table">
        <thead>
          <tr><th v-for="c in columns" :key="c.key">{{ c.label }}</th><th v-if="!readOnly" class="rel__act"></th></tr>
        </thead>
        <tbody>
          <tr v-for="(m, i) in visibleList" :key="m[idField] ?? i" :class="{ 'rel__row--new': m.rowStatus === 'I' }">
            <td v-for="(c, ci) in columns" :key="c.key" :class="{ 'rel__muted': c.muted }">
              <code v-if="c.code">{{ cellVal(m, c) }}</code><template v-else>{{ cellVal(m, c) }}</template>
              <span v-if="ci === 0 && m.rowStatus === 'I'" class="rel__tag">신규</span>
            </td>
            <td v-if="!readOnly" class="rel__act">
              <button type="button" class="rel__del" @click="remove(m)">제거</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="rel__none">{{ emptyText }}</p>
    </div>
  </div>
</template>

<style scoped>
.rel { display: flex; flex-direction: column; gap: 16px; }
.rel__block { display: flex; flex-direction: column; gap: 8px; }
.rel__label { font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-medium); color: var(--in-text-default); }
.rel__search { display: flex; gap: 8px; }
.rel__input {
  flex: 1 1 auto; height: 33px; padding: 0 10px;
  border: 1px solid var(--in-border-input, #ccc); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-md); color: var(--in-text-default); background: var(--in-bg-white);
}
.rel__input:focus { outline: none; border-color: var(--in-bg-brand); }
.rel__results { border: 1px solid var(--in-border-subtle, #eee); border-radius: var(--in-radius-xs); max-height: 240px; overflow-y: auto; }
.rel__empty { padding: 14px; text-align: center; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.rel__none { margin: 0; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.rel__table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.rel__table th, .rel__table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--in-border-subtle, #f0f0f0); }
.rel__table th { color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); background: var(--in-bg-default); position: sticky; top: 0; }
.rel__table code { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }
.rel__muted { color: var(--in-text-subtle); }
.rel__act { width: 76px; text-align: center; }
.rel__row--added { opacity: .55; }
.rel__row--new { background: color-mix(in srgb, var(--in-brand) 6%, transparent); }
.rel__tag { margin-left: 6px; font-size: var(--in-font-size-xs, 11px); color: var(--in-brand, #2b6); }
.rel__add {
  background: transparent; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-xs);
  cursor: pointer; font-size: var(--in-font-size-sm); padding: 3px 8px; color: var(--in-text-accent);
}
.rel__add:hover:not(:disabled) { border-color: var(--in-bg-brand); }
.rel__add:disabled { opacity: .5; cursor: default; color: var(--in-text-subtle); }
/* ★ (2026-06-12, dspark): danger hex(#c0392b/#e6b3ad/#fdecea) → error 시멘틱 토큰 (TestAccountPanel .ta__del 과 정합) */
.rel__del {
  background: transparent; border: 1px solid color-mix(in srgb, var(--in-border-error) 40%, var(--in-bg-white)); color: var(--in-text-error); border-radius: var(--in-radius-xs);
  cursor: pointer; font-size: var(--in-font-size-sm); padding: 3px 8px;
}
.rel__del:hover { background: var(--in-surface-accent-error); }
.rel__hint { margin: 6px 10px; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
