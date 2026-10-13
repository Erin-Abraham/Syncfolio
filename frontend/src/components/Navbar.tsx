"use client";

import React, { useEffect, useState } from "react";
import {
  FileUp,
  Globe2,
  Menu,
  RefreshCw,
  RotateCcw,
  User,
  Zap,
} from "lucide-react";
import { checkSystemHealth } from "@/lib/api";
import { SystemHealthStatus } from "@/types/portfolio";

interface NavbarProps {
  onOpenIngestion: () => void;
  onRefresh?: () => void;
  onReset?: () => void;
  isRefreshing?: boolean;
  currency?: "INR" | "USD";
  onCurrencyChange?: (curr: "INR" | "USD") => void;
  fxRate?: number;
  onToggleDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenIngestion,
  onRefresh,
  onReset,
  isRefreshing = false,
  currency = "INR",
  onCurrencyChange,
  fxRate = 96.88,
  onToggleDrawer,
}) => {
  const [health, setHealth] = useState<SystemHealthStatus>({
    status: "online",
    latency_ms: 12,
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
    <header className="fixed top-0 left-0 z-40 w-full border-b border-slate-800 bg-surface-card/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side: Drawer Toggle & Brand */}
        <div className="flex items-center gap-3">
          {onToggleDrawer && (
            <button
              onClick={onToggleDrawer}
              type="button"
              title="Open Navigation Menu"
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-blue to-indigo-500 shadow-md ring-1 ring-blue-400/30">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-text-primary">
                Syncfolio
              </span>
              <span className="rounded border border-brand-blue/30 bg-brand-blue/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-blue">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Telemetry & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* API Health Pill */}
          <div className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-800 bg-surface-container-lowest px-2.5 py-1 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gain-emerald opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gain-emerald" />
            </span>
            <span className="font-mono text-[11px] font-semibold text-gain-emerald">
              API Live ({health.latency_ms ?? 12}ms)
            </span>
          </div>

          {/* Live FX Pill */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-surface-container-lowest px-2.5 py-1 text-xs">
            <Globe2 className="h-3.5 w-3.5 text-text-secondary" />
            <span className="font-mono text-[11px] text-text-primary">
              1 USD = ₹{fxRate.toFixed(2)}
            </span>
            <span className="rounded bg-gain-emerald/10 px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase text-gain-emerald">
              LIVE FX
            </span>
          </div>

          {/* Currency Toggle Pill */}
          {onCurrencyChange && (
            <div className="flex items-center rounded-lg border border-slate-800 bg-surface-card p-0.5">
              <button
                type="button"
                onClick={() => onCurrencyChange("INR")}
                className={`rounded px-2 py-0.5 font-mono text-xs font-semibold transition-all ${
                  currency === "INR"
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                INR (₹)
              </button>
              <button
                type="button"
                onClick={() => onCurrencyChange("USD")}
                className={`rounded px-2 py-0.5 font-mono text-xs font-semibold transition-all ${
                  currency === "USD"
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                USD ($)
              </button>
            </div>
          )}

          {/* Refresh & Reset Controls */}
          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh Rates & Portfolio Data"
                className="rounded-lg border border-slate-800 bg-surface-container-lowest p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            )}

            {onReset && (
              <button
                type="button"
                onClick={onReset}
                title="Reset portfolio data to default"
                className="hidden sm:inline-flex rounded-lg border border-slate-800 bg-surface-container-lowest px-2.5 py-1 font-mono text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                Reset
              </button>
            )}
          </div>

          {/* Import Statement CTA */}
          <button
            type="button"
            onClick={onOpenIngestion}
            className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_12px_rgba(59,130,246,0.25)] transition-all hover:bg-brand-blue/90 active:scale-[0.98]"
          >
            <FileUp className="h-4 w-4" />
            <span className="hidden sm:inline">Import Statement (CAS / Excel)</span>
            <span className="sm:hidden">Import</span>
          </button>

          {/* Profile Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
