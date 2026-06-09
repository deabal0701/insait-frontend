/**
 * QueryCatalog.help.js — IST0010 SQL관리 화면 도움말 (실행 SQL + 조건 + 업무주의 + 컬럼정보).
 * ★ [DEV-HELP] (2026-06-09, dspark): 임시 개발 편의용. 출처(SSOT) = QueryDefRepository.java (수동 동기화).
 *   컬럼정보 출처 = 01-asis/database/extracts/columns.csv + constraints.csv 실측.
 */
export default {
  object: 'IST0010',
  title: 'SQL관리',
  table: 'FRM_QUERY_DEF (정의) + FRM_QUERY_DEF_BODY (본문 CLOB) + FRM_QUERY_DEF_PARAM (파라미터)',
  asOf: '2026-06-09',

  // ★ 꼭 알아야 할 / 암기 필요 (이슈·TO-BE)
  callouts: [
    { tone: 'warn', text: '<strong>3중 동명 규칙</strong> — query_name = func_nm = sv_def_nm 이 일치해야 framework 자동 바인딩이 정상 동작(서비스관리 참조).' },
    { tone: 'warn', text: '<strong>BIZ_AUTH_YN / ORG_AUTH_YN / DECORATORS</strong>(Waffle 런타임 데코레이터·매크로)가 걸린 SQL 은 "SQL→컬럼 자동채움(describe)"을 <strong>지원하지 않는다</strong> → 그런 SQL 은 수동 입력해야 한다. 본문은 정의당 1행 정규화(저장 시 DELETE 후 재INSERT).' },
  ],

  operations: [
    {
      key: 'list', label: '목록 조회 (검색·필터)',
      sql:
`SELECT QUERY_DEF_ID, QUERY_NAME, DISPLAY_NAME, DATA_SOURCE, USE_YN, STATUS,
       VERSION, BIZ_AUTH_YN, ORG_AUTH_YN, DECORATORS, COMPANY_CD, NOTE, WORKSPACE_ID
  FROM FRM_QUERY_DEF
 ORDER BY QUERY_NAME ASC, QUERY_DEF_ID ASC;

-- 총 건수:
SELECT COUNT(*) FROM FRM_QUERY_DEF;`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND UPPER(QUERY_NAME) LIKE UPPER('입력값%') — SQL명 앞부분" },
        { name: 'dataSource', effect: "선택 시 AND DATA_SOURCE = :dataSource — 접속 데이터소스" },
        { name: 'useYn', effect: "선택 시 AND USE_YN = :useYn — 사용 Y/N" },
        { name: 'status', effect: "선택 시 AND STATUS = :status" },
        { name: 'bizAuthYn / orgAuthYn', effect: "선택 시 AND BIZ_AUTH_YN/ORG_AUTH_YN = :값 — 업무권한/조직권한 데코레이터 적용 여부" },
        { name: '정렬(sort)', effect: 'query_name / display_name / data_source / use_yn / status / version + asc|desc. 기본 QUERY_NAME ASC' },
      ],
    },
    {
      key: 'detail-def', label: '상세조회 ① SQL 정의 (행 클릭)',
      sql:
`SELECT QUERY_DEF_ID, QUERY_NAME, DISPLAY_NAME, DATA_SOURCE, USE_YN, STATUS,
       VERSION, BIZ_AUTH_YN, ORG_AUTH_YN, DECORATORS, COMPANY_CD, NOTE, WORKSPACE_ID
  FROM FRM_QUERY_DEF
 WHERE QUERY_NAME = 'TST0002_00_R01';`,
      conditions: [
        { name: 'QUERY_NAME', effect: '행의 SQL명(업무키). 이 1건으로 QUERY_DEF_ID 를 얻어 본문/파라미터 조회' },
      ],
    },
    {
      key: 'detail-body', label: '상세조회 ② 본문 SQL (CLOB, expand=body)',
      sql:
`SELECT QUERY_STRING
  FROM FRM_QUERY_DEF_BODY
 WHERE QUERY_DEF_ID = 88012
 ORDER BY CREATE_TIME DESC;   -- 최신 1건`,
      conditions: [
        { name: 'QUERY_DEF_ID', effect: '①정의에서 얻은 ID. 본문은 정의당 1행으로 정규화(보통 1행), 최신 1건 사용' },
        { name: 'QUERY_STRING', effect: '실제 실행되는 SQL 원문(CLOB). :name 바인드 변수를 포함' },
      ],
    },
    {
      key: 'detail-params', label: '상세조회 ③ 파라미터 (자식, expand=params)',
      sql:
`SELECT QUERY_PARAM_ID, QUERY_DEF_ID, QUERY_PARAM_NAME, QUERY_PARAM_SEQ,
       QUERY_PARAM_TYPE, QUERY_PARAM_INOUT_TYPE
  FROM FRM_QUERY_DEF_PARAM
 WHERE QUERY_DEF_ID = 88012
 ORDER BY QUERY_PARAM_SEQ;`,
      conditions: [
        { name: 'QUERY_DEF_ID', effect: '①정의 ID. 본문 SQL 의 바인드 변수(:name) 메타(타입·IN/OUT). 메시지 컬럼과 매칭되어야 정상 바인딩' },
      ],
    },
    {
      key: 'detail-services', label: '상세조회 ④ 사용 서비스 (역방향, expand=services)',
      sql:
`SELECT s.SV_DEF_ID, s.SV_DEF_NM, s.CMD_CLASS_NM, m.SV_MAP_TYPE_CD, m.SEQ_ORDER
  FROM FRM_SERVICE_FUNC_MAP m
  JOIN FRM_SERVICE_DEF s ON s.SV_DEF_ID = m.SV_DEF_ID
 WHERE m.FUNC_NM = 'TST0002_00_R01'
 ORDER BY s.SV_DEF_NM, m.SEQ_ORDER;`,
      conditions: [
        { name: 'FUNC_NM = :nm', effect: '이 SQL 을 호출하는 서비스 함수매핑 (삭제 전 영향도). 3중 동명 규칙상 보통 동명 서비스가 나온다' },
      ],
    },
    {
      key: 'describe', label: '컬럼 추출 (describe — SQL→메시지 컬럼 자동채움)',
      sql:
`-- 본문 SQL 을 '실행하지 않고' JDBC describe(PreparedStatement.getMetaData) 로
-- 출력 컬럼만 읽는다. :name → ? 치환 후 prepare (값 미바인딩, 결과 0행).
-- 예) 본문이
SELECT EMP_ID, EMP_NM, DEPT_CD FROM HR_EMP WHERE EMP_ID = :emp_id
-- 이면 ResultSetMetaData 로 EMP_ID(numeric)/EMP_NM(string)/DEPT_CD(string) 추출.`,
      conditions: [
        { name: 'GET /queries/{name}/columns', effect: '메시지관리(IST0030) 신규/수정 시 "SQL→컬럼 자동채움"이 호출. describe 전용(비실행)' },
        { name: '미지원 SQL', effect: 'Waffle 런타임 데코레이터(BIZ/ORG_AUTH)·매크로가 걸린 SQL 은 원문 describe 불가 → 400(수동 입력 안내)' },
      ],
    },
    {
      key: 'create', label: '신규 (INSERT — 정의 → 본문 → 파라미터, 단일 트랜잭션)',
      sql:
`-- ① 중복 검사 + ② 채번
SELECT COUNT(*) FROM FRM_QUERY_DEF WHERE QUERY_NAME = 'TST0009_00_R01';
SELECT S_FRM_SEQUENCE.NEXTVAL FROM DUAL;   -- 예: 88012
-- ③ 정의
INSERT INTO FRM_QUERY_DEF
  (QUERY_DEF_ID, WORKSPACE_ID, COMPANY_CD, QUERY_NAME, DISPLAY_NAME, USE_YN,
   STATUS, VERSION, DATA_SOURCE, NOTE, CREATE_TIME, BIZ_AUTH_YN, ORG_AUTH_YN, DECORATORS)
VALUES
  (88012, NULL, '01', 'TST0009_00_R01', '테스트 조회', 'Y',
   NULL, NULL, 'default', NULL, SYSDATE, 'N', 'N', NULL);
-- ④ 본문 (정의당 1행)
INSERT INTO FRM_QUERY_DEF_BODY (QUERY_BODY_ID, QUERY_DEF_ID, QUERY_STRING, CREATE_TIME)
VALUES (S_FRM_SEQUENCE.NEXTVAL, 88012, 'SELECT * FROM DUAL', SYSDATE);
-- ⑤ 파라미터 (rowStatus='I' 행마다)
INSERT INTO FRM_QUERY_DEF_PARAM
  (QUERY_PARAM_ID, QUERY_DEF_ID, QUERY_PARAM_NAME, QUERY_PARAM_SEQ,
   QUERY_PARAM_TYPE, QUERY_PARAM_INOUT_TYPE, CREATE_TIME)
VALUES
  (S_FRM_SEQUENCE.NEXTVAL, 88012, 'emp_id', 1, 'VARCHAR', 'IN', SYSDATE);`,
      conditions: [
        { name: 'QUERY_DEF_ID / QUERY_BODY_ID / QUERY_PARAM_ID', effect: 'S_FRM_SEQUENCE.NEXTVAL 채번' },
        { name: 'CREATE_TIME', effect: 'SYSDATE (FRM_QUERY_DEF 엔 mod_user 컬럼 없음 — 감사 컬럼이 CREATE_TIME 뿐)' },
        { name: 'QUERY_NAME', effect: '신규는 7-char 컨벤션 권장. 3중 동명(서비스명=func_nm=query_name) 맞춰야 자동 바인딩 정상' },
      ],
    },
    {
      key: 'update', label: '수정 (UPDATE — QUERY_NAME 보존, 본문 재삽입, 파라미터 I/U/D)',
      sql:
`-- 정의 (QUERY_NAME·CREATE_TIME 은 보존)
UPDATE FRM_QUERY_DEF
   SET WORKSPACE_ID = NULL, COMPANY_CD = '01', DISPLAY_NAME = '테스트 조회(수정)',
       USE_YN = 'Y', STATUS = NULL, VERSION = NULL, DATA_SOURCE = 'default',
       NOTE = NULL, BIZ_AUTH_YN = 'N', ORG_AUTH_YN = 'N', DECORATORS = NULL
 WHERE QUERY_DEF_ID = 88012;

-- 본문: 기존 전체 삭제 후 재삽입(정의당 1행 정규화)
DELETE FROM FRM_QUERY_DEF_BODY WHERE QUERY_DEF_ID = 88012;
INSERT INTO FRM_QUERY_DEF_BODY (...) VALUES (..., 88012, '수정된 SQL', SYSDATE);

-- 파라미터 자식: rowStatus 별 I/U/D (WHERE QUERY_PARAM_ID = :id)`,
      conditions: [
        { name: 'QUERY_NAME(업무키) / CREATE_TIME', effect: '수정 대상 아님(보존, rename 금지)' },
        { name: '본문', effect: '정의당 1행이라 DELETE 후 INSERT 로 교체' },
        { name: '파라미터 rowStatus', effect: 'I=INSERT / U=UPDATE / D=DELETE' },
      ],
    },
    {
      key: 'delete', label: '삭제 (DELETE — 파라미터·본문 → 정의)',
      sql:
`DELETE FROM FRM_QUERY_DEF_PARAM WHERE QUERY_DEF_ID = 88012;
DELETE FROM FRM_QUERY_DEF_BODY  WHERE QUERY_DEF_ID = 88012;
DELETE FROM FRM_QUERY_DEF       WHERE QUERY_DEF_ID = 88012;`,
      conditions: [
        { name: 'QUERY_DEF_ID', effect: '파라미터·본문 자식 먼저 삭제 후 정의 삭제. 사용 서비스 ④ 확인 권장' },
      ],
    },
  ],

  businessNotes: [
    'IST0010 SQL관리 = 저장된 SQL(쿼리) 메타. 정의(FRM_QUERY_DEF) + 본문 CLOB(FRM_QUERY_DEF_BODY) + 바인드 파라미터(FRM_QUERY_DEF_PARAM) 3테이블.',
    'QUERY_NAME 은 업무키(수정 불가). 서비스 함수매핑 type=sql 의 func_nm 이 이 이름을 참조 — 3중 동명(sv_def_nm = func_nm = query_name)이 맞아야 framework 자동 바인딩이 정상 동작한다.',
    '본문(QUERY_STRING)은 정의당 1행으로 정규화 — 저장 시 기존 본문을 DELETE 후 재INSERT 한다.',
    'BIZ_AUTH_YN / ORG_AUTH_YN / DECORATORS 는 Waffle 런타임 데코레이터(업무·조직 권한 필터, 매크로). 실행 시 SQL 에 자동 합성되므로, "SQL→컬럼 자동채움(describe)"은 이런 SQL 을 지원하지 않는다(원문만 describe).',
    'FRM_QUERY_DEF 에는 mod_user 컬럼이 없고 CREATE_TIME(감사) 뿐 — 메타 테이블 간 감사 컬럼이 불균일(백로그 #2).',
    'SQL 편집 시 캐시 evict 대상 = SQLDefinitionPool (편집 즉시 반영).',
  ],

  tables: [
    { name: 'FRM_QUERY_DEF', label: 'SQL 정의 (부모)', columns: [
      { col: 'QUERY_DEF_ID', type: 'NUMBER',         nn: true,  key: 'PK',      desc: 'SQL 정의 ID (시퀀스)' },
      { col: 'WORKSPACE_ID', type: 'VARCHAR2(10)',   nn: false, key: '',        desc: '워크스페이스 ID' },
      { col: 'COMPANY_CD',   type: 'VARCHAR2(50)',   nn: false, key: '',        desc: '회사코드' },
      { col: 'QUERY_NAME',   type: 'VARCHAR2(80)',   nn: true,  key: 'UK(논리)', desc: 'SQL명 = 업무키' },
      { col: 'DISPLAY_NAME', type: 'VARCHAR2(300)',  nn: true,  key: '',        desc: '표시명' },
      { col: 'USE_YN',       type: 'CHAR(1)',        nn: false, key: '',        desc: '사용 여부 Y/N' },
      { col: 'STATUS',       type: 'VARCHAR2(10)',   nn: false, key: '',        desc: '상태' },
      { col: 'VERSION',      type: 'VARCHAR2(10)',   nn: false, key: '',        desc: '버전' },
      { col: 'DATA_SOURCE',  type: 'VARCHAR2(80)',   nn: true,  key: '',        desc: '데이터소스(접속 DB)' },
      { col: 'NOTE',         type: 'VARCHAR2(750)',  nn: false, key: '',        desc: '비고' },
      { col: 'CREATE_TIME',  type: 'DATE',           nn: false, key: '',        desc: '생성일시 (감사 컬럼, SYSDATE)' },
      { col: 'BIZ_AUTH_YN',  type: 'VARCHAR2(1)',    nn: false, key: '',        desc: '업무권한 데코레이터 Y/N' },
      { col: 'ORG_AUTH_YN',  type: 'VARCHAR2(1)',    nn: false, key: '',        desc: '조직권한 데코레이터 Y/N' },
      { col: 'DECORATORS',   type: 'VARCHAR2(4000)', nn: false, key: '',        desc: '데코레이터/매크로 정의' },
    ]},
    { name: 'FRM_QUERY_DEF_BODY', label: '본문 (자식, 정의당 1행)', columns: [
      { col: 'QUERY_BODY_ID', type: 'NUMBER',  nn: true,  key: 'PK',      desc: '본문 ID (시퀀스)' },
      { col: 'QUERY_DEF_ID',  type: 'NUMBER',  nn: false, key: 'FK(논리)', desc: '부모 SQL 정의 ID' },
      { col: 'QUERY_STRING',  type: 'CLOB',    nn: false, key: '',        desc: '실제 SQL 본문 (바인드 :name 포함)' },
      { col: 'CREATE_TIME',   type: 'DATE',    nn: false, key: '',        desc: '생성일시' },
    ]},
    { name: 'FRM_QUERY_DEF_PARAM', label: '파라미터 (자식)', columns: [
      { col: 'QUERY_PARAM_ID',        type: 'NUMBER',        nn: true,  key: 'PK',      desc: '파라미터 ID (시퀀스)' },
      { col: 'QUERY_DEF_ID',          type: 'NUMBER',        nn: false, key: 'FK(논리)', desc: '부모 SQL 정의 ID' },
      { col: 'QUERY_PARAM_NAME',      type: 'VARCHAR2(80)',  nn: false, key: '',        desc: '바인드 변수명 (:name)' },
      { col: 'QUERY_PARAM_SEQ',       type: 'NUMBER',        nn: false, key: '',        desc: '순서' },
      { col: 'QUERY_PARAM_TYPE',      type: 'VARCHAR2(80)',  nn: false, key: '',        desc: '타입 (VARCHAR/NUMBER 등)' },
      { col: 'QUERY_PARAM_INOUT_TYPE',type: 'VARCHAR2(4)',   nn: false, key: '',        desc: 'IN / OUT (프로시저용)' },
      { col: 'CREATE_TIME',           type: 'DATE',          nn: false, key: '',        desc: '생성일시' },
    ]},
  ],
};
