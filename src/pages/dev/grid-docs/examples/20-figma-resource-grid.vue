<script setup>
// ★ (2026-06-16, dspark): Figma DataDisplay/Table(node 1241:62155) 정합 그리드.
//   출처: Figma 시각 스펙(헤더 #FBFBFB / 보더 #E2E2E2 / brand #13A9E9 / 필수 #E33131 /
//        행높이 36·헤더 40 / ⋮메뉴 5항목 / placeholder #9E9E9E) + 컬럼구성=사용자 제공 학력 이미지.
//   Figma 차이: 1241:62155 는 범용 베이스 테이블(날짜셀 없음) → 입학/졸업년월 datePicker 는 이미지 출처.
//
//   순정 tui-grid 로 안 되는 2가지(Figma 핵심 차이)를 커스텀 렌더러로 보강:
//     ① 헤더 우측 ⋮(more_vert) 컬럼메뉴 — 오름차순/내림차순 정렬·왼쪽/오른쪽 고정·필터 (Figma verbatim)
//     ② 필수항목 빨강 별표(*) — REQUIRED Set 을 헤더 렌더러가 읽어 표시
//        (※ validation.required 를 쓰면 figmaTheme 의 cell.required.text=#e33131 이 셀 값까지 빨강으로
//          칠해 Figma(헤더 별표만 빨강)와 어긋남 → 검증과 분리해 별표 전용 Set 으로 둔다.)
//   ※ ⋮ 글리프·메뉴 아이콘은 placeholder(유니코드) — Figma more_vert/arrow/pin/filter 아이콘 swap 은 폴리싱.
//   ※ class 선언은 호이스팅 안 됨(TDZ) → 렌더러 클래스를 columns 보다 먼저 정의해야 한다.
import { ref } from 'vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// 필수 컬럼(헤더 빨강 * 전용). validation.required 와 분리(위 주석 ② 참조).
const REQUIRED = new Set(['eduLevel', 'schoolName', 'gradType', 'admDate']);

// ── 커스텀 헤더 렌더러 — 제목 + 필수* + ⋮메뉴 ──────────────────────
const MENU_ITEMS = [
  { key: 'asc', label: '오름차순 정렬', icon: '↑' },
  { key: 'desc', label: '내림차순 정렬', icon: '↓' },
  { key: 'pinL', label: '왼쪽 고정', icon: '⇤' },
  { key: 'pinR', label: '오른쪽 고정', icon: '⇥' },
  { key: 'filter', label: '필터', icon: '⏷' },
];

let _menuEl = null;
function closeMenu() {
  if (_menuEl) { _menuEl.remove(); _menuEl = null; document.removeEventListener('click', closeMenu, true); }
}
function openMenu(anchor, grid, name) {
  closeMenu();
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.style.cssText =
    'position:fixed;z-index:9999;min-width:124px;background:#fff;border:1px solid #e2e2e2;'
    + 'border-radius:2px;box-shadow:0 4px 10px rgba(0,0,0,.08);padding:4px 0;'
    + 'font-size:13px;color:#565656;font-family:inherit;'
    + `top:${rect.bottom + 2}px;left:${Math.max(8, rect.right - 124)}px;`;
  MENU_ITEMS.forEach((it) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;cursor:pointer;';
    row.onmouseenter = () => { row.style.background = '#f5fbff'; };
    row.onmouseleave = () => { row.style.background = '#fff'; };
    const ico = document.createElement('span');
    ico.textContent = it.icon; ico.style.cssText = 'width:16px;text-align:center;color:#666;';
    const lab = document.createElement('span'); lab.textContent = it.label;
    row.append(ico, lab);
    row.onclick = (ev) => {
      ev.stopPropagation();
      try {
        if (it.key === 'asc') grid.sort(name, true);
        else if (it.key === 'desc') grid.sort(name, false);
        else if (it.key === 'filter') grid.setFilter(name, 'text');
        else console.info('[PoC] 컬럼 고정은 columnOptions.frozenCount 설정 — 시연 생략:', it.label, name);
      } catch (e) { console.warn('menu action', e); }
      closeMenu();
    };
    menu.appendChild(row);
  });
  document.body.appendChild(menu);
  _menuEl = menu;
  // 현재 click 의 전파가 끝난 뒤 바깥클릭 닫기 등록(capture)
  setTimeout(() => document.addEventListener('click', closeMenu, true), 0);
}

