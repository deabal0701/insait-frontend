/**
 * 메타관리 envelope/admin-REST wrapper.
 *
 * ★ (2026-06-04, dspark): 마법사 (NewScreenWizard + Step1~5) 폐기에 따라 dead exports 제거.
 *   현재 보존 함수 = ServiceTester 1 페이지가 사용하는 최소 셋만:
 *     - callMetaService  : envelope 직접 송신 (▶ 호출)
 *     - getServiceDetail : admin REST /api/admin/meta/services/{name} (메타 조회)
 *     - classifyMetaError: 에러 분류 (UNIQUE / FK / TYPE / TIMEOUT 등)
 *     - getMetaErrorGuide: 에러 분류별 안내 메시지
 *
 *   추후 마법사 재구축 시점에 admin REST POST/PUT 으로 마이그레이션 + 신규 API 추가.
 *   AS-IS 운영 메타 envelope 호출 패턴 (IST0050_03_B01 등) 은 의도적으로 제거.
 *
 * 정책 정합:
 *   - 메타 조회 = admin direct REST  (Phase 0 — /api/admin/meta/{...})
 *   - ▶ 호출 (비즈니스 실행) = envelope /serviceBroker.h5
 */

import http from '@/services/http';
import { buildEnvelope } from '@/services/envelope';

/** idempotency key 생성기 — 99 §2.1 race condition 차단. */
let idempotencyCounter = 0;
function nextIdempotencyKey() {
  idempotencyCounter += 1;
  return `meta-${performance.now().toString(36)}-${idempotencyCounter}`;
}

/**
 * envelope 호출 표준 wrapper. ServiceTester ▶ 호출이 사용.
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
    const data = response?.data ?? response;
    const ok = data?.HEADER?.resultType === 'SUCCESS';
    return { ok, response: data, idempotencyKey };
  } catch (e) {
    if (!options.suppressError) throw e;
    return { ok: false, response: null, idempotencyKey, error: e };
  }
}

/**
 * IST0050 서비스 상세 — 메시지 binding + 함수 매핑 포함. admin direct REST 기반.
 *
 * ★ (2026-06-04, dspark): envelope IST0050_00_R02 호출 → admin REST 로 교체 (memo).
 *   응답 shape 호환: def + attrs(IN_MSG/OUT_MSG + msgRef.columns) + funcMaps + msgBindings(legacy).
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
  if (!msg && !code) return 'EMPTY';
  return 'UNKNOWN';
}

/** 에러 분류별 사용자 안내 메시지. */
export function getMetaErrorGuide(category) {
  switch (category) {
    case 'UNIQUE_VIOLATION': return { title: '중복 등록', hint: '동일한 ID 또는 키가 이미 존재합니다. 충돌 검사 후 재시도.' };
    case 'FK_VIOLATION':     return { title: '참조 무결성', hint: '참조 대상이 존재하지 않거나 미등록. 부모 자원부터 등록.' };
    case 'NOT_NULL':         return { title: '필수값 누락', hint: '필수 컬럼이 비어있습니다. 입력값 확인.' };
    case 'TYPE_MISMATCH':    return { title: '타입 불일치', hint: '컬럼 타입과 입력값이 맞지 않습니다 (예: 숫자 컬럼에 문자).' };
    case 'AUTH':             return { title: '인증 오류',   hint: 'DB 인증 실패 또는 권한 부족.' };
    case 'RACE_RETRY':       return { title: '경합/연결',   hint: '잠시 후 재시도 (커넥션 회복 대기).' };
    case 'TIMEOUT':          return { title: '시간 초과',   hint: '응답이 너무 늦었습니다. 서버 부하 확인.' };
    case 'EMPTY':            return { title: '응답 비어있음', hint: '응답 본문이 비었거나 분류 불가.' };
    default:                 return { title: '알 수 없는 오류', hint: 'envelope 응답 raw JSON 을 확인하세요.' };
  }
}
