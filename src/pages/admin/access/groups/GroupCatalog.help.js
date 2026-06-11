/**
 * GroupCatalog.help.js — AUT0020 사용자그룹관리 화면 도움말 (실행 SQL + 조건 + 업무주의 + 컬럼정보).
 * ★ [DEV-HELP] (2026-06-11, dspark): 임시 개발 편의용. 출처(SSOT) = GroupRepository.java + GroupService.java (수동 동기화).
 *   컬럼정보 출처 = 01-asis/database/extracts/columns.csv 실측 + AS-IS 매뉴얼 11(aut0020) §4.
 *   업무 맥락 출처 = AS-IS 매뉴얼 11 §2·§6 (AuthLoggerCommand 감사 / 삭제 cascade / GROUP_TYPE).
 */
export default {
  object: 'AUT0020',
  title: '사용자그룹관리',
  table: 'FRM_USER_GROUP (그룹) + FRM_USER_GROUP_MAP (멤버, 복합키)',
  asOf: '2026-06-11',

  // ★ 꼭 알아야 할 / 암기 필요 (이슈·TO-BE) — 도움말 상단 강조 배너. <strong> 허용.
  callouts: [
    { tone: 'warn', text: '<strong>GROUP_TYPE=90 = 운영자그룹</strong>(관리자 화면 접근 판정 그룹). 실측 23개 중 90 이 14개(<code>ADMIN_GROUP*</code>) — 시스템/HR 운영 권한자. 그 외 코드(10·20·30·51)는 의미 미확정.' },
    { tone: 'warn', text: '<strong>멤버 추가/제거는 감사 대상입니다.</strong> 멤버 변경 시 <strong>P_FRM_AUTH_LOG</strong>(AS-IS AuthLoggerCommand) 로 <strong>USERGROUP GRANT/REVOKE</strong> 감사 로그가 같은 트랜잭션으로 기록됩니다. 누락 금지(컴플라이언스).' },
    { tone: 'danger', text: '<strong>삭제 가드</strong>: 이 그룹에 <strong>권한 바인딩(FRM_USERGROUP_AUTH_MAP)</strong> 이 있으면 삭제 차단(orphan 권한 방지). 권한관리(AUT0040)에서 그룹 권한을 먼저 정리해야 합니다.' },
  ],

  operations: [
    {
      key: 'list', label: '목록 조회 (검색·필터)',
      sql:
`SELECT USERGROUP_ID, USERGROUP_NM, GROUP_TYPE, COMPANY_CD, BIGO
  FROM FRM_USER_GROUP
 -- WHERE (검색·필터 — 아래 조건 참조)
 ORDER BY USERGROUP_ID ASC, USERGROUP_ID ASC;

-- 총 건수(같은 WHERE):
SELECT COUNT(*) FROM FRM_USER_GROUP;`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND (UPPER(USERGROUP_ID) LIKE UPPER('%입력값%') OR USERGROUP_NM LIKE '%입력값%') — 그룹ID/그룹명 부분일치" },
        { name: 'groupType', effect: 'AND GROUP_TYPE = :groupType (미지정 시 전체)' },
        { name: 'companyCd', effect: 'AND COMPANY_CD = :companyCd (미지정 시 전체)' },
        { name: '정렬(sort)', effect: 'usergroup_id / usergroup_nm / group_type + asc|desc (화이트리스트). 기본 USERGROUP_ID ASC' },
      ],
      note: '단일 테이블(FRM_USER_GROUP) 조회. 멤버는 상세 진입 시 별도 조회. 정렬 컬럼은 화이트리스트(usergroup_id/usergroup_nm/group_type) 외 거부.',
    },
    {
      key: 'detail-def', label: '상세조회 ① 그룹 정의 (행 클릭)',
      sql:
`SELECT USERGROUP_ID, USERGROUP_NM, GROUP_TYPE, COMPANY_CD, BIGO
  FROM FRM_USER_GROUP
 WHERE USERGROUP_ID = 'ADMIN_GROUP';`,
      conditions: [
        { name: 'USERGROUP_ID', effect: '행의 USERGROUP_ID(PK=업무키). 없으면 NotFound(404)' },
      ],
    },
    {
      key: 'detail-members', label: '상세조회 ② 그룹 멤버 (자식)',
      sql:
`SELECT MAP.USERGROUP_ID, MAP.USER_ID, USR.LOGIN_ID,
       EMP.EMP_NM AS EMP_NM,
       F_FRM_ORM_ORG_NM(EMP.ORG_ID, EMP.LOCALE_CD, XF_SYSDATE(0), '11') AS ORG_NM
  FROM FRM_USER_GROUP_MAP MAP
  JOIN FRM_USER USR ON USR.USER_ID = MAP.USER_ID
  LEFT JOIN FRM_USER_EMP_MAP EM ON EM.USER_ID = USR.USER_ID
  LEFT JOIN VI_FRM_PHM_EMP EMP ON EMP.EMP_ID = EM.EMP_ID AND EMP.LOCALE_CD = 'KO'
 WHERE MAP.USERGROUP_ID = 'ADMIN_GROUP'
 ORDER BY USR.LOGIN_ID;`,
      conditions: [
        { name: 'USERGROUP_ID', effect: '①정의 USERGROUP_ID. 멤버(FRM_USER_GROUP_MAP) 목록' },
        { name: 'LOGIN_ID/EMP_NM/ORG_NM', effect: '계정·재직뷰 조인으로 표시(저장 대상 아님). USR=INNER JOIN, 사원/조직은 LEFT JOIN(방어). LOCALE_CD=KO' },
      ],
      note: '멤버 본체는 (USERGROUP_ID, USER_ID) 복합키 1건. 로그인ID/성명/소속은 표시 전용 조인 결과로 저장 컬럼 아님.',
    },
    {
      key: 'create', label: '신규 (INSERT — 그룹 → 멤버 전 행 GRANT, 단일 트랜잭션)',
      sql:
`-- ① 중복 검사(usergroupId)
SELECT COUNT(*) FROM FRM_USER_GROUP WHERE USERGROUP_ID = 'NEW_GROUP';
-- ② 그룹 마스터
INSERT INTO FRM_USER_GROUP
  (USERGROUP_ID, USERGROUP_NM, GROUP_TYPE, COMPANY_CD, BIGO, MOD_USER_ID, MOD_DATE)
VALUES
  ('NEW_GROUP', '신규그룹', '90', '01', '비고', 665773, SYSDATE);
-- ③ 멤버 (생성 시 members 전 행 INSERT)
INSERT INTO FRM_USER_GROUP_MAP (USERGROUP_ID, USER_ID, MOD_USER_ID, MOD_DATE)
VALUES ('NEW_GROUP', 800123, 665773, SYSDATE);
-- ④ 감사 로그 (멤버 INSERT 마다)
CALL P_FRM_AUTH_LOG('USERGROUP', 'GRANT', 'NEW_GROUP', '800123', 665773, ?, ?);`,
      conditions: [
        { name: 'USERGROUP_ID(업무키)', effect: '입력값(trim). 중복이면 Conflict(409). 그룹ID·그룹명 필수' },
        { name: '멤버 전 행', effect: '생성 시 rowStatus 무관 전 행 INSERT(GRANT). 이미 멤버면 skip(중복방지)' },
        { name: 'MOD_USER_ID / MOD_DATE', effect: 'JWT uid(NUMBER) + SYSDATE. uid 비숫자면 null' },
      ],
    },
    {
      key: 'update', label: '수정 (UPDATE — 그룹키 보존, 멤버 rowStatus I/D)',
      sql:
`-- 그룹 마스터 (USERGROUP_ID 업무키는 고정·보존)
UPDATE FRM_USER_GROUP
   SET USERGROUP_NM = '수정그룹', GROUP_TYPE = '90', COMPANY_CD = '01',
       BIGO = '비고', MOD_USER_ID = 665773, MOD_DATE = SYSDATE
 WHERE USERGROUP_ID = 'ADMIN_GROUP';

-- 멤버 추가 (rowStatus='I' 행마다 — 이미 멤버면 skip)
INSERT INTO FRM_USER_GROUP_MAP (USERGROUP_ID, USER_ID, MOD_USER_ID, MOD_DATE)
VALUES ('ADMIN_GROUP', 800123, 665773, SYSDATE);
CALL P_FRM_AUTH_LOG('USERGROUP', 'GRANT', 'ADMIN_GROUP', '800123', 665773, ?, ?);

-- 멤버 제거 (rowStatus='D' 행마다)
DELETE FROM FRM_USER_GROUP_MAP WHERE USERGROUP_ID = 'ADMIN_GROUP' AND USER_ID = 800124;
CALL P_FRM_AUTH_LOG('USERGROUP', 'REVOKE', 'ADMIN_GROUP', '800124', 665773, ?, ?);`,
      conditions: [
        { name: 'USERGROUP_ID(업무키)', effect: '수정 대상 아님(보존). 그룹명은 필수' },
        { name: '멤버 rowStatus', effect: "I=INSERT(GRANT) / D=DELETE(REVOKE) / 그 외(빈값·U)=무변경 skip" },
        { name: '감사 로그', effect: 'I→USERGROUP GRANT, D→USERGROUP REVOKE 를 P_FRM_AUTH_LOG 로 같은 트랜잭션 기록' },
      ],
      note: '멤버 표(loginId/empNm/orgNm)는 표시 전용이라 UPDATE 대상이 아님 — 멤버 본체는 (USERGROUP_ID, USER_ID) 추가/제거(I/D)만.',
    },
    {
      key: 'delete', label: '삭제 (DELETE — 권한바인딩 가드 → 멤버 → 그룹, 단일 트랜잭션)',
      sql:
`-- ① 삭제 가드: 그룹에 권한 바인딩이 있으면 차단
SELECT COUNT(*) FROM FRM_USERGROUP_AUTH_MAP WHERE USERGROUP_ID = 'ADMIN_GROUP';
-- ② 멤버 → 그룹 (단일 트랜잭션, 자식 → 부모)
DELETE FROM FRM_USER_GROUP_MAP WHERE USERGROUP_ID = 'ADMIN_GROUP';
DELETE FROM FRM_USER_GROUP     WHERE USERGROUP_ID = 'ADMIN_GROUP';`,
      conditions: [
        { name: '권한바인딩 가드', effect: 'FRM_USERGROUP_AUTH_MAP 에 바인딩이 있으면 삭제 차단(Conflict 409). AUT0040 에서 권한 정리 후 가능 — AS-IS orphan 위험 시정' },
        { name: 'USERGROUP_ID', effect: '멤버(FRM_USER_GROUP_MAP) 전부 삭제 후 그룹 마스터 삭제. 단일 트랜잭션(AS-IS tx=N 부분삭제 함정 흡수)' },
      ],
    },
  ],

  businessNotes: [
    'AUT0020 사용자그룹관리 = 권한 부여 단위인 그룹(FRM_USER_GROUP) + 그룹↔사용자 멤버(FRM_USER_GROUP_MAP, 복합키 USERGROUP_ID+USER_ID) 관리. USERGROUP_ID = 업무키(수정 불가).',
    'GROUP_TYPE = 코드값. 90=운영자그룹(관리자 화면 접근 판정). 실측 23개 중 90 이 14개(ADMIN_GROUP*) — 시스템/HR 운영 권한자. 그 외 10/20/30/51 은 의미 미확정 코드.',
    '멤버 추가/제거는 권한 변경 = 감사 대상. INSERT→USERGROUP GRANT, DELETE→USERGROUP REVOKE 를 P_FRM_AUTH_LOG(AS-IS AuthLoggerCommand) 로 같은 트랜잭션에 기록. 감사 누락 금지(컴플라이언스).',
    '삭제는 권한 바인딩(FRM_USERGROUP_AUTH_MAP) 역참조 가드 후 멤버 → 그룹을 단일 트랜잭션으로 삭제. AS-IS(MultiQuery tx=N 부분삭제 + 권한매핑 orphan) 위험을 TO-BE 에서 가드+트랜잭션으로 시정.',
    '생성 시 members 는 rowStatus 무관 전 행 INSERT(GRANT). 수정 시에는 rowStatus I(추가)/D(제거)만 반영하고 빈값·U 는 무변경 skip. 이미 멤버인 행 INSERT 는 중복방지로 skip.',
    '멤버 표의 로그인ID/성명(EMP_NM)/소속(ORG_NM)은 계정·재직뷰 조인 결과로 표시 전용 — 저장 컬럼이 아님. 멤버 본체는 (USERGROUP_ID, USER_ID) 만.',
  ],

  tables: [
    { name: 'FRM_USER_GROUP', label: '그룹 (부모)', columns: [
      { col: 'USERGROUP_ID',       type: 'VARCHAR2(80)',  nn: true,  key: 'PK',      desc: '사용자그룹ID = 업무키' },
      { col: 'USERGROUP_NM',       type: 'VARCHAR2(80)',  nn: true,  key: '',        desc: '그룹명' },
      { col: 'GROUP_TYPE',         type: 'VARCHAR2(2)',   nn: false, key: '',        desc: '그룹유형 코드 (90=운영자, 그 외 10/20/30/51)' },
      { col: 'COMPANY_CD',         type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '회사코드(인사영역) — 테넌트 키' },
      { col: 'BIGO',               type: 'VARCHAR2(150)', nn: false, key: '',        desc: '비고 (권한 범위 서술)' },
      { col: 'MOD_USER_ID',        type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID (JWT uid)' },
      { col: 'MOD_DATE',           type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
      { col: 'TARGET_COMPANY_CDS', type: 'VARCHAR2(150)', nn: false, key: '',        desc: '대상 회사코드 목록' },
    ]},
    { name: 'FRM_USER_GROUP_MAP', label: '그룹 멤버 (자식, 복합키)', columns: [
      { col: 'USERGROUP_ID', type: 'VARCHAR2(80)',  nn: true,  key: 'PK·FK(논리)', desc: '사용자그룹ID (→ FRM_USER_GROUP)' },
      { col: 'USER_ID',      type: 'NUMBER',        nn: true,  key: 'PK·FK(논리)', desc: '사용자ID (→ FRM_USER)' },
      { col: 'MOD_USER_ID',  type: 'NUMBER',        nn: true,  key: '',            desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',     type: 'DATE',          nn: true,  key: '',            desc: '최종 수정일시' },
      { col: 'NOTE',         type: 'VARCHAR2(20)',  nn: false, key: '',            desc: '비고' },
    ]},
  ],
};
