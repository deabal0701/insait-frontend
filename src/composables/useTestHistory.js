// ★ (2026-05-29, dspark): 서비스 테스터 호출 이력 — localStorage persist.
//   최근 20개 보관, 즐겨찾기 (별표) 별도 슬롯.
import { computed, ref } from 'vue';

const STORAGE_KEY = 'insait.svcTester.history';
const FAVORITE_KEY = 'insait.svcTester.favorites';
const MAX_HISTORY = 20;
const MAX_FAVORITES = 30;

function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과 등 — 무시
  }
}

const history = ref(safeLoad(STORAGE_KEY, []));
const favorites = ref(safeLoad(FAVORITE_KEY, []));

export function useTestHistory() {
  /**
   * @param {{ serviceId, serviceName, body, response, ok, ms, at }} entry
   */
  function pushHistory(entry) {
    const at = entry.at || new Date().toISOString();
    const item = {
      id: `${at}-${Math.random().toString(36).slice(2, 8)}`,
      serviceId: entry.serviceId,
      serviceName: entry.serviceName || entry.serviceId,
      body: entry.body,
      response: entry.response,
      ok: !!entry.ok,
      ms: entry.ms || 0,
      at,
    };
    history.value = [item, ...history.value].slice(0, MAX_HISTORY);
    safeSave(STORAGE_KEY, history.value);
    return item;
  }

  function clearHistory() {
    history.value = [];
    safeSave(STORAGE_KEY, []);
  }

  function saveFavorite({ name, serviceId, body }) {
    const fav = {
      id: `fav-${Date.now()}`,
      name,
      serviceId,
      body,
      at: new Date().toISOString(),
    };
    favorites.value = [fav, ...favorites.value].slice(0, MAX_FAVORITES);
    safeSave(FAVORITE_KEY, favorites.value);
    return fav;
  }

  function removeFavorite(id) {
    favorites.value = favorites.value.filter((f) => f.id !== id);
    safeSave(FAVORITE_KEY, favorites.value);
  }

  const recentByService = computed(() => {
    const map = new Map();
    for (const h of history.value) {
      const key = h.serviceName || h.serviceId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(h);
    }
    return map;
  });

  return {
    history,
    favorites,
    pushHistory,
    clearHistory,
    saveFavorite,
    removeFavorite,
    recentByService,
  };
}
