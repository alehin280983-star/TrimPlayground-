# IMPLEMENTATION_PLAN.md — План доработки проекта

> **Атомарные задачи для выполнения агентом (Sonnet)**
> 
> Каждая задача — самостоятельная, с чёткими критериями входа/выхода.
> Выполнять СТРОГО последовательно: TASK-01 → TASK-02 → ...

---

## Обзор

| Фаза | Задачи | Оценка |
|------|--------|--------|
| **Phase 1: Types** | TASK-01, TASK-02 | 1 час |
| **Phase 2: UI Components** | TASK-03 — TASK-08 | 3 часа |
| **Phase 3: API Improvements** | TASK-09, TASK-10 | 2 часа |
| **Phase 4: Integration** | TASK-11, TASK-12 | 2 часа |
| **Phase 5: Testing** | TASK-13 | 1 час |

**Общее время**: ~9 часов

---

# Phase 1: Types

## TASK-01: Добавить новые типы

### Цель
Расширить `src/types/index.ts` новыми типами для режимов и оценок.

### Входные данные
- Файл: `src/types/index.ts`
- Спецификация: `docs/SPEC.md` секция 3

### Выходные данные
- Изменить: `src/types/index.ts`

### Шаги

1. Открыть `src/types/index.ts`
2. Добавить в конец файла (НЕ удалять существующее):

```typescript
// ============================================
// NEW TYPES FOR SPEC v2.0
// ============================================

export type CalculationMode = "estimate" | "sample";
export type ConfidenceLevel = "low" | "medium" | "high";

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

export interface PriceEstimateV2 {
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

export interface SampleResultV2 extends PriceEstimateV2 {
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

3. Сохранить файл

### Критерии приёмки
- [ ] Файл компилируется без ошибок
- [ ] Новые типы экспортируются
- [ ] Существующие типы не изменены

### Проверка
```bash
cd /Users/mxmv/Documents/bot_uchet/AI_Cost_Control_Playground_(v1.0)/ai-cost-platform
npx tsc --noEmit
```

---

## TASK-02: Добавить функцию расчёта confidence

### Цель
Создать функцию `calculateConfidence` в tokens модуле.

### Входные данные
- Файл: `src/lib/tokens/index.ts`
- Зависимости: TASK-01

### Выходные данные
- Изменить: `src/lib/tokens/index.ts`

### Шаги

1. Открыть `src/lib/tokens/index.ts`
2. Добавить импорт в начале:
```typescript
import { ConfidenceLevel, CalculationMode } from '@/types';
```

3. Добавить функцию в конец файла:

```typescript
/**
 * Calculate confidence level based on estimation parameters
 */
export function calculateConfidence(
  mode: CalculationMode,
  hasUserEstimate: boolean,
  isReasoningModel: boolean
): ConfidenceLevel {
  // Sample mode = always high (real data)
  if (mode === "sample") return "high";
  
  // Reasoning models = always low in estimate mode
  if (isReasoningModel) return "low";
  
  // User provided estimate = medium
  if (hasUserEstimate) return "medium";
  
  // Default estimate = low
  return "low";
}

/**
 * Generate warnings based on estimation context
 */
export function generateWarnings(
  mode: CalculationMode,
  hasUserEstimate: boolean,
  isReasoningModel: boolean,
  inputTokens: number
): string[] {
  const warnings: string[] = [];
  
  if (mode === "estimate") {
    warnings.push("This is a rough estimate. Actual cost may vary 2-3×.");
  }
  
  if (isReasoningModel && mode === "estimate") {
    warnings.push("Reasoning tokens highly variable. Cannot estimate without API call.");
  }
  
  if (!hasUserEstimate && mode === "estimate") {
    warnings.push("Output tokens estimated at 50% of max. Adjust for accuracy.");
  }
  
  if (inputTokens > 4000) {
    warnings.push("Prompt exceeds 4000 tokens. Consider summarizing.");
  }
  
  return warnings;
}
```

### Критерии приёмки
- [ ] Функция компилируется
- [ ] Экспортируется корректно
- [ ] Возвращает правильные значения

### Проверка
```bash
npx tsc --noEmit
```

---

# Phase 2: UI Components

## TASK-03: Создать ModeToggle

### Цель
Компонент переключения режимов Estimate/Sample.

### Входные данные
- Зависимости: TASK-01

### Выходные данные
- Создать: `src/components/playground/ModeToggle.tsx`
- Изменить: `src/components/playground/index.ts`

### Шаги

1. Создать файл `src/components/playground/ModeToggle.tsx`:

```tsx
'use client';

