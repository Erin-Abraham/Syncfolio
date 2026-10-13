"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Coins,
  Info,
  Scale,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { AllocationItem } from "@/types/portfolio";
import {
  formatCurrency,
  formatPercent,
  getAssetClassLabel,
} from "@/lib/utils";

interface DriftMatrixProps {
  allocations: AllocationItem[];
  currency?: "INR" | "USD";
  fxRate?: number;
}

export const DriftMatrix: React.FC<DriftMatrixProps> = ({
  allocations,
  currency = "INR",
  fxRate = 96.88,
}) => {
  const [freshCapitalInr, setFreshCapitalInr] = useState<number>(50000);
  const [basketExecuted, setBasketExecuted] = useState<boolean>(false);

  // Compute total current value
  const totalValueInr = allocations.reduce(
    (sum, a) => sum + a.current_value_inr,
    0
  );
  const projectedTotalInr = totalValueInr + freshCapitalInr;

  // Fresh-capital rebalancing calculation
  const rebalanceRecommendations = allocations.map((item) => {
    const targetValueInr = (item.target_pct / 100) * projectedTotalInr;
    const deficitInr = targetValueInr - item.current_value_inr;

    return {
      asset_class: item.asset_class,
      deficitInr: deficitInr > 0 ? deficitInr : 0,
    };
  });

  const totalDeficitInr = rebalanceRecommendations.reduce(
    (acc, r) => acc + r.deficitInr,
    0
  );

  const finalAllocations = allocations.map((item) => {
    const rec = rebalanceRecommendations.find(
      (r) => r.asset_class === item.asset_class
    );
    let freshAllocationInr = 0;
    if (freshCapitalInr > 0 && totalDeficitInr > 0 && rec) {
      freshAllocationInr = Math.min(
        rec.deficitInr,
        (rec.deficitInr / totalDeficitInr) * freshCapitalInr
      );
    }

    const value =
      currency === "INR"
        ? item.current_value_inr
        : item.current_value_inr / fxRate;
    const freshValue =
      currency === "INR" ? freshAllocationInr : freshAllocationInr / fxRate;

    return {
      ...item,
      value,
      freshAllocation: Math.round(freshValue),
      freshAllocationInr,
    };
  });

  const getStatusBadge = (status: "BALANCED" | "UNDERWEIGHT" | "OVERWEIGHT") => {
    switch (status) {
      case "BALANCED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Balanced</span>
          </span>
        );
      case "UNDERWEIGHT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            <TrendingDown className="h-3 w-3" />
            <span>Underweight</span>
          </span>
        );
      case "OVERWEIGHT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 font-mono text-[11px] font-bold text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
            <TrendingUp className="h-3 w-3" />
            <span>Overweight</span>
          </span>
        );
    }
  };

  const getAssetDotStyle = (assetClass: string) => {
    switch (assetClass) {
      case "US_EQUITY_ETF":
        return "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]";
      case "DOMESTIC_EQUITY_MF":
        return "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]";
      case "COMMODITY_GOLD":
        return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]";
      case "DEBT_CASH":
        return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div
      id="drift"
      className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-surface/80 p-6 shadow-lg backdrop-blur-xl"
    >
      <div>
        {/* Top Control Bar */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Drift & Tolerance Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Tax-optimized fresh capital rebalancer without triggering capital gains
              </p>
            </div>
          </div>

          {/* Capital Allocation Injection Control */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end min-w-[260px]">
            <div className="flex w-full items-center justify-between sm:justify-end gap-3">
              <span className="hidden sm:inline font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Fresh Capital
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-surface-card px-3 py-1 transition-colors focus-within:border-blue-500">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="font-mono text-xs font-bold text-slate-400">₹</span>
                <input
                  type="text"
                  value={freshCapitalInr.toLocaleString("en-IN")}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/,/g, "");
                    setFreshCapitalInr(Math.max(0, Number(clean) || 0));
                  }}
                  className="w-20 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-none"
                />
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setFreshCapitalInr((c) => c + 5000)}
                    className="text-slate-400 hover:text-white"
                    title="Increase"
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreshCapitalInr((c) => Math.max(0, c - 5000))}
                    className="text-slate-400 hover:text-white"
                    title="Decrease"
                  >
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Slider with step ticks */}
            <div className="flex w-full flex-col gap-1 sm:w-64">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="5000"
                  value={freshCapitalInr}
                  onChange={(e) => setFreshCapitalInr(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-blue-500"
                />
              </div>
              <div className="flex items-center justify-between px-0.5 font-mono text-[10px] text-slate-400">
                <button type="button" onClick={() => setFreshCapitalInr(0)} className="hover:text-white">₹0</button>
                <button type="button" onClick={() => setFreshCapitalInr(25000)} className="hover:text-white">₹25k</button>
                <button
                  type="button"
                  onClick={() => setFreshCapitalInr(50000)}
                  className={freshCapitalInr === 50000 ? "font-bold text-blue-400" : "hover:text-white"}
                >
                  ₹50k
                </button>
                <button type="button" onClick={() => setFreshCapitalInr(75000)} className="hover:text-white">₹75k</button>
                <button type="button" onClick={() => setFreshCapitalInr(100000)} className="hover:text-white">₹100k</button>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-2">Asset Class</th>
                <th className="pb-3 px-2 text-right">Holding Value</th>
                <th className="pb-3 px-2 text-right">Actual %</th>
                <th className="pb-3 px-2 text-right">Target %</th>
                <th className="pb-3 px-2 text-right">Drift</th>
                <th className="pb-3 px-2 text-center">Status</th>
                <th className="pb-3 pl-2 text-right">Fresh Buy Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {finalAllocations.map((item) => (
                <tr
                  key={item.asset_class}
                  className="group transition-colors hover:bg-slate-800/30"
                >
                  {/* Asset Class */}
                  <td className="py-3.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${getAssetDotStyle(
                          item.asset_class
                        )}`}
                      />
                      <span className="font-semibold text-white">
                        {getAssetClassLabel(item.asset_class)}
                      </span>
                    </div>
                  </td>

                  {/* Holding Value */}
                  <td className="py-3.5 px-2 text-right font-mono font-medium text-slate-200">
                    {formatCurrency(item.value, currency)}
                  </td>

                  {/* Actual % */}
                  <td className="py-3.5 px-2 text-right font-mono text-slate-300">
                    {formatPercent(item.actual_pct)}
                  </td>

                  {/* Target % */}
                  <td className="py-3.5 px-2 text-right font-mono text-slate-400">
                    {formatPercent(item.target_pct)}
                  </td>

                  {/* Drift % with Vibrant Colors */}
                  <td
                    className={`py-3.5 px-2 text-right font-mono font-bold ${
                      item.drift_pct < 0
                        ? "text-rose-400"
                        : item.drift_pct > 0
                        ? "text-purple-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {formatPercent(item.drift_pct, true)}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-2 text-center">
                    {getStatusBadge(item.status)}
                  </td>

                  {/* Fresh Buy Order recommendation with Vibrant Emerald Green */}
                  <td className="py-3.5 pl-2 text-right">
                    {item.freshAllocation > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500/30">
                        + {formatCurrency(item.freshAllocation, currency)}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">
                        — (Hold / Tax Protected)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Advisory Bar */}
      <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-slate-800 bg-surface-card/60 p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Info className="h-4 w-4 shrink-0 text-blue-400" />
          <span>
            Target drift corrected via{" "}
            <span className="font-mono font-bold text-white">
              ₹{freshCapitalInr.toLocaleString("en-IN")}
            </span>{" "}
            fresh inflow without selling overweight equities.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setBasketExecuted(true);
            setTimeout(() => setBasketExecuted(false), 3000);
          }}
          className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-1.5 font-mono text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-[0.98]"
        >
          {basketExecuted ? "Order Basket Ready ✓" : "Execute Batch Basket"}
        </button>
      </div>
    </div>
  );
};
