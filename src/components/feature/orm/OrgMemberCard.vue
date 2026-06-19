<script setup>
/**
 * OrgMemberCard — 조직도(ORM0002) '조직인원 보기' 구성원 카드.
 * ★ (2026-06-19, dspark): saaswin MemberCard.tsx 대응 Vue 컴포넌트(사용자 컴포넌트화 정책).
 *   아바타(person 아이콘, 조직장=파랑) + 이름/사번 + 소속·직위·직책 + 조직장 칩.
 *   사진: ORM0040 OUT 에 file_id 없음 → 현재 person 아이콘 아바타(saaswin 도 미연결 시 동일). 사진 endpoint 후속.
 *   Figma 노드 ID = TBD. 출처: 신규(orm 도메인 전용).
 */
import PersonIcon from '@/assets/icons/person.svg';

defineProps({
  name: { type: String, default: '' },   // 이름
  empNo: { type: String, default: '' },   // 사번
  orgNm: { type: String, default: '' },   // 소속 조직
  jbps: { type: String, default: '' },    // 직위
  jbttl: { type: String, default: '' },   // 직책
  jbgd: { type: String, default: '' },    // 직급
  isLeader: { type: Boolean, default: false }, // 조직장 여부
});
</script>

<template>
  <div class="mcard" :class="{ 'mcard--leader': isLeader }">
    <div class="mcard__avatar"><img :src="PersonIcon" alt="" /></div>
    <div class="mcard__body">
      <div class="mcard__row">
        <span class="mcard__name" :title="name">{{ name || '-' }}</span>
        <span v-if="empNo" class="mcard__empno">{{ empNo }}</span>
      </div>
      <div class="mcard__sub">{{ [orgNm, jbps, jbttl].filter(Boolean).join(', ') || '—' }}</div>
      <span v-if="isLeader" class="mcard__chip">조직장</span>
    </div>
  </div>
</template>

<style scoped>
.mcard { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px;
  border: 1px solid #eef2f7; border-radius: 8px; background: #fff; }
.mcard--leader { border-color: var(--in-border-brand, #bfdbfe); background: var(--in-surface-accent-success, #f0f9ff); }
.mcard__avatar { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%; background: #f1f5f9;
  display: flex; align-items: center; justify-content: center; overflow: hidden; }
.mcard--leader .mcard__avatar { background: var(--in-bg-accent-brand, #dbeafe); }
.mcard__avatar img { width: 20px; height: 20px; display: block; opacity: .75; }
.mcard__body { flex: 1; min-width: 0; }
.mcard__row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.mcard__name { font-weight: 600; font-size: 13px; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mcard__empno { flex: 0 0 auto; font-size: 11px; color: #94a3b8; }
.mcard__sub { margin-top: 2px; font-size: 11px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mcard__chip { display: inline-block; margin-top: 6px; padding: 1px 8px; font-size: 10px; border-radius: 999px;
  background: var(--in-bg-accent-brand, #dbeafe); color: var(--in-brand, #2563eb); }
</style>
