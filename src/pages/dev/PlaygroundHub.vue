<script setup>
// ★ (2026-06-02, dspark): Playground 허브 — dev 테스트 페이지 카탈로그.
//   URL /dev (또는 LNB 시스템관리 > Playground). 새 테스트 추가 = PLAYGROUNDS 배열에 1줄 +
//   라우트 1개. ready → 클릭 진입 / todo → '준비 중' toast. 카드 그리드로 확장 용이.
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const toast = useToast();

// ★ 새 playground 추가 시 여기에 1줄. routeName 은 router 의 name 과 일치해야 함.
const PLAYGROUNDS = [
  { group: 'Grid', title: 'Grid (InDataTable)', desc: 'tui-grid self-managed · TST0002 조회/저장/삭제 (서비스 props)', routeName: 'DevGridPlayground', status: 'ready' },
  { group: 'Grid', title: 'Grid 기능 카탈로그', desc: 'IBSheet 형태별 — 콤보·인셀버튼·마스터디테일·조건부스타일/헤더색', routeName: 'DevGridGallery', status: 'ready' },
  { group: 'Feedback', title: 'Toast / 알림', desc: 'InToast + useToast 명령형 알림 (예정)', routeName: '', status: 'todo' },
  { group: 'Chart', title: 'Chart', desc: '차트 컴포넌트 시연 (예정)', routeName: '', status: 'todo' },
  { group: 'Form', title: 'Form / Input', desc: 'InTextField · InSelect · InDatePicker 등 (예정)', routeName: '', status: 'todo' },
  { group: 'Icon', title: 'Icons', desc: '아이콘 카탈로그 (예정)', routeName: '', status: 'todo' },
];

function open(item) {
  if (item.status !== 'ready' || !item.routeName) {
    toast.info(`${item.title} — 준비 중`);
    return;
  }
  router.push({ name: item.routeName });
}
</script>

<template>
  <div class="pgh">
    <header class="pgh__head">
      <h2 class="pgh__title">Playground</h2>
      <p class="pgh__sub">개발·검증용 테스트 페이지 모음. 카드를 눌러 진입한다. (운영 메뉴 아님)</p>
    </header>

    <div class="pgh__grid">
      <button
        v-for="(it, i) in PLAYGROUNDS"
        :key="i"
        type="button"
        class="pgh__card"
        :class="{ 'is-todo': it.status !== 'ready' }"
        @click="open(it)"
      >
        <span class="pgh__group">{{ it.group }}</span>
        <span class="pgh__card-title">{{ it.title }}</span>
        <span class="pgh__card-desc">{{ it.desc }}</span>
        <span class="pgh__badge" :class="`pgh__badge--${it.status}`">
          {{ it.status === 'ready' ? '열기' : '준비 중' }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pgh { padding: 20px; width: 100%; max-width: 980px; }
.pgh__head { margin-bottom: 18px; }
.pgh__title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--in-text-accent, #111); }
.pgh__sub { margin: 0; font-size: 12px; color: var(--in-text-subtle, #777); }

.pgh__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.pgh__card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  text-align: left;
  background: var(--in-bg-white, #fff);
  border: 1px solid var(--in-border-default, #e2e2e2);
  border-radius: var(--in-radius-sm, 8px);
  cursor: pointer;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}
.pgh__card:hover {
  border-color: var(--in-border-brand, #13a9e9);
  box-shadow: 0 2px 10px rgb(0 0 0 / 6%);
  transform: translateY(-1px);
}
.pgh__card.is-todo { opacity: 0.6; cursor: default; }
.pgh__card.is-todo:hover { border-color: var(--in-border-default, #e2e2e2); box-shadow: none; transform: none; }

.pgh__group {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--in-brand, #13a9e9);
}
.pgh__card-title { font-size: 14px; font-weight: 600; color: var(--in-text-accent, #111); }
.pgh__card-desc { font-size: 11px; line-height: 1.5; color: var(--in-text-subtle, #777); }
.pgh__badge {
  align-self: flex-start;
  margin-top: 6px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
}
.pgh__badge--ready { background: var(--in-surface-accent-brand, #e1f5fc); color: var(--in-brand, #13a9e9); }
.pgh__badge--todo { background: var(--in-surface-default, #f3f3f3); color: var(--in-text-subtle, #999); }
</style>
