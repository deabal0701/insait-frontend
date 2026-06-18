<script setup>
/**
 * ScreenDesigner — 화면 디자이너 (SCR0010) — ★ (2026-06-18, dspark)
 *
 * 시스템관리 > 메타관리 > 화면 디자이너. OBJECT 에 매핑되는 "레이아웃 메타"를 저작하고 라이브 미리보기.
 * v1: DB 없이 localStorage(screenMetaRepo). 추후 admin REST(OBJECT 속성)로 무변경 승격.
 * 설계: 02-tobe/04-admin-lane/dev-tools/08_screen-designer.md · 렌더러: components/common/SgScreenRenderer.vue
 *
 * 편집 = 상단 구조 폼(objectId/title/layout) + JSON 편집(상세). [적용] 시 미리보기 remount.
 */
import { ref, computed, onMounted } from 'vue';
import { screenMetaRepo, ORM9999_SEED } from '@/services/screenMetaRepo';
import SgScreenRenderer from '@/components/common/SgScreenRenderer.vue';
import InCard from '@/components/ui/InCard.vue';
import InButton from '@/components/ui/InButton.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InTextField from '@/components/ui/InTextField.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

const screens = ref([]);                 // 저장된 메타 목록
const selectedId = ref('');
const meta = ref(null);                  // 현재 편집 중인 메타(객체)
const jsonText = ref('');
const jsonError = ref('');
const previewKey = ref(0);               // 미리보기 강제 remount

const screenOptions = computed(() => screens.value.map((m) => ({ value: m.objectId, label: `${m.objectId} — ${m.title}` })));
const layoutOptions = [
  { value: 'single', label: 'single (검색+그리드 1)' },
  { value: 'rows', label: 'rows (그리드 상/하)' },
  { value: 'cols', label: 'cols (그리드 좌/우)' },
];

function reloadList() { screens.value = screenMetaRepo.list(); }
function refreshJson() { jsonText.value = JSON.stringify(meta.value, null, 2); }
function bumpPreview() { previewKey.value += 1; }

function load(objectId) {
  const m = screenMetaRepo.get(objectId);
  if (!m) return;
  selectedId.value = objectId;
  meta.value = m;
  refreshJson();
  bumpPreview();
}

// 구조 폼 → meta 직접 수정 후 JSON·미리보기 동기화
function onLayout(v) { if (!meta.value) return; meta.value = { ...meta.value, layout: v }; refreshJson(); bumpPreview(); }
function onTitle(v) { if (!meta.value) return; meta.value.title = v; refreshJson(); }
function onObjectId(v) { if (!meta.value) return; meta.value.objectId = v; refreshJson(); }

// JSON 편집 → 적용(파싱) → meta·미리보기 반영
function applyJson() {
  try {
    const parsed = JSON.parse(jsonText.value);
    meta.value = parsed; jsonError.value = ''; bumpPreview();
    toast.success?.('적용됨 (미리보기 갱신)');
  } catch (e) { jsonError.value = String(e?.message || e); }
}

function onSave() {
  if (!meta.value?.objectId) { toast.error?.('objectId 가 필요합니다'); return; }
  screenMetaRepo.save(meta.value);
  reloadList(); selectedId.value = meta.value.objectId;
  toast.success?.(`저장됨 (localStorage) — ${meta.value.objectId}`);
}
function onDelete() {
  if (!selectedId.value) return;
  if (!window.confirm(`'${selectedId.value}' 화면 메타를 삭제할까요? (localStorage)`)) return;
  screenMetaRepo.remove(selectedId.value);
  reloadList();
  if (screens.value.length) load(screens.value[0].objectId);
  else { meta.value = null; jsonText.value = ''; selectedId.value = ''; }
}
function onNew() {
  meta.value = {
    version: 1, objectId: 'NEW0001', title: '새 화면', layout: 'single',
    search: { fields: [{ key: 'baseYmd', label: '기준일자', type: 'date', role: 'server', chip: false }] },
    panels: [{
      id: 'p1', title: '목록', objectId: 'NEW0001',
      retrieve: { serviceId: '', slot: '', in: { company_cd: '{session.companyCd}', base_ymd: '{search.baseYmd}' } },
      save: { serviceId: '' }, toolbar: ['add', 'delete', 'restore', 'save'], newRow: {}, columns: [],
    }],
  };
  selectedId.value = ''; refreshJson(); bumpPreview();
}
function onRestoreSeed() {
  screenMetaRepo.save(JSON.parse(JSON.stringify(ORM9999_SEED)));
  reloadList(); load('ORM9999');
  toast.success?.('ORM9999 시드 복원');
}

onMounted(() => {
  screenMetaRepo.seedIfEmpty();
  reloadList();
  load(screens.value[0]?.objectId || 'ORM9999');
});
</script>

