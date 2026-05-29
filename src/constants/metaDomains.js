/**
 * 메타 시스템 도메인 prefix 사전 (3자) — SUMMARY-metadata-registration-guide.md §1.2.1 기준.
 *
 * 7-char 화면ID 컨벤션: <domain 3자><serial 4자>. 자동 바인딩 prefix 매칭의 근간.
 * - PROCEDURE EHR.P_FRM_SERVICE_EASY_INPUT 가 SUBSTR(sv_def_nm, 0, 7) 로 메시지 ID 생성
 * - 7-char prefix 위반 시 IST0050 자동 바인딩이 가짜 메시지 ID 가리킴 (운영 13년 함정)
 *
 * 확정 항목만 등재 — 추정 prefix (ACM/BCD/BEM 등 22종) 는 별도 사전 참조.
 * 학습용 TST 는 운영 미사용 prefix 로 분리 가능 (실수 차단).
 */

export const META_DOMAIN_CATEGORIES = Object.freeze([
  { key: 'system',     label: '프레임워크/시스템' },
  { key: 'hr-master',  label: '인사 마스터·조직' },
  { key: 'pay-eval',   label: '급여·평가·보상' },
  { key: 'attendance', label: '근태·출장' },
  { key: 'hr-ops',     label: '인사 운영' },
  { key: 'welfare',    label: '복리후생' },
  { key: 'edu-appr',   label: '교육·결재·설문' },
  { key: 'inquiry',    label: '조회·통계·도구' },
  { key: 'learning',   label: '학습·테스트' },
]);

/**
 * @typedef {Object} MetaDomain
 * @property {string} code           3자 도메인 코드 (대문자)
 * @property {string} category       META_DOMAIN_CATEGORIES.key
 * @property {string} label          한글 의미
 * @property {string} [moduleHint]   레거시 모듈명 (있을 때)
 * @property {boolean} [productionUse]  운영 미사용 prefix (학습용) 면 false
 */
export const META_DOMAINS = Object.freeze([
  // 프레임워크/시스템
  { code: 'FRM', category: 'system', label: '공통 프레임워크 + 메타 SSOT (최다 177 테이블)' },
  { code: 'AUT', category: 'system', label: '사용자 인증·권한' },
  { code: 'IST', category: 'system', label: '개발도구·서비스관리' },
  // 인사 마스터·조직
  { code: 'PHM', category: 'hr-master', label: '인사기본 (134 테이블)' },
  { code: 'ORM', category: 'hr-master', label: '조직관리' },
  { code: 'ORG', category: 'hr-master', label: '조직 (단일 테이블)' },
  { code: 'ORT', category: 'hr-master', label: '조직도 트리 (IN Org)' },
  // 급여·평가·보상
  { code: 'PAY', category: 'pay-eval', label: '급여 (3.2M 행)', moduleHint: 'module-h5-pay' },
  { code: 'PEE', category: 'pay-eval', label: '인사평가 (843K 행)' },
  { code: 'MBO', category: 'pay-eval', label: '목표관리' },
  { code: 'SPS', category: 'pay-eval', label: '근로소득간이지급명세' },
  // 근태·출장
  { code: 'DTS', category: 'attendance', label: '근태/시간관리 (765K 행)' },
  { code: 'TRI', category: 'attendance', label: '출장/외근' },
  // 인사 운영
  { code: 'REM', category: 'hr-ops', label: '채용', moduleHint: 'module-h5-rem' },
  { code: 'CAM', category: 'hr-ops', label: '발령·인사이동 (SAP 연동)', moduleHint: 'module-h5-cam' },
  { code: 'PRM', category: 'hr-ops', label: '승진관리' },
  { code: 'RTP', category: 'hr-ops', label: '퇴직관리' },
  { code: 'PPM', category: 'hr-ops', label: '상벌관리' },
  // 복리후생
  { code: 'ECC', category: 'welfare', label: '경조금' },
  { code: 'WPT', category: 'welfare', label: '복지포인트' },
  { code: 'SCE', category: 'welfare', label: '학자금' },
  { code: 'LSE', category: 'welfare', label: '장기근속' },
  { code: 'NHS', category: 'welfare', label: '4대보험' },
  { code: 'SIM', category: 'welfare', label: '사회보험관리' },
  { code: 'HSI', category: 'welfare', label: '사회보험정보' },
  { code: 'OIM', category: 'welfare', label: '단체보험' },
  { code: 'OLM', category: 'welfare', label: '단체보험 (구버전)' },
  { code: 'HOC', category: 'welfare', label: '동호회' },
  { code: 'RSF', category: 'welfare', label: '휴양시설' },
  { code: 'CTF', category: 'welfare', label: '자격증' },
  // 교육·결재·설문
  { code: 'LEM', category: 'edu-appr', label: '교육관리 (526K 행)' },
  { code: 'ELA', category: 'edu-appr', label: '전자결재', moduleHint: 'module-h5-ela' },
  { code: 'FSQ', category: 'edu-appr', label: '설문', moduleHint: 'module-h5-fsq' },
  { code: 'OPQ', category: 'edu-appr', label: '설문관리' },
  // 조회·통계·도구
  { code: 'HRS', category: 'inquiry', label: 'HR통계/인사정보조회 (대시보드·인원현황)' },
  { code: 'MHR', category: 'inquiry', label: '모바일 HR' },
  { code: 'CEV', category: 'inquiry', label: '종합평가' },
  { code: 'JSM', category: 'inquiry', label: '조직도 시각화 차트' },
  { code: 'REP', category: 'inquiry', label: '리포트' },
  { code: 'CNV', category: 'inquiry', label: '컨버전(마이그레이션)' },
  // 학습·테스트
  { code: 'TST', category: 'learning', label: '테스트 (운영 미사용 — 학습용)', productionUse: false },
]);

/** 코드(3자) 로 도메인 lookup. 없으면 null. */
export function findDomainByCode(code) {
  if (!code) return null;
  const up = String(code).toUpperCase();
  return META_DOMAINS.find((d) => d.code === up) || null;
}

/** 카테고리 key 로 도메인 목록 추출. */
export function findDomainsByCategory(categoryKey) {
  return META_DOMAINS.filter((d) => d.category === categoryKey);
}

/** 코드(3자) 가 사전에 등재되었는지 (대소문자 무관). */
export function isKnownDomainCode(code) {
  return !!findDomainByCode(code);
}
