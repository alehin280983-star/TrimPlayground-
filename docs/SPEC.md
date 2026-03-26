# TRIM PLAYGROUND
## Agent Economics Platform

### Финальное ТЗ для coding agent

Версия: 2.1  
Дата: март 2026  
Репозиторий: `alehin280983-star/TrimPlayground-`

---

## 0. Назначение документа

Это финальный рабочий документ для coding agent, который будет дорабатывать уже существующий проект `Trim Playground`.

Документ отвечает на 5 практических вопросов:
- что поменять;
- что не трогать;
- что обязательно проверить;
- в чем остаются неопределенности;
- что желательно поменять в архитектуре.

Главный принцип:
- не делать rewrite;
- не ломать работающий prompt/model compare;
- сначала строить data foundation;
- только потом усложнять UI.

---

## 1. Контекст проекта

### Что уже есть

Проект уже рабочий и содержит:
- `Next.js 16 + React 19 + TypeScript`
- `Clerk`
- `Stripe`
- `Drizzle ORM + PostgreSQL`
- `Upstash Redis`
- `OpenAI / Anthropic / Google / DeepSeek / Cohere / Mistral / xAI / Alibaba / Moonshot / Zhipu`
- `PostHog`
- `gpt-tokenizer`

Ключевые текущие точки в коде:
- prompt/model compare UI: `src/app/playground/page.tsx`
- current calculator: `src/app/calculator/page.tsx`
- estimate route: `src/app/api/estimate/route.ts`
- sample route: `src/app/api/sample/route.ts`
- compare route: `src/app/api/compare/route.ts`
- model catalog: `src/lib/config/models.ts`
- providers: `src/lib/providers/base.ts`, `src/lib/providers/*`
- current agentic cost math: `src/lib/calculator/agenticCost.ts`
- estimate calculator: `src/lib/estimate-calculator.ts`

### Что строим

Надстройку над существующим проектом:
- из `prompt cost comparator`
- в `Agent Economics Platform`

Новый смысл продукта:
- считать не цену одного prompt;
- а стоимость, скорость, overhead и эффективность всего workflow с агентами.

### Ключевой non-obvious тезис

Главный актив продукта:
- не UI;
- не лендинг;
- не таблица цен;
- а накопленный `pricing + run corpus`.

Каждый live-прогон должен создавать будущий data moat.

Следствие:
- `trace schema`
- `run logging`
- `pricing snapshots`
- `usage normalization`

важнее, чем новый сложный интерфейс.

---

## 2. Целевая персона MVP

### Главная persona
- `Architect / Decision-maker`

Это человек, который выбирает:
- архитектуру агента;
- routing strategy;
- fallback pattern;
- компромисс между quality / cost / speed.

### Не главная persona для MVP
- `Builder / debugging / observability`

Эта persona важна, но не должна определять первый scope.

Вывод:
- MVP строится прежде всего для `architect`;
- builder-слой отложить до поздней фазы.

---

## 3. Ключевые формулы

### Формула 1

`Expected Cost per Successful Outcome =`

`model_cost + tool_cost + retry_cost + memory_growth_cost + hitl_cost + failure_recovery_cost`

### Формула 2

`Workflow Efficiency Score = success_rate / (cost * time * review_burden)`

Все новые расчеты в системе должны быть производными от этих формул.

---

## 4. Что поменять

### 4.1. Добавить workflow-level доменную модель

Создать новый слой:
- `src/lib/workflows/types.ts`
- `src/lib/workflows/templates.ts`
- `src/lib/workflows/runner.ts`
- `src/lib/workflows/estimator.ts`
- `src/lib/workflows/scoring.ts`
- `src/lib/workflows/normalizers.ts`

Он должен отвечать за:
- workflow templates;
- architecture compare;
- workflow-level estimate;
- workflow-level live run;
- scoring и recommendation.

### 4.2. Добавить Provider Adapter Layer нормализации usage

Нужен новый слой:
- `src/lib/adapters/`

Задача:
- привести usage разных провайдеров к одному внутреннему формату.

Минимальный внутренний формат:

