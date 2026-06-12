<script setup>
// ★ (2026-05-29, dspark): 컴포넌트 카탈로그 — In* 라이브러리 시각 데모 + 사용법.
//   v1/v2 SSOT 원본 API 정합으로 전면 재작:
//     - InRadio = atomic (단일 radio button, v-for 다중 사용)
//     - InSwitch/InTabs/InModal = native (el-* 비의존)
//     - InNumberField/InTag/InForm/InFormItem = v1 native
//     - InDatePicker = v1 시각 + el-date-picker hybrid
//   모든 데모는 독립 ref 사용 (cross-contamination 방지).
//   ElMessage 호출은 helper 함수로 격리 (인라인 호출 제거).
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import InButton from '@/components/ui/InButton.vue';
import InTextField from '@/components/ui/InTextField.vue';
import InPasswordField from '@/components/ui/InPasswordField.vue';
import InNumberField from '@/components/ui/InNumberField.vue';
import InSelect from '@/components/ui/InSelect.vue';
import InDatePicker from '@/components/ui/InDatePicker.vue';
import InCheckbox from '@/components/ui/InCheckbox.vue';
import InRadio from '@/components/ui/InRadio.vue';
import InSwitch from '@/components/ui/InSwitch.vue';
import InTag from '@/components/ui/InTag.vue';
import InToast from '@/components/ui/InToast.vue';
import InCard from '@/components/ui/InCard.vue';
import InTabs from '@/components/ui/InTabs.vue';
import InModal from '@/components/ui/InModal.vue';
import InForm from '@/components/ui/InForm.vue';
import InFormItem from '@/components/ui/InFormItem.vue';
import InDataTable from '@/components/ui/InDataTable.vue';

// =============================================================
// 폼 입력 — 각 데모마다 독립 ref (cross-contamination 방지)
// =============================================================

// InTextField (3 데모)
const tfBasic = ref('');
const tfError = ref('잘못된 값');
const tfDisabled = ref('disabled value');

// InPasswordField
const pwd = ref('');

// InNumberField (3 데모)
const numQty = ref(10);
const numPrice = ref(15000);
const numErrored = ref(null);

// InSelect (3 데모)
const selBasic = ref('HR');
const selMulti = ref(['HR', 'DEV']);
const selError = ref('');

const deptOptions = [
  { value: 'HR', label: '인사팀' },
  { value: 'DEV', label: '개발팀' },
  { value: 'ACC', label: '회계팀' },
  { value: 'OPS', label: '운영팀', disabled: true },
];

// InDatePicker (2 데모)
const dateHire = ref('');
const dateRange = ref([]);

// InCheckbox (4 데모)
const cbAgreed = ref(true);
const cbEmpty = ref(false);
const cbIndeterminate = ref(true);
// disabled 는 modelValue 안 받음 (display only)

// InRadio (atomic — 3개 옵션 동일 v-model)
const radioOpt = ref('B');
const radioOptions = [
  { value: 'A', label: '옵션 A' },
  { value: 'B', label: '옵션 B' },
  { value: 'C', label: '옵션 C (비활성)', disabled: true },
];

// InSwitch (3 데모)
const swNotif = ref(true);
const swCompact = ref(false);
const swError = ref(true);

// =============================================================
// 구조
// =============================================================

// InTabs
const activeTab = ref('basic');
const tabItems = [
  { name: 'basic',    tabLabel: '기본 정보' },
  { name: 'detail',   tabLabel: '상세' },
  { name: 'history',  tabLabel: '이력' },
  { name: 'disabled', tabLabel: '비활성', disabled: true },
];

// InModal (3 데모: confirm / form / detail)
const modalConfirm = ref(false);
const modalForm = ref(false);
const modalDetail = ref(false);

function onModalFormSubmit() {
  toast('success', '저장되었습니다.');
  modalForm.value = false;
}

// InForm + InFormItem (외부 검증)
const formState = ref({ name: '', email: '', dept: '' });
const formErrors = ref({});

