<script setup>
/**
 * ScreenDesigner — 화면 디자이너 (SCR0010) Visual Basic 식 폼 빌더 — ★ (2026-06-18, dspark)
 *
 * 컨트롤 팔레트 → 12컬럼 그리드 캔버스에 배치(드래그/리사이즈) → 선택 시 속성 시트 → JSON 저장(localStorage).
 * [미리보기] = 실제 렌더(FormRenderer). 메뉴 클릭 시 동작은 /screen/:objectId (ScreenHost) 가 같은 메타 렌더.
 * 컨트롤 = components/designer/controls.js (추가/교체 쉬움). 설계: 04-admin-lane/dev-tools/08_screen-designer.md
 */
import { ref, computed, onMounted } from 'vue';
import { GridLayout, GridItem } from 'grid-layout-plus';
// grid-layout-plus 1.1.x 는 스타일을 JS 로 주입 — 별도 CSS import 불필요(해당 export 없음).
import { CONTROLS, CATEGORIES, CONTROL_MAP, makeWidget } from '@/components/designer/controls';
import ControlView from '@/components/designer/ControlView.vue';
import FormRenderer from '@/components/common/FormRenderer.vue';
import { screenMetaRepo, DEMO_SEED } from '@/services/screenMetaRepo';
import InButton from '@/components/ui/InButton.vue';
import InSelect from '@/components/ui/InSelect.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

const screens = ref([]);
const selectedId = ref('');
const meta = ref(blankMeta());
const selWid = ref('');                 // 선택 위젯 i
const mode = ref('design');             // 'design' | 'preview'
const jsonErr = ref({});                // { 'wi:key': msg }
let seq = 100;

function blankMeta() {
  return { version: 2, objectId: 'NEW0001', title: '새 화면', grid: { cols: 12, rowHeight: 40 }, widgets: [] };
}
const screenOptions = computed(() => screens.value.map((m) => ({ value: m.objectId, label: `${m.objectId} — ${m.title}` })));
const palette = computed(() => CATEGORIES.map((c) => ({ ...c, items: CONTROLS.filter((x) => x.cat === c.key) })));
const gridColsOptions = [{ value: 12, label: '12 컬럼' }, { value: 24, label: '24 컬럼' }];
// 컬럼 수 변경(가로) — 위젯 x/w 비율 스케일(레이아웃 유지). 행(y/h)은 불변.
function onCols(v) {
  const n = Number(v); const old = meta.value.grid?.cols || 12;
  if (!n || n === old) return;
  const f = n / old;
  meta.value.widgets.forEach((w) => { w.x = Math.round(w.x * f); w.w = Math.max(1, Math.round(w.w * f)); });
  meta.value.grid = { ...meta.value.grid, cols: n };
}
// 행 정밀도 변경(세로) — rowHeight(칸당 px). 작을수록 행 많아짐. 위젯 y/h 비율 스케일(픽셀 위치 유지). 컬럼(x/w) 불변.
const gridRowsOptions = [{ value: 40, label: '행 1배' }, { value: 20, label: '행 2배' }];
function onRows(v) {
  const n = Number(v); const old = meta.value.grid?.rowHeight || 40;
  if (!n || n === old) return;
  const f = old / n;
  meta.value.widgets.forEach((w) => { w.y = Math.round(w.y * f); w.h = Math.max(1, Math.round(w.h * f)); });
  meta.value.grid = { ...meta.value.grid, rowHeight: n };
}
const selectedWidget = computed(() => meta.value.widgets.find((w) => w.i === selWid.value) || null);
const selectedDef = computed(() => (selectedWidget.value ? CONTROL_MAP[selectedWidget.value.type] : null));

function reloadList() { screens.value = screenMetaRepo.list(); }
function load(objectId) {
  const m = screenMetaRepo.get(objectId);
  if (!m) return;
  selectedId.value = objectId; meta.value = JSON.parse(JSON.stringify(m)); selWid.value = '';
  seq = 100 + meta.value.widgets.length;
}

