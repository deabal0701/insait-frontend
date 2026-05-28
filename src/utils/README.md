# utils/ — 순수 헬퍼 함수 SSOT

Vue/Pinia/axios 등 외부 의존성 없는 **순수 함수**만 둔다. 부수 효과 없음, side-effect-free.

## 분류

| 파일 (예시) | 책임 |
|---|---|
| `date.js` | dayjs wrapper (`formatYmd`, `parseYmd`, `daysBetween`) |
| `format.js` | 숫자/문자열 포맷 (`formatNumber`, `formatPhone`, `formatBizNo`) |
| `validation.js` | 검증 규칙 (`isEmpId`, `isValidYmd`, `isEmail`) |
| `string.js` | 문자열 헬퍼 (`truncate`, `camelToSnake`, `maskName`) |

## 원칙

- **Vue/Pinia/axios import 금지** — 컴포넌트 컨텍스트 없이 호출 가능해야 함
- 함수 = 단일 책임. 검증·테스트 용이
- 부작용 없음 (`localStorage.getItem` 같은 IO 호출 금지)
- 외부 의존성 사용 시 lazy import (예: dayjs)

## 사용 예

```js
import { formatYmd } from '@/utils/date';
const display = formatYmd(row.hire_dt, 'YYYY-MM-DD');
```

## composables/ 와의 차이

- `composables/` = Vue 반응성 (`ref`/`reactive`/`computed`) 사용, 컴포넌트 setup 안에서만 호출
- `utils/` = 순수 함수, 어디서든 호출 가능

→ 반응성 또는 라이프사이클 hook 이 필요하면 `composables/`, 그렇지 않으면 `utils/`.
