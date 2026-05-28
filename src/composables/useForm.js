// ★ (2026-05-27, dspark): 폼 헬퍼 composable — 가이드 05_composables §6 정합.
//   Phase 1A 초기에는 Element Plus `<el-form :rules>` 직접 사용 우선.
//   메타 (FRM_MSG_DEF / FRM_MSG_COL_DEF) 기반 폼 자동 생성은 점진 도입.
import { reactive, ref } from 'vue';

/**
 * @param {object} initial   초기 form model (row 객체)
 * @param {object} [rules]   Element Plus `<el-form>` rules
 */
export function useForm(initial = {}, rules = {}) {
  const formData = reactive({ ...initial });
  const formRules = reactive({ ...rules });
  const formRef = ref(null);     // <el-form ref="formRef">

  async function validate() {
    if (!formRef.value) return true;
    try {
      await formRef.value.validate();
      return true;
    } catch {
      return false;
    }
  }

  function reset(next) {
    Object.keys(formData).forEach((k) => delete formData[k]);
    Object.assign(formData, next || initial);
    formRef.value?.clearValidate?.();
  }

  function setField(key, value) {
    formData[key] = value;
  }

  return { formData, formRules, formRef, validate, reset, setField };
}
