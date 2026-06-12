<script setup>
/**
 * CriteriaCatalog — AUT0070 권한기준 관리 (admin lane access 차선, 직접 REST).
 * ★ (2026-06-11, dspark): 옵션 A(전용 편집기). 좌 읽기전용 미니 트리(옵션트리) + 우 직책코드기준 그리드.
 *   AS-IS = ccd0060(옵션트리) 셸 + ccd0020(기준관리/unit_std) 그리드 2-프레임워크 합성 (매뉴얼 12 §0).
 *   백엔드: GET /api/admin/access/auth-criteria(트리) · GET|PUT /auth-criteria/grid(직책→부여권한, FRM_UNIT_STD_HIS mgr 6615127).
 *   설계: 02-tobe/04-admin-lane/access-control/07_auth-criteria-aut0070.md §5.
 *   ※ 트리 노드는 본 화면에서 편집 불가(AS-IS 동일 — 노드 추가/삭제는 CCD0050 업무별 기준관리, 차선 밖).
 *   Figma 노드 ID = TBD.
 */
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/composables/useToast';
import { MSG } from '@/constants/messages'; // ★ (2026-06-12, dspark): 공통 문구 통일 (#6)

import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import InButton from '@/components/ui/InButton.vue';

const toast = useToast();

const tree = ref([]);
const grid = ref({ mgrId: null, stdKindNm: '', stdDate: '', columns: [], rows: [] });
const rows = ref([]);                                  // MetaChildGrid 바인딩 (in-place 변형)
const stdDateInput = ref(dayjs().format('YYYY-MM-DD'));   // <input type=date> = YYYY-MM-DD
const loading = ref(false);
const saving = ref(false);
const selectedNodeId = ref(null);

function ymd(s) { return (s || '').replace(/[^0-9]/g, ''); }
// YYYYMMDD → YYYY-MM-DD (date input 값). 2999-12-31 등 원거리도 슬라이스로 안전.
function toDateInput(s) {
  const d = ymd(s);
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : '';
}

// 트리: 부모(category) → 자식(unit_std) 2계층. ★ parent 가 null 이거나 응답 집합 밖이면 root 로 간주
//   (옵션트리 슬라이스가 상위 루트를 포함하지 않아도 최소 1노드는 표시되도록 견고화).
const treeRoots = computed(() => {
  const all = tree.value || [];
  const idSet = new Set(all.map((n) => n.optionItemId));
  const isRoot = (n) => n.parentItemId == null || !idSet.has(n.parentItemId);
  const roots = all.filter(isRoot);
  return roots.map((r) => ({
    ...r,
    children: all.filter((n) => n.parentItemId === r.optionItemId),
  }));
});

// 백엔드 동적 컬럼(직책/부여권한) → MetaChildGrid 컬럼 + 유효기간/비고
const gridColumns = computed(() => {
  const cols = (grid.value.columns || []).map((c) => {
    if (c.type === 'combo' && c.options && c.options.length) {
      return {
        key: c.field, label: c.title, kind: 'select', width: 170,
        options: c.options.map((o) => ({ value: o.cd, label: o.cdNm })),
      };
    }
    // 콤보 옵션 미해결 시 직접입력(text) 폴백 — 원시 코드라도 편집 가능
    return { key: c.field, label: c.title, kind: 'text', width: 170, placeholder: c.title };
  });
  cols.push({ key: 'staYmd', label: '시작일', kind: 'date', width: 150 });
  cols.push({ key: 'endYmd', label: '종료일', kind: 'date', width: 150 });
  cols.push({ key: 'note', label: '비고', kind: 'text' });   // width 미지정 = 가변(잔여폭 흡수)
  return cols;
});

function newRow() {
  const r = { rowStatus: 'I', hisId: null, mgrId: grid.value.mgrId, note: '' };
  for (const c of grid.value.columns || []) r[c.field] = '';
  r.staYmd = stdDateInput.value;     // YYYY-MM-DD
  r.endYmd = '2999-12-31';
  return r;
}

async function loadTree() {
  try {
    tree.value = await adminApi.access.authCriteria.tree();
    // 첫 unit_std(leaf) 노드 선택 표시
    const leaf = (tree.value || []).find((n) => n.itemType === 'unit_std');
    if (leaf) selectedNodeId.value = leaf.optionItemId;
  } catch (e) {
    // 트리는 보조 — 실패해도 그리드는 동작
  }
}

// 백엔드 행(YYYYMMDD) → 그리드 행(date input = YYYY-MM-DD). rowStatus 없음 = 기존행.
function mapRows(data) {
  return (data.rows || []).map((r) => ({ ...r, staYmd: toDateInput(r.staYmd), endYmd: toDateInput(r.endYmd) }));
}

