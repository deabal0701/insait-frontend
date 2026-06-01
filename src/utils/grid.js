// ★ (2026-05-28, dspark): tui-grid wrapper 보조 헬퍼 (순수 함수).
//   1) formatRegistry — IBSheet 빈출 Format 코드 (Integer/Float|2/Ymd/Time/Datetime/...) 의
//      tui-grid formatter 함수 매핑. column 정의에 `format: 'Ymd'` 선언만으로 변환.
//   2) extractDirtyForEnvelope — tui-grid getModifiedRows() 결과를 AS-IS MultiSave envelope
//      BODY 슬롯 형식 (sStatus: 'I'|'U'|'D' + _seq 부여한 평탄 배열) 로 변환.
//   3) resolveColumnFormats — columns 의 `format` 키를 formatter 함수로 치환.
//   ※ 명칭 매핑 layer 가 아닌 백엔드 contract 정합용. tui-grid native API 는 그대로 사용.
// ★ (2026-06-01, dspark): 갭 A (IBSheet sStatus/_seq 프로토콜) 보강 — 06b 설계서 §3.
//   상태 컬럼 기본키를 ROW_STATUS → sStatus 로 교정 (백엔드 BusinessEntity.saveItem() 가
//   "sStatus"(없으면 "sstatus") 를 검사하고 null 이면 예외. ROW_STATUS 는 무시되어 저장 불가였음).
//   삭제는 "D".equals (대문자 D 필수, BusinessEntity.java:392). soft-delete 엔티티용
//   softDelete 모드 (sStatus='U' + sDelete='Y') + _seq 임시키 보강 추가.
import dayjs from 'dayjs';

function formatDateLike(value, pattern) {
  if (value == null || value === '') return '';
  const s = String(value);
  if (/^\d{8}$/.test(s)) {
    return dayjs(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`).format(pattern);
  }
  if (/^\d{14}$/.test(s)) {
    return dayjs(
      `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`
    ).format(pattern);
  }
  return dayjs(s).format(pattern);
}

function formatTimeLike(value) {
  if (value == null || value === '') return '';
  const s = String(value);
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
  if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s;
}

/** tui-grid formatter signature: ({ value, row, column }) => string */
export const formatRegistry = {
  Integer:   ({ value }) => (value == null || value === '' ? '' : Number(value).toLocaleString('ko-KR')),
  Float2:    ({ value }) => (value == null || value === '' ? '' : Number(value).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
  Ymd:       ({ value }) => formatDateLike(value, 'YYYY-MM-DD'),
  Datetime:  ({ value }) => formatDateLike(value, 'YYYY-MM-DD HH:mm:ss'),
  Time:      ({ value }) => formatTimeLike(value),
  KrwAmount: ({ value }) => (value == null || value === '' ? '' : `${Number(value).toLocaleString('ko-KR')}원`),
  Percent:   ({ value }) => (value == null || value === '' ? '' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`),
};

/**
 * tui-grid grid.getModifiedRows() 결과를 envelope BODY 슬롯 형식 평탄 배열로 변환.
 * 각 row 에 sStatus('I'|'U'|'D') + _seq 임시키 부여. (백엔드 BusinessEntity 계약)
 *
 * IBSheet 가 자동으로 하던 dirty 추적을 대체:
 *   createdRows → sStatus='I' / updatedRows → 'U' / deletedRows → 'D'
 *   (softDelete=true 면 삭제행은 sStatus='U' + sDelete='Y' — soft-delete 엔티티용)
 *
 * @param {object} modifiedRows - grid.getModifiedRows() 반환값
 * @param {object} [options]
 * @param {string}  [options.statusKey='sStatus'] - 상태 컬럼명 (백엔드 계약). rowStatusKey 는 deprecated alias
 * @param {boolean} [options.softDelete=false] - true → 삭제행을 sStatus='U' + sDelete='Y' 로 송신
 * @param {string}  [options.seqKey='_seq'] - 임시키 컬럼명 (서버 PK 와 별개 클라이언트 시퀀스)
 * @param {string[]} [options.exclude] - 결과에서 제외할 키 (tui-grid 내부 필드 등)
 * @returns {Array<object>}
 */
export function extractDirtyForEnvelope(modifiedRows, options = {}) {
  const statusKey = options.statusKey || options.rowStatusKey || 'sStatus';
  const seqKey = options.seqKey || '_seq';
  const softDelete = options.softDelete === true;
  const exclude = new Set(options.exclude || ['rowKey', '_attributes', '_relationListItemMap', 'sortKey', 'uniqueKey']);
  if (!modifiedRows) return [];
  // tui-grid 내부 필드 제외 + _seq 보강 (명시값 > rowKey)
  const pick = (row) => {
    const out = {};
    Object.entries(row).forEach(([k, v]) => {
      if (!exclude.has(k)) out[k] = v;
    });
    if (out[seqKey] == null && row.rowKey != null) out[seqKey] = row.rowKey;
    return out;
  };
  // status / extra(sDelete) 는 원본 row 값을 항상 덮도록 뒤에 배치
  const tag = (status, list, extra) =>
    (list || []).map((row) => ({ ...pick(row), [statusKey]: status, ...(extra || {}) }));
  return [
    ...tag('I', modifiedRows.createdRows),
    ...tag('U', modifiedRows.updatedRows),
    ...(softDelete
      ? tag('U', modifiedRows.deletedRows, { sDelete: 'Y' })
      : tag('D', modifiedRows.deletedRows)),
  ];
}

/**
 * columns 배열의 `format` 키를 formatRegistry 의 formatter 함수로 치환.
 * 원본 columns 는 보존, 새 배열 반환.
 *
 * @param {Array<object>} columns
 * @returns {Array<object>}
 */
export function resolveColumnFormats(columns) {
  return (columns || []).map((col) => {
    if (!col || !col.format) return col;
    const fn = formatRegistry[col.format];
    if (!fn) return col;
    return { ...col, formatter: fn };
  });
}
