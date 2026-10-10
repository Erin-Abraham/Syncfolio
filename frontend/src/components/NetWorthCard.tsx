"use client";

import React from "react";
import {
  Coins,
  Clock,
  Globe2,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Wallet,
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
    currency === "INR"
      ? summary.total_usd
      : summary.total_inr;
  const secondaryCurrency = currency === "INR" ? "USD" : "INR";

  const domesticAlloc = allocations?.find((a) => a.asset_class === "DOMESTIC_EQUITY_MF");
  const usAlloc = allocations?.find((a) => a.asset_class === "US_EQUITY_ETF");
  const goldAlloc = allocations?.find((a) => a.asset_class === "COMMODITY_GOLD");
  const debtAlloc = allocations?.find((a) => a.asset_class === "DEBT_CASH");

  const domesticPct = domesticAlloc ? domesticAlloc.actual_pct : 0;
  const usPct = usAlloc ? usAlloc.actual_pct : 0;
  const goldPct = goldAlloc ? goldAlloc.actual_pct : 0;
  const debtPct = debtAlloc ? debtAlloc.actual_pct : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-indigo-600/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-600/5 blur-3xl" />

      {/* Top Header Row */}
      <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Consolidated Net Worth
            </span>
            <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
              <ShieldCheck className="h-3 w-3" />
              <span>Multi-Asset Reconciled</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time multi-currency valuation aggregated across mutual funds, US equities & liquid assets
          </p>
        </div>

        {/* Currency Switcher & Live FX Rate Pill */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Active FX Rate Badge */}
          <div className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Globe2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-mono text-slate-400">1 USD =</span>
            <span className="font-mono font-bold text-emerald-400">
              ₹{summary.fx_rate.toFixed(2)}
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
              LIVE FX
            </span>
          </div>

          {/* Toggle pill */}
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-inner">
            <button
              onClick={() => onCurrencyChange("INR")}
              className={`rounded-lg px-3.5 py-1 text-xs font-bold transition-all ${
                currency === "INR"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => onCurrencyChange("USD")}
              className={`rounded-lg px-3.5 py-1 text-xs font-bold transition-all ${
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

      {/* Main Metric Hero Section */}
      <div className="relative z-10 mt-7 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="font-mono text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              {formatCurrency(displayAmount, currency)}
            </h1>
            <span className="font-mono text-base font-medium text-slate-400">
              {currency}
            </span>
          </div>

          {/* Dual Currency Sub-Valuation */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
            <span className="font-mono font-medium text-slate-400">
              ≈ {formatCurrency(secondaryAmount, secondaryCurrency)} {secondaryCurrency}
            </span>
            <span className="text-slate-600">•</span>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Reconciled:</span>
              <span className="font-medium text-slate-300">
                {summary.last_updated ? formatDate(summary.last_updated) : "Live Session"}
              </span>
            </div>
          </div>
        </div>

        {/* Mini Holdings Summary Pill */}
        <div className="flex items-center space-x-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 lg:self-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
            <PieChart className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-xl font-bold text-white">
              {summary.holdings_count}
            </div>
            <p className="text-[11px] text-slate-400">Active Asset Positions</p>
          </div>
        </div>
      </div>

      {/* Segmented Visual Allocation Bar */}
      {displayAmount > 0 && (
        <div className="relative z-10 mt-6">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
            {domesticPct > 0 && (
              <div
                style={{ width: `${domesticPct}%` }}
                className="bg-blue-500 transition-all duration-500 hover:brightness-125"
                title={`Domestic Equity MF: ${domesticPct.toFixed(1)}%`}
              />
            )}
            {usPct > 0 && (
              <div
                style={{ width: `${usPct}%` }}
                className="bg-purple-500 transition-all duration-500 hover:brightness-125"
                title={`US Equities & ETFs: ${usPct.toFixed(1)}%`}
              />
            )}
            {goldPct > 0 && (
              <div
                style={{ width: `${goldPct}%` }}
                className="bg-amber-500 transition-all duration-500 hover:brightness-125"
                title={`Gold & Commodities: ${goldPct.toFixed(1)}%`}
              />
            )}
            {debtPct > 0 && (
              <div
                style={{ width: `${debtPct}%` }}
                className="bg-emerald-500 transition-all duration-500 hover:brightness-125"
                title={`Debt & Cash: ${debtPct.toFixed(1)}%`}
              />
            )}
          </div>
        </div>
      )}

      {/* 4 Asset Class Metric Cards Strip */}
      <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Domestic MF */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 transition-colors hover:border-blue-500/30">
          <div className="flex items-center space-x-2 text-slate-400">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Domestic MF
            </span>
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-white sm:text-xl">
            {domesticAlloc ? formatCurrency(currency === "INR" ? domesticAlloc.current_value_inr : domesticAlloc.current_value_inr / summary.fx_rate, currency) : "₹0"}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="font-mono font-semibold text-blue-400">
              {domesticPct.toFixed(1)}%
            </span>
            <span className="text-slate-500">Target 45%</span>
          </div>
        </div>

        {/* US Equity */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 transition-colors hover:border-purple-500/30">
          <div className="flex items-center space-x-2 text-slate-400">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              US Equities
            </span>
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-white sm:text-xl">
            {usAlloc ? formatCurrency(currency === "INR" ? usAlloc.current_value_inr : usAlloc.current_value_inr / summary.fx_rate, currency) : "$0"}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="font-mono font-semibold text-purple-400">
              {usPct.toFixed(1)}%
            </span>
            <span className="text-slate-500">Target 25%</span>
          </div>
        </div>

        {/* Gold & Commodity */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 transition-colors hover:border-amber-500/30">
          <div className="flex items-center space-x-2 text-slate-400">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Gold / Silver
            </span>
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-white sm:text-xl">
            {goldAlloc ? formatCurrency(currency === "INR" ? goldAlloc.current_value_inr : goldAlloc.current_value_inr / summary.fx_rate, currency) : "₹0"}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="font-mono font-semibold text-amber-400">
              {goldPct.toFixed(1)}%
            </span>
            <span className="text-slate-500">Target 15%</span>
          </div>
        </div>

        {/* Debt & Cash */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 transition-colors hover:border-emerald-500/30">
          <div className="flex items-center space-x-2 text-slate-400">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Debt & Cash
            </span>
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-white sm:text-xl">
            {debtAlloc ? formatCurrency(currency === "INR" ? debtAlloc.current_value_inr : debtAlloc.current_value_inr / summary.fx_rate, currency) : "₹0"}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="font-mono font-semibold text-emerald-400">
              {debtPct.toFixed(1)}%
            </span>
            <span className="text-slate-500">Target 15%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
