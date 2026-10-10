"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AllocationItem, AssetClass } from "@/types/portfolio";
import {
  formatCurrency,
  formatPercent,
  getAssetClassColor,
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
          <span className="inline-flex items-center space-x-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Balanced</span>
          </span>
        );
      case "UNDERWEIGHT":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
            <TrendingDown className="h-3 w-3" />
            <span>Underweight</span>
          </span>
        );
      case "OVERWEIGHT":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
            <TrendingUp className="h-3 w-3" />
            <span>Overweight</span>
          </span>
        );
    }
  };

  const presets = [10000, 25000, 50000, 100000];

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-4 lg:flex-row lg:items-center">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
              Drift & Tolerance Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Tax-optimized fresh capital rebalancer without triggering capital gains
            </p>
          </div>
        </div>

        {/* Fresh Capital Input & Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setFreshCapitalInr(preset)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                freshCapitalInr === preset
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "border border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-white"
              }`}
            >
              +₹{(preset / 1000).toFixed(0)}k
            </button>
          ))}

          <div className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1 shadow-inner">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-mono text-xs text-slate-400">₹</span>
            <input
              type="number"
              min="0"
              step="5000"
              value={freshCapitalInr}
              onChange={(e) =>
                setFreshCapitalInr(Math.max(0, Number(e.target.value) || 0))
              }
              className="w-20 bg-transparent font-mono text-xs font-bold text-white focus:outline-none"
              placeholder="50000"
            />
          </div>
        </div>
      </div>

      {/* Drift Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 pr-4">Asset Class</th>
              <th className="py-3 px-3 text-right">Holding Value</th>
              <th className="py-3 px-3 text-right">Actual %</th>
              <th className="py-3 px-3 text-right">Target %</th>
              <th className="py-3 px-3 text-right">Drift</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 pl-3 text-right text-emerald-400">
                Fresh Buy Order
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {finalAllocations.map((item) => (
              <tr
                key={item.asset_class}
                className="group transition-colors hover:bg-slate-800/30"
              >
                {/* Asset Class */}
                <td className="py-3.5 pr-4">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-2 ring-slate-800"
                      style={{
                        backgroundColor: getAssetClassColor(item.asset_class),
                      }}
                    />
                    <span className="font-semibold text-white">
                      {getAssetClassLabel(item.asset_class)}
                    </span>
                  </div>
                </td>

                {/* Current Value */}
                <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-300">
                  {formatCurrency(item.value, currency)}
                </td>

                {/* Actual % */}
                <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                  {formatPercent(item.actual_pct)}
                </td>

                {/* Target % */}
                <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                  {formatPercent(item.target_pct)}
                </td>

                {/* Drift % */}
                <td
                  className={`py-3.5 px-3 text-right font-mono font-bold ${
                    item.drift_pct > 0
                      ? "text-rose-400"
                      : item.drift_pct < 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {formatPercent(item.drift_pct, true)}
                </td>

                {/* Status Badge */}
                <td className="py-3.5 px-3 text-center">
                  {getStatusBadge(item.status)}
                </td>

                {/* Rebalance Recommendation */}
                <td className="py-3.5 pl-3 text-right font-mono font-bold">
                  {item.freshAllocation > 0 ? (
                    <span className="inline-flex items-center space-x-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                      <span>+</span>
                      <span>{formatCurrency(item.freshAllocation, currency)}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rebalancing Strategy Footer Note */}
      <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3.5 text-xs text-slate-400 sm:flex-row sm:items-center">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong className="text-slate-200">
              Buy-Only Inflow Optimization:
            </strong>{" "}
            Deploying{" "}
            <span className="font-mono font-semibold text-emerald-400">
              {formatCurrency(
                currency === "INR" ? freshCapitalInr : freshCapitalInr / fxRate,
                currency
              )}
            </span>{" "}
            automatically routes capital to underweight positions to re-align your target weights without selling assets.
          </span>
        </div>
      </div>
    </div>
  );
};
