/**
 * metaUtils — 04-admin-lane 메타 카탈로그 공용 순수 헬퍼.
 * ★ (2026-06-05, dspark): 5개 카탈로그에 중복/인라인되던 헬퍼 추출 (코드 일관성 정리).
 */

/** FQCN → 짧은 클래스명. 예: h5.biz.command.common.MultiQueryCommand → MultiQueryCommand */
export function shortCmd(fqcn) {
  return fqcn ? String(fqcn).split('.').pop() : '';
}