```ts
interface NormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  toolTokens?: number;
  toolCostUsd?: number;
  latencyMs?: number;
  firstTokenMs?: number;
}
```

Без этого нельзя честно считать workflow economics.

#### Scope провайдеров

**Адаптеры v1 (полная нормализация, включая reasoning/cached/tool):**
- OpenAI
- Anthropic
- Google
- DeepSeek

**Остальные провайдеры (pass-through, только input/output tokens):**
- Cohere, Mistral, xAI, Alibaba, Moonshot, Zhipu

Они продолжают работать через существующий `src/lib/providers/*`. Полные адаптеры для них — не раньше Phase 3. Не пытаться написать 10 адаптеров в Phase 1.

#### Маппинг полей v1

| Unified | OpenAI | Anthropic | Google | DeepSeek |
|---|---|---|---|---|
| `inputTokens` | prompt_tokens | input_tokens | promptTokenCount | prompt_tokens |
| `outputTokens` | completion_tokens | output_tokens | candidatesTokenCount | completion_tokens |
| `cachedInputTokens` | prompt_tokens_details.cached | cache_read_input_tokens | cachedContentTokenCount | prompt_cache_hit_tokens |
| `reasoningTokens` | completion_tokens_details.reasoning | thinking_tokens | — | — |
| `toolTokens` | в input_tokens | в input_tokens | в promptTokenCount | в prompt_tokens |

### 4.3. Добавить versioned trace store

Новые Drizzle-таблицы добавлять рядом с существующей схемой. Перед началом работы найти, где лежит текущий Drizzle config и schema (см. §6.1).

Новые сущности:
- `workflow_run`
- `step_log`
- `pricing_snapshot`
- позже `eval_result`

Каждая запись обязана иметь:
- `schema_version`

#### Таблица `workflow_run`

| Поле | Тип | Описание |
|---|---|---|
| `workflow_id` | uuid | ID workflow-шаблона |
| `run_id` | uuid | PK, уникальный прогон |
| `schema_version` | int | Инкремент при изменении полей |
| `mode` | enum(live, virtual) | Режим прогона |
| `task_class` | enum | Из таксономии (см. §4.4) |
| `architecture_pattern` | varchar | Название паттерна (single, router, pipeline, etc.) |
| `created_at` | timestamptz | Время создания |

#### Таблица `step_log`

| Поле | Тип | Описание |
|---|---|---|
| `step_id` | uuid | PK |
| `run_id` | uuid | FK → workflow_run |
| `agent_id` | varchar | ID агента в workflow |
| `provider` | varchar | openai / anthropic / google / deepseek |
| `model` | varchar | Конкретная модель |
| `started_at` | timestamptz | Начало шага |
| `first_byte_at` | timestamptz | Первый байт ответа |
| `first_token_at` | timestamptz | Первый токен |
| `completed_at` | timestamptz | Завершение |
| `input_tokens` | int | Нормализованные (см. §4.2) |
| `output_tokens` | int | Нормализованные |
| `cached_input_tokens` | int | Нормализованные |
| `reasoning_tokens` | int | Нормализованные |
| `tool_tokens` | int | Нормализованные |
| `success` | bool | Успешность шага |
| `retry_count` | int | Количество повторов |
| `fallback_used` | bool | Использован fallback |
| `human_review_required` | bool | Требуется ревью человека |
| `accepted` | bool | Результат принят (см. §4.5) |
| `outcome_source` | enum(auto, judge, user) | Кто выставил accepted |
| `schema_version` | int | Версия схемы |

#### Таблица `pricing_snapshot`

| Поле | Тип | Описание |
|---|---|---|
| `id` | uuid | PK |
| `provider` | varchar | Провайдер |
| `model` | varchar | Модель |
| `price_input` | decimal | За 1M input-токенов |
| `price_output` | decimal | За 1M output-токенов |
| `price_cached` | decimal | За 1M cached input |
| `price_tool` | decimal | За tool calls (если отдельно) |
| `source_url` | varchar | Provenance: точный URL |
| `fetched_at` | timestamptz | Дата получения |
| `status` | enum(verified, stale, manual) | Статус доверия |
| `valid_until` | timestamptz | null = до следующего snapshot |

