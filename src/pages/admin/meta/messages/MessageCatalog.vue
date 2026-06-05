<script setup>
/**
 * MessageCatalog — IST0030 메시지관리 (admin lane 카탈로그 + 편집 CRUD).
 * ★ (2026-06-03, dspark): GET /api/admin/meta/messages (직접 REST). columns 항상 포함.
 * ★ (2026-06-05, dspark): 편집 CRUD — 우측 Drawer 인라인. 본문 없음(SQL 과 차이).
 * ★ (2026-06-05, dspark): 공통 컴포넌트 추출 리팩터 (99 backlog #8) —
 *   useMetaEditor + MetaDetailEditor + MetaChildGrid(컬럼). MOD_USER_ID 는 백엔드가 JWT 에서 주입.
 */
import { computed, onMounted } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor } from '@/composables/useMetaEditor';
import { shortCmd } from '@/utils/metaUtils';
import { MSG_NAME_RE, YN_EDIT_OPTIONS } from '@/constants/catalogOptions';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.meta.messages.list,
  initialSize: 50,
  initialFilter: { q: '', typeCd: '', allowChildYn: '', hasParent: '' },
  defaultSort: ['msg_def_id,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', typeCd: '', allowChildYn: '', hasParent: '' },
  chipLabels: { q: '검색', typeCd: 'type', allowChildYn: 'child', hasParent: 'parent' },
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


const columns = [
  { field: 'msgDefId',     label: '메시지 ID', sortable: true, sortKey: 'msg_def_id', width: 220 },
  { field: 'msgDefNm',     label: '한글명',   sortable: true, sortKey: 'msg_def_nm' },
  { field: 'typeCd',       label: 'Type',     sortable: true, sortKey: 'type_cd',   align: 'center', width: 80 },
  { field: 'allowChildYn', label: '자식허용', sortable: true, sortKey: 'allow_child_yn', align: 'center', width: 80 },
  { field: 'parentId',     label: '부모',     width: 160 },
  { field: 'columnCount',  label: '컬럼수',   align: 'right', width: 80 },
];

// ── 편집 폼 옵션 ──
const typeEditOptions = [
  { value: 'DEFAULT', label: 'DEFAULT' },
  { value: 'MT', label: 'MT (타입)' },
  { value: 'ME', label: 'ME (인스턴스)' },
];

const colColumns = [
  { key: 'orderSeq',    label: '순서',   kind: 'number',   width: 56 },
  { key: 'msgColDefId', label: '컬럼 ID', kind: 'text',     placeholder: 'emp_id' },
  { key: 'typeCd',      label: '타입',   kind: 'text',     width: 96, placeholder: 'string' },
  { key: 'labelCd',     label: '라벨',   kind: 'text',     width: 96 },
  { key: 'minLength',   label: '최소',   kind: 'number',   width: 56 },
  { key: 'maxLength',   label: '최대',   kind: 'number',   width: 56 },
  { key: 'mandatoryYn', label: '필수',   kind: 'checkbox' },
  { key: 'useEncYn',    label: '암호화', kind: 'checkbox' },
  { key: 'useYn',       label: '사용',   kind: 'checkbox' },
];
function newCol(rows) {
  const maxSeq = rows.reduce((m, c) => Math.max(m, c.orderSeq || 0), 0);
  return { rowStatus: 'I', msgColDefOid: null, msgColDefId: '', orderSeq: maxSeq + 1,
    typeCd: 'string', labelCd: '', minLength: null, maxLength: null, mandatoryYn: 'N', useEncYn: 'N', useYn: 'Y' };
}

