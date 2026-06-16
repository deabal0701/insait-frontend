// ★ (2026-06-16, dspark): 메뉴 SSOT seed — "동적 메뉴" 대응 구조.
//   사용자 지시(2026-06-16): ① rail 1depth = Figma LNB 11 카테고리(스마트 플레이스 유지),
//   ② h5on 실제 화면을 Figma 카테고리에 매핑, ③ "추후 메뉴는 동적으로 처리" → 하드코딩을
//   MainLayout 템플릿 인라인에 박지 말고 FRM_MENU 로 갈아끼울 수 있는 데이터 스키마로 분리.
//
//   ▶ 데이터 소스 스왑 설계 (정적 seed → 동적 fetch, 화면 코드 무변경):
//     - 현재 : MENU_TREE (본 파일 정적 seed)            → useMenuStore.menuTree
//     - 추후 : normalizeFrmMenuRows(envelope FRM_MENU)  → useMenuStore.menuTree  (동일 shape)
//     MainLayout 은 menuTree 를 "렌더링만" 한다(인라인 literal 제거). 소스가 바뀌어도 레이아웃 불변.
//     (menu.js store 의 fetchMenu TODO 와 연결 — P3 Step 10)
//
//   ▶ 노드 스키마 (FRM_MENU 정합 — 동적 전환 시 컬럼 1:1 매핑):
//     {
//       id,         // 안정 키. 화면이면 h5on 화면코드(RM005), 카테고리/그룹이면 의미 키(operation/appl).  ~ FRM_MENU.MENU_ID/OBJECT_ID
//       label,      // 표시명.                                                                            ~ FRM_MENU.MENU_NM
//       icon,       // 1depth 전용(lnb-*). ICON_REGISTRY 키.
//       routeName,  // insait 라우트명(구현 시). 없으면 null → status:'pending'.
//       legacyUrl,  // h5on 원본 경로(테넌트 WHNN 제거). 추적·매핑 근거.                                 ~ FRM_MENU.MENU_URL
//       status,     // 'active'(라우팅) | 'pending'('준비 중' 토스트).                                    ~ FRM_MENU.USE_YN 등
//       source,     // 'figma'(IA) | 'h5on'(화면) | 'insait-admin'(직접 REST 차선).  추적용.
//       children,   // 하위 노드(2·3depth).                                                              ~ FRM_MENU.UP_MENU_ID 역참조
//     }
//
//   ▶ status 규약: 'active' = onClick3depth 에서 router.push(routeName).  'pending' = ElMessage.info('준비 중').
//
//   ⚠️ TODO(decision) 표기 = 사용자 확정 필요 매핑(아래 본문 주석). 확정 후 갱신.

