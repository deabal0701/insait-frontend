<script setup>
// ★ (2026-06-14, dspark): InDataTable(tui-grid 래퍼) 개발자 매뉴얼 + 라이브 플레이그라운드.
//   구조는 TOAST UI Grid 공식 docs(https://nhn.github.io/tui.grid/latest/) 네비를 차용하되
//   대상은 우리 래퍼 InDataTable. 상호작용은 W3Schools "Try it yourself" 모델(좌 코드/우 결과).
//   ★ AS-IS IBSheet 사용 패턴(Type 13종·Format·sStatus·이벤트·SetConfig·Popup·Tree·AutoSum)을
//     전수 분석(서브에이전트)해 "IBSheet → tui-grid 대응표" 섹션으로 빠짐없이 수록.
//   예제는 examples/*.vue 를 ?raw 로 읽어 플레이그라운드 초기 코드로 주입(실 파일 = 단일 출처).
import { ref, computed } from 'vue';
import LiveSfcPlayground from '@/components/dev/LiveSfcPlayground.vue';
import ApiTable from '@/components/dev/ApiTable.vue';

// ── 예제 SFC 원문(raw) ───────────────────────────────────────────────
import exGettingStarted from './examples/01-getting-started.vue?raw';
import exColumnsFormat from './examples/02-columns-format.vue?raw';
import exEditingDirty from './examples/03-editing-dirty.vue?raw';
import exCombo from './examples/04-combo.vue?raw';
import exCellButton from './examples/05-cell-button.vue?raw';
import exMasterDetail from './examples/06-master-detail.vue?raw';
import exConditionalStyle from './examples/07-conditional-style.vue?raw';
import exEvents from './examples/08-events.vue?raw';
import exCheckboxYn from './examples/09-checkbox-yn.vue?raw';
import exFrozenHeader from './examples/10-frozen-complex-header.vue?raw';
import exSummary from './examples/11-summary.vue?raw';
import exPopupSearch from './examples/12-popup-search.vue?raw';
import exTree from './examples/13-tree.vue?raw';
import exServiceEnvelope from './examples/14-service-envelope.vue?raw';

