"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, FileUp, Layers, RefreshCw, Zap } from "lucide-react";
import { checkSystemHealth } from "@/lib/api";
import { SystemHealthStatus } from "@/types/portfolio";

interface NavbarProps {
  onOpenIngestion: () => void;
  onRefresh?: () => void;
  onReset?: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenIngestion,
  onRefresh,
  onReset,
  isRefreshing = false,
}) => {
  const [health, setHealth] = useState<SystemHealthStatus>({
    status: "online",
    latency_ms: 8,
  });

  useEffect(() => {
    let isMounted = true;
    checkSystemHealth().then((status) => {
      if (isMounted) setHealth(status);
    });
    const interval = setInterval(() => {
      checkSystemHealth().then((status) => {
        if (isMounted) setHealth(status);
      });
    }, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">
                Syncfolio
              </span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 ring-1 ring-inset ring-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs font-medium text-slate-400">
              Institutional Multi-Asset Portfolio Engine
            </p>
          </div>
        </div>

        {/* Action Controls & Telemetry */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Live System Health Pill */}
          <div className="hidden items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 shadow-inner sm:flex">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  health.status === "online"
                    ? "bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  health.status === "online" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {health.status === "online" ? "API Live" : "Degraded"}
            </span>
            {health.latency_ms && (
              <span className="text-[10px] text-slate-500">
                ({health.latency_ms}ms)
              </span>
            )}
          </div>

          {/* Quick Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh telemetry"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          )}

          {/* Reset Baseline Button */}
          {onReset && (
            <button
              onClick={onReset}
              title="Reset portfolio data to baseline"
              className="hidden sm:inline-flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
            >
              <span>Reset</span>
            </button>
          )}

          {/* Import Statement Button */}
          <button
            onClick={onOpenIngestion}
            className="group relative inline-flex items-center justify-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/35 active:scale-[0.98]"
          >
            <FileUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
            <span>Import Statement</span>
          </button>
        </div>
      </div>
    </header>
  );
};
