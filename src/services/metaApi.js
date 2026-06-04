/**
 * 메타관리 envelope API wrapper.
 *
 * AS-IS `/serviceBroker.h5` 단일 엔드포인트 + 운영 메타 서비스 ID 를 호출.
 * Phase 1A 평문 envelope 모드 (CLAUDE.md §단계별 목표 1 ③) 전제.
 *
 * 본 wrapper 의 역할:
 *  - 운영 메타 서비스 ID (`AUT0030_00_S03`, `IST0010_00_S04` 등) 호출 캡슐화
 *  - envelope BODY 구조 (AS-IS fetch 캡처 기반) 보존
 *  - silent no-op / race / 충돌검사 등 매뉴얼 99 의 함정 사전 차단
 *  - 호출처 (composables, store) 는 본 모듈만 import — envelope 직접 조립 금지
 *
 * 매뉴얼 인용:
 *  - SUMMARY §3.3 — AUT0030 저장 envelope
 *  - SUMMARY §4.5 — IST0030 메시지 저장 envelope
 *  - SUMMARY §5.5 — IST0010 SQL 저장 envelope
 *  - 99 §2.1 — ServiceDefItem race (디바운스·idempotency)
 *  - 99 §2.2 — envelope BODY 순서 (부모→자식 자동분할)
 */

import http from '@/services/http';
import { buildEnvelope } from '@/services/envelope';

/** 운영 메타 등록 서비스 ID 카탈로그. AS-IS 실측 + SUMMARY 참조. */
export const META_SERVICES = Object.freeze({
  // 오브젝트 (AUT0030)
  OBJECT_LIST:        'AUT0030_00_R01',
  OBJECT_SAVE:        'AUT0030_00_S03',

  // 메시지 (IST0030)
  MESSAGE_LIST:       'IST0030_00_R01',
  MESSAGE_DEF_SAVE:   'IST0030_00_S03',
  MESSAGE_COL_SAVE:   'IST0030_00_S04',

  // SQL (IST0010)
  QUERY_LIST:         'IST0010_00_R01',
  QUERY_SAVE:         'IST0010_00_S04',

  // 엔터티 (IST0020) — TBD: 실측 ID 필요. 임시 패턴.
  ENTITY_LIST:        'IST0020_00_R01',
  ENTITY_SAVE:        'IST0020_00_S01',

  // 서비스 (IST0050) — 간편입력 wizard
  SERVICE_LIST:       'IST0050_00_R01',
  SERVICE_DETAIL:     'IST0050_00_R02',
  SERVICE_EASY_SAVE:  'IST0050_03_B01',  // PROCEDURE P_FRM_SERVICE_EASY_INPUT 호출
  SERVICE_SAVE:       'IST0050_00_S03',

  // 메뉴 (AUT0050)
  MENU_LIST:          'AUT0050_00_R01',
  MENU_LNB:           'AUT0050_00_R06',
  MENU_SAVE:          'AUT0050_00_S02',

  // 권한 (AUT0040)
  AUTH_ITEM_LIST:     'AUT0040_00_R01',
  AUTH_MENU_BIND:     'AUT0040_03_00_S01',
});

/** idempotency key 생성기 — 99 §2.1 race condition 차단. */
let idempotencyCounter = 0;
function nextIdempotencyKey() {
  idempotencyCounter += 1;
  return `meta-${performance.now().toString(36)}-${idempotencyCounter}`;
}

/**
 * envelope 호출 표준 wrapper. 매뉴얼 99 §2.1 디바운스 + idempotency 자동.
 *
 * @param {string} serviceId
 * @param {object} body         envelope BODY (메시지 슬롯 객체)
 * @param {object} [options]    { actionType, objectId, suppressError }
 * @returns {Promise<{ ok: boolean, response: object, idempotencyKey: string, error?: Error }>}
 */
