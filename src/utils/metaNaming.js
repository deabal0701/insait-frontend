/**
 * 메타 자원 ID 자동 생성 유틸 — 7-char prefix 컨벤션 강제.
 *
 * 컨벤션 (SUMMARY-metadata-registration-guide §1.2):
 *   화면 ID = 정확히 7자 (도메인 3자 + 일련번호 4자) — 예: TST0001
 *
 * 위반 시 IST0050 [간편입력] PROCEDURE 의 자동 바인딩 (SUBSTR(sv_def_nm, 0, 7))
 * 이 존재하지 않는 메시지 ID 를 가리킴 → 메인 화면에서 수동 SQL UPDATE 정정 필요
 * → 본 유틸을 거치면 컨벤션 위반 자체가 불가능.
 *
 * 매뉴얼 인용:
 *  - 99 §4-2.1 — 7-char prefix 함정과 회복
 *  - SUMMARY §1.2.3 — 자동 바인딩 PROCEDURE
 *  - SUMMARY §5.1.1 — 쿼리명 4부분 구조
 */

const CMD_TYPE_INFO = Object.freeze({
  R: { code: 'R', label: '조회',     command: 'MultiQueryCommand',  suffix: 'R01', svMapType: 'sql',       requiresEntity: false, defaultMsgIn: '01', defaultMsgOut: '02' },
  S: { code: 'S', label: '저장',     command: 'MultiSaveCommand',   suffix: 'S01', svMapType: 'entity',    requiresEntity: true,  defaultMsgIn: '02', defaultMsgOut: 'ME_SAVE_RESULT' },
  P: { code: 'P', label: '프로시저', command: 'ProcedureCommand',   suffix: 'P01', svMapType: 'procedure', requiresEntity: false, defaultMsgIn: '01', defaultMsgOut: 'ME_FRM_SP_RESULT' },
  E: { code: 'E', label: '전자결재', command: 'ElaServiceCommand',  suffix: 'E01', svMapType: 'ela',       requiresEntity: false, defaultMsgIn: '01', defaultMsgOut: 'ME_SAVE_RESULT' },
});

export const META_CMD_TYPES = Object.freeze(Object.values(CMD_TYPE_INFO));

/** Command 종류 정보 조회. R/S/P/E 외 입력은 null. */
export function getCmdTypeInfo(cmdType) {
  if (!cmdType) return null;
  return CMD_TYPE_INFO[String(cmdType).toUpperCase()] || null;
}

/** 도메인 3자 + 일련번호 4자 → 7-char screenId. 입력값 검증 X (호출처에서 검증 권장). */
export function buildScreenId(domainCode, serial) {
  const d = String(domainCode || '').toUpperCase();
  const s = String(serial || '').padStart(4, '0').slice(-4);
  return `${d}${s}`;
}

/**
 * 7-char screenId 형식 검증.
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateScreenId(screenId) {
  const v = String(screenId || '');
  if (v.length !== 7) {
    return { valid: false, reason: '화면 ID 는 정확히 7자여야 합니다 (도메인 3자 + 일련번호 4자).' };
  }
  if (!/^[A-Z]{3}\d{4}$/.test(v)) {
    return { valid: false, reason: '도메인 3자 (대문자) + 일련번호 4자 (숫자) 형식이어야 합니다.' };
  }
  return { valid: true };
}

/** 7-char screenId → 도메인 코드 (3자) 추출. */
export function extractDomainCode(screenId) {
  const v = String(screenId || '');
  return v.length >= 3 ? v.slice(0, 3).toUpperCase() : '';
}

/** 7-char screenId → 일련번호 (4자) 추출. */
export function extractSerial(screenId) {
  const v = String(screenId || '');
  return v.length === 7 ? v.slice(3) : '';
}

/**
 * 화면 ID + Command 종류 → 모든 메타 자원 ID 자동 생성.
 *
 * @param {string} screenId  7-char (예: 'TST0001')
 * @param {string} cmdType   'R' | 'S' | 'P' | 'E'
 * @param {object} [opts]    { groupNo='00', serial='01', objectSuffix='51' }
 * @returns {object|null}    {object, jsp, sql, msgIn, msgOut, entity, service} 또는 null (입력 무효)
 */
