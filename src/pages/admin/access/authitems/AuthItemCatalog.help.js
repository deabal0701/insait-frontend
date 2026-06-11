/**
 * AuthItemCatalog.help.js — AUT0040 권한관리 화면 도움말 (실행 SQL + 조건 + 업무주의 + 컬럼정보).
 * ★ [DEV-HELP] (2026-06-11, dspark): 임시 개발 편의용. 출처(SSOT) = AuthItemRepository.java + AuthItemService.java (수동 동기화).
 *   업무 맥락 출처 = 01-asis/manuals/01-meta-management/access-control/07_authority-management.md (§2.0/2.4/2.5).
 *   컬럼정보 출처 = 01-asis/database/extracts/columns.csv 실측.
 */
export default {
  object: 'AUT0040',
  title: '권한관리',
  table: 'FRM_AUTH_ITEM (권한정의) + FRM_USERGROUP_AUTH_MAP(그룹바인딩) + FRM_AUTH_USER_BINDING(사용자바인딩) + FRM_AUTH_MENU_BINDING_W(메뉴바인딩, 운영)',
  asOf: '2026-06-11',

  // ★ 꼭 알아야 할 / 암기 필요 (이슈·업무 핵심) — 도움말 상단 강조 배너. <strong> 허용.
  callouts: [
    { tone: 'warn', text: '<strong>권한(auth_item) = 메뉴 가시성의 단위</strong>입니다(사용자그룹이 아님). 권한 1건이 메뉴들을 골라 담은 "바구니(컨텍스트)"이며, LNB 트리는 사용자가 선택한 활성 컨텍스트 1개의 메뉴만 표시합니다(매뉴얼 07 §2.0).' },
    { tone: 'warn', text: '메뉴 바인딩 운영 테이블 = <strong>FRM_AUTH_MENU_BINDING_W</strong> (21,583행). 구버전 FRM_AUTH_MENU_BINDING(24행)은 dead code 라 사용하지 않습니다(매뉴얼 07 §1.2).' },
    { tone: 'danger', text: '바인딩 추가/제거(I/D)는 저장 시 <strong>감사 로그</strong>가 동반됩니다 — P_FRM_AUTH_LOG 프로시저로 AUTHGROUP/AUTHUSER/AUTHMENU × GRANT(추가)/REVOKE(제거) 기록(AS-IS AuthLoggerCommand 보존, S5).' },
  ],

  operations: [
    {
      key: 'list', label: '목록 조회 (검색·필터)',
      sql:
`SELECT AUTH_ITEM_ID, AUTH_ITEM_NAME, NOTE, AUTH_ITEM_TYPE, ETC_NOTE
  FROM FRM_AUTH_ITEM
 -- WHERE (검색·유형 조건은 아래 conditions 참조)
 ORDER BY AUTH_ITEM_NAME ASC, AUTH_ITEM_ID ASC;

-- 총 건수(같은 WHERE):
SELECT COUNT(*) FROM FRM_AUTH_ITEM;`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND (UPPER(AUTH_ITEM_NAME) LIKE UPPER('%입력값%') OR NOTE LIKE '%입력값%') — 권한이름/설명 부분일치" },
        { name: 'authItemType', effect: 'AND AUTH_ITEM_TYPE = :authItemType — 미지정 시 전체 (운영 전건 01)' },
        { name: '정렬(sort)', effect: 'auth_item_name / auth_item_type / auth_item_id + asc|desc (화이트리스트). 기본 AUTH_ITEM_NAME ASC, AUTH_ITEM_ID ASC' },
      ],
      note: '단일 테이블 조회(바인딩 미조인). 권한 정의(이름/유형/설명)만 표시. 바인딩 건수는 상세 진입(expand) 시 별도 조회.',
    },
    {
      key: 'detail-def', label: '상세조회 ① 권한 정의 (행 클릭)',
      sql:
`SELECT AUTH_ITEM_ID, AUTH_ITEM_NAME, NOTE, AUTH_ITEM_TYPE, ETC_NOTE
  FROM FRM_AUTH_ITEM
 WHERE AUTH_ITEM_ID = :id;`,
      conditions: [
        { name: 'AUTH_ITEM_ID', effect: '행의 AUTH_ITEM_ID(PK). 없으면 NotFound. 그룹/사용자/메뉴 바인딩은 expand=groups,users,menus 로 함께 조회' },
      ],
    },
    {
      key: 'detail-groups', label: '상세조회 ② 그룹 바인딩 (자식)',
      sql:
`SELECT B.BINDING_ID, B.AUTH_ITEM_ID, B.USERGROUP_ID, UG.USERGROUP_NM, B.COMPANY_CD
  FROM FRM_USERGROUP_AUTH_MAP B
  LEFT JOIN FRM_USER_GROUP UG ON UG.USERGROUP_ID = B.USERGROUP_ID
 WHERE B.AUTH_ITEM_ID = :id
 ORDER BY UG.USERGROUP_NM, B.USERGROUP_ID;`,
      conditions: [
        { name: 'AUTH_ITEM_ID', effect: '①정의 AUTH_ITEM_ID. 이 권한이 부여된 사용자그룹 목록' },
        { name: 'LEFT JOIN FRM_USER_GROUP', effect: '그룹명(USERGROUP_NM) 표시용. 그룹 정의가 없어도 바인딩 행은 표시(방어)' },
      ],
    },
    {
      key: 'detail-users', label: '상세조회 ③ 사용자 바인딩 (자식)',
      sql:
`SELECT B.BINDING_ID, B.AUTH_ITEM_ID, B.USER_ID, USR.LOGIN_ID, EMP.EMP_NM AS EMP_NM
  FROM FRM_AUTH_USER_BINDING B
  JOIN FRM_USER USR ON USR.USER_ID = B.USER_ID
  LEFT JOIN FRM_USER_EMP_MAP EM ON EM.USER_ID = USR.USER_ID
  LEFT JOIN VI_FRM_PHM_EMP EMP ON EMP.EMP_ID = EM.EMP_ID AND EMP.LOCALE_CD = 'KO'
 WHERE B.AUTH_ITEM_ID = :id
 ORDER BY USR.LOGIN_ID;`,
      conditions: [
        { name: 'AUTH_ITEM_ID', effect: '①정의 AUTH_ITEM_ID. 이 권한이 직접 부여된 개별 사용자 목록' },
        { name: 'JOIN FRM_USER / LEFT JOIN 사원', effect: '로그인ID(USR.LOGIN_ID)는 INNER, 성명(EMP_NM)은 재직뷰 LEFT JOIN(LOCALE_CD=KO). 직접 바인딩=그룹엔 없지만 1명에게만 주는 예외 통로(§2.5)' },
      ],
    },
    {
      key: 'detail-menus', label: '상세조회 ④ 메뉴 바인딩 (자식, 운영 _W)',
      sql:
`SELECT B.BINDING_ID, B.AUTH_ITEM_ID, B.MENU_ID, M.MENU_NM, B.COMPANY_CD, B.USE_YN
  FROM FRM_AUTH_MENU_BINDING_W B
  LEFT JOIN FRM_MENU M ON M.MENU_ID = B.MENU_ID
 WHERE B.AUTH_ITEM_ID = :id
 ORDER BY M.MENU_NM, B.MENU_ID;`,
      conditions: [
        { name: 'AUTH_ITEM_ID', effect: '①정의 AUTH_ITEM_ID. 이 권한(컨텍스트)에 ☑ 된 메뉴 목록 = LNB 가시 메뉴 출처' },
        { name: '운영 테이블 _W', effect: 'FRM_AUTH_MENU_BINDING_W(운영). 구버전 FRM_AUTH_MENU_BINDING(24행)은 dead code(§1.2)' },
      ],
    },
    {
      key: 'create', label: '신규 (INSERT — 권한 정의 → 3 바인딩 전건 GRANT, 단일 트랜잭션)',
      sql:
`-- ① 채번
SELECT S_FRM_SEQUENCE.NEXTVAL FROM DUAL;   -- 예: 23918043
-- ② 권한 정의 (AUTH_ITEM_TYPE 미지정 시 '01' 기본)
INSERT INTO FRM_AUTH_ITEM
  (AUTH_ITEM_ID, AUTH_ITEM_NAME, NOTE, AUTH_ITEM_TYPE, ETC_NOTE, MOD_USER_ID, MOD_DATE)
VALUES
  (23918043, 'TEST_PDS_AUTH', '[V] 설명', '01', NULL, 665773, SYSDATE);
-- ③ 그룹 바인딩 (rowStatus 무관 — 신규는 전 행 INSERT + AUTHGROUP GRANT 로그)
INSERT INTO FRM_USERGROUP_AUTH_MAP
  (BINDING_ID, AUTH_ITEM_ID, USERGROUP_ID, COMPANY_CD, MOD_USER_ID, MOD_DATE)
VALUES (S_FRM_SEQUENCE.NEXTVAL, 23918043, 'ADMIN_GROUP', '01', 665773, SYSDATE);
-- ④ 사용자 바인딩 (+ AUTHUSER GRANT 로그)
INSERT INTO FRM_AUTH_USER_BINDING
  (BINDING_ID, USER_ID, AUTH_ITEM_ID, MOD_USER_ID, MOD_DATE)
VALUES (S_FRM_SEQUENCE.NEXTVAL, 665773, 23918043, 665773, SYSDATE);
-- ⑤ 메뉴 바인딩 _W (+ AUTHMENU GRANT 로그. USE_YN 미지정 시 'Y')
INSERT INTO FRM_AUTH_MENU_BINDING_W
  (BINDING_ID, AUTH_ITEM_ID, COMPANY_CD, MENU_ID, USE_YN, MOD_USER_ID, MOD_DATE)
VALUES (S_FRM_SEQUENCE.NEXTVAL, 23918043, '01', 'TEST_PDS_TEST1', 'Y', 665773, SYSDATE);`,
      conditions: [
        { name: 'AUTH_ITEM_ID / BINDING_ID', effect: 'S_FRM_SEQUENCE.NEXTVAL 채번 (메타 자원·권한 전역 공유 시퀀스)' },
        { name: 'AUTH_ITEM_TYPE', effect: "미지정/공백이면 '01'(메뉴접근권한) 기본값 부여" },
        { name: '신규의 바인딩', effect: 'create 시 rowStatus 와 무관하게 전 행 INSERT — 각 바인딩마다 GRANT 감사 로그' },
        { name: 'USE_YN(메뉴)', effect: "미지정/공백이면 'Y'" },
        { name: 'MOD_USER_ID / MOD_DATE', effect: 'JWT uid(parseUserId) + SYSDATE' },
      ],
      note: '권한이름(AUTH_ITEM_NAME) 필수. existsByName 으로 중복 이름 검사 가능(COUNT(*) WHERE AUTH_ITEM_NAME = :nm).',
    },
    {
      key: 'update', label: '수정 (UPDATE 정의 + 바인딩 rowStatus I/D)',
      sql:
`-- 권한 정의
UPDATE FRM_AUTH_ITEM
   SET AUTH_ITEM_NAME = :nm, NOTE = :note, AUTH_ITEM_TYPE = :type,
       ETC_NOTE = :etc, MOD_USER_ID = :modUserId, MOD_DATE = SYSDATE
 WHERE AUTH_ITEM_ID = :id;

-- 바인딩: rowStatus 'I' = INSERT(+GRANT 로그) / 'D' = DELETE(+REVOKE 로그)
-- (그룹) I → INSERT INTO FRM_USERGROUP_AUTH_MAP (...);  D → DELETE WHERE BINDING_ID = :id
-- (사용자) I → INSERT INTO FRM_AUTH_USER_BINDING (...);  D → DELETE WHERE BINDING_ID = :id
-- (메뉴)  I → INSERT INTO FRM_AUTH_MENU_BINDING_W (...); D → DELETE WHERE BINDING_ID = :id`,
      conditions: [
        { name: 'rowStatus', effect: "각 바인딩 행: 'I'=추가(GRANT) / 'D'=제거(REVOKE). 그 외(빈값/U)는 변경 없음" },
        { name: 'D 의 BINDING_ID', effect: 'D 행은 BINDING_ID 필수(없으면 BadRequest). DELETE … WHERE BINDING_ID = :id 단건 삭제' },
        { name: 'I 의 키 누락 가드', effect: '그룹=USERGROUP_ID, 메뉴=MENU_ID 가 공백이면 skip / 사용자=USER_ID null 이면 skip' },
        { name: 'AUTH_ITEM_NAME', effect: '수정에서도 권한이름 필수. AUTH_ITEM_ID(PK)는 변경 대상 아님' },
      ],
      note: '정의 UPDATE + 3 바인딩 I/D 가 단일 @Transactional. 각 I/D 마다 P_FRM_AUTH_LOG 감사 동반.',
    },
    {
      key: 'delete', label: '삭제 (DELETE — 3 바인딩 cascade → 권한 정의)',
      sql:
`-- 3종 바인딩을 먼저 전건 삭제(orphan 방지) → 권한 정의 (단일 트랜잭션)
DELETE FROM FRM_USERGROUP_AUTH_MAP   WHERE AUTH_ITEM_ID = :id;
DELETE FROM FRM_AUTH_USER_BINDING    WHERE AUTH_ITEM_ID = :id;
DELETE FROM FRM_AUTH_MENU_BINDING_W  WHERE AUTH_ITEM_ID = :id;
DELETE FROM FRM_AUTH_ITEM            WHERE AUTH_ITEM_ID = :id;`,
      conditions: [
        { name: 'AUTH_ITEM_ID', effect: '대상 권한. 존재하지 않으면 NotFound' },
        { name: 'cascade 순서', effect: '그룹·사용자·메뉴(_W) 바인딩을 AUTH_ITEM_ID 로 전건 삭제 후 권한 정의 삭제. 단일 @Transactional' },
      ],
      note: '바인딩 by-item 일괄 DELETE(deleteGroupBindingsByItem/…)는 개별 REVOKE 로그 없이 cascade. UI 확인창에서 "바인딩까지 함께 삭제" 안내.',
    },
  ],

  businessNotes: [
    'AUT0040 권한관리 = 권한 정의(FRM_AUTH_ITEM) + 3종 바인딩(그룹 FRM_USERGROUP_AUTH_MAP / 사용자 FRM_AUTH_USER_BINDING / 메뉴 FRM_AUTH_MENU_BINDING_W). 권한이 "메뉴 가시성의 단위(컨텍스트)"다 — 사용자그룹이 아님(§2.0 ①).',
    '권한 부여 = 합집합(OR). 우선순위 없음, deny 없음(grant-only). 내 권한 = (속한 모든 그룹의 권한) UNION (직접 부여 권한). 상이 그룹이어도 더해질 뿐 이기고 지지 않음(§2.5).',
    '단, 권한 "보유"(합집합)와 메뉴 "표시"(활성 컨텍스트 1개)는 층이 다름. LNB 는 우측 상단 콤보로 선택한 권한 1개의 메뉴만 표시(합집합 표시 아님).',
    '메뉴 바인딩 운영 테이블 = FRM_AUTH_MENU_BINDING_W(21,583행, _W). 구버전 FRM_AUTH_MENU_BINDING(24행)은 dead code — 사용 금지(§1.2).',
    '메뉴 그룹(MENU_GROUP) = 물리 트리 2개(SYS_ADMIN 시스템총괄 / PRIVATE_GROUP 개인)뿐. 우측 상단 컨텍스트(권한) 콤보(N개)와는 다른 차원 — 이름이 겹쳐도 혼동 금지(§2.4).',
    '권한유형(AUTH_ITEM_TYPE): 01=메뉴접근권한(운영 전건, 신규 기본값) / 02=정형뷰접근권한(운영 미사용 — 폐기 검토)(§1.4.1).',
    '바인딩 추가(I)/제거(D)마다 감사 로그(P_FRM_AUTH_LOG → FRM_AUTH_LOG): AUTHGROUP/AUTHUSER/AUTHMENU × GRANT/REVOKE. AS-IS AuthLoggerCommand 동등 보존(S5).',
    '신규/수정/삭제는 권한 정의 + 3 바인딩이 단일 @Transactional. 삭제는 3 바인딩을 AUTH_ITEM_ID 로 cascade 후 정의 삭제(orphan 방지). 사용자 바인딩만 COMPANY_CD 컬럼이 없음(그룹/메뉴는 있음).',
  ],

  tables: [
    { name: 'FRM_AUTH_ITEM', label: '권한 정의 (부모)', columns: [
      { col: 'AUTH_ITEM_ID',   type: 'NUMBER',       nn: true,  key: 'PK', desc: '권한 ID (S_FRM_SEQUENCE)' },
      { col: 'AUTH_ITEM_NAME', type: 'VARCHAR2(80)', nn: true,  key: '',   desc: '권한이름 (필수, 예: ACCESS_ADMIN_GROUP)' },
      { col: 'NOTE',           type: 'VARCHAR2(750)',nn: false, key: '',   desc: '설명 ([V] prefix 등)' },
      { col: 'AUTH_ITEM_TYPE', type: 'VARCHAR2(80)', nn: false, key: '',   desc: '권한유형 (01=메뉴접근/02=정형뷰미사용, 기본 01)' },
      { col: 'ETC_NOTE',       type: 'VARCHAR2(20)', nn: false, key: '',   desc: '기타' },
      { col: 'MOD_USER_ID',    type: 'NUMBER',       nn: true,  key: '',   desc: '최종 수정자 ID (JWT uid)' },
      { col: 'MOD_DATE',       type: 'DATE',         nn: true,  key: '',   desc: '최종 수정일시' },
    ]},
    { name: 'FRM_USERGROUP_AUTH_MAP', label: '그룹 바인딩 (자식)', columns: [
      { col: 'BINDING_ID',   type: 'NUMBER',       nn: true,  key: 'PK',      desc: '바인딩 ID (S_FRM_SEQUENCE)' },
      { col: 'AUTH_ITEM_ID', type: 'NUMBER',       nn: false, key: 'FK(논리)', desc: '권한 ID' },
      { col: 'USERGROUP_ID', type: 'VARCHAR2(80)', nn: false, key: '',        desc: '사용자그룹 ID (FRM_USER_GROUP 조인키)' },
      { col: 'COMPANY_CD',   type: 'VARCHAR2(50)', nn: false, key: '',        desc: '회사코드' },
      { col: 'MOD_USER_ID',  type: 'NUMBER',       nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',     type: 'DATE',         nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
    { name: 'FRM_AUTH_USER_BINDING', label: '사용자 바인딩 (자식)', columns: [
      { col: 'BINDING_ID',   type: 'NUMBER', nn: true,  key: 'PK',      desc: '바인딩 ID (S_FRM_SEQUENCE)' },
      { col: 'USER_ID',      type: 'NUMBER', nn: true,  key: 'FK(논리)', desc: '사용자(계정) ID (FRM_USER 조인키)' },
      { col: 'AUTH_ITEM_ID', type: 'NUMBER', nn: true,  key: 'FK(논리)', desc: '권한 ID' },
      { col: 'MOD_USER_ID',  type: 'NUMBER', nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',     type: 'DATE',   nn: true,  key: '',        desc: '최종 수정일시 (※ COMPANY_CD 컬럼 없음)' },
    ]},
    { name: 'FRM_AUTH_MENU_BINDING_W', label: '메뉴 바인딩 (자식, 운영 _W)', columns: [
      { col: 'BINDING_ID',   type: 'NUMBER',       nn: true,  key: 'PK',      desc: '바인딩 ID (S_FRM_SEQUENCE)' },
      { col: 'AUTH_ITEM_ID', type: 'NUMBER',       nn: true,  key: 'FK(논리)', desc: '권한 ID' },
      { col: 'COMPANY_CD',   type: 'VARCHAR2(50)', nn: true,  key: '',        desc: '회사코드' },
      { col: 'MENU_ID',      type: 'VARCHAR2(30)', nn: true,  key: '',        desc: '메뉴 ID (FRM_MENU 조인키)' },
      { col: 'USE_YN',       type: 'VARCHAR2(10)', nn: false, key: '',        desc: '사용 여부 (기본 Y)' },
      { col: 'MOD_USER_ID',  type: 'NUMBER',       nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',     type: 'DATE',         nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
  ],
};
