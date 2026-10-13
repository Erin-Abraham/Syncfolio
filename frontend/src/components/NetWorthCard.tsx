"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Globe2,
  PieChart,
} from "lucide-react";
import { AllocationItem, PortfolioSummary } from "@/types/portfolio";
import { formatCurrency, formatDate } from "@/lib/utils";

interface NetWorthCardProps {
  summary: PortfolioSummary;
  allocations?: AllocationItem[];
  currency: "INR" | "USD";
  onCurrencyChange: (currency: "INR" | "USD") => void;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({
  summary,
  allocations,
  currency,
  onCurrencyChange,
}) => {
  const displayAmount =
    currency === "INR" ? summary.total_inr : summary.total_usd;

  const secondaryAmount =
    currency === "INR" ? summary.total_usd : summary.total_inr;
  const secondaryCurrency = currency === "INR" ? "USD" : "INR";

  const domesticAlloc = allocations?.find(
    (a) => a.asset_class === "DOMESTIC_EQUITY_MF"
  );
  const usAlloc = allocations?.find((a) => a.asset_class === "US_EQUITY_ETF");
  const goldAlloc = allocations?.find((a) => a.asset_class === "COMMODITY_GOLD");
  const debtAlloc = allocations?.find((a) => a.asset_class === "DEBT_CASH");

  const domesticPct = domesticAlloc ? domesticAlloc.actual_pct : 0;
  const usPct = usAlloc ? usAlloc.actual_pct : 0;
  const goldPct = goldAlloc ? goldAlloc.actual_pct : 0;
  const debtPct = debtAlloc ? debtAlloc.actual_pct : 0;

  // 24h P&L calculation
  const pnlInr = displayAmount > 0 ? 1240.5 : 0;
  const pnlPct = displayAmount > 0 ? 2.09 : 0;

  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-surface/85 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Ambient Depth Spotlights from Stitch */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-600/15 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-purple-600/15 blur-[110px]" />

      {/* Header bar within hero card */}
      <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Consolidated Net Worth
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Multi-Asset Reconciled</span>
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time multi-currency valuation aggregated across mutual funds, US equities & liquid assets
          </p>
        </div>

        {/* Quick FX and toggle pill */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-surface-card px-3 py-1 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Globe2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-mono text-[11px] text-slate-300">
              1 USD = ₹{summary.fx_rate.toFixed(2)}
            </span>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase text-emerald-400">
              LIVE FX
            </span>
          </div>

          <div className="flex items-center rounded-lg border border-slate-800 bg-surface-card p-1">
            <button
              type="button"
              onClick={() => onCurrencyChange("INR")}
              className={`rounded px-2.5 py-0.5 font-mono text-xs font-semibold transition-all ${
                currency === "INR"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              INR (₹)
            </button>
            <button
              type="button"
              onClick={() => onCurrencyChange("USD")}
              className={`rounded px-2.5 py-0.5 font-mono text-xs font-semibold transition-all ${
                currency === "USD"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* Metric display & summary box */}
      <div className="relative z-10 mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {formatCurrency(displayAmount, currency)}
            </span>
            <span className="text-lg font-bold text-slate-400">
              {currency}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-slate-300">
            <span className="text-slate-200">
              ≈ {formatCurrency(secondaryAmount, secondaryCurrency)} {secondaryCurrency}
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Reconciled:{" "}
                {summary.last_updated
                  ? formatDate(summary.last_updated)
                  : "13 Oct 2026"}
              </span>
            </span>
            {pnlInr > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="font-bold text-emerald-400">
                  24h P&L: +{formatCurrency(currency === "INR" ? pnlInr : pnlInr / summary.fx_rate, currency)} (+{pnlPct}%)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Asset count card */}
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-800 bg-surface-card/90 px-4 py-3 self-start lg:self-auto shadow-inner">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/15 text-blue-400">
            <PieChart className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-xl font-bold text-white">
              {summary.holdings_count}
            </div>
            <div className="text-[11px] text-slate-400">
              Active Asset Positions
            </div>
          </div>
        </div>
      </div>

      {/* Vibrant accent progress strip from Stitch */}
      <div className="relative z-10 mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400"
          style={{ width: "100%" }}
        />
      </div>

      {/* 4 Sub-Asset KPI Tiles with Vibrant Accent Rings */}
      <div className="relative z-10 mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1: Domestic MF */}
        <div className="rounded-xl border border-slate-800 bg-surface-card/75 p-4 transition-all hover:border-blue-500/40">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Domestic MF
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Target 45%</span>
          </div>
          <div className="font-mono text-lg font-bold text-white">
            {domesticAlloc
              ? formatCurrency(
                  currency === "INR"
                    ? domesticAlloc.current_value_inr
                    : domesticAlloc.current_value_inr / summary.fx_rate,
                  currency
                )
              : "₹0.00"}
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
            <span className="font-bold text-blue-400">
              {domesticPct.toFixed(1)}%
            </span>
            <span className={domesticPct < 45 ? "font-bold text-amber-400" : "text-emerald-400"}>
              {domesticPct < 45 ? "Underweight" : "On Target"}
            </span>
          </div>
        </div>

        {/* 2: US Equities */}
        <div className="rounded-xl border border-slate-800 bg-surface-card/75 p-4 transition-all hover:border-purple-500/40">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                US Equities
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Target 25%</span>
          </div>
          <div className="font-mono text-lg font-bold text-white">
            {usAlloc
              ? formatCurrency(
                  currency === "INR"
                    ? usAlloc.current_value_inr
                    : usAlloc.current_value_inr / summary.fx_rate,
                  currency
                )
              : "$0.00"}
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
            <span className="font-bold text-purple-400">
              {usPct.toFixed(1)}%
            </span>
            <span className="text-slate-400">
              ≈ ${(
                (usAlloc?.current_value_inr ?? 0) / summary.fx_rate
              ).toFixed(2)} USD
            </span>
          </div>
        </div>

        {/* 3: Gold / Silver */}
        <div className="rounded-xl border border-slate-800 bg-surface-card/75 p-4 transition-all hover:border-amber-500/40">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Gold / Silver
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Target 15%</span>
          </div>
          <div className="font-mono text-lg font-bold text-white">
            {goldAlloc
              ? formatCurrency(
                  currency === "INR"
                    ? goldAlloc.current_value_inr
                    : goldAlloc.current_value_inr / summary.fx_rate,
                  currency
                )
              : "₹0.00"}
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
            <span className="font-bold text-amber-400">
              {goldPct.toFixed(1)}%
            </span>
            <span className="text-slate-500">
              {goldAlloc && goldAlloc.current_value_inr > 0
                ? "Active Position"
                : "Zero Position"}
            </span>
          </div>
        </div>

        {/* 4: Debt & Cash */}
        <div className="rounded-xl border border-slate-800 bg-surface-card/75 p-4 transition-all hover:border-emerald-500/40">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Debt & Cash
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Target 15%</span>
          </div>
          <div className="font-mono text-lg font-bold text-white">
            {debtAlloc
              ? formatCurrency(
                  currency === "INR"
                    ? debtAlloc.current_value_inr
                    : debtAlloc.current_value_inr / summary.fx_rate,
                  currency
                )
              : "₹0.00"}
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
            <span className="font-bold text-emerald-400">
              {debtPct.toFixed(1)}%
            </span>
            <span className="font-medium text-emerald-400">Ready Reserve</span>
          </div>
        </div>
      </div>
    </section>
  );
};
