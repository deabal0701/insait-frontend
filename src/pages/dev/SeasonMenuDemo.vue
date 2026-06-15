<script setup>
/**
 * SeasonMenuDemo — 시즌메뉴 조건부 입력/검증 데모 (TO-BE)
 *
 * AS-IS(aut0050.jsp) 허점 교정:
 *   AS-IS 는 [시즌메뉴표시 체크박스] + [시작일] + [종료일] 이 서로 독립된 셀이라
 *   - 체크해도 날짜칸이 활성화되지 않고(항상 편집 가능),
 *   - SEASON_YN='Y' 인데 날짜가 비어도 저장됨(검증 없음).
 *
 * TO-BE 동작(본 데모):
 *   ① 시즌메뉴 체크 → 시작/종료일 enable + required
 *   ② 체크 해제 → 날짜 disable + 값 클리어
 *   ③ 저장 검증: 시즌이면 시작·종료일 필수 + 시작일 ≤ 종료일
 *   ④ 저장 페이로드 = AS-IS FRM_MENU 컬럼(SEASON_YN/S_STA_YMD/S_END_YMD) 그대로
 *      (S_*_YMD 는 envelope 정합 'YYYYMMDD' 문자열 — InDatePicker 기본 valueFormat)
 */
import { ref, computed } from 'vue';

import InCheckbox from '@/components/ui/InCheckbox.vue';
import InDatePicker from '@/components/ui/InDatePicker.vue';
import InButton from '@/components/ui/InButton.vue';

// === 편집 상태 (FRM_MENU 1행에 대응) ===
const seasonYn = ref(false);   // ↔ SEASON_YN ('Y'/'N')  — InCheckbox 는 Boolean modelValue
const staYmd = ref('');        // ↔ S_STA_YMD  ('YYYYMMDD')
const endYmd = ref('');        // ↔ S_END_YMD  ('YYYYMMDD')

const attempted = ref(false);  // [저장]을 한 번이라도 눌렀는가 (그 전엔 에러 숨김)
const savedPayload = ref('');  // 저장 성공 시 전송 페이로드 미리보기

// === ①/② 체크 해제 시 날짜 클리어 ===
function onSeasonToggle(next) {
  if (!next) {
    staYmd.value = '';
    endYmd.value = '';
  }
}

// === ③ 검증 — 비시즌이면 검증 없음, 시즌이면 필수 + 기간 ===
//   valueFormat='YYYYMMDD' 고정폭 문자열이라 사전식 비교(>)가 곧 날짜 비교.
const errors = computed(() => {
  const e = {};
  if (!seasonYn.value) return e;
  if (!staYmd.value) e.sta = '시즌 시작일을 선택하세요.';
  if (!endYmd.value) e.end = '시즌 종료일을 선택하세요.';
  if (staYmd.value && endYmd.value && staYmd.value > endYmd.value) {
    e.range = '시작일은 종료일보다 늦을 수 없습니다.';
  }
  return e;
});
const isValid = computed(() => Object.keys(errors.value).length === 0);

// 에러를 화면에 보일지 (저장 시도 후에만)
const show = computed(() => attempted.value);

// === ④ 저장 ===
function onSave() {
  attempted.value = true;
  if (!isValid.value) {
    savedPayload.value = '';
    return;
  }
  const payload = {
    SEASON_YN: seasonYn.value ? 'Y' : 'N',
    S_STA_YMD: seasonYn.value ? staYmd.value : '',
    S_END_YMD: seasonYn.value ? endYmd.value : '',
  };
  // 실제로는 useService().call('AUT0050_00_S01', { ... }) 로 envelope 저장
  savedPayload.value = JSON.stringify(payload, null, 2);
}
</script>

<template>
  <div class="season-demo">
    <h2 class="season-demo__title">시즌메뉴 설정 (TO-BE 데모)</h2>
    <p class="season-demo__desc">
      시즌메뉴를 체크하면 시작/종료일이 활성화되고, 저장 시 기간을 검증합니다.
    </p>

    <div class="season-demo__form">
      <!-- ① 시즌메뉴 표시 -->
      <InCheckbox
        v-model="seasonYn"
        label="시즌메뉴 표시"
        @change="onSeasonToggle"
      />

      <!-- 시작일: 비시즌이면 disable -->
      <div class="season-demo__field">
        <InDatePicker
          v-model="staYmd"
          label="시즌 시작일"
          :disabled="!seasonYn"
          :required="seasonYn"
          :error="show && (!!errors.sta || !!errors.range)"
        />
        <p v-if="show && errors.sta" class="season-demo__err">{{ errors.sta }}</p>
      </div>

      <!-- 종료일 -->
      <div class="season-demo__field">
        <InDatePicker
          v-model="endYmd"
          label="시즌 종료일"
          :disabled="!seasonYn"
          :required="seasonYn"
          :error="show && (!!errors.end || !!errors.range)"
        />
        <p v-if="show && errors.end" class="season-demo__err">{{ errors.end }}</p>
        <p v-if="show && errors.range" class="season-demo__err">{{ errors.range }}</p>
      </div>

      <div class="season-demo__actions">
        <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onSave">
          저장
        </InButton>
      </div>
    </div>

    <!-- ④ 저장 페이로드 미리보기 (출력단) -->
    <pre v-if="savedPayload" class="season-demo__result">{{ savedPayload }}</pre>
  </div>
</template>

<style scoped>
.season-demo {
  max-width: 480px;
  padding: 24px;
  font-family: var(--in-font-family-body);
}
.season-demo__title {
  font-size: var(--in-font-size-lg);
  font-weight: var(--in-font-weight-medium);
  margin: 0 0 4px;
}
.season-demo__desc {
  font-size: var(--in-font-size-sm);
  color: var(--in-text-subtle);
  margin: 0 0 20px;
}
.season-demo__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.season-demo__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.season-demo__err {
  margin: 0;
  padding-left: 95px; /* InDatePicker label-width(85) + gap(10) 정렬 */
  color: var(--in-text-error);
  font-size: var(--in-font-size-xs);
}
.season-demo__actions {
  margin-top: 8px;
}
.season-demo__result {
  margin-top: 20px;
  padding: 12px;
  background: var(--in-surface-default);
  border-radius: var(--in-radius-xs);
  font-size: var(--in-font-size-sm);
  white-space: pre-wrap;
}
</style>
