'use client';

import { useState } from 'react';
import type { ModelConfig } from '@/types';
import type { AgenticCostResult, WorkloadUnit } from '@/lib/calculator';
import { buildExportData, exportAsJSON, exportAsMarkdown, exportAsPNG } from '@/lib/export';

interface ScenarioRow {
  key: string;
  label: string;
  result: AgenticCostResult;
}

interface ExportButtonsProps {
  model: ModelConfig;
  scenarios: { rows: readonly ScenarioRow[]; selected: AgenticCostResult };
  uncertainty: { multipliers: { low: number; mid: number; high: number }; costs: { low: number; mid: number; high: number } } | null;
  inputs: {
    unit: WorkloadUnit;
    requestsPerMonth: number;
    tasksPerMonth: number;
    llmCallsPerTask: number;
    inputTokens: number;
    outputTokens: number;
    cachingEnabled: boolean;
    cachedPct: number;
    batchEnabled: boolean;
    batchFactor: number;
  };
  resultsRef: React.RefObject<HTMLDivElement | null>;
}

const btnBase =
  'px-3 py-1.5 rounded-lg border border-foreground/15 text-xs font-bold uppercase tracking-wider text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-colors';

export function ExportButtons({ model, scenarios, uncertainty, inputs, resultsRef }: ExportButtonsProps) {
  const [copied, setCopied] = useState(false);

  function getData() {
    return buildExportData(model, scenarios, uncertainty, inputs);
  }

  async function handleMarkdown() {
    await exportAsMarkdown(getData());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleJSON() {
    exportAsJSON(getData());
  }

  async function handlePNG() {
    if (!resultsRef.current) return;
    await exportAsPNG(resultsRef.current, model.id);
  }

  return (
    <div className="flex gap-2 mb-4">
      <button type="button" onClick={handleMarkdown} className={btnBase}>
        {copied ? 'Copied!' : 'Markdown'}
      </button>
      <button type="button" onClick={handlePNG} className={btnBase}>
        PNG
      </button>
      <button type="button" onClick={handleJSON} className={btnBase}>
        JSON
      </button>
    </div>
  );
}