function validateForm() {
  const errs = {};
  if (!formState.value.name) errs.name = '이름을 입력하세요.';
  if (!formState.value.email) errs.email = '이메일을 입력하세요.';
  else if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(formState.value.email))
    errs.email = '이메일 형식이 아닙니다.';
  if (!formState.value.dept) errs.dept = '부서를 선택하세요.';
  formErrors.value = errs;
  return Object.keys(errs).length === 0;
}
function onFormSubmit() {
  if (validateForm()) toast('success', `검증 통과: ${JSON.stringify(formState.value)}`);
  else toast('error', '검증 실패');
}
function onFormReset() {
  formState.value = { name: '', email: '', dept: '' };
  formErrors.value = {};
}

// =============================================================
// 데이터
// =============================================================
const tableColumns = [
  { name: 'empNo', header: '사번', width: 90 },
  { name: 'name', header: '이름', editor: 'text', width: 110 },
  { name: 'dept', header: '부서', width: 100 },
  { name: 'salary', header: '연봉', format: 'Integer', align: 'right', width: 130 },
];
const tableData = [
  { empNo: 'E001', name: '김인사', dept: '인사팀', salary: 52000000 },
  { empNo: 'E002', name: '이개발', dept: '개발팀', salary: 71000000 },
  { empNo: 'E003', name: '박회계', dept: '회계팀', salary: 48000000 },
];

// =============================================================
// 표시
// =============================================================
const showToast = ref(true);

// helper — 인라인 ElMessage 호출 격리
function toast(status, msg) {
  ElMessage[status](msg);
}
function onTagClose(label) {
  toast('info', `태그 닫힘: ${label}`);
}

// 섹션 nav
const sections = [
  { id: 'form',   label: '폼 입력',    count: 8 },
  { id: 'action', label: '액션·표시', count: 3 },
  { id: 'struct', label: '구조',      count: 4 },
  { id: 'data',   label: '데이터',    count: 1 },
];
</script>

<template>
  <div class="catalog">
    <header class="catalog__header">
      <h2 class="catalog__title">컴포넌트 카탈로그</h2>
      <p class="catalog__hint">
        <code>src/components/ui/</code> 의 In* 컴포넌트 라이브러리 시각 데모 + 사용법.
        모든 컴포넌트는 <strong>design-system v1/v2 SSOT</strong> 에서 Plain JS 로 변환됐다.
        JSDoc 상단의 <code>Figma 노드 ID</code> 가 진본 매핑이며, <code>TBD</code> 표기는 추후 Figma 정합 작업 대상이다.
        정책 상세: <code>components/README.md</code>.
      </p>
      <nav class="catalog__nav">
        <a v-for="s in sections" :key="s.id" :href="`#sec-${s.id}`" class="catalog__nav-item">
          <span>{{ s.label }}</span>
          <span class="catalog__nav-count">{{ s.count }}</span>
        </a>
      </nav>
    </header>

    <!-- ===================== 폼 입력 ===================== -->
    <section id="sec-form" class="catalog__section">
      <h3 class="catalog__section-title">1. 폼 입력 <span class="catalog__section-badge">8</span></h3>

      <!-- InTextField -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InTextField</h4>
          <p class="demo__desc">
            단일 줄 텍스트 입력. Figma 1152:22722. el-input wrapper. 밑줄형 + 회색 surface.
            공통 prop: <code>label · layout · status · size · showRequired</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live">
            <InTextField v-model="tfBasic" label="이름" placeholder="홍길동" show-required layout="vertical" />
            <InTextField v-model="tfError" label="에러" status="error" message="필수 입력값입니다" layout="vertical" />
            <InTextField v-model="tfDisabled" label="비활성" disabled layout="vertical" />
          </div>
          <pre class="demo__code">&lt;InTextField v-model="name" label="이름" placeholder="홍길동"
              show-required layout="vertical" /&gt;

