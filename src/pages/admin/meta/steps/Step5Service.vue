<script setup>
/**
 * Step5Service — 마법사 마지막 단계 (P5-A + P6 통합).
 *
 * 책임:
 *  1. 자원 binding 일괄 readonly 확인 (Step1~4 결과 요약)
 *  2. 자동 바인딩 preflight 검증 — preflightServiceBinding (99 §4-2.1 함정 차단)
 *  3. 서비스 메타 옵션 (CMD class / 매핑 / func_nm — readonly)
 *  4. Object 추가 메타 (DISPLAY_NM / LINK / TYPE / HEIGHT-WIDTH / NOTE) — AUT0030 등록용
 *  5. Menu 메타 (parent / menu_id auto / name / icon / use_yn) — AUT0050 등록용
 *  6. Auth binding (기존 활용 / 신규 생성) — AUT0040 등록용
 *  7. 일괄 등록 액션 — Object → Service → Menu → Auth 순차 envelope
 *  8. E2E 검증 — 등록 후 LNB 메뉴 fetch + 신규 메뉴 노출 확인 + 자기참조 검증
 *
 * 매뉴얼 근거:
 *  - SUMMARY §3~9 — Object/Service/Menu/Auth 등록
 *  - 99 §4-2.1 — 자동 바인딩 함정
 *  - 99 §5-3.7-A — LNB 가시성 모델 (auth_item 별 활성 컨텍스트)
 *  - 99 §5-2.4 — TEST_* prefix 운영 데이터 충돌 위험
 */
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useMetaWizardStore } from '@/stores/metaWizard';
import {
  saveObject,
  saveServiceEasy,
  saveMenu,
  bindAuthMenu,
  fetchLnbMenus,
  classifyMetaError,
  getMetaErrorGuide,
  preflightServiceBinding,
  extractInsertedOid,
  META_SERVICES,
} from '@/services/metaApi';
import { buildEnvelope } from '@/services/envelope';

import InMetaStepHeader from '@/components/feature/meta/InMetaStepHeader.vue';
import InMetaStepSection from '@/components/feature/meta/InMetaStepSection.vue';
import InMetaStepActions from '@/components/feature/meta/InMetaStepActions.vue';
import InMetaErrorCard from '@/components/feature/meta/InMetaErrorCard.vue';
import InMetaResourceSummary from '@/components/feature/meta/InMetaResourceSummary.vue';

import InTextField from '@/components/ui/InTextField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InButton from '@/components/ui/InButton.vue';
import InIcon from '@/components/ui/InIcon.vue';

const store = useMetaWizardStore();
const {
  service,
  serviceStep,
  object,
  objectStep,
  menu,
  menuStep,
  auth,
  authStep,
  e2e,
  derivedIds,
  requiresEntity,
  sqlStep,
  messageStep,
  entityStep,
  currentVerifyQueries,
} = storeToRefs(store);

// ─── [1] 자원 binding 요약 ──────────────────────────────────────────────────
const summaryRows = computed(() => {
  const ids = derivedIds.value;
  if (!ids) return [];
  const rows = [
    { kind: 'OBJECT',  label: 'Object',   id: ids.object,      oid: objectStep.value.insertedOid,    status: objectStep.value.status === 'completed' ? 'saved' : 'pending' },
    { kind: 'SQL',     label: 'SQL',      id: ids.sqlName,     oid: sqlStep.value.insertedOid,        status: sqlStep.value.status === 'completed' ? 'saved' : 'pending' },
    { kind: 'MSG_IN',  label: 'Msg IN',   id: ids.msgIn,       oid: messageStep.value.insertedOid?.in,  status: messageStep.value.status === 'completed' ? 'saved' : 'pending' },
    { kind: 'MSG_OUT', label: 'Msg OUT',  id: ids.msgOut,      oid: messageStep.value.insertedOid?.out, status: messageStep.value.status === 'completed' ? 'saved' : 'pending' },
  ];
  if (requiresEntity.value && ids.entityName) {
    rows.push({
      kind: 'ENTITY', label: 'Entity', id: ids.entityName,
      oid: entityStep.value.insertedOid,
      status: entityStep.value.status === 'completed' ? 'saved' : 'pending',
      hint: 'silent no-op 차단 핵심',
    });
  }
  rows.push({
    kind: 'SERVICE', label: 'Service', id: ids.serviceName,
    oid: serviceStep.value.insertedOid,
    status: serviceStep.value.status === 'completed' ? 'saved' : 'pending',
  });
  rows.push({
    kind: 'MENU', label: 'Menu', id: menu.value.menuId || '(미정)',
    oid: menuStep.value.insertedOid,
    status: menuStep.value.status === 'completed' ? 'saved' : 'pending',
  });
  rows.push({
    kind: 'AUTH', label: 'Auth', id: auth.value.mode === 'EXISTING' ? auth.value.selectedExisting : auth.value.authItemId,
    oid: authStep.value.insertedOid,
    status: authStep.value.status === 'completed' ? 'saved' : 'pending',
  });
  return rows;
});