<template>
  <div class="sd">
    <header class="sd__head">
      <h1 class="sd__title">화면 디자이너</h1>
      <span class="sd__sub">OBJECT 에 매핑되는 레이아웃 메타를 저작 · 라이브 미리보기 · <code>SCR0010</code> (v1: localStorage)</span>
    </header>

    <div class="sd__body">
      <!-- 편집 -->
      <section class="sd__edit">
        <InCard class="sd__card">
          <div class="sd__bar">
            <InSelect
              :model-value="selectedId"
              :options="screenOptions"
              :show-label="false"
              input="저장된 화면"
              size="sm"
              class="sd__pick"
              @update:model-value="load"
            />
            <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onNew">새로</InButton>
            <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onSave">저장</InButton>
            <InButton size="sm" variant="danger" :left-icon-show="false" :right-icon-show="false" @click="onDelete">삭제</InButton>
            <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onRestoreSeed">시드 복원</InButton>
          </div>

          <div v-if="meta" class="sd__form">
            <label class="sd__f"><span>OBJECT ID</span>
              <InTextField :model-value="meta.objectId" :show-label="false" input="ORM9999" @update:model-value="onObjectId" />
            </label>
            <label class="sd__f"><span>제목</span>
              <InTextField :model-value="meta.title" :show-label="false" input="사업장관리" @update:model-value="onTitle" />
            </label>
            <label class="sd__f"><span>레이아웃</span>
              <InSelect :model-value="meta.layout" :options="layoutOptions" :show-label="false" size="sm" @update:model-value="onLayout" />
            </label>
            <p class="sd__hint">검색 필드 {{ meta.search?.fields?.length || 0 }} · 패널 {{ meta.panels?.length || 0 }} — 상세는 아래 JSON 편집</p>
          </div>
        </InCard>

        <InCard class="sd__card sd__card--json">
          <div class="sd__json-head">
            <strong>레이아웃 메타 (JSON)</strong>
            <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="applyJson">적용 → 미리보기</InButton>
          </div>
          <textarea v-model="jsonText" class="sd__json" spellcheck="false" wrap="off"></textarea>
          <p v-if="jsonError" class="sd__err">JSON 오류: {{ jsonError }}</p>
        </InCard>
      </section>

      <!-- 미리보기 -->
      <section class="sd__preview">
        <div class="sd__preview-head"><strong>미리보기</strong> <span class="sd__sub">메타로 렌더 (envelope 보존 호출)</span></div>
        <div class="sd__preview-body">
          <SgScreenRenderer v-if="meta && meta.objectId" :key="previewKey" :meta="meta" />
          <p v-else class="sd__empty">편집할 화면을 선택하거나 [새로] 하세요.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sd { display: flex; flex-direction: column; gap: 12px; padding: 16px; font-family: var(--in-font-family-body); }
.sd__head { display: flex; align-items: baseline; gap: 10px; }
.sd__title { margin: 0; font-size: 18px; line-height: 24px; font-weight: var(--in-font-weight-medium); color: var(--in-text-default); }
.sd__sub { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.sd__sub code { font-family: var(--in-font-family-mono, ui-monospace); color: var(--in-text-accent); }

.sd__body { display: flex; gap: 12px; align-items: flex-start; }
.sd__edit { flex: 0 0 380px; display: flex; flex-direction: column; gap: 12px; }
.sd__preview { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; }

.sd__card { padding: 14px 16px; }
.sd__bar { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.sd__pick { flex: 1 1 140px; min-width: 120px; }
.sd__form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.sd__f { display: grid; grid-template-columns: 72px 1fr; align-items: center; gap: 8px; }
.sd__f > span { text-align: right; font-size: var(--in-font-size-sm); color: var(--in-text-default); }
.sd__hint { margin: 4px 0 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }

.sd__card--json { display: flex; flex-direction: column; gap: 8px; }
.sd__json-head { display: flex; align-items: center; justify-content: space-between; }
.sd__json {
  width: 100%; height: 360px; resize: vertical; box-sizing: border-box;
  font-family: var(--in-font-family-mono, ui-monospace, monospace); font-size: 12px; line-height: 1.5;
  padding: 10px; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: var(--in-radius-xs, 4px);
  color: var(--in-text-default); background: var(--in-bg-white, #fff); white-space: pre;
}
.sd__err { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-error, #e33131); }

.sd__preview-head { display: flex; align-items: baseline; gap: 8px; }
.sd__preview-body {
  border: 1px dashed var(--in-border-default, #e2e2e2); border-radius: var(--in-radius-xs, 4px);
  padding: 12px; min-height: 200px; background: var(--in-bg-default);
}
.sd__empty { color: var(--in-text-subtle); text-align: center; padding: 40px 0; }
</style>
