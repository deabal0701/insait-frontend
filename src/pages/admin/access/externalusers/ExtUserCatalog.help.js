/**
 * ExtUserCatalog.help.js — AUT0100 외부사용자관리 화면 도움말 (실행 SQL + 조건 + 업무주의 + 컬럼정보).
 * ★ [DEV-HELP] (2026-06-11, dspark): 임시 개발 편의용. 출처(SSOT) = ExtUserRepository.java (수동 동기화).
 *   업무 맥락 = 01-asis/manuals/01-meta-management/access-control/14_external-user_aut0100.md.
 *   ★ 보안: PASSWORD_VIEW(평문 비번)·CTZ_NO(주민번호)는 SELECT 미포함(S1/S3) — SQL 에도 없음.
 */
export default {
  object: 'AUT0100',
  title: '외부사용자관리',
  table: 'FRM_EXT_USER_INFO (외부사용자) + FRM_USER (연결 로그인 계정)',
  asOf: '2026-06-11',

  // ★ 꼭 알아야 할 / 암기 필요 (이슈·보안) — 도움말 상단 강조 배너. <strong> 허용.
  callouts: [
    { tone: 'danger', text: '<strong>S1: PASSWORD_VIEW(평문 비번)는 저장·노출하지 않습니다.</strong> AS-IS 의 평문 비번 컬럼은 TO-BE 에서 폐기 — SELECT·INSERT·UPDATE 어디에도 PASSWORD_VIEW 가 없습니다. 로그인 비번은 FRM_USER.PASSWORD(SHA)만 존재.' },
    { tone: 'danger', text: '<strong>S3: 주민번호(CTZ_NO)는 응답·화면에 미노출.</strong> SELECT 컬럼에서 제외되며, 입력(생성/수정) 시에만 갱신합니다 (수정은 NVL — 미입력 시 기존값 보존).' },
    { tone: 'warn', text: 'S2: 비밀번호 초기화 = <strong>랜덤 임시비번</strong>(F_SHAENCRYPTOR) 발급 + INIT_YN=Y(최초 로그인 시 변경 강제). AS-IS 초기비번=주민번호 앞6자리(생년월일) 규칙은 폐기.' },
    { tone: 'warn', text: '비밀번호 초기화는 <strong>연결 로그인 계정(FRM_USER, USER_ID = EXT_USER_ID)</strong>이 있어야 동작합니다. 갱신행 0 이면 연결 계정 없음(외부사용자 마스터만 존재) → 실패 안내.' },
  ],

  operations: [
    {
      key: 'list', label: '목록 조회 (검색·필터)',
      sql:
`SELECT EXT.EXT_USER_ID, EXT.USER_NM, EXT.COMPANY_CD, USR.LOGIN_ID,
       EXT.TEL_NO1, EXT.TEL_NO2, EXT.COMPANY_NM, EXT.DEPT_NM, EXT.POS_NM,
       EXT.DUTY_NM, EXT.TYPE_CD, EXT.MAN_TYPE_CD
  FROM FRM_EXT_USER_INFO EXT
  LEFT JOIN FRM_USER USR ON USR.USER_ID = EXT.EXT_USER_ID
 -- (검색·필터 조건은 아래 conditions 참조)
 ORDER BY EXT.USER_NM ASC, EXT.EXT_USER_ID ASC;

-- 총 건수(같은 WHERE):
SELECT COUNT(*)
  FROM FRM_EXT_USER_INFO EXT
  LEFT JOIN FRM_USER USR ON USR.USER_ID = EXT.EXT_USER_ID;`,
      conditions: [
        { name: '검색(q)', effect: "입력 시 AND (EXT.USER_NM LIKE '%입력값%' OR UPPER(USR.LOGIN_ID) LIKE UPPER('%입력값%')) — 성명 또는 로그인ID 부분일치" },
        { name: 'companyCd', effect: 'AND EXT.COMPANY_CD = :companyCd (지정 시)' },
        { name: 'manTypeCd', effect: 'AND EXT.MAN_TYPE_CD = :manTypeCd (관리주체 — 지정 시)' },
        { name: '정렬(sort)', effect: 'user_nm / login_id / man_type_cd / company_nm + asc|desc (화이트리스트). 기본 EXT.USER_NM ASC, 동률 시 EXT_USER_ID ASC' },
        { name: '페이지(page/size)', effect: '기본 page=1, size=50' },
      ],
      note: 'FRM_USER 는 LEFT JOIN (연결 로그인 계정이 없어도 외부사용자 표시). ★ PASSWORD_VIEW(평문 비번)·CTZ_NO(주민번호)는 SELECT 에 없음(S1/S3 미노출).',
    },
    {
      key: 'detail', label: '상세조회 (행 클릭)',
      sql:
`SELECT EXT.EXT_USER_ID, EXT.USER_NM, EXT.COMPANY_CD, USR.LOGIN_ID,
       EXT.TEL_NO1, EXT.TEL_NO2, EXT.COMPANY_NM, EXT.DEPT_NM, EXT.POS_NM,
       EXT.DUTY_NM, EXT.TYPE_CD, EXT.MAN_TYPE_CD
  FROM FRM_EXT_USER_INFO EXT
  LEFT JOIN FRM_USER USR ON USR.USER_ID = EXT.EXT_USER_ID
 WHERE EXT.EXT_USER_ID = :id;`,
      conditions: [
        { name: 'EXT_USER_ID', effect: '행의 EXT_USER_ID(PK). 목록과 동일 SELECT 컬럼(flat ExtUserRow) — 서브컬렉션 없음' },
        { name: 'CTZ_NO', effect: '응답에 미포함(S3). 편집 화면에서는 빈값으로 두고, 입력 시에만 갱신' },
      ],
    },
    {
      key: 'create', label: '신규 (INSERT — FRM_EXT_USER_INFO 단일행)',
      sql:
`-- 채번
SELECT S_FRM_SEQUENCE.NEXTVAL FROM DUAL;   -- 예: 23919350

-- 외부사용자 마스터 (★ PASSWORD_VIEW 없음. CTZ_NO 는 입력 시에만 저장)
INSERT INTO FRM_EXT_USER_INFO
  (EXT_USER_ID, USER_NM, COMPANY_CD, CTZ_NO, TEL_NO1, TEL_NO2,
   COMPANY_NM, DEPT_NM, POS_NM, DUTY_NM, TYPE_CD, MAN_TYPE_CD,
   MOD_USER_ID, MOD_DATE)
VALUES
  (23919350, '홍길동', '01', :ctzNo, '010-0000-0000', NULL,
   '○○테크', '인프라팀', '과장', '파트장', :typeCd, :manTypeCd,
   665773, SYSDATE);`,
      conditions: [
        { name: 'EXT_USER_ID', effect: 'S_FRM_SEQUENCE.NEXTVAL 채번 (PK)' },
        { name: 'CTZ_NO', effect: '입력 시에만 저장(평문 주민번호 — 응답 미노출). 미입력 시 NULL' },
        { name: 'PASSWORD_VIEW', effect: '★ INSERT 컬럼에 없음 — 평문 비번 저장 폐기(S1)' },
        { name: 'MOD_USER_ID / MOD_DATE', effect: 'JWT uid + SYSDATE' },
        { name: 'body', effect: 'flat(ExtUserWrite) — 서브컬렉션 없는 단일 폼' },
      ],
    },
    {
      key: 'update', label: '수정 (UPDATE — CTZ_NO 는 NVL 보존)',
      sql:
`UPDATE FRM_EXT_USER_INFO
   SET USER_NM = :userNm, COMPANY_CD = :companyCd,
       CTZ_NO = NVL(:ctzNo, CTZ_NO),   -- 입력 시에만 갱신, 미입력(null) 시 기존값 보존
       TEL_NO1 = :telNo1, TEL_NO2 = :telNo2, COMPANY_NM = :companyNm,
       DEPT_NM = :deptNm, POS_NM = :posNm, DUTY_NM = :dutyNm,
       TYPE_CD = :typeCd, MAN_TYPE_CD = :manTypeCd,
       MOD_USER_ID = :modUserId, MOD_DATE = SYSDATE
 WHERE EXT_USER_ID = :id;`,
      conditions: [
        { name: 'CTZ_NO', effect: 'NVL(:ctzNo, CTZ_NO) — 미입력 시 기존값 보존(평문 주민번호 불필요 입력 방지, S3)' },
        { name: 'PASSWORD_VIEW', effect: '★ UPDATE SET 에 없음 — 평문 비번 저장 폐기(S1)' },
        { name: 'EXT_USER_ID', effect: '대상 행(PK). 단일행 UPDATE' },
      ],
    },
    {
      key: 'password-reset', label: '비밀번호 초기화 (S2 — 랜덤 임시비번, FRM_USER 갱신)',
      sql:
`-- 외부사용자 로그인 계정 = FRM_USER (USER_ID = EXT_USER_ID 연결)
UPDATE FRM_USER
   SET PASSWORD = F_SHAENCRYPTOR(:tempPwd),   -- 랜덤 임시비번 (생년월일 기반 폐기)
       INIT_YN = 'Y', STATUS_CD = 'Y', TRY_CNT = 0, PWD_DATE = SYSDATE,
       MOD_USER_ID = :modUserId, MOD_DATE = SYSDATE
 WHERE USER_ID = :id;
-- 갱신행 0 → 연결 로그인 계정 없음(외부사용자 마스터만 존재) → 실패 안내`,
      conditions: [
        { name: 'USER_ID(=EXT_USER_ID)', effect: '외부사용자 ID 가 FRM_USER.USER_ID 와 동일. 연결 계정에만 동작' },
        { name: '임시비번', effect: '랜덤 생성 → 응답으로 평문 1회 전달(관리자 안내용). INIT_YN=Y 라 최초 로그인 시 변경 강제' },
        { name: 'TRY_CNT=0 / STATUS_CD=Y', effect: '잠금 해제 + 시도횟수 초기화' },
        { name: '갱신행 0', effect: '연결 FRM_USER 계정이 없으면 갱신 0건 → "연결 계정 없음" 으로 실패 처리' },
      ],
    },
    {
      key: 'delete', label: '삭제 (DELETE — FRM_EXT_USER_INFO 단일행)',
      sql:
`DELETE FROM FRM_EXT_USER_INFO WHERE EXT_USER_ID = :id;`,
      conditions: [
        { name: 'EXT_USER_ID', effect: '대상 외부사용자 마스터 1건 삭제. 연결 FRM_USER 계정은 본 동작 대상 아님' },
      ],
    },
  ],

  businessNotes: [
    'AUT0100 외부사용자관리 = 외부/파견 인력 계정 관리. 사번이 없어 사용자관리(AUT0010)와 별도로 직접 등록한다.',
    'FRM_EXT_USER_INFO 가 마스터(부가정보), 로그인은 FRM_USER 에 연결(USER_ID = EXT_USER_ID). 목록/상세는 FRM_USER LEFT JOIN (연결 계정 없어도 표시).',
    '★ S1: PASSWORD_VIEW(평문 비번)는 저장·노출하지 않는다 — AS-IS 평문 비번 컬럼 폐기. SELECT·INSERT·UPDATE 어디에도 없음. 로그인 비번은 FRM_USER.PASSWORD(SHA)만 존재.',
    '★ S3: 주민번호(CTZ_NO)는 응답·화면에 미노출. SELECT 제외, 입력 시에만 갱신(수정은 NVL 로 미입력 시 기존값 보존).',
    'S2: 비밀번호 초기화 = 랜덤 임시비번(F_SHAENCRYPTOR) + INIT_YN=Y(최초 로그인 시 변경 강제) + 잠금 해제(TRY_CNT=0, STATUS_CD=Y). 주민번호 앞6자리(생년월일) 초기비번 규칙은 폐기.',
    '비밀번호 초기화는 연결 로그인 계정(FRM_USER)이 있어야 동작 — 갱신행 0 이면 연결 계정 없음으로 실패 안내.',
    'create/update body = flat(ExtUserWrite) — 서브컬렉션 없는 단일 폼. ExtUserRow(상세)도 flat.',
  ],

  tables: [
    { name: 'FRM_EXT_USER_INFO', label: '외부사용자 (마스터)', columns: [
      { col: 'EXT_USER_ID',   type: 'NUMBER',        nn: true,  key: 'PK',      desc: '외부사용자 ID (시퀀스 S_FRM_SEQUENCE) = FRM_USER.USER_ID 연결키' },
      { col: 'USER_NM',       type: 'VARCHAR2(80)',  nn: false, key: '',        desc: '성명' },
      { col: 'COMPANY_CD',    type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '회사코드' },
      { col: 'CTZ_NO',        type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '주민등록번호 — ★ 미노출(S3, SELECT 제외). 입력 시에만 저장(UPDATE 는 NVL 보존)' },
      { col: 'TEL_NO1',       type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '연락처1' },
      { col: 'TEL_NO2',       type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '연락처2' },
      { col: 'COMPANY_NM',    type: 'VARCHAR2(150)', nn: false, key: '',        desc: '파견업체명' },
      { col: 'DEPT_NM',       type: 'VARCHAR2(150)', nn: false, key: '',        desc: '부서명' },
      { col: 'POS_NM',        type: 'VARCHAR2(150)', nn: false, key: '',        desc: '직위명' },
      { col: 'DUTY_NM',       type: 'VARCHAR2(150)', nn: false, key: '',        desc: '직책명' },
      { col: 'TYPE_CD',       type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '유형코드' },
      { col: 'MAN_TYPE_CD',   type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '관리주체 코드 (PHM_MAN_TYPE_CD — 파견업체 관리주체)' },
      { col: 'PASSWORD_VIEW', type: 'VARCHAR2(450)', nn: false, key: '',        desc: '★ 평문 비번 (AS-IS) — 미노출·미저장(S1). SELECT·INSERT·UPDATE 어디에도 없음(폐기)' },
      { col: 'MOD_USER_ID',   type: 'NUMBER',        nn: true,  key: '',        desc: '최종 수정자 ID (JWT uid)' },
      { col: 'MOD_DATE',      type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
    { name: 'FRM_USER', label: '연결 로그인 계정 (LEFT JOIN · 비번초기화 대상)', columns: [
      { col: 'USER_ID',   type: 'NUMBER',        nn: true,  key: 'PK',      desc: '계정 ID = FRM_EXT_USER_INFO.EXT_USER_ID 와 동일(연결키)' },
      { col: 'LOGIN_ID',  type: 'VARCHAR2(80)',  nn: false, key: '',        desc: '로그인ID (목록/상세에 표시)' },
      { col: 'PASSWORD',  type: 'VARCHAR2(450)', nn: false, key: '',        desc: '비밀번호 SHA(F_SHAENCRYPTOR) — 미노출. 비번초기화 시 갱신' },
      { col: 'INIT_YN',   type: 'VARCHAR2(2)',   nn: false, key: '',        desc: '초기비번 여부(Y=최초 로그인 시 변경 강제) — 비번초기화 시 Y' },
      { col: 'STATUS_CD', type: 'VARCHAR2(50)',  nn: false, key: '',        desc: '상태(Y=사용/N=잠금) — 비번초기화 시 Y(잠금 해제)' },
      { col: 'TRY_CNT',   type: 'NUMBER',        nn: false, key: '',        desc: '접속 시도 횟수 — 비번초기화 시 0' },
      { col: 'PWD_DATE',  type: 'DATE',          nn: false, key: '',        desc: '비밀번호 변경일 — 비번초기화 시 SYSDATE' },
      { col: 'MOD_USER_ID', type: 'NUMBER',      nn: true,  key: '',        desc: '최종 수정자 ID (JWT uid)' },
      { col: 'MOD_DATE',  type: 'DATE',          nn: true,  key: '',        desc: '최종 수정일시' },
    ]},
  ],
};
