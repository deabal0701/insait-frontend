<script setup>
/**
 * MessageCatalog — IST0030 메시지관리 (admin lane 카탈로그).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/messages (직접 REST). columns 항상 포함.
 * ★ (2026-06-05, dspark): Phase 1 편집 CRUD — 우측 Drawer 인라인 (신규/수정/삭제).
 *   부모(def)+자식(columns) 단일 호출. columns 는 rowStatus I/U/D. 본문 없음(SQL 과 차이).
 *   백엔드: com.win.insait.admin.meta.message (POST/PUT/DELETE/{id}/exists).
 *   ※ IST0010 과 동일 인라인 패턴 — 공통 컴포넌트 추출은 후속 단계.
 */
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';
import InTabs from '@/components/ui/InTabs.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.meta.messages.list,
  initialSize: 50,
  initialFilter: { q: '', typeCd: '', allowChildYn: '', hasParent: '' },
  defaultSort: ['msg_def_id,asc'],
  syncUrl: true,
});

const { staged, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', typeCd: '', allowChildYn: '', hasParent: '' },
});
function onSearch(v) { staged.value.q = v; }
function onType(v) { staged.value.typeCd = v; }
function onParent(v) { staged.value.hasParent = v; }

const typeOptions = [
  { value: '',        label: '전체 type' },
  { value: 'MT',      label: 'MT (타입)' },
  { value: 'ME',      label: 'ME (인스턴스)' },
  { value: 'DEFAULT', label: 'DEFAULT' },
];
const parentOptions = [
  { value: '',  label: '부모 무관' },
  { value: 'Y', label: '자식 메시지' },
  { value: 'N', label: '최상위' },
];

const activeFilters = computed(() => {
  const f = list.filter.value;
  const out = [];
  if (f.q) out.push({ key: 'q', label: `검색: ${f.q}` });
  if (f.typeCd) out.push({ key: 'typeCd', label: `type: ${f.typeCd}` });
  if (f.hasParent) out.push({ key: 'hasParent', label: `parent: ${f.hasParent}` });
  return out;
});

const columns = [
  { field: 'msgDefId',     label: '메시지 ID', sortable: true, sortKey: 'msg_def_id', width: 220 },
  { field: 'msgDefNm',     label: '한글명',   sortable: true, sortKey: 'msg_def_nm' },
  { field: 'typeCd',       label: 'Type',     sortable: true, sortKey: 'type_cd',   align: 'center', width: 80 },
  { field: 'allowChildYn', label: '자식허용', sortable: true, sortKey: 'allow_child_yn', align: 'center', width: 80 },
  { field: 'parentId',     label: '부모',     width: 160 },
  { field: 'columnCount',  label: '컬럼수',   align: 'right', width: 80 },
];

// ─────────────────────────────── 상세/편집 상태 ───────────────────────────────
const mode = ref('');          // '' | 'view' | 'create' | 'edit'
const selected = ref(null);
const detail = ref(null);
const detailLoading = ref(false);
const drawerTab = ref('columns');
const saving = ref(false);
const confirmDelete = ref(false);
const form = ref(blankForm());

const isEditing = computed(() => mode.value === 'create' || mode.value === 'edit');
const visibleCols = computed(() => (form.value.columns || []).filter((c) => c.rowStatus !== 'D'));

const typeEditOptions = [
  { value: 'DEFAULT', label: 'DEFAULT' },
  { value: 'MT', label: 'MT (타입)' },
  { value: 'ME', label: 'ME (인스턴스)' },
];
const ynEditOptions = [{ value: 'Y', label: 'Y' }, { value: 'N', label: 'N' }];

// 메시지 ID 컨벤션: MT_<화면7자>_NN (권장 — 강제 아님)
const NAME_RE = /^(MT|ME)_[A-Za-z0-9]{7}_[A-Za-z0-9_]+$/;
const namePatternOk = computed(() => NAME_RE.test((form.value?.def?.msgDefId || '').trim()));