import { CalculationMode } from '@/types';

interface ModeToggleProps {
  value: CalculationMode;
  onChange: (mode: CalculationMode) => void;
}

export default function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className="flex bg-foreground/5 rounded-full p-1 border border-foreground/10">
      <button
        onClick={() => onChange('estimate')}
        className={`
          px-6 py-2 rounded-full text-sm font-semibold transition-all
          ${value === 'estimate' 
            ? 'bg-foreground text-background' 
            : 'text-foreground/60 hover:text-foreground'}
        `}
      >
        Estimate
      </button>
      <button
        onClick={() => onChange('sample')}
        className={`
          px-6 py-2 rounded-full text-sm font-semibold transition-all
          ${value === 'sample' 
            ? 'bg-foreground text-background' 
            : 'text-foreground/60 hover:text-foreground'}
        `}
      >
        Sample
      </button>
    </div>
  );
}
```

2. Обновить `src/components/playground/index.ts`:
```typescript
export { default as ModeToggle } from './ModeToggle';
```

### Критерии приёмки
- [ ] Компонент рендерится без ошибок
- [ ] Переключение работает
- [ ] Стили соответствуют дизайн-системе

### Проверка
```bash
npm run build
```

---

## TASK-04: Создать ConfidenceIndicator

### Цель
Визуальный индикатор уровня уверенности (low/medium/high).

### Входные данные
- Зависимости: TASK-01

### Выходные данные
- Создать: `src/components/playground/ConfidenceIndicator.tsx`
- Изменить: `src/components/playground/index.ts`

### Шаги

1. Создать файл `src/components/playground/ConfidenceIndicator.tsx`:

```tsx
'use client';

import { ConfidenceLevel } from '@/types';

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
}

const config: Record<ConfidenceLevel, { label: string; bars: number }> = {
  low: { label: 'Low Confidence', bars: 1 },
  medium: { label: 'Medium Confidence', bars: 2 },
  high: { label: 'High Confidence', bars: 3 },
};

export default function ConfidenceIndicator({ level }: ConfidenceIndicatorProps) {
  const { label, bars } = config[level];
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`
              w-1.5 rounded-full transition-all
              ${i <= bars ? 'bg-foreground' : 'bg-foreground/20'}
            `}
            style={{ height: `${8 + i * 4}px` }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-foreground/60">{label}</span>
    </div>
  );
}
```

2. Добавить экспорт в `src/components/playground/index.ts`:
```typescript
export { default as ConfidenceIndicator } from './ConfidenceIndicator';
```

### Критерии приёмки
- [ ] Отображает 3 уровня корректно
- [ ] Анимация плавная
- [ ] Соответствует дизайну

### Проверка
```bash
npm run build
```

---

## TASK-05: Создать RangeDisplay

### Цель
Визуализация диапазона цен min-median-max.

### Входные данные
- Зависимости: TASK-01

### Выходные данные
- Создать: `src/components/playground/RangeDisplay.tsx`
- Изменить: `src/components/playground/index.ts`

### Шаги

1. Создать файл `src/components/playground/RangeDisplay.tsx`:

```tsx
'use client';

import { PriceRange } from '@/types';

interface RangeDisplayProps {
  range: PriceRange;
  label?: string;
}