// ── 섹션 정의(좌측 네비 = group 으로 묶음) ─────────────────────────────
const SECTIONS = [
  { id: 'getting-started', group: '시작하기', title: '시작하기', code: exGettingStarted,
    intro: 'InDataTable 한 줄 import 후 <code>:columns</code> 와 <code>:data</code> 만 주면 그리드가 그려진다. <code>options.rowHeaders:[\'rowNum\']</code> 는 IBSheet 의 행 번호(Seq) 대응.' },
  { id: 'columns-format', group: '컬럼', title: '정렬·너비·포맷', code: exColumnsFormat,
    intro: '<code>align</code>/<code>width</code> 와 숫자·날짜 포맷. <code>format</code> 키(<code>Integer·KrwAmount·Ymd</code> 등)는 IBSheet <code>Format</code> 문자열 대응 — <code>utils/grid.js</code> 의 formatRegistry 가 변환한다.' },
  { id: 'combo', group: '컬럼', title: '콤보 셀', code: exCombo,
    intro: 'IBSheet <code>Type:Combo</code> + <code>ComboText/ComboCode</code> 대응. <code>editor:{type:\'select\',options:{listItems:[{text,value}]}}</code> + 코드→라벨 <code>formatter</code>.' },
  { id: 'checkbox', group: '컬럼', title: '체크박스 (Y/N)', code: exCheckboxYn,
    intro: 'IBSheet <code>Type:CheckBox</code>(Y/N 저장) 대응. 데이터 셀은 select(Y/N)+formatter, 행 선택용 체크박스는 <code>rowHeaders:[\'checkbox\']</code> 로 구분.' },
  { id: 'editing-dirty', group: '편집·저장', title: '편집 & Dirty (sStatus)', code: exEditingDirty,
    intro: '<strong>IBSheet 의 핵심 프로토콜.</strong> 행 추가→<code>I</code>, 셀 수정→<code>U</code>, 체크 삭제→<code>D</code>. <code>getDirty()</code> 가 <code>getModifiedRows()</code> 를 envelope 형식(<code>sStatus</code>+<code>_seq</code>)으로 변환 — IBSheet <code>GetSaveJson()</code> 대응.' },
  { id: 'service-envelope', group: '편집·저장', title: '서비스 연동 (envelope)', code: exServiceEnvelope,
    intro: 'AS-IS <code>h5:Service</code>+IBSheet 한 사이클의 TO-BE 대응. <code>retrieve/save serviceId</code> 만 주면 <code>/serviceBroker.h5</code> envelope 를 내부 조립·POST·재조회. <code>grid.retrieve(body)</code>/<code>grid.save()</code>. <em>(실 백엔드 필요)</em>' },
  { id: 'cell-button', group: '렌더링', title: '인셀 버튼 (Html)', code: exCellButton,
    intro: 'IBSheet <code>Type:Html</code>(버튼/링크) 대응. tui-grid CellRenderer 클래스를 <code>column.renderer.type</code> 에 지정.' },
  { id: 'popup-search', group: '렌더링', title: '검색 팝업 (Popup)', code: exPopupSearch,
    intro: 'IBSheet <code>Type:Popup</code>(사원/부서/코드 검색) 대응. 셀 버튼 → 모달 → 선택값을 <code>grid.setValue()</code> 로 주입.' },
  { id: 'conditional-style', group: '렌더링', title: '조건부 행 강조', code: exConditionalStyle,
    intro: 'IBSheet 값 따라 셀/행 색 변경 대응. 행 데이터에 <code>_attributes.className.row</code> 로 클래스 부여(tui-grid 규약).' },
  { id: 'frozen-header', group: '구조', title: '고정열 + 멀티헤더', code: exFrozenHeader,
    intro: 'IBSheet <code>FrozenCol</code> + <code>MergeSheet</code>(병합 헤더) 대응. <code>columnOptions.frozenCount</code> + <code>header.complexColumns</code>.' },
  { id: 'summary', group: '구조', title: '합계행 (AutoSum)', code: exSummary,
    intro: 'IBSheet <code>AutoSum</code>(합계/소계) 대응. <code>options.summary.columnContent</code> 에 sum/avg/max/min 집계.' },
  { id: 'tree', group: '구조', title: '트리 (TreeCol)', code: exTree,
    intro: 'IBSheet <code>TreeCol</code>+<code>DataInsert(row,level)</code> 계층 대응. 데이터 <code>_children</code> 중첩 + <code>options.treeColumnOptions</code>.' },
  { id: 'events', group: '이벤트', title: '이벤트', code: exEvents,
    intro: 'IBSheet <code>OnClick/OnChange</code> 등 대응. tui-grid 이벤트를 kebab-case emit 으로 전달. (셀 클릭/더블클릭/변경 로그)' },
];

const GROUPS = ['시작하기', '컬럼', '편집·저장', '렌더링', '구조', '이벤트'];
const EXTRA_NAV = [
  { id: 'api', label: 'API 레퍼런스' },
  { id: 'ibsheet-map', label: 'IBSheet ↔ tui-grid 대응표' },
];

const active = ref('getting-started');
const current = computed(() => SECTIONS.find((s) => s.id === active.value));
function sectionsOf(group) { return SECTIONS.filter((s) => s.group === group); }