### 4.4. Добавить task taxonomy

Создать:
- `src/lib/taxonomy.ts`

Минимальный enum:
- `chat`
- `rag`
- `json_extract`
- `coding`
- `agentic`
- `research`

Каждый run и каждый virtual estimate обязаны иметь `task_class`.

### 4.5. Добавить Outcome Labeling Protocol

Создать:
- `src/lib/outcome.ts`

Правила:
- `auto`: schema validation / assertions
- `judge`: позже, не в MVP
- `user`: явное подтверждение пользователя

MVP-правило:
- `accepted=true` может быть выставлен автоматически или пользователем;
- `outcome_source` обязателен.

### 4.6. Добавить Pricing Service со snapshot-логикой

Создать:
- `src/lib/pricing/service.ts`
- `src/lib/pricing/types.ts`

Правила:
- каждый расчёт ссылается на конкретный `snapshot_id`, не на «текущую цену»
- staleness threshold: пометка `stale` если `fetched_at` > 48 часов
- ручные обновления: `status = manual` + обязательный `source_url`
- текущий ручной процесс обновления цен (раз в 2 недели) оставить
- но расчёты должны ссылаться не на текущую цену из кода, а на snapshot

### 4.7. Добавить новые API routes

Новые routes:
- `POST /api/workflows/estimate`
- `POST /api/workflows/run`
- `GET /api/workflows/templates`
- `GET /api/workflows/run/[id]`

Старые routes не удалять:
- `/api/estimate`
- `/api/sample`
- `/api/compare`

Они должны продолжать работать.

### 4.8. Перестроить `/calculator` в workflow compare

Текущий `/calculator` нужно эволюционно превратить в:
- compare 2-4 architecture patterns;
- расчет workflow cost;
- breakdown по шагам;
- overhead breakdown;
- efficiency frontier.

На старте без canvas.

### 4.9. Сохранить `/playground` как step-level compare

`/playground` оставить:
- как low-friction точку входа;
- как prompt/model compare;
- как нижний слой измерения для workflow economics.

Менять можно:
- терминологию;
- небольшие UI-подсказки;
- позиционирование.

Но нельзя ломать текущий working flow.

### 4.10. Ввести 3 типа confidence label

Каждое значение в API response должно иметь одну из меток:
- `Exact` — live API run, ключи пользователя
- `Estimated` — rule-based virtual, pricing snapshot + правила
- `Modeled` — ML-predicted, обучено на live corpus (не в MVP)

---

## 5. Что не трогать

### 5.1. Не делать rewrite всего проекта

Нельзя:
- переписывать всё приложение с нуля;
- переносить проект в новую архитектуру без необходимости;
- ломать рабочие entry points.

### 5.2. Не ломать существующий prompt compare

Нельзя ломать:
- `src/app/playground/page.tsx`
- `/api/estimate`
- `/api/sample`
- `/api/compare`

### 5.3. Не переписывать все provider integrations ради красоты

Нужно переиспользовать существующие:
- `src/lib/providers/*`

Можно:
- добавить normalization layer поверх;
- добавить timestamps;
- добавить unified usage envelope.

Нельзя:
- устроить большой рефакторинг без продуктовой необходимости.

### 5.4. Не строить в MVP

Стоп-лист:
- canvas / visual flow builder
- trained ML estimator
- model-as-judge как обязательный слой
- public benchmark sharing
- full team / multi-tenant platform features
- heavy market intelligence layer
- полные адаптеры для Cohere, Mistral, xAI, Alibaba, Moonshot, Zhipu

---

## 6. Что проверить перед началом разработки

### 6.1. Проверить состояние persistence

Нужно найти и зафиксировать:
- где лежит Drizzle config (`drizzle.config.ts` или аналог)
- где лежит текущая schema (`src/db/schema/`, `src/lib/db/` или другое)
- где лежат миграции (`drizzle/` или другая папка)
- есть ли `.env.example`
- как проект ожидает PostgreSQL в локальной и prod среде

**Новые таблицы (`workflow_run`, `step_log`, `pricing_snapshot`) добавлять рядом с существующей schema, в ту же папку, через Drizzle migrations.**

