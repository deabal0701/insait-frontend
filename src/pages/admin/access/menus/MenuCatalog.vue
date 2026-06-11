<script setup>
/**
 * MenuCatalog — AUT0050 메뉴관리 (admin lane access 차선, 직접 REST).
 * ★ (2026-06-11, dspark): 좌 메뉴 lazy 트리(FRM_MENU self-FK, 메뉴그룹 필터) + 우 편집 폼.
 *   AS-IS = 메뉴그룹 콤보(개인/시스템총괄) + 트리그리드(MultiSave). TO-BE = lazy 트리 + 노드별 REST CRUD.
 *   루트/하위 추가, 저장(create/update), 삭제(자식·바인딩 역참조 가드). 오브젝트 연결 = 오브젝트 검색 picker.
 *   백엔드: GET/POST/PUT/DELETE /api/admin/access/menus (+ children/exists). 매뉴얼 06. Figma 노드 ID = TBD.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/composables/useToast';

import MenuTreeNode from '@/components/feature/access/MenuTreeNode.vue';
import InButton from '@/components/ui/InButton.vue';

const toast = useToast();

const MENU_GROUPS = [
  { value: 'SYS_ADMIN', label: '시스템총괄' },
  { value: 'PRIVATE_GROUP', label: '개인' },
];
const YN = [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }];
const YN2 = [{ value: 'Y', label: 'Y' }, { value: 'N', label: 'N' }];

const menuGroup = ref('SYS_ADMIN');
const roots = ref([]);
const loadingTree = ref(false);
const refreshKey = ref(0);
const selectedMenuId = ref(null);

const blank = () => ({
  menuId: '', parentMenuId: 'root', menuNm: '', useYn: 'Y', menuGroup: menuGroup.value,
  objectId: '', objectNmDisplay: '', note: '', seqOrder: null, seasonYn: 'N', closeYn: 'N',
  openTypeCd: '', openTargetNm: '',
});
const form = reactive(blank());
const isCreate = ref(false);
const hasForm = ref(false);
const saving = ref(false);

// 오브젝트 picker
const pickerOpen = ref(false);
const pickerQuery = ref('');
const pickerResults = ref([]);
const pickerLoading = ref(false);

const menuGroupLabel = computed(() => MENU_GROUPS.find((g) => g.value === menuGroup.value)?.label || menuGroup.value);

function setForm(src, create) {
  Object.assign(form, blank(), src || {});
  isCreate.value = create;
  hasForm.value = true;
}

async function loadRoots() {
  loadingTree.value = true;
  try {
    roots.value = await adminApi.access.menus.children(null, menuGroup.value);
  } catch (e) {
    toast.error('메뉴 조회 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally { loadingTree.value = false; }
}

function onChangeGroup() {
  selectedMenuId.value = null; hasForm.value = false;
  loadRoots();
}

async function onSelect(node) {
  selectedMenuId.value = node.menuId;
  try {
    setForm(await adminApi.access.menus.detail(node.menuId), false);
  } catch (e) {
    toast.error('메뉴 상세 조회 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  }
}

function addRoot() {
  selectedMenuId.value = null;
  setForm({ parentMenuId: 'root', menuGroup: menuGroup.value }, true);
}
function addChild() {
  if (!selectedMenuId.value) { toast.info('상위 메뉴를 먼저 선택하세요.'); return; }
  setForm({ parentMenuId: selectedMenuId.value, menuGroup: menuGroup.value }, true);
}

async function save() {
  if (!form.menuId?.trim()) { toast.info('메뉴ID는 필수입니다.'); return; }
  if (!form.menuNm?.trim()) { toast.info('메뉴이름은 필수입니다.'); return; }
  saving.value = true;
  try {
    const payload = { ...form, seqOrder: form.seqOrder === '' ? null : form.seqOrder };
    if (isCreate.value) {
      await adminApi.access.menus.create(payload);
      toast.success('등록되었습니다.');
    } else {
      await adminApi.access.menus.update(form.menuId, payload);
      toast.success('저장되었습니다.');
    }
    const savedId = form.menuId;
    await loadRoots(); refreshKey.value++;
    selectedMenuId.value = savedId;
    setForm(await adminApi.access.menus.detail(savedId), false);
  } catch (e) {
    toast.error('저장 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally { saving.value = false; }
}

async function remove() {
  if (isCreate.value || !form.menuId) return;
  if (!window.confirm(`메뉴 "${form.menuNm}" (${form.menuId}) 을 삭제하시겠습니까?`)) return;
  saving.value = true;
  try {
    await adminApi.access.menus.remove(form.menuId);
    toast.success('삭제되었습니다.');
    hasForm.value = false; selectedMenuId.value = null;
    await loadRoots(); refreshKey.value++;
  } catch (e) {
    toast.error('삭제 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally { saving.value = false; }
}

// ── 오브젝트 picker ──
function openPicker() { pickerOpen.value = true; pickerQuery.value = ''; pickerResults.value = []; }
async function runPicker() {
  if (!pickerQuery.value.trim()) return;
  pickerLoading.value = true;
  try {
    const resp = await adminApi.meta.objects.list({ q: pickerQuery.value.trim(), size: 50, page: 1 });
    pickerResults.value = resp.content || [];
  } catch (e) {
    toast.error('오브젝트 검색 실패: ' + (e?.response?.data?.error?.message || e?.message || e));
  } finally { pickerLoading.value = false; }
}
function pickObject(o) {
  form.objectId = o.objectNm;          // FRM_MENU.OBJECT_ID 에는 OBJECT_NM 저장 (매뉴얼 06 §2)
  form.objectNmDisplay = o.objectDisplayNm || o.objectNm;
  pickerOpen.value = false;
}

onMounted(loadRoots);
</script>

<template>
  <div class="menu">
    <header class="menu__head">
      <h2 class="menu__title">메뉴 관리</h2>
      <p class="menu__desc">화면(오브젝트)이 매달리는 메뉴 트리를 관리합니다. 메뉴그룹(시스템총괄/개인)별 계층 구조.</p>
    </header>

    <div class="menu__toolbar">
      <label>메뉴그룹</label>
      <select v-model="menuGroup" class="menu__group" @change="onChangeGroup">
        <option v-for="g in MENU_GROUPS" :key="g.value" :value="g.value">{{ g.label }}</option>
      </select>
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="loadRoots">조회</InButton>
      <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="addRoot">＋ 루트메뉴</InButton>
    </div>

    <div class="menu__body">
      <!-- 좌: 메뉴 트리 -->
      <aside class="menu__tree">
        <div class="menu__tree-title">{{ menuGroupLabel }} 메뉴</div>
        <ul class="menu__tree-list">
          <MenuTreeNode
            v-for="r in roots"
            :key="r.menuId"
            :node="r"
            :menu-group="menuGroup"
            :selected-menu-id="selectedMenuId"
            :refresh-key="refreshKey"
            @select="onSelect"
          />
          <li v-if="!roots.length && !loadingTree" class="menu__tree-empty">메뉴 없음</li>
        </ul>
      </aside>

      <!-- 우: 편집 폼 -->
      <section class="menu__panel">
        <div v-if="!hasForm" class="menu__empty">← 좌측 메뉴를 선택하거나 [＋ 루트메뉴]로 추가하세요.</div>
        <template v-else>
          <div class="menu__panel-head">
            <span class="menu__panel-title">{{ isCreate ? '메뉴 추가' : '메뉴 편집' }}</span>
            <div class="menu__panel-actions">
              <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="!selectedMenuId || isCreate" @click="addChild">＋ 하위 메뉴</InButton>
              <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="isCreate" @click="remove">삭제</InButton>
              <InButton size="sm" variant="primary" :left-icon-show="false" :right-icon-show="false" :disabled="saving" @click="save">저장</InButton>
            </div>
          </div>

          <div class="menu__form">
            <div class="menu__field">
              <label>메뉴ID *</label>
              <input v-model="form.menuId" :disabled="!isCreate" type="text" class="menu__in" placeholder="예: SD_PDS" />
            </div>
            <div class="menu__field">
              <label>상위메뉴ID</label>
              <input :value="form.parentMenuId" disabled type="text" class="menu__in" />
            </div>
            <div class="menu__field">
              <label>메뉴이름 *</label>
              <input v-model="form.menuNm" type="text" class="menu__in" />
            </div>
            <div class="menu__field">
              <label>오브젝트</label>
              <div class="menu__obj">
                <input :value="form.objectId" disabled type="text" class="menu__in" :placeholder="form.objectNmDisplay || '(미연결 — 폴더/그룹)'" />
                <InButton size="sm" :left-icon-show="false" :right-icon-show="false" @click="openPicker">검색</InButton>
                <InButton v-if="form.objectId" size="sm" :left-icon-show="false" :right-icon-show="false" @click="form.objectId=''; form.objectNmDisplay=''">지우기</InButton>
              </div>
            </div>
            <div class="menu__field">
              <label>사용여부</label>
              <select v-model="form.useYn" class="menu__in"><option v-for="o in YN" :key="o.value" :value="o.value">{{ o.label }}</option></select>
            </div>
            <div class="menu__field">
              <label>메뉴그룹</label>
              <select v-model="form.menuGroup" class="menu__in">
                <option value="">(없음)</option>
                <option v-for="g in MENU_GROUPS" :key="g.value" :value="g.value">{{ g.label }} ({{ g.value }})</option>
              </select>
            </div>
            <div class="menu__field">
              <label>적용순서</label>
              <input v-model.number="form.seqOrder" type="number" class="menu__in" />
            </div>
            <div class="menu__field">
              <label>닫힘여부</label>
              <select v-model="form.closeYn" class="menu__in"><option v-for="o in YN2" :key="o.value" :value="o.value">{{ o.label }}</option></select>
            </div>
            <div class="menu__field">
              <label>시즌메뉴</label>
              <select v-model="form.seasonYn" class="menu__in"><option v-for="o in YN2" :key="o.value" :value="o.value">{{ o.label }}</option></select>
            </div>
            <div class="menu__field menu__field--wide">
              <label>비고</label>
              <input v-model="form.note" type="text" class="menu__in" />
            </div>
          </div>
        </template>
      </section>
    </div>

    <!-- 오브젝트 검색 picker -->
    <div v-if="pickerOpen" class="menu__modal-mask" @click.self="pickerOpen = false">
      <div class="menu__modal">
        <div class="menu__modal-head"><span>오브젝트 검색</span><button type="button" class="menu__modal-x" @click="pickerOpen=false">✕</button></div>
        <div class="menu__modal-search">
          <input v-model="pickerQuery" type="text" placeholder="오브젝트ID 또는 화면명" class="menu__modal-input" @keyup.enter="runPicker" />
          <InButton size="sm" :left-icon-show="false" :right-icon-show="false" :disabled="pickerLoading" @click="runPicker">검색</InButton>
        </div>
        <div class="menu__modal-results">
          <table class="menu__modal-table">
            <thead><tr><th>오브젝트ID</th><th>화면표시명</th><th>유형</th><th></th></tr></thead>
            <tbody>
              <tr v-for="o in pickerResults" :key="o.objectId">
                <td>{{ o.objectNm }}</td><td>{{ o.objectDisplayNm }}</td><td>{{ o.objectType }}</td>
                <td><button type="button" class="menu__pick" @click="pickObject(o)">선택</button></td>
              </tr>
              <tr v-if="!pickerResults.length"><td colspan="4" class="menu__modal-empty">검색 결과 없음 (ID/화면명 입력 후 검색)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu { padding: 16px 20px; }
.menu__head { margin-bottom: 12px; }
.menu__title { margin: 0 0 4px; font-size: var(--in-font-size-lg); font-weight: var(--in-font-weight-bold); color: var(--in-text-default); }
.menu__desc { margin: 0; font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.menu__toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.menu__toolbar label { font-size: var(--in-font-size-sm); color: var(--in-text-subtle); }
.menu__group { padding: 5px 8px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.menu__body { display: flex; gap: 16px; align-items: flex-start; }

.menu__tree { flex: 0 0 320px; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 12px; background: var(--in-bg-white); }
.menu__tree-title { font-size: var(--in-font-size-sm); font-weight: var(--in-font-weight-bold); color: var(--in-text-subtle); margin-bottom: 6px; }
.menu__tree-list { list-style: none; margin: 0; padding: 0; max-height: 620px; overflow: auto; }
.menu__tree-empty { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); padding: 8px; }

.menu__panel { flex: 1 1 auto; min-width: 0; border: 1px solid var(--in-border-default); border-radius: var(--in-radius-sm); padding: 14px 16px; background: var(--in-bg-white); }
.menu__empty { color: var(--in-text-subtle); font-size: var(--in-font-size-sm); padding: 24px; text-align: center; }
.menu__panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.menu__panel-title { font-weight: var(--in-font-weight-bold); color: var(--in-text-default); }
.menu__panel-actions { display: flex; gap: 6px; }
.menu__form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.menu__field { display: flex; flex-direction: column; gap: 4px; }
.menu__field--wide { grid-column: 1 / -1; }
.menu__field label { font-size: var(--in-font-size-xs); color: var(--in-text-subtle); }
.menu__in { padding: 6px 8px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); background: var(--in-bg-white); }
.menu__in:disabled { background: var(--in-bg-default); color: var(--in-text-subtle); }
.menu__obj { display: flex; gap: 6px; align-items: center; }
.menu__obj .menu__in { flex: 1; }

.menu__modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 9000; }
.menu__modal { width: 560px; max-width: 92vw; background: var(--in-bg-white); border-radius: var(--in-radius-md); box-shadow: 0 12px 40px rgba(0,0,0,.2); overflow: hidden; }
.menu__modal-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--in-border-default); font-weight: var(--in-font-weight-bold); }
.menu__modal-x { border: none; background: transparent; cursor: pointer; font-size: 16px; color: var(--in-text-subtle); }
.menu__modal-search { display: flex; gap: 8px; padding: 12px 16px; }
.menu__modal-input { flex: 1; padding: 6px 10px; border: 1px solid var(--in-border-input); border-radius: var(--in-radius-xs); font-size: var(--in-font-size-sm); }
.menu__modal-results { max-height: 360px; overflow: auto; padding: 0 16px 16px; }
.menu__modal-table { width: 100%; border-collapse: collapse; font-size: var(--in-font-size-sm); }
.menu__modal-table th, .menu__modal-table td { border-bottom: 1px solid var(--in-border-default); padding: 6px 8px; text-align: left; }
.menu__modal-table th { color: var(--in-text-subtle); }
.menu__pick { border: 1px solid var(--in-border-default); background: var(--in-bg-white); border-radius: var(--in-radius-xs); padding: 3px 10px; cursor: pointer; font-size: var(--in-font-size-sm); }
.menu__pick:hover { background: var(--in-bg-brand-subtle, var(--in-bg-default)); }
.menu__modal-empty { text-align: center; color: var(--in-text-subtle); padding: 16px; }
</style>
