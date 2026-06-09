/**
 * ObjectCatalog.help.js — AUT0030 오브젝트관리 화면 도움말 (실행 SQL + 조건 + 업무주의 + 컬럼정보).
 * ★ [DEV-HELP] (2026-06-09, dspark): 임시 개발 편의용. 출처(SSOT) = ObjectRepository.java (수동 동기화).
 *   컬럼정보 출처 = 01-asis/database/extracts/columns.csv + constraints.csv 실측.
 */
export default {
  object: 'AUT0030',
  title: '오브젝트관리',
  table: 'FRM_EXECUTABLE_OBJECT (정의) + FRM_OBJECT_ATTRIBUTE (속성) + FRM_OBJECT_RELATION (자기참조 관계)',
  asOf: '2026-06-09',

  // ★ 꼭 알아야 할 / 암기 필요 (이슈·TO-BE)
  callouts: [
    { tone: 'warn', text: '실제 오브젝트 <strong>계층은 FRM_OBJECT_RELATION</strong>(PARENT_OBJ_ID/CHILD_OBJ_ID)으로 표현된다. 테이블의 <strong>PARENT_ID 컬럼은 거의 미사용</strong> — 계층 판단·검색에 쓰지 말 것.' },
    { tone: 'info', text: 'ELA(전자결재) 도메인은 이 OBJECT 의 속성(<strong>appl_cd 등 14건 인프라</strong>)이 등록돼야 dispatch 가 정상 동작 — IST0050 서비스관리의 ELA 인프라 진단과 연계.' },
  ],

  operations: [
    {
      key: 'list', label: '목록 조회 (검색·필터)',
      sql:
`SELECT OBJECT_ID, PARENT_ID, OBJECT_NM, OBJECT_DISPLAY_NM, OBJECT_LINK,
       OBJECT_TYPE, STATUS, COMPANY_CD, NOTE
  FROM FRM_EXECUTABLE_OBJECT
 ORDER BY OBJECT_NM ASC, OBJECT_ID ASC;

-- 총 건수:
SELECT COUNT(*) FROM FRM_EXECUTABLE_OBJECT;`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND (UPPER(OBJECT_NM) LIKE '%입력값%' OR UPPER(OBJECT_DISPLAY_NM) LIKE '%입력값%') — 오브젝트명 또는 화면표시명(한글) 부분일치 (AS-IS aut0030.jsp R01 정합)" },
        { name: 'objectType', effect: "선택 시 AND OBJECT_TYPE = :objectType — AS-IS 2종(view / elaform)" },
        { name: 'status', effect: "선택 시 AND STATUS = :status" },
        { name: 'companyCd', effect: '선택 시 AND COMPANY_CD = :companyCd (미지정 시 세션값)' },
        { name: '정렬(sort)', effect: 'object_nm / object_display_nm / object_type / status / company_cd + asc|desc (화이트리스트 외 400). 기본 OBJECT_NM ASC' },
      ],
      note: 'PARENT_ID 컬럼은 검색에 쓰지 않음 — 실 계층은 FRM_OBJECT_RELATION.',
    },
    {
      key: 'detail-def', label: '상세조회 ① 오브젝트 정의 (행 클릭)',
      sql:
`SELECT OBJECT_ID, PARENT_ID, OBJECT_NM, OBJECT_DISPLAY_NM, OBJECT_LINK,
       OBJECT_TYPE, STATUS, COMPANY_CD, NOTE
  FROM FRM_EXECUTABLE_OBJECT
 WHERE OBJECT_NM = 'CAM0002'
    OR (REGEXP_LIKE('CAM0002', '^[0-9]+$') AND OBJECT_ID = TO_NUMBER('CAM0002'));`,
      conditions: [
        { name: 'key', effect: '행의 OBJECT_NM(업무키). 숫자열이면 OBJECT_ID 로도 매칭. 이 1건으로 OBJECT_ID 를 얻어 자식 조회' },
      ],
    },
    {
      key: 'detail-attrs', label: '상세조회 ② 속성 (자식)',
      sql:
`SELECT ATTRIBUTE_ID, OBJECT_ID, ATTRIBUTE_TYPE_CD, ATTRIBUTE_NM, ATTRIBUTE_VALUE, NOTE
  FROM FRM_OBJECT_ATTRIBUTE
 WHERE OBJECT_ID = 12345
 ORDER BY ATTRIBUTE_ID;`,
      conditions: [
        { name: 'OBJECT_ID', effect: '①정의에서 얻은 OBJECT_ID' },
        { name: 'ATTRIBUTE_TYPE_CD / NM', effect: 'INIT_DATA·appl_cd 등 화면/ELA 인프라 속성. ELA dispatch 에 필요한 appl_cd 등이 여기 저장' },
      ],
    },
    {
      key: 'detail-children', label: '상세조회 ③ 하위 관계 (자식, expand=children)',
      sql:
`SELECT r.OBJECT_REL_ID, r.REL_TYPE_CD, r.PARENT_OBJ_ID, r.CHILD_OBJ_ID,
       c.OBJECT_NM AS CHILD_OBJECT_NM, r.SEQ
  FROM FRM_OBJECT_RELATION r
  LEFT JOIN FRM_EXECUTABLE_OBJECT c ON c.OBJECT_ID = r.CHILD_OBJ_ID
 WHERE r.PARENT_OBJ_ID = 12345
 ORDER BY r.SEQ, r.OBJECT_REL_ID;`,
      conditions: [
        { name: 'PARENT_OBJ_ID', effect: '①정의 OBJECT_ID. 이 오브젝트가 부모인 관계(자식 오브젝트들). 실 오브젝트 계층 = 이 테이블' },
      ],
    },
    {
      key: 'create', label: '신규 (INSERT — 채번 → 정의 → 속성/관계, 단일 트랜잭션)',
      sql:
`-- ① 중복 검사
SELECT COUNT(*) FROM FRM_EXECUTABLE_OBJECT WHERE OBJECT_NM = 'TST0009';
-- ② 채번
SELECT S_FRM_SEQUENCE.NEXTVAL FROM DUAL;   -- 예: 12345
-- ③ 오브젝트 정의
INSERT INTO FRM_EXECUTABLE_OBJECT
  (OBJECT_ID, PARENT_ID, OBJECT_NM, COMPANY_CD, OBJECT_DISPLAY_NM,
   OBJECT_LINK, OBJECT_TYPE, STATUS, NOTE, MOD_DATE, MOD_USER_ID)
VALUES
  (12345, NULL, 'TST0009', '01', '테스트 화면',
   NULL, 'view', 'Y', NULL, SYSDATE, 665773);
-- ④ 속성 (rowStatus='I' 행마다)
INSERT INTO FRM_OBJECT_ATTRIBUTE
  (ATTRIBUTE_ID, OBJECT_ID, ATTRIBUTE_TYPE_CD, ATTRIBUTE_NM, ATTRIBUTE_VALUE, NOTE, MOD_USER_ID, MOD_DATE)
VALUES
  (S_FRM_SEQUENCE.NEXTVAL, 12345, 'INIT_DATA', 'appl_cd', 'CAM', NULL, 665773, SYSDATE);
-- ⑤ 관계 (rowStatus='I' 행마다 — 이 오브젝트가 부모)
INSERT INTO FRM_OBJECT_RELATION
  (OBJECT_REL_ID, REL_TYPE_CD, SEQ, PARENT_OBJ_ID, CHILD_OBJ_ID, MOD_USER_ID, MOD_DATE)
VALUES
  (S_FRM_SEQUENCE.NEXTVAL, 'child', 1, 12345, 23456, 665773, SYSDATE);`,
      conditions: [
        { name: 'OBJECT_ID / ATTRIBUTE_ID / OBJECT_REL_ID', effect: 'S_FRM_SEQUENCE.NEXTVAL 채번' },
        { name: 'COMPANY_CD', effect: '세션 회사코드 주입' },
        { name: 'MOD_USER_ID / MOD_DATE', effect: 'JWT uid + SYSDATE' },
        { name: '트랜잭션', effect: '정의+속성+관계 1개 @Transactional. 자식은 rowStatus="I" 행만 INSERT' },
      ],
    },
    {
      key: 'update', label: '수정 (UPDATE — OBJECT_NM/COMPANY_CD 보존, 자식 I/U/D)',
      sql:
`-- 정의 (OBJECT_NM·COMPANY_CD·HEIGHT/WIDTH/OBJ_AUTH 는 보존)
UPDATE FRM_EXECUTABLE_OBJECT
   SET PARENT_ID = NULL, OBJECT_DISPLAY_NM = '테스트 화면(수정)',
       OBJECT_LINK = NULL, OBJECT_TYPE = 'view', STATUS = 'Y', NOTE = NULL,
       MOD_DATE = SYSDATE, MOD_USER_ID = 665773
 WHERE OBJECT_ID = 12345;

-- 속성/관계 자식: rowStatus 별
--  'U' → UPDATE FRM_OBJECT_ATTRIBUTE SET ... WHERE ATTRIBUTE_ID = :id
--  'I' → 위 ④/⑤ 와 동일 INSERT
--  'D' → DELETE FROM FRM_OBJECT_ATTRIBUTE WHERE ATTRIBUTE_ID = :id`,
      conditions: [
        { name: 'OBJECT_NM(업무키)', effect: '수정 대상 아님(보존). COMPANY_CD·HEIGHT/WIDTH/OBJ_AUTH 도 보존' },
        { name: '자식 rowStatus', effect: 'I=INSERT / U=UPDATE / D=DELETE (속성·관계 각각)' },
      ],
    },
    {
      key: 'delete', label: '삭제 (DELETE — 관계·속성 → 정의)',
      sql:
`DELETE FROM FRM_OBJECT_RELATION  WHERE PARENT_OBJ_ID = 12345;
DELETE FROM FRM_OBJECT_ATTRIBUTE WHERE OBJECT_ID     = 12345;
DELETE FROM FRM_EXECUTABLE_OBJECT WHERE OBJECT_ID    = 12345;`,
      conditions: [
        { name: 'OBJECT_ID', effect: '관계(부모로서)·속성 자식을 먼저 지우고 정의 삭제. 단일 트랜잭션' },
      ],
    },
  ],

  businessNotes: [
    'AUT0030 오브젝트관리 = 화면·실행 단위(OBJECT) 메타. 정의(FRM_EXECUTABLE_OBJECT) + 속성(FRM_OBJECT_ATTRIBUTE) + 자기참조 관계(FRM_OBJECT_RELATION) 3테이블.',
    'OBJECT_NM 은 업무키(수정 불가). OBJECT_TYPE 은 AS-IS 운영상 2종(view / elaform).',
    'PARENT_ID 컬럼은 거의 미사용 — 실제 오브젝트 계층은 FRM_OBJECT_RELATION(PARENT_OBJ_ID/CHILD_OBJ_ID)으로 표현된다.',
    'ELA(전자결재) 도메인은 이 OBJECT 의 속성(appl_cd 등) "14건 인프라"가 등록돼야 dispatch 가 정상 동작 — IST0050 서비스관리의 ELA 인프라 진단과 연계된다.',
    'COMPANY_CD 는 세션값 주입. 오브젝트 정의는 Waffle 풀 evict 대상이 아니다(sub.jsp 매 진입 DB 룩업 → 즉시 반영).',
  ],

  tables: [
    { name: 'FRM_EXECUTABLE_OBJECT', label: '오브젝트 정의 (부모)', columns: [
      { col: 'OBJECT_ID',         type: 'NUMBER',         nn: true,  key: 'PK',      desc: '오브젝트 ID (시퀀스)' },
      { col: 'PARENT_ID',         type: 'NUMBER',         nn: false, key: '',        desc: '상위 ID (거의 미사용 — 실 계층은 RELATION)' },
      { col: 'OBJECT_NM',         type: 'VARCHAR2(300)',  nn: true,  key: 'UK(논리)', desc: '오브젝트명 = 업무키' },
      { col: 'COMPANY_CD',        type: 'VARCHAR2(50)',   nn: true,  key: '',        desc: '회사코드 (세션 주입)' },
      { col: 'OBJECT_DISPLAY_NM', type: 'VARCHAR2(300)',  nn: true,  key: '',        desc: '화면 표시명 (한글)' },
      { col: 'OBJECT_LINK',       type: 'VARCHAR2(750)',  nn: false, key: '',        desc: '화면 경로/링크' },
      { col: 'OBJECT_TYPE',       type: 'VARCHAR2(60)',   nn: false, key: '',        desc: '유형 (view / elaform)' },
      { col: 'STATUS',            type: 'VARCHAR2(10)',   nn: false, key: '',        desc: '상태' },
      { col: 'HEIGHT',            type: 'VARCHAR2(60)',   nn: false, key: '',        desc: '높이 (편집 시 보존)' },
      { col: 'WIDTH',             type: 'VARCHAR2(60)',   nn: false, key: '',        desc: '너비 (편집 시 보존)' },
      { col: 'NOTE',              type: 'VARCHAR2(750)',  nn: false, key: '',        desc: '비고' },
      { col: 'MOD_DATE',          type: 'DATE',           nn: true,  key: '',        desc: '최종 수정일시 (SYSDATE)' },
      { col: 'MOD_USER_ID',       type: 'NUMBER',         nn: true,  key: '',        desc: '최종 수정자 ID (JWT uid)' },
      { col: 'OBJ_AUTH',          type: 'VARCHAR2(150)',  nn: false, key: '',        desc: '오브젝트 권한 (편집 시 보존)' },
    ]},
    { name: 'FRM_OBJECT_ATTRIBUTE', label: '오브젝트 속성 (자식)', columns: [
      { col: 'ATTRIBUTE_ID',      type: 'NUMBER',         nn: true,  key: 'PK',      desc: '속성 ID (시퀀스)' },
      { col: 'OBJECT_ID',         type: 'NUMBER',         nn: true,  key: 'FK(논리)', desc: '부모 오브젝트 ID' },
      { col: 'ATTRIBUTE_TYPE_CD', type: 'VARCHAR2(50)',   nn: true,  key: '',        desc: '속성 유형 (INIT_DATA 등)' },
      { col: 'ATTRIBUTE_NM',      type: 'VARCHAR2(60)',   nn: true,  key: '',        desc: '속성명 (appl_cd, authStr 등)' },
      { col: 'ATTRIBUTE_VALUE',   type: 'VARCHAR2(3000)', nn: false, key: '',        desc: '속성값' },
      { col: 'NOTE',              type: 'VARCHAR2(750)',  nn: false, key: '',        desc: '비고' },
      { col: 'MOD_USER_ID',       type: 'NUMBER',         nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',          type: 'DATE',           nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
    { name: 'FRM_OBJECT_RELATION', label: '오브젝트 관계 (자식·자기참조)', columns: [
      { col: 'OBJECT_REL_ID',     type: 'NUMBER',         nn: true,  key: 'PK',      desc: '관계 ID (시퀀스)' },
      { col: 'REL_TYPE_CD',       type: 'VARCHAR2(50)',   nn: true,  key: '',        desc: '관계 유형' },
      { col: 'SEQ',               type: 'NUMBER',         nn: true,  key: '',        desc: '정렬 순서' },
      { col: 'PARENT_OBJ_ID',     type: 'NUMBER',         nn: true,  key: 'FK(논리)', desc: '부모 오브젝트 ID (= 이 화면 오브젝트)' },
      { col: 'CHILD_OBJ_ID',      type: 'NUMBER',         nn: true,  key: 'FK(논리)', desc: '자식 오브젝트 ID (연결 대상)' },
      { col: 'MOD_USER_ID',       type: 'NUMBER',         nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',          type: 'DATE',           nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
  ],
};
