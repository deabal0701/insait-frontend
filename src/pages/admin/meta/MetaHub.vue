<script setup>
/**
 * MetaHub — 메타관리 진입점.
 *
 * URL: /admin/meta
 *
 * 책임:
 *  - 신규 화면 등록 마법사 진입 (메인 액션)
 *  - 단독 자원 편집 화면 4종 (P7) 진입 카드
 *  - 서비스 카탈로그 (P5) 진입 카드
 *  - 향후: 등록 통계 / 최근 편집 자원 / 운영 분포 등
 *
 * AS-IS 시스템관리 메뉴 9건이 LNB 메뉴에 분산되어 있어 신규 화면 1건 등록 시 9 메뉴를 오가는
 * 문제를 해결. 본 hub 에서 작업 의도별로 진입점을 묶어 표시.
 */
import { useRouter } from 'vue-router';
import InMetaActionCard from '@/components/feature/meta/InMetaActionCard.vue';

const router = useRouter();

const PRIMARY_ACTIONS = [
  {
    routeName: 'META_NEW',
    icon: 'add',
    tone: 'primary',
    title: '+ 신규 화면 등록 마법사',
    description: '5 단계 (ID 게이트 → SQL → Message → Entity → Service+Menu+Auth) 로 신규 화면을 한 번에 등록합니다. 7-char 컨벤션 자동 강제.',
  },
];

const RESOURCE_ACTIONS = [
  {
    routeName: 'AUT0030',
    icon: 'home',
    title: '오브젝트 관리',
    description: 'FRM_EXECUTABLE_OBJECT — 화면 자체의 메타 (OBJECT_NM·OBJECT_LINK·OBJECT_TYPE).',
  },
  {
    routeName: 'IST0010',
    icon: 'edit',
    title: 'SQL 관리',
    description: 'FRM_QUERY_DEF — 쿼리 본문 + 파라미터 정의. 모든 컬럼의 SSOT.',
  },
  {
    routeName: 'IST0030',
    icon: 'mail',
    title: '메시지 관리',
    description: 'FRM_MSG_DEF + FRM_MSG_COL_DEF — REQ/RES 의 컬럼 정의 (TYPE_CD 4종 표준).',
  },
  {
    routeName: 'IST0020',
    icon: 'card-id',
    title: '엔터티 관리',
    description: 'FRM_ENTITY — DB 테이블 매핑. MultiSave 의 silent no-op 차단을 위한 필수 자원.',
  },
];

const CATALOG_ACTIONS = [
  {
    routeName: 'IST0050',
    icon: 'settings',
    title: '서비스 카탈로그',
    description: '운영 6,200+ 서비스 리스트 + 한눈에 보기 + 서비스 테스터 (P5 구현 예정).',
  },
  {
    routeName: 'CCD0020',
    icon: 'filter',
    title: '공통코드',
    description: 'FRM_CODE — 콤보·드롭다운에 쓰이는 공통코드 카탈로그.',
  },
  {
    routeName: 'AUT0050',
    icon: 'lnb-bento',
    title: '메뉴 관리',
    description: 'FRM_MENU — LNB 트리에 노출되는 메뉴 정의.',
  },
  {
    routeName: 'AUT0040',
    icon: 'person',
    title: '권한 관리',
    description: 'FRM_AUTH_ITEM + FRM_AUTH_USER_BINDING — 사용자/그룹 ↔ 메뉴 권한.',
  },
];

function goTo(name) {
  router.push({ name });
}
</script>

<template>
  <div class="meta-hub">
    <header class="meta-hub__header">
      <h2 class="meta-hub__title">메타관리</h2>
      <p class="meta-hub__subtitle">
        신규 화면 등록은 마법사로 한 번에. 기존 자원 편집은 자원별 단독 화면으로.
      </p>
    </header>

    <section class="meta-hub__section">
      <h3 class="meta-hub__section-title">신규 등록</h3>
      <div class="meta-hub__grid meta-hub__grid--full">
        <InMetaActionCard
          v-for="a in PRIMARY_ACTIONS"
          :key="a.routeName"
          :icon="a.icon"
          :tone="a.tone"
          :title="a.title"
          :description="a.description"
          @click="goTo(a.routeName)"
        />
      </div>
    </section>

    <section class="meta-hub__section">
      <h3 class="meta-hub__section-title">자원 단독 편집</h3>
      <p class="meta-hub__section-hint">
        ※ P7 진입 시 본격 CRUD 구현. 현재는 placeholder 화면.
      </p>
      <div class="meta-hub__grid">
        <InMetaActionCard
          v-for="a in RESOURCE_ACTIONS"
          :key="a.routeName"
          :icon="a.icon"
          :title="a.title"
          :description="a.description"
          @click="goTo(a.routeName)"
        />
      </div>
    </section>

    <section class="meta-hub__section">
      <h3 class="meta-hub__section-title">카탈로그 · 운영 도구</h3>
      <p class="meta-hub__section-hint">
        ※ 서비스 카탈로그는 P5 본격 구현 예정 (리스트 + 한눈 보기 + 테스터).
      </p>
      <div class="meta-hub__grid">
        <InMetaActionCard
          v-for="a in CATALOG_ACTIONS"
          :key="a.routeName"
          :icon="a.icon"
          :title="a.title"
          :description="a.description"
          @click="goTo(a.routeName)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.meta-hub {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
  font-family: var(--in-font-family-body);
}

.meta-hub__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--in-border-default);
}
.meta-hub__title {
  margin: 0;
  font-size: var(--in-font-size-2xl);
  line-height: var(--in-line-height-2xl);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: var(--in-letter-spacing-2xl);
}
.meta-hub__subtitle {
  margin: 0;
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
}

.meta-hub__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.meta-hub__section-title {
  margin: 0;
  font-size: var(--in-font-size-xl);
  line-height: var(--in-line-height-xl);
  font-weight: var(--in-font-weight-medium);
  color: var(--in-text-accent);
  letter-spacing: var(--in-letter-spacing-xl);
}
.meta-hub__section-hint {
  margin: 0;
  font-size: var(--in-font-size-xs);
  color: var(--in-text-subtle);
}

.meta-hub__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.meta-hub__grid--full {
  grid-template-columns: 1fr;
}

@media (min-width: 1400px) {
  .meta-hub__grid {
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  }
}
</style>