// ── 팔레트 → 위젯 추가(하단 배치) ──
function addWidget(type) {
  const maxY = meta.value.widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
  const id = `w${seq += 1}`;
  const wg = makeWidget(type, id, { x: 0, y: maxY });
  if (!wg) return;
  meta.value.widgets.push(wg);
  selWid.value = id;
}
function removeWidget(id) {
  meta.value.widgets = meta.value.widgets.filter((w) => w.i !== id);
  if (selWid.value === id) selWid.value = '';
}

// ── 속성 시트 ──
function jsonStr(v) { try { return JSON.stringify(v, null, 2); } catch (e) { return ''; } }
function setJson(w, key, text) {
  const k = `${w.i}:${key}`;
  try { w.props[key] = JSON.parse(text); jsonErr.value = { ...jsonErr.value, [k]: '' }; }
  catch (e) { jsonErr.value = { ...jsonErr.value, [k]: String(e?.message || e) }; }
}

// ── 저장/관리 ──
function onSave() {
  if (!meta.value.objectId) { toast.error?.('OBJECT ID 가 필요합니다'); return; }
  screenMetaRepo.save(meta.value); reloadList(); selectedId.value = meta.value.objectId;
  toast.success?.(`저장됨 (localStorage) — ${meta.value.objectId}`);
}
function onDelete() {
  if (!selectedId.value) return;
  if (!window.confirm(`'${selectedId.value}' 화면을 삭제할까요?`)) return;
  screenMetaRepo.remove(selectedId.value); reloadList();
  if (screens.value.length) load(screens.value[0].objectId); else { meta.value = blankMeta(); selectedId.value = ''; }
}
function onNew() { meta.value = blankMeta(); selectedId.value = ''; selWid.value = ''; seq = 100; }
function onRestoreSeed() {
  screenMetaRepo.save(JSON.parse(JSON.stringify(DEMO_SEED))); reloadList(); load(DEMO_SEED.objectId);
  toast.success?.('데모(사업장관리) 복원');
}

onMounted(() => {
  screenMetaRepo.seedIfEmpty(); reloadList();
  load(screens.value[0]?.objectId || DEMO_SEED.objectId);
});
</script>