### 6.2. Проверить, какие usage поля реально доступны у провайдеров

Для каждого v1-провайдера (OpenAI, Anthropic, Google, DeepSeek) проверить:
- input tokens — поле и формат
- output tokens — поле и формат
- cached input — есть ли, как биллится
- reasoning tokens — есть ли, как биллится
- tool billing — отдельно или в input
- latency capture — доступен ли TTFB/TTFT

Маппинг в §4.2 — ожидаемый. Проверить актуальность по реальным SDK response objects.

### 6.3. Проверить, где сейчас живет бизнес-логика

Сейчас заметная логика уже находится в:
- `src/app/playground/page.tsx`
- `src/app/calculator/page.tsx`
- `src/app/api/estimate/route.ts`
- `src/lib/estimate-calculator.ts`
- `src/lib/calculator/agenticCost.ts`

Нужно решить, что выносить в `lib/`.

### 6.4. Проверить ручной pricing workflow

Так как модели и цены обновляются руками раз в 2 недели, нужно понять:
- кто это делает;
- в каком файле это редактируется (скорее всего `src/lib/config/models.ts`);
- как зафиксировать snapshot при обновлении;
- нужна ли административная страница позже или пока достаточно кода + миграций.

### 6.5. Проверить feature flags

Нужно добавить через env:
- `FEATURE_COMPARE=true`
- `FEATURE_LIVE=true`
- `FEATURE_WORKFLOWS=true`

И убедиться, что новая функциональность включается аддитивно.

### 6.6. Правила режима DATABASE_URL (Persistence Mode)

#### Общее правило

```
DATABASE_URL optional for local development.
DATABASE_URL required for persistence-enabled environments.
Production live mode without persistence is not allowed.
```

#### Ephemeral / stateless mode (DATABASE_URL отсутствует)

Live Run **работает** без DATABASE_URL:
- выполняет live-вызов к LLM;
- возвращает step-level results (tokens, cost, latency);
- показывает `Confidence: Exact`;
- работает Architecture Compare и Run Live.

Live Run **не работает** без DATABASE_URL:
- история запусков (`/run/[id]`);
- calibration и retraining estimator;
- накопление run corpus (data moat).

UI **обязан** показывать неблокирующее сообщение, если DATABASE_URL не задан:

```
Results are not persisted in local development mode.
```

Сообщение должно быть:
- видимым, но не мешающим взаимодействию;
- не блокирующим кнопку Run Live;
- информационным, не предупреждением об ошибке.

#### Правила для prod

- Если `NODE_ENV === 'production'` и DATABASE_URL отсутствует — сервер **обязан** вернуть 503 на `/api/workflows/run` с явным сообщением: `Persistence required in production mode`.
- Это предотвращает случайный запуск live mode в prod без записи результатов.

#### Реализация

- `src/db/index.ts` — lazy connection, не падает при import без DATABASE_URL.
- `/api/workflows/run` — DB writes в `try/catch`; если не удалось — run всё равно возвращается.
- В prod: проверить `DATABASE_URL` до запуска run, вернуть 503 если отсутствует.
- UI: `WorkflowCompare` проверяет ответ и показывает ephemeral-notice если `persisted: false`.

---

## 7. В чем не уверен

### 7.1. До конца не подтверждена persona economics-buyer

Гипотеза про `architect` сильная, но ее нужно подтвердить интервью.

До этого момента:
- не переусложнять onboarding;
- не строить слишком enterprise-heavy UX.

### 7.2. Неочевидно, нужен ли полноценный DB-backed run corpus уже в первом релизе

Архитектурно нужен.
С точки зрения скорости запуска можно спорить.

Но recommendation:
- заложить сразу через Drizzle миграции;
- не откладывать schema на потом.

### 7.3. Success/accepted в MVP будут неидеальны

Пока нет judge layer и богатой outcome-разметки, многие workflow metrics будут частично оценочными.

Это не блокер, если:
- честно маркировать confidence;
- не выдавать сомнительные метрики как точные.

### 7.4. Human review economics стоит вводить аккуратно

В MVP лучше сделать:
- явное поле `review_rate`
- явное поле `review_cost`