// ─── [2] preflight ──────────────────────────────────────────────────────────
const preflight = ref({ state: 'idle', checks: [], runAt: null });

async function runPreflight() {
  if (!derivedIds.value) return;
  preflight.value = { state: 'running', checks: [], runAt: null };
  const ids = derivedIds.value;
  try {
    const result = await preflightServiceBinding({
      screenId: ids.screenId,
      serviceId: ids.serviceName,
      sqlName: ids.sqlName,
      msgInId: ids.msgIn,
      msgOutId: typeof ids.msgOut === 'string' && ids.msgOut.startsWith('MT_') ? ids.msgOut : `MT_${ids.screenId}_02`,
      requiresEntity: requiresEntity.value,
      entityName: ids.entityName,
    });
    preflight.value = { state: result.ok ? 'ok' : 'fail', checks: result.checks, runAt: new Date().toISOString() };
  } catch (e) {
    preflight.value = { state: 'fail', checks: [{ key: 'network', label: 'Preflight 호출', ok: false, hint: e?.message || '네트워크 오류' }], runAt: new Date().toISOString() };
  }
}
const preflightHasHardFail = computed(() => preflight.value.checks.some((c) => c.ok === false));

// ─── 검증 SQL 패널 갱신 ─────────────────────────────────────────────────────
function refreshVerifyQueries() {
  const ids = derivedIds.value;
  if (!ids) {
    currentVerifyQueries.value = [];
    return;
  }
  currentVerifyQueries.value = [
    {
      title: '서비스 정의 + binding + 함수 매핑 한번에',
      sql: `SELECT 'DEF' lvl, s.sv_def_nm id, s.cmd_class_nm extra
  FROM FRM_SERVICE_DEF s WHERE s.sv_def_nm = '${ids.serviceName}'
UNION ALL
SELECT 'ATTR', a.sv_attr_nm, a.value_type
  FROM FRM_SERVICE_ATTR a
  JOIN FRM_SERVICE_DEF s ON a.sv_def_oid = s.sv_def_oid
 WHERE s.sv_def_nm = '${ids.serviceName}'
UNION ALL
SELECT 'FUNC', m.func_nm, m.sv_map_type_cd
  FROM FRM_SERVICE_FUNC_MAP m
  JOIN FRM_SERVICE_DEF s ON m.sv_def_oid = s.sv_def_oid
 WHERE s.sv_def_nm = '${ids.serviceName}';`,
      expectation: '서비스 1행 + ATTR (IN/OUT 2~4행) + FUNC 1행',
    },
    {
      title: '오브젝트 + 메뉴 + 권한 binding 통합 확인',
      sql: `SELECT 'OBJECT' lvl, eo.object_nm id, eo.object_link extra
  FROM FRM_EXECUTABLE_OBJECT eo WHERE eo.object_nm = '${ids.object}'
UNION ALL
SELECT 'MENU', m.menu_id, m.menu_nm
  FROM FRM_MENU m WHERE m.menu_id = '${menu.value.menuId}'
UNION ALL
SELECT 'AUTH', amb.auth_item_id, amb.menu_id
  FROM FRM_AUTH_MENU_BINDING_W amb
 WHERE amb.menu_id = '${menu.value.menuId}';`,
      expectation: 'OBJECT 1행 + MENU 1행 + AUTH 1+ 행',
    },
    {
      title: 'E2E — 자기참조 메타 조회 (등록 후 LNB 클릭 시 동작 확인)',
      sql: `-- 등록한 화면을 자기 자신 검색으로 노출 확인
SELECT object_id, object_nm, object_display_nm, object_type, object_link
  FROM FRM_EXECUTABLE_OBJECT
 WHERE object_nm LIKE '${ids.screenId}%'
 ORDER BY object_nm;`,
      expectation: '신규 등록 오브젝트가 결과에 1행 포함',
    },
  ];
}
watch(() => derivedIds.value?.serviceName, refreshVerifyQueries, { immediate: true });

// ─── [3~6] 일괄 등록 ────────────────────────────────────────────────────────
const errorGuide = ref(null);
const batchProgress = ref({
  active: false,
  phase: '',          // 'object'|'service'|'menu'|'auth'|'done'
  message: '',
});

