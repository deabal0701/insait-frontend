/**
 * catalogOptions — 04-admin-lane 메타 카탈로그 공용 옵션·이름 패턴.
 * ★ (2026-06-05, dspark): 5개 카탈로그에 중복 선언되던 상수 중앙화 (코드 일관성 정리).
 */

/** 필터 Y/N 셀렉트 (전체/Y/N) — 목록 필터용 */
export const YN_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

/** 편집 폼 Y/N 셀렉트 (Y/N) — 상세 편집용 */
export const YN_EDIT_OPTIONS = [
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];

/**
 * 신규 등록 이름 컨벤션 패턴 (도메인별 — 백엔드 검증과 정합).
 *
 * ★ 이름검증 정책 (2026-06-05 통일):
 *  - SQL / 서비스 : 7자 + '_' + 접미  (자동 바인딩 prefix 규칙)
 *  - 메시지       : 'MT_'|'ME_' + 7자 + '_' + 접미
 *  - 엔터티/오브젝트 : **클라이언트 패턴 미적용 (의도)** — 명명 규칙이 단일 정규식에 안 맞음
 *      (오브젝트 예: `ACM0011`(접미 없음)·`AUT0010_51` / 엔터티 예: `EN_*`·테이블명).
 *      → 백엔드 create 가드가 최종 검증. (99_status backlog #6 레거시 예외 참조)
 */
export const SQL_NAME_RE = /^[A-Za-z0-9]{7}_[A-Za-z0-9_]+$/;
export const SERVICE_NAME_RE = SQL_NAME_RE;
export const MSG_NAME_RE = /^(MT|ME)_[A-Za-z0-9]{7}_[A-Za-z0-9_]+$/;
