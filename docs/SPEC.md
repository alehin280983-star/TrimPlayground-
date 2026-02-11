# LLM Cost Estimator & Comparator — SPEC v2.0

> **Упрощённая и реалистичная спецификация**

---

## 1. Обзор продукта

**Название**: Trim Playground — LLM Cost Comparator  
**Тип**: Web-приложение для сравнения стоимости LLM-запросов  

### Два режима работы

| Режим | API ключ | Точность | Скорость |
|-------|----------|----------|----------|
| **Estimate** | ❌ Не нужен | ±50% | Мгновенно |
| **Sample** | ✅ Нужен | 100% | 2-10 сек |

---

## 2. Архитектура (Упрощённая)

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ ModeToggle  │ │ PromptInput │ │ ResultsView             ││
│  │ (estimate/  │ │ + OutputCtrl│ │ + RangeDisplay          ││
│  │  sample)    │ │             │ │ + ConfidenceIndicator   ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     API Routes (Next.js)                     │
│      /api/estimate (no API key)    /api/sample (with key)   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Core Services                           │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ TokenService  │  │ PricingService│  │ ProviderService │  │
│  │ (tiktoken)    │  │ (static data) │  │ (API adapters)  │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Type Definitions (Финальные)

### 3.1 Core Types

```typescript
// src/types/index.ts

export type CalculationMode = "estimate" | "sample";
export type ConfidenceLevel = "low" | "medium" | "high";
export type ProviderType = "openai" | "anthropic" | "google" | "mistral" | "cohere" | "deepseek" | "xai" | "alibaba";

export interface PriceRange {
  min: number;
  median: number;
  max: number;
}

export interface TokenBreakdown {
  input: {
    tokens: number;
    cost: number;
  };
  output: {
    tokens: number | PriceRange;
    cost: number | PriceRange;
  };
  reasoning?: {
    tokens: PriceRange;
    cost: PriceRange;
    warning: string;
  };
}

export interface PriceEstimate {
  modelId: string;
  modelName: string;
  provider: ProviderType;
  mode: CalculationMode;
  
  breakdown: TokenBreakdown;
  total: PriceRange;
  
  confidence: ConfidenceLevel;
  warnings: string[];
  
  calculatedAt: string;
}

export interface SampleResult extends PriceEstimate {
  actualUsage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens?: number;
  };
  actualCost: number;
  responsePreview: string;
  latencyMs: number;
}
```

### 3.2 API Request/Response Types

```typescript
// POST /api/estimate
export interface EstimateRequest {
  prompt: string;
  modelIds: string[];
  expectedOutputTokens?: number;  // User override
}

export interface EstimateResponse {
  success: boolean;
  data: {
    inputTokens: number;
    estimates: PriceEstimate[];
    cheapest: string;  // modelId
  };
}

// POST /api/sample  
export interface SampleRequest {
  prompt: string;
  modelIds: string[];
  apiKeys: Record<ProviderType, string>;
}

export interface SampleResponse {
  success: boolean;
  data: {
    results: SampleResult[];
    cheapest: { modelId: string; cost: number };
    fastest: { modelId: string; latencyMs: number };
  };
}
```

---

## 4. Компоненты (Список)

### 4.1 Новые компоненты (создать)

| Компонент | Путь | Описание |
|-----------|------|----------|
| `ModeToggle` | `src/components/playground/ModeToggle.tsx` | Переключатель Estimate/Sample |
| `OutputControl` | `src/components/playground/OutputControl.tsx` | Слайдер expected output tokens |
| `ConfidenceIndicator` | `src/components/playground/ConfidenceIndicator.tsx` | Индикатор low/medium/high |
| `RangeDisplay` | `src/components/playground/RangeDisplay.tsx` | Визуализация min-median-max |
| `APIKeyInput` | `src/components/playground/APIKeyInput.tsx` | Безопасный ввод API ключа |
| `WarningBanner` | `src/components/playground/WarningBanner.tsx` | Предупреждения |

### 4.2 Существующие (доработать)

| Компонент | Изменения |
|-----------|-----------|
| `PromptInput.tsx` | Добавить отображение token count |
| `ModelCard.tsx` | Добавить поддержку PriceRange |
| `ResponseCard.tsx` | Показывать breakdown и confidence |
| `playground/page.tsx` | Интегрировать ModeToggle, routing |

---

## 5. API Endpoints

### 5.1 GET /api/models

```typescript
// Response
{
  providers: ProviderConfig[];
  totalModels: number;
}
```