const canBatchSubmit = computed(() => {
  if (batchProgress.value.active) return false;
  if (!derivedIds.value?.serviceName) return false;
  if (!object.value.objectDisplayNm.trim()) return false;
  if (!menu.value.menuId.trim() || !menu.value.menuNm.trim()) return false;
  if (auth.value.mode === 'NEW' && (!auth.value.authItemId.trim() || !auth.value.authItemNm.trim())) return false;
  if (preflight.value.state === 'fail' && preflightHasHardFail.value) return false;
  return true;
});

async function onBatchRegister() {
  errorGuide.value = null;
  batchProgress.value = { active: true, phase: 'object', message: 'Object 등록 중…' };
  serviceStep.value.status = 'in_progress';
  objectStep.value.status = 'in_progress';
  menuStep.value.status = 'in_progress';
  authStep.value.status = 'in_progress';

  const ids = derivedIds.value;

  // ── Object 등록 ──
  try {
    const { ok, response } = await saveObject({
      object_nm: ids.object,
      object_display_nm: object.value.objectDisplayNm,
      object_type: object.value.objectType,
      object_link: object.value.objectLink,
      object_height: object.value.objectHeight || null,
      object_width: object.value.objectWidth || null,
      note: object.value.objectNote,
      use_yn: 'Y',
      company_cd: '01',
    });
    if (!ok) {
      const cat = classifyMetaError(response);
      errorGuide.value = { category: cat, phase: 'object', ...getMetaErrorGuide(cat) };
      store.markStepError('object', errorGuide.value.title, { response });
      batchProgress.value = { active: false, phase: 'object', message: '실패' };
      return;
    }
    const oid = extractInsertedOid(response, 'ME_SAVE_RESULT', 'object_id');
    store.markStepCompleted('object', { insertedOid: oid, response });
  } catch (e) {
    errorGuide.value = { category: 'NETWORK', phase: 'object', title: 'Object 네트워크 오류', hint: e?.message || '연결 실패' };
    store.markStepError('object', errorGuide.value.title);
    batchProgress.value = { active: false, phase: 'object', message: '실패' };
    return;
  }

  // ── Service 등록 (IST0050 간편입력 PROCEDURE) ──
  batchProgress.value = { active: true, phase: 'service', message: '서비스 등록 중…' };
  try {
    const payload = {
      ME_IST0050_03_01: [{
        sStatus: 'I', _seq: 1, sDelete: '',
        sv_def_nm: ids.serviceName,
        cmd_class_nm: service.value.cmdClassNm,
        sv_map_type_cd: service.value.svMapTypeCd,
        func_nm: service.value.funcNm,
        use_yn: 'Y',
        company_cd: '01',
      }],
    };
    const { ok, response } = await saveServiceEasy(payload);
    if (!ok) {
      const cat = classifyMetaError(response);
      errorGuide.value = { category: cat, phase: 'service', ...getMetaErrorGuide(cat) };
      store.markStepError('service', errorGuide.value.title, { response });
      batchProgress.value = { active: false, phase: 'service', message: '실패' };
      return;
    }
    const oid = extractInsertedOid(response, 'ME_FRM_SP_RESULT', 'sv_def_oid');
    store.markStepCompleted('service', { insertedOid: oid, response });
  } catch (e) {
    errorGuide.value = { category: 'NETWORK', phase: 'service', title: '서비스 네트워크 오류', hint: e?.message };
    store.markStepError('service', errorGuide.value.title);
    batchProgress.value = { active: false, phase: 'service', message: '실패' };
    return;
  }

  // ── Menu 등록 ──
  batchProgress.value = { active: true, phase: 'menu', message: '메뉴 등록 중…' };
  try {
    const { ok, response } = await saveMenu({
      menu_id: menu.value.menuId,
      parent_menu_id: menu.value.parentMenuId,
      menu_nm: menu.value.menuNm,
      icon_default: menu.value.iconKey || null,
      use_yn: menu.value.useYn,
      close_yn: menu.value.closeYn,
      depth: menu.value.depth,
      object_id: ids.object,    // ★ OBJECT_NM 문자열 (99 §5-2.2 misleading 컬럼명)
      company_cd: '01',
    });
    if (!ok) {
      const cat = classifyMetaError(response);
      errorGuide.value = { category: cat, phase: 'menu', ...getMetaErrorGuide(cat) };
      store.markStepError('menu', errorGuide.value.title, { response });
      batchProgress.value = { active: false, phase: 'menu', message: '실패' };
      return;
    }
    const oid = extractInsertedOid(response, 'ME_SAVE_RESULT', 'menu_oid');
    store.markStepCompleted('menu', { insertedOid: oid, response });
  } catch (e) {
    errorGuide.value = { category: 'NETWORK', phase: 'menu', title: '메뉴 네트워크 오류', hint: e?.message };
    store.markStepError('menu', errorGuide.value.title);
    batchProgress.value = { active: false, phase: 'menu', message: '실패' };
    return;
  }

  // ── Auth binding ──
  batchProgress.value = { active: true, phase: 'auth', message: '권한 binding 중…' };
  try {
    const authItemId = auth.value.mode === 'EXISTING' ? auth.value.selectedExisting : auth.value.authItemId;
    const { ok, response } = await bindAuthMenu({
      auth_item_id: authItemId,
      menu_id: menu.value.menuId,
      use_yn: 'Y',
      company_cd: '01',
    });
    if (!ok) {
      const cat = classifyMetaError(response);
      errorGuide.value = { category: cat, phase: 'auth', ...getMetaErrorGuide(cat) };
      store.markStepError('auth', errorGuide.value.title, { response });
      batchProgress.value = { active: false, phase: 'auth', message: '실패' };
      return;
    }
    const oid = extractInsertedOid(response, 'ME_SAVE_RESULT', 'auth_item_id');
    store.markStepCompleted('auth', { insertedOid: oid, response });
  } catch (e) {
    errorGuide.value = { category: 'NETWORK', phase: 'auth', title: '권한 네트워크 오류', hint: e?.message };
    store.markStepError('auth', errorGuide.value.title);
    batchProgress.value = { active: false, phase: 'auth', message: '실패' };
    return;
  }

  // ── 완료 ──
  batchProgress.value = { active: false, phase: 'done', message: '4단계 일괄 등록 완료' };

  // E2E 자동 실행
  setTimeout(runE2E, 200);
}

