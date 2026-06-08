<script setup>
/**
 * UserCatalog — AUT0010 사용자관리 (admin lane access 차선, 직접 REST).
 * ★ (2026-06-08, dspark): access-control 첫 화면(파일럿). 메타 카탈로그 공통 자산 재사용
 *   (usePagedList + useCatalogFilter + useMetaEditor + CatalogPage + MetaDetailEditor + MetaChildGrid + MetaDefForm).
 *   설계: 02-tobe/04-admin-lane/access-control/01_user-aut0010.md.
 *   백엔드: GET/POST/PUT/DELETE /api/admin/access/users (+ /exists?loginId, /{id}/password-reset).
 *   보안: 비밀번호 미노출 / 비번초기화 = 랜덤 임시비번(S2) / 삭제 = 단일 트랜잭션(S4, 그룹멤버 가드).
 */
import { computed, onMounted, ref, watch } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor, adminErrMsg } from '@/composables/useMetaEditor';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaChildGrid from '@/components/feature/admin/MetaChildGrid.vue';
import MetaDefForm from '@/components/feature/admin/MetaDefForm.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InTag from '@/components/ui/InTag.vue';
import InModal from '@/components/ui/InModal.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.access.users.list,
  initialSize: 50,
  initialFilter: { q: '', statusCd: '' },
  defaultSort: ['login_id,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '', statusCd: '' },
  chipLabels: { q: '검색', statusCd: '상태' },
});
function onSearch(v) { staged.value.q = v; }
function onStatus(v) { staged.value.statusCd = v; }

const statusFilterOptions = [
  { value: '', label: '전체 상태' },
  { value: 'Y', label: '사용 (Y)' },
  { value: 'N', label: '잠금 (N)' },
];
const statusEditOptions = [
  { value: 'Y', label: '사용 (Y)' },
  { value: 'N', label: '잠금 (N)' },
];

const columns = [
  { field: 'loginId',       label: '로그인ID', sortable: true, sortKey: 'login_id', width: 170 },
  { field: 'userNm',        label: '성명',     sortable: true, sortKey: 'user_nm',  width: 120 },
  { field: 'orgNm',         label: '소속',     width: 200 },
  { field: 'statusCd',      label: '상태',     sortable: true, sortKey: 'status_cd', align: 'center', width: 90 },
  { field: 'tryCnt',        label: '시도',     sortable: true, sortKey: 'try_cnt',  align: 'center', width: 60 },
  { field: 'bindingTypeCd', label: '구분',     align: 'center', width: 80 },
];

// ── 사용자옵션 자식 그리드 ──
const optionColumns = [
  { key: 'attributeName',  label: '속성명', kind: 'text', placeholder: 'theme / IP / layout_type' },
  { key: 'attributeValue', label: '속성값', kind: 'text', placeholder: 'ui-base' },
];
function newOption() {
  return { rowStatus: 'I', optionId: null, attributeName: '', attributeValue: '' };
}