без построения сложной human queue системы.

---

## 8. Что бы я поменял в архитектуре

### 8.1. Разделил бы систему на 3 слоя

**Layer 1: Models + Pricing**
- model catalog (`src/lib/config/models.ts` — существующий)
- pricing snapshots (`src/lib/pricing/`)
- provenance
- staleness

**Layer 2: Execution + Normalization**
- provider adapters (`src/lib/adapters/`)
- usage normalization
- latency capture
- prompt/step execution (`src/lib/providers/*` — существующий)

**Layer 3: Workflow Economics**
- templates (`src/lib/workflows/templates.ts`)
- runner (`src/lib/workflows/runner.ts`)
- estimator (`src/lib/workflows/estimator.ts`)
- scoring (`src/lib/workflows/scoring.ts`)
- recommendations
- traces (`src/lib/traces/`)

### 8.2. Уменьшил бы объем бизнес-логики в page components

Логику надо постепенно вытаскивать из:
- `src/app/playground/page.tsx`
- `src/app/calculator/page.tsx`

в:
- `src/lib/workflows/*`
- `src/lib/pricing/*`
- `src/lib/traces/*`

### 8.3. Сделал бы новый compare-first UX без canvas

Рекомендуемый UX MVP:
- выбрать `task_class`
- выбрать 2-4 workflow templates
- выбрать модели для ролей
- выбрать `Virtual Preview` или `Live Validation`
- получить cost/latency/overhead/recommendation

### 8.4. Добавил бы calibration tracking как обязательный слой до ML estimator

Даже до появления trained estimator нужно хранить:
- estimate
- actual
- error_pct
- sample_count
- calibration_status

---

## 9. Порядок сборки

### Phase 1 — Data Foundation

Сделать:
- Drizzle migration для: `workflow_run`, `step_log`, `pricing_snapshot`
- Provider Adapter Layer (4 провайдера: OpenAI, Anthropic, Google, DeepSeek)
- usage normalization
- Pricing Service
- task taxonomy
- outcome protocol

Блокеры: нет — стартовая фаза.

### Phase 2 — Architect MVP

Сделать:
- template-based workflow compare
- 2-4 архитектуры
- task_class input
- Virtual Estimator v1 rule-based
- Efficiency Frontier chart
- новый compare UX на базе `/calculator`

Не делать: canvas.

Блокеры: Phase 1 завершена.

### Phase 3 — Live Validation

Сделать:
- live workflow runs по ключам пользователя
- step-level breakdown
- ttft/e2e logging
- p50/p95 multi-run
- simple HITL economics
- полные адаптеры для оставшихся провайдеров (по необходимости)

Блокеры: Phase 2 завершена.

### Phase 4 — Trained Estimator

Сделать:
- retrain virtual estimator на corpus
- calibration status
- routing simulator

Блокеры: Phase 3 + минимум 30 прогонов на (task_class, model, pattern).

### Phase 5 — Builder / Platform

Сделать позже:
- canvas
- team benchmarking
- public benchmark layer

Блокеры: подтверждение рынком.

---

## 10. Интеграция с текущим кодом

### Новые директории

```
src/lib/adapters/           ← Provider Adapter Layer (v1: 4 провайдера)
src/lib/adapters/openai.ts
src/lib/adapters/anthropic.ts
src/lib/adapters/google.ts
src/lib/adapters/deepseek.ts
src/lib/adapters/types.ts   ← NormalizedUsage interface
src/lib/adapters/index.ts   ← router по provider name

src/lib/pricing/            ← Pricing Service
src/lib/pricing/service.ts
src/lib/pricing/types.ts

src/lib/workflows/          ← Workflow Economics
src/lib/workflows/types.ts
src/lib/workflows/templates.ts
src/lib/workflows/runner.ts
src/lib/workflows/estimator.ts
src/lib/workflows/scoring.ts
src/lib/workflows/normalizers.ts

src/lib/traces/             ← Trace store helpers
src/lib/traces/store.ts
src/lib/traces/types.ts

src/lib/taxonomy.ts         ← task_class enum + Zod schema
src/lib/outcome.ts          ← outcome labeling protocol
```

