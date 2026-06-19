<script setup>
/**
 * ORM0002 — 인사기본 > 조직관리 > 조직도 (route name=ORM0002)
 *   ★ 파일/오브젝트명 = AS-IS 조직도 오브젝트 **ORM0002**(서비스 ORM0002_00_R01 "조직도 조직조회").
 *     h5on 화면ID "RD002" 는 우리 오브젝트가 아니므로 폐기(사용자 지적 2026-06-19). 메뉴(h5on:RD002)는 route=ORM0002 로 매핑.
 *
 * ★ (2026-06-19, dspark): 마이그레이션 검증 1번 케이스 — h5on 조직도(React jointjs 시각 조직도)를
 *   우리 Vue + 보존 envelope 로 이식.
 *   - 트리 데이터: envelope ORM0010_00_R01 (IN ME_ORM0010_01 / OUT ME_ORM0010_02, isTreeData). 트리 = SUPER_ORG_ID → ORG_ID.
 *   - 조직인원: envelope ORM0040_01_R01 (IN ME_ORM0040_01{company_cd,locale_cd,org_id,base_ymd} / OUT ME_ORM0040_02).
 *   - UI: @vue-flow/core(OSS, jointjs 대체) + @dagrejs/dagre. 빌드 정본 = TO-BE 기획서 v1.51 §02. 명세 = captures/인사기본_조직도.md
 *   - 도움말 = 메타 패턴(ScreenHelpDrawer + ORM0002.help.js), 헤더 제목 5클릭 [DEV-HELP] 개발 전용.
 *
 *   TODO(후속): 조직정보 상세필드(ORM0010_01_R01) · 정렬 3종 · 엑셀/PNG/PDF · In* 정합.
 */
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import dayjs from 'dayjs';
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import dagre from '@dagrejs/dagre';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import { useService } from '@/composables/useService';
import { parseResponse, isSuccess, getResultMessage } from '@/services/envelope';
import { useAuthStore } from '@/stores/auth';
import ScreenHelpDrawer from '@/components/feature/admin/ScreenHelpDrawer.vue'; // [DEV-HELP]
import orm0002Help from './ORM0002.help.js';                                   // [DEV-HELP]
import SgSearchBar from '@/components/common/SgSearchBar.vue';   // 검색바 = 메타화면 공통 컴포넌트
import InButton from '@/components/ui/InButton.vue';             // 버튼 = 디자인시스템 컴포넌트
import OrgNodeCard from '@/components/feature/orm/OrgNodeCard.vue'; // 조직 노드 카드(+토글) 컴포넌트
import OrgMemberCard from '@/components/feature/orm/OrgMemberCard.vue'; // 조직인원 카드 컴포넌트 (saaswin MemberCard 대응)
// 툴바 아이콘 (assets/icons — 없던 4개는 동일 포맷으로 신규 추가: remove/fit-screen/layout-horizontal/layout-vertical)
import IconLayoutH from '@/assets/icons/layout-horizontal.svg';
import IconLayoutV from '@/assets/icons/layout-vertical.svg';
import IconAdd from '@/assets/icons/add.svg';
import IconRemove from '@/assets/icons/remove.svg';
import IconFit from '@/assets/icons/fit-screen.svg';
import IconDownload from '@/assets/icons/download.svg';

const auth = useAuthStore();
const svc = useService();
// ★ setup 의 useVueFlow 와 <VueFlow> 가 동일 스토어를 공유하도록 명시 id (불일치 시 phantom watcher → draggable 에러).
const flowId = 'orm0002-orgchart';
const { fitView, zoomIn, zoomOut, setCenter, getViewport, setViewport } = useVueFlow(flowId);
const VIEWPORT_KEY = 'insait.orgChart.ORM0002.viewport'; // 마지막 줌/위치 저장 키
function saveViewport() {
  try { localStorage.setItem(VIEWPORT_KEY, JSON.stringify(getViewport())); } catch (_) { /* noop */ }
}