class FigmaHeader {
  constructor(props) {
    this.props = props;
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;height:100%;gap:4px;';

    const left = document.createElement('span');
    left.style.cssText = 'display:inline-flex;align-items:center;gap:3px;font-size:13px;color:#010101;'
      + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    const title = document.createElement('span');
    title.textContent = props.columnInfo.header;
    left.appendChild(title);
    if (REQUIRED.has(props.columnInfo.name)) {
      const star = document.createElement('span');
      star.textContent = '*'; star.style.cssText = 'color:#e33131;font-size:12px;line-height:1;';
      left.appendChild(star);
    }

    const more = document.createElement('button');
    more.type = 'button'; more.textContent = '⋮';
    more.style.cssText = 'flex:none;border:none;background:transparent;cursor:pointer;'
      + 'font-size:16px;line-height:1;color:#565656;padding:0 2px;';
    more.onclick = (ev) => { ev.stopPropagation(); openMenu(more, props.grid, props.columnInfo.name); };

    el.append(left, more);
    this.el = el;
  }
  getElement() { return this.el; }
  render(props) { this.props = props; }
}

// ── 커스텀 셀 렌더러 — 최종학력여부(단일 Y/N 체크박스) ─────────────
class CheckCell {
  constructor(props) {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;justify-content:center;align-items:center;height:100%;';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = props.value === 'Y';
    cb.onchange = () => props.grid.setValue(props.rowKey, props.columnInfo.name, cb.checked ? 'Y' : 'N');
    el.appendChild(cb);
    this.el = el; this.cb = cb;
  }
  getElement() { return this.el; }
  render(props) { this.cb.checked = props.value === 'Y'; }
}

// ── 콤보 목록 ──────────────────────────────────────────────────────
const EDU = ['학사', '석사', '박사', '전문학사', '고졸'].map((v) => ({ text: v, value: v }));
const GRAD = ['졸업', '수료', '중퇴', '재학'].map((v) => ({ text: v, value: v }));

// ── 컬럼 정의 (이미지 = 학력 그리드) ───────────────────────────────
//   required:true → 헤더에 빨강 * (FigmaHeader 가 columnInfo.validation.required 로 판단)
const columns = [
  { name: 'eduLevel', header: '학력', width: 110, editor: { type: 'select', options: { listItems: EDU } } },
  { name: 'schoolName', header: '학교명', width: 150, editor: 'text' },
  { name: 'gradType', header: '졸업구분', width: 110, editor: { type: 'select', options: { listItems: GRAD } } },
  { name: 'admDate', header: '입학년월', width: 140, align: 'center', editor: { type: 'datePicker', options: { format: 'yyyy.MM.dd' } } },
  { name: 'gradDate', header: '졸업년월', width: 140, align: 'center', editor: { type: 'datePicker', options: { format: 'yyyy.MM.dd' } } },
  { name: 'finalYn', header: '최종학력여부', width: 110, align: 'center', renderer: { type: CheckCell } },
  { name: 'faculty', header: '학과', width: 120, editor: 'text' },
  { name: 'major', header: '전공', width: 120, editor: 'text' },
  { name: 'doubleMajor', header: '복수전공', width: 120, editor: 'text' },
];

// ── 모든 데이터 컬럼 헤더에 FigmaHeader 적용 ───────────────────────
const headerColumns = columns.map((c) => ({ name: c.name, renderer: FigmaHeader }));

const data = ref([
  { eduLevel: '학사', schoolName: '한국대학교', gradType: '졸업', admDate: '2016.03.01', gradDate: '2020.02.20', finalYn: 'Y', faculty: '공과대학', major: '컴퓨터공학', doubleMajor: '' },
  { eduLevel: '석사', schoolName: '서울대학원', gradType: '수료', admDate: '2020.03.01', gradDate: '', finalYn: 'N', faculty: '정보과학', major: '데이터사이언스', doubleMajor: '응용통계' },
  { eduLevel: '', schoolName: '', gradType: '', admDate: '', gradDate: '', finalYn: 'N', faculty: '', major: '', doubleMajor: '' },
]);
</script>

<template>
  <InDataTable
    :columns="columns"
    :data="data"
    :height="260"
    :options="{
      rowHeaders: ['checkbox'],
      bodyHeight: 220,
      header: { height: 40, columns: headerColumns },
      columnOptions: { resizable: true },
    }"
  />
</template>
