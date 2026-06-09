/**
 * ServiceCatalog.help.js — IST0050 서비스관리 화면 도움말 (실행 SQL + 조건 + 업무주의).
 * ★ (2026-06-09, dspark): 화면이 실제 실행하는 SQL 을 bind 예시값을 채운 "그대로 실행 가능한" 형태로 학습용 제공.
 *   출처(SSOT) = h5webapplication/.../admin/meta/service/ServiceDefRepository.java (수동 동기화).
 *   Repository 변경 시 본 파일도 함께 갱신할 것. ScreenHelpDrawer 가 렌더.
 */
export default {
  object: 'IST0050',
  title: '서비스관리',
  table: 'FRM_SERVICE_DEF (정의) + FRM_SERVICE_FUNC_MAP (함수매핑) + FRM_SERVICE_ATTR (속성/메시지 슬롯)',
  asOf: '2026-06-09',

  operations: [
    // ───────────────────────── 목록 조회 ─────────────────────────
    {
      key: 'list',
      label: '목록 조회 (검색·필터)',
      sql:
`SELECT SV_DEF_ID, SV_DEF_NM, OBJECT_ID, CMD_CLASS_NM,
       TX_SUPPORT_YN, ASYNC_YN, USE_LOG_YN, VERSION, NOTE,
       MOD_USER_ID, MOD_DATE
  FROM FRM_SERVICE_DEF
 ORDER BY SV_DEF_NM ASC, SV_DEF_ID ASC;

-- 총 건수(페이징 표시용)는 같은 WHERE 로 별도 실행:
SELECT COUNT(*) FROM FRM_SERVICE_DEF;`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND UPPER(SV_DEF_NM) LIKE UPPER('입력값' || '%') — 서비스명 앞부분(prefix) 일치. 미입력 시 조건 제외" },
        { name: 'Command(cmdClass)', effect: "선택 시 AND CMD_CLASS_NM LIKE '%MultiQuery%' — Command 클래스 부분일치 (MultiQuery/MultiSave/Procedure/ElaService)" },
        { name: 'TX(txSupportYn)', effect: "선택 시 AND TX_SUPPORT_YN = 'Y'|'N' — 트랜잭션 지원 여부" },
        { name: 'Async(asyncYn)', effect: "선택 시 AND ASYNC_YN = 'Y'|'N' — 비동기 여부 (API 지원, 화면 필터엔 미노출)" },
        { name: 'Log(useLogYn)', effect: "선택 시 AND USE_LOG_YN = 'Y'|'N' — 실행 로그 적재 여부" },
        { name: '정렬(sort)', effect: '헤더 클릭 → sv_def_nm / cmd_class_nm / tx_support_yn / async_yn / use_log_yn / mod_user_id / mod_date 중 1개 + asc|desc (화이트리스트 외 컬럼은 400 차단). 기본 SV_DEF_NM ASC' },
        { name: '페이징(page/size)', effect: '기본 1 / 50. Oracle 페이징으로 해당 구간만 반환 + 위 COUNT(*) 로 총건수 계산' },
      ],
      note: '모든 WHERE 조건은 "값이 있을 때만" 붙는다(andIfPresent). 위 SQL 은 필터 0개(전체 조회)인 기본형이라 그대로 실행하면 전 서비스가 나온다.',
    },

    // ───────────────────────── 상세조회 ① 정의 ─────────────────────────
    {
      key: 'detail-def',
      label: '상세조회 ① 서비스 정의 (행 클릭)',
      sql:
`SELECT SV_DEF_ID, SV_DEF_NM, OBJECT_ID, CMD_CLASS_NM,
       TX_SUPPORT_YN, ASYNC_YN, USE_LOG_YN, VERSION, NOTE,
       MOD_USER_ID, MOD_DATE
  FROM FRM_SERVICE_DEF
 WHERE SV_DEF_NM = 'TST0002_00_R01';`,
      conditions: [
        { name: 'SV_DEF_NM', effect: '목록에서 클릭한 행의 서비스명(업무키). 이 1건으로 SV_DEF_ID 를 얻어 아래 자식 조회에 사용' },
      ],
    },
    // ───────────────────────── 상세조회 ② 함수매핑 ─────────────────────────
    {
      key: 'detail-funcmaps',
      label: '상세조회 ② 함수 매핑 (자식)',
      sql:
`SELECT SV_MAP_ID, SV_DEF_ID, SV_MAP_TYPE_CD, FUNC_NM, SEQ_ORDER,
       REQ_MSG_NM, RES_MSG_NM, USE_TREE_RESULT
  FROM FRM_SERVICE_FUNC_MAP
 WHERE SV_DEF_ID = 23919350
 ORDER BY SEQ_ORDER, SV_MAP_ID;`,
      conditions: [
        { name: 'SV_DEF_ID', effect: '①정의 조회에서 얻은 SV_DEF_ID' },
        { name: 'SV_MAP_TYPE_CD', effect: "sql = 쿼리명(조회/프로시저), entity = 엔터티명(저장). FUNC_NM 이 그 쿼리/엔터티 이름" },
      ],
    },
    // ───────────────────────── 상세조회 ③ 속성 ─────────────────────────
    {
      key: 'detail-attrs',
      label: '상세조회 ③ 속성 / 메시지 슬롯 (자식)',
      sql:
`SELECT SV_ATTR_ID, SV_DEF_ID, SV_ATTR_NM, SV_ATTR_TYPE,
       VALUE_TYPE, DEFAULT_VALUE, NOTE
  FROM FRM_SERVICE_ATTR
 WHERE SV_DEF_ID = 23919350
 ORDER BY SV_ATTR_ID;`,
      conditions: [
        { name: 'SV_DEF_ID', effect: '①정의 조회에서 얻은 SV_DEF_ID' },
        { name: 'SV_ATTR_TYPE', effect: 'IN_MSG = 요청 슬롯, OUT_MSG = 응답 슬롯. VALUE_TYPE = MT_<화면7자>_NN (메시지 정의 타입)' },
      ],
    },
    // ───────────────────────── 상세조회 ④ 참조 메시지 (진단) ─────────────────────────
    {
      key: 'detail-msg',
      label: '상세조회 ④ 참조 메시지 (진단, expand=msg)',
      sql:
`SELECT m.MSG_DEF_OID, m.MSG_DEF_ID, m.MSG_DEF_NM, m.TYPE_CD,
       (SELECT COUNT(*) FROM FRM_MSG_COL_DEF c
         WHERE c.MSG_DEF_OID = m.MSG_DEF_OID) AS COLUMN_COUNT
  FROM FRM_MSG_DEF m
 WHERE m.MSG_DEF_ID IN ('MT_TST0002_01');`,
      conditions: [
        { name: 'IN (:ids)', effect: '③속성들의 VALUE_TYPE(MT_*) 집합. 메시지가 실제 등록돼 있는지(빨간 dot=미등록) + 컬럼 수 진단' },
      ],
      note: '진단(expand)용 — 조회 화면 우측 패널의 "메시지 슬롯" 탭 dot/배지를 만든다.',
    },
    // ───────────────────────── 상세조회 ⑤ 참조 SQL (진단) ─────────────────────────
    {
      key: 'detail-query',
      label: '상세조회 ⑤ 참조 SQL (진단, expand=query)',
      sql:
`SELECT q.QUERY_DEF_ID, q.QUERY_NAME, q.DISPLAY_NAME,
       DBMS_LOB.SUBSTR(b.QUERY_STRING, 200, 1) AS BODY_PREVIEW
  FROM FRM_QUERY_DEF q
  LEFT JOIN FRM_QUERY_DEF_BODY b ON b.QUERY_DEF_ID = q.QUERY_DEF_ID
 WHERE q.QUERY_NAME IN ('TST0002_00_R01');`,
      conditions: [
        { name: 'IN (:names)', effect: "②함수매핑 중 type=sql 의 FUNC_NM 집합. SQL 본문 200자 미리보기 + 미등록 진단" },
      ],
      note: 'CLOB 본문은 DBMS_LOB.SUBSTR 로 200자만 미리보기. 전체 본문이 필요하면 SQL관리(IST0010) 화면 참조.',
    },
    // ───────────────────────── 상세조회 ⑥ 소속 오브젝트 (진단) ─────────────────────────
    {
      key: 'detail-object',
      label: '상세조회 ⑥ 소속 오브젝트 (진단, expand=object)',
      sql:
`SELECT OBJECT_ID, OBJECT_NM, OBJECT_DISPLAY_NM, OBJECT_LINK, OBJECT_TYPE
  FROM FRM_EXECUTABLE_OBJECT
 WHERE OBJECT_NM = 'TST0002'
    OR (REGEXP_LIKE('TST0002', '^[0-9]+$') AND OBJECT_ID = TO_NUMBER('TST0002'));`,
      conditions: [
        { name: 'OBJECT_ID(def)', effect: 'FRM_SERVICE_DEF.OBJECT_ID(VARCHAR2 80). 실데이터가 OBJECT_NM 일 수도, 숫자 OBJECT_ID 일 수도 있어 두 매칭을 OR 로 시도. 대부분 NULL → 조회 안 함' },
      ],
    },

    // ───────────────────────── 신규 (INSERT) ─────────────────────────
    {
      key: 'create',
      label: '신규 (INSERT — 채번 → 부모 → 자식, 단일 트랜잭션)',
      sql:
`-- ① 신규 전 중복 검사
SELECT COUNT(*) FROM FRM_SERVICE_DEF WHERE SV_DEF_NM = 'TST0009_00_R01';

-- ② PK 채번 (단일 시퀀스 공유)
SELECT S_FRM_SEQUENCE.NEXTVAL FROM DUAL;   -- 예: 23919350

-- ③ 서비스 정의 (부모)
INSERT INTO FRM_SERVICE_DEF
  (SV_DEF_ID, SV_DEF_NM, CMD_CLASS_NM, TX_SUPPORT_YN, VERSION,
   NOTE, ASYNC_YN, OBJECT_ID, USE_LOG_YN, MOD_USER_ID, MOD_DATE)
VALUES
  (23919350, 'TST0009_00_R01', 'h5.biz.command.common.MultiQueryCommand', 'N', NULL,
   NULL, 'N', NULL, 'N', 665773, SYSDATE);

-- ④ 함수 매핑 (rowStatus='I' 행마다 1건씩)
INSERT INTO FRM_SERVICE_FUNC_MAP
  (SV_MAP_ID, SV_DEF_ID, SV_MAP_TYPE_CD, FUNC_NM, SEQ_ORDER,
   REQ_MSG_NM, RES_MSG_NM, USE_TREE_RESULT, MOD_USER_ID, MOD_DATE)
VALUES
  (S_FRM_SEQUENCE.NEXTVAL, 23919350, 'sql', 'TST0009_00_R01', 1,
   NULL, NULL, 'N', 665773, SYSDATE);

-- ⑤ 속성/메시지 슬롯 (rowStatus='I' 행마다 1건씩)
INSERT INTO FRM_SERVICE_ATTR
  (SV_ATTR_ID, SV_DEF_ID, SV_ATTR_NM, SV_ATTR_TYPE, VALUE_TYPE,
   DEFAULT_VALUE, NOTE, MOD_USER_ID, MOD_DATE)
VALUES
  (S_FRM_SEQUENCE.NEXTVAL, 23919350, 'ME_TST0009_01', 'IN_MSG', 'MT_TST0009_01',
   NULL, NULL, 665773, SYSDATE);`,
      conditions: [
        { name: 'SV_DEF_ID / SV_MAP_ID / SV_ATTR_ID', effect: 'S_FRM_SEQUENCE.NEXTVAL 로 채번 (단일 시퀀스 공유)' },
        { name: 'MOD_USER_ID', effect: 'JWT 토큰의 uid → NUMBER 로 주입 (예 665773)' },
        { name: 'MOD_DATE', effect: 'SYSDATE 자동 (CREATOR_CD 컬럼 없음)' },
        { name: 'SV_DEF_NM', effect: '신규는 7-char 컨벤션 강제 — 예: TST0009_00_R01 (위반 시 화면에서 차단)' },
        { name: '트랜잭션', effect: '부모+자식이 1개 @Transactional. 자식은 그리드에서 rowStatus="I" 인 행만 INSERT' },
      ],
    },

    // ───────────────────────── 수정 (UPDATE) ─────────────────────────
    {
      key: 'update',
      label: '수정 (UPDATE — 자식은 행별 I/U/D 분기)',
      sql:
`-- 부모 (SV_DEF_NM 업무키는 변경하지 않음)
UPDATE FRM_SERVICE_DEF
   SET CMD_CLASS_NM = 'h5.biz.command.common.MultiQueryCommand',
       TX_SUPPORT_YN = 'N', VERSION = NULL, NOTE = '설명 수정',
       ASYNC_YN = 'N', OBJECT_ID = NULL, USE_LOG_YN = 'Y',
       MOD_USER_ID = 665773, MOD_DATE = SYSDATE
 WHERE SV_DEF_ID = 23919350;

-- 자식: 그리드 행의 rowStatus 에 따라 분기
--  rowStatus='U' → 해당 행 UPDATE
UPDATE FRM_SERVICE_FUNC_MAP
   SET SV_MAP_TYPE_CD = 'sql', FUNC_NM = 'TST0009_00_R01', SEQ_ORDER = 1,
       REQ_MSG_NM = NULL, RES_MSG_NM = NULL, USE_TREE_RESULT = 'N',
       MOD_USER_ID = 665773, MOD_DATE = SYSDATE
 WHERE SV_MAP_ID = 23919351;
--  rowStatus='I' → 신규 ④/⑤ 와 동일한 INSERT
--  rowStatus='D' → DELETE FROM FRM_SERVICE_FUNC_MAP WHERE SV_MAP_ID = :id
-- (FRM_SERVICE_ATTR 속성도 동일하게 I/U/D 분기)`,
      conditions: [
        { name: 'SV_DEF_NM(업무키)', effect: '수정 대상 아님 — 화면에서도 입력 비활성(disabled). JSP/envelope serviceId 라 보존' },
        { name: '자식 rowStatus', effect: 'I=INSERT / U=UPDATE / D=DELETE. 변경 없는(빈 rowStatus) 행은 SQL 미발생' },
        { name: 'MOD_USER_ID / MOD_DATE', effect: 'JWT uid + SYSDATE 로 매 수정마다 갱신' },
      ],
    },

    // ───────────────────────── 삭제 (DELETE) ─────────────────────────
    {
      key: 'delete',
      label: '삭제 (DELETE — 자식 → 부모, 단일 트랜잭션)',
      sql:
`-- 자식부터 전체 삭제 후 부모 삭제 (1개 트랜잭션)
DELETE FROM FRM_SERVICE_FUNC_MAP WHERE SV_DEF_ID = 23919350;
DELETE FROM FRM_SERVICE_ATTR     WHERE SV_DEF_ID = 23919350;
DELETE FROM FRM_SERVICE_DEF      WHERE SV_DEF_ID = 23919350;`,
      conditions: [
        { name: 'SV_DEF_ID', effect: '삭제 대상 서비스의 ID. 함수매핑·속성 자식을 먼저 지우고 정의를 삭제' },
        { name: '확인', effect: '화면에서 "함수매핑·속성도 함께 삭제" 확인 다이얼로그 후 실행' },
      ],
    },
  ],

  businessNotes: [
    '서비스명(SV_DEF_NM)은 업무키 = JSP/envelope 의 serviceId. 7-char 컨벤션(예: TST0001_00_R01)을 따르며 수정 불가(보존).',
    '3중 동명 규칙: type=sql 매핑일 때 sv_def_nm = func_nm = query_name 이 일치해야 framework 자동 바인딩이 정상 동작한다. 어긋나면 조회가 0건이 나온다.',
    'Command 종류 = MultiQuery(조회) / MultiSave(저장) / Procedure(PL/SQL) / ElaService(전자결재). ELA 는 실제로 envelope serviceId 가 ELA0010_SAVE_0N(1=상신/2=임시저장/3=승인/4=반려) 로 sub-Command dispatch 된다.',
    '서비스 정의는 Waffle 메타 풀 evict 대상이 아니다 — 매 요청 DB 를 읽으므로 편집 즉시 반영(캐시 무관).',
    'objectId 는 대부분 NULL 이 정상. 단 ELA Command 인데 NULL 이면 OBJECT 메타 14건 인프라 등록 누락을 의심해야 한다.',
    '우측 패널의 진단 dot/배지(메시지 미등록·SQL 미등록·use_yn=N·SQL bind 미매칭·ELA 인프라 누락)는 위 ④⑤⑥ expand 조회 결과로 자동 계산된다.',
  ],

  // 테이블 컬럼 정보 (출처: 01-asis/database/extracts/columns.csv + constraints.csv 실측). 드로어 하단 접이식.
  //   key: PK = 기본키 / FK(논리) = 논리 외래키(DB 미강제, NULL 허용). nn = NOT NULL.
  tables: [
    {
      name: 'FRM_SERVICE_DEF', label: '서비스 정의 (부모)',
      columns: [
        { col: 'SV_DEF_ID',     type: 'NUMBER',        nn: true,  key: 'PK', desc: '서비스 정의 ID (시퀀스 S_FRM_SEQUENCE)' },
        { col: 'SV_DEF_NM',     type: 'VARCHAR2(300)', nn: true,  key: 'UK(논리)', desc: '서비스명 = 업무키 = envelope/JSP serviceId' },
        { col: 'CMD_CLASS_NM',  type: 'VARCHAR2(300)', nn: true,  key: '',   desc: 'Command 클래스 FQCN (MultiQuery/MultiSave/Procedure/ElaService …)' },
        { col: 'TX_SUPPORT_YN', type: 'CHAR(1)',       nn: false, key: '',   desc: '트랜잭션 지원 Y/N' },
        { col: 'VERSION',       type: 'VARCHAR2(60)',  nn: false, key: '',   desc: '버전 (선택)' },
        { col: 'NOTE',          type: 'VARCHAR2(750)', nn: false, key: '',   desc: '비고' },
        { col: 'MOD_USER_ID',   type: 'NUMBER',        nn: true,  key: '',   desc: '최종 수정자 ID (JWT uid 주입)' },
        { col: 'MOD_DATE',      type: 'DATE',          nn: true,  key: '',   desc: '최종 수정일시 (SYSDATE)' },
        { col: 'ASYNC_YN',      type: 'CHAR(1)',       nn: false, key: '',   desc: '비동기 실행 Y/N' },
        { col: 'OBJECT_ID',     type: 'VARCHAR2(80)',  nn: false, key: '',   desc: '소속 오브젝트 (대부분 NULL)' },
        { col: 'USE_LOG_YN',    type: 'CHAR(1)',       nn: false, key: '',   desc: '실행 로그 적재 Y/N' },
      ],
    },
    {
      name: 'FRM_SERVICE_FUNC_MAP', label: '함수 매핑 (자식)',
      columns: [
        { col: 'SV_MAP_ID',       type: 'NUMBER',       nn: true,  key: 'PK',      desc: '매핑 ID (시퀀스)' },
        { col: 'SV_DEF_ID',       type: 'NUMBER',       nn: false, key: 'FK(논리)', desc: '부모 서비스 정의 ID' },
        { col: 'SV_MAP_TYPE_CD',  type: 'VARCHAR2(50)', nn: true,  key: '',        desc: '매핑 타입 — sql(쿼리) / entity(엔터티)' },
        { col: 'FUNC_NM',         type: 'VARCHAR2(60)', nn: true,  key: '',        desc: '쿼리명 또는 엔터티명' },
        { col: 'SEQ_ORDER',       type: 'NUMBER',       nn: true,  key: '',        desc: '실행 순서' },
        { col: 'REQ_MSG_NM',      type: 'VARCHAR2(60)', nn: false, key: '',        desc: '요청 메시지명' },
        { col: 'RES_MSG_NM',      type: 'VARCHAR2(60)', nn: false, key: '',        desc: '응답 메시지명' },
        { col: 'MOD_DATE',        type: 'DATE',         nn: true,  key: '',        desc: '최종 수정일시' },
        { col: 'MOD_USER_ID',     type: 'NUMBER',       nn: true,  key: '',        desc: '최종 수정자 ID' },
        { col: 'USE_TREE_RESULT', type: 'CHAR(1)',      nn: false, key: '',        desc: '트리 결과 사용 Y/N' },
      ],
    },
    {
      name: 'FRM_SERVICE_ATTR', label: '속성 / 메시지 슬롯 (자식)',
      columns: [
        { col: 'SV_ATTR_ID',    type: 'NUMBER',        nn: true,  key: 'PK',      desc: '속성 ID (시퀀스)' },
        { col: 'SV_DEF_ID',     type: 'NUMBER',        nn: false, key: 'FK(논리)', desc: '부모 서비스 정의 ID' },
        { col: 'SV_ATTR_NM',    type: 'VARCHAR2(60)',  nn: true,  key: '',        desc: '속성명 (메시지 인스턴스 ME_*)' },
        { col: 'NOTE',          type: 'VARCHAR2(750)', nn: false, key: '',        desc: '비고' },
        { col: 'SV_ATTR_TYPE',  type: 'VARCHAR2(60)',  nn: true,  key: '',        desc: '슬롯 종류 — IN_MSG(요청) / OUT_MSG(응답)' },
        { col: 'DEFAULT_VALUE', type: 'VARCHAR2(750)', nn: false, key: '',        desc: '기본값 (= VALUE_TYPE 와 자동 정합)' },
        { col: 'MOD_USER_ID',   type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID' },
        { col: 'MOD_DATE',      type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
        { col: 'VALUE_TYPE',    type: 'VARCHAR2(750)', nn: false, key: '',        desc: '메시지 타입 (MT_<화면7자>_NN)' },
      ],
    },
  ],
};