// ── 조회영역 (기획서 §02_01) ──
function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// SgSearchBar 필드 config (메타화면 공통 패턴). type: date | select | text.
const searchFields = [
  { key: 'baseYmd', label: '기준일', type: 'date', chip: false },
  { key: 'viewMode', label: '보기 방식', type: 'select', chip: false,
    options: [
      { value: 'hierarchy', label: '하위 조직 구성원 포함 표시' },
      { value: 'self', label: '선택 조직 구성원만 표시' },
    ] },
  { key: 'orgName', label: '조직명', type: 'text', placeholder: '조직명 검색', chip: false },
];
const search = ref({ baseYmd: todayYmd(), viewMode: 'hierarchy', orgName: '' });
// TODO(기획서 v1.5): 미래 일자 조회 불가 — SgSearchBar date 필드에 disabled-date 전달(슬롯) 후속.

// ── 그래프 상태 ──
const rawOrgs = ref([]);
const nodes = ref([]);
const edges = ref([]);
const direction = ref('LR'); // LR(가로, 디폴트) | TB(세로)
const collapsed = ref(new Set()); // 접힌 조직 id 집합 — 하위 트리 숨김 (기획서 §02 조직카드 접기/펴기)
const loading = ref(false);
const error = ref('');
const retrieved = ref(false);

// ── 인스펙터 (기획서 §02_05/06) ──
const selectedNode = ref(null);
const inspectorTab = ref('info');
const members = ref([]);           // 조직인원 보기 — 선택 조직 구성원 (envelope ORM0040_01_R01)
const membersLoading = ref(false);

const isEmpty = computed(() => retrieved.value && !loading.value && rawOrgs.value.length === 0);
const targetPos = computed(() => (direction.value === 'LR' ? Position.Left : Position.Top));
const sourcePos = computed(() => (direction.value === 'LR' ? Position.Right : Position.Bottom));

// ════════ [DEV-HELP] 헤더 타이틀('조직도') 5클릭 → 도움말 (개발자 본인 전용 "나 혼자 보기", 메타 카탈로그와 동일 취지) ════════
//   MainLayout 헤더 타이틀 클릭이 window 'insait:title-click' 이벤트 발행 → 여기서 5회 카운트 시 드로어 오픈.
const helpOpen = ref(false);
let helpClickCount = 0;
function onHeaderTitleClick(e) {
  if (e?.detail?.menuId && e.detail.menuId !== 'ORM0002') return;
  helpClickCount += 1;
  if (helpClickCount >= 5) { helpClickCount = 0; helpOpen.value = true; }
}
function onHelpOpenChange(v) { helpOpen.value = v; if (!v) helpClickCount = 0; }
// ════════ [DEV-HELP] 끝 ════════

function field(row, name) {
  if (!row) return undefined;
  return row[name] ?? row[name.toUpperCase()] ?? row[name.toLowerCase()];
}

/**
 * ★ OUT ME_ORM0010_02 는 isTreeData=true → 백엔드가 이미 중첩 트리(_treeData/Items, IBSheet 포맷)로 조립해 보낸다.
 *   { org_id:'', _treeData:[ { org_id, org_nm, super_org_id, Items:[ {..., Items:[...] } ] } ] }
 *   → org_id 가 있는 노드만 재귀로 평면화(평면 배열도 그대로 수용).
 */
function flattenTree(rows) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    const orgId = node.org_id ?? node.ORG_ID;
    if (orgId !== undefined && orgId !== '') out.push(node);
    const children = node.Items || node.items || node._treeData || [];
    if (Array.isArray(children)) children.forEach(walk);
  };
  (rows || []).forEach(walk);
  return out;
}
function toYmd8(v) {
  const s = String(v || '').trim();
  if (/^\d{8}$/.test(s)) return s;
  const d = dayjs(s);
  return d.isValid() ? d.format('YYYYMMDD') : s;
}

/** dagre 수평/수직 트리 레이아웃. */
function layout(ns, es, dir) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: dir, nodesep: 28, ranksep: 72, marginx: 24, marginy: 24 });
  const W = 184;
  const H = 64;
  ns.forEach((n) => g.setNode(n.id, { width: W, height: H }));
  es.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return ns.map((n) => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - W / 2, y: p.y - H / 2 } };
  });
}