### Drizzle tables

Добавить рядом с существующей schema (путь определить в §6.1):

```
workflow_run
step_log
pricing_snapshot
```

### Новые pages / routes

```
src/app/compare/page.tsx                    ← или эволюция /calculator
src/app/api/workflows/estimate/route.ts
src/app/api/workflows/run/route.ts
src/app/api/workflows/templates/route.ts
src/app/api/workflows/run/[id]/route.ts
```

### Правила интеграции

- существующие routes не ломать
- новые таблицы только через Drizzle migrations
- все новые API-контракты через Zod
- новые env переменные документировать в `.env.example`
- новые фичи включать через feature flags
- существующие providers (`src/lib/providers/*`) не рефакторить — адаптеры пишутся поверх

---

## 11. Унифицированный Output JSON

Новый workflow-level API должен возвращать структуру этого типа:

```json
{
  "run_id": "uuid",
  "workflow_id": "uuid",
  "mode": "live",
  "task_class": "coding",
  "confidence": "Exact",
  "cost_total": 0.0042,
  "cost_range": [0.0038, 0.0051],
  "ttft_ms": 340,
  "e2e_ms": 4200,
  "tokens_total": 12400,
  "quality_score": 0.87,
  "success_probability": 0.91,
  "overhead_breakdown": {
    "retry_cost": 0.0006,
    "memory_overhead": 0.0003,
    "tool_cost": 0.0008,
    "hitl_cost": 0.0000,
    "coordination_overhead": 0.0002
  },
  "step_breakdown": [
    {
      "step_id": "uuid",
      "agent_id": "planner",
      "model": "claude-sonnet-4-20250514",
      "cost": 0.0018,
      "cost_label": "Exact",
      "input_tokens": 4200,
      "output_tokens": 800,
      "latency_ms": 1800,
      "retry_count": 0,
      "fallback_used": false,
      "accepted": true
    }
  ],
  "recommendation": {
    "flag": "high_retry_waste",
    "detail": "Step 3 retry cost too high",
    "alternative": "cheap-first + fallback"
  }
}
```

---

## 12. Acceptance Criteria MVP

Система считается готовой к первой рабочей версии, если:

- [x] можно сравнить минимум 2 workflow-архитектуры
- [x] работает `Virtual Preview` (rule-based, label = Estimated)
- [x] current prompt compare (`/playground`) не сломан
- [x] есть `cost_total` с confidence label
- [x] есть `e2e_ms` (ttft_ms — known gap, требует стриминг в runner, отложено)
- [x] есть `overhead_breakdown`
- [x] есть `task_class` на каждом run
- [x] есть `recommendation` с actionable flag, detail, alternative
- [x] каждый расчёт ссылается на pricing snapshot с `source_url` и `fetched_at` (через `pricingRef` в estimate response; `npm run sync-prices` пишет снапшоты в DB)
- [x] `schema_version` есть в persistence
- [x] `outcome_source` фиксируется там, где это возможно
- [x] feature flags работают: `FEATURE_WORKFLOWS=false` блокирует `/api/workflows/run`
- [x] calibration tracking: `calibration_record` table накапливает estimate vs actual, error_pct, sample_count

---

## 13. Что coding agent должен вернуть после работы

Агент должен вернуть:
- список измененных файлов
- что изменено
- что намеренно не тронуто
- что осталось спорным
- что проверить вручную
- какие риски остались

Минимальные проверки:
- `npm run lint`
- `npm run build` (если нет внешних блокеров)
- существующие routes отвечают 200

---

## 14. Короткая инструкция агенту

```
Не делать rewrite.
Не ломать существующий compare.
Не начинать с canvas.
Сначала строить data foundation.
Prompt-layer считать частью новой системы, а не legacy-мусором.
Если приходится выбирать между красивым UI и корректным trace schema — выбирать trace schema.
Адаптеры v1 = 4 провайдера. Остальные 6 — pass-through. Не героить.
Новые таблицы — через Drizzle migrations, рядом с существующей schema.
Feature flags через env. Новые фичи не должны ломать прод при выключенном флаге.
```
