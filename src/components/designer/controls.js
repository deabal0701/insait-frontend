// 폼 디자이너 컨트롤 레지스트리 — ★ (2026-06-18, dspark)
//
// Visual Basic 식 "컨트롤 + 속성" 화면 구성의 단일 출처(순수 데이터 — 직렬화 가능, 컴포넌트 참조 없음).
// 각 컨트롤: type · name(팔레트) · cat(분류) · glyph · defaultSize(그리드 칸 w/h) · defaultProps · schema(속성시트).
//
// ⚠️ 확장/교체 설계 (사용자 요구: 컴포넌트가 바뀔 수 있음):
//   - 새 컨트롤 = 본 배열에 1건 추가 + ControlView 의 COMP 맵에 1줄(어느 컴포넌트로 그릴지).
//   - 컨트롤의 "그리는 컴포넌트"는 본 파일이 아니라 ControlView.COMP 에서 결정 → 컴포넌트 스왑은 그 한 줄만 수정.
//   - 따라서 레지스트리(데이터)와 렌더(컴포넌트)가 분리되어 저장 JSON 은 컴포넌트 변경에 영향 없음.
//
// schema kind: 'text' | 'number' | 'select'(options) | 'switch' | 'json'(textarea)

export const CATEGORIES = [
  { key: 'layout', label: '배치' },
  { key: 'display', label: '표시' },
  { key: 'input', label: '입력' },
  { key: 'action', label: '동작' },
  { key: 'data', label: '데이터' },
];

const T = (key, label, kind = 'text', extra = {}) => ({ key, label, kind, ...extra });

export const CONTROLS = [
  // ── 배치(layout) ──
  { type: 'panel', name: '패널/박스', cat: 'layout', glyph: '▢', defaultSize: { w: 12, h: 4 },
    defaultProps: { title: '', bordered: true },
    schema: [T('title', '제목(상단)'), T('bordered', '테두리', 'switch')] },
  { type: 'divider', name: '구분선', cat: 'layout', glyph: '―', defaultSize: { w: 12, h: 1 },
    defaultProps: {}, schema: [] },

  // ── 표시(display) ──
  { type: 'label', name: '레이블', cat: 'display', glyph: 'T', defaultSize: { w: 3, h: 1 },
    defaultProps: { text: '레이블', align: 'left' },
    schema: [T('text', '텍스트'), T('align', '정렬', 'select', { options: [{ value: 'left', label: '왼쪽' }, { value: 'center', label: '가운데' }, { value: 'right', label: '오른쪽' }] })] },
  { type: 'heading', name: '제목', cat: 'display', glyph: 'H', defaultSize: { w: 6, h: 1 },
    defaultProps: { text: '제목', size: 'lg' },
    schema: [T('text', '텍스트'), T('size', '크기', 'select', { options: [{ value: 'md', label: 'md' }, { value: 'lg', label: 'lg' }, { value: 'xl', label: 'xl' }] })] },

  // ── 입력(input) ──
  { type: 'textbox', name: '텍스트박스', cat: 'input', glyph: '⌨', defaultSize: { w: 4, h: 1 },
    defaultProps: { label: '항목', placeholder: '' },
    schema: [T('label', '라벨'), T('placeholder', 'placeholder')] },
  { type: 'number', name: '숫자', cat: 'input', glyph: '#', defaultSize: { w: 3, h: 1 },
    defaultProps: { label: '숫자', placeholder: '0' },
    schema: [T('label', '라벨'), T('placeholder', 'placeholder')] },
  { type: 'select', name: '콤보박스', cat: 'input', glyph: '▾', defaultSize: { w: 4, h: 1 },
    defaultProps: { label: '선택', placeholder: '전체', options: [{ value: '', label: '전체' }] },
    schema: [T('label', '라벨'), T('placeholder', 'placeholder'), T('options', '옵션(JSON)', 'json')] },
  { type: 'datepicker', name: '날짜', cat: 'input', glyph: '▦', defaultSize: { w: 3, h: 1 },
    defaultProps: { label: '날짜' }, schema: [T('label', '라벨')] },
  { type: 'checkbox', name: '체크박스', cat: 'input', glyph: '☑', defaultSize: { w: 3, h: 1 },
    defaultProps: { label: '동의', checked: false },
    schema: [T('label', '라벨'), T('checked', '기본 체크', 'switch')] },
  { type: 'switch', name: '스위치', cat: 'input', glyph: '⏻', defaultSize: { w: 3, h: 1 },
    defaultProps: { label: '사용', on: false },
    schema: [T('label', '라벨'), T('on', '기본 ON', 'switch')] },

  // ── 동작(action) ──
  { type: 'button', name: '버튼', cat: 'action', glyph: '⬚', defaultSize: { w: 2, h: 1 },
    defaultProps: { text: '버튼', variant: 'primary' },
    schema: [T('text', '텍스트'), T('variant', '스타일', 'select', { options: [{ value: 'primary', label: 'primary' }, { value: 'default', label: 'default' }, { value: 'danger', label: 'danger' }] })] },

  // ── 데이터(data) ──
  { type: 'searchbar', name: '검색바', cat: 'data', glyph: '🔍', defaultSize: { w: 12, h: 2 },
    defaultProps: { fields: [{ key: 'baseYmd', label: '기준일자', type: 'date', role: 'server', chip: false }] },
    schema: [T('fields', '검색필드(JSON)', 'json')] },
  { type: 'datagrid', name: '데이터그리드', cat: 'data', glyph: '▤', defaultSize: { w: 12, h: 6 },
    defaultProps: {
      title: '목록', objectId: '', retrieveServiceId: '', saveServiceId: '',
      slot: '', retrieveSlot: '',   // slot=결과(OUT) 메시지 / retrieveSlot=조회 조건(IN) 메시지 (다를 수 있음)
      toolbar: true, autoRetrieve: false,
      retrieveIn: { company_cd: '{session.companyCd}' },   // 조회 파라미터 ← 검색바 {search.<key>} / {session.X} / {today}
      columns: [{ name: 'col1', header: '컬럼1', width: 120 }],
    },
    schema: [
      T('title', '제목'), T('objectId', 'OBJECT ID'), T('retrieveServiceId', '조회 서비스ID'),
      T('saveServiceId', '저장 서비스ID'), T('slot', '결과 슬롯(OUT)'), T('retrieveSlot', '조회조건 슬롯(IN)'),
      T('toolbar', '툴바(입력/삭제/복원/저장)', 'switch'), T('autoRetrieve', '진입 시 자동조회', 'switch'),
      T('retrieveIn', '조회 파라미터(JSON) — {search.키}/{session.companyCd}', 'json'),
      T('columns', '컬럼(JSON)', 'json'),
    ] },
];

/** type → 컨트롤 정의. */
export const CONTROL_MAP = Object.freeze(Object.fromEntries(CONTROLS.map((c) => [c.type, c])));

/** 신규 위젯 1건 생성(기본 props deep copy). pos = {x,y,w,h} 일부 지정 가능. */
export function makeWidget(type, id, pos = {}) {
  const def = CONTROL_MAP[type];
  if (!def) return null;
  return {
    i: id, type,
    x: pos.x ?? 0, y: pos.y ?? 0,
    w: pos.w ?? def.defaultSize.w, h: pos.h ?? def.defaultSize.h,
    props: JSON.parse(JSON.stringify(def.defaultProps)),
  };
}
