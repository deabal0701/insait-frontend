// ★ (2026-05-27, dspark): envelope HEADER/BODY 조립·해체 helper composable.
//   가이드 05_composables.md §3 정합. services/envelope.js 의 함수형 wrapper.
import {
  buildHeader,
  buildBody,
  buildBodyMulti,
  buildEnvelope,
  parseResponse,
  inferActionType,
  inferObjectId,
  ENC_KEYS,
} from '@/services/envelope';

export function useEnvelope() {
  return {
    buildHeader,
    buildBody,
    buildBodyMulti,
    buildEnvelope,
    parseResponse,
    inferActionType,
    inferObjectId,
    ENC_KEYS,
  };
}
