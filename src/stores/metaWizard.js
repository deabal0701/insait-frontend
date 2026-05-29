/**
 * 메타관리 마법사 store — 5 Step (ID 게이트 → SQL → Message → Entity → Service)
 *
 * 상태 모델:
 *   step1 (idGate)   — 화면 ID + Command 종류 + 자원 ID derived
 *   step2 (sql)      — SQL 본문 + 파라미터 + 결과컬럼 + 등록 OID
 *   step3 (message)  — REQ/RES 메시지 정의 + 컬럼 + 등록 OID
 *   step4 (entity)   — Entity 정의 + DB 컬럼 매핑 (Save 시나리오 한정)
 *   step5 (service)  — Service binding + 메뉴 + 권한
 *
 * 핵심 불변식:
 *  - step1 완료 후 screenId/cmdType lock (변경 시 처음부터 재시작)
 *  - step3 의 컬럼 = step2 의 SQL 컬럼/파라미터 1:1 매칭 (diff 표시)
 *  - step4 는 cmdType==='S' 일 때만 활성
 *  - step5 진입 전 step1~4 모두 status==='completed' 검증
 *
 * 매뉴얼 인용:
 *  - SUMMARY §1.2 — 7-char 컨벤션
 *  - 99 §5.8 — silent no-op (Save = Entity 강제)
 */

import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { deriveResourceIds, validateScreenId, getCmdTypeInfo, extractSqlBindParams, extractSqlSelectColumns, extractSqlTargetTable } from '@/utils/metaNaming';

export const WIZARD_STEPS = Object.freeze([
  { id: 'idGate',  no: 1, label: 'ID 게이트',  description: '화면 ID + Command 종류' },
  { id: 'sql',     no: 2, label: 'SQL',       description: '쿼리 본문 (컬럼 SSOT)' },
  { id: 'message', no: 3, label: '메시지',     description: 'REQ/RES (SQL 에서 가져오기)' },
  { id: 'entity',  no: 4, label: 'Entity',    description: 'DB 매핑 (Save 시나리오)' },
  { id: 'service', no: 5, label: '서비스',     description: 'Service + Menu + Auth' },
]);

function blankStep() {
  return {
    status: 'pending', // 'pending' | 'in_progress' | 'completed' | 'skipped' | 'error'
    insertedOid: null,
    lastEnvelope: null,
    lastResponse: null,
    error: null,
  };
}