&lt;InTextField v-model="x" label="에러" status="error"
              message="필수 입력값입니다" /&gt;</pre>
        </div>
      </article>

      <!-- InPasswordField -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InPasswordField</h4>
          <p class="demo__desc">눈 아이콘 토글 + 비밀번호 마스킹. InTextField 와 동일 prop 라인업.</p>
        </header>
        <div class="demo__body">
          <div class="demo__live">
            <InPasswordField v-model="pwd" label="비밀번호" layout="vertical" />
          </div>
          <pre class="demo__code">&lt;InPasswordField v-model="pwd" label="비밀번호" layout="vertical" /&gt;</pre>
        </div>
      </article>

      <!-- InNumberField -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InNumberField <span class="demo__tbd">Figma=TBD</span></h4>
          <p class="demo__desc">
            v1 SSOT (native input + 증감 버튼). el-input-number 미사용.
            <code>min · max · step · precision · formatComma · showControls · error</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--col">
            <div class="demo__row">
              <span class="demo__lbl">수량</span>
              <InNumberField v-model="numQty" :min="0" :max="100" :step="1" />
              <span class="demo__val">→ {{ numQty }}</span>
            </div>
            <div class="demo__row">
              <span class="demo__lbl">단가</span>
              <InNumberField v-model="numPrice" :min="0" :step="1000" format-comma />
              <span class="demo__val">→ {{ numPrice }}</span>
            </div>
            <div class="demo__row">
              <span class="demo__lbl">에러</span>
              <InNumberField v-model="numErrored" error placeholder="입력 필요" />
            </div>
          </div>
          <pre class="demo__code">&lt;InNumberField v-model="qty" :min="0" :max="100" :step="1" /&gt;

&lt;InNumberField v-model="price" :min="0" :step="1000" format-comma /&gt;

&lt;InNumberField v-model="x" error placeholder="입력 필요" /&gt;</pre>
        </div>
      </article>

      <!-- InSelect -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InSelect</h4>
          <p class="demo__desc">
            Figma 1166:15105. el-select wrapper. <code>options=[{value,label,disabled}]</code> 필수.
            <code>multiSelect · filterable · clearable · uses(basic/grid) · color(default/white)</code>.
            Figma 'input' prop = placeholder.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live">
            <InSelect v-model="selBasic" :options="deptOptions" label="부서" layout="vertical" />
            <InSelect v-model="selMulti" :options="deptOptions" label="다중 + 필터" multi-select filterable layout="vertical" />
            <InSelect v-model="selError" :options="deptOptions" label="에러" status="error" message="선택 필수" layout="vertical" />
          </div>
          <pre class="demo__code">const deptOptions = [
  { value: 'HR',  label: '인사팀' },
  { value: 'DEV', label: '개발팀' },
  { value: 'OPS', label: '운영팀', disabled: true },
];

&lt;InSelect v-model="dept" :options="deptOptions" label="부서" /&gt;

&lt;InSelect v-model="depts" :options="deptOptions"
          multi-select filterable label="다중 + 필터" /&gt;</pre>
        </div>
      </article>

      <!-- InDatePicker -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InDatePicker <span class="demo__tbd">Figma=TBD</span></h4>
          <p class="demo__desc">
            v1 시각 (밑줄형) + el-date-picker (popup 동작) hybrid.
            기본 <code>valueFormat='YYYYMMDD'</code> (envelope 정합) · <code>format='YYYY.MM.DD'</code>.
            <code>type=date/year/month/daterange/datetime</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--col">
            <InDatePicker v-model="dateHire" label="입사일" layout="vertical" />
            <div class="demo__row demo__row--bd"><span class="demo__lbl">v-model 값</span><code class="demo__val">{{ dateHire || '(미선택)' }}</code></div>
            <InDatePicker v-model="dateRange" label="기간" type="daterange" layout="vertical" />
            <div class="demo__row demo__row--bd"><span class="demo__lbl">v-model 값</span><code class="demo__val">{{ JSON.stringify(dateRange) }}</code></div>
          </div>
          <pre class="demo__code">&lt;InDatePicker v-model="hireDt" label="입사일" /&gt;
&lt;!-- v-model 값 예: '20260315' (envelope 정합) --&gt;

&lt;InDatePicker v-model="range" type="daterange" label="기간" /&gt;</pre>
        </div>
      </article>

      <!-- InCheckbox -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InCheckbox</h4>
          <p class="demo__desc">
            Figma 1241:50106. 단일 체크박스 (atomic). Figma 자산 check-box.svg 사용.
            <code>indeterminate · size · state · disabled</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--row">
            <InCheckbox v-model="cbAgreed" label="동의함" />
            <InCheckbox v-model="cbEmpty" label="비선택" />
            <InCheckbox v-model="cbIndeterminate" indeterminate label="부분 선택" />
            <InCheckbox :model-value="true" disabled label="비활성+체크" />
            <InCheckbox :model-value="false" disabled label="비활성" />
          </div>
          <pre class="demo__code">&lt;InCheckbox v-model="agreed" label="동의함" /&gt;