/** rawOrgs → Vue Flow nodes/edges (트리 = SUPER_ORG_ID→ORG_ID). */
function buildGraph() {
  const rows = rawOrgs.value || [];
  // 부모맵 + 자식보유 집합 (전체 기준 — 접힘 여부와 무관하게 "자식 있음" 판정)
  const parentOf = new Map();
  const hasChild = new Set();
  rows.forEach((r) => {
    const id = String(field(r, 'org_id'));
    const sup = field(r, 'super_org_id') ? String(field(r, 'super_org_id')) : '';
    parentOf.set(id, sup);
    if (sup) hasChild.add(sup);
  });
  // 가시성: 조상 중 접힌(collapsed) 노드가 있으면 숨김.
  const isVisible = (id) => {
    let p = parentOf.get(id);
    const guard = new Set();
    while (p && !guard.has(p)) {
      guard.add(p);
      if (collapsed.value.has(p)) return false;
      p = parentOf.get(p);
    }
    return true;
  };
  const visibleRows = rows.filter((r) => isVisible(String(field(r, 'org_id'))));
  const idSet = new Set(visibleRows.map((r) => String(field(r, 'org_id'))));
  const ns = visibleRows.map((r) => {
    const id = String(field(r, 'org_id'));
    return {
      id,
      type: 'org',
      position: { x: 0, y: 0 },
      draggable: false,
      data: {
        orgId: id,
        name: field(r, 'org_nm') ?? field(r, 'title') ?? '',
        code: field(r, 'search_cd') ?? field(r, 'org_cd') ?? '',
        superId: field(r, 'super_org_id') ? String(field(r, 'super_org_id')) : '',
        hasChildren: hasChild.has(id),
        collapsed: collapsed.value.has(id),
        raw: r,
      },
    };
  });
  const es = [];
  ns.forEach((n) => {
    const sup = n.data.superId;
    if (sup && sup !== n.id && idSet.has(sup)) {
      es.push({ id: `${sup}__${n.id}`, source: sup, target: n.id, type: 'smoothstep' });
    }
  });
  // ★ 빈 그래프(데이터 0건)면 dagre 미호출 — networkSimplex 가 빈 그래프에서 크래시(weight undefined).
  if (ns.length === 0) {
    nodes.value = [];
    edges.value = [];
    return;
  }
  let laid;
  try {
    laid = layout(ns, es, direction.value);
  } catch (e) {
    console.warn('[조직도] dagre 레이아웃 실패 — 그리드 폴백', e);
    laid = ns.map((n, i) => ({ ...n, position: { x: (i % 6) * 210, y: Math.floor(i / 6) * 120 } }));
  }
  nodes.value = laid;
  edges.value = es;
  // ★ 뷰(줌/위치)는 호출자가 결정: 초기=applyInitialView(저장복원/루트 zoom1) · 검색=노드 포커스 · 토글/배열=fitCurrent.
}

/** 토글·배열변경 후 보이는 노드 적정 줌으로 맞춤(읽기 좋은 max zoom 1). */
function fitCurrent() {
  nextTick(() => setTimeout(() => { try { fitView({ padding: 0.2, maxZoom: 1, duration: 250 }); } catch (_) { /* noop */ } }, 80));
}

/** 최초 오픈 뷰: 저장된 마지막 뷰포트가 있으면 복원, 없으면 최상위(루트) 기준 zoom≈1(이미지 사이즈). */
function applyInitialView() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(VIEWPORT_KEY) || 'null'); } catch (_) { saved = null; }
  nextTick(() => setTimeout(() => {
    try {
      if (saved && typeof saved.zoom === 'number') {
        setViewport(saved, { duration: 0 });
      } else {
        const root = nodes.value.find((n) => !n.data.superId) || nodes.value[0];
        if (root) setCenter(root.position.x + 90 + 340, root.position.y + 32, { zoom: 1, duration: 0 });
      }
    } catch (_) { /* noop */ }
  }, 120));
}

