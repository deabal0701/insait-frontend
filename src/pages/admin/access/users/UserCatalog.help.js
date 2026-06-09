/**
 * UserCatalog.help.js — AUT0010 사용자관리 화면 도움말 (실행 SQL + 조건 + 업무주의 + 컬럼정보).
 * ★ [DEV-HELP] (2026-06-09, dspark): 임시 개발 편의용. 출처(SSOT) = UserRepository.java (수동 동기화).
 *   컬럼정보 출처 = 01-asis/database/extracts/columns.csv + constraints.csv 실측.
 */
export default {
  object: 'AUT0010',
  title: '사용자관리',
  table: 'FRM_USER (계정) + FRM_USER_EMP_MAP (계정↔사원) + FRM_USER_OPTION (옵션) ⋈ VI_FRM_PHM_EMP (재직뷰)',
  asOf: '2026-06-09',

  operations: [
    {
      key: 'list', label: '목록 조회 (검색·필터)',
      sql:
`SELECT USR.USER_ID, USR.LOGIN_ID, USR.COMPANY_CD, USR.EMAIL,
       TO_CHAR(USR.PWD_DATE,'YYYY-MM-DD') AS PWD_DATE, USR.STATUS_CD, USR.TRY_CNT, USR.INIT_YN,
       EMP.EMP_NM AS USER_NM,
       F_FRM_ORM_ORG_NM(EMP.ORG_ID, EMP.LOCALE_CD, XF_SYSDATE(0), '11') AS ORG_NM,
       MAP.MAP_ID, MAP.EMP_ID, MAP.BINDING_TYPE_CD
  FROM FRM_USER USR
  JOIN FRM_USER_EMP_MAP MAP ON USR.USER_ID = MAP.USER_ID
  JOIN VI_FRM_PHM_EMP EMP   ON MAP.EMP_ID = EMP.EMP_ID AND EMP.LOCALE_CD = 'KO'
 WHERE USR.STATUS_CD = 'Y'
 ORDER BY USR.LOGIN_ID ASC, USR.USER_ID ASC;

-- 총 건수(같은 WHERE):
SELECT COUNT(*)
  FROM FRM_USER USR
  JOIN FRM_USER_EMP_MAP MAP ON USR.USER_ID = MAP.USER_ID
  JOIN VI_FRM_PHM_EMP EMP   ON MAP.EMP_ID = EMP.EMP_ID AND EMP.LOCALE_CD = 'KO';`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND (UPPER(USR.LOGIN_ID) LIKE UPPER('입력값%') OR EMP.EMP_NM LIKE '%입력값%') — 로그인ID 앞부분 또는 성명 부분일치" },
        { name: 'statusCd', effect: "선택 시 AND USR.STATUS_CD = 'Y'|'N' (사용/잠금). 미지정 시 전체" },
        { name: 'companyCd', effect: 'AND USR.COMPANY_CD = :companyCd (미지정 시 세션값 fallback)' },
        { name: 'localeCd', effect: "EMP.LOCALE_CD = :localeCd (기본 'KO') — 사원 1건만 조인(중복 방지)" },
        { name: '정렬(sort)', effect: 'login_id / user_nm / status_cd / try_cnt / pwd_date + asc|desc. 기본 LOGIN_ID ASC' },
      ],
      note: '목록은 INNER JOIN (재직 활성자만). PASSWORD·주민번호(CTZ_NO)는 SELECT 에 없음(미노출). ORG_NM 은 함수 F_FRM_ORM_ORG_NM 으로 조직명 산출.',
    },
    {
      key: 'detail-def', label: '상세조회 ① 사용자 정의 (행 클릭)',
      sql:
`SELECT USR.USER_ID, USR.LOGIN_ID, USR.COMPANY_CD, USR.EMAIL,
       TO_CHAR(USR.PWD_DATE,'YYYY-MM-DD') AS PWD_DATE, USR.STATUS_CD, USR.TRY_CNT, USR.INIT_YN,
       EMP.EMP_NM AS USER_NM, F_FRM_ORM_ORG_NM(...) AS ORG_NM,
       MAP.MAP_ID, MAP.EMP_ID, MAP.BINDING_TYPE_CD
  FROM FRM_USER USR
  LEFT JOIN FRM_USER_EMP_MAP MAP ON USR.USER_ID = MAP.USER_ID
  LEFT JOIN VI_FRM_PHM_EMP EMP   ON MAP.EMP_ID = EMP.EMP_ID AND EMP.LOCALE_CD = 'KO'
 WHERE USR.USER_ID = 665773;`,
      conditions: [
        { name: 'USER_ID', effect: '행의 USER_ID(PK). 상세는 LEFT JOIN(매핑/사원이 없어도 계정은 표시 — 방어)' },
      ],
    },
    {
      key: 'detail-options', label: '상세조회 ② 사용자 옵션 (자식)',
      sql:
`SELECT OPTION_ID, USER_ID, ATTRIBUTE_NAME, ATTRIBUTE_VALUE
  FROM FRM_USER_OPTION
 WHERE USER_ID = 665773
 ORDER BY ATTRIBUTE_NAME;`,
      conditions: [
        { name: 'USER_ID', effect: '①정의 USER_ID. 개인 환경 옵션(키-값)' },
      ],
    },
    {
      key: 'create', label: '신규 (INSERT — 계정 → 사원매핑 → 옵션, 단일 트랜잭션) ※TEMP',
      sql:
`-- ① 중복 검사(loginId)
SELECT COUNT(*) FROM FRM_USER WHERE LOGIN_ID = '20250099' AND COMPANY_CD = '01';
-- ② 채번
SELECT S_FRM_SEQUENCE.NEXTVAL FROM DUAL;   -- 예: 23919350
-- ③ 계정 (PASSWORD = 랜덤 임시비번 SHA, INIT_YN='Y')
INSERT INTO FRM_USER
  (USER_ID, COMPANY_CD, LOGIN_ID, PASSWORD, EMAIL, PWD_DATE,
   STATUS_CD, TRY_CNT, INIT_YN, MOD_USER_ID, MOD_DATE)
VALUES
  (23919350, '01', '20250099', F_SHAENCRYPTOR('a8Xk2p'), 'user@co.kr', SYSDATE,
   'Y', 0, 'Y', 665773, SYSDATE);
-- ④ 사원 매핑
INSERT INTO FRM_USER_EMP_MAP (MAP_ID, USER_ID, EMP_ID, BINDING_TYPE_CD)
VALUES (S_FRM_SEQUENCE.NEXTVAL, 23919350, 800123, 'EMP');
-- ⑤ 옵션 (rowStatus='I' 행마다)
INSERT INTO FRM_USER_OPTION (OPTION_ID, USER_ID, ATTRIBUTE_NAME, ATTRIBUTE_VALUE)
VALUES (S_FRM_SEQUENCE.NEXTVAL, 23919350, 'theme', 'white');`,
      conditions: [
        { name: 'USER_ID / MAP_ID / OPTION_ID', effect: 'S_FRM_SEQUENCE.NEXTVAL 채번' },
        { name: 'PASSWORD', effect: 'F_SHAENCRYPTOR(랜덤 임시비번) — AS-IS S07 동일 SHA(로그인 P_FRM_LOGIN_CHECK 호환). 평문 미저장' },
        { name: 'MOD_USER_ID / MOD_DATE / PWD_DATE', effect: 'JWT uid + SYSDATE' },
        { name: '※ TEMP', effect: '정상 계정 생성은 인사발령(CAM0050) 확정 자동 — [신규]는 편의용 임시 기능(업무주의 참조)' },
      ],
    },
    {
      key: 'update', label: '수정 (UPDATE — LOGIN_ID/PASSWORD 보존, 옵션 I/U/D)',
      sql:
`-- 계정 (LOGIN_ID 업무키·PASSWORD 는 보존 — 비번은 [비번초기화] 경로로만)
UPDATE FRM_USER
   SET EMAIL = 'new@co.kr', STATUS_CD = 'Y', TRY_CNT = 0, INIT_YN = 'N',
       MOD_USER_ID = 665773, MOD_DATE = SYSDATE
 WHERE USER_ID = 23919350;

-- 사원매핑 구분 변경(있을 때)
UPDATE FRM_USER_EMP_MAP SET BINDING_TYPE_CD = 'EMP' WHERE MAP_ID = 70021;

-- 옵션 자식: rowStatus 별 I/U/D (WHERE OPTION_ID = :id)`,
      conditions: [
        { name: 'LOGIN_ID(업무키) / PASSWORD', effect: '수정 대상 아님(보존). 비밀번호는 별도 [비번초기화] 동작으로만 변경' },
        { name: '옵션 rowStatus', effect: 'I=INSERT / U=UPDATE / D=DELETE' },
      ],
    },
    {
      key: 'password-reset', label: '비밀번호 초기화 (S2 — 랜덤 임시비번)',
      sql:
`UPDATE FRM_USER
   SET PASSWORD = F_SHAENCRYPTOR('rZ7q1m'),   -- 랜덤 임시비번
       INIT_YN = 'Y', STATUS_CD = 'Y', TRY_CNT = 0, PWD_DATE = SYSDATE,
       MOD_USER_ID = 665773, MOD_DATE = SYSDATE
 WHERE USER_ID = 23919350;`,
      conditions: [
        { name: 'USER_ID', effect: '대상 계정. 응답으로 임시비번(평문)을 1회 전달 → 사용자에게 안내. INIT_YN=Y 라 최초 로그인 시 변경 강제' },
        { name: 'TRY_CNT=0 / STATUS_CD=Y', effect: '잠금 해제 + 시도횟수 초기화(S2 보안 시정 — 주민번호 기반 폐기)' },
      ],
    },
    {
      key: 'delete', label: '삭제 (DELETE — 그룹멤버 가드 → 매핑/옵션 → 계정)',
      sql:
`-- ① 삭제 가드: 그룹 멤버십 있으면 차단
SELECT COUNT(*) FROM FRM_USER_GROUP_MAP WHERE USER_ID = 23919350;
-- ② 자식 → 계정 (단일 트랜잭션)
DELETE FROM FRM_USER_OPTION  WHERE USER_ID = 23919350;
DELETE FROM FRM_USER_EMP_MAP WHERE USER_ID = 23919350;
DELETE FROM FRM_USER         WHERE USER_ID = 23919350;`,
      conditions: [
        { name: '그룹멤버 가드(S4)', effect: 'FRM_USER_GROUP_MAP 에 멤버로 있으면 삭제 차단(역참조 보호). 먼저 그룹에서 제외 필요' },
        { name: 'USER_ID', effect: '옵션·사원매핑 자식을 먼저 지우고 계정 삭제. 단일 트랜잭션' },
      ],
    },
  ],

  businessNotes: [
    'AUT0010 사용자관리 = 로그인 계정 관리. 계정(FRM_USER) + 계정↔사원 매핑(FRM_USER_EMP_MAP) + 개인옵션(FRM_USER_OPTION). 목록은 재직뷰(VI_FRM_PHM_EMP) INNER JOIN.',
    'LOGIN_ID = 사번 = 업무키(수정 불가). ★ 정상 계정 생성은 인사발령(채용발령 CAM0050) "발령 확정" 시 자동(P_CAM_EMP_NO_CREATE → P_FRM_USER_CREATE). 화면 [신규]는 편의용 TEMP 기능이다.',
    'PASSWORD·주민번호(CTZ_NO)는 화면·응답에 절대 미노출. 비밀번호는 F_SHAENCRYPTOR(SHA)로 저장(평문 미보관).',
    '비밀번호 초기화 = 랜덤 임시비번 발급 + INIT_YN=Y(최초 로그인 시 변경 강제) + 잠금 해제(TRY_CNT=0, STATUS_CD=Y) — S2 보안 시정(주민번호 기반 초기비번 폐기).',
    '삭제는 그룹 멤버십(FRM_USER_GROUP_MAP) 역참조 가드 후 매핑·옵션·계정을 단일 트랜잭션으로 삭제(S4).',
    '목록=INNER JOIN(재직 활성자만), 상세=LEFT JOIN(매핑/사원이 없어도 계정 표시 — 방어). BINDING_TYPE_CD=계정↔사원 연결 유형(EMP=정규사원).',
  ],

  tables: [
    { name: 'FRM_USER', label: '계정 (부모)', columns: [
      { col: 'USER_ID',         type: 'NUMBER',        nn: true,  key: 'PK',      desc: '사용자 ID (시퀀스)' },
      { col: 'COMPANY_CD',      type: 'VARCHAR2(50)',  nn: true,  key: '',        desc: '회사코드' },
      { col: 'LOGIN_ID',        type: 'VARCHAR2(80)',  nn: false, key: 'UK(논리)', desc: '로그인ID = 사번 = 업무키' },
      { col: 'PASSWORD',        type: 'VARCHAR2(450)', nn: false, key: '',        desc: '비밀번호 SHA (미노출·보존)' },
      { col: 'EMAIL',           type: 'VARCHAR2(150)', nn: false, key: '',        desc: '이메일' },
      { col: 'PWD_DATE',        type: 'DATE',          nn: false, key: '',        desc: '비밀번호 변경일' },
      { col: 'STATUS_CD',       type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '상태 (Y=사용/N=잠금)' },
      { col: 'TRY_CNT',         type: 'NUMBER',        nn: false, key: '',        desc: '접속 시도 횟수' },
      { col: 'MOD_USER_ID',     type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID (JWT uid)' },
      { col: 'MOD_DATE',        type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
      { col: 'INIT_YN',         type: 'VARCHAR2(2)',   nn: false, key: '',        desc: '초기비번 여부(Y=최초 로그인 시 변경 강제)' },
      { col: 'DEVICE_KEY',      type: 'VARCHAR2(4000)',nn: false, key: '',        desc: '디바이스 키' },
      { col: 'TOKEN',           type: 'VARCHAR2(4000)',nn: false, key: '',        desc: '토큰' },
      { col: 'TOKEN_DATE',      type: 'DATE',          nn: false, key: '',        desc: '토큰 일시' },
      { col: 'PASSWORD_BACKUP', type: 'VARCHAR2(450)', nn: false, key: '',        desc: '비밀번호 백업' },
    ]},
    { name: 'FRM_USER_EMP_MAP', label: '계정↔사원 매핑 (자식)', columns: [
      { col: 'MAP_ID',          type: 'NUMBER',        nn: true,  key: 'PK',      desc: '매핑 ID (시퀀스)' },
      { col: 'USER_ID',         type: 'NUMBER',        nn: true,  key: 'FK(논리)', desc: '계정 ID' },
      { col: 'COMPANY_CD',      type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '회사코드' },
      { col: 'BINDING_TYPE_CD', type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '연결 유형 (EMP=정규사원 등)' },
      { col: 'EMP_ID',          type: 'NUMBER',        nn: true,  key: '',        desc: '사원 ID (VI_FRM_PHM_EMP 조인키)' },
      { col: 'MOD_USER_ID',     type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',        type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
    { name: 'FRM_USER_OPTION', label: '사용자 옵션 (자식)', columns: [
      { col: 'OPTION_ID',       type: 'NUMBER',        nn: true,  key: 'PK',      desc: '옵션 ID (시퀀스)' },
      { col: 'USER_ID',         type: 'NUMBER',        nn: true,  key: 'FK(논리)', desc: '계정 ID' },
      { col: 'ATTRIBUTE_NAME',  type: 'VARCHAR2(80)',  nn: false, key: '',        desc: '옵션 키 (theme 등)' },
      { col: 'ATTRIBUTE_VALUE', type: 'VARCHAR2(750)', nn: false, key: '',        desc: '옵션 값' },
      { col: 'MOD_USER_ID',     type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID' },
      { col: 'MOD_DATE',        type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
  ],
};