const tabItems = computed(() => {
  const items = [
    { name: 'columns', tabLabel: `컬럼 (${isEditing.value ? visibleCols.value.length : (detail.value?.columns?.length || 0)})` },
    { name: 'def',     tabLabel: '정의' },
  ];
  if (mode.value !== 'create') {
    items.push({ name: 'children', tabLabel: `자식 (${detail.value?.children?.length || 0})` });
    items.push({ name: 'usages',   tabLabel: `사용처 (${detail.value?.usages?.length || 0})` });
  }
  return items;
});

const modalTitle = computed(() => {
  if (mode.value === 'create') return '메시지 신규 등록';
  if (mode.value === 'edit')   return `메시지 수정 — ${selected.value?.msgDefId}`;
  return `메시지 상세 — ${selected.value?.msgDefId}`;
});

function blankForm() {
  return {
    def: { msgDefId: '', msgDefNm: '', typeCd: 'DEFAULT', parentId: '', allowChildYn: 'N', childColId: '', parentColId: '', note: '' },
    columns: [],
  };
}

function adminErrMsg(e) {
  return e?.response?.data?.error?.message || e?.message || '요청 실패';
}

async function openDetail(row) {
  selected.value = row;
  detail.value = null;
  mode.value = 'view';
  drawerTab.value = 'columns';
  detailLoading.value = true;
  try {
    detail.value = await adminApi.meta.messages.detail(row.msgDefId, { expand: ['children', 'services'] });
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    detailLoading.value = false;
  }
}

function openCreate() {
  selected.value = null;
  detail.value = null;
  form.value = blankForm();
  drawerTab.value = 'def';
  mode.value = 'create';
}

function enterEdit() {
  if (!detail.value) return;
  const d = detail.value.def || {};
  form.value = {
    def: {
      msgDefId: d.msgDefId, msgDefNm: d.msgDefNm, typeCd: d.typeCd || 'DEFAULT',
      parentId: d.parentId || '', allowChildYn: d.allowChildYn || 'N',
      childColId: d.childColId || '', parentColId: d.parentColId || '', note: d.note || '',
    },
    columns: (detail.value.columns || []).map((c) => ({
      rowStatus: '', msgColDefOid: c.msgColDefOid,
      msgColDefId: c.msgColDefId, orderSeq: c.orderSeq, typeCd: c.typeCd || 'string',
      labelCd: c.labelCd || '', minLength: c.minLength, maxLength: c.maxLength,
      mandatoryYn: c.mandatoryYn || 'N', useEncYn: c.useEncYn || 'N', useYn: c.useYn || 'Y',
    })),
  };
  drawerTab.value = 'columns';
  mode.value = 'edit';
}

function cancelEdit() {
  if (mode.value === 'edit') { mode.value = 'view'; drawerTab.value = 'columns'; }
  else closePanel();
}
function closePanel() { mode.value = ''; selected.value = null; detail.value = null; }

// ── 컬럼 인라인 편집 (rowStatus I/U/D) ──
function touchCol(c) { if (c.rowStatus !== 'I') c.rowStatus = 'U'; }
function addCol() {
  const maxSeq = form.value.columns.reduce((m, c) => Math.max(m, c.orderSeq || 0), 0);
  form.value.columns.push({
    rowStatus: 'I', msgColDefOid: null, msgColDefId: '', orderSeq: maxSeq + 1,
    typeCd: 'string', labelCd: '', minLength: null, maxLength: null,
    mandatoryYn: 'N', useEncYn: 'N', useYn: 'Y',
  });
}
function removeCol(c) {
  const idx = form.value.columns.indexOf(c);
  if (idx < 0) return;
  if (c.rowStatus === 'I') form.value.columns.splice(idx, 1);
  else c.rowStatus = 'D';
}