### 5.2 POST /api/estimate (Улучшенный)

**Без API ключа. Возвращает диапазоны.**

```typescript
// Request
{
  prompt: "Explain quantum computing",
  modelIds: ["gpt-4o", "claude-sonnet-4"],
  expectedOutputTokens: 500  // optional
}

// Response
{
  success: true,
  data: {
    inputTokens: 4,
    estimates: [
      {
        modelId: "gpt-4o",
        modelName: "GPT-4o",
        provider: "openai",
        mode: "estimate",
        breakdown: {
          input: { tokens: 4, cost: 0.00001 },
          output: { 
            tokens: { min: 100, median: 300, max: 500 },
            cost: { min: 0.001, median: 0.003, max: 0.005 }
          }
        },
        total: { min: 0.00101, median: 0.00301, max: 0.00501 },
        confidence: "medium",
        warnings: ["Output tokens estimated. Use Sample Mode for accuracy."],
        calculatedAt: "2026-02-06T06:15:00Z"
      }
    ],
    cheapest: "gpt-4o"
  }
}
```

### 5.3 POST /api/sample (Улучшенный)

**Требует API ключи. Возвращает точные данные.**

```typescript
// Request
{
  prompt: "Explain quantum computing",
  modelIds: ["gpt-4o"],
  apiKeys: {
    openai: "sk-..."
  }
}

// Response
{
  success: true,
  data: {
    results: [
      {
        modelId: "gpt-4o",
        mode: "sample",
        actualUsage: {
          inputTokens: 4,
          outputTokens: 287
        },
        actualCost: 0.00289,
        responsePreview: "Quantum computing is a type of computation...",
        latencyMs: 2340,
        confidence: "high",
        warnings: []
      }
    ],
    cheapest: { modelId: "gpt-4o", cost: 0.00289 },
    fastest: { modelId: "gpt-4o", latencyMs: 2340 }
  }
}
```

---

## 6. Логика Confidence Level

```typescript
function calculateConfidence(
  mode: CalculationMode,
  hasUserEstimate: boolean,
  isReasoningModel: boolean
): ConfidenceLevel {
  
  // Sample mode = always high
  if (mode === "sample") return "high";
  
  // Reasoning models = always low in estimate mode
  if (isReasoningModel) return "low";
  
  // User provided estimate = medium
  if (hasUserEstimate) return "medium";
  
  // Default estimate = low
  return "low";
}
```

---

## 7. Warnings System

| Condition | Warning Text |
|-----------|--------------|
| Estimate mode | "This is a rough estimate. Actual cost may vary 2-3×." |
| Reasoning model | "Reasoning tokens highly variable. Cannot estimate without API call." |
| No user estimate | "Output tokens estimated at 50% of max. Adjust for accuracy." |
| Large prompt | "Prompt exceeds 4000 tokens. Consider summarizing." |

---

## 8. Security

### API Keys

1. **Никогда не сохранять** на сервере
2. **sessionStorage** только на клиенте
3. **Передавать** через HTTPS body (не query params)
4. **Использовать** один раз и отбрасывать

### Rate Limiting (уже реализовано)

- Free: 5 req/day
- Paid: 100 req/day
- IP: 50 req/hour

---

## 9. Исключено из MVP

Следующие функции **НЕ реализуются** в текущей версии:

| Функция | Причина исключения |
|---------|-------------------|
| Benchmark Mode | Дорого для пользователя (3-5 API вызовов) |
| ML Output Prediction | Требует исторических данных |
| Vision Token Calculation | Низкий приоритет, сложная логика |
| Audio/Video Estimation | Отдельная модальность |
| Prompt Caching UI | Сложно объяснить пользователю |
| Historical Comparisons | Требует базу данных пользователей |

---

## 10. Критерии готовности (Definition of Done)

### Estimate Mode ✓

- [ ] Ввод prompt → мгновенный подсчёт input tokens
- [ ] Выбор моделей → показ min/median/max range
- [ ] ConfidenceIndicator показывает low/medium
- [ ] Warnings отображаются корректно

### Sample Mode ✓

- [ ] Ввод API ключей (sessionStorage)
- [ ] Реальный запрос к выбранным моделям
- [ ] Отображение actual cost и response preview
- [ ] ConfidenceIndicator показывает high

### UI ✓

- [ ] ModeToggle работает
- [ ] OutputControl влияет на estimate
- [ ] RangeDisplay визуально понятен
- [ ] Mobile responsive