function onSkipBatch() {
  if (!confirm('백엔드 등록을 건너뛰고 마법사를 종료합니다 (학습 모드).')) return;
  store.markStepCompleted('object', { insertedOid: null });
  store.markStepCompleted('service', { insertedOid: null });
  store.markStepCompleted('menu', { insertedOid: null });
  store.markStepCompleted('auth', { insertedOid: null });
  batchProgress.value = { active: false, phase: 'done', message: '학습 모드 — 실제 등록 없음' };
}

// ─── E2E 검증 ──────────────────────────────────────────────────────────────
async function runE2E() {
  e2e.value = { status: 'running', checks: [], runAt: null };
  const ids = derivedIds.value;
  const checks = [];

  // Check 1 — LNB 메뉴 fetch 후 신규 메뉴 노출
  try {
    const authItemId = auth.value.mode === 'EXISTING' ? auth.value.selectedExisting : auth.value.authItemId;
    const { ok, menus } = await fetchLnbMenus({ authItemId });
    const flat = JSON.stringify(menus);
    const found = flat.includes(menu.value.menuId);
    checks.push({
      key: 'lnb-visibility',
      label: 'LNB 메뉴 노출',
      ok: ok && found,
      hint: ok
        ? (found ? `OK — '${menu.value.menuId}' 가 LNB 응답에 포함` : `미발견 — auth_item '${authItemId}' 컨텍스트에서 메뉴 미노출 (99 §5-3.7-A — ACCESS_* 패턴 / 캐시 invalidate 필요)`)
        : '서버 미연결 — 검증 불가',
    });
  } catch (e) {
    checks.push({ key: 'lnb-visibility', label: 'LNB 메뉴 노출', ok: null, hint: e?.message || '오류' });
  }

  // Check 2 — Object 자기참조 가능 (등록한 화면이 자체 조회 가능)
  try {
    const { callMetaService } = await import('@/services/metaApi');
    const { ok, response } = await callMetaService(
      META_SERVICES.OBJECT_LIST,
      { ME_AUT0030_01: [{ _seq: 1, sStatus: 'R', sDelete: '', object_nm: ids.screenId, company_cd: '01' }] },
      { actionType: 'retrieve', suppressError: true },
    );
    const rows = response?.BODY?.ME_AUT0030_02 || [];
    const found = rows.some((r) => String(r.object_nm || r.OBJECT_NM || '').startsWith(ids.screenId));
    checks.push({
      key: 'self-ref',
      label: '자기참조 조회',
      ok: ok && found,
      hint: ok
        ? (found ? `OK — '${ids.screenId}' 검색 시 결과 포함` : '미발견')
        : '서버 미연결 — 검증 불가',
    });
  } catch (e) {
    checks.push({ key: 'self-ref', label: '자기참조 조회', ok: null, hint: e?.message || '오류' });
  }

  const passed = checks.every((c) => c.ok !== false);
  e2e.value = { status: passed ? 'passed' : 'failed', checks, runAt: new Date().toISOString() };
}