// ── API 레퍼런스 데이터 ──────────────────────────────────────────────
const PROPS_ROWS = [
  { name: 'columns', type: 'Array', default: '필수', desc: '컬럼 정의 배열 <code>[{ name, header, width, align, editor, formatter, format, hidden, renderer }]</code>' },
  { name: 'data', type: 'Array', default: '[]', desc: 'controlled 모드 행 데이터. (서비스 props 주면 self-managed 가 우선)' },
  { name: 'options', type: 'Object', default: '{}', desc: 'tui-grid 생성자 옵션 — <code>rowHeaders·bodyHeight·columnOptions·header·summary·treeColumnOptions</code> 등' },
  { name: 'rowKey', type: 'String', default: 'undefined', desc: 'PK 컬럼명 → tui-grid <code>keyColumnName</code>' },
  { name: 'height', type: 'Number|String', default: '400', desc: '래퍼 외곽 높이(px 또는 CSS)' },
  { name: 'bodyHeight', type: 'Number|String', default: 'undefined', desc: '그리드 본문 높이' },
  { name: 'loading', type: 'Boolean', default: 'false', desc: '스피너 수동 표시' },
  { name: 'contextMenuItems', type: 'Array', default: '[]', desc: '우클릭 컨텍스트 메뉴 <code>[{key,label,disabled,divider}]</code>' },
  { name: 'retrieveServiceId', type: 'String', default: 'undefined', desc: 'self-managed 조회 serviceId (예 <code>ORM9999_01_R01</code>)' },
  { name: 'saveServiceId', type: 'String', default: 'undefined', desc: 'self-managed 저장 serviceId' },
  { name: 'slotName', type: 'String', default: 'undefined', desc: 'BODY 메시지 슬롯명(조회·저장 공통)' },
  { name: 'header', type: 'Object', default: '{}', desc: 'HEADER 옵션 <code>{ objectId, actionType }</code>' },
  { name: 'statusKey', type: 'String', default: "'sStatus'", desc: '상태 컬럼명(백엔드 계약)' },
  { name: 'softDelete', type: 'Boolean', default: 'false', desc: '삭제를 <code>sStatus=U + sDelete=Y</code> 로 송신(soft-delete 엔티티)' },
  { name: 'reloadAfterSave', type: 'Boolean', default: 'true', desc: '저장 성공 후 자동 재조회' },
  { name: 'autoRetrieve', type: 'Boolean', default: 'false', desc: '마운트 직후 1회 자동 조회' },
];
const METHODS_ROWS = [
  { name: 'getInstance()', type: '() => Grid', desc: 'tui-grid 인스턴스 반환 — 모든 native API 접근(setValue/getValue/hideColumn 등)' },
  { name: 'retrieve(body, opts)', type: '(o,o) => Promise<rows>', desc: 'self-managed 조회 — envelope 조립·POST·바인딩' },
  { name: 'save(opts)', type: '(o) => Promise<result>', desc: 'self-managed 저장 — dirty 수집·POST·재조회. IBSheet <code>GetSaveJson()</code> 대응' },
  { name: 'getDirty(opts)', type: '(o) => Array', desc: '편집 커밋 후 envelope dirty 배열(<code>sStatus·_seq</code>) 추출' },
  { name: 'getModified()', type: '() => Object', desc: '<code>{createdRows,updatedRows,deletedRows}</code> — IBSheet <code>FindStatusRow</code> 대응' },
  { name: 'addRow(row, opts)', type: '(o,o) => void', desc: '행 추가(포커스 다음 위치 삽입). IBSheet <code>DataInsert(-1,0)</code> 대응' },
  { name: 'removeCheckedRows()', type: '() => Array', desc: '체크된 행 삭제 표시. IBSheet 삭제(<code>sStatus=D</code>) 대응' },
  { name: 'getCheckedRows()', type: '() => Array', desc: '체크된 행 목록' },
  { name: 'focusCell(rowKey, col)', type: '(s,s) => void', desc: '셀 포커스/편집' },
  { name: 'clearModified()', type: '() => void', desc: 'dirty 상태 초기화' },
  { name: 'on/off(event, fn)', type: '(s,fn) => void', desc: '14종 표준 emit 외 임의 tui-grid 이벤트 구독' },
  { name: 'exportExcel/importExcel', type: '(o) => Promise', desc: '엑셀 다운/업(exceljs 동적 import)' },
  { name: 'printGrid(opts)', type: '(o) => void', desc: '인쇄용 HTML 표 새 창 출력' },
];
const EVENTS_ROWS = [
  { name: 'click / dblclick', type: '{ rowKey, columnName, ... }', desc: '셀 클릭/더블클릭. IBSheet <code>OnClick</code> 대응' },
  { name: 'after-change', type: '{ changes }', desc: '셀 값 변경 후. IBSheet <code>OnChange/OnAfterEdit</code> 대응' },
  { name: 'before-change', type: '{ changes, stop() }', desc: '변경 직전(거부 가능). IBSheet <code>OnValidation</code> 대응' },
  { name: 'editing-start / editing-finish', type: '{ rowKey, columnName, value }', desc: '셀 편집 시작/종료' },
  { name: 'check / uncheck / check-all / uncheck-all', type: '{ rowKey }', desc: '행 체크박스' },
  { name: 'selection-change', type: '{ range }', desc: '선택 영역 변경. IBSheet <code>OnSelectCell</code> 대응' },
  { name: 'sort / filter / scroll-end', type: '{ ... }', desc: '정렬/필터/무한 스크롤 끝' },
  { name: 'instance-ready', type: 'Grid', desc: '그리드 생성 완료(인스턴스 전달)' },
  { name: 'context-action', type: '{ key, rowKey, columnName, item }', desc: '우클릭 메뉴 선택' },
];

