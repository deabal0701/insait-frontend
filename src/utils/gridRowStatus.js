// ★ (2026-06-17, dspark): 그리드 행 상태(sStatus) 공통 — AS-IS IBSheet showStatus 정합.
//   InDataTable 의 :show-status 가 사용. 상태 컬럼(배지) + 신규/수정/삭제 마킹 + 저장 시 sStatus 전송을
//   화면마다 재작성하지 않도록 단일 출처로 둔다. 표시값 = 저장 시 전송될 sStatus(I/U/D).
//
//   책임 분리: 본 모듈/InDataTable = 상태 표시·마킹(앱 정책). 저장 전송 격상은 useEntityGrid(statusField).
//   winGrid(라이브러리)는 서버 비종속 순수 그리드라 상태-저장 연동을 두지 않는다.

/** 상태를 담는 행 필드명(표시 전용 — 저장 직전 useEntityGrid 가 제거하고 sStatus 로 격상). */
export const STATUS_FIELD = '_rowStatus';

// 상태 배지 — 디자인 시스템 InChip(outlined) 정합. semantic 토큰 1개에서 글자·테두리·배경을
//   color-mix 로 파생(연한 틴트) → 흰/그린 테마 토글 자동 추종. var() fallback hex 로 안전.
//   I=success(신규) / U=brand(수정) / D=error(삭제).
const STATUS_STYLE = {
  I: { label: '신규', color: 'var(--in-text-success, #1a7f37)' },
  U: { label: '수정', color: 'var(--in-text-brand, #13a9e9)' },
  D: { label: '삭제', color: 'var(--in-text-error, #e33131)' },
};

/** tui-grid 커스텀 렌더러 — 상태 배지. (raw DOM, getElement/render 계약) */
export class RowStatusCell {
  constructor(props) {
    this.el = document.createElement('div');
    this.el.style.cssText = 'display:flex;justify-content:center;align-items:center;height:100%;';
    this.pill = document.createElement('span');
    this.pill.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;'
      + 'min-width:34px;height:20px;padding:0 8px;border-radius:10px;border:1px solid transparent;'
      + 'font-size:11px;font-weight:600;line-height:1;box-sizing:border-box;';
    this.el.appendChild(this.pill);
    this.render(props);
  }

  render(props) {
    const s = STATUS_STYLE[props.value];
    this.pill.style.display = s ? 'inline-flex' : 'none';
    if (!s) { this.pill.textContent = ''; return; }
    this.pill.textContent = s.label;
    // semantic 토큰 1개 → 글자(진하게)·테두리(40%)·배경(12% 틴트) 파생. 흰 셀 위 색감.
    this.pill.style.color = s.color;
    this.pill.style.borderColor = `color-mix(in srgb, ${s.color} 42%, transparent)`;
    this.pill.style.background = `color-mix(in srgb, ${s.color} 12%, transparent)`;
  }

  getElement() { return this.el; }
}

/** 상태 컬럼 정의(맨 앞에 주입). 편집 불가 — 사용자가 직접 못 바꾼다. */
export function statusColumn(opts = {}) {
  return {
    name: STATUS_FIELD,
    header: opts.header || '상태',
    width: opts.width || 64,
    align: 'center',
    renderer: { type: RowStatusCell },
  };
}
