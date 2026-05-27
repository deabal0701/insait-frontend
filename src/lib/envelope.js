// ★ (2026-05-27, dspark): envelope 표준 조립·해체. 가이드 03_axios-interceptor.md §4 정합.
//   HEADER 7 키 + BODY 메시지 슬롯 + ENC_KEYS 9개 평문 송신 정책.
//   JWT 평문 모드 (commit 9bf46242) 전제: HEADER.sessionId = "" marker.

import { useAuthStore } from '@/stores/auth';

// JWT 평문 모드에서 평문으로 송신되는 SEED 컬럼 키. envelope BODY row 안에 평문 그대로 둔다.
export const ENC_KEYS = Object.freeze([
  'emp_id',
  'mod_user_id',
  'make_emp_id',
  'appr_emp_id',
  'user_id',
  'session_emp_id',
  'session_user_id',
  'approver_emp_id',
  'draft_emp_id',
]);

const ACTION_BY_SUFFIX = { R: 'retrieve', S: 'save', P: 'callProc', E: 'elaService' };

/** serviceId 의 끝자리 R/S/P/E → actionType 추론. (예: PHM0001_00_R01 → retrieve) */
export function inferActionType(serviceId) {
  if (!serviceId) return 'retrieve';
  const match = String(serviceId).match(/_([RSPE])\d+$/);
  return match ? ACTION_BY_SUFFIX[match[1]] : 'retrieve';
}

/** serviceId prefix (밑줄 앞 6~7자) → objectId 추론. (예: PHM0001_00_R01 → PHM0001) */
export function inferObjectId(serviceId) {
  if (!serviceId) return '';
  const idx = String(serviceId).indexOf('_');
  return idx > 0 ? serviceId.slice(0, idx) : serviceId;
}

/** HEADER 7 키 표준 조립. auth store + i18n locale 자동 참조. JWT 모드 sessionId="". */
export function buildHeader(serviceId, options = {}) {
  const auth = useAuthStore();
  const localeCd = (options.localeCd || localStorage.getItem('insait.locale') || 'KO').toUpperCase();
  return {
    companyCd: options.companyCd || auth.companyCd || '01',
    serviceId,
    objectId: options.objectId || inferObjectId(serviceId),
    actionType: options.actionType || inferActionType(serviceId),
    localeCd,
    langCd: localeCd,
    sessionId: '', // ★ JWT 모드 marker — SeedCipher 빈 키 가드 + Controller hop
  };
}

/** 단일 메시지 슬롯 BODY 조립. rows 안의 row 는 _seq/sStatus/sDelete 기본값 보강. */
export function buildBody(slotName, rows = []) {
  return { [slotName]: rows.map((row, i) => normalizeRow(row, i)) };
}

/** 여러 슬롯을 받는 BODY 조립. slots = { ME_XYZ_01: [...], ME_XYZ_02: [...] }. */
export function buildBodyMulti(slots = {}) {
  const body = {};
  for (const [slot, rows] of Object.entries(slots)) {
    body[slot] = (rows || []).map((row, i) => normalizeRow(row, i));
  }
  return body;
}

function normalizeRow(row, index) {
  if (!row || typeof row !== 'object') return { _seq: index + 1, sStatus: 'R', sDelete: '' };
  return {
    _seq: row._seq ?? index + 1,
    sStatus: row.sStatus ?? 'R',
    sDelete: row.sDelete ?? '',
    ...row,
  };
}

/** 전체 envelope 조립. */
export function buildEnvelope(serviceId, body, options = {}) {
  return {
    HEADER: buildHeader(serviceId, options),
    BODY: body || {},
  };
}

/** 응답 envelope 의 슬롯 추출. (예: parseResponse(resp, 'ME_PHM0001_02')) */
export function parseResponse(response, slotName) {
  if (!response || !response.BODY) return [];
  if (!slotName) return response.BODY;
  return response.BODY[slotName] || [];
}

/** HEADER.resultType === 'SUCCESS' 검사. axios interceptor 가 사용. */
export function isSuccess(response) {
  return response && response.HEADER && response.HEADER.resultType === 'SUCCESS';
}

/** HEADER.resultMessage 추출. ERROR 일 때 사용. */
export function getResultMessage(response) {
  if (!response || !response.HEADER) return '';
  return response.HEADER.resultMessage || response.HEADER.resultCode || '';
}
