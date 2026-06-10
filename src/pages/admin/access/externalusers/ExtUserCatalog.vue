<script setup>
/**
 * ExtUserCatalog — AUT0100 외부사용자 관리 (admin lane access 차선, 직접 REST).
 * ★ (2026-06-10, dspark): AUT0010 레시피 복제. 외부사용자(파견·협력업체 등)는 사번이 없어
 *   사용자관리(AUT0010)와 별개로 여기서 직접 등록/관리한다. 서브컬렉션 없는 단일 폼.
 *   설계: 02-tobe/04-admin-lane/access-control/05_external-user-aut0100.md.
 *   백엔드: GET/POST/PUT/DELETE /api/admin/access/external-users (+ /{id}/password-reset).
 *   ★ 보안: PASSWORD_VIEW(평문)·CTZ_NO(주민번호) 미노출(S1/S3) / 비번초기화=랜덤 임시비번(S2).
 */
import { computed, onMounted, ref, watch } from 'vue';
import { adminApi } from '@/services/adminApi';
import { usePagedList } from '@/composables/usePagedList';
import { useCatalogFilter } from '@/composables/useCatalogFilter';
import { useToast } from '@/composables/useToast';
import { useMetaEditor, adminErrMsg } from '@/composables/useMetaEditor';

import CatalogPage from '@/components/feature/admin/CatalogPage.vue';
import MetaDetailEditor from '@/components/feature/admin/MetaDetailEditor.vue';
import MetaDefForm from '@/components/feature/admin/MetaDefForm.vue';

import InSearchField from '@/components/ui/InSearchField.vue';
import InButton from '@/components/ui/InButton.vue';
import InModal from '@/components/ui/InModal.vue';

const toast = useToast();

const list = usePagedList({
  fetcher: adminApi.access.externalUsers.list,
  initialSize: 50,
  initialFilter: { q: '' },
  defaultSort: ['user_nm,asc'],
  syncUrl: true,
});

const { staged, activeFilters, applyFilter, resetFilter, removeFilter } = useCatalogFilter({
  list,
  initial: { q: '' },
  chipLabels: { q: '검색' },
});
function onSearch(v) { staged.value.q = v; }

const columns = [
  { field: 'userNm',    label: '성명',     sortable: true, sortKey: 'user_nm', width: 120 },
  { field: 'loginId',   label: '로그인ID', sortable: true, sortKey: 'login_id', width: 160 },
  { field: 'companyNm', label: '파견업체', width: 160 },
  { field: 'deptNm',    label: '부서',     width: 140 },
  { field: 'posNm',     label: '직위',     width: 110 },
  { field: 'telNo1',    label: '연락처',   width: 130 },
];

const tabItems = [{ name: 'def', tabLabel: '정의' }];

const editor = useMetaEditor({
  api: adminApi.access.externalUsers,
  keyField: 'extUserId',
  domainLabel: '외부사용자',
  defaultTab: 'def',
  openInEdit: true,   // ★ (2026-06-10, dspark) 표준: 행 클릭 시 바로 편집
  reload: () => list.reload(),
  blankForm: () => ({
    def: {
      userNm: '', companyCd: '', ctzNo: '', telNo1: '', telNo2: '',
      companyNm: '', deptNm: '', posNm: '', dutyNm: '', typeCd: '', manTypeCd: '',
    },
  }),
  // detail = flat ExtUserRow (서브컬렉션 없음). ctzNo 는 응답 미노출(S3) → 편집 시 빈값(선택 입력).
  toForm: (d) => ({
    def: {
      userNm: d.userNm, companyCd: d.companyCd, ctzNo: '',
      telNo1: d.telNo1, telNo2: d.telNo2, companyNm: d.companyNm,
      deptNm: d.deptNm, posNm: d.posNm, dutyNm: d.dutyNm,
      typeCd: d.typeCd, manTypeCd: d.manTypeCd,
    },
  }),
  // 백엔드 create/update body = flat(ExtUserWrite) → def 만 전송.
  toPayload: (f) => ({ ...f.def }),
  validate: (f, { setTab }) => {
    if (!(f.def.userNm || '').trim()) {
      toast.error?.('성명은 필수입니다.'); setTab('def'); return false;
    }
    return true;
  },
});
const {
  mode, selected, detail, detailLoading, drawerTab, saving, confirmDelete, form, modalTitle,
  openDetail, openCreate, enterEdit, cancelEdit, closePanel, save, doDelete,
} = editor;