// ─── UI helper ──────────────────────────────────────────────────────────────
const OBJECT_TYPE_OPTS = [
  { value: 'view',    label: '뷰 (일반 JSP 화면)' },
  { value: 'popup',   label: '팝업' },
  { value: 'elaform', label: '전자결재 폼' },
  { value: 'report',  label: '리포트' },
];
const USE_YN_OPTS = [
  { value: 'Y', label: '사용' },
  { value: 'N', label: '미사용' },
];
const PARENT_MENU_HINTS = [
  { value: 'SYS_DEV',   label: 'SYS_DEV — 개발 및 수정작업' },
  { value: 'SYS_ADMIN', label: 'SYS_ADMIN — 시스템관리' },
  { value: 'PHM',       label: 'PHM — 인사기본' },
  { value: 'PAY',       label: 'PAY — 급여' },
  { value: 'DTS',       label: 'DTS — 근태' },
];

function checkIcon(ok) {
  if (ok === true) return 'check-circle';
  if (ok === false) return 'status-error';
  return 'help';
}
function checkClass(ok) {
  if (ok === true) return 'step5__check-ok';
  if (ok === false) return 'step5__check-fail';
  return 'step5__check-unknown';
}
function batchPhaseClass(p) {
  if (batchProgress.value.phase === p && batchProgress.value.active) return 'step5__batch-phase--active';
  if (objectStep.value.status === 'completed' && p === 'object') return 'step5__batch-phase--done';
  if (serviceStep.value.status === 'completed' && p === 'service') return 'step5__batch-phase--done';
  if (menuStep.value.status === 'completed' && p === 'menu') return 'step5__batch-phase--done';
  if (authStep.value.status === 'completed' && p === 'auth') return 'step5__batch-phase--done';
  return '';
}
</script>