export function deriveResourceIds(screenId, cmdType, opts = {}) {
  const v = validateScreenId(screenId);
  if (!v.valid) return null;
  const info = getCmdTypeInfo(cmdType);
  if (!info) return null;

  const groupNo = String(opts.groupNo || '00').padStart(2, '0').slice(-2);
  const serial = String(opts.serial || '01').padStart(2, '0').slice(-2);
  const objectSuffix = String(opts.objectSuffix || '51');
  const domain = extractDomainCode(screenId).toLowerCase();
  const screenLower = screenId.toLowerCase();

  return {
    screenId,
    cmdType: info.code,
    cmdCommand: info.command,
    svMapType: info.svMapType,
    requiresEntity: info.requiresEntity,

    object: `${screenId}_${objectSuffix}`,
    objectLink: `/${domain}/web/${screenLower}.jsp`,
    jspPath: `src/main/webapp/${domain}/web/${screenLower}.jsp`,

    sqlName: `${screenId}_${groupNo}_${info.code}${serial}`,
    msgIn: `MT_${screenId}_${info.defaultMsgIn}`,
    msgInInstance: `ME_${screenId}_${info.defaultMsgIn}`,
    msgOut: info.defaultMsgOut.startsWith('ME_') ? info.defaultMsgOut : `MT_${screenId}_${info.defaultMsgOut}`,
    msgOutInstance: info.defaultMsgOut.startsWith('ME_') ? info.defaultMsgOut : `ME_${screenId}_${info.defaultMsgOut}`,
    entityName: info.requiresEntity ? `EN_${screenId}` : null,
    serviceName: `${screenId}_${groupNo}_${info.code}${serial}`,

    // 메뉴/권한 추천 ID
    suggestedMenuId: `SD_${screenId}`,
    suggestedAuthItemId: `ACCESS_${screenId}_VIEW`,
  };
}

/**
 * SQL 본문에서 `:name` 바인드 파라미터 자동 추출 (순서 유지, 중복 제거).
 *
 * 매뉴얼 99 §2.4 — Oracle NULL concat 패턴 (`'%' || :keyword || '%'`) 는
 * Phase 3 DB 변경 시 영향. 본 함수는 단순 추출만 — 호환성 hint 는 별도 검사.
 */
