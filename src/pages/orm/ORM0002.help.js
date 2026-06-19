/**
 * ORM0002.help.js — 조직도(ORM0002) 화면 도움말 (업무 + 플로우 + 쿼리/서비스).
 * ★ [DEV-HELP] (2026-06-19, dspark): 임시 개발 편의용 — 제목 5클릭으로 노출, 관리자/개발자 본인 전용("나 혼자 보기").
 *   메타 카탈로그 도움말과 동일 패턴(ScreenHelpDrawer). 제거 시 grep "DEV-HELP".
 *   출처: captures/인사기본_조직도.md(스펙·전문) + AS-IS orm0010.jsp/orm0040.jsp + frm_query_def_body.csv(id 6290350) + TO-BE 기획서 v1.51 §02.
 */
export default {
  object: 'ORM0002',
  title: '조직도',
  table: 'VI_FRM_ORM_ORG (조직 뷰 — 기준일 시점 조직 트리)',
  asOf: '2026-06-19',

  callouts: [
    { tone: 'warn', text: '<strong>데이터 = 우리 H5 envelope</strong> (saaswin/h5on PostgreSQL 무시). 조직트리 = <strong>ORM0010_00_R01</strong> · IN <code>ME_ORM0010_01</code> / OUT <code>ME_ORM0010_02</code>(isTreeData). 트리 = <code>SUPER_ORG_ID → ORG_ID</code>.' },
    { tone: 'warn', text: '<strong>빌드 정본 = TO-BE 기획서 v1.51 §02</strong> (as-is h5on 복제 아님): 미래일자 조회불가 · 가로/세로 배열 · 엑셀 다운로드 · 조직명 1개 자동포커싱 · 조직인원 정렬 3종.' },
    { tone: 'info', text: '<strong>인원수(총 N명)·구성원</strong> 은 조직트리 서비스에 없음 → 조직원 서비스(<code>ORM0040</code> 계열) 후속 배선. 현재는 트리만 렌더(스캐폴드).' },
  ],

  operations: [
    {
      key: 'tree', label: '조직 트리 조회 (진입 시 / [조회])',
      sql:
`-- envelope ORM0010_00_R01 → 메타 SQL(조직정보관리조직트리) 실행 (frm_query_def_body id=6290350):
SELECT A.ORG_ID
     , A.COMPANY_CD
     , A.ORG_CD       AS SEARCH_CD
     , A.ORG_NM
     , A.ORG_NM       AS TITLE
     , A.SUPER_ORG_ID                         -- ★ 트리 부모키
     , A.ORG_SORT     AS SORT_SEQ
     , :base_ymd      AS BASE_YMD
  FROM VI_FRM_ORM_ORG A
 WHERE A.COMPANY_CD = :company_cd
   AND A.REG_ORG_YN LIKE DECODE(:reg_org_yn, 'Y','%', 'N','Y')
   AND :base_ymd BETWEEN A.STA_YMD AND A.END_YMD
   AND ORG_LINE LIKE F_FRM_ORM_ORG_NM(:org_id, :locale_cd, :base_ymd, 'LL') || '%'
 ORDER BY SORT_SEQ;`,
      conditions: [
        { name: ':base_ymd', effect: '기준일(YYYYMMDD). STA_YMD~END_YMD 사이 유효 조직만. ★ 미래일자 조회 불가(기획서 v1.5)' },
        { name: ':company_cd', effect: '회사코드(세션) — 테넌트 스코프' },
        { name: ':reg_org_yn', effect: "'N'=등록조직만(REG_ORG_YN='Y') / 'Y'=전체. 화면 기본 'N'" },
        { name: ':org_id', effect: '루트 한정(빈값=전체 트리). ORG_LINE LIKE 로 하위 가지 필터' },
        { name: ':locale_cd', effect: '다국어(KO/EN…) — 조직명 언어' },
        { name: 'SUPER_ORG_ID → ORG_ID', effect: '★ 프론트가 이 부모-자식으로 Vue Flow nodes/edges 구성' },
      ],
      note: 'envelope HEADER.serviceId=ORM0010_00_R01 · objectId=ORM0010(자동추론) · IN 슬롯 ME_ORM0010_01 · OUT 슬롯 ME_ORM0010_02. AS-IS 원본 orm0010.jsp.',
    },
    {
      key: 'flow', label: '화면 플로우 (진입 → 렌더)',
      sql:
`[1] onMounted → retrieve()
[2] useService().call('ORM0010_00_R01',
        { ME_ORM0010_01: [{ base_ymd, company_cd, locale_cd, reg_org_yn }] })
      → POST /serviceBroker.h5   (보존 envelope, 신규 백엔드 0)
[3] parseResponse(resp, 'ME_ORM0010_02')  →  조직 행[]
        (ORG_ID / SUPER_ORG_ID / ORG_NM / SEARCH_CD / SORT_SEQ)
[4] buildGraph(): 행 → Vue Flow nodes + edges(SUPER_ORG_ID→ORG_ID)
        → @dagrejs/dagre 자동 레이아웃 (rankdir LR=가로 / TB=세로)
[5] 노드 클릭 → 우측 인스펙터([조직정보 보기] / [조직인원 보기] 탭)
[6] [조회]·기준일·보기방식 변경 → retrieve() 재호출`,
      conditions: [
        { name: '보기방식(viewMode)', effect: '하위 포함 / 선택만 — 인원수 집계 범위(조직원 서비스 배선 후 적용)' },
        { name: '조직명 검색', effect: '조직 1개 자동 포커싱(기획서 §02_03) — TODO' },
        { name: '배열(direction)', effect: '가로(LR, 디폴트) / 세로(TB) 토글 → dagre rankdir' },
        { name: '빈 데이터 가드', effect: '0건이면 dagre 미호출(빈 그래프 networkSimplex 크래시 방지) + 엠프티 스테이트' },
      ],
      note: '라이브러리: @vue-flow/core(OSS, jointjs 대체) + @dagrejs/dagre. h5on은 jointjs(@joint/plus 유료) 사용.',
    },
    {
      key: 'members', label: '조직 인원/구성원 (후속 — 미배선)',
      sql:
`-- TODO: 조직원 서비스 (ORM0040 계열) — 조직별 구성원·인원수
--   총 N명 = 조직별 구성원 count, 구성원 카드(이름/직책/직위/직급/조직장)
--   보기방식(하위 포함/선택만)별 집계 범위 차등
-- saaswin(h5on) 참조 전문 (직접 호출 X, 형태 참조용):
--   POST /WHNN/api/ssw/0022
--   [{ sqlId:'hpr_ognz01', sql_key:'hpr_ognz_reorg_crtr_excn_get',
--      params:[{ rprs_ognz_no, crtr_ymd }] }]
--   → 응답 affl_info{ ognz_uid: [ {user_no,korn_flnm,jbttl_nm,jbps_nm,jbgd_nm} ] }`,
      conditions: [
        { name: 'ORM0040 (조직원 조회)', effect: '조직별 구성원·인원수 — 우리 envelope 후속 배선 대상' },
      ],
      note: '현재 스캐폴드는 조직 트리만. 인원수·구성원·정렬순서(조직/직책직위/이름)는 후속.',
    },
  ],

  businessNotes: [
    '조직도 = 회사 조직 계층을 기준일 시점으로 시각 조회(읽기전용). 박스=조직, 연결선=상하위(SUPER_ORG_ID→ORG_ID).',
    '기준일: 조직은 시점마다 다름(조직개편 이력). STA_YMD~END_YMD 유효구간으로 필터. 미래일자 조회 불가(기획서 v1.5).',
    '보기방식: "하위 조직 구성원 포함 표시"(상위 카드에 하위 인원 합산) / "선택 조직 구성원만 표시"(직속 인원).',
    '상태(신설 add_yn·변경 chg_yn·폐지 dscd_yn)는 조직개편(RD003) 반영 시. 기본 조직트리(ORM0010)엔 미포함 — 조직개편 연계 시 색상 표시.',
    '대기발령 조직(scr_ognz_no=WHNN000000 류)은 화면 표시 제외(기획서).',
    'TO-BE 기획서 v1.51 §02 가 화면 규격 정본 — 가로/세로 배열·엑셀 다운로드·조직인원 정렬 3종·조직장 지정=조직장관리(RD005) 메뉴 이동·엠프티 스테이트.',
    '데이터 노선: 우리 Oracle H5 envelope(ORM0010_00_R01). saaswin/h5on PostgreSQL(hpr_ognz_*)은 참조 전용 — 직접 호출 안 함.',
    '오브젝트명 = AS-IS 조직도 오브젝트 ORM0002(ORM0002_00_R01 "조직도 조직조회"). 트리는 ORM0010_00_R01, 인원은 ORM0040_01_R01 서비스 사용. h5on "RD002" 는 우리 오브젝트 아님(폐기).',
    '메뉴 연결: 라우트 name=ORM0002. h5on 하드코딩 메뉴 항목(key h5on:RD002)에 route:"ORM0002" 부여 → MainLayout.onClick3depth 가 child.route 로 연결.',
  ],

  tables: [
    { name: 'VI_FRM_ORM_ORG', label: '조직 뷰 (기준일 시점 조직 — 조직트리 출처)', columns: [
      { col: 'ORG_ID', type: 'NUMBER/VARCHAR2', nn: true, key: 'PK(노드)', desc: '조직 ID — Vue Flow 노드 id' },
      { col: 'SUPER_ORG_ID', type: '동일', nn: false, key: '트리 부모', desc: '상위 조직 ID → ORG_ID (엣지 source)' },
      { col: 'ORG_NM (=TITLE)', type: 'VARCHAR2', nn: true, key: '', desc: '조직명 (노드 라벨)' },
      { col: 'ORG_CD (=SEARCH_CD)', type: 'VARCHAR2', nn: false, key: '', desc: '조직코드 (노드 서브텍스트)' },
      { col: 'ORG_SORT (=SORT_SEQ)', type: 'NUMBER', nn: false, key: '', desc: '형제 정렬순서' },
      { col: 'COMPANY_CD', type: 'VARCHAR2', nn: true, key: '', desc: '회사코드 (테넌트 스코프)' },
      { col: 'STA_YMD / END_YMD', type: 'VARCHAR2(8)', nn: false, key: '', desc: '유효기간 (기준일 BETWEEN 필터)' },
      { col: 'REG_ORG_YN', type: 'CHAR(1)', nn: false, key: '', desc: '등록조직 여부 (reg_org_yn 필터)' },
      { col: 'ORG_LINE', type: 'VARCHAR2', nn: false, key: '', desc: '조직 경로(LL) — F_FRM_ORM_ORG_NM 하위 가지 LIKE 필터' },
    ]},
    { name: '(후속) 조직원 ORM0040', label: '조직별 구성원/인원수 (미배선)', columns: [
      { col: 'USER_NO', type: 'VARCHAR2', nn: true, key: '', desc: '구성원 사용자' },
      { col: 'KORN_FLNM', type: 'VARCHAR2', nn: false, key: '', desc: '이름' },
      { col: 'JBTTL_NM / JBPS_NM / JBGD_NM', type: 'VARCHAR2', nn: false, key: '', desc: '직책 / 직위 / 직급' },
      { col: 'ORG_LDR (조직장)', type: '—', nn: false, key: '', desc: '조직장 여부 (별도 표시)' },
    ]},
  ],
};
