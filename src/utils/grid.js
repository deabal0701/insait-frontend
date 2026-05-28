// ★ (2026-05-28, dspark): tui-grid wrapper 보조 헬퍼 (순수 함수).
//   1) formatRegistry — IBSheet 빈출 Format 코드 (Integer/Float|2/Ymd/Time/Datetime/...) 의
//      tui-grid formatter 함수 매핑. column 정의에 `format: 'Ymd'` 선언만으로 변환.
//   2) extractDirtyForEnvelope — tui-grid getModifiedRows() 결과를 AS-IS MultiSave envelope
//      BODY 슬롯 형식 (ROW_STATUS: 'I'|'U'|'D' 컬럼 추가한 평탄 배열) 로 변환.
//   3) resolveColumnFormats — columns 의 `format` 키를 formatter 함수로 치환.
//   ※ 명칭 매핑 layer 가 아닌 백엔드 contract 정합용. tui-grid native API 는 그대로 사용.
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
 * 각 row 에 ROW_STATUS('I'|'U'|'D') 컬럼 prepend.
 *
 * @param {object} modifiedRows - grid.getModifiedRows() 반환값
 * @param {object} [options]
 * @param {string} [options.rowStatusKey='ROW_STATUS'] - 상태 컬럼명
 * @param {string[]} [options.exclude] - 결과에서 제외할 키 (tui-grid 내부 필드 등)
 * @returns {Array<object>}
 */
export function extractDirtyForEnvelope(modifiedRows, options = {}) {
  const key = options.rowStatusKey || 'ROW_STATUS';
  const exclude = new Set(options.exclude || ['rowKey', '_attributes', '_relationListItemMap', 'sortKey', 'uniqueKey']);
  if (!modifiedRows) return [];
  const tag = (status, list) =>
    (list || []).map((row) => {
      const out = { [key]: status };
      Object.entries(row).forEach(([k, v]) => {
        if (!exclude.has(k)) out[k] = v;
      });
      return out;
    });
  return [
    ...tag('I', modifiedRows.createdRows),
    ...tag('U', modifiedRows.updatedRows),
    ...tag('D', modifiedRows.deletedRows),
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