async function loadGrid() {
  loading.value = true;
  try {
    const data = await adminApi.access.authCriteria.grid({ stdDate: ymd(stdDateInput.value) });
    grid.value = data;
    rows.value = mapRows(data);
  } catch (e) {
    toast.error('조회 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally {
    loading.value = false;
  }
}

async function save() {
  const dirty = rows.value.filter((r) => r.rowStatus);
  if (!dirty.length) { toast.info(MSG.NO_CHANGES); return; }
  saving.value = true;
  try {
    const body = {
      mgrId: grid.value.mgrId,
      stdDate: ymd(stdDateInput.value),
      rows: dirty.map((r) => ({ ...r, staYmd: ymd(r.staYmd), endYmd: ymd(r.endYmd) })),
    };
    const data = await adminApi.access.authCriteria.saveGrid(body);
    grid.value = data;
    rows.value = mapRows(data);
    toast.success(MSG.SAVED);
  } catch (e) {
    toast.error('저장 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally {
    saving.value = false;
  }
}

onMounted(async () => { await loadTree(); await loadGrid(); });
</script>

<template>
  <div class="criteria">
    <header class="criteria__head">
      <h2 class="criteria__title">권한기준 관리</h2>
      <p class="criteria__desc">직책(직위)별로 부여할 권한 등급(임원/보직자/개인)을 정의합니다. 인사발령 시 권한 자동부여 기준.</p>
    </header>

    <div class="criteria__body">
      <!-- 좌: 읽기전용 옵션트리 -->
      <aside class="criteria__tree">
        <div class="criteria__tree-title">옵션트리</div>
        <ul class="criteria__tree-list">
          <li v-for="root in treeRoots" :key="root.optionItemId">
            <div class="criteria__tree-cat">{{ root.optionLabel }}</div>
            <ul>
              <li
                v-for="child in root.children"
                :key="child.optionItemId"
                :class="['criteria__tree-leaf', { 'is-sel': child.optionItemId === selectedNodeId }]"
                @click="selectedNodeId = child.optionItemId"
              >
                {{ child.optionLabel }}
              </li>
            </ul>
          </li>
          <li v-if="!treeRoots.length" class="criteria__tree-empty">트리 없음</li>
        </ul>
        <p class="criteria__tree-hint">※ 트리 노드 추가/삭제는 「업무별 기준관리」에서 (본 화면은 기준값 편집 전용)</p>
      </aside>

      <!-- 우: 직책코드기준 그리드 -->
      <section class="criteria__grid">
        <div class="criteria__toolbar">
          <div class="criteria__filter">
            <label>기준일</label>
            <input v-model="stdDateInput" type="date" class="criteria__date" @change="loadGrid" />
            <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="loading" @click="loadGrid">조회</InButton>
          </div>
          <div class="criteria__actions">
            <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="save">저장</InButton>
          </div>
        </div>

        <div class="criteria__grid-title">
          {{ grid.stdKindNm || '직책코드기준' }}
          <span class="criteria__count">Total {{ rows.length }}건</span>
        </div>

        <MetaChildGrid
          :rows="rows"
          :columns="gridColumns"
          key-field="hisId"
          :new-row="newRow"
          add-label="+ 추가"
          show-seq
          show-status
          hint="부여권한 = 임원/보직자/개인 등급. 유효기간(시작·종료)으로 시점별 기준 관리."
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.criteria { padding: 16px 20px; }
.criteria__head { margin-bottom: 14px; }
.criteria__title { margin: 0 0 4px; font-size: var(--in-font-size-lg); font-weight: var(--in-font-weight-bold); color: var(--in-text-default); }
.criteria__desc { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.criteria__body { display: flex; gap: 16px; align-items: flex-start; }

.criteria__tree { flex: 0 0 240px; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 12px; background: var(--in-bg-white); }
.criteria__tree-title { font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-bold); color: var(--in-text-subtle); margin-bottom: 8px; }
.criteria__tree-list, .criteria__tree-list ul { list-style: none; margin: 0; padding: 0; }
.criteria__tree-cat { font-weight: var(--in-font-weight-medium); padding: 4px 0; color: var(--in-text-default); }
.criteria__tree-leaf { padding: 5px 8px; margin: 2px 0 2px 12px; border-radius: var(--in-radius-xs); cursor: pointer; color: var(--in-text-default); font-size: var(--in-font-size-sm); }
.criteria__tree-leaf:hover { background: var(--in-bg-default); }
.criteria__tree-leaf.is-sel { background: var(--in-bg-brand-subtle, var(--in-bg-default)); font-weight: var(--in-font-weight-medium); }
.criteria__tree-empty { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.criteria__tree-hint { margin: 10px 0 0; font-size: var(--in-font-size-xs); color: var(--in-text-subtle); line-height: 1.4; }

.criteria__grid { flex: 1 1 auto; min-width: 0; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 14px 16px; background: var(--in-bg-white); }
.criteria__toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.criteria__filter { display: flex; align-items: center; gap: 8px; }
.criteria__filter label { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.criteria__date { width: 150px; padding: 5px 8px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.criteria__grid-title { font-weight: var(--in-font-weight-bold); color: var(--in-text-default); margin-bottom: 8px; }
.criteria__count { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); font-weight: var(--in-font-weight-regular); margin-left: 8px; }
</style>
