<script setup>
/**
 * OrgNodeCard — 조직도(RD002) Vue Flow 커스텀 노드 카드.
 * ★ (2026-06-19, dspark): 조직명 + 조직코드 + 접기/펴기 토글(자식 있을 때). 버튼은 컴포넌트로 분리(사용자 정책).
 *   Figma 노드 ID = TBD (조직도 카드). 출처: 신규(orm 도메인 전용).
 *   data = { orgId, name, code, hasChildren, collapsed, ... }. 접기 토글 클릭 시 'toggle'(orgId) emit.
 */
defineProps({
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  direction: { type: String, default: 'LR' }, // LR=가로(토글 우측) | TB=세로(토글 하단) — 자식 연결 방향
});
defineEmits(['toggle']);
</script>

<template>
  <div class="org-node" :class="{ 'is-selected': selected }">
    <div class="org-node__name" :title="data.name">{{ data.name || '(이름없음)' }}</div>
    <div class="org-node__sub">{{ data.code || '—' }}</div>
    <!-- 접기/펴기 토글 (자식 있을 때만) — 가로=우측 / 세로=하단(자식이 있는 방향). 접힘:+ / 펼침:− -->
    <button
      v-if="data.hasChildren"
      type="button"
      class="org-node__toggle"
      :class="[{ 'is-selected': selected }, direction === 'TB' ? 'org-node__toggle--bottom' : 'org-node__toggle--right']"
      :title="data.collapsed ? '하위 조직 펼치기' : '하위 조직 접기'"
      @click.stop="$emit('toggle', data.orgId)"
    >{{ data.collapsed ? '+' : '−' }}</button>
  </div>
</template>

<style scoped>
.org-node { position: relative; width: 184px; min-height: 56px; padding: 8px 12px; background: #fff; border: 1px solid #cbd5e1;
  border-top: 3px solid #94a3b8; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.06);
  display: flex; flex-direction: column; gap: 4px; text-align: center; }
.org-node.is-selected { border-color: var(--in-brand, #2563eb); border-top-color: var(--in-brand, #2563eb);
  box-shadow: 0 0 0 2px rgba(37,99,235,.25); }
.org-node__name { font-weight: 700; font-size: 13px; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.org-node__sub { font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 4px; }

/* 접기/펴기 토글 — 원형(+/−), 자식 연결 방향(가로=우측 / 세로=하단). 선택 시 파란 채움. */
.org-node__toggle { position: absolute; z-index: 2;
  width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: #fff; color: #64748b; border: 1px solid #cbd5e1; cursor: pointer; font-size: 14px; line-height: 1;
  box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.org-node__toggle--right { right: -11px; top: 50%; transform: translateY(-50%); }
.org-node__toggle--bottom { bottom: -11px; left: 50%; transform: translateX(-50%); }
.org-node__toggle:hover { border-color: var(--in-brand, #2563eb); color: var(--in-brand, #2563eb); }
.org-node__toggle.is-selected { background: var(--in-brand, #2563eb); color: #fff; border-color: var(--in-brand, #2563eb); }
</style>