<template>
  <div class="step5">
    <InMetaStepHeader
      prefix="⑤"
      title="Service + Object + Menu + Auth + E2E"
      :code="derivedIds?.serviceName"
    >
      <template #subtitle>
        Step1~4 의 자원이 자동 binding 되어 <strong>4개 envelope 일괄 등록</strong>.
        등록 후 자동 E2E 검증으로 LNB 메뉴 노출 + 자기참조 동작 확인.
      </template>
    </InMetaStepHeader>

    <!-- ─── [1] 자원 binding 요약 ─── -->
    <InMetaStepSection step-no="1" title="자원 binding 일괄 확인">
      <template #hint>Step1~4 누적 + 본 단계의 Object/Menu/Auth 행 포함 — 일괄 등록 진행 시 차례로 saved</template>
      <InMetaResourceSummary :rows="summaryRows" />
    </InMetaStepSection>

    <!-- ─── [2] preflight ─── -->
    <InMetaStepSection step-no="2" title="자동 바인딩 preflight">
      <template #hint>PROCEDURE 자동 바인딩 함정 사전 차단</template>
      <template #actions>
        <InButton
          variant="default"
          size="sm"
          :left-icon-show="false"
          :right-icon-show="false"
          :disabled="preflight.state === 'running'"
          @click="runPreflight"
        >
          {{ preflight.state === 'running' ? '검증 중…' : (preflight.runAt ? '재실행' : '실행') }}
        </InButton>
      </template>

      <div v-if="preflight.state === 'idle'" class="step5__pf-empty">
        [실행] 버튼으로 사전 검증을 시작하세요.
      </div>
      <ul v-else class="step5__pf-list">
        <li v-for="c in preflight.checks" :key="c.key" class="step5__pf-item" :class="checkClass(c.ok)">
          <InIcon :name="checkIcon(c.ok)" :size="16" />
          <div class="step5__pf-body">
            <strong>{{ c.label }}</strong>
            <span>{{ c.hint }}</span>
          </div>
        </li>
      </ul>
    </InMetaStepSection>

    <!-- ─── [3] 서비스 메타 옵션 ─── -->
    <InMetaStepSection step-no="3" title="서비스 메타 (자동)" tone="muted">
      <template #hint>모두 자동 채워졌습니다. 변경하려면 ① ID 게이트부터 다시</template>
      <dl class="step5__opt-dl">
        <dt>CMD Class</dt><dd><code>{{ service.cmdClassNm }}</code></dd>
        <dt>매핑 종류</dt>
        <dd>
          <code>{{ service.svMapTypeCd }}</code>
          <span class="step5__opt-hint">{{
            service.svMapTypeCd === 'entity' ? '— Entity 경로 (Save, silent no-op 차단)' :
            service.svMapTypeCd === 'sql' ? '— SQL 경로 (조회)' : ''
          }}</span>
        </dd>
        <dt>func_nm</dt><dd><code>{{ service.funcNm }}</code></dd>
      </dl>
    </InMetaStepSection>

    <!-- ─── [4] Object 추가 메타 ─── -->
    <InMetaStepSection step-no="4" title="Object 추가 메타 (AUT0030)">
      <template #hint>화면 표시명·LINK (자동) + 유형 + 옵션</template>

      <div class="step5__grid">
        <InTextField
          v-model="object.objectDisplayNm"
          label="화면 표시명"
          layout="vertical"
          size="md"
          placeholder="예: TST0001 화면"
          show-required
        />
        <InTextField
          v-model="object.objectLink"
          label="OBJECT_LINK (JSP 경로)"
          layout="vertical"
          size="md"
        />
        <InSelect
          v-model="object.objectType"
          :options="OBJECT_TYPE_OPTS"
          label="오브젝트 유형"
          layout="vertical"
          size="md"
        />
        <div class="step5__field">
          <label>HEIGHT / WIDTH (다이얼로그 호출 시만)</label>
          <div class="step5__dual-input">
            <input v-model="object.objectHeight" class="step5__mini-input" placeholder="높이" />
            <input v-model="object.objectWidth" class="step5__mini-input" placeholder="너비" />
          </div>
          <span class="step5__hint">SUMMARY §3.2.1 — 메뉴 진입 화면이면 비워둠</span>
        </div>
        <div class="step5__grid-full">
          <label class="step5__label">비고 (NOTE)</label>
          <textarea v-model="object.objectNote" class="step5__textarea" rows="2" placeholder="용도·주의사항" />
        </div>
      </div>
    </InMetaStepSection>

    <!-- ─── [5] Menu ─── -->
    <InMetaStepSection step-no="5" title="메뉴 등록 (AUT0050)">
      <template #hint>LNB 트리 상위 메뉴 + 이름 + 사용여부</template>

      <div class="step5__grid">
        <InSelect
          v-model="menu.parentMenuId"
          :options="PARENT_MENU_HINTS"
          label="상위 메뉴 ID"
          layout="vertical"
          size="md"
          filterable
        />
        <InTextField
          v-model="menu.menuId"
          label="MENU_ID (자동)"
          layout="vertical"
          size="md"
          placeholder="예: SD_TST0001"
          show-required
        />
        <InTextField
          v-model="menu.menuNm"
          label="메뉴명"
          layout="vertical"
          size="md"
          placeholder="예: TST0001 화면"
          show-required
        />
        <InSelect
          v-model="menu.useYn"
          :options="USE_YN_OPTS"
          label="사용여부"
          layout="vertical"
          size="md"
        />
      </div>

      <div class="step5__warn-banner">
        <InIcon name="status-warning" :size="12" />
        <span>
          <strong>학습용 prefix 경고:</strong>
          <code>TEST_*</code> 패턴은 운영 데이터 충돌 위험 (99 §5-2.4).
          실제 학습 시에는 <code>__TEST_</code> 또는 <code>INSAIT_TEST_</code> 등 운영 미사용 prefix 권장.
        </span>
      </div>
    </InMetaStepSection>

    <!-- ─── [6] Auth binding ─── -->
    <InMetaStepSection step-no="6" title="권한 binding (AUT0040)">
      <template #hint>기존 권한 활용 (안전) / 신규 생성</template>

      <div class="step5__auth-radios">
        <label class="step5__radio-card" :class="{ 'step5__radio-card--selected': auth.mode === 'EXISTING' }">
          <input v-model="auth.mode" type="radio" value="EXISTING" />
          <strong>기존 권한 활용 (옵션 A, 권장)</strong>
          <span>기존 ACCESS_* 권한 그룹에 본 메뉴를 추가 binding. LNB 가시성 즉시 동작.</span>
        </label>
        <label class="step5__radio-card" :class="{ 'step5__radio-card--selected': auth.mode === 'NEW' }">
          <input v-model="auth.mode" type="radio" value="NEW" />
          <strong>신규 권한 생성 (옵션 B)</strong>
          <span>신규 auth_item 생성 + 메뉴 binding. LNB 노출에는 ACCESS_* 패턴 적용 필요 (99 §5-3.7-A).</span>
        </label>
      </div>

      <div v-if="auth.mode === 'EXISTING'" class="step5__grid">
        <InTextField
          v-model="auth.selectedExisting"
          label="기존 auth_item_id"
          layout="vertical"
          size="md"
          placeholder="예: ACCESS_ADMIN_GROUP"
        />
      </div>
      <div v-else class="step5__grid">
        <InTextField
          v-model="auth.authItemId"
          label="신규 AUTH_ITEM_ID"
          layout="vertical"
          size="md"
          show-required
        />
        <InTextField
          v-model="auth.authItemNm"
          label="권한명"
          layout="vertical"
          size="md"
          show-required
        />
      </div>
    </InMetaStepSection>

    <!-- ─── [7] 일괄 등록 ─── -->
    <InMetaStepSection step-no="7" title="일괄 등록 + E2E">
      <template #hint>Object → Service → Menu → Auth 순차 4 envelope 송신 후 자동 E2E 검증</template>

      <!-- 진행 phase 인디케이터 -->
      <ol class="step5__batch-phases">
        <li :class="batchPhaseClass('object')">
          <span class="step5__batch-phase-no">1</span>
          <span class="step5__batch-phase-label">Object</span>
        </li>
        <li :class="batchPhaseClass('service')">
          <span class="step5__batch-phase-no">2</span>
          <span class="step5__batch-phase-label">Service</span>
        </li>
        <li :class="batchPhaseClass('menu')">
          <span class="step5__batch-phase-no">3</span>
          <span class="step5__batch-phase-label">Menu</span>
        </li>
        <li :class="batchPhaseClass('auth')">
          <span class="step5__batch-phase-no">4</span>
          <span class="step5__batch-phase-label">Auth</span>
        </li>
      </ol>

      <InMetaStepActions
        submit-label="일괄 등록 (4단계 + E2E)"
        submitting-label="등록 진행 중…"
        :status="batchProgress.active ? 'in_progress' : (batchProgress.phase === 'done' ? 'completed' : 'pending')"
        :can-submit="canBatchSubmit"
        :can-skip="true"
        :success-label="batchProgress.message || '완료'"
        @submit="onBatchRegister"
        @skip="onSkipBatch"
      />

      <p v-if="batchProgress.active" class="step5__batch-progress">
        <InIcon name="arrow-right" :size="12" /> 현재: <strong>{{ batchProgress.message }}</strong>
      </p>

      <InMetaErrorCard
        v-if="errorGuide"
        :title="`[${errorGuide.phase}] ${errorGuide.title}`"
        :hint="errorGuide.hint"
        :category="errorGuide.category"
        :phase="errorGuide.phase"
        tone="error"
      />
    </InMetaStepSection>

    <!-- ─── [8] E2E 검증 결과 ─── -->
    <InMetaStepSection
      v-if="e2e.status !== 'pending' || batchProgress.phase === 'done'"
      step-no="8"
      :title="`E2E 검증 ${e2e.status === 'passed' ? '✓' : e2e.status === 'failed' ? '✗' : '…'}`"
      :tone="e2e.status === 'passed' ? 'muted' : 'default'"
    >
      <template #hint>등록 직후 LNB fetch + 자기참조 확인</template>
      <template #actions>
        <InButton
          variant="default"
          size="sm"
          :left-icon-show="false"
          :right-icon-show="false"
          :disabled="e2e.status === 'running'"
          @click="runE2E"
        >
          {{ e2e.status === 'running' ? '검증 중…' : '재실행' }}
        </InButton>
      </template>

      <ul v-if="e2e.checks.length" class="step5__pf-list">
        <li v-for="c in e2e.checks" :key="c.key" class="step5__pf-item" :class="checkClass(c.ok)">
          <InIcon :name="checkIcon(c.ok)" :size="16" />
          <div class="step5__pf-body">
            <strong>{{ c.label }}</strong>
            <span>{{ c.hint }}</span>
          </div>
        </li>
      </ul>
      <div v-else class="step5__pf-empty">검증 결과 없음</div>

      <p v-if="e2e.status === 'passed'" class="step5__e2e-success">
        🎉 E2E 통과 — 등록한 화면을 LNB 에서 클릭 → JSP forward → 자기참조 메타 조회까지 동작 확인.
        로그아웃 후 재로그인하여 LNB 캐시 invalidate 권장.
      </p>
    </InMetaStepSection>
  </div>