// ── 편집 상태기계 (공통) ──
const editor = useMetaEditor({
  api: adminApi.access.users,
  keyField: 'userId',
  domainLabel: '사용자',
  expand: ['options'],
  defaultTab: 'def',
  reload: () => list.reload(),
  blankForm: () => ({
    def: {
      loginId: '', userNm: '', orgNm: '', email: '', statusCd: 'Y', tryCnt: 0,
      initYn: 'Y', bindingTypeCd: '', empId: '', mapId: null, companyCd: '',
    },
    options: [],
  }),
  toForm: (d) => {
    const f = d.def || {};
    return {
      def: {
        loginId: f.loginId, userNm: f.userNm, orgNm: f.orgNm, email: f.email,
        statusCd: f.statusCd || 'Y', tryCnt: f.tryCnt ?? 0, initYn: f.initYn,
        bindingTypeCd: f.bindingTypeCd, empId: f.empId, mapId: f.mapId, companyCd: f.companyCd,
      },
      options: (d.options || []).map((o) => ({
        rowStatus: '', optionId: o.optionId,
        attributeName: o.attributeName, attributeValue: o.attributeValue,
      })),
    };
  },
  toPayload: (f) => ({
    def: { ...f.def, tryCnt: f.def.tryCnt === '' || f.def.tryCnt == null ? null : Number(f.def.tryCnt) },
    options: f.options,
  }),
  validate: (f, { mode, setTab }) => {
    if (mode === 'create' && !(f.def.loginId || '').trim()) {
      toast.error?.('로그인ID는 필수입니다.'); setTab('def'); return false;
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, isEditing, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete,
} = editor;

const defFields = computed(() => [
  { key: 'loginId', type: 'text', label: '로그인ID', input: '예: white', required: true,
    disabled: mode.value === 'edit',
    hint: mode.value === 'edit' ? '로그인ID는 변경할 수 없습니다.' : undefined },
  { key: 'userNm', type: 'text', label: '성명', disabled: true, hint: '인사정보(재직뷰) 자동 — 편집 불가' },
  { key: 'bindingTypeCd', type: 'text', label: '사용자구분', input: '예: EMP' },
  { key: 'statusCd', type: 'select', label: '상태', options: statusEditOptions },
  { key: 'tryCnt', type: 'text', label: '접속시도횟수', input: '0' },
  { key: 'email', type: 'text', label: 'E-Mail', input: 'name@company.com' },
  { key: 'empId', type: 'text', label: '사원ID(empId)', input: '신규 사원 연결 시 (선택)',
    hint: mode.value === 'create' ? '신규 계정을 사원과 연결하려면 EMP_ID 입력' : undefined },
]);

const tabItems = computed(() => {
  const editingCount = (form.value.options || []).filter((o) => o.rowStatus !== 'D').length;
  return [
    { name: 'def', tabLabel: '정의' },
    { name: 'options', tabLabel: `옵션 (${isEditing.value ? editingCount : (detail.value?.options?.length || 0)})` },
  ];
});

// ── 임시비번 1회 표시 (S2) — 신규 생성 응답 + 비번초기화 ──
const pwDialog = ref({ open: false, title: '', tempPassword: '', message: '' });
function showPw(title, tempPassword, message) {
  pwDialog.value = { open: true, title, tempPassword: tempPassword || '(없음)', message: message || '' };
}
// 신규 등록 응답에 tempPassword 가 실려오면 표시 (조회 상세는 tempPassword=null → 무시).
watch(() => detail.value && detail.value.tempPassword, (tp) => {
  if (tp) showPw('임시 비밀번호 발급 (신규 계정)', tp, '사용자에게 안전한 채널로 전달하세요. 최초 로그인 시 변경이 필요합니다.');
});

async function resetPw() {
  if (!selected.value) return;
  try {
    const res = await adminApi.access.users.passwordReset(selected.value.userId);
    const data = res?.data ?? res;
    showPw('임시 비밀번호 발급', data.tempPassword, data.message);
  } catch (e) {
    toast.error?.(adminErrMsg(e));
  }
}

onMounted(() => list.reload());
</script>

<template>
  <CatalogPage
    title="사용자 관리"
    :subtitle="`FRM_USER · 재직 활성 계정 ` + (list.total.value || 0).toLocaleString() + `건`"
    :list="list"
    :columns="columns"
    row-key="userId"
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
      <div class="q-filters">
        <InSearchField
          :model-value="staged.q"
          label="검색"
          input="로그인ID 또는 성명 (Enter 또는 [조회])"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InSelect
          :model-value="staged.statusCd"
          :options="statusFilterOptions"
          label="상태"
          input="전체"
          layout="vertical"
          size="sm"
          @update:model-value="onStatus"
        />
        <InButton class="q-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="q-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-loginId="{ value }"><strong>{{ value }}</strong></template>
    <template #cell-statusCd="{ value }">
      <InTag v-if="value === 'Y'" label="사용" variant="success" size="sm" />
      <span v-else class="muted">잠금</span>
    </template>

    <template #drawer>
      <MetaDetailEditor
        :mode="mode"
        :title="modalTitle"
        :loading="detailLoading"
        :saving="saving"
        :tabs="tabItems"
        :active-tab="drawerTab"
        :has-content="mode === 'create' || !!detail"
        :width="880"
        @update:active-tab="(t) => { drawerTab = t; }"
        @edit="enterEdit"
        @delete="confirmDelete = true"
        @save="save"
        @cancel="cancelEdit"
        @close="closePanel"
      >
        <!-- 정의 -->
        <section v-if="drawerTab === 'def'" class="section">
          <dl v-if="mode === 'view'" class="kv">
            <dt>로그인ID</dt><dd>{{ detail.def.loginId }}</dd>
            <dt>성명</dt><dd>{{ detail.def.userNm || '—' }}</dd>
            <dt>소속</dt><dd>{{ detail.def.orgNm || '—' }}</dd>
            <dt>사용자구분</dt><dd>{{ detail.def.bindingTypeCd || '—' }}</dd>
            <dt>상태</dt><dd>{{ detail.def.statusCd === 'Y' ? '사용' : '잠금' }} ({{ detail.def.statusCd }})</dd>
            <dt>접속시도</dt><dd>{{ detail.def.tryCnt ?? '—' }}</dd>
            <dt>E-Mail</dt><dd>{{ detail.def.email || '—' }}</dd>
            <dt>비번초기화</dt><dd>{{ detail.def.initYn || '—' }}</dd>
          </dl>

          <MetaDefForm v-else :model="form.def" :fields="defFields" />

          <div v-if="mode === 'view'" class="pw-actions">
            <InButton variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetPw">비밀번호 초기화</InButton>
            <span class="hint">랜덤 임시비번 발급 + 최초 로그인 강제 변경 (주민번호 기반 폐기 — S2)</span>
          </div>
        </section>

        <!-- 사용자옵션 -->
        <section v-else-if="drawerTab === 'options'" class="section">
          <ul v-if="mode === 'view'" class="resource-list">
            <li v-for="o in detail.options" :key="o.optionId">
              <code>{{ o.attributeName }}</code>
              <span class="muted">= {{ o.attributeValue }}</span>
            </li>
            <li v-if="!detail.options?.length" class="muted">옵션 없음</li>
          </ul>
          <MetaChildGrid v-else :rows="form.options" :columns="optionColumns" key-field="optionId" :new-row="newOption" />
        </section>
      </MetaDetailEditor>

      <!-- 삭제 확인 -->
      <InModal
        v-if="confirmDelete"
        :model-value="confirmDelete"
        type="confirm"
        title="사용자 삭제"
        :message="`'${selected?.loginId}' 계정을 삭제할까요? 옵션·사원매핑까지 단일 트랜잭션으로 삭제됩니다. (그룹 멤버이면 차단됩니다.)`"
        confirm-text="삭제"
        cancel-text="취소"
        @confirm="doDelete"
        @cancel="confirmDelete = false"
        @update:model-value="(v) => { if (!v) confirmDelete = false; }"
      />

      <!-- 임시비번 표시 (1회) -->
      <InModal
        v-if="pwDialog.open"
        :model-value="pwDialog.open"
        type="confirm"
        :title="pwDialog.title"
        :message="`임시 비밀번호:  ${pwDialog.tempPassword}\n\n${pwDialog.message}`"
        confirm-text="확인"
        cancel-text="닫기"
        @confirm="pwDialog.open = false"
        @cancel="pwDialog.open = false"
        @update:model-value="(v) => { if (!v) pwDialog.open = false; }"
      />
    </template>
  </CatalogPage>
</template>

<style scoped>
.q-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.q-filters > :deep(.in-sf) { flex: 1 1 320px; min-width: 280px; }
.q-filters > :deep(.in-sel) { flex: 0 0 200px; }
.q-filters__search-btn, .q-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.muted { color: var(--in-text-subtle); }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }
.pw-actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--in-border-subtle, #eee); flex-wrap: wrap; }
.hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.resource-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.resource-list li {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px; background: var(--in-bg-default); border-radius: var(--in-radius-xs);
}
.resource-list code { font-family: var(--in-font-family-mono, ui-monospace); font-size: var(--in-font-size-sm); color: var(--in-text-default); }
</style>