<template>
  <div class="fd">
    <!-- 상단 바 -->
    <header class="fd__top">
      <h1 class="fd__title">화면 디자이너 <span class="fd__obj"><code>SCR0010</code></span></h1>
      <div class="fd__top-r">
        <InSelect :model-value="selectedId" :options="screenOptions" :show-label="false" input="저장된 화면" size="sm" class="fd__pick" @update:model-value="load" />
        <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onNew">새로</InButton>
        <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onSave">저장</InButton>
        <InButton size="sm" variant="danger" :left-icon-show="false" :right-icon-show="false" @click="onDelete">삭제</InButton>
        <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="onRestoreSeed">데모 복원</InButton>
        <InSelect :model-value="meta.grid.cols" :options="gridColsOptions" :show-label="false" size="sm" class="fd__cols" @update:model-value="onCols" />
        <InSelect :model-value="meta.grid.rowHeight" :options="gridRowsOptions" :show-label="false" size="sm" class="fd__cols" @update:model-value="onRows" />
        <InButton size="sm" :variant="mode === 'preview' ? 'primary' : 'default'" :left-icon-show="false" :right-icon-show="false" @click="mode = mode === 'design' ? 'preview' : 'design'">
          {{ mode === 'design' ? '미리보기' : '디자인' }}
        </InButton>
      </div>
    </header>

    <div class="fd__body">
      <!-- 팔레트 -->
      <aside class="fd__palette">
        <div class="fd__meta">
          <input v-model="meta.objectId" class="fd__in" placeholder="OBJECT ID" />
          <input v-model="meta.title" class="fd__in" placeholder="화면 제목" />
        </div>
        <div v-for="cat in palette" :key="cat.key" class="fd__cat">
          <div class="fd__cat-label">{{ cat.label }}</div>
          <button v-for="c in cat.items" :key="c.type" type="button" class="fd__ctl" :title="c.type" @click="addWidget(c.type)">
            <span class="fd__ctl-g">{{ c.glyph }}</span><span class="fd__ctl-n">{{ c.name }}</span>
          </button>
        </div>
      </aside>

      <!-- 캔버스 / 미리보기 -->
      <main class="fd__canvas" :style="{ backgroundSize: (100 / meta.grid.cols).toFixed(4) + '% ' + meta.grid.rowHeight + 'px' }">
        <FormRenderer v-if="mode === 'preview'" :meta="meta" />
        <GridLayout
          v-else
          :layout="meta.widgets"
          :col-num="meta.grid.cols"
          @update:layout="(v) => (meta.widgets = v)"
          :row-height="meta.grid.rowHeight"
          :is-draggable="true"
          :is-resizable="true"
          :margin="[8, 8]"
          :use-css-transforms="true"
        >
          <GridItem v-for="w in meta.widgets" :key="w.i" :x="w.x" :y="w.y" :w="w.w" :h="w.h" :i="w.i">
            <div class="fd-w" :class="{ 'fd-w--sel': selWid === w.i }" @click="selWid = w.i">
              <button type="button" class="fd-w__del" title="삭제" @click.stop="removeWidget(w.i)">✕</button>
              <ControlView :widget="w" design />
            </div>
          </GridItem>
        </GridLayout>
      </main>

      <!-- 속성 시트 -->
      <aside class="fd__props">
        <div v-if="selectedWidget" class="fd__props-in">
          <div class="fd__props-head">{{ selectedDef?.name }} <span class="fd__props-type">{{ selectedWidget.type }}</span></div>

          <div class="fd__geo">
            <label>X<input type="number" v-model.number="selectedWidget.x" /></label>
            <label>Y<input type="number" v-model.number="selectedWidget.y" /></label>
            <label>W<input type="number" v-model.number="selectedWidget.w" /></label>
            <label>H<input type="number" v-model.number="selectedWidget.h" /></label>
          </div>

          <div v-for="f in selectedDef?.schema || []" :key="f.key" class="fd__pf">
            <label class="fd__pf-l">{{ f.label }}</label>
            <input v-if="f.kind === 'text'" v-model="selectedWidget.props[f.key]" class="fd__in" />
            <input v-else-if="f.kind === 'number'" type="number" v-model.number="selectedWidget.props[f.key]" class="fd__in" />
            <select v-else-if="f.kind === 'select'" v-model="selectedWidget.props[f.key]" class="fd__in">
              <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <label v-else-if="f.kind === 'switch'" class="fd__sw"><input type="checkbox" v-model="selectedWidget.props[f.key]" /> {{ selectedWidget.props[f.key] ? 'ON' : 'OFF' }}</label>
            <template v-else-if="f.kind === 'json'">
              <textarea class="fd__json" :value="jsonStr(selectedWidget.props[f.key])" spellcheck="false" @change="setJson(selectedWidget, f.key, $event.target.value)"></textarea>
              <span v-if="jsonErr[`${selectedWidget.i}:${f.key}`]" class="fd__err">{{ jsonErr[`${selectedWidget.i}:${f.key}`] }}</span>
            </template>
          </div>

          <InButton size="sm" variant="danger" :left-icon-show="false" :right-icon-show="false" @click="removeWidget(selectedWidget.i)">컨트롤 삭제</InButton>
        </div>
        <p v-else class="fd__props-empty">캔버스의 컨트롤을 클릭하면 속성이 표시됩니다.<br />좌측 팔레트에서 컨트롤을 추가하세요.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.fd { display: flex; flex-direction: column; height: calc(100vh - 80px); padding: 12px; gap: 10px; font-family: var(--in-font-family-body); }