&lt;InCheckbox v-model="x" indeterminate label="부분 선택" /&gt;
&lt;InCheckbox :model-value="true" disabled label="비활성+체크" /&gt;</pre>
        </div>
      </article>

      <!-- InRadio -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InRadio (atomic)</h4>
          <p class="demo__desc">
            Figma 1152:22617. <strong>단일 radio button (atomic).</strong>
            RadioGroup wrapper 없음 — 사용처가 직접 v-for + 동일 v-model 공유.
            Figma 자산 radio-unchecked / radio-dot svg.
            <code>v-model · value · label · state · size · disabled</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--col">
            <div class="demo__radio-group">
              <InRadio
                v-for="o in radioOptions"
                :key="o.value"
                v-model="radioOpt"
                :value="o.value"
                :label="o.label"
                :disabled="o.disabled"
                name="catalog-radio"
              />
            </div>
            <div class="demo__row demo__row--bd"><span class="demo__lbl">선택 값</span><code class="demo__val">{{ radioOpt }}</code></div>
          </div>
          <pre class="demo__code">const sel = ref('B');
const opts = [
  { value: 'A', label: '옵션 A' },
  { value: 'B', label: '옵션 B' },
  { value: 'C', label: '옵션 C', disabled: true },
];

&lt;InRadio v-for="o in opts" :key="o.value"
         v-model="sel" :value="o.value"
         :label="o.label" :disabled="o.disabled"
         name="my-group" /&gt;</pre>
        </div>
      </article>

      <!-- InSwitch -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InSwitch (native)</h4>
          <p class="demo__desc">
            Figma 1815:73431. <strong>el-switch 미사용</strong> — 자체 native button + halo.
            Medium 58×38 / Small 40×24. Error 는 selected=true 일 때만.
            <code>v-model · size(sm/md) · status(default/error) · disabled · label</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--col">
            <InSwitch v-model="swNotif" label="알림 받기" />
            <InSwitch v-model="swCompact" size="sm" label="컴팩트 모드 (sm)" />
            <InSwitch v-model="swError" status="error" label="에러 (selected=true)" />
            <InSwitch :model-value="true" disabled label="비활성+ON" />
            <InSwitch :model-value="false" disabled label="비활성+OFF" />
          </div>
          <pre class="demo__code">&lt;InSwitch v-model="enabled" label="알림 받기" /&gt;
&lt;InSwitch v-model="x" size="sm" /&gt;
&lt;InSwitch v-model="x" status="error" /&gt;</pre>
        </div>
      </article>
    </section>

    <!-- ===================== 액션·표시 ===================== -->
    <section id="sec-action" class="catalog__section">
      <h3 class="catalog__section-title">2. 액션·표시 <span class="catalog__section-badge">3</span></h3>

      <!-- InButton -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InButton</h4>
          <p class="demo__desc">
            Figma 1152:21795. 7 variant (primary/default/rounded/text/link/only-icon/only-icon-primary) × 3 size.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--row">
            <InButton variant="primary" :left-icon-show="false" :right-icon-show="false">Primary</InButton>
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false">Default</InButton>
            <InButton variant="rounded" :left-icon-show="false" :right-icon-show="false">Rounded</InButton>
            <InButton variant="text" :left-icon-show="false" :right-icon-show="false">Text</InButton>
            <InButton variant="link" :left-icon-show="false" :right-icon-show="false">Link</InButton>
            <InButton variant="primary" size="sm" :left-icon-show="false" :right-icon-show="false">sm</InButton>
            <InButton variant="primary" size="lg" :left-icon-show="false" :right-icon-show="false">lg</InButton>
            <InButton variant="primary" disabled :left-icon-show="false" :right-icon-show="false">Disabled</InButton>
            <InButton variant="primary" loading :left-icon-show="false" :right-icon-show="false">Loading</InButton>
          </div>
          <pre class="demo__code">&lt;InButton variant="primary" @click="..."&gt;저장&lt;/InButton&gt;