function formatPrice(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export default function RangeDisplay({ range, label }: RangeDisplayProps) {
  const { min, median, max } = range;
  
  // Calculate position of median on the bar (0-100%)
  const medianPosition = max > min 
    ? ((median - min) / (max - min)) * 100 
    : 50;
  
  return (
    <div className="space-y-2">
      {label && (
        <div className="text-xs font-bold text-foreground/40 uppercase tracking-wide">
          {label}
        </div>
      )}
      
      {/* Visual bar */}
      <div className="relative h-2 bg-foreground/10 rounded-full overflow-hidden">
        <div 
          className="absolute h-full bg-foreground/30 rounded-full"
          style={{ width: '100%' }}
        />
        <div 
          className="absolute top-0 w-2 h-2 bg-foreground rounded-full transform -translate-x-1/2"
          style={{ left: `${medianPosition}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-foreground/60">
        <span>{formatPrice(min)}</span>
        <span className="font-bold text-foreground">{formatPrice(median)}</span>
        <span>{formatPrice(max)}</span>
      </div>
    </div>
  );
}
```

2. Добавить экспорт в `src/components/playground/index.ts`:
```typescript
export { default as RangeDisplay } from './RangeDisplay';
```

### Критерии приёмки
- [ ] Показывает min, median, max
- [ ] Визуальный индикатор позиции median
- [ ] Форматирование цен корректное

### Проверка
```bash
npm run build
```

---

## TASK-06: Создать OutputControl

### Цель
Слайдер для ввода ожидаемого количества output tokens.

### Входные данные
- Нет зависимостей

### Выходные данные
- Создать: `src/components/playground/OutputControl.tsx`
- Изменить: `src/components/playground/index.ts`

### Шаги

1. Создать файл `src/components/playground/OutputControl.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';

interface OutputControlProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  maxTokens?: number;
}

export default function OutputControl({ 
  value, 
  onChange, 
  maxTokens = 4096 
}: OutputControlProps) {
  const [isCustom, setIsCustom] = useState(value !== undefined);
  const [localValue, setLocalValue] = useState(value || Math.floor(maxTokens / 2));
  
  useEffect(() => {
    if (isCustom) {
      onChange(localValue);
    } else {
      onChange(undefined);
    }
  }, [isCustom, localValue, onChange]);
  
  return (
    <div className="space-y-3 p-4 bg-foreground/5 rounded-lg border border-foreground/10">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground/80">
          Expected Output Tokens
        </label>
        <button
          onClick={() => setIsCustom(!isCustom)}
          className={`
            text-xs font-medium px-3 py-1 rounded-full transition-colors
            ${isCustom 
              ? 'bg-foreground text-background' 
              : 'bg-foreground/10 text-foreground/60 hover:bg-foreground/20'}
          `}
        >
          {isCustom ? 'Custom' : 'Auto'}
        </button>
      </div>
      
      {isCustom && (
        <div className="space-y-2">
          <input
            type="range"
            min={100}
            max={maxTokens}
            step={100}
            value={localValue}
            onChange={(e) => setLocalValue(Number(e.target.value))}
            className="w-full accent-foreground"
          />
          <div className="flex justify-between text-xs text-foreground/40">
            <span>100</span>
            <span className="font-bold text-foreground">{localValue.toLocaleString()} tokens</span>
            <span>{maxTokens.toLocaleString()}</span>
          </div>
        </div>
      )}
      
      {!isCustom && (
        <p className="text-xs text-foreground/40">
          Auto: 50% of model's max output ({Math.floor(maxTokens / 2).toLocaleString()} tokens)
        </p>
      )}
    </div>
  );
}
```

2. Добавить экспорт в `src/components/playground/index.ts`:
```typescript
export { default as OutputControl } from './OutputControl';
```

### Критерии приёмки
- [ ] Переключатель Auto/Custom работает
- [ ] Слайдер изменяет значение
- [ ] onChange вызывается с undefined когда Auto

### Проверка
```bash
npm run build
```

---

## TASK-07: Создать APIKeyInput

### Цель
Безопасный ввод API ключа с сохранением в sessionStorage.

### Входные данные
- Типы: `ProviderType` из `src/types`

### Выходные данные
- Создать: `src/components/playground/APIKeyInput.tsx`
- Изменить: `src/components/playground/index.ts`

### Шаги

1. Создать файл `src/components/playground/APIKeyInput.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { ProviderType } from '@/types';

interface APIKeyInputProps {
  provider: ProviderType;
  onKeyChange: (key: string | null) => void;
}

const STORAGE_PREFIX = 'trim_api_key_';

export default function APIKeyInput({ provider, onKeyChange }: APIKeyInputProps) {
  const [value, setValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Load from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${provider}`);
      if (saved) {
        setValue(saved);
        setIsSaved(true);
        onKeyChange(saved);
      }
    }
  }, [provider, onKeyChange]);
  
  const handleSave = () => {
    if (value.trim()) {
      sessionStorage.setItem(`${STORAGE_PREFIX}${provider}`, value.trim());
      setIsSaved(true);
      onKeyChange(value.trim());
    }
  };
  
  const handleClear = () => {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
    setValue('');
    setIsSaved(false);
    onKeyChange(null);
  };
  
  const providerLabels: Record<ProviderType, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    mistral: 'Mistral',
    cohere: 'Cohere',
    deepseek: 'DeepSeek',
    xai: 'xAI',
    alibaba: 'Alibaba',
  };
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-foreground/60 uppercase tracking-wide">
        {providerLabels[provider]} API Key
      </label>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={isVisible ? 'text' : 'password'}
            value={value}
            onChange={(e) => { setValue(e.target.value); setIsSaved(false); }}
            placeholder={`Enter ${providerLabels[provider]} API key`}
            className="w-full p-3 pr-10 border border-foreground/20 rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-foreground/40"
          />
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
          >
            {isVisible ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        
        {isSaved ? (
          <button
            onClick={handleClear}
            className="px-4 py-2 border border-foreground/20 rounded-lg text-sm font-medium text-foreground/60 hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            Clear
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium disabled:opacity-30"
          >
            Save
          </button>
        )}
      </div>
      
      {isSaved && (
        <p className="text-xs text-foreground/40">
          ✓ Saved in browser session (not sent to server until you click Sample)
        </p>
      )}
    </div>
  );
}
```

2. Добавить экспорт в `src/components/playground/index.ts`:
```typescript
export { default as APIKeyInput } from './APIKeyInput';
```

### Критерии приёмки
- [ ] Ключ сохраняется в sessionStorage
- [ ] Ключ загружается при перезагрузке (в той же сессии)
- [ ] Можно показать/скрыть ключ
- [ ] Можно очистить ключ

### Проверка
```bash
npm run build
```

---

## TASK-08: Создать WarningBanner

### Цель
Компонент для отображения предупреждений.

### Входные данные
- Нет зависимостей

### Выходные данные
- Создать: `src/components/playground/WarningBanner.tsx`
- Изменить: `src/components/playground/index.ts`

### Шаги

1. Создать файл `src/components/playground/WarningBanner.tsx`:

```tsx
'use client';

