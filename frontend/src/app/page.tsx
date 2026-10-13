"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { NavigationDrawer } from "@/components/NavigationDrawer";
import { NetWorthCard } from "@/components/NetWorthCard";
import { AllocationChart } from "@/components/AllocationChart";
import { DriftMatrix } from "@/components/DriftMatrix";
import { TransactionLedger } from "@/components/TransactionLedger";
import { IngestionModal } from "@/components/IngestionModal";
import { Footer } from "@/components/Footer";
import {
  fetchAllocations,
  fetchPortfolioSummary,
  fetchTransactions,
  INITIAL_ALLOCATIONS,
  INITIAL_SUMMARY,
  INITIAL_TRANSACTIONS,
  resetPortfolioData,
} from "@/lib/api";
import {
  AllocationItem,
  PortfolioSummary,
  TransactionItem,
} from "@/types/portfolio";

export default function DashboardPage() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isIngestionOpen, setIsIngestionOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard Data State pre-populated for immediate first paint
  const [summary, setSummary] = useState<PortfolioSummary>(INITIAL_SUMMARY);
  const [allocations, setAllocations] = useState<AllocationItem[]>(INITIAL_ALLOCATIONS);
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);

  // Load all dashboard telemetry
  const loadDashboardData = useCallback(async (isSilentRefresh = false) => {
    try {
      if (!isSilentRefresh) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const [summaryRes, allocationsRes, transactionsRes] = await Promise.all([
        fetchPortfolioSummary(),
        fetchAllocations(),
        fetchTransactions(),
      ]);

      setSummary(summaryRes);
      setAllocations(allocationsRes);
      setTransactions(transactionsRes);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to portfolio engine. Please check backend status."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleReset = () => {
    resetPortfolioData();
    loadDashboardData(true);
  };

  return (
    <div className="min-h-screen bg-canvas text-on-surface selection:bg-brand-blue selection:text-text-primary">
      {/* Slide-out Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenIngestion={() => setIsIngestionOpen(true)}
      />

      {/* Top Navigation Bar */}
      <Navbar
        onOpenIngestion={() => setIsIngestionOpen(true)}
        onRefresh={() => loadDashboardData(true)}
        onReset={handleReset}
        isRefreshing={isRefreshing}
        currency={currency}
        onCurrencyChange={setCurrency}
        fxRate={summary.fx_rate}
        onToggleDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Main Dashboard Container */}
      <main className="mx-auto w-full max-w-7xl px-4 pt-20 pb-12 sm:px-6 lg:px-8">
        {/* Error Notification Banner */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadDashboardData()}
              className="inline-flex items-center space-x-1 rounded-lg bg-rose-500/20 px-3 py-1 font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {isLoading && allocations.length === 0 ? (
          /* Skeletons Loading View */
          <div className="space-y-6 animate-pulse">
            <div className="h-48 rounded-xl border border-border-slate bg-surface-card/50" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="h-96 rounded-xl border border-border-slate bg-surface-card/50 lg:col-span-5" />
              <div className="h-96 rounded-xl border border-border-slate bg-surface-card/50 lg:col-span-7" />
            </div>
            <div className="h-80 rounded-xl border border-border-slate bg-surface-card/50" />
          </div>
        ) : (
          /* Live Dashboard View matching Stitch Layout */
          <div className="space-y-6">
            {/* Hero Section: Consolidated Net Worth */}
            <NetWorthCard
              summary={summary}
              allocations={allocations}
              currency={currency}
              onCurrencyChange={setCurrency}
            />

            {/* Analytics Mid-Tier: 5-Col Donut Breakdown + 7-Col Drift Matrix */}
            <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <AllocationChart
                  allocations={allocations}
                  currency={currency}
                  fxRate={summary.fx_rate}
                />
              </div>

              <div className="lg:col-span-7">
                <DriftMatrix
                  allocations={allocations}
                  currency={currency}
                  fxRate={summary.fx_rate}
                />
              </div>
            </section>

            {/* Holdings & Transaction Ledger Section */}
            <TransactionLedger
              transactions={transactions}
              currency={currency}
              fxRate={summary.fx_rate}
              onOpenIngestion={() => setIsIngestionOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Institutional Footer */}
      <Footer />

      {/* Statement Ingestion Dropzone Modal */}
      <IngestionModal
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        onSuccess={() => loadDashboardData(true)}
      />
    </div>
  );
}