&lt;InButton variant="default" size="sm"&gt;취소&lt;/InButton&gt;
&lt;InButton variant="primary" loading&gt;처리 중&lt;/InButton&gt;</pre>
        </div>
      </article>

      <!-- InTag -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InTag <span class="demo__tbd">Figma=TBD</span></h4>
          <p class="demo__desc">
            v1 SSOT (native span). el-tag 미사용.
            <code>variant=default/brand/success/warning/error · size=sm/md · closable</code>.
            label prop 필수 — slot 본문 사용 X (v1 정합).
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--col">
            <div class="demo__row">
              <InTag label="default" />
              <InTag label="brand" variant="brand" />
              <InTag label="success" variant="success" />
              <InTag label="warning" variant="warning" />
              <InTag label="error" variant="error" />
            </div>
            <div class="demo__row">
              <InTag label="sm" variant="brand" size="sm" />
              <InTag label="md (default)" variant="brand" size="md" />
            </div>
            <div class="demo__row">
              <InTag label="closable" variant="warning" closable @close="onTagClose('closable')" />
              <InTag label="error+closable" variant="error" closable @close="onTagClose('error')" />
            </div>
          </div>
          <pre class="demo__code">&lt;InTag label="완료" variant="success" /&gt;
&lt;InTag label="취소됨" variant="error" closable @close="..." /&gt;</pre>
        </div>
      </article>

      <!-- InToast / ElMessage -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InToast / ElMessage</h4>
          <p class="demo__desc">
            <strong>InToast</strong> = Figma DS 2559:115889 (정적 컴포넌트, 페이지에 박힘).
            <strong>ElMessage</strong> = imperative floating (전역 호출, 12_conventions §145 허용).
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--col">
            <InToast v-if="showToast" status="success" message="저장되었습니다." closable @close="showToast = false" />
            <div class="demo__row">
              <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="toast('success', 'ElMessage.success')">success</InButton>
              <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="toast('warning', 'ElMessage.warning')">warning</InButton>
              <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="toast('error', 'ElMessage.error')">error</InButton>
              <InButton size="sm" variant="default" :left-icon-show="false" :right-icon-show="false" @click="toast('info', 'ElMessage.info')">info</InButton>
            </div>
          </div>
          <pre class="demo__code">&lt;!-- 정적 (페이지 안) --&gt;
&lt;InToast status="success" message="저장되었습니다." closable /&gt;

// imperative (전역 floating)
import { ElMessage } from 'element-plus';
ElMessage.success('저장되었습니다.');</pre>
        </div>
      </article>
    </section>

    <!-- ===================== 구조 ===================== -->
    <section id="sec-struct" class="catalog__section">
      <h3 class="catalog__section-title">3. 구조 <span class="catalog__section-badge">4</span></h3>

      <!-- InCard -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InCard</h4>
          <p class="demo__desc">
            Figma 1247:24387. 컨테이너 카드. default slot + 옵션 title/footer slot.
            <code>state · type=content/title</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live">
            <InCard state="enabled" type="content" title="카드 제목">
              <p style="margin: 0; font-size: 13px; color: var(--in-text-default);">카드 본문이 여기에. title 은 prop 으로 전달했다.</p>
              <template #footer>
                <div style="text-align: right; font-size: 12px; color: var(--in-text-subtle);">footer slot</div>
              </template>
            </InCard>
          </div>
          <pre class="demo__code">&lt;InCard state="enabled" type="content" title="카드 제목"&gt;
  &lt;p&gt;본문&lt;/p&gt;
  &lt;template #footer&gt;footer slot&lt;/template&gt;
&lt;/InCard&gt;</pre>
        </div>
      </article>

      <!-- InTabs -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InTabs (native)</h4>
          <p class="demo__desc">
            Figma 1499:43392. <strong>native tablist (ARIA 정합).</strong> el-tabs 미사용.
            tab 헤더만 제공 — 내용은 v-model 로 사용처가 직접 분기.
            <code>items=[{name, tabLabel, disabled}] · size=default/small · activation=automatic/manual</code>.
            키보드: Arrow Left/Right, Home/End.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--col">
            <InTabs v-model="activeTab" :items="tabItems" />
            <div class="demo__tabpanel">
              <div v-if="activeTab === 'basic'">기본 정보 탭 내용</div>
              <div v-else-if="activeTab === 'detail'">상세 탭 내용</div>
              <div v-else-if="activeTab === 'history'">이력 탭 내용</div>
            </div>
          </div>
          <pre class="demo__code">const items = [
  { name: 'basic',  tabLabel: '기본 정보' },
  { name: 'detail', tabLabel: '상세' },
  { name: 'disabled', tabLabel: '비활성', disabled: true },
];
const active = ref('basic');

