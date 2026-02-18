import type { ModelConfig } from '@/types';

export type WorkloadUnit = 'requests' | 'tasks';

export interface AgenticCostInputs {
  unit: WorkloadUnit;
  requestsPerMonth: number;
  tasksPerMonth: number;
  llmCallsPerTask: number;
  inputTokensPerCall: number;
  outputTokensPerCall: number;
  cachedInputShare: number; // 0..1 portion of input tokens billed at cached rate
  batchPriceFactor: number; // 0..1 multiplier applied to token cost
}

export interface AgenticCostResult {
  llmCallsPerMonth: number;
  perCall: {
    inputTokens: number;
    cachedInputTokens: number;
    uncachedInputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  perMonth: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function safeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function computeCallsPerMonth(inputs: AgenticCostInputs): number {
  if (inputs.unit === 'tasks') {
    return safeInt(inputs.tasksPerMonth) * Math.max(0, inputs.llmCallsPerTask);
  }
  return safeInt(inputs.requestsPerMonth);
}

export function calculateAgenticCost(
  model: ModelConfig,
  inputs: AgenticCostInputs
): AgenticCostResult {
  const llmCallsPerMonth = computeCallsPerMonth(inputs);

  const inputTokensPerCall = safeInt(inputs.inputTokensPerCall);
  const outputTokensPerCall = safeInt(inputs.outputTokensPerCall);

  const cachedShare = clampNumber(inputs.cachedInputShare, 0, 1);
  const cachedInputTokens = Math.floor(inputTokensPerCall * cachedShare);
  const uncachedInputTokens = Math.max(0, inputTokensPerCall - cachedInputTokens);

  const cachedInputPrice = model.cachedInputPrice ?? model.inputPrice;
  const inputCost =
    (uncachedInputTokens / 1000) * model.inputPrice +
    (cachedInputTokens / 1000) * cachedInputPrice;
  const outputCost = (outputTokensPerCall / 1000) * model.outputPrice;

  const batchFactor = clampNumber(inputs.batchPriceFactor, 0, 1);
  const perCallTotal = (inputCost + outputCost) * batchFactor;
  const perCallInput = inputCost * batchFactor;
  const perCallOutput = outputCost * batchFactor;

  const perMonthInputTokens = inputTokensPerCall * llmCallsPerMonth;
  const perMonthOutputTokens = outputTokensPerCall * llmCallsPerMonth;

  return {
    llmCallsPerMonth,
    perCall: {
      inputTokens: inputTokensPerCall,
      cachedInputTokens,
      uncachedInputTokens,
      outputTokens: outputTokensPerCall,
      inputCost: perCallInput,
      outputCost: perCallOutput,
      totalCost: perCallTotal,
    },
    perMonth: {
      inputTokens: perMonthInputTokens,
      outputTokens: perMonthOutputTokens,
      totalTokens: perMonthInputTokens + perMonthOutputTokens,
      inputCost: perCallInput * llmCallsPerMonth,
      outputCost: perCallOutput * llmCallsPerMonth,
      totalCost: perCallTotal * llmCallsPerMonth,
    },
  };
}

