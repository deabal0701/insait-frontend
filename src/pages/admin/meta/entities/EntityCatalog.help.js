/**
 * EntityCatalog.help.js — IST0020 엔터티관리 화면 도움말 (실행 SQL + 조건 + 업무주의 + 컬럼정보).
 * ★ [DEV-HELP] (2026-06-09, dspark): 임시 개발 편의용. 출처(SSOT) = EntityRepository.java (수동 동기화).
 *   컬럼정보 출처 = 01-asis/database/extracts/columns.csv + constraints.csv 실측.
 */
export default {
  object: 'IST0020',
  title: '엔터티관리',
  table: 'FRM_ENTITY (엔터티) + FRM_ENTITY_COLUMN (컬럼) + FRM_ENTITY_COLUMN_MAPPING (DB 매핑)',
  asOf: '2026-06-09',

  operations: [
    {
      key: 'list', label: '목록 조회 (검색·필터)',
      sql:
`SELECT e.ENTITY_ID, e.ENTITY_NM, e.DISPLAY_NM, e.HISTORY_TYPE_CD,
       e.LOG_YN, e.UNIT_CD, e.CREATOR_CD, e.NOTE,
       (SELECT COUNT(*) FROM FRM_ENTITY_COLUMN c WHERE c.ENTITY_ID = e.ENTITY_ID) AS COLUMN_COUNT
  FROM FRM_ENTITY e
 ORDER BY e.ENTITY_NM ASC, e.ENTITY_ID ASC;

-- 총 건수:
SELECT COUNT(*) FROM FRM_ENTITY e;`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND UPPER(e.ENTITY_NM) LIKE UPPER('입력값%') — 엔터티명 앞부분" },
        { name: 'historyTypeCd', effect: "선택 시 AND e.HISTORY_TYPE_CD = :historyTypeCd — 이력 관리 방식" },
        { name: 'logYn', effect: "선택 시 AND e.LOG_YN = :logYn — 변경 로그 Y/N" },
        { name: 'unitCd', effect: "선택 시 AND e.UNIT_CD = :unitCd — 업무 단위" },
        { name: '정렬(sort)', effect: 'entity_nm / display_nm / history_type_cd / log_yn / unit_cd + asc|desc. 기본 ENTITY_NM ASC' },
        { name: 'COLUMN_COUNT', effect: '컬럼 수 서브쿼리 동반 계산(N+1 회피)' },
      ],
    },
    {
      key: 'detail-def', label: '상세조회 ① 엔터티 정의 (행 클릭)',
      sql:
`SELECT e.ENTITY_ID, e.ENTITY_NM, e.DISPLAY_NM, e.HISTORY_TYPE_CD,
       e.LOG_YN, e.UNIT_CD, e.CREATOR_CD, e.NOTE, ...COLUMN_COUNT
  FROM FRM_ENTITY e
 WHERE e.ENTITY_NM = 'HR_EMP';`,
      conditions: [
        { name: 'ENTITY_NM', effect: '행의 엔터티명(업무키). 이 1건으로 ENTITY_ID 를 얻어 컬럼/매핑 조회' },
      ],
    },
    {
      key: 'detail-columns', label: '상세조회 ② 컬럼 (자식 마스터)',
      sql:
`SELECT COLUMN_ID, ENTITY_ID, COLUMN_NM, DISPLAY_NM, KEY_YN,
       USE_AUTO_INSERT_YN, USE_AUTO_UPDATE_YN, AUTO_INSERT_VALUE, AUTO_UPDATE_VALUE,
       START_DATE_COL_YN, END_DATE_COL_YN, HK_YN
  FROM FRM_ENTITY_COLUMN
 WHERE ENTITY_ID = 1024
 ORDER BY COLUMN_ID;`,
      conditions: [
        { name: 'ENTITY_ID', effect: '①정의에서 얻은 ENTITY_ID' },
        { name: 'KEY_YN', effect: 'Y = 키 컬럼(저장 시 UPDATE/INSERT 판별 기준)' },
        { name: 'USE_AUTO_INSERT/UPDATE_YN', effect: '저장 시 AUTO_*_VALUE 식으로 자동 채움(감사컬럼: 작성자/시각 등)' },
      ],
    },
    {
      key: 'detail-mappings', label: '상세조회 ③ DB 매핑 (자식 디테일, expand=mappings)',
      sql:
`SELECT COLUMN_MAPPING_ID, COLUMN_ID, TARGET_OBJECT_NM,
       TARGET_OBJECT_TYPE_CD, TARGET_COLUMN_NM
  FROM FRM_ENTITY_COLUMN_MAPPING
 WHERE COLUMN_ID IN (5001, 5002, 5003);`,
      conditions: [
        { name: 'COLUMN_ID IN', effect: '②컬럼들의 COLUMN_ID 집합. 각 논리 컬럼이 실제 어느 DB 테이블/컬럼(TARGET_OBJECT_NM.TARGET_COLUMN_NM)에 저장되는지. 1컬럼 → N매핑 가능' },
      ],
    },
    {
      key: 'detail-services', label: '상세조회 ④ 사용 서비스 (역방향, expand=services)',
      sql:
`SELECT s.SV_DEF_ID, s.SV_DEF_NM, s.CMD_CLASS_NM, m.SEQ_ORDER
  FROM FRM_SERVICE_FUNC_MAP m
  JOIN FRM_SERVICE_DEF s ON s.SV_DEF_ID = m.SV_DEF_ID
 WHERE m.SV_MAP_TYPE_CD = 'entity' AND m.FUNC_NM = 'HR_EMP'
 ORDER BY s.SV_DEF_NM;`,
      conditions: [
        { name: "FUNC_NM = :nm, type='entity'", effect: '이 엔터티를 저장 대상으로 쓰는 MultiSave 서비스들 (삭제 전 영향도 확인)' },
      ],
    },
    {
      key: 'create', label: '신규 (INSERT — 엔터티 → 컬럼 → 매핑, 단일 트랜잭션)',
      sql:
`-- ① 중복 검사 + ② 채번
SELECT COUNT(*) FROM FRM_ENTITY WHERE ENTITY_NM = 'TST_ENT';
SELECT S_FRM_SEQUENCE.NEXTVAL FROM DUAL;   -- 예: 1024
-- ③ 엔터티
INSERT INTO FRM_ENTITY
  (ENTITY_ID, ENTITY_NM, DISPLAY_NM, HISTORY_TYPE_CD, LOG_YN, NOTE,
   UNIT_CD, CREATOR_CD, MOD_USER_ID, MOD_DATE)
VALUES
  (1024, 'TST_ENT', '테스트 엔터티', 'NONE', 'N', NULL,
   'COMMON', 'HR', 665773, SYSDATE);
-- ④ 컬럼 (rowStatus='I' 행마다) — 반환된 COLUMN_ID 로 매핑 연결
INSERT INTO FRM_ENTITY_COLUMN
  (COLUMN_ID, ENTITY_ID, COLUMN_NM, DISPLAY_NM, KEY_YN, USE_AUTO_INSERT_YN,
   USE_AUTO_UPDATE_YN, START_DATE_COL_YN, END_DATE_COL_YN, HK_YN,
   AUTO_INSERT_VALUE, AUTO_UPDATE_VALUE, CREATOR_CD, MOD_USER_ID, MOD_DATE)
VALUES
  (5001, 1024, 'EMP_ID', '사번', 'Y', 'N', 'N', 'N', 'N', 'N',
   NULL, NULL, 'HR', 665773, SYSDATE);
-- ⑤ 매핑 (해당 COLUMN_ID 에 rowStatus='I' 행마다)
INSERT INTO FRM_ENTITY_COLUMN_MAPPING
  (COLUMN_MAPPING_ID, COLUMN_ID, TARGET_OBJECT_NM, TARGET_OBJECT_TYPE_CD,
   TARGET_COLUMN_NM, CREATOR_CD, MOD_USER_ID, MOD_DATE)
VALUES
  (S_FRM_SEQUENCE.NEXTVAL, 5001, 'HR_EMP_TBL', 'TABLE', 'EMP_ID', 'HR', 665773, SYSDATE);`,
      conditions: [
        { name: 'ENTITY_ID / COLUMN_ID / COLUMN_MAPPING_ID', effect: 'S_FRM_SEQUENCE.NEXTVAL 채번. 컬럼 INSERT 가 발급한 COLUMN_ID 로 매핑을 연결' },
        { name: 'CREATOR_CD', effect: '엔터티 def.creatorCd 를 컬럼·매핑에 전파' },
        { name: 'MOD_USER_ID / MOD_DATE', effect: 'JWT uid + SYSDATE (3테이블 모두 NOT NULL)' },
      ],
    },
    {
      key: 'update', label: '수정 (UPDATE — ENTITY_NM/CREATOR_CD 보존, 자식 I/U/D)',
      sql:
`-- 엔터티 (ENTITY_NM·CREATOR_CD 보존)
UPDATE FRM_ENTITY
   SET DISPLAY_NM = '테스트 엔터티(수정)', HISTORY_TYPE_CD = 'NONE', LOG_YN = 'N',
       NOTE = NULL, UNIT_CD = 'COMMON', MOD_USER_ID = 665773, MOD_DATE = SYSDATE
 WHERE ENTITY_ID = 1024;

-- 컬럼/매핑 자식: rowStatus 별
--  'U' → UPDATE FRM_ENTITY_COLUMN SET ... WHERE COLUMN_ID = :id
--  'I' → 위 ④/⑤ INSERT
--  'D' → DELETE (매핑 먼저 DELETE ... WHERE COLUMN_ID = :id → 컬럼 DELETE)`,
      conditions: [
        { name: 'ENTITY_NM(업무키) / CREATOR_CD', effect: '수정 대상 아님(보존)' },
        { name: '자식 rowStatus', effect: '컬럼·매핑 각각 I/U/D. 컬럼 삭제 시 그 컬럼의 매핑도 함께 삭제' },
      ],
    },
    {
      key: 'delete', label: '삭제 (DELETE — 매핑 → 컬럼 → 엔터티)',
      sql:
`-- 컬럼별 매핑 삭제 → 컬럼 삭제 → 엔터티 삭제 (단일 트랜잭션)
DELETE FROM FRM_ENTITY_COLUMN_MAPPING WHERE COLUMN_ID = 5001;   -- 컬럼마다
DELETE FROM FRM_ENTITY_COLUMN         WHERE ENTITY_ID = 1024;
DELETE FROM FRM_ENTITY                WHERE ENTITY_ID = 1024;`,
      conditions: [
        { name: 'ENTITY_ID / COLUMN_ID', effect: '3계층을 매핑 → 컬럼 → 엔터티 순으로 삭제. 사용 서비스 ④ 확인 권장' },
      ],
    },
  ],

  businessNotes: [
    'IST0020 엔터티관리 = MultiSave(저장) Command 의 저장 대상 메타. 3계층 — 엔터티(FRM_ENTITY) → 컬럼(FRM_ENTITY_COLUMN) → DB 매핑(FRM_ENTITY_COLUMN_MAPPING).',
    'ENTITY_NM 은 업무키(수정 불가). 서비스 함수매핑 type=entity 의 func_nm 이 이 엔터티명을 참조한다.',
    '컬럼의 KEY_YN=Y 는 키 컬럼(저장 시 INSERT/UPDATE 판별). USE_AUTO_INSERT/UPDATE_YN + AUTO_*_VALUE 는 감사컬럼 자동 채움. START/END_DATE_COL_YN·HK_YN 은 이력(history) 처리용.',
    '매핑은 논리 컬럼 1개를 실제 DB 테이블/컬럼(TARGET_OBJECT_NM.TARGET_COLUMN_NM)에 연결한다. 한 컬럼이 여러 DB 컬럼에 매핑될 수 있다(1:N).',
    'HISTORY_TYPE_CD = 이력 관리 방식. CREATOR_CD 는 엔터티에서 컬럼·매핑으로 전파된다.',
    '엔터티 편집 시 캐시 evict 대상 = DBModelPool + BusinessEntityProvider (서비스/메시지와 달리 엔터티는 풀에 적재되므로 evict 필요).',
  ],

  tables: [
    { name: 'FRM_ENTITY', label: '엔터티 (부모)', columns: [
      { col: 'ENTITY_ID',       type: 'NUMBER',        nn: true,  key: 'PK',      desc: '엔터티 ID (시퀀스)' },
      { col: 'ENTITY_NM',       type: 'VARCHAR2(60)',  nn: true,  key: 'UK(논리)', desc: '엔터티명 = 업무키' },
      { col: 'DISPLAY_NM',      type: 'VARCHAR2(300)', nn: true,  key: '',        desc: '표시명 (한글)' },
      { col: 'HISTORY_TYPE_CD', type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '이력 관리 방식' },
      { col: 'LOG_YN',          type: 'CHAR(1)',       nn: false, key: '',        desc: '변경 로그 Y/N' },
      { col: 'NOTE',            type: 'VARCHAR2(750)', nn: false, key: '',        desc: '비고' },
      { col: 'UNIT_CD',         type: 'VARCHAR2(50)',  nn: true,  key: '',        desc: '업무 단위 코드' },
      { col: 'CREATOR_CD',      type: 'VARCHAR2(50)',  nn: true,  key: '',        desc: '생성자 코드 (컬럼·매핑에 전파, 보존)' },
      { col: 'MOD_USER_ID',     type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID (JWT uid)' },
      { col: 'MOD_DATE',        type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시 (SYSDATE)' },
    ]},
    { name: 'FRM_ENTITY_COLUMN', label: '컬럼 (자식 마스터)', columns: [
      { col: 'COLUMN_ID',          type: 'NUMBER',         nn: true,  key: 'PK',      desc: '컬럼 ID (시퀀스)' },
      { col: 'ENTITY_ID',          type: 'NUMBER',         nn: true,  key: 'FK(논리)', desc: '부모 엔터티 ID' },
      { col: 'COLUMN_NM',          type: 'VARCHAR2(60)',   nn: true,  key: '',        desc: '논리 컬럼명' },
      { col: 'DISPLAY_NM',         type: 'VARCHAR2(750)',  nn: true,  key: '',        desc: '표시명' },
      { col: 'KEY_YN',             type: 'CHAR(1)',        nn: false, key: '',        desc: '키 컬럼 여부 Y/N' },
      { col: 'USE_AUTO_INSERT_YN', type: 'CHAR(1)',        nn: false, key: '',        desc: 'INSERT 시 자동값 사용 Y/N' },
      { col: 'USE_AUTO_UPDATE_YN', type: 'CHAR(1)',        nn: false, key: '',        desc: 'UPDATE 시 자동값 사용 Y/N' },
      { col: 'START_DATE_COL_YN',  type: 'CHAR(1)',        nn: false, key: '',        desc: '이력 시작일 컬럼 여부' },
      { col: 'END_DATE_COL_YN',    type: 'CHAR(1)',        nn: false, key: '',        desc: '이력 종료일 컬럼 여부' },
      { col: 'HK_YN',              type: 'CHAR(1)',        nn: false, key: '',        desc: '이력 키(history key) 여부' },
      { col: 'AUTO_INSERT_VALUE',  type: 'VARCHAR2(1500)', nn: false, key: '',        desc: 'INSERT 자동값 식' },
      { col: 'AUTO_UPDATE_VALUE',  type: 'VARCHAR2(1500)', nn: false, key: '',        desc: 'UPDATE 자동값 식' },
      { col: 'CREATOR_CD',         type: 'VARCHAR2(50)',   nn: true,  key: '',        desc: '생성자 코드 (엔터티에서 전파)' },
      { col: 'MOD_USER_ID',        type: 'NUMBER',         nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',           type: 'DATE',           nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
    { name: 'FRM_ENTITY_COLUMN_MAPPING', label: 'DB 매핑 (자식 디테일)', columns: [
      { col: 'COLUMN_MAPPING_ID',    type: 'NUMBER',        nn: true,  key: 'PK',      desc: '매핑 ID (시퀀스)' },
      { col: 'COLUMN_ID',            type: 'NUMBER',        nn: true,  key: 'FK(논리)', desc: '부모 컬럼 ID' },
      { col: 'TARGET_OBJECT_NM',     type: 'VARCHAR2(60)',  nn: false, key: '',        desc: '대상 DB 테이블/객체명' },
      { col: 'TARGET_OBJECT_TYPE_CD',type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '대상 객체 유형 (TABLE 등)' },
      { col: 'TARGET_COLUMN_NM',     type: 'VARCHAR2(60)',  nn: false, key: '',        desc: '대상 DB 컬럼명' },
      { col: 'CREATOR_CD',           type: 'VARCHAR2(50)',  nn: true,  key: '',        desc: '생성자 코드 (전파)' },
      { col: 'MOD_USER_ID',          type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',             type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
  ],
};