// ── IBSheet → tui-grid 대응표 (AS-IS 전수분석 기반) ────────────────────
const MAP_TYPE = [
  ['Text (560+)', '기본 컬럼 · <code>editor:\'text\'</code> 로 편집'],
  ['Seq (62)', "<code>options.rowHeaders:['rowNum']</code>"],
  ['Combo (61)', "<code>editor:{type:'select',options:{listItems}}</code> + 코드→라벨 formatter"],
  ['Float / Int (63)', "<code>format:'Float2'/'Integer'</code> · <code>align:'right'</code>"],
  ['Date (24)', "<code>format:'Ymd'</code> · 편집은 <code>editor:'datePicker'</code>"],
  ['Status (54)', '자동 — <code>getModifiedRows()</code> → <code>extractDirtyForEnvelope</code>(sStatus)'],
  ['DelCheck (54)', "<code>removeCheckedRows()</code> + <code>rowHeaders:['checkbox']</code>"],
  ['CheckBox Y/N (8)', "select(Y/N) editor + formatter (단일 셀)"],
  ['Html (23)', 'CellRenderer 클래스(<code>renderer.type</code>) — 버튼/링크/이미지'],
  ['Popup (6)', '셀 버튼 renderer → 모달 → <code>setValue()</code>'],
  ['AutoSum (104)', '<code>options.summary.columnContent</code>'],
  ['TreeCol', '<code>options.treeColumnOptions</code> + 데이터 <code>_children</code>'],
];
const MAP_ATTR = [
  ['SaveName', '<code>column.name</code> (envelope 키)'],
  ['Width / Align', '<code>column.width</code> / <code>column.align</code>'],
  ['Edit 0/1', '<code>column.editor</code> 유무 (없으면 읽기전용)'],
  ['Hidden', '<code>column.hidden</code> 또는 <code>grid.hideColumn()</code>'],
  ['Format', "<code>column.format</code> (formatRegistry: Integer·KrwAmount·Ymd…). 주민번호·사업자번호(IdNo/SaupNo)는 커스텀 formatter"],
  ['ComboText / ComboCode', "<code>listItems:[{text,value}]</code> (파이프 문자열 → 객체 배열)"],
  ['FrozenCol', '<code>columnOptions.frozenCount</code>'],
  ['MergeSheet (멀티헤더)', '<code>header.complexColumns</code>'],
  ['KeyField / MaxCheck', '<code>before-change</code> 검증 또는 저장 전 validate'],
  ['SearchMode / Page', '클라이언트 데이터 바인딩 / 서버 페이징(serviceId)'],
];
const MAP_METHOD = [
  ['GetSaveJson()', '<code>getDirty()</code> / <code>save()</code>'],
  ["FindStatusRow('I|U|D')", '<code>getModified()</code> (created/updated/deletedRows)'],
  ['DataInsert(-1, 0)', '<code>addRow(row)</code>'],
  ['RemoveRow / sStatus=D', '<code>removeCheckedRows()</code>'],
  ['SetCellValue(r,c,v)', '<code>getInstance().setValue(rowKey, col, v)</code>'],
  ['GetCellValue(r,c)', '<code>getInstance().getValue(rowKey, col)</code>'],
  ['GetSelectRow()', '<code>getInstance().getFocusedCell()</code>'],
  ['RowCount()', '<code>getInstance().getRowCount()</code>'],
  ['SetColHidden(c,1/0)', '<code>getInstance().hideColumn()/showColumn()</code>'],
  ['SetCellEditable(r,c,0)', '조회 후 컬럼 disabled 처리 / <code>before-change</code> 가드'],
  ['DoSearchScriptSync / LoadSearchData', '<code>:data</code> 바인딩 또는 <code>retrieve()</code>'],
];
const MAP_EVENT = [
  ['OnSearchEnd', '<code>await retrieve()</code> 다음 로직 / <code>instance-ready</code>'],
  ['OnClick', '<code>@click</code>'],
  ['OnChange / OnAfterEdit', '<code>@after-change</code>'],
  ['OnValidation', '<code>@before-change</code> (거부 시 <code>ev.stop()</code>)'],
  ['OnSelectCell', '<code>@selection-change</code> / <code>@click</code> rowKey'],
];
</script>

