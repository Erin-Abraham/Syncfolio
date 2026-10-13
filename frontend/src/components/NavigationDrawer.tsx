"use client";

import React, { useEffect } from "react";
import {
  LayoutDashboard,
  PieChart,
  Scale,
  Activity,
  ArrowLeftRight,
  FileSpreadsheet,
  Settings,
  X,
  Layers,
} from "lucide-react";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenIngestion: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenIngestion,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Slide-out Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between overflow-y-auto border-r border-slate-800 bg-surface-card/95 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-blue to-indigo-500 shadow-md">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-text-primary">
                Syncfolio
              </span>
              <span className="rounded border border-brand-blue/30 bg-brand-blue/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-blue">
                PRO
              </span>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              title="Close Navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Nav Group 1 */}
          <div className="flex flex-col gap-1">
            <span className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Portfolios & Analytics
            </span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="flex items-center gap-3 rounded-lg bg-surface-hover px-3 py-2 text-xs font-semibold text-text-primary transition-colors"
            >
              <LayoutDashboard className="h-4 w-4 text-brand-blue" />
              <span>Overview / Dashboard</span>
            </a>
            <a
              href="#holdings"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                document.getElementById("holdings")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-surface-hover/60 hover:text-text-primary"
            >
              <PieChart className="h-4 w-4" />
              <span>Holdings & Folios</span>
            </a>
            <a
              href="#drift"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                document.getElementById("drift")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-surface-hover/60 hover:text-text-primary"
            >
              <Scale className="h-4 w-4" />
              <span>Rebalancing Engine</span>
            </a>
            <a
              href="#analytics"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                document.getElementById("analytics")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-surface-hover/60 hover:text-text-primary"
            >
              <Activity className="h-4 w-4" />
              <span>Portfolio Analytics</span>
            </a>
          </div>

          {/* Nav Group 2 */}
          <div className="flex flex-col gap-1 border-t border-slate-800 pt-3">
            <span className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Reports & Compliance
            </span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-surface-hover/60 hover:text-text-primary"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>FX & Tax Reports</span>
            </a>
            <button
              onClick={() => {
                onClose();
                onOpenIngestion();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:bg-surface-hover/60 hover:text-text-primary"
            >
              <FileSpreadsheet className="h-4 w-4 text-brand-blue" />
              <span>Statements (CAS / Excel)</span>
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-surface-hover/60 hover:text-text-primary"
            >
              <Settings className="h-4 w-4" />
              <span>Settings & Security</span>
            </a>
          </div>
        </div>

        {/* Footer Account Status */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-surface-card/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/20 font-mono text-xs font-bold text-brand-blue">
                US
              </div>
              <div>
                <div className="text-xs font-medium leading-none text-text-primary">
                  Apex Clearing / Vested
                </div>
                <div className="mt-1 text-[11px] text-text-muted">
                  LRS Account #7712
                </div>
              </div>
            </div>
            <span
              className="h-2 w-2 rounded-full bg-gain-emerald shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              title="Live Synced"
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 font-mono text-[11px] text-text-muted">
            <span>Quick Toggle</span>
            <kbd className="rounded border border-slate-800 bg-surface-hover px-1.5 py-0.5 text-[10px] text-text-secondary">
              Esc to Close
            </kbd>
          </div>
        </div>
      </aside>
    </>
  );
};