// ── 편집 상태기계 (공통) ──
const editor = useMetaEditor({
  api: adminApi.meta.messages,
  keyField: 'msgDefId',
  domainLabel: '메시지',
  expand: ['children', 'services'],
  defaultTab: 'columns',
  createTab: 'def',
  reload: () => list.reload(),
  blankForm: () => ({
    def: { msgDefId: '', msgDefNm: '', typeCd: 'DEFAULT', parentId: '', allowChildYn: 'N', childColId: '', parentColId: '', note: '' },
    columns: [],
  }),
  toForm: (detail) => {
    const d = detail.def || {};
    return {
      def: {
        msgDefId: d.msgDefId, msgDefNm: d.msgDefNm, typeCd: d.typeCd || 'DEFAULT',
        parentId: d.parentId || '', allowChildYn: d.allowChildYn || 'N',
        childColId: d.childColId || '', parentColId: d.parentColId || '', note: d.note || '',
      },
      columns: (detail.columns || []).map((c) => ({
        rowStatus: '', msgColDefOid: c.msgColDefOid,
        msgColDefId: c.msgColDefId, orderSeq: c.orderSeq, typeCd: c.typeCd || 'string',
        labelCd: c.labelCd || '', minLength: c.minLength, maxLength: c.maxLength,
        mandatoryYn: c.mandatoryYn || 'N', useEncYn: c.useEncYn || 'N', useYn: c.useYn || 'Y',
      })),
    };
  },
  toPayload: (f) => ({ def: { ...f.def }, columns: f.columns }),
  validate: (f, { setTab }) => {
    const d = f.def;
    if (!d.msgDefId || !d.msgDefId.trim()) { toast.error?.('메시지 ID는 필수입니다.'); setTab('def'); return false; }
    if (!d.msgDefNm || !d.msgDefNm.trim()) { toast.error?.('한글명은 필수입니다.'); setTab('def'); return false; }
    for (const c of (f.columns || []).filter((x) => x.rowStatus !== 'D')) {
      if (!c.msgColDefId || !c.msgColDefId.trim()) { toast.error?.('컬럼 ID가 빈 행이 있습니다.'); setTab('columns'); return false; }
      if (!c.typeCd || !c.typeCd.trim()) { toast.error?.(`컬럼 '${c.msgColDefId}'의 타입은 필수입니다.`); setTab('columns'); return false; }
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete, copyJson,
} = editor;

const namePatternOk = computed(() => MSG_NAME_RE.test((form.value?.def?.msgDefId || '').trim()));

const tabItems = computed(() => {
  const editingCount = (form.value.columns || []).filter((c) => c.rowStatus !== 'D').length;
  const items = [
    { name: 'columns', tabLabel: `컬럼 (${isEditing.value ? editingCount : (detail.value?.columns?.length || 0)})` },
    { name: 'def',     tabLabel: '정의' },
  ];
  if (mode.value !== 'create') {
    items.push({ name: 'children', tabLabel: `자식 (${detail.value?.children?.length || 0})` });
    items.push({ name: 'usages',   tabLabel: `사용처 (${detail.value?.usages?.length || 0})` });
  }
  return items;
});


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
          :icon-clickable="false"
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
      <MetaDetailEditor
        :mode="mode"
        :title="modalTitle"
        :loading="detailLoading"
        :saving="saving"
        :tabs="tabItems"
        :active-tab="drawerTab"
        :has-content="mode === 'create' || !!detail"
        :width="980"
        @update:active-tab="(t) => { drawerTab = t; }"
        @edit="enterEdit"
        @delete="confirmDelete = true"
        @save="save"
        @cancel="cancelEdit"
        @close="closePanel"
        @copy="copyJson(detail)"
      >
        <!-- 컬럼 -->
        <section v-if="drawerTab === 'columns'" class="section">
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
          <MetaChildGrid
            v-else
            :rows="form.columns"
            :columns="colColumns"
            key-field="msgColDefOid"
            :new-row="newCol"
            hint="타입: string / numeric / date / clob (또는 value-type MT_*). 개인정보 컬럼은 암호화 체크."
          />
        </section>

        <!-- 정의 -->
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
            <InSelect v-model="form.def.allowChildYn" :options="YN_EDIT_OPTIONS" label="자식 허용" layout="vertical" />
            <InTextField v-model="form.def.parentId" label="부모 메시지 ID" input="자기참조 (선택)" layout="vertical" />
            <InTextField v-model="form.def.childColId" label="child col" input="(선택)" layout="vertical" />
            <InTextField v-model="form.def.parentColId" label="parent col" input="(선택)" layout="vertical" />
            <InTextField v-model="form.def.note" label="비고" input="(선택)" layout="vertical" />
          </div>
        </section>

        <!-- 자식 (view) -->
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

        <!-- 사용처 (view) -->
        <section v-else-if="drawerTab === 'usages'" class="section">
          <p class="muted">이 메시지를 사용하는 서비스</p>
          <ul class="resource-list">
            <li v-for="u in detail.usages" :key="u.svDefId + '-' + u.usage">
              <InTag :label="u.usage" variant="brand" size="sm" />
              <code>{{ u.svDefNm }}</code>
              <span class="muted">{{ shortCmd(u.cmdClassNm) }}</span>
            </li>
            <li v-if="!detail.usages?.length" class="muted">사용처 없음</li>
          </ul>
        </section>
      </MetaDetailEditor>

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
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; word-break: break-all; }
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.hint { margin: 6px 0 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs);
}
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); }
.col-row .seq { display: inline-block; min-width: 24px; text-align: right; color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.col-row .req { color: var(--in-text-error); font-size: var(--in-font-size-sm); }
</style>