/** 조직트리 조회 — envelope ORM0010_00_R01. */
async function retrieve() {
  loading.value = true;
  error.value = '';
  selectedNode.value = null;
  try {
    const body = {
      ME_ORM0010_01: [{
        base_ymd: toYmd8(search.value.baseYmd),
        company_cd: auth.companyCd || '01',
        locale_cd: (localStorage.getItem('insait.locale') || 'KO').toUpperCase(),
        reg_org_yn: 'N',
      }],
    };
    const resp = await svc.call('ORM0010_00_R01', body, { suppressError: true });
    retrieved.value = true;
    if (!resp) {
      error.value = svc.error.value?.message || '조회 실패 (네트워크/서버 미기동)';
      rawOrgs.value = [];
      buildGraph();
      return;
    }
    if (!isSuccess(resp)) error.value = getResultMessage(resp) || '서버 오류';
    // ★ OUT 은 isTreeData → 중첩(_treeData/Items) → 평면화해야 org_id 있는 실 조직만 노드가 된다.
    rawOrgs.value = flattenTree(parseResponse(resp, 'ME_ORM0010_02') || []);
    buildGraph();
    if (search.value.orgName && search.value.orgName.trim()) applyOrgNameFocus(); // 조직명 검색 → 포커싱 (기획서 §02_03)
    else applyInitialView(); // 최초/일반 조회 → 저장복원 또는 루트 기준 zoom 1
  } finally {
    loading.value = false;
  }
}

function onNodeClick(e) {
  selectedNode.value = e?.node?.data || null;
}

/** 조직인원 보기 — 선택 조직의 구성원 조회 (envelope ORM0040_01_R01). 기획서 §02_06. */
async function loadMembers() {
  const org = selectedNode.value;
  if (!org || !org.orgId) { members.value = []; return; }
  membersLoading.value = true;
  try {
    const body = {
      ME_ORM0040_01: [{
        company_cd: auth.companyCd || '01',
        locale_cd: (localStorage.getItem('insait.locale') || 'KO').toUpperCase(),
        org_id: org.orgId,
        base_ymd: toYmd8(search.value.baseYmd),
      }],
    };
    const resp = await svc.call('ORM0040_01_R01', body, { suppressError: true });
    members.value = resp ? (parseResponse(resp, 'ME_ORM0040_02') || []) : [];
  } finally {
    membersLoading.value = false;
  }
}
/** 구성원 행 필드 — ORM0040_01_R01 OUT(ME_ORM0040_02) 실측 컬럼 + 변형 수용.
 *   실측: emp_nm(이름)·emp_no(사번)·pos_nm(직위)·pos_grd_nm(직급)·duty_nm(직책)·org_nm(소속). */
function memberField(m, kind) {
  if (kind === 'name') return field(m, 'emp_nm') ?? field(m, 'korn_flnm') ?? field(m, 'flnm') ?? field(m, 'user_nm') ?? '';
  if (kind === 'jbttl') return field(m, 'duty_nm') ?? field(m, 'jbttl_nm') ?? '';   // 직책
  if (kind === 'jbps') return field(m, 'pos_nm') ?? field(m, 'jbps_nm') ?? '';      // 직위
  if (kind === 'jbgd') return field(m, 'pos_grd_nm') ?? field(m, 'jbgd_nm') ?? field(m, 'grade_nm') ?? ''; // 직급
  if (kind === 'empno') return field(m, 'emp_no') ?? field(m, 'user_no') ?? '';
  if (kind === 'org') return field(m, 'org_nm') ?? '';                              // 소속
  return '';
}
// 조직인원 탭 활성 + 조직 선택 시 자동 로드.
watch([inspectorTab, () => selectedNode.value?.orgId], () => {
  if (inspectorTab.value === 'member' && selectedNode.value?.orgId) loadMembers();
  else members.value = [];
});

