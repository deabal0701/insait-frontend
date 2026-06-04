/**
 * 메타 자원 ID — Command 종류 (R/S/P/E) 정보 유틸.
 *
 * ★ (2026-06-04, dspark): 마법사 폐기에 따라 dead exports 제거.
 *   보존 함수 = ServiceTester 가 사용하는 META_CMD_TYPES 만.
 *   추후 마법사 재구축 시점에 buildScreenId/validateScreenId/SQL 파싱 함수 재도입.
 */

const CMD_TYPE_INFO = Object.freeze({
  R: { code: 'R', label: '조회',     command: 'MultiQueryCommand',  suffix: 'R01' },
  S: { code: 'S', label: '저장',     command: 'MultiSaveCommand',   suffix: 'S01' },
  P: { code: 'P', label: '프로시저', command: 'ProcedureCommand',   suffix: 'P01' },
  E: { code: 'E', label: '전자결재', command: 'ElaServiceCommand',  suffix: 'E01' },
});

export const META_CMD_TYPES = Object.freeze(Object.values(CMD_TYPE_INFO));