</template>

<style scoped>
.step5 { display: flex; flex-direction: column; gap: 18px; font-family: var(--in-font-family-body); }

/* === Preflight / E2E shared list === */
.step5__pf-empty {
  padding: 14px 16px;
  background: var(--in-surface-default, #fafafa);
  border: 1px dashed var(--in-border-default);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
}
.step5__pf-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step5__pf-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--in-radius-xs);
  border: 1px solid var(--in-border-default);
  background: var(--in-surface-overlay, #ffffff);
}
.step5__check-ok { border-color: var(--in-text-success); background: var(--in-surface-success, #e4faf0); }
.step5__check-fail { border-color: var(--in-text-error); background: var(--in-surface-error, #fef2f2); }
.step5__check-unknown { border-color: var(--in-text-warning); background: var(--in-surface-warning, #fffbeb); }
.step5__check-ok :deep(.in-icon) { color: var(--in-text-success); }
.step5__check-fail :deep(.in-icon) { color: var(--in-text-error); }
.step5__check-unknown :deep(.in-icon) { color: var(--in-text-warning); }
.step5__pf-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.step5__pf-body strong { font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-medium); color: var(--in-text-accent); }
.step5__pf-body span { font-size: var(--in-font-size-xs); color: var(--in-text-default); line-height: var(--in-line-height-xs); }

/* === Options dl === */
.step5__opt-dl { display: grid; grid-template-columns: 140px 1fr; gap: 6px 12px; margin: 0; }
.step5__opt-dl dt { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); font-weight: var(--in-font-weight-medium); }
.step5__opt-dl dd { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-default); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.step5__opt-dl code { font-family: 'Consolas', 'Menlo', monospace; color: var(--in-text-accent); }
.step5__opt-hint { color: var(--in-text-subtler); font-size: var(--in-font-size-xs); }

/* === Form grid === */
.step5__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.step5__grid-full { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 4px; }
.step5__field { display: flex; flex-direction: column; gap: 4px; }
.step5__field label, .step5__label {
  font-size: var(--in-font-size-sm);
  color: var(--in-text-default);
  font-weight: var(--in-font-weight-medium);
}
.step5__hint { font-size: var(--in-font-size-xs); color: var(--in-text-subtler); }
.step5__dual-input { display: flex; gap: 6px; }
.step5__mini-input,
.step5__textarea {
  padding: 6px 10px;
  border: 1px solid var(--in-border-input, var(--in-border-default));
  border-radius: var(--in-radius-xs);
  font-family: var(--in-font-family-body);
  font-size: var(--in-font-size-sm);
  background: var(--in-surface-overlay, #ffffff);
  color: var(--in-text-default);
  outline: none;
  width: 100%;
}
.step5__mini-input { width: 100px; }
.step5__textarea { font-family: 'Consolas', monospace; resize: vertical; }

/* === Warn banner === */
.step5__warn-banner {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  background: var(--in-surface-warning, #fffbeb);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-xs);
  color: var(--in-text-warning);
}
.step5__warn-banner span { color: var(--in-text-default); }
.step5__warn-banner strong { color: var(--in-text-warning); margin-right: 4px; font-weight: var(--in-font-weight-medium); }
.step5__warn-banner code { font-family: 'Consolas', monospace; color: var(--in-text-warning); }

/* === Auth radios === */
.step5__auth-radios { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 700px) { .step5__auth-radios { grid-template-columns: 1fr; } }
.step5__radio-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  cursor: pointer;
  position: relative;
}
.step5__radio-card--selected { border-color: var(--in-brand); background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc)); }
.step5__radio-card input { width: 14px; height: 14px; margin: 0; accent-color: var(--in-brand); align-self: flex-end; position: absolute; top: 12px; right: 12px; }
.step5__radio-card strong { font-size: var(--in-font-size-md); color: var(--in-text-accent); font-weight: var(--in-font-weight-medium); }
.step5__radio-card span { font-size: var(--in-font-size-xs); color: var(--in-text-subtle); line-height: var(--in-line-height-xs); }

/* === Batch phases === */
.step5__batch-phases {
  list-style: none;
  margin: 0;
  padding: 12px;
  background: var(--in-surface-default, #fafafa);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-xs);
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.step5__batch-phases li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--in-radius-full);
  background: var(--in-surface-overlay, #ffffff);
  border: 1px solid var(--in-border-default);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
}
.step5__batch-phase-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--in-radius-full);
  background: var(--in-border-default);
  color: var(--in-text-subtle);
  font-size: var(--in-font-size-xs);
  font-weight: var(--in-font-weight-medium);
}
.step5__batch-phase--active {
  border-color: var(--in-brand);
  color: var(--in-brand);
  background: var(--in-bg-accent-subtle, var(--in-brand-50, #e1f5fc));
}
.step5__batch-phase--active .step5__batch-phase-no { background: var(--in-brand); color: var(--in-text-white); }
.step5__batch-phase--done {
  border-color: var(--in-text-success);
  color: var(--in-text-success);
  background: var(--in-surface-success, #e4faf0);
}
.step5__batch-phase--done .step5__batch-phase-no { background: var(--in-text-success); color: var(--in-text-white); }

.step5__batch-progress {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--in-font-size-sm);
  color: var(--in-brand);
}

.step5__e2e-success {
  margin: 8px 0 0;
  padding: 10px 14px;
  background: var(--in-surface-success, #e4faf0);
  border: 1px solid var(--in-text-success);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  color: var(--in-text-success);
  line-height: var(--in-line-height-sm);
}
</style>
