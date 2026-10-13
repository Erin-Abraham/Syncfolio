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
  getAssetClassLabel,
} from "@/lib/utils";
import { Clock } from "lucide-react";

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

  const getVibrantColor = (assetClass: string) => {
    switch (assetClass) {
      case "US_EQUITY_ETF":
        return "#a855f7"; // purple-500
      case "DOMESTIC_EQUITY_MF":
        return "#3b82f6"; // blue-500
      case "COMMODITY_GOLD":
        return "#f59e0b"; // amber-500
      case "DEBT_CASH":
        return "#10b981"; // emerald-500
      default:
        return "#64748b";
    }
  };

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
      color: getVibrantColor(item.asset_class),
    };
  });

  const totalPortfolioValue = chartData.reduce((sum, d) => sum + d.value, 0);
  const pieData = chartData.filter((d) => d.value > 0);
  const activeCategoriesCount = pieData.length;

  return (
    <div
      id="analytics"
      className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-surface/80 p-6 shadow-lg backdrop-blur-xl"
    >
      <div>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Asset Allocation Breakdown
            </h2>
            <p className="text-xs text-slate-400">
              Current vs. Target Institutional Weighting
            </p>
          </div>
        </div>

        {/* SVG / Recharts Donut Chart */}
        <div className="relative mx-auto my-6 flex h-64 w-64 items-center justify-center">
          {isMounted ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length && totalPortfolioValue > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-700 bg-surface-card/95 p-3.5 shadow-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: data.color }}
                              />
                              <span className="text-xs font-semibold text-white">
                                {data.name}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1 font-mono text-xs">
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Current Value:</span>
                                <span className="font-bold text-white">
                                  {formatCurrency(data.value, currency)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Actual Weight:</span>
                                <span className="font-bold text-white">
                                  {formatPercent(data.actualPct)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Target Weight:</span>
                                <span className="text-slate-400">
                                  {formatPercent(data.targetPct)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 border-t border-slate-800 pt-1">
                                <span>Drift:</span>
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
                        : [{ name: "Empty", value: 1, color: "#1c1f29" }]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={78}
                    paddingAngle={pieData.length > 1 ? 4 : 0}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    stroke="#090D16"
                    strokeWidth={2}
                  >
                    {(pieData.length > 0
                      ? pieData
                      : [{ name: "Empty", value: 1, color: "#1c1f29" }]
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

              {/* Donut Center Telemetry matching Stitch */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Assets
                </span>
                <span className="font-mono text-2xl font-bold text-white">
                  100%
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-cyan-400">
                  {activeCategoriesCount} Active{" "}
                  {activeCategoriesCount === 1 ? "Class" : "Classes"}
                </span>
              </div>
            </>
          ) : (
            <div className="h-44 w-44 rounded-full border border-slate-800 bg-slate-900" />
          )}
        </div>
      </div>

      {/* Legend & Weights matching Stitch cards with vibrant indicator dots */}
      <div className="space-y-2.5 pt-2">
        {chartData.map((item, index) => {
          const isZero = item.actualPct === 0;
          return (
            <div
              key={index}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center justify-between rounded-lg border border-slate-800 p-2.5 transition-all ${
                isZero
                  ? "bg-surface-card/40 opacity-75"
                  : "bg-surface-card/75 hover:bg-surface-card hover:border-slate-700"
              } ${activeIndex === index ? "border-blue-500/60 bg-slate-800/60" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: !isZero
                      ? `0 0 10px ${item.color}99`
                      : undefined,
                  }}
                />
                <span className="text-xs font-semibold text-slate-200">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-white">
                  {formatPercent(item.actualPct)}
                </span>
                <span className="text-[11px] text-slate-400">
                  Target: {formatPercent(item.targetPct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