.fd__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.fd__title { margin: 0; font-size: 18px; font-weight: var(--in-font-weight-medium); color: var(--in-text-default); }
.fd__obj code { font-family: var(--in-font-family-mono, ui-monospace); font-size: 12px; color: var(--in-text-subtle); }
.fd__top-r { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.fd__pick { width: 200px; }

.fd__body { flex: 1 1 0; min-height: 0; display: flex; gap: 10px; }
.fd__palette { flex: 0 0 150px; overflow: auto; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 6px; padding: 10px; background: var(--in-bg-white, #fff); }
.fd__meta { display: flex; flex-direction: column; gap: 6px; }
.fd__cat-label { font-size: 11px; color: var(--in-text-subtle); margin-bottom: 4px; font-weight: 600; }
.fd__ctl { display: flex; align-items: center; gap: 6px; width: 100%; padding: 5px 8px; margin-bottom: 4px; border: 1px solid var(--in-border-subtle, #eee); border-radius: 4px; background: var(--in-bg-default); cursor: pointer; font-size: 12px; color: var(--in-text-default); text-align: left; }
.fd__ctl:hover { border-color: var(--in-border-brand, #36c1e8); background: var(--in-bg-accent-brand, #e1f5fc99); }
.fd__ctl-g { width: 16px; text-align: center; }

/* background-size 는 컬럼 수에 맞춰 인라인 :style 에서 동적 지정(12→8.33% / 24→4.17%). */
.fd__canvas { flex: 1 1 0; min-width: 0; overflow: auto; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 6px; padding: 8px; background: var(--in-bg-default); background-image: linear-gradient(var(--in-border-subtle, #f0f0f0) 1px, transparent 1px), linear-gradient(90deg, var(--in-border-subtle, #f0f0f0) 1px, transparent 1px); }
.fd__cols { width: 110px; }

.fd-w { position: relative; width: 100%; height: 100%; border: 1px dashed transparent; border-radius: 4px; padding: 2px; box-sizing: border-box; background: var(--in-bg-white, #fff); overflow: hidden; }
.fd-w:hover { border-color: var(--in-border-input, #c9c9c9); }
.fd-w--sel { border: 1px solid var(--in-border-brand, #36c1e8); box-shadow: 0 0 0 2px var(--in-bg-accent-brand, #e1f5fc99); }
.fd-w__del { position: absolute; top: 2px; right: 2px; z-index: 2; width: 18px; height: 18px; line-height: 16px; padding: 0; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 4px; background: var(--in-bg-white, #fff); cursor: pointer; font-size: 11px; color: var(--in-text-subtle); opacity: 0; }
.fd-w:hover .fd-w__del, .fd-w--sel .fd-w__del { opacity: 1; }

.fd__props { flex: 0 0 270px; overflow: auto; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 6px; padding: 12px; background: var(--in-bg-white, #fff); }
.fd__props-head { font-size: var(--in-font-size-md); color: var(--in-text-default); margin-bottom: 10px; }
.fd__props-type { font-family: var(--in-font-family-mono, ui-monospace); font-size: 11px; color: var(--in-text-subtle); }
.fd__geo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
.fd__geo label { display: flex; flex-direction: column; font-size: 11px; color: var(--in-text-subtle); gap: 2px; }
.fd__pf { margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px; }
.fd__pf-l { font-size: 12px; color: var(--in-text-default); }
.fd__sw { font-size: 12px; color: var(--in-text-default); display: inline-flex; align-items: center; gap: 6px; }
.fd__in, .fd__geo input { width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 4px; font-size: 12px; font-family: inherit; color: var(--in-text-default); background: var(--in-bg-white, #fff); }
.fd__json { width: 100%; box-sizing: border-box; height: 140px; resize: vertical; padding: 8px; border: 1px solid var(--in-border-default, #e2e2e2); border-radius: 4px; font-family: var(--in-font-family-mono, ui-monospace, monospace); font-size: 11px; white-space: pre; color: var(--in-text-default); }
.fd__err { font-size: 11px; color: var(--in-text-error, #e33131); }
.fd__props-empty { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); text-align: center; padding: 30px 8px; line-height: 1.6; }
</style>
