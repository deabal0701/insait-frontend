// 화면 레이아웃 메타 저장소 — ★ (2026-06-18, dspark)
//
// ⚠️ 확장성: 저장소를 추상화(list/get/save/remove)하여 v1=localStorage → 추후 admin REST
//    (/api/admin/meta/screens, OBJECT 속성 FRM_OBJECT_ATTRIBUTE)로 **렌더러·디자이너 무변경 교체**.
//    교체 시 이 파일의 4 메서드 구현만 fetch 로 바꾸면 됨.
//
// 메타 스키마: 02-tobe/04-admin-lane/dev-tools/08_screen-designer.md §2

const KEY = 'insait.screenMeta.v1';   // { [objectId]: meta }

// ── ORM9999 사업장관리 시드 (int_y19_0001.vue 를 메타로 표현 — 디자이너 첫 진입 시 미리보기 증명) ──
export const ORM9999_SEED = {
  version: 1,
  objectId: 'ORM9999',
  title: '사업장관리',
  layout: 'rows',   // single | rows(상하) | cols(좌우)
  search: {
    fields: [
      { key: 'baseYmd', label: '기준일자', type: 'date', role: 'server', chip: false },
      { key: 'bizNm', label: '사업장명', type: 'text', role: 'client', placeholder: '사업장명 포함검색',
        filter: { col: 'biz_nm', op: 'contain' } },
      { key: 'bizCd', label: '사업장코드', type: 'text', role: 'client', placeholder: '코드 포함검색',
        filter: { col: 'biz_cd', op: 'contain' } },
      { key: 'mgrYn', label: '주사업장', type: 'select', role: 'client', placeholder: '전체',
        options: [{ value: '', label: '전체' }, { value: 'Y', label: '주사업장' }, { value: 'N', label: '비주사업장' }],
        filter: { col: 'mgr_biz_yn', op: 'eq' } },
    ],
  },
  panels: [
    {
      id: 'master', title: '사업장 목록', objectId: 'ORM9999',
      retrieve: { serviceId: 'INT_Y19_0001_01_R01', slot: 'ME_INT0001_02',
        in: { company_cd: '{session.companyCd}', base_ymd: '{search.baseYmd}' } },
      save: { serviceId: 'INT_Y19_0001_01_S01' },
      toolbar: ['add', 'delete', 'restore', 'save'],
      newRow: { company_cd: '{session.companyCd}', mgr_biz_yn: 'N', sta_ymd: '{today}', end_ymd: '99991231' },
      height: 420, bodyHeight: 360,
      columns: [
        { name: 'int_biz_id', header: 'int_biz_id', hidden: true },
        { name: 'company_cd', header: 'company_cd', hidden: true },
        { name: 'mgr_biz_yn', header: '주사업장여부', width: 90, align: 'center', cellType: 'checkbox', filter: 'text' },
        { name: 'biz_cd', header: '사업장코드', width: 90, align: 'center', editor: 'text', filter: 'text' },
        { name: 'biz_nm', header: '사업장명', width: 140, editor: 'text', filter: 'text' },
        { name: 'tax_no', header: '사업자번호', width: 110, align: 'center', editor: 'text' },
        { name: 'corp_no', header: '법인번호', width: 110, align: 'center', editor: 'text' },
        { name: 'corp_nm', header: '법인명', width: 110, editor: 'text' },
        { name: 'biz_eng_nm', header: '법인영문명', width: 200, editor: 'text' },
        { name: 'ceo_nm', header: '대표자명', width: 100, align: 'center', editor: 'text' },
        { name: 'ceo_ctz_no', header: '대표자주민번호', width: 130, align: 'center', editor: 'text' },
        { name: 'tel_no', header: '전화번호', width: 110, align: 'center', editor: 'text' },
        { name: 'addr1', header: '주소', width: 200, editor: 'text' },
        { name: 'sta_ymd', header: '시작일', width: 110, align: 'center', format: 'Ymd', editor: 'date' },
        { name: 'end_ymd', header: '종료일', width: 110, align: 'center', format: 'Ymd', editor: 'date' },
      ],
    },
    {
      id: 'detail', title: '상위조직', objectId: 'ORM9999',
      link: { parent: 'master', on: 'rowClick',
        label: '{parent.row.biz_nm} ({parent.row.biz_cd})',
        in: { biz_cd: '{parent.row.biz_cd}' },
        fk: { int_biz_id: '{parent.row.int_biz_id}' } },
      retrieve: { serviceId: 'INT_Y19_0001_02_R01', slot: 'ME_INT0001_03' },
      save: { serviceId: 'INT_Y19_0001_02_S01' },
      toolbar: ['add', 'delete', 'restore', 'save'],
      newRow: { org_cd: '', org_nm: '' },
      height: 300, bodyHeight: 240,
      columns: [
        { name: 'int_biz_org_id', header: 'int_biz_org_id', hidden: true },
        { name: 'int_biz_id', header: 'int_biz_id', hidden: true },
        { name: 'org_cd', header: '조직코드', width: 160, align: 'center', editor: 'text' },
        { name: 'org_nm', header: '조직명', width: 260, editor: 'text' },
      ],
    },
  ],
};

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
}
function writeAll(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* quota/불가 환경 무시 */ }
}

export const screenMetaRepo = {
  /** 저장된 화면 메타 목록(배열). */
  list() { return Object.values(readAll()); },
  /** objectId 로 1건 조회 (없으면 null). */
  get(objectId) { return readAll()[objectId] || null; },
  /** 저장(upsert) — objectId 키. */
  save(meta) {
    const m = readAll();
    m[meta.objectId] = JSON.parse(JSON.stringify(meta));   // deep copy(참조 격리)
    writeAll(m);
    return m[meta.objectId];
  },
  /** 삭제. */
  remove(objectId) { const m = readAll(); delete m[objectId]; writeAll(m); },
  /** 비어있으면 ORM9999 시드 주입(디자이너 첫 진입 데모). */
  seedIfEmpty() {
    const m = readAll();
    if (!m.ORM9999) { m.ORM9999 = JSON.parse(JSON.stringify(ORM9999_SEED)); writeAll(m); }
    return readAll();
  },
};
