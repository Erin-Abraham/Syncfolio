"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { NetWorthCard } from "@/components/NetWorthCard";
import { AllocationChart } from "@/components/AllocationChart";
import { DriftMatrix } from "@/components/DriftMatrix";
import { TransactionLedger } from "@/components/TransactionLedger";
import { IngestionModal } from "@/components/IngestionModal";
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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/20 selection:text-blue-300">
      {/* Top Navigation */}
      <Navbar
        onOpenIngestion={() => setIsIngestionOpen(true)}
        onRefresh={() => loadDashboardData(true)}
        onReset={handleReset}
        isRefreshing={isRefreshing}
      />

      {/* Main Dashboard Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
            {/* Net Worth Skeleton */}
            <div className="h-48 rounded-2xl border border-slate-800 bg-slate-900/50" />

            {/* Grid Skeletons */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="h-96 rounded-2xl border border-slate-800 bg-slate-900/50 lg:col-span-5" />
              <div className="h-96 rounded-2xl border border-slate-800 bg-slate-900/50 lg:col-span-7" />
            </div>

            {/* Ledger Skeleton */}
            <div className="h-80 rounded-2xl border border-slate-800 bg-slate-900/50" />
          </div>
        ) : (
          /* Live Dashboard View */
          <div className="space-y-8">
            {/* Metric Hero Card */}
            <NetWorthCard
              summary={summary}
              allocations={allocations}
              currency={currency}
              onCurrencyChange={setCurrency}
            />

            {/* Allocation & Drift Analysis Section */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Asset Allocation Chart */}
              <div className="lg:col-span-5">
                <AllocationChart
                  allocations={allocations}
                  currency={currency}
                  fxRate={summary.fx_rate}
                />
              </div>

              {/* Drift & Rebalancing Matrix */}
              <div className="lg:col-span-7">
                <DriftMatrix
                  allocations={allocations}
                  currency={currency}
                  fxRate={summary.fx_rate}
                />
              </div>
            </div>

            {/* Transaction Ledger */}
            <TransactionLedger
              transactions={transactions}
              currency={currency}
              fxRate={summary.fx_rate}
              onOpenIngestion={() => setIsIngestionOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Statement Ingestion Dropzone Modal */}
      <IngestionModal
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        onSuccess={() => loadDashboardData(true)}
      />
    </div>
  );
}