const defFields = computed(() => [
  { key: 'userNm', type: 'text', label: '성명', input: '예: 홍길동', required: true },
  { key: 'companyNm', type: 'text', label: '파견업체', input: '예: ○○테크' },
  { key: 'deptNm', type: 'text', label: '부서', input: '예: 인프라팀' },
  { key: 'posNm', type: 'text', label: '직위', input: '예: 과장' },
  { key: 'dutyNm', type: 'text', label: '직책', input: '예: 파트장' },
  { key: 'telNo1', type: 'text', label: '연락처1', input: '예: 010-0000-0000' },
  { key: 'telNo2', type: 'text', label: '연락처2', input: '(선택)' },
  { key: 'typeCd', type: 'text', label: '구분코드', input: '코드값 (선택)',
    hint: '외부사용자 구분 코드. 공통코드 미연동 — 코드값 직접 입력(선택).' },
  { key: 'manTypeCd', type: 'text', label: '관리주체', input: '코드값 (선택)',
    hint: 'PHM_MAN_TYPE_CD. 공통코드 미연동 — 코드값 직접 입력(선택).' },
  { key: 'ctzNo', type: 'text', label: '주민번호', input: '(선택, 미입력 시 변경 안 함)',
    hint: mode.value === 'edit' ? '보안상 기존값 미표시 — 입력 시에만 갱신(S3).' : '선택 입력. 응답에는 노출되지 않습니다(S3).' },
]);

// ── 임시비번 1회 표시 (S2) — 비번초기화 ──
const pwDialog = ref({ open: false, title: '', tempPassword: '', message: '' });
function showPw(title, tempPassword, message) {
  pwDialog.value = { open: true, title, tempPassword: tempPassword || '(없음)', message: message || '' };
}
async function resetPw() {
  if (!selected.value) return;
  try {
    const res = await adminApi.access.externalUsers.passwordReset(selected.value.extUserId);
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
    title="외부사용자 관리"
    :subtitle="`FRM_EXT_USER_INFO · ` + (list.total.value || 0).toLocaleString() + `명`"
    :list="list"
    :columns="columns"
    row-key="extUserId"
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
          input="성명 또는 로그인ID (Enter 또는 [조회])"
          layout="vertical"
          :icon-clickable="false"
          @update:model-value="onSearch"
          @search="applyFilter"
        />
        <InButton class="q-filters__search-btn" variant="primary" size="md" :left-icon-show="false" :right-icon-show="false" @click="applyFilter">조회</InButton>
        <InButton class="q-filters__reset-btn" variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetFilter">초기화</InButton>
      </div>
    </template>

    <template #cell-userNm="{ value }"><strong>{{ value }}</strong></template>

    <template #drawer>
      <MetaDetailEditor
        :mode="mode"
        :title="modalTitle"
        :loading="detailLoading"
        :saving="saving"
        :tabs="tabItems"
        :active-tab="drawerTab"
        :has-content="mode === 'create' || !!detail"
        :width="820"
        deletable-in-edit
        @update:active-tab="(t) => { drawerTab = t; }"
        @edit="enterEdit"
        @delete="confirmDelete = true"
        @save="save"
        @cancel="cancelEdit"
        @close="closePanel"
      >
        <section class="section">
          <dl v-if="mode === 'view'" class="kv">
            <dt>성명</dt><dd>{{ detail.userNm || '—' }}</dd>
            <dt>로그인ID</dt><dd>{{ detail.loginId || '— (연결 계정 없음)' }}</dd>
            <dt>파견업체</dt><dd>{{ detail.companyNm || '—' }}</dd>
            <dt>부서</dt><dd>{{ detail.deptNm || '—' }}</dd>
            <dt>직위</dt><dd>{{ detail.posNm || '—' }}</dd>
            <dt>직책</dt><dd>{{ detail.dutyNm || '—' }}</dd>
            <dt>연락처</dt><dd>{{ detail.telNo1 || '—' }}<span v-if="detail.telNo2"> · {{ detail.telNo2 }}</span></dd>
            <dt>구분</dt><dd>{{ detail.typeCd || '—' }}</dd>
            <dt>관리주체</dt><dd>{{ detail.manTypeCd || '—' }}</dd>
          </dl>
          <MetaDefForm v-else :model="form.def" :fields="defFields" />

          <div v-if="mode !== 'create'" class="pw-actions">
            <InButton variant="default" size="md" :left-icon-show="false" :right-icon-show="false" @click="resetPw">비밀번호 초기화</InButton>
            <span class="hint">랜덤 임시비번 발급(S2). 연결 로그인 계정(FRM_USER)이 없으면 실패합니다.</span>
          </div>
        </section>
      </MetaDetailEditor>

      <!-- 삭제 확인 -->
      <InModal
        v-if="confirmDelete"
        :model-value="confirmDelete"
        type="confirm"
        title="외부사용자 삭제"
        :message="`'${selected?.userNm}' 외부사용자를 삭제할까요?`"
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
.q-filters__search-btn, .q-filters__reset-btn { flex: 0 0 auto; align-self: flex-end; }
.section { padding: 12px 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
.kv dt { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); }
.kv dd { margin: 0; color: var(--in-text-default); word-break: break-all; }
.pw-actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--in-border-subtle, #eee); flex-wrap: wrap; }
.hint { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
</style>