<template>
  <div class="gd">
    <!-- 좌측 네비 -->
    <aside class="gd__nav">
      <div class="gd__nav-title">InDataTable 매뉴얼</div>
      <p class="gd__nav-sub">tui-grid 래퍼 · 라이브 예제</p>
      <template v-for="g in GROUPS" :key="g">
        <div class="gd__nav-group">{{ g }}</div>
        <button
          v-for="s in sectionsOf(g)" :key="s.id"
          type="button" class="gd__nav-item"
          :class="{ 'is-active': active === s.id }"
          @click="active = s.id"
        >{{ s.title }}</button>
      </template>
      <div class="gd__nav-group">레퍼런스</div>
      <button
        v-for="e in EXTRA_NAV" :key="e.id"
        type="button" class="gd__nav-item"
        :class="{ 'is-active': active === e.id }"
        @click="active = e.id"
      >{{ e.label }}</button>
    </aside>

    <!-- 본문 -->
    <main class="gd__main">
      <!-- 예제 섹션 -->
      <template v-if="current">
        <h1 class="gd__h1">{{ current.title }}</h1>
        <p class="gd__intro" v-html="current.intro"></p>
        <LiveSfcPlayground :key="current.id" :initial-code="current.code" :title="current.title + ' — Try it yourself'" />
      </template>

      <!-- API 레퍼런스 -->
      <template v-else-if="active === 'api'">
        <h1 class="gd__h1">API 레퍼런스</h1>
        <h2 class="gd__h2">Props</h2>
        <ApiTable kind="props" :rows="PROPS_ROWS" />
        <h2 class="gd__h2">Methods <span class="gd__hint">(<code>ref</code> 로 호출)</span></h2>
        <ApiTable kind="methods" :rows="METHODS_ROWS" />
        <h2 class="gd__h2">Events <span class="gd__hint">(<code>@event</code>)</span></h2>
        <ApiTable kind="events" :rows="EVENTS_ROWS" />
      </template>

      <!-- IBSheet 대응표 -->
      <template v-else-if="active === 'ibsheet-map'">
        <h1 class="gd__h1">IBSheet ↔ tui-grid 대응표</h1>
        <p class="gd__intro">AS-IS 레거시 IBSheet 사용 패턴을 전수 분석(빈도 = grep 근거)해 InDataTable 대응으로 매핑. 마이그레이션 시 직접 참조.</p>

        <h2 class="gd__h2">① 컬럼 Type</h2>
        <table class="gd__map"><thead><tr><th>IBSheet Type (빈도)</th><th>InDataTable / tui-grid</th></tr></thead>
          <tbody><tr v-for="(r,i) in MAP_TYPE" :key="i"><td v-html="r[0]"></td><td v-html="r[1]"></td></tr></tbody></table>

        <h2 class="gd__h2">② 컬럼 속성 · 전역 옵션</h2>
        <table class="gd__map"><thead><tr><th>IBSheet 속성</th><th>InDataTable / tui-grid</th></tr></thead>
          <tbody><tr v-for="(r,i) in MAP_ATTR" :key="i"><td v-html="r[0]"></td><td v-html="r[1]"></td></tr></tbody></table>

        <h2 class="gd__h2">③ 메서드</h2>
        <table class="gd__map"><thead><tr><th>IBSheet 메서드</th><th>InDataTable / tui-grid</th></tr></thead>
          <tbody><tr v-for="(r,i) in MAP_METHOD" :key="i"><td v-html="r[0]"></td><td v-html="r[1]"></td></tr></tbody></table>

        <h2 class="gd__h2">④ 이벤트</h2>
        <table class="gd__map"><thead><tr><th>IBSheet 이벤트</th><th>InDataTable / tui-grid</th></tr></thead>
          <tbody><tr v-for="(r,i) in MAP_EVENT" :key="i"><td v-html="r[0]"></td><td v-html="r[1]"></td></tr></tbody></table>

        <div class="gd__note">
          <strong>⚠ 핵심 주의</strong> — <code>sStatus/_seq</code> 프로토콜은 백엔드 동적 SQL(BusinessEntity) 과 1:1 결합.
          그리드 교체만으로 불충분하며 동일한 dirty 추적이 필수다. InDataTable 은 <code>extractDirtyForEnvelope</code> 로 이를 보존한다.
          (<code>utils/grid.js</code>)
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.gd {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0;
  height: calc(100vh - 60px);
  font-family: var(--in-font-family-body);
}
.gd__nav {
  border-right: 1px solid var(--in-border-default, #e2e2e2);
  padding: 16px 10px;
  overflow-y: auto;
  background: var(--in-bg-default, #fbfbfb);
}
.gd__nav-title { font-size: 15px; font-weight: 700; color: var(--in-text-accent, #010101); }
.gd__nav-sub { font-size: 11px; color: var(--in-text-subtle, #8a8a8a); margin: 2px 0 14px; }
.gd__nav-group {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  color: var(--in-text-subtle, #8a8a8a); margin: 14px 6px 4px;
}
.gd__nav-item {
  display: block; width: 100%; text-align: left;
  padding: 6px 10px; margin: 1px 0;
  border: none; border-radius: var(--in-radius-xs, 6px);
  background: transparent; color: var(--in-text-default, #565656);
  font-size: 13px; cursor: pointer;
}
.gd__nav-item:hover { background: var(--in-surface-accent-brand, #f5fbff); }
.gd__nav-item.is-active { background: var(--in-brand, #13a9e9); color: #fff; font-weight: 600; }
.gd__main { padding: 24px 32px; overflow-y: auto; }
.gd__h1 { font-size: 22px; font-weight: 700; color: var(--in-text-accent, #010101); margin: 0 0 8px; }
.gd__h2 { font-size: 16px; font-weight: 700; color: var(--in-text-accent, #010101); margin: 24px 0 6px; }
.gd__hint { font-size: 12px; font-weight: 400; color: var(--in-text-subtle, #8a8a8a); }
.gd__intro { font-size: 14px; line-height: 1.7; color: var(--in-text-default, #565656); margin: 0 0 8px; }
.gd__intro :deep(code), .gd__h2 :deep(code) {
  padding: 1px 6px; background: var(--in-bg-white, #fff);
  border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 4px;
  font-family: var(--in-font-family-mono, monospace); font-size: 12px; color: var(--in-brand, #13a9e9);
}
.gd__map { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 13px; }
.gd__map th { text-align: left; padding: 8px 12px; background: var(--in-bg-default, #fbfbfb); border-bottom: 2px solid var(--in-border-default, #e2e2e2); color: var(--in-text-accent, #010101); }
.gd__map td { padding: 8px 12px; border-bottom: 1px solid var(--in-border-default, #e2e2e2); color: var(--in-text-default, #565656); vertical-align: top; }
.gd__map :deep(code) { padding: 1px 5px; background: var(--in-bg-default, #f3f3f3); border-radius: 4px; font-family: var(--in-font-family-mono, monospace); font-size: 12px; }
.gd__note { margin: 16px 0; padding: 12px 14px; border-radius: var(--in-radius-xs, 6px); background: var(--in-surface-accent-brand, #f5fbff); border: 1px solid var(--in-brand, #13a9e9); font-size: 13px; line-height: 1.6; color: var(--in-text-default, #565656); }
.gd__note :deep(code) { font-family: var(--in-font-family-mono, monospace); font-size: 12px; }
@media (max-width: 760px) { .gd { grid-template-columns: 1fr; height: auto; } .gd__nav { border-right: none; } }
</style>