async function save() {
  const d = form.value.def;
  if (!d.msgDefId || !d.msgDefId.trim()) { toast.error?.('메시지 ID는 필수입니다.'); drawerTab.value = 'def'; return; }
  if (!d.msgDefNm || !d.msgDefNm.trim()) { toast.error?.('한글명은 필수입니다.'); drawerTab.value = 'def'; return; }
  for (const c of visibleCols.value) {
    if (!c.msgColDefId || !c.msgColDefId.trim()) { toast.error?.('컬럼 ID가 빈 행이 있습니다.'); drawerTab.value = 'columns'; return; }
    if (!c.typeCd || !c.typeCd.trim()) { toast.error?.(`컬럼 '${c.msgColDefId}'의 타입은 필수입니다.`); drawerTab.value = 'columns'; return; }
  }
  saving.value = true;
  try {
    const payload = { def: { ...d }, columns: form.value.columns };
    let saved;
    if (mode.value === 'create') {
      saved = await adminApi.meta.messages.create(payload);
      toast.success?.('등록되었습니다.');
    } else {
      saved = await adminApi.meta.messages.update(selected.value.msgDefId, payload);
      toast.success?.('수정되었습니다.');
    }
    await list.reload();
    selected.value = saved.def;
    detail.value = saved;
    mode.value = 'view';
    drawerTab.value = 'columns';
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  } finally {
    saving.value = false;
  }
}

async function doDelete() {
  saving.value = true;
  try {
    await adminApi.meta.messages.remove(selected.value.msgDefId);
    toast.success?.('삭제되었습니다.');
    confirmDelete.value = false;
    closePanel();
    await list.reload();
  } catch (e) {
    confirmDelete.value = false;
    toast.error?.(adminErrMsg(e));
  } finally {
    saving.value = false;
  }
}

function copyJson(obj) {
  navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  toast.success?.('JSON 복사됨');
}

onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="메시지 관리"
    :subtitle="`FRM_MSG_DEF · 운영 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="msgDefId"
    :active-filters="activeFilters"
    :selected-row="selected"
    @row-click="openDetail"
    @filter-remove="removeFilter"
    @retry="list.reload()"
  >
    <template #header-actions>
      <InButton variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="openCreate">+ 신규</InButton>
    </template>

    <template #filters>
      <div class="m-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="메시지 ID prefix — 예: MT_IST0050 (Enter 또는 [조회] 버튼)"
          layout="vertical"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect :model-value="staged.typeCd" :options="typeOptions" label="Type" input="전체" layout="vertical" size="sm" @update:model-value="onType" />
        <InSelect :model-value="staged.hasParent" :options="parentOptions" label="부모" input="전체" layout="vertical" size="sm" @update:model-value="onParent" />
        <InButton class="m-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="m-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-msgDefId="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-typeCd="{ value }">
      <InTag :label="value" :variant="value === 'MT' ? 'brand' : value === 'ME' ? 'warning' : 'default'" size="sm" />
    </template>
    <template #cell-allowChildYn="{ value }">
      <span :class="value === 'Y' ? '' : 'muted'">{{ value || '—' }}</span>
    </template>
    <template #cell-parentId="{ value }"><span class="muted">{{ value || '—' }}</span></template>

    <template #drawer>
      <InModal
        v-if="mode"
        :model-value="!!mode"
        :title="modalTitle"
        type="detail"
        :width="980"
        :close-on-overlay="!isEditing"
        @update:model-value="(v) => { if (!v) closePanel(); }"
      >
        <div v-if="detailLoading" class="loading">상세 조회 중…</div>

        <div v-else-if="mode === 'create' || detail">
          <div v-if="mode === 'view'" class="head">
            <InButton size="sm" variant="text" @click="copyJson(detail)">📋 JSON 복사</InButton>
          </div>

          <InTabs v-model="drawerTab" :items="tabItems" />

          <!-- ───────── 컬럼 탭 ───────── -->
          <section v-if="drawerTab === 'columns'" class="section">
            <!-- 보기 -->
            <ul v-if="mode === 'view'" class="resource-list">
              <li v-for="c in detail.columns" :key="c.msgColDefOid" class="col-row">
                <span class="seq">{{ c.orderSeq }}</span>
                <code>{{ c.msgColDefId }}</code>
                <InTag :label="c.typeCd" size="sm" />
                <span v-if="c.mandatoryYn === 'Y'" class="req">필수</span>
                <InTag v-if="c.useEncYn === 'Y'" label="암호화" variant="warning" size="sm" />
                <span class="muted">len: {{ c.minLength ?? '?' }}~{{ c.maxLength ?? '?' }}</span>
                <span v-if="c.labelCd" class="muted">label: {{ c.labelCd }}</span>
                <InTag v-if="c.useYn !== 'Y'" label="미사용" variant="default" size="sm" />
              </li>
              <li v-if="!detail.columns?.length" class="muted">컬럼 없음</li>
            </ul>

            <!-- 편집 그리드 -->
            <div v-else>
              <div class="grid-toolbar">
                <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="addCol">+ 행 추가</InButton>
              </div>
              <table class="col-table">
                <thead>
                  <tr><th>순서</th><th>컬럼 ID</th><th>타입</th><th>라벨</th><th>최소</th><th>최대</th><th>필수</th><th>암호화</th><th>사용</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="c in visibleCols" :key="c.msgColDefOid ?? `new-${c.orderSeq}`">
                    <td><input v-model.number="c.orderSeq" type="number" class="cell cell--xs" @change="touchCol(c)" /></td>
                    <td><input v-model="c.msgColDefId" type="text" class="cell" placeholder="emp_id" @input="touchCol(c)" /></td>
                    <td><input v-model="c.typeCd" type="text" class="cell cell--sm" placeholder="string" @input="touchCol(c)" /></td>
                    <td><input v-model="c.labelCd" type="text" class="cell cell--sm" @input="touchCol(c)" /></td>
                    <td><input v-model.number="c.minLength" type="number" class="cell cell--xs" @change="touchCol(c)" /></td>
                    <td><input v-model.number="c.maxLength" type="number" class="cell cell--xs" @change="touchCol(c)" /></td>
                    <td class="ctr"><input type="checkbox" :checked="c.mandatoryYn === 'Y'" @change="(e) => { c.mandatoryYn = e.target.checked ? 'Y' : 'N'; touchCol(c); }" /></td>
                    <td class="ctr"><input type="checkbox" :checked="c.useEncYn === 'Y'" @change="(e) => { c.useEncYn = e.target.checked ? 'Y' : 'N'; touchCol(c); }" /></td>
                    <td class="ctr"><input type="checkbox" :checked="c.useYn === 'Y'" @change="(e) => { c.useYn = e.target.checked ? 'Y' : 'N'; touchCol(c); }" /></td>
                    <td><button type="button" class="row-del" title="행 삭제" @click="removeCol(c)">✕</button></td>
                  </tr>
                  <tr v-if="!visibleCols.length"><td colspan="10" class="muted center">컬럼 없음 — [+ 행 추가]</td></tr>
                </tbody>
              </table>
              <p class="hint">타입: string / numeric / date / clob (또는 value-type MT_*). 개인정보 컬럼은 암호화 체크.</p>
            </div>
          </section>

          <!-- ───────── 정의 탭 ───────── -->
          <section v-else-if="drawerTab === 'def'" class="section">
            <dl v-if="mode === 'view'" class="kv">
              <dt>메시지 ID</dt><dd>{{ detail.def.msgDefId }}</dd>
              <dt>한글명</dt><dd>{{ detail.def.msgDefNm || '—' }}</dd>
              <dt>Type</dt><dd>{{ detail.def.typeCd }}</dd>
              <dt>부모</dt><dd>{{ detail.def.parentId || '—' }}</dd>
              <dt>자식허용</dt><dd>{{ detail.def.allowChildYn }}</dd>
              <dt>child/parent col</dt><dd>{{ detail.def.childColId || '—' }} / {{ detail.def.parentColId || '—' }}</dd>
              <dt>비고</dt><dd>{{ detail.def.note || '—' }}</dd>
            </dl>

            <div v-else class="form-grid">
              <div class="form-row">
                <InTextField
                  v-model="form.def.msgDefId"
                  label="메시지 ID"
                  input="예: MT_TST0009_01"
                  layout="vertical"
                  :show-required="true"
                  :disabled="mode === 'edit'"
                />
                <p v-if="mode === 'edit'" class="hint">메시지 ID는 업무키라 수정할 수 없습니다.</p>
                <p v-else-if="form.def.msgDefId && !namePatternOk" class="hint">권장: MT_&lt;화면7자&gt;_NN (예: MT_TST0009_01)</p>
              </div>
              <InTextField v-model="form.def.msgDefNm" label="한글명" input="메시지 설명" layout="vertical" :show-required="true" />
              <InSelect v-model="form.def.typeCd" :options="typeEditOptions" label="Type" layout="vertical" />
              <InSelect v-model="form.def.allowChildYn" :options="ynEditOptions" label="자식 허용" layout="vertical" />
              <InTextField v-model="form.def.parentId" label="부모 메시지 ID" input="자기참조 (선택)" layout="vertical" />
              <InTextField v-model="form.def.childColId" label="child col" input="(선택)" layout="vertical" />
              <InTextField v-model="form.def.parentColId" label="parent col" input="(선택)" layout="vertical" />
              <InTextField v-model="form.def.note" label="비고" input="(선택)" layout="vertical" />
            </div>
          </section>

          <!-- ───────── 자식 탭 (view) ───────── -->
          <section v-else-if="drawerTab === 'children'" class="section">
            <ul class="resource-list">
              <li v-for="ch in detail.children" :key="ch.msgDefOid">
                <code>{{ ch.msgDefId }}</code>
                <span class="muted">{{ ch.msgDefNm }}</span>
                <span class="muted">{{ ch.columnCount }}col</span>
              </li>
              <li v-if="!detail.children?.length" class="muted">자식 없음</li>
            </ul>
          </section>

          <!-- ───────── 사용처 탭 (view) ───────── -->
          <section v-else-if="drawerTab === 'usages'" class="section">
            <p class="muted">이 메시지를 사용하는 서비스</p>
            <ul class="resource-list">
              <li v-for="u in detail.usages" :key="u.svDefId + '-' + u.usage">
                <InTag :label="u.usage" variant="brand" size="sm" />
                <code>{{ u.svDefNm }}</code>
                <span class="muted">{{ (u.cmdClassNm || '').split('.').pop() }}</span>
              </li>
              <li v-if="!detail.usages?.length" class="muted">사용처 없음</li>
            </ul>
          </section>
        </div>

        <!-- 푸터: 모드별 액션 -->
        <template #footer>
          <template v-if="isEditing">
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="cancelEdit">취소</InButton>
            <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="save">{{ saving ? '저장 중…' : '저장' }}</InButton>
          </template>
          <template v-else>
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="closePanel">닫기</InButton>
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="confirmDelete = true">삭제</InButton>
            <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="enterEdit">수정</InButton>
          </template>
        </template>
      </InModal>

      <!-- 삭제 확인 -->
      <InModal
        v-if="confirmDelete"
        :model-value="confirmDelete"
        type="confirm"
        title="메시지 삭제"
        :message="`'${selected?.msgDefId}' 를 삭제할까요? 사용하는 서비스나 자식 메시지가 있으면 차단됩니다.`"
        confirm-text="삭제"
        cancel-text="취소"
        @confirm="doDelete"
        @cancel="confirmDelete = false"
        @update:model-value="(v) => { if (!v) confirmDelete = false; }"
      />
    </template>
  </CatalogPage>