export async function callMetaService(serviceId, body = {}, options = {}) {
  const idempotencyKey = nextIdempotencyKey();
  try {
    const envelope = buildEnvelope(serviceId, body, options);
    const response = await http.post('/serviceBroker.h5', envelope, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    });
    const ok = response?.HEADER?.resultType === 'SUCCESS';
    return { ok, response, idempotencyKey };
  } catch (error) {
    if (!options.suppressError) throw error;
    return { ok: false, response: null, idempotencyKey, error };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 충돌 검사 (P1 ID 게이트)
// ─────────────────────────────────────────────────────────────────────────

/**
 * 화면 ID 7자 prefix 의 기존 오브젝트 존재 여부 검사.
 * AUT0030_00_R01 의 검색 조건 (object_nm LIKE 'TST0001%') 활용.
 *
 * @returns {Promise<{ ok: boolean, available: boolean, count: number, rows: object[] }>}
 *   - ok=false → 서버 응답 실패 (state='unreachable' 처리 권장)
 *   - ok=true && count===0 → 사용 가능 (available)
 *   - ok=true && count>0 → 이미 등록 (taken)
 */
export async function checkScreenIdAvailability(screenId) {
  const { ok, response } = await callMetaService(META_SERVICES.OBJECT_LIST, {
    ME_AUT0030_01: [{
      _seq: 1,
      sStatus: 'R',
      sDelete: '',
      object_nm: screenId,        // 정확매칭 또는 prefix LIKE — AS-IS 화면이 LIKE 자동 적용
      company_cd: '01',
    }],
  }, { actionType: 'retrieve', suppressError: true });

  const rows = response?.BODY?.ME_AUT0030_02 || response?.BODY?.ME_AUT0030_02_LIST || [];
  return {
    ok,
    available: ok && rows.length === 0,
    count: rows.length,
    rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 자원 등록 (P2~P6 의 각 step 에서 호출)
// ─────────────────────────────────────────────────────────────────────────

/** AUT0030 오브젝트 등록 — SUMMARY §3.3. */
export function saveObject(objectRow) {
  return callMetaService(META_SERVICES.OBJECT_SAVE, {
    ME_AUT0030_02: [{
      sStatus: 'I',
      sDelete: '',
      _seq: 1,
      ...objectRow,
    }],
  });
}

/** AUT0050 메뉴 등록 — 99 §5-2.9 MultiSaveCommand. */
export function saveMenu(menuRow) {
  return callMetaService(META_SERVICES.MENU_SAVE, {
    ME_AUT0050_02: [{
      sStatus: 'I',
      sDelete: '',
      _seq: 1,
      ...menuRow,
    }],
  });
}

/**
 * AUT0040 권한 binding — 메뉴 ↔ 권한항목 매핑 (FRM_AUTH_MENU_BINDING_W).
 * 99 §5-3.1 — _w 버전이 운영 사용. param.menu_id + auth_item_id.
 */
export function bindAuthMenu(bindingRow) {
  return callMetaService(META_SERVICES.AUTH_MENU_BIND, {
    ME_AUT0040_03_W_01: [{
      sStatus: 'I',
      sDelete: '',
      _seq: 1,
      ...bindingRow,
    }],
  });
}

/**
 * AUT0050_00_R06 — LNB 메뉴 fetch. 등록 후 E2E 검증용.
 *
 * @param {{ authItemId?, empId? }} params
 * @returns {Promise<{ ok, menus: Array, response }>}
 */
export async function fetchLnbMenus(params = {}) {
  const body = {
    ME_AUT0050_R06_01: [{
      _seq: 1, sStatus: 'R', sDelete: '',
      auth_item_id: params.authItemId || '',
      emp_id: params.empId || '',
      company_cd: '01',
    }],
  };
  const { ok, response } = await callMetaService(
    META_SERVICES.MENU_LNB,
    body,
    { actionType: 'retrieve', suppressError: true },
  );
  const menus = response?.BODY?.ME_AUT0050_R06_02
    || response?.BODY?.ME_AUT0050_R06_02_LIST
    || response?.BODY?._treeData
    || [];
  return { ok, menus, response };
}

/**
 * IST0030 메시지 정의 등록 (부모만).
 * 매뉴얼 99 §2.2 — 부모-자식 동시 저장 시 NumberFormatException → 단계 분할 강제.
 */
export function saveMessageDef(msgDefRow) {
  return callMetaService(META_SERVICES.MESSAGE_DEF_SAVE, {
    ME_IST0030_05: [],
    ME_IST0030_09: [{
      sStatus: 'I',
      sDelete: '',
      _seq: 1,
      ...msgDefRow,
    }],
  });
}

/** IST0030 메시지 컬럼 등록 (자식). 부모 등록 후 별도 호출. */
export function saveMessageColumns(msgDefOid, columnRows) {
  return callMetaService(META_SERVICES.MESSAGE_COL_SAVE, {
    ME_IST0030_05: columnRows.map((row, i) => ({
      sStatus: 'I',
      sDelete: '',
      _seq: i + 1,
      msg_def_oid: msgDefOid,
      ...row,
    })),
  });
}

/**
 * 메시지 1쌍 (REQ + RES) 안전 등록 — 부모/자식 자동분할.
 * @param {{ msgInDef, msgInColumns, msgOutDef, msgOutColumns }} payload
 * @returns {Promise<{ ok, inDefOid, outDefOid, errors }>}
 */
export async function saveMessagePair(payload) {
  const errors = [];

  const inDef = await saveMessageDef(payload.msgInDef);
  if (!inDef.ok) errors.push({ phase: 'in.def', response: inDef.response });
  const inDefOid = extractInsertedOid(inDef.response, 'ME_SAVE_RESULT', 'msg_def_oid');

  if (inDefOid && payload.msgInColumns?.length) {
    const inCols = await saveMessageColumns(inDefOid, payload.msgInColumns);
    if (!inCols.ok) errors.push({ phase: 'in.columns', response: inCols.response });
  }

  const outDef = await saveMessageDef(payload.msgOutDef);
  if (!outDef.ok) errors.push({ phase: 'out.def', response: outDef.response });
  const outDefOid = extractInsertedOid(outDef.response, 'ME_SAVE_RESULT', 'msg_def_oid');

  if (outDefOid && payload.msgOutColumns?.length) {
    const outCols = await saveMessageColumns(outDefOid, payload.msgOutColumns);
    if (!outCols.ok) errors.push({ phase: 'out.columns', response: outCols.response });
  }

  return { ok: errors.length === 0, inDefOid, outDefOid, errors };
}

/** IST0010 SQL 등록 — SUMMARY §5.5. */
export function saveQuery(queryPayload) {
  return callMetaService(META_SERVICES.QUERY_SAVE, queryPayload);
}

/** IST0020 엔터티 등록. */
export function saveEntity(entityPayload) {
  return callMetaService(META_SERVICES.ENTITY_SAVE, entityPayload);
}

/** IST0050 서비스 간편입력 — PROCEDURE P_FRM_SERVICE_EASY_INPUT 호출. */
export function saveServiceEasy(servicePayload) {
  return callMetaService(META_SERVICES.SERVICE_EASY_SAVE, servicePayload);
}

/**
 * IST0050 서비스 카탈로그 조회 — FRM_SERVICE_DEF 페이징.
 *
 * @param {{ keyword?, domain?, cmdType?, mapType?, useYn?, pageNo?, pageSize? }} filter
 * @returns {Promise<{ ok, rows: Array<object>, totalCount: number, response }>}
 */
export async function listServices(filter = {}) {
  const body = {
    ME_IST0050_01: [{
      _seq: 1, sStatus: 'R', sDelete: '',
      sv_def_nm: filter.keyword || '',
      cmd_class_nm: filter.cmdClass || '',
      use_yn: filter.useYn || '',
      company_cd: '01',
      page_no: filter.pageNo ?? 1,
      page_size: filter.pageSize ?? 100,
    }],
  };
  const { ok, response } = await callMetaService(
    META_SERVICES.SERVICE_LIST,
    body,
    { actionType: 'retrieve', suppressError: true },
  );
  const rows = response?.BODY?.ME_IST0050_02 || response?.BODY?.ME_IST0050_02_LIST || [];
  const totalCount = response?.BODY?.ME_IST0050_03?.[0]?.total_count
    ?? response?.HEADER?.totalCount
    ?? rows.length;
  return { ok, rows, totalCount, response };
}

/**
 * IST0030 메시지 정의 + 컬럼 상세 — Service Tester REQ 폼 자동생성용.
 *
 * @param {string} msgDefId  FRM_MSG_DEF.msg_def_id (예: 'MT_AUT0030_01')
 * @returns {Promise<{ ok, def, columns, response }>}
 */
export async function getMessageColumns(msgDefId) {
  const body = {
    ME_IST0030_01: [{
      _seq: 1, sStatus: 'R', sDelete: '',
      msg_def_id: msgDefId,
      company_cd: '01',
    }],
  };
  const { ok, response } = await callMetaService(
    META_SERVICES.MESSAGE_LIST,
    body,
    { actionType: 'retrieve', suppressError: true },
  );
  const defs = response?.BODY?.ME_IST0030_02 || [];
  const def = defs[0] || null;
  const columns = response?.BODY?.ME_IST0030_05 || response?.BODY?.ME_IST0030_06 || [];
  return { ok, def, columns, response };
}

/**
 * IST0050 서비스 상세 — 메시지 binding + 함수 매핑 포함.
 *
 * ★ (2026-06-04, dspark): envelope `IST0050_00_R02` 호출 → admin direct REST 로 교체.
 *   - 정책: 메타 조회는 admin REST OK / 비즈니스 테스트 호출만 envelope.
 *   - 이전 envelope 패턴은 alpha 환경에서 메시지 슬롯 매핑이 NPE 유발.
 *   - admin REST 한 번 호출로 def + attrs(IN_MSG/OUT_MSG + msgRef.columns) + funcMaps
 *     모두 받아옴 → getMessageColumns 별도 호출 불필요.
 *   - 반환 shape 은 기존 호출자(ServiceTester) 호환을 위해 msgBindings 유지하되
 *     attrs 를 그대로 노출. ServiceTester 의 fetchMeta() 가 attrs 기반으로 정리됨.
 *
 * @param {string} serviceName  FRM_SERVICE_DEF.sv_def_nm
 * @returns {Promise<{ ok, def, attrs, funcMaps, msgBindings, funcMap, response }>}
 */
export async function getServiceDetail(serviceName) {
  try {
    const response = await http.get(
      `/api/admin/meta/services/${encodeURIComponent(serviceName)}`,
      { params: { expand: 'msg,query,object,msgColumns' } },
    );
    const data = response?.data ?? response;
    const def = data?.def || null;
    const attrs = Array.isArray(data?.attrs) ? data.attrs : [];
    const funcMaps = Array.isArray(data?.funcMaps) ? data.funcMaps : [];
    // 레거시 호환 shape: msgBindings(sv_attr_nm/value_type) + funcMap(첫 행)
    const msgBindings = attrs.map((a) => ({
      sv_attr_nm: a.svAttrNm,
      sv_attr_type: a.svAttrType,
      value_type: a.valueType,
    }));
    const funcMap = funcMaps[0] || null;
    return { ok: !!def, def, attrs, funcMaps, msgBindings, funcMap, response: data };
  } catch (e) {
    return { ok: false, def: null, attrs: [], funcMaps: [], msgBindings: [], funcMap: null, response: null, error: e };
  }
}

/**
 * IST0050 자동 바인딩 preflight 검증 — 매뉴얼 99 §4-2.1 의 함정 차단.
 *
 * PROCEDURE EHR.P_FRM_SERVICE_EASY_INPUT 는 SUBSTR(sv_def_nm, 0, 7) prefix 로
 * 메시지 ID (ME_<7>_01 / MT_<7>_01) 를 자동 생성. 이 ID 가 실존 메시지를 가리키지
 * 못하면 운영 시점에 "Message not found" 발생.
 *
 * 본 함수는 등록 직전 다음을 검증:
 *  - 서비스 ID 의 SUBSTR(0,7) = 화면 ID prefix 일치 (로컬 검사)
 *  - 자동 생성될 MT_<7>_01 / MT_<7>_02 가 FRM_MSG_DEF 에 실존 (서버 조회)
 *  - 서비스 ID 의 SQL 쿼리명이 FRM_QUERY_DEF 에 실존 (서버 조회)
 *
 * @param {{ screenId, serviceId, sqlName, msgInId, msgOutId, requiresEntity, entityName }} params
 * @returns {Promise<{ ok: boolean, checks: Array<{key, ok, hint}> }>}
 */
export async function preflightServiceBinding(params) {
  const checks = [];

  // ─ 로컬: 7-char prefix 일치 ─────────────────────────────────────
  const idPrefix = String(params.screenId || '').slice(0, 7);
  const svPrefix = String(params.serviceId || '').slice(0, 7);
  checks.push({
    key: 'prefix-match',
    label: '7-char prefix 일치',
    ok: idPrefix.length === 7 && idPrefix === svPrefix,
    hint: idPrefix === svPrefix
      ? `OK — '${idPrefix}' = SUBSTR(service_id, 0, 7)`
      : `위반 — 화면ID '${idPrefix}' ≠ 서비스ID prefix '${svPrefix}'. PROCEDURE 자동 바인딩이 가짜 메시지를 가리킬 위험.`,
  });

  // ─ 메시지 ID 표준 명명 확인 ────────────────────────────────────
  const expectedMsgIn = `MT_${idPrefix}_01`;
  const expectedMsgOut = `MT_${idPrefix}_02`;
  checks.push({
    key: 'msg-naming',
    label: '메시지 ID 컨벤션 일치',
    ok: params.msgInId === expectedMsgIn,
    hint: params.msgInId === expectedMsgIn
      ? `OK — IN = ${expectedMsgIn}`
      : `위반 — IN '${params.msgInId}' ≠ 기대값 '${expectedMsgIn}'. 자동 바인딩 부정합.`,
  });

  // ─ 서버: 메시지 실존 확인 ─────────────────────────────────────
  try {
    const { ok, response } = await callMetaService(
      META_SERVICES.MESSAGE_LIST,
      {
        ME_IST0030_01: [{
          _seq: 1, sStatus: 'R', sDelete: '',
          msg_def_id: params.msgInId,
          company_cd: '01',
        }],
      },
      { actionType: 'retrieve', suppressError: true },
    );
    const rows = response?.BODY?.ME_IST0030_02 || response?.BODY?.ME_IST0030_02_LIST || [];
    const found = rows.some((r) => (r.msg_def_id || r.MSG_DEF_ID) === params.msgInId);
    checks.push({
      key: 'msg-in-exists',
      label: 'IN 메시지 실존',
      ok: ok && found,
      hint: found ? `OK — ${params.msgInId} 등록됨` :
            ok ? `미발견 — '${params.msgInId}' 가 FRM_MSG_DEF 에 없음. Step3 등록 누락 또는 prefix 불일치.` :
                 `서버 미연결 — 검증 불가 (운영 시 발견될 함정 가능성).`,
    });
  } catch {
    checks.push({
      key: 'msg-in-exists',
      label: 'IN 메시지 실존',
      ok: null,
      hint: '서버 미연결 — 검증 불가',
    });
  }

  // ─ 서버: SQL 실존 확인 ────────────────────────────────────────
  try {
    const { ok, response } = await callMetaService(
      META_SERVICES.QUERY_LIST,
      {
        ME_IST0010_01: [{
          _seq: 1, sStatus: 'R', sDelete: '',
          query_name: params.sqlName,
          company_cd: '01',
        }],
      },
      { actionType: 'retrieve', suppressError: true },
    );
    const rows = response?.BODY?.ME_IST0010_02 || response?.BODY?.ME_IST0010_02_LIST || [];
    const found = rows.some((r) => (r.query_name || r.QUERY_NAME) === params.sqlName);
    checks.push({
      key: 'sql-exists',
      label: 'SQL 실존',
      ok: ok && found,
      hint: found ? `OK — ${params.sqlName} 등록됨` :
            ok ? `미발견 — '${params.sqlName}' 가 FRM_QUERY_DEF 에 없음. Step2 등록 누락.` :
                 `서버 미연결 — 검증 불가`,
    });
  } catch {
    checks.push({
      key: 'sql-exists',
      label: 'SQL 실존',
      ok: null,
      hint: '서버 미연결 — 검증 불가',
    });
  }

  // ─ Save 시나리오: Entity 실존 확인 ──────────────────────────
  if (params.requiresEntity && params.entityName) {
    try {
      const { ok, response } = await callMetaService(
        META_SERVICES.ENTITY_LIST,
        {
          ME_IST0020_01: [{
            _seq: 1, sStatus: 'R', sDelete: '',
            entity_nm: params.entityName,
            company_cd: '01',
          }],
        },
        { actionType: 'retrieve', suppressError: true },
      );
      const rows = response?.BODY?.ME_IST0020_02 || response?.BODY?.ME_IST0020_02_LIST || [];
      const found = rows.some((r) => (r.entity_nm || r.ENTITY_NM) === params.entityName);
      checks.push({
        key: 'entity-exists',
        label: 'Entity 실존 (Save 시나리오)',
        ok: ok && found,
        hint: found ? `OK — ${params.entityName} 등록됨` :
              ok ? `미발견 — '${params.entityName}' 가 FRM_ENTITY 에 없음. Step4 등록 누락 → MultiSave silent no-op 위험 (99 §5.8).` :
                   `서버 미연결 — 검증 불가`,
      });
    } catch {
      checks.push({
        key: 'entity-exists',
        label: 'Entity 실존',
        ok: null,
        hint: '서버 미연결 — 검증 불가',
      });
    }
  }

  // 전체 OK 판정: false 가 하나도 없으면 OK (null/true 만 있으면 OK 로 간주)
  const hasFail = checks.some((c) => c.ok === false);
  return { ok: !hasFail, checks };
}

// ─────────────────────────────────────────────────────────────────────────
// 응답 파싱 helper
// ─────────────────────────────────────────────────────────────────────────

/** 응답 BODY 의 ME_SAVE_RESULT (또는 지정 슬롯) 첫 행의 OID 컬럼 추출. */
export function extractInsertedOid(response, slot = 'ME_SAVE_RESULT', oidKey = 'object_id') {
  const rows = response?.BODY?.[slot];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0][oidKey] ?? rows[0].OID ?? rows[0].oid ?? null;
}

/** 응답 HEADER 의 에러 분류 (매뉴얼 99 §2.3 — UNIQUE_VIOLATION / FK / TYPE / TIMEOUT). */
export function classifyMetaError(response) {
  const msg = response?.HEADER?.resultMessage || '';
  const code = response?.HEADER?.resultCode || '';
  const haystack = `${code} ${msg}`;
  if (/ORA-00001|unique|UK_/i.test(haystack)) return 'UNIQUE_VIOLATION';
  if (/ORA-02291|foreign key|FK_/i.test(haystack)) return 'FK_VIOLATION';
  if (/ORA-01400|cannot be null|NOT NULL/i.test(haystack)) return 'NOT_NULL';
  if (/ORA-01722|invalid number|NumberFormat/i.test(haystack)) return 'TYPE_MISMATCH';
  if (/ORA-01017|invalid username/i.test(haystack)) return 'AUTH';
  if (/ORA-17008|race|connection/i.test(haystack)) return 'RACE_RETRY';
  if (/timeout/i.test(haystack)) return 'TIMEOUT';
  if (/ERRORMSG_0002/.test(haystack)) return 'GENERIC_SAVE_ERROR';
  if (/ERRORMSG_0000/.test(haystack)) return 'GENERIC_SYSTEM_ERROR';
  return 'UNKNOWN';
}

const META_ERROR_GUIDE = Object.freeze({
  UNIQUE_VIOLATION: { title: '중복 키 충돌', hint: '같은 ID 가 이미 등록되어 있습니다. 화면 ID 또는 메시지 ID 를 다른 값으로 변경하세요.' },
  FK_VIOLATION:     { title: '참조 무결성 오류', hint: '의존하는 자원 (Object/Message/SQL) 이 누락되었습니다. 이전 단계의 등록 여부를 확인하세요.' },
  NOT_NULL:         { title: '필수 컬럼 누락', hint: 'NOT NULL 컬럼에 값이 들어가지 않았습니다. 자동주입 값 (시퀀스/세션사용자) 또는 입력값 확인.' },
  TYPE_MISMATCH:    { title: '타입 불일치', hint: '메시지 컬럼 TYPE_CD (string/numeric/date/clob) 가 실제 값과 다릅니다.' },
  RACE_RETRY:       { title: 'ServiceDefItem race', hint: '캐시 초기화 race — 1초 대기 후 재시도하면 정상 동작합니다 (운영 13년 누적 결함).' },
  TIMEOUT:          { title: '응답 지연', hint: '처리 시간 초과. SQL 의 F_FRM_CODE_NM N+1 패턴 확인 (99 §3.5).' },
  GENERIC_SAVE_ERROR:   { title: '저장 오류', hint: 'AS-IS 표준 메시지 — 원인 식별 불가. 개발 모드 envelope debug 확인.' },
  GENERIC_SYSTEM_ERROR: { title: '시스템 오류', hint: 'AS-IS 표준 메시지 — 원인 식별 불가. 개발 모드 envelope debug 확인.' },
  UNKNOWN:          { title: '알 수 없는 오류', hint: 'envelope 응답 raw JSON 을 확인하세요.' },
});

export function getMetaErrorGuide(category) {
  return META_ERROR_GUIDE[category] || META_ERROR_GUIDE.UNKNOWN;
}