export const useMetaWizardStore = defineStore('metaWizard', () => {
  // ─── Step 1: ID 게이트 ──────────────────────────────────────────
  const screenId = ref('');
  const cmdType = ref('R');
  const idGate = reactive(blankStep());
  /** ID 잠금 — step2 진입 후 변경 차단 (실수 시 reset 권유). */
  const screenIdLocked = ref(false);

  const screenIdValidation = computed(() => validateScreenId(screenId.value));
  const cmdInfo = computed(() => getCmdTypeInfo(cmdType.value));
  const derivedIds = computed(() => deriveResourceIds(screenId.value, cmdType.value));
  const requiresEntity = computed(() => !!cmdInfo.value?.requiresEntity);

  // ─── Step 2: SQL ────────────────────────────────────────────────
  const sql = reactive({
    body: '',
    bindType: 'NAME',           // 'NAME' | 'ADDR' — SUMMARY §5.2.1
    useYn: 'Y',
    comment: '',
    params: [],                 // [{ name, typeCd, inout }]
    outColumns: [],             // [{ name, typeCd, expr, hasAlias }]
    targetTable: '',            // FROM / INSERT INTO 추출
  });
  const sqlStep = reactive(blankStep());

  // ─── Step 3: Message ────────────────────────────────────────────
  const message = reactive({
    in: {
      msgDefId: '',
      msgDefNm: '',
      typeCd: 'DEFAULT',
      columns: [],              // [{ msgColDefId, msgColDefNm, typeCd, maxLength, mandYn, useEncYn, seqOrder }]
    },
    out: {
      msgDefId: '',
      msgDefNm: '',
      typeCd: 'DEFAULT',
      columns: [],
    },
    importedFromSqlAt: null,    // SQL 가져오기 실행 timestamp (diff hint 용)
  });
  const messageStep = reactive(blankStep());

  // ─── Step 4: Entity ─────────────────────────────────────────────
  const entity = reactive({
    entityName: '',
    entityNm: '',
    dbTable: '',
    columns: [],                // [{ name, dbColumn, typeCd, mandYn, useEncYn, autoInject, pk }]
  });
  const entityStep = reactive(blankStep());

  // ─── Step 5: Service + Object 메타 + Menu + Auth + E2E ──────────────────
  const service = reactive({
    serviceName: '',
    cmdClassNm: '',
    svMapTypeCd: '',
    funcNm: '',
    msgInBinding: '',
    msgOutBinding: '',
  });
  const serviceStep = reactive(blankStep());

  // Object 추가 메타 (Step1 의 게이트 외에 ⑤ 단계에서 보강) — AUT0030 saveObject 호출용.
  const object = reactive({
    objectDisplayNm: '',
    objectType: 'view',         // 'view' | 'elaform' | 'popup' | 'report'
    objectLink: '',
    objectHeight: '',           // dialog 호출 시만 사용 (SUMMARY §3.2.1)
    objectWidth: '',
    objectNote: '',
  });
  const objectStep = reactive(blankStep());

  const menu = reactive({
    menuId: '',
    parentMenuId: 'SYS_DEV',
    menuNm: '',
    iconKey: '',
    useYn: 'Y',
    closeYn: 'N',
    depth: 5,                   // 부모 + 1
  });
  const menuStep = reactive(blankStep());

  const auth = reactive({
    mode: 'EXISTING',           // 'EXISTING' | 'NEW'
    authItemId: '',
    authItemNm: '',
    selectedExisting: 'ACCESS_ADMIN_GROUP',  // 기존 권한 선택 (옵션 A)
  });
  const authStep = reactive(blankStep());

  // E2E 검증 (등록 후 LNB 메뉴 노출 + 자기참조 조회 확인)
  const e2e = reactive({
    status: 'pending',          // 'pending' | 'running' | 'passed' | 'failed'
    checks: [],                 // [{ key, label, ok, hint }]
    runAt: null,
  });

  // ─── 진행 상태 ──────────────────────────────────────────────────
  const currentStepId = ref('idGate');

  // 우측 InMetaVerifyPanel 의 검증 SQL — 각 step 이 자기 단계에서 채움.
  // [{ title, sql, expectation }] 형식. step 전환 시 초기화는 호출처 책임.
  const currentVerifyQueries = ref([]);

  /** Step 별 status 표 — 화면 stepper UI 용. */
  const stepStatuses = computed(() => ({
    idGate:  idGate.status,
    sql:     sqlStep.status,
    message: messageStep.status,
    entity:  requiresEntity.value ? entityStep.status : 'skipped',
    service: serviceStep.status,
  }));

  /** 다음 step 진입 가능 여부 — 이전 step completed 여부 검사. */
  function canEnter(stepId) {
    const order = WIZARD_STEPS.map((s) => s.id);
    const idx = order.indexOf(stepId);
    if (idx <= 0) return true;
    for (let i = 0; i < idx; i++) {
      const prevId = order[i];
      if (prevId === 'entity' && !requiresEntity.value) continue;
      if (stepStatuses.value[prevId] !== 'completed') return false;
    }
    return true;
  }

  // ─── Step 액션 ──────────────────────────────────────────────────

  function completeIdGate() {
    if (!screenIdValidation.value.valid) {
      idGate.status = 'error';
      idGate.error = screenIdValidation.value.reason;
      return false;
    }
    if (!cmdInfo.value) {
      idGate.status = 'error';
      idGate.error = 'Command 종류를 선택하세요.';
      return false;
    }
    idGate.status = 'completed';
    idGate.error = null;
    screenIdLocked.value = true;
    // 후속 step 초기값 채우기
    const ids = derivedIds.value;
    if (ids) {
      message.in.msgDefId = ids.msgIn;
      message.in.msgDefNm = `${screenId.value} 입력 메시지`;
      message.out.msgDefId = String(ids.msgOut).startsWith('MT_') ? ids.msgOut : `MT_${screenId.value}_02`;
      message.out.msgDefNm = `${screenId.value} 응답 메시지`;
      entity.entityName = ids.entityName || '';
      entity.entityNm = ids.entityName ? `${ids.entityName} 엔터티` : '';
      service.serviceName = ids.serviceName;
      service.cmdClassNm = ids.cmdCommand;
      service.svMapTypeCd = ids.svMapType;
      service.funcNm = ids.requiresEntity ? ids.entityName : ids.sqlName;
      service.msgInBinding = ids.msgInInstance;
      service.msgOutBinding = ids.msgOutInstance;
      // Object 메타 기본값
      object.objectDisplayNm = `[신규] ${screenId.value} 화면`;
      object.objectLink = ids.objectLink;
      // Menu 기본값
      menu.menuId = ids.suggestedMenuId;
      menu.menuNm = `${screenId.value} 화면`;
      // Auth 기본값
      auth.authItemId = ids.suggestedAuthItemId;
      auth.authItemNm = `${screenId.value} 접근권한`;
    }
    currentStepId.value = 'sql';
    return true;
  }

  /** SQL 본문 변경 시 호출 — 파라미터·결과컬럼·테이블 자동 재추출. */
  function syncSqlDerivations() {
    sql.params = extractSqlBindParams(sql.body).map((name, i) => {
      const prev = sql.params.find((p) => p.name === name);
      return {
        name,
        typeCd: prev?.typeCd || inferTypeFromColumn(name),
        inout: prev?.inout || 'IN',
      };
    });
    sql.outColumns = extractSqlSelectColumns(sql.body).map((col) => ({
      name: col.name,
      typeCd: inferTypeFromColumn(col.name),
      expr: col.expr,
      hasAlias: col.hasAlias,
    }));
    sql.targetTable = extractSqlTargetTable(sql.body);
  }

  /** Message step 진입 시 — SQL 결과를 자동 채움 ("가져오기" 액션). */
  function importMessagesFromSql() {
    const ts = new Date().toISOString();
    message.in.columns = sql.params.map((p, i) => ({
      msgColDefId: p.name,
      msgColDefNm: p.name,
      typeCd: p.typeCd || 'string',
      maxLength: defaultMaxLength(p.typeCd),
      mandYn: 'Y',
      useEncYn: 'N',
      seqOrder: i + 1,
    }));
    message.out.columns = sql.outColumns.filter((c) => c.name).map((c, i) => ({
      msgColDefId: c.name,
      msgColDefNm: c.name,
      typeCd: c.typeCd || 'string',
      maxLength: defaultMaxLength(c.typeCd),
      mandYn: 'N',
      useEncYn: 'N',
      seqOrder: i + 1,
    }));
    message.importedFromSqlAt = ts;
  }

  /** Entity step 진입 시 — SQL 테이블 + Message 컬럼 자동 채움. */
  function importEntityFromSqlAndMessage() {
    if (!requiresEntity.value) return;
    entity.dbTable = entity.dbTable || sql.targetTable;
    // 매핑은 IN/OUT 컬럼을 합집합 (이름 기준 unique)
    const all = [];
    const seen = new Set();
    for (const c of [...(message.out.columns || []), ...(message.in.columns || [])]) {
      if (seen.has(c.msgColDefId)) continue;
      seen.add(c.msgColDefId);
      all.push({
        name: c.msgColDefId,
        dbColumn: c.msgColDefId.toUpperCase(),
        typeCd: c.typeCd,
        mandYn: c.mandYn,
        useEncYn: c.useEncYn,
        autoInject: detectAutoInject(c.msgColDefId),
        pk: /\bid$/i.test(c.msgColDefId) || /_id$/i.test(c.msgColDefId),
      });
    }
    entity.columns = all;
  }

  function markStepCompleted(stepId, payload = {}) {
    const target = pickStep(stepId);
    if (!target) return;
    target.status = 'completed';
    target.insertedOid = payload.insertedOid ?? target.insertedOid;
    target.lastEnvelope = payload.envelope ?? target.lastEnvelope;
    target.lastResponse = payload.response ?? target.lastResponse;
    target.error = null;
  }

  function markStepError(stepId, error, payload = {}) {
    const target = pickStep(stepId);
    if (!target) return;
    target.status = 'error';
    target.error = typeof error === 'string' ? error : (error?.message || String(error));
    target.lastEnvelope = payload.envelope ?? target.lastEnvelope;
    target.lastResponse = payload.response ?? target.lastResponse;
  }

  function pickStep(stepId) {
    switch (stepId) {
      case 'idGate':  return idGate;
      case 'sql':     return sqlStep;
      case 'message': return messageStep;
      case 'entity':  return entityStep;
      case 'service': return serviceStep;
      case 'object':  return objectStep;
      case 'menu':    return menuStep;
      case 'auth':    return authStep;
      default: return null;
    }
  }

  function goTo(stepId) {
    if (!canEnter(stepId)) return false;
    currentStepId.value = stepId;
    return true;
  }

  function reset() {
    screenId.value = '';
    cmdType.value = 'R';
    screenIdLocked.value = false;
    Object.assign(idGate, blankStep());
    Object.assign(sqlStep, blankStep());
    Object.assign(messageStep, blankStep());
    Object.assign(entityStep, blankStep());
    Object.assign(serviceStep, blankStep());
    sql.body = '';
    sql.bindType = 'NAME';
    sql.useYn = 'Y';
    sql.comment = '';
    sql.params = [];
    sql.outColumns = [];
    sql.targetTable = '';
    message.in.msgDefId = '';
    message.in.msgDefNm = '';
    message.in.columns = [];
    message.out.msgDefId = '';
    message.out.msgDefNm = '';
    message.out.columns = [];
    message.importedFromSqlAt = null;
    entity.entityName = '';
    entity.entityNm = '';
    entity.dbTable = '';
    entity.columns = [];
    service.serviceName = '';
    service.cmdClassNm = '';
    service.svMapTypeCd = '';
    service.funcNm = '';
    service.msgInBinding = '';
    service.msgOutBinding = '';
    object.objectDisplayNm = '';
    object.objectType = 'view';
    object.objectLink = '';
    object.objectHeight = '';
    object.objectWidth = '';
    object.objectNote = '';
    Object.assign(objectStep, blankStep());
    menu.menuId = '';
    menu.parentMenuId = 'SYS_DEV';
    menu.menuNm = '';
    menu.iconKey = '';
    menu.useYn = 'Y';
    menu.closeYn = 'N';
    menu.depth = 5;
    Object.assign(menuStep, blankStep());
    auth.mode = 'EXISTING';
    auth.authItemId = '';
    auth.authItemNm = '';
    auth.selectedExisting = 'ACCESS_ADMIN_GROUP';
    Object.assign(authStep, blankStep());
    e2e.status = 'pending';
    e2e.checks = [];
    e2e.runAt = null;
    currentStepId.value = 'idGate';
  }

  return {
    // 상수
    WIZARD_STEPS,
    // step1
    screenId, cmdType, idGate, screenIdLocked,
    screenIdValidation, cmdInfo, derivedIds, requiresEntity,
    completeIdGate,
    // step2
    sql, sqlStep, syncSqlDerivations,
    // step3
    message, messageStep, importMessagesFromSql,
    // step4
    entity, entityStep, importEntityFromSqlAndMessage,
    // step5 — Service + Object 메타 + Menu + Auth + E2E (P6)
    service, serviceStep,
    object, objectStep,
    menu, menuStep,
    auth, authStep,
    e2e,
    // 공통
    currentStepId, currentVerifyQueries, stepStatuses, canEnter, goTo,
    markStepCompleted, markStepError, reset,
  };
});

// ─── 내부 helper (utils 로 옮기지 않은 store-only) ───────────────────
import { inferTypeCdFromName, defaultMaxLengthByTypeCd } from '@/utils/metaNaming';

function inferTypeFromColumn(name) { return inferTypeCdFromName(name); }
function defaultMaxLength(typeCd) { return defaultMaxLengthByTypeCd(typeCd); }

const AUTO_INJECT_PATTERNS = [
  { match: /(_oid|^object_id$)/i, kind: 'SEQ', label: '시퀀스' },
  { match: /(mod_user_id|reg_user_id|make_emp_id)/i, kind: 'SESSION_USER', label: '세션사용자' },
  { match: /(mod_date|reg_date)/i, kind: 'SYSDATE', label: '시각' },
  { match: /(company_cd)/i, kind: 'SESSION_COMPANY', label: '세션회사' },
];

function detectAutoInject(name) {
  for (const p of AUTO_INJECT_PATTERNS) if (p.match.test(name)) return p.kind;
  return null;
}