/** rail 1depth = Figma LNB 11 카테고리 (스마트 플레이스 #1 유지). 순서·아이콘 = Figma 진본. */
export const MENU_TREE = [
  // 1) 스마트 플레이스 — Figma 고유(대시보드). h5on 대응 화면 없음. submenu 미정(빈 트리 유지).
  {
    id: 'place', label: '스마트 플레이스', icon: 'lnb-search', source: 'figma',
    routeName: 'Dashboard', status: 'active', children: [],
  },

  // 2) 인사기획 ← h5on 인사기본{조직관리·구성원관리·인사정보} + h5on{채용}
  {
    id: 'planning', label: '인사기획', icon: 'lnb-people', source: 'figma', children: [
      { id: 'org', label: '조직 관리', source: 'h5on', legacyUrl: null, status: 'pending', children: [
        { id: 'org-info', label: '조직정보', status: 'pending' },
        { id: 'org-chart', label: '조직도', status: 'pending' },
        { id: 'org-restructure', label: '조직 개편', status: 'pending' },
        { id: 'org-history', label: '조직이력', status: 'pending' },
        { id: 'member-history', label: '구성원이력', status: 'pending' },
      ] },
      // h5on 인사기본{구성원관리 + 인사정보} 통합 (인사정보 = 개인 인사기록 → 구성원 관리 산하).
      { id: 'member-mgmt', label: '구성원 관리', source: 'h5on', status: 'pending', children: [] },
      { id: 'recruit', label: '채용 관리', source: 'h5on', status: 'pending', children: [] }, // ← h5on '채용' 모듈(4그룹, 라벨 미수집)
    ],
  },

  // 3) 인사운영 ← h5on 인사기본{발령·근무·휴가·출장 + 신청서 + 전자계약}
  {
    id: 'operation', label: '인사운영', icon: 'lnb-demography', source: 'figma', children: [
      { id: 'attendance', label: '근태관리', source: 'h5on', legacyUrl: null, status: 'pending', children: [
        { id: 'attendance-daily', label: '일일근태', status: 'pending' },
        { id: 'attendance-monthly', label: '월간근태', status: 'pending' },
        { id: 'attendance-overtime', label: '연장근무', status: 'pending' },
      ] },
      { id: 'leave', label: '휴가관리', source: 'h5on', status: 'pending', children: [] },
      { id: 'dispatch', label: '출장관리', source: 'h5on', status: 'pending', children: [] },
      { id: 'order', label: '발령관리', source: 'h5on', status: 'pending', children: [] },
      // ── TODO(decision) #1: 신청서/전자계약 위치 = 인사운영 vs 결재관리.
      //    h5on 은 '인사기본'에 발령/근무/휴가/출장과 함께 둔다 → 운영 클러스터로 본 위치에 배치.
      //    대안: 신청·결재 워크플로우라 '결재관리(approval)' 산하가 더 맞을 수 있음. 확정 시 이동.
      { id: 'appl', label: '신청서', source: 'h5on', status: 'active', children: [
        { id: 'RM001', label: '신청내역',        routeName: null, legacyUrl: '/ssw01_x/RM001',     status: 'pending' },
        { id: 'RM002', label: '결재함',          routeName: null, legacyUrl: '/ssw01_x/RM002',     status: 'pending' },
        { id: 'RM003', label: '신청서 작성',     routeName: null, legacyUrl: '/ssw01_efs_t/RM003', status: 'pending' },
        { id: 'RM004', label: '임시보관함',      routeName: null, legacyUrl: '/ssw01_x/RM004',     status: 'pending' },
        { id: 'RM005', label: '신청서 양식 관리', routeName: null, legacyUrl: '/ssw01_t/RM005',     status: 'pending' },
      ] },
      { id: 'RL', label: '전자계약', source: 'h5on', routeName: null, legacyUrl: '/ssw01_t/RL', status: 'pending', children: [] },
    ],
  },

  // 4) 성과관리 ← h5on{성과평가}
  {
    id: 'performance', label: '성과관리', icon: 'lnb-analytics', source: 'figma', children: [
      { id: 'eval', label: '성과 평가', source: 'h5on', status: 'pending', children: [
        { id: 'eval-mine', label: '나의 평가', status: 'pending' },
        { id: 'eval-manage', label: '평가관리', status: 'pending' },
      ] },
      { id: 'meeting', label: '면담', source: 'h5on', status: 'pending', children: [] },
      { id: 'eval-config', label: '평가설정', source: 'h5on', status: 'pending', children: [] },
    ],
  },

  // 5) 보상관리 ← h5on{보상관리 9그룹}. ── TODO(decision) #3: Figma 3그룹 vs h5on 9그룹.
  //    h5on 이 더 상세하므로 h5on 9그룹을 채택(아래). Figma 깊은 트리는 토큰 복구 후 대조.
  {
    id: 'compensation', label: '보상관리', icon: 'lnb-cases', source: 'figma', children: [
      { id: 'comp-worker',  label: '근로자별 관리', source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-settle',  label: '급여정산',     source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-payroll', label: '급여관리',     source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-income',  label: '근로소득명세', source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-bonus',   label: '성과급관리',   source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-budget',  label: '예산관리',     source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-account', label: '회계정산',     source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-retire',  label: '퇴직금관리',   source: 'h5on', status: 'pending', children: [] },
      { id: 'comp-yearend', label: '연말정산',     source: 'h5on', status: 'pending', children: [] },
    ],
  },

  // 6) 결재관리 — Figma IA. h5on '인사기본.신청서'를 여기로 보낼지는 TODO(decision) #1 참조.
  {
    id: 'approval', label: '결재관리', icon: 'lnb-inventory', source: 'figma', children: [
      { id: 'appr-line', label: '결재선지정', source: 'figma', status: 'pending', children: [
        { id: 'appr-personal', label: '개인결재선', status: 'pending' },
        { id: 'appr-delegate', label: '대리결재선', status: 'pending' },
        { id: 'appr-final',    label: '전결자지정', status: 'pending' },
      ] },
      { id: 'appr-doc',   label: '결재문서', source: 'figma', status: 'pending', children: [] },
      { id: 'appr-inbox', label: '상신함',   source: 'figma', status: 'pending', children: [] },
      { id: 'appr-list',  label: '결재함',   source: 'figma', status: 'pending', children: [] },
    ],
  },

  // 7) 시각화 ← h5on{인사이트}. (이름만 다름, 동일 의미)
  {
    id: 'analytics', label: '시각화', icon: 'lnb-finance', source: 'figma', children: [
      { id: 'vis-headcount', label: '인원통계', source: 'h5on', status: 'pending', children: [] },
      { id: 'VB', label: '업무통계', source: 'h5on', routeName: null, legacyUrl: '/ssw01_t/VB', status: 'pending', children: [] },
      { id: 'VC', label: '비용통계', source: 'h5on', routeName: null, legacyUrl: '/ssw01_t/VC', status: 'pending', children: [] },
      { id: 'VD', label: '인재운영', source: 'h5on', routeName: null, legacyUrl: '/ssw01_t/VD', status: 'pending', children: [] },
    ],
  },

  // 8) 메일 — Figma 고유. h5on 대응 없음.
  {
    id: 'mail', label: '메일', icon: 'lnb-mail', source: 'figma', notificationDot: true, children: [
      { id: 'mail-box', label: '메일함', source: 'figma', status: 'pending', children: [
        { id: 'mail-write',  label: '편지쓰기',   status: 'pending' },
        { id: 'mail-inbox',  label: '받은편지함', status: 'pending' },
        { id: 'mail-sent',   label: '보낸편지함', status: 'pending' },
        { id: 'mail-draft',  label: '임시보관함', status: 'pending' },
        { id: 'mail-spam',   label: '스팸편지함', status: 'pending' },
        { id: 'mail-trash',  label: '휴지통',     status: 'pending' },
      ] },
    ],
  },

  // 9) 설정(시스템관리) — insait 직접 REST 차선(사용자 구현 완료, 환경설정 포함). 기존 라우팅 active.
  //    h5on '시스템관리.시스템설정' 대응 + 그 이상(메타·권한·시스템환경·자료실·환경설정·playground).
  {
    id: 'settings', label: '시스템관리', icon: 'lnb-settings', source: 'insait-admin', children: [
      { id: 'meta', label: '메타관리', status: 'active', children: [
        { id: 'AUT0030', label: '오브젝트 관리', routeName: 'AUT0030', status: 'active' },
        { id: 'IST0030', label: '메시지 관리',   routeName: 'IST0030', status: 'active' },
        { id: 'IST0020', label: '엔터티 관리',   routeName: 'IST0020', status: 'active' },
        { id: 'IST0050', label: '서비스 관리',   routeName: 'IST0050', status: 'active' },
        { id: 'IST0010', label: 'SQL 관리',      routeName: 'IST0010', status: 'active' },
      ] },
      { id: 'auth', label: '사용자와 접근제어', status: 'active', children: [
        { id: 'AUT0010', label: '사용자 관리',     routeName: 'AUT0010', status: 'active' },
        { id: 'AUT0050', label: '메뉴 관리',       routeName: 'AUT0050', status: 'active' },
        { id: 'AUT0070', label: '권한기준 관리',   routeName: 'AUT0070', status: 'active' },
        { id: 'AUT0020', label: '사용자그룹 관리', routeName: 'AUT0020', status: 'active' },
        { id: 'AUT0040', label: '권한 관리',       routeName: 'AUT0040', status: 'active' },
        { id: 'AUT0100', label: '외부사용자 관리', routeName: 'AUT0100', status: 'active' },
        { id: 'AUT0060', label: '조직권한 관리',   routeName: 'AUT0060', status: 'active' },
      ] },
      { id: 'sysenv', label: '시스템환경', status: 'active', children: [
        { id: 'CCD0040', label: '인사영역관리',     routeName: 'CCD0040', status: 'active' },
        { id: 'CCD0080', label: '단위업무관리',     routeName: 'CCD0080', status: 'active' },
        { id: 'CCD0010', label: '공통코드관리',     routeName: 'CCD0010', status: 'active' },
        { id: 'CCD0050', label: '옵션관리',         routeName: 'CCD0050', status: 'active' },
        { id: 'CCD0030', label: '레지스트리관리',   routeName: 'CCD0030', status: 'active' },
        { id: 'CCD0220', label: '업무기준설정관리', routeName: 'CCD0220', status: 'active' },
        { id: 'CCD0020', label: '업무기준관리',     routeName: 'CCD0020', status: 'active' },
        { id: 'CCD0070', label: 'MAX값관리',        routeName: 'CCD0070', status: 'active' },
      ] },
      { id: 'pds', label: '자료실', status: 'active', children: [
        { id: 'FRM0090', label: '파일자료실', routeName: 'FRM0090', status: 'active' },
      ] },
      { id: 'env', label: '환경설정', status: 'active', children: [   // ← 사용자 구현 완료
        { id: 'SETTINGS',   label: '테마·환경', routeName: 'SETTINGS',   status: 'active' },
        { id: 'COMPONENTS', label: '컴포넌트',  routeName: 'COMPONENTS', status: 'active' },
      ] },
      { id: 'playground', label: 'Playground (dev)', status: 'active', children: [
        { id: 'DevGridDocs',      label: 'Grid 개발자 매뉴얼', routeName: 'DevGridDocs',      status: 'active' },
        { id: 'DevGridGallery',   label: 'Grid 카탈로그',      routeName: 'DevGridGallery',   status: 'active' },
        { id: 'DevTestGridPage',  label: 'Grid 테스트 페이지', routeName: 'DevTestGridPage',  status: 'active' },
        { id: 'DevSeasonMenuDemo', label: '시즌메뉴 데모',     routeName: 'DevSeasonMenuDemo', status: 'active' },
      ] },
    ],
  },

  // 10) 즐겨찾기 — Figma 고유. (사용자별 동적 — 추후 API)
  {
    id: 'bookmark', label: '즐겨찾기', icon: 'lnb-bookmark-add', source: 'figma', children: [
      { id: 'bookmark-list', label: '즐겨찾기 목록', status: 'pending', children: [] },
    ],
  },

  // 11) 전체보기 — Figma 고유(전체 메뉴 오버레이).
  {
    id: 'bento', label: '전체보기', icon: 'lnb-bento', source: 'figma', children: [
      { id: 'bento-all', label: '전체 메뉴', status: 'pending', children: [] },
    ],
  },
];

// ── TODO(decision) #2: h5on 전용 모듈 — Figma 11 카테고리에 대응 슬롯 없음.
//    rail(=Figma 11 고정)에 억지로 넣지 않고 별도 보류. 확정 시 ① 신규 1depth, ② 기존 산하,
//    ③ 생략 중 선택. (캘린더=단일화면, 인재육성=단일화면으로 보임)
export const H5ON_UNMAPPED = [
  { id: 'calendar', label: '캘린더 (일간/주간)', source: 'h5on', note: 'Figma 대응 카테고리 없음. 단일 화면 추정.' },
  { id: 'talent',   label: '인재육성',          source: 'h5on', note: 'Figma 대응 카테고리 없음. 단일 화면 추정.' },
];

/**
 * 동적 소스 어댑터(미래) — envelope FRM_MENU rows → MENU_TREE 동일 shape 정규화.
 * 지금은 stub. P3 Step 10(menu.js fetchMenu) 에서 구현. 구현되면 useMenuStore 가
 * 정적 MENU_TREE 대신 이 결과를 menuTree 로 사용 → MainLayout 무변경.
 *
 * @param {Array<object>} rows FRM_MENU 평면 행 (MENU_ID/MENU_NM/UP_MENU_ID/MENU_SEQ/OBJECT_ID/MENU_URL/...)
 * @returns {Array<object>} 트리화된 MENU_TREE 동일 shape
 */
export function normalizeFrmMenuRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const byId = new Map();
  rows.forEach((r) => byId.set(r.MENU_ID, {
    id: r.OBJECT_ID || r.MENU_ID,
    label: r.MENU_NM,
    routeName: r.OBJECT_ID || null,        // 화면코드 = insait 라우트명 컨벤션
    legacyUrl: r.MENU_URL || null,
    status: r.OBJECT_ID ? 'active' : 'pending',
    source: 'h5on',
    _up: r.UP_MENU_ID,
    _seq: r.MENU_SEQ ?? 0,
    children: [],
  }));
  const roots = [];
  byId.forEach((node) => {
    const parent = node._up ? byId.get(node._up) : null;
    (parent ? parent.children : roots).push(node);
  });
  const sortRec = (list) => {
    list.sort((a, b) => a._seq - b._seq);
    list.forEach((n) => { delete n._up; delete n._seq; sortRec(n.children); });
    return list;
  };
  return sortRec(roots);
}