</template>

<style scoped>
.m-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.m-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.m-filters > :deep(.in-sel) { flex: 0 0 200px; }
.m-filters__search-btn, .m-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.center { text-align: center; }
.loading { padding: 32px; text-align: center; color: var(--in-text-subtle); }
.head { display: flex; gap: 8px; margin-bottom: 12px; }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; word-break: break-all; }

/* 편집 폼 */
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.hint { margin: 6px 0 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }

/* 컬럼 그리드 */
.grid-toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.col-table { width: 100%; border-collapse: collapse; }
.col-table th, .col-table td {
  border-bottom: 1px solid var(--in-border-default);
  padding: 5px 6px; text-align: left; font-size: var(--in-font-size-sm);
}
.col-table th { color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); white-space: nowrap; }
.col-table td.ctr { text-align: center; }
.cell {
  width: 100%; box-sizing: border-box; padding: 5px 6px;
  border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm); background: var(--in-bg-white); color: var(--in-text-default);
}
.cell--xs { width: 56px; }
.cell--sm { width: 96px; }
.row-del { border: none; background: transparent; cursor: pointer; color: var(--in-text-subtle); font-size: 14px; padding: 4px 8px; }
.row-del:hover { color: var(--in-text-error, #d33); }

/* 보기 리스트 */
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs);
}
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); }
.col-row .seq { display: inline-block; min-width: 24px; text-align: right; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.col-row .req { color: var(--in-text-error); font-size: var(--in-font-size-sm); }
</style>