&lt;InTabs v-model="active" :items="items" /&gt;
&lt;div v-if="active === 'basic'"&gt;...&lt;/div&gt;</pre>
        </div>
      </article>

      <!-- InModal -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InModal (native) <span class="demo__tbd">Figma=TBD</span></h4>
          <p class="demo__desc">
            W4 패턴 (atomic 조합, Figma 미정의).
            <strong>el-dialog 미사용</strong> — Teleport to body + 자체 focus-trap + ESC.
            <code>type=confirm/form/detail · title · message · closeOnOverlay · showClose</code>.
            기본 footer: confirm 만 자동, form/detail 은 <code>#footer slot</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live demo__live--row">
            <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="modalConfirm = true">Confirm (360px)</InButton>
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="modalForm = true">Form (480px)</InButton>
            <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="modalDetail = true">Detail (720px)</InButton>
          </div>
          <pre class="demo__code">&lt;InButton @click="open = true"&gt;열기&lt;/InButton&gt;

&lt;InModal v-model="open" type="confirm"
         title="삭제 확인"
         message="정말 삭제하시겠습니까?"
         @confirm="onDelete" /&gt;

&lt;!-- form/detail: footer slot --&gt;
&lt;InModal v-model="open" type="form" title="저장"&gt;
  &lt;form&gt;...&lt;/form&gt;
  &lt;template #footer&gt;
    &lt;button @click="open = false"&gt;취소&lt;/button&gt;
    &lt;button @click="save"&gt;저장&lt;/button&gt;
  &lt;/template&gt;
&lt;/InModal&gt;</pre>
        </div>

        <InModal
          v-model="modalConfirm"
          type="confirm"
          title="삭제 확인"
          message="정말 삭제하시겠습니까?"
          @confirm="toast('success', '삭제 완료')"
          @cancel="toast('info', '취소됨')"
        />
        <InModal
          v-model="modalForm"
          type="form"
          title="간단 폼"
        >
          <p style="margin: 0 0 12px; font-size: 13px;">type=form 데모. 내용은 default slot, 버튼은 footer slot.</p>
          <InTextField v-model="tfBasic" label="이름" layout="vertical" />
          <template #footer>
            <button class="demo__modal-btn demo__modal-btn--default" @click="modalForm = false">취소</button>
            <button class="demo__modal-btn demo__modal-btn--primary" @click="onModalFormSubmit">저장</button>
          </template>
        </InModal>
        <InModal v-model="modalDetail" type="detail" title="상세 보기">
          <p style="margin: 0; font-size: 13px;">type=detail 데모. 720px 너비. footer slot 없으면 footer 영역 자체가 미렌더.</p>
        </InModal>
      </article>

      <!-- InForm + InFormItem -->
      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InForm + InFormItem <span class="demo__tbd">Figma=TBD</span></h4>
          <p class="demo__desc">
            v1 SSOT (provide/inject 컨텍스트). el-form 미사용.
            <strong>검증 자동화 없음</strong> — 사용처가 외부 검증 후 <code>error</code> prop 으로 메시지 전달.
            <code>InForm: layout/labelWidth/density/disabled · InFormItem: label/required/error/help</code>.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live">
            <InForm layout="horizontal" label-width="80px" density="compact">
              <InFormItem label="이름" required :error="formErrors.name">
                <InTextField v-model="formState.name" :show-label="false" placeholder="홍길동" />
              </InFormItem>
              <InFormItem label="이메일" required :error="formErrors.email">
                <InTextField v-model="formState.email" :show-label="false" placeholder="hong@insait.com" />
              </InFormItem>
              <InFormItem label="부서" required :error="formErrors.dept">
                <InSelect v-model="formState.dept" :options="deptOptions" :show-label="false" input="선택" />
              </InFormItem>
              <InFormItem>
                <div class="demo__row">
                  <InButton variant="primary" :left-icon-show="false" :right-icon-show="false" @click="onFormSubmit">검증 + 제출</InButton>
                  <InButton variant="default" :left-icon-show="false" :right-icon-show="false" @click="onFormReset">초기화</InButton>
                </div>
              </InFormItem>
            </InForm>
          </div>
          <pre class="demo__code">const state = ref({ name: '', email: '' });