interface WarningBannerProps {
  warnings: string[];
}

export default function WarningBanner({ warnings }: WarningBannerProps) {
  if (warnings.length === 0) return null;
  
  return (
    <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
        <span>⚠️</span>
        <span>Important Notes</span>
      </div>
      <ul className="space-y-1">
        {warnings.map((warning, i) => (
          <li key={i} className="text-xs text-foreground/60 pl-6">
            • {warning}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

2. Добавить экспорт в `src/components/playground/index.ts`:
```typescript
export { default as WarningBanner } from './WarningBanner';
```

### Критерии приёмки
- [ ] Не рендерится при пустом массиве warnings
- [ ] Отображает список предупреждений
- [ ] Соответствует дизайну

### Проверка
```bash
npm run build
```

---

# Phase 3: API Improvements

## TASK-09: Улучшить /api/estimate

### Цель
Расширить ответ API estimate с поддержкой PriceRange и warnings.

### Входные данные
- Файл: `src/app/api/estimate/route.ts`
- Зависимости: TASK-01, TASK-02

### Выходные данные
- Изменить: `src/app/api/estimate/route.ts`

### Шаги

1. Открыть `src/app/api/estimate/route.ts`

2. Добавить импорты:
```typescript
import { calculateConfidence, generateWarnings } from '@/lib/tokens';
import { PriceRange, ConfidenceLevel, PriceEstimateV2 } from '@/types';
```

3. Модифицировать функцию создания оценки (внутри map):

**Найти** строки 65-88 (создание estimate объекта).

**Заменить** на:

```typescript
const estimates = modelIds.map(modelId => {
    const model = getModelById(modelId);

    if (!model) {
        return {
            modelId,
            error: 'Model not found',
        };
    }

    const inputTokens = countTokensSync(prompt);
    const isReasoningModel = model.id.includes('o1') || model.id.includes('o3') || model.id.includes('o4');
    
    // Calculate output token range
    const baseEstimate = estimatedOutputTokens ?? Math.min(
        Math.floor(model.maxOutputTokens * 0.5),
        2000
    );
    
    const outputRange: PriceRange = {
        min: Math.floor(baseEstimate * 0.5),
        median: baseEstimate,
        max: Math.ceil(baseEstimate * 1.5),
    };
    
    // Calculate costs
    const inputCost = (inputTokens / 1000) * model.inputPrice;
    const outputCostRange: PriceRange = {
        min: (outputRange.min / 1000) * model.outputPrice,
        median: (outputRange.median / 1000) * model.outputPrice,
        max: (outputRange.max / 1000) * model.outputPrice,
    };
    
    // Calculate total
    const total: PriceRange = {
        min: inputCost + outputCostRange.min,
        median: inputCost + outputCostRange.median,
        max: inputCost + outputCostRange.max,
    };
    
    // Confidence and warnings
    const confidence = calculateConfidence(
        'estimate',
        !!estimatedOutputTokens,
        isReasoningModel
    );
    
    const warnings = generateWarnings(
        'estimate',
        !!estimatedOutputTokens,
        isReasoningModel,
        inputTokens
    );

    const result: PriceEstimateV2 = {
        modelId,
        modelName: model.name,
        provider: model.provider,
        mode: 'estimate',
        breakdown: {
            input: { tokens: inputTokens, cost: inputCost },
            output: { tokens: outputRange, cost: outputCostRange },
        },
        total,
        confidence,
        warnings,
        calculatedAt: new Date().toISOString(),
    };

    return result;
});
```

4. Обновить response формат для включения `cheapest`.

### Критерии приёмки
- [ ] Response содержит PriceRange для output
- [ ] Confidence level рассчитывается
- [ ] Warnings генерируются

### Проверка
```bash
npm run build
curl -X POST http://localhost:3000/api/estimate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello","modelIds":["gpt-4o"]}'
```

---

## TASK-10: Создать /api/sample (если не существует)

### Цель
API endpoint для реальных запросов к моделям.

### Входные данные  
- Проверить: существует ли `src/app/api/sample/route.ts`
- Если НЕТ — создать
- Если ДА — пропустить задачу

### Выходные данные
- Создать (если нужно): `src/app/api/sample/route.ts`

### Шаги

1. Проверить существование файла
2. Если файла нет, создать `src/app/api/sample/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createProvider } from '@/lib/providers';
import { getModelById, calculateCost } from '@/lib/config';
import { ProviderType, SampleResultV2 } from '@/types';

export const runtime = 'edge';
export const maxDuration = 60;

interface SampleRequest {
    prompt: string;
    modelIds: string[];
    apiKeys: Partial<Record<ProviderType, string>>;
}

export async function POST(request: NextRequest) {
    try {
        const body: SampleRequest = await request.json();
        const { prompt, modelIds, apiKeys } = body;

        // Validation
        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_PROMPT', message: 'Prompt is required' } },
                { status: 400 }
            );
        }

        if (!modelIds || modelIds.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_MODELS', message: 'At least one model required' } },
                { status: 400 }
            );
        }

        const results: SampleResultV2[] = [];
        let cheapest = { modelId: '', cost: Infinity };
        let fastest = { modelId: '', latencyMs: Infinity };

        for (const modelId of modelIds) {
            const model = getModelById(modelId);
            if (!model) continue;

            const apiKey = apiKeys[model.provider];
            if (!apiKey) {
                // Skip models without API key
                continue;
            }

            try {
                const provider = createProvider(model.provider, apiKey);
                const startTime = Date.now();

                const response = await provider.complete({
                    prompt,
                    model: modelId,
                    provider: model.provider,
                });

                const latencyMs = Date.now() - startTime;
                const costs = calculateCost(response.inputTokens, response.outputTokens, model);

                const result: SampleResultV2 = {
                    modelId,
                    modelName: model.name,
                    provider: model.provider,
                    mode: 'sample',
                    breakdown: {
                        input: { tokens: response.inputTokens, cost: costs.inputCost },
                        output: { tokens: response.outputTokens, cost: costs.outputCost },
                    },
                    total: { 
                        min: costs.totalCost, 
                        median: costs.totalCost, 
                        max: costs.totalCost 
                    },
                    confidence: 'high',
                    warnings: [],
                    calculatedAt: new Date().toISOString(),
                    actualUsage: {
                        inputTokens: response.inputTokens,
                        outputTokens: response.outputTokens,
                    },
                    actualCost: costs.totalCost,
                    responsePreview: response.content.substring(0, 200),
                    latencyMs,
                };

                results.push(result);

                if (costs.totalCost < cheapest.cost) {
                    cheapest = { modelId, cost: costs.totalCost };
                }
                if (latencyMs < fastest.latencyMs) {
                    fastest = { modelId, latencyMs };
                }

            } catch (error) {
                console.error(`Error sampling ${modelId}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                results,
                cheapest: cheapest.cost < Infinity ? cheapest : null,
                fastest: fastest.latencyMs < Infinity ? fastest : null,
            },
        });

    } catch (error) {
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sample' } },
            { status: 500 }
        );
    }
}
```

### Критерии приёмки
- [ ] Endpoint принимает API keys в body
- [ ] Делает реальные запросы к провайдерам
- [ ] Возвращает actual usage и cost

### Проверка
```bash
npm run build
```

---

# Phase 4: Integration

## TASK-11: Обновить playground/page.tsx — Режимы

### Цель
Интегрировать ModeToggle и условный рендеринг.

### Входные данные
- Файл: `src/app/playground/page.tsx`
- Зависимости: TASK-03

### Выходные данные
- Изменить: `src/app/playground/page.tsx`

### Шаги

1. Добавить импорт:
```typescript
import { ModeToggle, OutputControl, APIKeyInput } from '@/components/playground';
import { CalculationMode, ProviderType } from '@/types';
```

2. Добавить state в компонент (после существующих useState):
```typescript
const [mode, setMode] = useState<CalculationMode>('estimate');
const [expectedOutput, setExpectedOutput] = useState<number | undefined>(undefined);
const [apiKeys, setApiKeys] = useState<Partial<Record<ProviderType, string>>>({});
```

3. Вставить ModeToggle в JSX перед PromptInput:
```tsx
<div className="mb-4">
    <ModeToggle value={mode} onChange={setMode} />