// ── 조직인원 정렬 + 조직장/구성원 분리 (기획서 §02_06) ──
const memberSort = ref('org'); // org(조직순서) | duty(직책·직위) | name(이름)
// ※ 조직장 판정: ORM0040 에 조직장 플래그 없음 → 직책(duty)이 '…장/이사' 인 휴리스틱. 정확한 조직장은 조직장 서비스 후속.
function isLeaderRow(m) {
  return /(장|이사)$/.test(String(memberField(m, 'jbttl') || ''));
}
const sortedMembers = computed(() => {
  const arr = [...members.value];
  if (memberSort.value === 'name') {
    arr.sort((a, b) => String(memberField(a, 'name')).localeCompare(String(memberField(b, 'name')), 'ko'));
  } else if (memberSort.value === 'duty') {
    arr.sort((a, b) => (isLeaderRow(b) ? 1 : 0) - (isLeaderRow(a) ? 1 : 0));
  }
  return arr; // org = 서버 반환 순서 유지
});
const leaderMembers = computed(() => sortedMembers.value.filter(isLeaderRow));
const regularMembers = computed(() => sortedMembers.value.filter((m) => !isLeaderRow(m)));
/** 조직명 검색 → 매칭 조직 1개 자동 포커싱 (기획서 §02_03). 접힌 하위면 조상 펼친 뒤 선택+센터. */
function applyOrgNameFocus() {
  const q = (search.value.orgName || '').trim();
  if (!q) return;
  const match = rawOrgs.value.find((r) => String(field(r, 'org_nm') ?? field(r, 'title') ?? '').includes(q));
  if (!match) {
    error.value = `'${q}' 조직을 찾을 수 없습니다.`;
    return;
  }
  error.value = '';
  const id = String(field(match, 'org_id'));
  // 조상 펼치기(collapsed 제거) → 매칭 노드 가시화
  const parentMap = new Map(rawOrgs.value.map((r) => [String(field(r, 'org_id')), field(r, 'super_org_id') ? String(field(r, 'super_org_id')) : '']));
  const s = new Set(collapsed.value);
  let p = parentMap.get(id);
  const guard = new Set();
  while (p && !guard.has(p)) { guard.add(p); s.delete(p); p = parentMap.get(p); }
  collapsed.value = s;
  buildGraph();
  // 선택 + 해당 노드로 센터/줌
  const node = nodes.value.find((n) => n.id === id);
  if (node) selectedNode.value = node.data;
  nextTick(() => { setTimeout(() => { try { fitView({ nodes: [id], padding: 0.6, duration: 400, maxZoom: 1.4 }); } catch (_) { /* noop */ } }, 120); });
}
/** 조직 카드 접기/펴기 — 하위 트리 숨김/표시 (기획서 §02). */
function toggleCollapse(id) {
  if (!id) return;
  const s = new Set(collapsed.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  collapsed.value = s;
  buildGraph();
  fitCurrent();
}
function setDirection(dir) {
  if (direction.value === dir) return;
  direction.value = dir;
  buildGraph();
  fitCurrent();
}
function onReset() {
  search.value = { baseYmd: todayYmd(), viewMode: 'hierarchy', orgName: '' };
  retrieve();
}
function onDownload() {
  // TODO: 엑셀/PNG/PDF (기획서 §02_04).
}

onMounted(() => {
  window.addEventListener('insait:title-click', onHeaderTitleClick); // [DEV-HELP] 헤더 타이틀 5클릭 수신
  retrieve();
});
onBeforeUnmount(() => {
  window.removeEventListener('insait:title-click', onHeaderTitleClick); // [DEV-HELP]
});
</script>

<template>
  <div class="org-chart-page">
    <!-- 조회영역 (기획서 §02_01) — 검색바 = 메타화면 공통 컴포넌트(SgSearchBar). 제목은 상단 헤더(banner). -->
    <!-- [DEV-HELP] 도움말은 헤더 '조직도' 타이틀 5클릭으로 열림(개발자 본인 전용) -->
    <SgSearchBar :fields="searchFields" v-model="search" @search="retrieve" @reset="onReset" />

    <div v-if="error" class="ocp-error">⚠ {{ error }}</div>

    <!-- 본문: 캔버스 + 우측 인스펙터 -->
    <div class="ocp-body">
      <div class="ocp-canvas">
        <!-- 툴바 (기획서 §02_04) -->
        <div class="ocp-toolbar">
          <InButton variant="only-icon" size="sm" :class="{ 'ocp-tool-active': direction === 'LR' }" title="가로 배열" @click="setDirection('LR')"><img :src="IconLayoutH" alt="가로 배열" class="ocp-ico" /></InButton>
          <InButton variant="only-icon" size="sm" :class="{ 'ocp-tool-active': direction === 'TB' }" title="세로 배열" @click="setDirection('TB')"><img :src="IconLayoutV" alt="세로 배열" class="ocp-ico" /></InButton>
          <span class="ocp-toolbar__sep" />
          <InButton variant="only-icon" size="sm" title="확대" @click="zoomIn()"><img :src="IconAdd" alt="확대" class="ocp-ico" /></InButton>
          <InButton variant="only-icon" size="sm" title="축소" @click="zoomOut()"><img :src="IconRemove" alt="축소" class="ocp-ico" /></InButton>
          <InButton variant="only-icon" size="sm" title="화면 맞춤" @click="fitView({ padding: 0.15 })"><img :src="IconFit" alt="화면 맞춤" class="ocp-ico" /></InButton>
          <span class="ocp-toolbar__sep" />
          <InButton variant="only-icon" size="sm" title="다운로드(엑셀/PNG/PDF — 준비 중)" @click="onDownload"><img :src="IconDownload" alt="다운로드" class="ocp-ico" /></InButton>
        </div>

        <!-- 엠프티 스테이트 (기획서 §00) -->
        <el-empty v-if="isEmpty" description="아직 생성된 조직이 없습니다. 조직을 등록해보세요" class="ocp-empty">
          <el-button type="primary" disabled>조직 등록 바로가기 (준비 중)</el-button>
        </el-empty>

        <VueFlow
          v-else
          :id="flowId"
          :nodes="nodes" :edges="edges"
          :nodes-draggable="false" :nodes-connectable="false" :elements-selectable="true"
          :min-zoom="0.2" :max-zoom="2"
          @node-click="onNodeClick"
          @move-end="saveViewport">
          <template #node-org="{ data, selected }">
            <Handle type="target" :position="targetPos" style="opacity: 0" />
            <OrgNodeCard :data="data" :selected="selected" @toggle="toggleCollapse" />
            <Handle type="source" :position="sourcePos" style="opacity: 0" />
          </template>
          <Background pattern-color="#e2e8f0" :gap="18" />
        </VueFlow>
      </div>

      <!-- 우측 인스펙터 (기획서 §02_05/06) -->
      <aside class="ocp-inspector">
        <div v-if="!selectedNode" class="ocp-inspector__empty">조직을 선택하면 정보가 표시됩니다.</div>
        <template v-else>
          <div class="ocp-inspector__tabs">
            <button :class="{ on: inspectorTab === 'info' }" @click="inspectorTab = 'info'">조직정보 보기</button>
            <button :class="{ on: inspectorTab === 'member' }" @click="inspectorTab = 'member'">조직인원 보기</button>
          </div>
          <div v-if="inspectorTab === 'info'" class="ocp-form">
            <div class="ocp-form__row"><span>조직명</span><b>{{ selectedNode.name }}</b></div>
            <div class="ocp-form__row"><span>조직코드</span><b>{{ selectedNode.code || '—' }}</b></div>
            <div class="ocp-form__row"><span>영문명</span><b>—</b></div>
            <div class="ocp-form__row"><span>실행일</span><b>—</b></div>
            <div class="ocp-form__row"><span>종료일</span><b>—</b></div>
            <div class="ocp-form__row"><span>조직유형</span><b>—</b></div>
            <div class="ocp-form__row"><span>사업장</span><b>—</b></div>
            <p class="ocp-form__note">※ 영문명·실행일·종료일·조직유형·사업장은 조직기본정보 서비스(ORM0010_01_R01) 후속 배선 예정.</p>
          </div>
          <div v-else class="ocp-form">
            <div v-if="membersLoading" class="ocp-form__note">구성원을 불러오는 중…</div>
            <template v-else>
              <div class="ocp-mem__hd">
                <span class="ocp-mem__count">총 <b>{{ members.length }}</b>명</span>
                <select v-model="memberSort" class="ocp-mem__sort" aria-label="정렬 순서">
                  <option value="org">조직 순서</option>
                  <option value="duty">직책·직위 순서</option>
                  <option value="name">이름 순서</option>
                </select>
              </div>
              <div v-if="members.length === 0" class="ocp-form__note">조직원이 없습니다.</div>
              <template v-else>
                <template v-if="leaderMembers.length">
                  <div class="ocp-mem__sec">조직장</div>
                  <div class="ocp-mem__list">
                    <OrgMemberCard
                      v-for="(m, i) in leaderMembers" :key="'L' + i" is-leader
                      :name="memberField(m, 'name')" :emp-no="memberField(m, 'empno')" :org-nm="memberField(m, 'org')"
                      :jbps="memberField(m, 'jbps')" :jbttl="memberField(m, 'jbttl')" :jbgd="memberField(m, 'jbgd')" />
                  </div>
                </template>
                <div class="ocp-mem__sec">구성원</div>
                <div class="ocp-mem__list">
                  <OrgMemberCard
                    v-for="(m, i) in regularMembers" :key="'M' + i"
                    :name="memberField(m, 'name')" :emp-no="memberField(m, 'empno')" :org-nm="memberField(m, 'org')"
                    :jbps="memberField(m, 'jbps')" :jbttl="memberField(m, 'jbttl')" :jbgd="memberField(m, 'jbgd')" />
                </div>
              </template>
            </template>
          </div>
        </template>
      </aside>
    </div>

    <!-- [DEV-HELP] 화면 도움말 드로어 (업무 + 플로우 + 쿼리/서비스) — 제거 시 이 줄 삭제 -->
    <ScreenHelpDrawer :help="orm0002Help" :open="helpOpen" @update:open="onHelpOpenChange" />
  </div>
</template>

<style scoped>
.org-chart-page { display: flex; flex-direction: column; height: calc(100vh - 96px); gap: 10px; padding: 4px; }
.ocp-error { padding: 8px 12px; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 6px; font-size: 13px; }

.ocp-body { display: flex; gap: 12px; flex: 1; min-height: 0; }
.ocp-canvas { position: relative; flex: 1; min-width: 0; background: #f8fafc;
  border: 1px solid var(--in-border, #e5e7eb); border-radius: 8px; overflow: hidden; }
/* 툴바 — 흰 바 + 구분선 + 아이콘 버튼 (이미지 정합) */
.ocp-toolbar { position: absolute; top: 10px; right: 12px; z-index: 5; display: flex; align-items: center; gap: 2px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 3px 5px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.ocp-toolbar__sep { width: 1px; align-self: stretch; margin: 3px 3px; background: #e5e7eb; }
.ocp-ico { width: 17px; height: 17px; display: block; }
.ocp-tool-active { background: var(--in-bg-accent-brand, #e1f5fc); }
.ocp-empty { height: 100%; display: flex; align-items: center; justify-content: center; }

/* 인스펙터 */
.ocp-inspector { width: 300px; flex-shrink: 0; background: #fff; border: 1px solid var(--in-border, #e5e7eb);
  border-radius: 8px; padding: 16px; overflow: auto; }
.ocp-inspector__empty { color: #9ca3af; font-size: 13px; text-align: center; padding-top: 40px; }
.ocp-inspector__tabs { display: flex; gap: 6px; margin-bottom: 14px; }
.ocp-inspector__tabs button { flex: 1; padding: 8px; font-size: 13px; border: 1px solid #e5e7eb; background: #f9fafb;
  border-radius: 6px; cursor: pointer; color: #6b7280; }
.ocp-inspector__tabs button.on { background: var(--in-brand, #2563eb); color: #fff; border-color: var(--in-brand, #2563eb); }
.ocp-form__row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
.ocp-form__row span { color: #6b7280; }
.ocp-form__note { margin-top: 12px; font-size: 11px; color: #9ca3af; line-height: 1.5; }

/* 조직인원 보기 */
.ocp-mem__hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.ocp-mem__count { font-size: 13px; color: #374151; }
.ocp-mem__count b { color: var(--in-brand, #2563eb); }
.ocp-mem__sort { font-size: 12px; padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 6px; color: #374151; background: #fff; cursor: pointer; }
.ocp-mem__sec { font-size: 12px; font-weight: 600; color: #6b7280; margin: 14px 0 6px; }
.ocp-mem__sec:first-of-type { margin-top: 4px; }
.ocp-mem__list { display: flex; flex-direction: column; gap: 6px; }
</style>