const errors = ref({});

function validate() {
  const e = {};
  if (!state.value.name) e.name = '필수';
  // ...
  errors.value = e;
  return Object.keys(e).length === 0;
}

&lt;InForm layout="horizontal" label-width="80px"&gt;
  &lt;InFormItem label="이름" required :error="errors.name"&gt;
    &lt;InTextField v-model="state.name" :show-label="false" /&gt;
  &lt;/InFormItem&gt;
&lt;/InForm&gt;</pre>
        </div>
      </article>
    </section>

    <!-- ===================== 데이터 ===================== -->
    <section id="sec-data" class="catalog__section">
      <h3 class="catalog__section-title">4. 데이터 <span class="catalog__section-badge">1</span></h3>

      <article class="demo">
        <header class="demo__header">
          <h4 class="demo__name">InDataTable</h4>
          <p class="demo__desc">
            <code>tui-grid</code> 래퍼. CRUD/format/frozen/Excel/dirty 추출 풀스택 데모는
            <a href="/dev/grid">/dev/grid</a> playground.
          </p>
        </header>
        <div class="demo__body">
          <div class="demo__live">
            <InDataTable :columns="tableColumns" :data="tableData" :height="180" />
          </div>
          <pre class="demo__code">const columns = [
  { name: 'empNo', header: '사번', width: 90 },
  { name: 'salary', header: '연봉', format: 'Integer', align: 'right' },
];

&lt;InDataTable :columns="columns" :data="rows" :height="320" /&gt;</pre>
        </div>
      </article>
    </section>

    <!-- ===================== 규약 ===================== -->
    <section class="catalog__section">
      <h3 class="catalog__section-title">5. 신규 In* 컴포넌트 추가 시 규약</h3>
      <InCard state="enabled" type="content">
        <ol class="catalog__rules">
          <li><strong>design-system v1/v2 SSOT 우선</strong> — 동명 컴포넌트가 v1 또는 v2 에 있으면 그것을 복사 후 Plain JS 변환. from-scratch 작성 금지.</li>
          <li><strong>Figma 노드 ID 명시 의무</strong> — JSDoc 상단에 <code>Figma {file}:{node}</code> 또는 <code>Figma 노드 ID = TBD</code> 명시. TBD 는 추후 정합 대상으로 자동 인식.</li>
          <li><strong>출처 명시</strong> — JSDoc 에 "출처: design-system/v{1,2}/src/components/ui/{name}.vue (Plain JS 변환)" 추가.</li>
          <li><strong>el-* wrapper vs native 결정</strong> — v2 가 native 면 native, v2 가 el-* wrapper 면 wrapper (v2 정합). v1 SSOT 만 있으면 v1 패턴 따름.</li>
          <li>BEM 클래스: <code>in-{shortname}</code> 네임스페이스 (in-sel / in-radio / in-sw / in-tabs / in-modal / in-tag / in-fi 등).</li>
          <li>토큰은 <code>var(--in-*)</code> Semantic 만 (Primitive <code>--in-iblue-*</code> 직접 X).</li>
          <li><code>:deep(.el-*)</code> override 는 본 컴포넌트 네임스페이스 내부에서만 — 전역 누출 금지.</li>
          <li>Plain JS 변환: <code>lang="ts"</code> 제거, <code>defineProps&lt;T&gt; + withDefaults</code> → <code>defineProps({}) + validator</code>, type/interface 삭제.</li>
          <li>v2 가 atomic (예: InRadio) 이면 사용처에서 v-for + 동일 v-model 공유로 그룹화 (RadioGroup wrapper 만들지 말 것).</li>
        </ol>
      </InCard>
    </section>
  </div>
</template>

<style scoped>
.catalog {
  width: 100%;
  font-family: var(--in-font-family-body);
  color: var(--in-text-default);
}