</div>
```

4. Условно показывать OutputControl (только для estimate) или APIKeyInput (только для sample).

### Критерии приёмки
- [ ] ModeToggle отображается
- [ ] Переключение режимов работает
- [ ] Разный UI для разных режимов

### Проверка
```bash
npm run dev
# Открыть http://localhost:3000/playground
# Проверить переключатель
```

---

## TASK-12: Подключить API вызовы к режимам

### Цель
handleCompare должен вызывать разные endpoints в зависимости от режима.

### Входные данные
- Файл: `src/app/playground/page.tsx`
- Зависимости: TASK-11

### Выходные данные
- Изменить: `src/app/playground/page.tsx`

### Шаги

1. Изменить функцию handleCompare:

```typescript
const handleCompare = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    setIsLoading(true);
    setCompareResult(null);

    try {
        if (mode === 'estimate') {
            const response = await fetch('/api/estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    modelIds: selectedModels.map(m => m.id),
                    estimatedOutputTokens: expectedOutput,
                }),
            });
            const data = await response.json();
            setCompareResult(data.data);
        } else {
            // Sample mode
            const response = await fetch('/api/sample', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    modelIds: selectedModels.map(m => m.id),
                    apiKeys,
                }),
            });
            const data = await response.json();
            setCompareResult(data.data);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
};
```

2. Обновить текст кнопки:
```tsx
{isLoading ? 'Processing...' : mode === 'estimate' ? 'ESTIMATE' : 'SAMPLE'}
```

### Критерии приёмки
- [ ] Estimate mode вызывает /api/estimate
- [ ] Sample mode вызывает /api/sample
- [ ] API keys передаются корректно

### Проверка
```bash
npm run dev
# Проверить Network tab в DevTools
```

---

# Phase 5: Testing

## TASK-13: Финальная проверка

### Цель
Полный прогон функционала и исправление багов.

### Шаги

1. Запустить build:
```bash
npm run build
```

2. Запустить lint:
```bash
npm run lint
```

3. Запустить dev server:
```bash
npm run dev
```

4. Проверить в браузере:
   - [ ] Переключатель Estimate/Sample работает
   - [ ] В Estimate mode: RangeDisplay показывает min/median/max
   - [ ] В Estimate mode: ConfidenceIndicator показывает уровень
   - [ ] В Estimate mode: Warnings отображаются
   - [ ] В Sample mode: APIKeyInput появляется
   - [ ] В Sample mode: результаты показывают actual cost

5. Проверить консоль браузера — нет ошибок

### Критерии приёмки
- [ ] npm run build — без ошибок
- [ ] npm run lint — без ошибок
- [ ] Визуальная проверка пройдена
- [ ] Console без ошибок

---

## Готово!

После выполнения всех задач проект соответствует SPEC v2.0.
