'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { getAllModels, getModelById } from '@/lib/config';
import { calculateAgenticCost, type AgenticCostInputs, type WorkloadUnit } from '@/lib/calculator';
import { formatCost, formatTokens } from '@/lib/tokens';
import type { ProviderType } from '@/types';
import { ExportButtons } from '@/components/calculator/ExportButtons';
import { WorkflowCompare } from '@/components/calculator/WorkflowCompare';

type CalcView = 'model' | 'compare';

const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  mistral: 'Mistral',
  cohere: 'Cohere',
  deepseek: 'DeepSeek',
  xai: 'xAI',
  alibaba: 'Alibaba Cloud',
  moonshot: 'Moonshot',
  zhipu: 'Zhipu AI',
};

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: string): number {
  const cleaned = value.replace(/^0+(?=\d)/, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function numStr(value: number): string {
  return String(value);
}

export default function CalculatorPage() {
  const [view, setView] = useState<CalcView>('model');

  const textModels = useMemo(() => {
    const all = getAllModels();
    return all.filter(m => (m.modality ?? 'text') === 'text');
  }, []);

  const defaultModelId = useMemo(() => {
    const preferred = textModels.find(m => m.id === 'gpt-4o')?.id;
    return preferred ?? textModels[0]?.id ?? '';
  }, [textModels]);

  const [modelId, setModelId] = useState(defaultModelId);

  const [unit, setUnit] = useState<WorkloadUnit>('requests');
  const [requestsPerMonth, setRequestsPerMonth] = useState(100_000);
  const [tasksPerMonth, setTasksPerMonth] = useState(10_000);
  const [llmCallsPerTask, setLlmCallsPerTask] = useState(3);

  const [inputTokensPerCall, setInputTokensPerCall] = useState(800);
  const [outputTokensPerCall, setOutputTokensPerCall] = useState(400);

  const [enableCaching, setEnableCaching] = useState(false);
  const [cachedInputSharePct, setCachedInputSharePct] = useState(0);

  const [enableBatch, setEnableBatch] = useState(false);
  const [batchPriceFactor, setBatchPriceFactor] = useState(1);

  const [showUncertaintyRange, setShowUncertaintyRange] = useState(false);
  const [multLow, setMultLow] = useState(2);
  const [multMid, setMultMid] = useState(5);
  const [multHigh, setMultHigh] = useState(10);

  const resultsRef = useRef<HTMLDivElement>(null);

  const model = useMemo(() => getModelById(modelId), [modelId]);

  const normalized = useMemo((): Omit<AgenticCostInputs, 'cachedInputShare' | 'batchPriceFactor'> => {
    return {
      unit,
      requestsPerMonth: Math.max(0, Math.floor(requestsPerMonth)),
      tasksPerMonth: Math.max(0, Math.floor(tasksPerMonth)),
      llmCallsPerTask: Math.max(0, llmCallsPerTask),
      inputTokensPerCall: Math.max(0, Math.floor(inputTokensPerCall)),
      outputTokensPerCall: Math.max(0, Math.floor(outputTokensPerCall)),
    };
  }, [unit, requestsPerMonth, tasksPerMonth, llmCallsPerTask, inputTokensPerCall, outputTokensPerCall]);

  const scenarios = useMemo(() => {
    if (!model) return null;

    const cachedShare = enableCaching ? clampNumber(cachedInputSharePct / 100, 0, 1) : 0;
    const batchFactor = enableBatch ? clampNumber(batchPriceFactor, 0, 1) : 1;

    const base = calculateAgenticCost(model, {
      ...normalized,
      cachedInputShare: 0,
      batchPriceFactor: 1,
    });
    const cachingOnly = calculateAgenticCost(model, {
      ...normalized,
      cachedInputShare: cachedShare,
      batchPriceFactor: 1,
    });
    const batchOnly = calculateAgenticCost(model, {
      ...normalized,
      cachedInputShare: 0,
      batchPriceFactor: batchFactor,
    });
    const both = calculateAgenticCost(model, {
      ...normalized,
      cachedInputShare: cachedShare,
      batchPriceFactor: batchFactor,
    });

    return {
      cachedShare,
      batchFactor,
      rows: [
        { key: 'base', label: 'Base (no modifiers)', result: base },
        { key: 'caching', label: 'Caching only', result: cachingOnly },
        { key: 'batch', label: 'Batch only', result: batchOnly },
        { key: 'both', label: 'Caching + Batch', result: both },
      ] as const,
      selected: both,
    };
  }, [model, normalized, enableCaching, cachedInputSharePct, enableBatch, batchPriceFactor]);

  const uncertainty = useMemo(() => {
    if (!scenarios) return null;
    if (!showUncertaintyRange) return null;

    const low = Math.max(1, multLow);
    const mid = Math.max(1, multMid);
    const high = Math.max(1, multHigh);

    const base = scenarios.selected.perMonth.totalCost;
    return {
      multipliers: { low, mid, high },
      costs: {
        low: base * low,
        mid: base * mid,
        high: base * high,
      },
    };
  }, [scenarios, showUncertaintyRange, multLow, multMid, multHigh]);

  return (
    <>
      <Header />
      <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg-dark)' }}>
        {/* Sub-nav tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          {([
            { key: 'model', label: 'Model Cost' },
            { key: 'compare', label: 'Architecture Compare' },
          ] as { key: CalcView; label: string }[]).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              style={view === tab.key
                ? { background: 'var(--border)', color: 'var(--text-primary)' }
                : { color: 'var(--text-muted)' }}
              className="px-4 py-2 rounded-md text-sm font-semibold tracking-wide transition-colors hover:text-white"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Compare: full-width 3-panel */}
        {view === 'compare' && (
          <div className="flex-1 overflow-hidden">
            <WorkflowCompare />
          </div>
        )}

        {/* Model Cost: centered */}
        {view === 'model' && (
          <div className="max-w-6xl mx-auto w-full px-4 py-10 flex-1">
            <div className="flex flex-col gap-3 mb-8">
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                Trim Playground
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Agent Economics
              </h1>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Inputs */}
            <div className="bg-background border border-foreground/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-extrabold uppercase tracking-wider text-sm text-foreground/70">
                  Inputs
                </h2>
                <Link href="/playground" className="text-xs font-bold uppercase tracking-wider text-accent hover:underline">
                  Compare models →
                </Link>
              </div>

              {/* Model */}
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Model</div>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/15 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {Object.entries(
                    textModels.reduce((acc, m) => {
                      (acc[m.provider] ||= []).push(m);
                      return acc;
                    }, {} as Record<ProviderType, typeof textModels>)
                  ).map(([provider, models]) => (
                    <optgroup key={provider} label={PROVIDER_LABELS[provider as ProviderType]}>
                      {models
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                {model && (
                  <div className="mt-2 text-xs text-foreground/50">
                    {formatCost(model.inputPrice)}/1K in · {formatCost(model.outputPrice)}/1K out
                    {typeof model.cachedInputPrice === 'number' ? (
                      <> · {formatCost(model.cachedInputPrice)}/1K cached in</>
                    ) : (
                      <> · cached pricing: unknown</>
                    )}
                  </div>
                )}
              </div>

              {/* Workload unit */}
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Workload</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUnit('requests')}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${unit === 'requests' ? 'bg-foreground text-background border-foreground' : 'bg-background border-foreground/15 text-foreground/70 hover:text-foreground'
                      }`}
                  >
                    Requests / month
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('tasks')}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${unit === 'tasks' ? 'bg-foreground text-background border-foreground' : 'bg-background border-foreground/15 text-foreground/70 hover:text-foreground'
                      }`}
                  >
                    Tasks / month
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unit === 'requests' ? (
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Requests / month</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={requestsPerMonth}
                        onChange={(e) => setRequestsPerMonth(toNumber(e.target.value))}
                        className="px-3 py-2 rounded-lg bg-background border border-foreground/15"
                      />
                    </label>
                  ) : (
                    <>
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Tasks / month</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={tasksPerMonth}
                          onChange={(e) => setTasksPerMonth(toNumber(e.target.value))}
                          className="px-3 py-2 rounded-lg bg-background border border-foreground/15"
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">LLM calls / task</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={llmCallsPerTask}
                          onChange={(e) => setLlmCallsPerTask(toNumber(e.target.value))}
                          className="px-3 py-2 rounded-lg bg-background border border-foreground/15"
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Tokens */}
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Tokens per LLM call</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Input tokens</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputTokensPerCall}
                      onChange={(e) => setInputTokensPerCall(toNumber(e.target.value))}
                      className="px-3 py-2 rounded-lg bg-background border border-foreground/15"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Output tokens</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={outputTokensPerCall}
                      onChange={(e) => setOutputTokensPerCall(toNumber(e.target.value))}
                      className="px-3 py-2 rounded-lg bg-background border border-foreground/15"
                    />
                  </label>
                </div>
              </div>

              {/* Pricing modifiers */}
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Pricing modifiers</div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3 bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={enableCaching}
                          onChange={(e) => setEnableCaching(e.target.checked)}
                        />
                        Prompt caching
                      </label>
                      <div className="text-xs text-foreground/50">
                        Bills some input tokens at a cached input rate (if available).
                      </div>
                      {enableCaching && model && typeof model.cachedInputPrice !== 'number' && (
                        <div className="text-xs text-yellow-500 font-semibold">
                          No cached input price for this model. Caching won’t change the estimate.
                        </div>
                      )}
                    </div>
                    <div className="min-w-[170px]">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-2">
                        Cached share
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={!enableCaching}
                          value={cachedInputSharePct}
                          onChange={(e) => setCachedInputSharePct(clampNumber(toNumber(e.target.value), 0, 100))}
                          className="w-[72px] px-2 py-1.5 rounded-md bg-background border border-foreground/15 disabled:opacity-40"
                        />
                        <span className="text-xs text-foreground/50">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3 bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={enableBatch}
                          onChange={(e) => setEnableBatch(e.target.checked)}
                        />
                        Batch pricing
                      </label>
                      <div className="text-xs text-foreground/50">
                        Applies a multiplicative factor to token cost (set it to your provider’s batch discount).
                      </div>
                    </div>
                    <div className="min-w-[170px]">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-2">
                        Batch factor
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={!enableBatch}
                        value={batchPriceFactor}
                        onChange={(e) => setBatchPriceFactor(clampNumber(toNumber(e.target.value), 0, 1))}
                        className="w-full px-2 py-1.5 rounded-md bg-background border border-foreground/15 disabled:opacity-40"
                      />
                      <div className="text-[11px] text-foreground/50 mt-1">
                        Use <span className="font-bold">1.00</span> if you don’t have batch pricing.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uncertainty */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Uncertainty (optional)</div>
                <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={showUncertaintyRange}
                      onChange={(e) => setShowUncertaintyRange(e.target.checked)}
                    />
                    Show “agentic overhead” range
                  </label>
                  <div className="text-xs text-foreground/50 mt-1">
                    This is an assumption multiplier for retries, multi-call orchestration, context growth, and tool costs.
                    It’s not derived from a single reliable public dataset.
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Conservative', value: multLow, set: setMultLow },
                      { label: 'Realistic', value: multMid, set: setMultMid },
                      { label: 'Worst-case', value: multHigh, set: setMultHigh },
                    ].map((item) => (
                      <label key={item.label} className="flex flex-col gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                          {item.label}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          disabled={!showUncertaintyRange}
                          value={item.value}
                          onChange={(e) => item.set(Math.max(1, toNumber(e.target.value)))}
                          className="px-2 py-1.5 rounded-md bg-background border border-foreground/15 disabled:opacity-40"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div className="flex flex-col gap-6">
              <div ref={resultsRef} className="bg-background border border-foreground/10 rounded-xl p-6 shadow-sm">
                <h2 className="font-extrabold uppercase tracking-wider text-sm text-foreground/70 mb-4">
                  Results
                </h2>

                {!model || !scenarios ? (
                  <div className="text-foreground/60">Select a model to see estimates.</div>
                ) : (
                  <>
                    <ExportButtons
                      model={model}
                      scenarios={scenarios}
                      uncertainty={uncertainty}
                      inputs={{
                        unit,
                        requestsPerMonth,
                        tasksPerMonth,
                        llmCallsPerTask,
                        inputTokens: inputTokensPerCall,
                        outputTokens: outputTokensPerCall,
                        cachingEnabled: enableCaching,
                        cachedPct: cachedInputSharePct,
                        batchEnabled: enableBatch,
                        batchFactor: batchPriceFactor,
                      }}
                      resultsRef={resultsRef}
                    />
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">LLM calls / month</div>
                        <div className="text-2xl font-black mt-1">{formatTokens(scenarios.selected.llmCallsPerMonth)}</div>
                      </div>
                      <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Selected monthly cost</div>
                        <div className="text-2xl font-black mt-1">{formatCost(scenarios.selected.perMonth.totalCost)}</div>
                        <div className="text-xs text-foreground/50 mt-1">
                          (with modifiers: caching {enableCaching ? `${Math.round(scenarios.cachedShare * 100)}%` : 'off'}, batch {enableBatch ? `${scenarios.batchFactor}` : 'off'})
                        </div>
                      </div>
                    </div>

                    {uncertainty && (
                      <div className="mb-6 bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-2">
                          Agentic overhead range (assumption)
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <div className="text-xs font-bold text-foreground/60">×{uncertainty.multipliers.low}</div>
                            <div className="text-lg font-black">{formatCost(uncertainty.costs.low)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground/60">×{uncertainty.multipliers.mid}</div>
                            <div className="text-lg font-black">{formatCost(uncertainty.costs.mid)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground/60">×{uncertainty.multipliers.high}</div>
                            <div className="text-lg font-black">{formatCost(uncertainty.costs.high)}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Scenario comparison</div>
                      <div className="border border-foreground/10 rounded-lg overflow-hidden">
                        {scenarios.rows.map((row) => (
                          <div key={row.key} className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 last:border-b-0">
                            <div className="flex flex-col">
                              <div className="text-sm font-bold">{row.label}</div>
                              <div className="text-xs text-foreground/50">
                                {formatTokens(row.result.perMonth.totalTokens)} tokens / month
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black">{formatCost(row.result.perMonth.totalCost)}</div>
                              <div className="text-xs text-foreground/50">
                                {formatCost(row.result.perCall.totalCost)} / call
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">Per-call breakdown</div>
                        <div className="mt-2 text-sm text-foreground/70">
                          Input: {formatTokens(scenarios.selected.perCall.inputTokens)} tokens → {formatCost(scenarios.selected.perCall.inputCost)}
                        </div>
                        <div className="text-sm text-foreground/70">
                          Output: {formatTokens(scenarios.selected.perCall.outputTokens)} tokens → {formatCost(scenarios.selected.perCall.outputCost)}
                        </div>
                        <div className="mt-2 text-sm font-black">
                          Total: {formatCost(scenarios.selected.perCall.totalCost)}
                        </div>
                        {enableCaching && (
                          <div className="mt-2 text-xs text-foreground/50">
                            Cached input: {formatTokens(scenarios.selected.perCall.cachedInputTokens)} · Uncached input: {formatTokens(scenarios.selected.perCall.uncachedInputTokens)}
                          </div>
                        )}
                      </div>

                      <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">What this excludes</div>
                        <ul className="mt-2 text-xs text-foreground/60 space-y-1 list-disc list-inside">
                          <li>Tool/API costs (search, DB, browser, compute)</li>
                          <li>Retries on failures and self-correction loops</li>
                          <li>Context growth across multi-step tasks</li>
                          <li>Computer-use / GUI action overhead</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-background border border-foreground/10 rounded-xl p-6 shadow-sm">
                <h3 className="font-extrabold uppercase tracking-wider text-sm text-foreground/70 mb-2">
                  Notes
                </h3>
                <div className="text-sm text-foreground/60 space-y-2">
                  <p>
                    Use <span className="font-bold">Tasks/month</span> + <span className="font-bold">LLM calls/task</span> for agentic workflows.
                    If you only know “requests”, keep it on Requests/month.
                  </p>
                  <p>
                    Prompt caching is modeled as a share of input tokens billed at a cached input rate (when available in the model config).
                  </p>
                  <p className="text-xs text-foreground/50">
                    Implementation lives in <span className="font-mono">src/lib/calculator/agenticCost.ts</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