.catalog__header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--in-border-default);
}
.catalog__title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  color: var(--in-text-accent);
}
.catalog__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 20px;
  color: var(--in-text-subtle);
}
.catalog__hint code {
  background: var(--in-surface-state-default);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  color: var(--in-text-accent);
}
.catalog__hint strong {
  color: var(--in-text-brand);
  font-weight: 600;
}
.catalog__nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.catalog__nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--in-bg-white);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-full);
  font-size: 12px;
  color: var(--in-text-default);
  text-decoration: none;
  transition: background 120ms, border-color 120ms;
}
.catalog__nav-item:hover {
  background: var(--in-bg-accent-brand);
  border-color: var(--in-border-brand);
  color: var(--in-text-brand);
}
.catalog__nav-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--in-brand);
  color: var(--in-text-white);
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
}

.catalog__section {
  margin-bottom: 32px;
}
.catalog__section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--in-text-accent);
}
.catalog__section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: var(--in-brand);
  color: var(--in-text-white);
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
}

.demo {
  margin-bottom: 16px;
  background: var(--in-bg-white);
  border: 1px solid var(--in-border-default);
  border-radius: var(--in-radius-sm);
  overflow: hidden;
}
.demo__header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--in-border-default);
  background: var(--in-bg-default);
}
.demo__name {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--in-text-accent);
  font-family: 'Cascadia Code', 'Consolas', monospace;
}
.demo__tbd {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-family: var(--in-font-family-body);
  font-size: 10px;
  font-weight: 500;
  background: var(--in-surface-warning);
  color: var(--in-text-warning);
  border: 1px solid var(--in-border-warning);
  border-radius: 9999px;
}
.demo__desc {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--in-text-subtle);
}
.demo__desc code {
  background: var(--in-surface-state-default);
  padding: 0 4px;
  border-radius: 3px;
  font-size: 11px;
  color: var(--in-text-accent);
}
.demo__desc strong { color: var(--in-text-brand); font-weight: 600; }

.demo__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
@media (max-width: 960px) {
  .demo__body { grid-template-columns: 1fr; }
  .demo__live { border-right: none; border-bottom: 1px solid var(--in-border-default); }
}
.demo__live {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--in-bg-white);
  border-right: 1px solid var(--in-border-default);
}
.demo__live--row {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.demo__live--col {
  flex-direction: column;
  gap: 10px;
}
.demo__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.demo__row--bd {
  border-top: 1px dashed var(--in-border-default);
  padding-top: 6px;
  font-size: 11px;
  color: var(--in-text-subtle);
}
.demo__lbl {
  display: inline-block;
  min-width: 60px;
  font-size: 11px;
  color: var(--in-text-subtle);
}
.demo__val {
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 11px;
  color: var(--in-text-accent);
  background: var(--in-surface-state-default);
  padding: 1px 6px;
  border-radius: 3px;
}
.demo__radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.demo__tabpanel {
  padding: 12px;
  background: var(--in-bg-default);
  border-radius: var(--in-radius-xs);
  font-size: 13px;
}
.demo__code {
  margin: 0;
  padding: 14px 16px;
  /* ★ (2026-06-12, dspark): #1e293b/#e2e8f0 → 코드블록 토큰 (2026-06-07 audit 백로그 해소) */
  background: var(--in-surface-code);
  color: var(--in-text-code);
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 11px;
  line-height: 18px;
  overflow-x: auto;
  white-space: pre;
  border: 0;
}

/* InModal form 데모용 footer 버튼 (slot 콘텐츠) */
.demo__modal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  height: 33px;
  padding: 0 16px;
  border-radius: var(--in-radius-xs);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  border: 1px solid transparent;
}
.demo__modal-btn--default {
  background: var(--in-bg-white);
  color: var(--in-text-default);
  border-color: var(--in-border-default);
}
.demo__modal-btn--primary {
  background: var(--in-bg-brand);
  color: var(--in-text-white);
}

.catalog__rules {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 22px;
  color: var(--in-text-default);
}
.catalog__rules li { margin-bottom: 4px; }
.catalog__rules strong { color: var(--in-text-brand); font-weight: 600; }
.catalog__rules code {
  background: var(--in-surface-state-default);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  color: var(--in-text-accent);
}
</style>
