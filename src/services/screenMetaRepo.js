// 폼(화면) 메타 저장소 — ★ (2026-06-18, dspark) v2: 컨트롤+그리드좌표 위젯 스키마
//
// ⚠️ 확장성: 저장소 추상화(list/get/save/remove)로 v1=localStorage → 추후 admin REST
//    (/api/admin/meta/screens, OBJECT 속성)로 **디자이너·렌더러 무변경 교체**.
//
// 스키마: { version:2, objectId, title, grid:{cols,rowHeight}, widgets:[{i,type,x,y,w,h,props}] }
//   controls.js 의 컨트롤 type + props. 설계: 04-admin-lane/dev-tools/08_screen-designer.md

const KEY = 'insait.screenMeta.v2';   // { [objectId]: meta }

// ── 데모 시드: "사업장관리"를 컨트롤(제목+검색바+데이터그리드)로 구성 ──
export const DEMO_SEED = {
  version: 2,
  objectId: 'ORM9999',
  title: '사업장관리',
  grid: { cols: 12, rowHeight: 40 },
  widgets: [
    { i: 'w1', type: 'heading', x: 0, y: 0, w: 6, h: 1, props: { text: '사업장관리', size: 'lg' } },
    { i: 'w2', type: 'searchbar', x: 0, y: 1, w: 12, h: 2, props: {
      fields: [
        { key: 'baseYmd', label: '기준일자', type: 'date', role: 'server', chip: false },
        { key: 'bizNm', label: '사업장명', type: 'text', role: 'client', placeholder: '사업장명 포함검색' },
      ],
    } },
    { i: 'w3', type: 'datagrid', x: 0, y: 3, w: 12, h: 7, props: {
      title: '사업장 목록', objectId: 'ORM9999',
      retrieveServiceId: 'INT_Y19_0001_01_R01', saveServiceId: 'INT_Y19_0001_01_S01', slot: 'ME_INT0001_02',
      toolbar: true, autoRetrieve: false,
      retrieveIn: { company_cd: '{session.companyCd}', base_ymd: '{search.baseYmd}' },   // [조회] → 이 파라미터로 envelope 조회
      columns: [
        { name: 'biz_cd', header: '사업장코드', width: 90, align: 'center', editor: 'text' },
        { name: 'biz_nm', header: '사업장명', width: 160, editor: 'text' },
        { name: 'corp_nm', header: '법인명', width: 120, editor: 'text' },
        { name: 'ceo_nm', header: '대표자명', width: 100, align: 'center', editor: 'text' },
        { name: 'tel_no', header: '전화번호', width: 120, align: 'center', editor: 'text' },
      ],
    } },
  ],
};

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
}
function writeAll(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* quota/불가 무시 */ }
}

export const screenMetaRepo = {
  list() { return Object.values(readAll()); },
  get(objectId) { return readAll()[objectId] || null; },
  save(meta) {
    const m = readAll();
    m[meta.objectId] = JSON.parse(JSON.stringify(meta));   // 참조 격리
    writeAll(m);
    return m[meta.objectId];
  },
  remove(objectId) { const m = readAll(); delete m[objectId]; writeAll(m); },
  seedIfEmpty() {
    const m = readAll();
    if (Object.keys(m).length === 0) { m[DEMO_SEED.objectId] = JSON.parse(JSON.stringify(DEMO_SEED)); writeAll(m); }
    return readAll();
  },
};
