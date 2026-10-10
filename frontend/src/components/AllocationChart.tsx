"use client";

import React, { useState, useEffect } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AllocationItem } from "@/types/portfolio";
import {
  formatCurrency,
  formatPercent,
  getAssetClassColor,
  getAssetClassLabel,
} from "@/lib/utils";
import { PieChart as PieIcon } from "lucide-react";

interface AllocationChartProps {
  allocations: AllocationItem[];
  currency?: "INR" | "USD";
  fxRate?: number;
}

export const AllocationChart: React.FC<AllocationChartProps> = ({
  allocations,
  currency = "INR",
  fxRate = 96.88,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = allocations.map((item) => {
    const val =
      currency === "INR"
        ? item.current_value_inr
        : item.current_value_inr / fxRate;
    return {
      name: getAssetClassLabel(item.asset_class),
      assetClass: item.asset_class,
      value: Math.round(val),
      actualPct: item.actual_pct,
      targetPct: item.target_pct,
      driftPct: item.drift_pct,
      status: item.status,
      color: getAssetClassColor(item.asset_class),
    };
  });

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const totalPortfolioValue = chartData.reduce((sum, d) => sum + d.value, 0);
  const pieData = chartData.filter((d) => d.value > 0);
  const activeCategoriesCount = pieData.length;

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <PieIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Asset Allocation Breakdown
            </h2>
            <p className="text-xs text-slate-400">
              Current vs. Target Institutional Weighting
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="relative my-4 flex h-64 w-full items-center justify-center">
        {isMounted ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length && totalPortfolioValue > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-750 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md">
                          <div className="flex items-center space-x-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: data.color }}
                            />
                            <span className="font-semibold text-white text-xs">
                              {data.name}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 font-mono text-xs">
                            <div className="flex justify-between space-x-4 text-slate-300">
                              <span className="text-slate-400">Current Value:</span>
                              <span className="font-bold text-white">
                                {formatCurrency(data.value, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between space-x-4 text-slate-300">
                              <span className="text-slate-400">Actual Weight:</span>
                              <span className="font-bold text-white">
                                {formatPercent(data.actualPct)}
                              </span>
                            </div>
                            <div className="flex justify-between space-x-4 text-slate-300">
                              <span className="text-slate-400">Target Weight:</span>
                              <span className="font-semibold text-slate-300">
                                {formatPercent(data.targetPct)}
                              </span>
                            </div>
                            <div className="flex justify-between space-x-4 border-t border-slate-800 pt-1">
                              <span className="text-slate-400">Drift:</span>
                              <span
                                className={`font-bold ${
                                  data.driftPct > 0
                                    ? "text-rose-400"
                                    : data.driftPct < 0
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }`}
                              >
                                {formatPercent(data.driftPct, true)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={
                    pieData.length > 0
                      ? pieData
                      : [{ name: "No Data", value: 1, color: "#1e293b" }]
                  }
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={pieData.length > 1 ? 4 : 0}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  stroke="#030712"
                  strokeWidth={3}
                >
                  {(pieData.length > 0
                    ? pieData
                    : [{ name: "No Data", value: 1, color: "#1e293b" }]
                  ).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={
                        activeIndex === null || activeIndex === index ? 1 : 0.6
                      }
                      className="transition-all duration-300"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Donut Label */}
            <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
              {totalPortfolioValue > 0 ? (
                <>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Total Assets
                  </span>
                  <span className="font-mono text-lg font-bold text-white">
                    100%
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {activeCategoriesCount} Active{" "}
                    {activeCategoriesCount === 1 ? "Class" : "Classes"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Portfolio
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-400">
                    Empty
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Import to view
                  </span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-44 w-44 items-center justify-center rounded-full border border-slate-800 bg-slate-950/40" />
        )}
      </div>

      {/* Custom Clean Legend Grid */}
      <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-4">
        {chartData.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-950/40 p-2 text-xs transition-colors ${
              activeIndex === index ? "border-slate-700 bg-slate-800/40" : ""
            }`}
          >
            <div className="flex items-center space-x-2 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-slate-300 font-medium text-[11px]">
                {item.name}
              </span>
            </div>
            <div className="font-mono font-bold text-white text-[11px]">
              {formatPercent(item.actualPct)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