export function extractSqlBindParams(sqlBody) {
  const text = String(sqlBody || '');
  // PL/SQL 의 :=, :: 케이스 회피. `:identifier` 형태만 매칭.
  const re = /(?<![:\w]):([A-Za-z_][A-Za-z0-9_]*)/g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/**
 * SQL 본문 — 단순 SELECT 의 컬럼 alias 추출.
 * INSERT/UPDATE/PL/SQL 등은 빈 배열. 정규식 기반 — 복잡 SQL 은 미지원 (의도된 단순화).
 *
 * 운영 SQL 의 약 80% 가 단순 SELECT 라 본 추출기 + 사용자 확인으로 충분 (대화 §3 결정).
 */
export function extractSqlSelectColumns(sqlBody) {
  const text = String(sqlBody || '').replace(/\s+/g, ' ').trim();
  const m = text.match(/^\s*SELECT\s+(.+?)\s+FROM\s+/i);
  if (!m) return [];
  const list = m[1];
  // 괄호 내부의 콤마는 무시 (DECODE, COALESCE, F_FRM_CODE_NM 등 함수 호출)
  const cols = [];
  let depth = 0;
  let buf = '';
  for (const ch of list) {
    if (ch === '(') { depth++; buf += ch; continue; }
    if (ch === ')') { depth--; buf += ch; continue; }
    if (ch === ',' && depth === 0) { cols.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) cols.push(buf.trim());
  return cols.map((expr) => parseColumnAlias(expr)).filter(Boolean);
}

/**
 * @typedef {Object} ColumnAlias
 * @property {string} expr   원본 expression (SELECT 절 부분)
 * @property {string} name   추출된 컬럼명 (alias 우선, 없으면 마지막 식별자)
 * @property {boolean} hasAlias  AS 키워드 또는 명시 alias 여부
 */
function parseColumnAlias(expr) {
  const e = String(expr || '').trim();
  if (!e) return null;
  // `expression AS alias` 패턴
  const aliasMatch = e.match(/(?:\s+AS\s+|\s+)([A-Za-z_][A-Za-z0-9_]*)\s*$/i);
  if (aliasMatch && / /.test(e.replace(/\([^()]*\)/g, '_'))) {
    // 단순 식별자 한 단어 (예: object_id) 는 alias 가 아님 — 본인 자체
    const head = e.slice(0, e.length - aliasMatch[0].length).trim();
    if (head) {
      return { expr: e, name: aliasMatch[1], hasAlias: true };
    }
  }
  // 단순 식별자
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(e)) {
    return { expr: e, name: e, hasAlias: false };
  }
  // `a.b` qualified
  const qual = e.match(/^[A-Za-z_][A-Za-z0-9_]*\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (qual) return { expr: e, name: qual[1], hasAlias: false };
  // 함수 호출 등 — name 불명 (사용자 입력 필요)
  return { expr: e, name: '', hasAlias: false };
}

/**
 * SQL 본문에서 첫 FROM/INTO/UPDATE 대상 테이블명 추출 (단순 케이스).
 * Entity 단계의 DB 테이블 자동 선택 기본값 제공용.
 */
export function extractSqlTargetTable(sqlBody) {
  const text = String(sqlBody || '').replace(/\s+/g, ' ').trim();
  const patterns = [
    /\bINSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)/i,
    /\bUPDATE\s+([A-Za-z_][A-Za-z0-9_]*)/i,
    /\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/i,
    /\bDELETE\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].toUpperCase();
  }
  return '';
}

/**
 * 컬럼명 패턴 → TYPE_CD 추론 (4종 표준).
 *
 * SUMMARY-metadata-registration-guide §4.2.1:
 *   string / numeric / date / clob 만 사용. 동의어 (varchar2, number, datetime) 는 폐기.
 */
export function inferTypeCdFromName(columnName) {
  const n = String(columnName || '').toLowerCase();
  if (!n) return 'string';
  if (/(_id|_no|_seq|_cnt|_amt|_pay|_qty|_rate|_pct|_ratio|_height|_width|_ord|_oid)$/.test(n)) return 'numeric';
  if (/^(amt|pay|qty|cnt|seq|num|no)_/.test(n)) return 'numeric';
  if (/(_dt|_date|_ymd|_ym|_time|_stamp|_at)$/.test(n)) return 'date';
  if (/^(dt|date|ymd|ym)_/.test(n)) return 'date';
  if (/_(yn|flag|use)$/.test(n)) return 'string'; // YN 은 1자 string
  if (/(_desc|_remark|_memo|_content|_text|_note|_msg|_body)$/.test(n)) return 'string';
  if (/(_html|_xml|_json|_blob|_clob)$/.test(n)) return 'clob';
  return 'string';
}

/** TYPE_CD 별 기본 최대길이 — SUMMARY §4.2.1 가이드. */
export function defaultMaxLengthByTypeCd(typeCd) {
  switch (typeCd) {
    case 'string':  return 100;
    case 'numeric': return 22;
    case 'date':    return null;
    case 'clob':    return null;
    default:        return 100;
  }
}

/**
 * 개인정보(SEED 암호화) 추정 컬럼 — 00_workflow §4 함정 #6 회피.
 * 운영 패턴: emp_id, jumin, email, phone, account 등.
 */
const PII_PATTERNS = [
  /\bemp_id\b/i,
  /\bjumin/i,
  /\bresident/i,
  /\bemail/i,
  /\bphone/i,
  /\baccount/i,
  /\baddr/i,
  /\bbank/i,
  /\bsalary/i,
  /\bpay_amt/i,
];

export function isLikelyPiiColumn(columnName) {
  const n = String(columnName || '');
  return PII_PATTERNS.some((re) => re.test(n));
}
