/**
 * MessageCatalog.help.js — IST0030 메시지관리 화면 도움말 (실행 SQL + 조건 + 업무주의 + 컬럼정보).
 * ★ [DEV-HELP] (2026-06-09, dspark): 임시 개발 편의용. 출처(SSOT) = MsgDefRepository.java (수동 동기화).
 *   컬럼정보 출처 = 01-asis/database/extracts/columns.csv + constraints.csv 실측.
 */
export default {
  object: 'IST0030',
  title: '메시지관리',
  table: 'FRM_MSG_DEF (메시지 정의) + FRM_MSG_COL_DEF (컬럼 정의)',
  asOf: '2026-06-09',

  // ★ 꼭 알아야 할 / 암기 필요 (이슈·TO-BE)
  callouts: [
    { tone: 'danger', text: '<strong>USE_ENC_YN = 암호화 / USE_YN = 사용</strong> 이 DB 의 참된 의미다. AS-IS JSP 는 헤더↔바디 <strong>스왑 버그</strong>로 화면만 반전 표시했으나, 본 Vue 관리자는 참된 의미로 환원해 표시한다. (TO-BE 메타 SSOT 격상 시 운영데이터 일괄 정정 검토 대상)' },
    { tone: 'info', text: 'MSG_DEF_ID 는 업무키(<strong>MT_&lt;화면7자&gt;_NN</strong>, 수정 불가). TYPE_CD=<strong>TREE</strong> 는 PARENT_ID 자기참조 + CHILD/PARENT_COL_ID 로 트리 구성. 컬럼은 "SQL→컬럼 자동채움"(describe)으로 생성 가능.' },
  ],

  operations: [
    {
      key: 'list', label: '목록 조회 (검색·필터)',
      sql:
`SELECT m.MSG_DEF_OID, m.MSG_DEF_ID, m.MSG_DEF_NM, m.TYPE_CD, m.PARENT_ID,
       m.ALLOW_CHILD_YN, m.CHILD_COL_ID, m.PARENT_COL_ID, m.NOTE, m.VALIDATOR, m.MSG_CLASS_NM,
       (SELECT COUNT(*) FROM FRM_MSG_COL_DEF c WHERE c.MSG_DEF_OID = m.MSG_DEF_OID) AS COLUMN_COUNT
  FROM FRM_MSG_DEF m
 ORDER BY m.MSG_DEF_ID ASC, m.MSG_DEF_OID ASC;

-- 총 건수:
SELECT COUNT(*) FROM FRM_MSG_DEF m;`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND (UPPER(MSG_DEF_ID) LIKE UPPER('입력값%') OR UPPER(MSG_DEF_NM) LIKE UPPER('%입력값%')) — 메시지ID 앞부분 또는 한글명 부분일치" },
        { name: 'typeCd', effect: "선택 시 AND m.TYPE_CD = :typeCd — DEFAULT / TREE" },
        { name: 'allowChildYn', effect: "선택 시 AND m.ALLOW_CHILD_YN = :allowChildYn" },
        { name: 'hasParent', effect: "Y → AND PARENT_ID IS NOT NULL / N → AND PARENT_ID IS NULL (자식메시지 여부)" },
        { name: '정렬(sort)', effect: 'msg_def_id / msg_def_nm / type_cd / allow_child_yn / mod_date + asc|desc. 기본 MSG_DEF_ID ASC' },
        { name: 'COLUMN_COUNT', effect: '컬럼 수는 서브쿼리로 함께 계산(N+1 회피)' },
      ],
    },
    {
      key: 'detail-def', label: '상세조회 ① 메시지 정의 (행 클릭)',
      sql:
`SELECT m.MSG_DEF_OID, m.MSG_DEF_ID, m.MSG_DEF_NM, m.TYPE_CD, m.PARENT_ID,
       m.ALLOW_CHILD_YN, m.CHILD_COL_ID, m.PARENT_COL_ID, m.NOTE, m.VALIDATOR, m.MSG_CLASS_NM,
       (SELECT COUNT(*) FROM FRM_MSG_COL_DEF c WHERE c.MSG_DEF_OID = m.MSG_DEF_OID) AS COLUMN_COUNT
  FROM FRM_MSG_DEF m
 WHERE m.MSG_DEF_ID = 'MT_TST0002_01';`,
      conditions: [
        { name: 'MSG_DEF_ID', effect: '행의 메시지ID(업무키). 이 1건으로 MSG_DEF_OID 를 얻어 컬럼/자식 조회' },
      ],
    },
    {
      key: 'detail-columns', label: '상세조회 ② 컬럼 정의 (자식)',
      sql:
`SELECT MSG_COL_DEF_OID, MSG_DEF_OID, MSG_COL_DEF_ID, ORDER_SEQ, TYPE_CD,
       LABEL_CD, MIN_LENGTH, MAX_LENGTH, MANDATORY_YN, USE_ENC_YN, USE_YN, FORMAT_TEXT
  FROM FRM_MSG_COL_DEF
 WHERE MSG_DEF_OID = 30021
 ORDER BY ORDER_SEQ, MSG_COL_DEF_OID;`,
      conditions: [
        { name: 'MSG_DEF_OID', effect: '①정의에서 얻은 OID' },
        { name: 'USE_ENC_YN / USE_YN', effect: 'DB 참된 의미 = USE_ENC_YN=암호화 / USE_YN=사용 (업무주의 참조)' },
      ],
    },
    {
      key: 'detail-children', label: '상세조회 ③ 하위 메시지 (자기참조, expand=children)',
      sql:
`SELECT m.MSG_DEF_OID, m.MSG_DEF_ID, m.MSG_DEF_NM, m.TYPE_CD, m.PARENT_ID, ...
  FROM FRM_MSG_DEF m
 WHERE m.PARENT_ID = 'MT_TST0002_01'
 ORDER BY m.MSG_DEF_ID;`,
      conditions: [
        { name: 'PARENT_ID', effect: '이 메시지의 MSG_DEF_ID. TYPE_CD=TREE 일 때 자식 메시지 구성' },
      ],
    },
    {
      key: 'detail-services', label: '상세조회 ④ 사용 서비스 (역방향, expand=services)',
      sql:
`SELECT s.SV_DEF_ID, s.SV_DEF_NM, s.CMD_CLASS_NM, 'ATTR_VALUE_TYPE' AS usage
  FROM FRM_SERVICE_ATTR a JOIN FRM_SERVICE_DEF s ON s.SV_DEF_ID = a.SV_DEF_ID
 WHERE a.VALUE_TYPE = 'MT_TST0002_01'
 UNION ALL
 SELECT s.SV_DEF_ID, s.SV_DEF_NM, s.CMD_CLASS_NM, 'FUNC_REQ'
  FROM FRM_SERVICE_FUNC_MAP m JOIN FRM_SERVICE_DEF s ON s.SV_DEF_ID = m.SV_DEF_ID
 WHERE m.REQ_MSG_NM = 'MT_TST0002_01'
 UNION ALL
 SELECT s.SV_DEF_ID, s.SV_DEF_NM, s.CMD_CLASS_NM, 'FUNC_RES'
  FROM FRM_SERVICE_FUNC_MAP m JOIN FRM_SERVICE_DEF s ON s.SV_DEF_ID = m.SV_DEF_ID
 WHERE m.RES_MSG_NM = 'MT_TST0002_01'
 ORDER BY 2, 4;`,
      conditions: [
        { name: ':nm (MSG_DEF_ID)', effect: '이 메시지를 쓰는 서비스 = 속성 VALUE_TYPE + 함수매핑 REQ/RES 3경로 UNION (삭제 전 영향도 파악)' },
      ],
    },
    {
      key: 'create', label: '신규 (INSERT — 채번 → 정의 → 컬럼, 단일 트랜잭션)',
      sql:
`-- ① 중복 검사
SELECT COUNT(*) FROM FRM_MSG_DEF WHERE MSG_DEF_ID = 'MT_TST0009_01';
-- ② 채번
SELECT S_FRM_SEQUENCE.NEXTVAL FROM DUAL;   -- 예: 30021
-- ③ 메시지 정의
INSERT INTO FRM_MSG_DEF
  (MSG_DEF_OID, MSG_DEF_ID, MSG_DEF_NM, PARENT_ID, ALLOW_CHILD_YN,
   TYPE_CD, CHILD_COL_ID, PARENT_COL_ID, NOTE, VALIDATOR, MSG_CLASS_NM, MOD_USER_ID, MOD_DATE)
VALUES
  (30021, 'MT_TST0009_01', '테스트 메시지', NULL, 'N',
   'DEFAULT', NULL, NULL, NULL, NULL, NULL, 665773, SYSDATE);
-- ④ 컬럼 (rowStatus='I' 행마다) — SQL→컬럼 자동채움(#3)으로 채울 수도 있음
INSERT INTO FRM_MSG_COL_DEF
  (MSG_COL_DEF_OID, MSG_DEF_OID, MSG_COL_DEF_ID, ORDER_SEQ, TYPE_CD, LABEL_CD,
   FORMAT_TEXT, MIN_LENGTH, MAX_LENGTH, MANDATORY_YN, USE_ENC_YN, USE_YN, MOD_USER_ID, MOD_DATE)
VALUES
  (S_FRM_SEQUENCE.NEXTVAL, 30021, 'emp_id', 1, 'string', '사번',
   NULL, NULL, 20, 'N', 'N', 'Y', 665773, SYSDATE);`,
      conditions: [
        { name: 'MSG_DEF_OID / MSG_COL_DEF_OID', effect: 'S_FRM_SEQUENCE.NEXTVAL 채번' },
        { name: 'MOD_USER_ID / MOD_DATE', effect: 'JWT uid + SYSDATE (NOT NULL)' },
        { name: 'SQL→컬럼 자동채움(#3)', effect: 'GET /queries/{name}/columns 로 등록 SQL 을 describe(비실행) → 컬럼 자동 생성 가능' },
      ],
    },
    {
      key: 'update', label: '수정 (UPDATE — MSG_DEF_ID 보존, 컬럼 I/U/D)',
      sql:
`-- 정의 (MSG_DEF_ID 업무키는 변경 안 함). VALIDATOR/MSG_CLASS_NM 편집 가능(#4)
UPDATE FRM_MSG_DEF
   SET MSG_DEF_NM = '테스트 메시지(수정)', PARENT_ID = NULL, ALLOW_CHILD_YN = 'N',
       TYPE_CD = 'DEFAULT', CHILD_COL_ID = NULL, PARENT_COL_ID = NULL, NOTE = NULL,
       VALIDATOR = NULL, MSG_CLASS_NM = NULL, MOD_USER_ID = 665773, MOD_DATE = SYSDATE
 WHERE MSG_DEF_OID = 30021;

-- 컬럼 자식: rowStatus 별 (FORMAT_TEXT 편집 가능 #5)
--  'U' → UPDATE FRM_MSG_COL_DEF SET ... WHERE MSG_COL_DEF_OID = :oid
--  'I' → 위 ④ 와 동일 INSERT
--  'D' → DELETE FROM FRM_MSG_COL_DEF WHERE MSG_COL_DEF_OID = :oid`,
      conditions: [
        { name: 'MSG_DEF_ID(업무키)', effect: '수정 대상 아님(보존)' },
        { name: '자식 rowStatus', effect: 'I=INSERT / U=UPDATE / D=DELETE (컬럼). 컬럼 NOTE 는 보존(미변경)' },
      ],
    },
    {
      key: 'delete', label: '삭제 (DELETE — 컬럼 → 정의)',
      sql:
`DELETE FROM FRM_MSG_COL_DEF WHERE MSG_DEF_OID = 30021;
DELETE FROM FRM_MSG_DEF     WHERE MSG_DEF_OID = 30021;`,
      conditions: [
        { name: 'MSG_DEF_OID', effect: '컬럼 자식 먼저 삭제 후 정의 삭제. 단일 트랜잭션 (사용 서비스 ④ 확인 권장)' },
      ],
    },
  ],

  businessNotes: [
    'IST0030 메시지관리 = envelope 메시지 타입(MT_*) 정의 + 컬럼 정의. 정의(FRM_MSG_DEF) + 컬럼(FRM_MSG_COL_DEF) 2테이블.',
    'MSG_DEF_ID 는 업무키 (MT_<화면7자>_NN). 수정 불가. 서비스 속성 VALUE_TYPE / 함수매핑 REQ·RES 가 이 ID 를 참조한다.',
    'TYPE_CD = DEFAULT / TREE. TREE 는 자기참조(PARENT_ID) + CHILD_COL_ID/PARENT_COL_ID 로 트리 메시지를 구성한다.',
    '★ use_yn / use_enc_yn 의미 = DB 기준 USE_ENC_YN(암호화) / USE_YN(사용). AS-IS JSP 는 화면 헤더↔바디 스왑 버그로 반전 표시되나, 본 Vue 관리자는 DB 참된 의미로 환원해 표시한다.',
    '메시지 정의·컬럼은 Waffle 풀 evict 대상이 아니다(메시지 pool 없음 → DB 직접, 편집 즉시 반영).',
    '신규/수정 시 컬럼은 "SQL→컬럼 자동채움"(등록 SQL 을 describe 해 컬럼 생성)으로 채울 수 있다. Waffle 런타임 데코레이터(BIZ/ORG_AUTH)·매크로가 걸린 SQL 은 미지원 → 수동 입력.',
  ],

  tables: [
    { name: 'FRM_MSG_DEF', label: '메시지 정의 (부모)', columns: [
      { col: 'MSG_DEF_OID',   type: 'NUMBER',         nn: true,  key: 'PK',      desc: '메시지 정의 OID (시퀀스, 내부키)' },
      { col: 'MSG_DEF_ID',    type: 'VARCHAR2(80)',   nn: true,  key: 'UK(논리)', desc: '메시지 ID = 업무키 (MT_*)' },
      { col: 'MSG_DEF_NM',    type: 'VARCHAR2(150)',  nn: true,  key: '',        desc: '메시지명 (한글)' },
      { col: 'PARENT_ID',     type: 'VARCHAR2(80)',   nn: false, key: '',        desc: '상위 MSG_DEF_ID (TREE 자기참조)' },
      { col: 'ALLOW_CHILD_YN',type: 'CHAR(1)',        nn: false, key: '',        desc: '자식 허용 Y/N' },
      { col: 'TYPE_CD',       type: 'VARCHAR2(50)',   nn: false, key: '',        desc: '유형 (DEFAULT / TREE)' },
      { col: 'CHILD_COL_ID',  type: 'VARCHAR2(80)',   nn: false, key: '',        desc: 'TREE 자식 컬럼 ID' },
      { col: 'PARENT_COL_ID', type: 'VARCHAR2(80)',   nn: false, key: '',        desc: 'TREE 부모 컬럼 ID' },
      { col: 'NOTE',          type: 'VARCHAR2(1500)', nn: false, key: '',        desc: '비고' },
      { col: 'MOD_USER_ID',   type: 'NUMBER',         nn: true,  key: '',        desc: '최종 수정자 ID (JWT uid)' },
      { col: 'MOD_DATE',      type: 'DATE',           nn: true,  key: '',        desc: '최종 수정일시 (SYSDATE)' },
      { col: 'VALIDATOR',     type: 'VARCHAR2(750)',  nn: false, key: '',        desc: '검증기 (편집 가능 #4)' },
      { col: 'MSG_CLASS_NM',  type: 'VARCHAR2(750)',  nn: false, key: '',        desc: '메시지 클래스 (편집 가능 #4)' },
    ]},
    { name: 'FRM_MSG_COL_DEF', label: '컬럼 정의 (자식)', columns: [
      { col: 'MSG_COL_DEF_OID', type: 'NUMBER',        nn: true,  key: 'PK',      desc: '컬럼 정의 OID (시퀀스)' },
      { col: 'MSG_DEF_OID',     type: 'NUMBER',        nn: true,  key: 'FK(논리)', desc: '부모 메시지 OID' },
      { col: 'MSG_COL_DEF_ID',  type: 'VARCHAR2(80)',  nn: true,  key: '',        desc: '컬럼 ID (필드명)' },
      { col: 'ORDER_SEQ',       type: 'NUMBER',        nn: true,  key: '',        desc: '정렬 순서' },
      { col: 'TYPE_CD',         type: 'VARCHAR2(50)',  nn: true,  key: '',        desc: '데이터 타입 (string/numeric/date/clob)' },
      { col: 'LABEL_CD',        type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '라벨(한글명)' },
      { col: 'FORMAT_TEXT',     type: 'VARCHAR2(80)',  nn: false, key: '',        desc: '포맷 (편집 가능 #5)' },
      { col: 'MIN_LENGTH',      type: 'NUMBER',        nn: false, key: '',        desc: '최소 길이' },
      { col: 'MAX_LENGTH',      type: 'NUMBER',        nn: false, key: '',        desc: '최대 길이' },
      { col: 'MANDATORY_YN',    type: 'CHAR(1)',       nn: false, key: '',        desc: '필수 여부 Y/N' },
      { col: 'USE_ENC_YN',      type: 'CHAR(1)',       nn: false, key: '',        desc: '암호화 여부 Y/N (DB 참된 의미)' },
      { col: 'USE_YN',          type: 'CHAR(1)',       nn: false, key: '',        desc: '사용 여부 Y/N (DB 참된 의미)' },
      { col: 'NOTE',            type: 'VARCHAR2(750)', nn: false, key: '',        desc: '비고 (편집 화면에선 보존)' },
      { col: 'MOD_USER_ID',     type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',        type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
  ],
};
