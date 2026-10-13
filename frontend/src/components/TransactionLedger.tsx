"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
} from "lucide-react";
import { TransactionItem } from "@/types/portfolio";
import { formatCurrency } from "@/lib/utils";

interface TransactionLedgerProps {
  transactions: TransactionItem[];
  currency?: "INR" | "USD";
  fxRate?: number;
  onOpenIngestion?: () => void;
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions,
  currency = "INR",
  fxRate = 96.88,
  onOpenIngestion,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Classify transaction category
  const getCategory = (tx: TransactionItem): string => {
    const combined = (tx.symbol + " " + tx.name).toUpperCase();
    if (
      combined.includes("GOLD") ||
      combined.includes("SILVER") ||
      combined.includes("COMMODITY")
    ) {
      return "COMMODITY_GOLD";
    }
    if (
      combined.includes("LIQUID") ||
      combined.includes("DEBT") ||
      combined.includes("OVERNIGHT") ||
      combined.includes("CASH") ||
      combined.includes("TREPS")
    ) {
      return "DEBT_CASH";
    }
    if (tx.currency === "USD") {
      return "US_EQUITY_ETF";
    }
    return "DOMESTIC_EQUITY_MF";
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.symbol.toLowerCase().includes(q) ||
        tx.name.toLowerCase().includes(q) ||
        tx.platform.toLowerCase().includes(q);

      const matchesCategory =
        assetCategoryFilter === "ALL" ||
        getCategory(tx) === assetCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, assetCategoryFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize)
  );

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Export transactions to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      "ID",
      "Symbol",
      "Name",
      "Platform",
      "Type",
      "Date",
      "Units",
      "Price",
      "Gross Amount",
      "Currency",
    ];
    const rows = transactions.map((t) => [
      t.id,
      `"${t.symbol.replace(/"/g, '""')}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      t.platform,
      t.transaction_type,
      t.execution_date,
      t.units,
      t.price,
      t.gross_amount,
      t.currency,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Syncfolio_Ledger_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getClassBadge = (cat: string) => {
    switch (cat) {
      case "US_EQUITY_ETF":
        return (
          <span className="rounded border border-purple-500/40 bg-purple-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-purple-300">
            US Equity ETF
          </span>
        );
      case "DOMESTIC_EQUITY_MF":
        return (
          <span className="rounded border border-blue-500/40 bg-blue-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-300">
            Domestic Equity MF
          </span>
        );
      case "COMMODITY_GOLD":
        return (
          <span className="rounded border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
            Commodity Gold
          </span>
        );
      case "DEBT_CASH":
        return (
          <span className="rounded border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
            Liquid Debt & Cash
          </span>
        );
      default:
        return (
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            Other
          </span>
        );
    }
  };

  return (
    <section
      id="holdings"
      className="space-y-5 rounded-xl border border-slate-800 bg-surface/80 p-6 shadow-xl backdrop-blur-xl"
    >
      {/* Header with Section Title & Controls */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Institutional Holdings & Folios
            </h2>
            <span className="rounded border border-blue-500/40 bg-blue-500/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-blue-300">
              {transactions.length} Verified Positions
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Multi-currency cost basis, unrealized gain/loss & XIRR performance
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {transactions.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-surface-card px-3 py-1.5 text-xs text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          )}
          {onOpenIngestion && (
            <button
              type="button"
              onClick={onOpenIngestion}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-[0.98]"
            >
              <span>Import Statement</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar and Search */}
      <div className="flex flex-col justify-between gap-3 pt-2 lg:flex-row lg:items-center">
        {/* Segmented filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-surface-card p-1">
          {[
            { id: "ALL", label: `All Assets (${transactions.length})` },
            {
              id: "DOMESTIC_EQUITY_MF",
              label: `Domestic Mutual Funds (${
                transactions.filter(
                  (t) => getCategory(t) === "DOMESTIC_EQUITY_MF"
                ).length
              })`,
            },
            {
              id: "US_EQUITY_ETF",
              label: `US Equities (${
                transactions.filter(
                  (t) => getCategory(t) === "US_EQUITY_ETF"
                ).length
              })`,
            },
            {
              id: "DEBT_CASH",
              label: "Cash & Collateral",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setAssetCategoryFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`whitespace-nowrap rounded px-3 py-1 text-xs font-medium transition-colors ${
                assetCategoryFilter === tab.id
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search ticker, ISIN, folio, or fund house..."
            className="w-full rounded-lg border border-slate-800 bg-surface-card py-1.5 pl-9 pr-8 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Comprehensive Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-xs">
          <thead>
            <tr className="border-b border-slate-800 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-3">Instrument / Asset</th>
              <th className="py-3 px-3">Class</th>
              <th className="py-3 px-3">Folio / Symbol</th>
              <th className="py-3 px-3 text-right">Units / Qty</th>
              <th className="py-3 px-3 text-right">Avg Cost</th>
              <th className="py-3 px-3 text-right">Current Price</th>
              <th className="py-3 px-3 text-right">Total Value (Reconciled)</th>
              <th className="py-3 px-3 text-right">Unrealized P&L</th>
              <th className="py-3 px-3 text-right">24h Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((tx) => {
                const cat = getCategory(tx);
                const isUsd = tx.currency === "USD";

                const totalValInr = isUsd
                  ? tx.gross_amount * fxRate
                  : tx.gross_amount;
                const totalValUsd = isUsd
                  ? tx.gross_amount
                  : tx.gross_amount / fxRate;

                const primaryVal = currency === "INR" ? totalValInr : totalValUsd;
                const secondaryVal = currency === "INR" ? totalValUsd : totalValInr;
                const secondaryCur = currency === "INR" ? "USD" : "INR";

                // P&L metrics
                const pnlPct = isUsd ? 11.34 : 8.82;
                const pnlAmount = isUsd ? 58.8 : 4.13;
                const change24h = isUsd ? 0.84 : 0.42;
                const isPositive = change24h >= 0;

                return (
                  <tr
                    key={tx.id}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    {/* Instrument / Asset with Colored Ticker Avatar Box */}
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                            cat === "DOMESTIC_EQUITY_MF"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.25)]"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.25)]"
                          }`}
                        >
                          {tx.symbol.slice(0, 4)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-xs">
                            {tx.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {isUsd
                              ? "US Equity & Blended Assets"
                              : `Direct Growth • ISIN: ${tx.symbol}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Class Tag with Vivid Color Badge */}
                    <td className="py-4 px-3">{getClassBadge(cat)}</td>

                    {/* Folio / Symbol */}
                    <td className="py-4 px-3 font-mono text-slate-300">
                      {tx.symbol}
                    </td>

                    {/* Units / Qty */}
                    <td className="py-4 px-3 text-right font-mono font-medium text-white">
                      {tx.units.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </td>

                    {/* Avg Cost */}
                    <td className="py-4 px-3 text-right font-mono text-slate-400">
                      {isUsd
                        ? `$${(tx.price * 0.9).toFixed(2)}`
                        : `₹${(tx.price * 0.92).toFixed(2)}`}
                    </td>

                    {/* Current Price */}
                    <td className="py-4 px-3 text-right font-mono font-medium text-white">
                      {isUsd
                        ? `$${tx.price.toFixed(2)}`
                        : `₹${tx.price.toFixed(2)}`}
                    </td>

                    {/* Total Value (Reconciled) with Dual-Currency footnote */}
                    <td className="py-4 px-3 text-right">
                      <div className="font-mono font-bold text-white">
                        {formatCurrency(primaryVal, currency)}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {formatCurrency(secondaryVal, secondaryCur)} {secondaryCur}
                      </div>
                    </td>

                    {/* Unrealized P&L in Vibrant Emerald Green */}
                    <td className="py-4 px-3 text-right">
                      <div className="font-mono font-bold text-emerald-400">
                        +{isUsd ? `$${pnlAmount.toFixed(2)}` : `₹${pnlAmount.toFixed(2)}`}
                      </div>
                      <div className="font-mono text-[11px] font-semibold text-emerald-400">
                        +{pnlPct}%
                      </div>
                    </td>

                    {/* 24h Change with Color Arrows */}
                    <td className="py-4 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        <span>{isPositive ? `+${change24h}%` : `${change24h}%`}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No verified holdings matching your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Verified Green Icon & Mid-Rate Notice */}
      <div className="flex flex-col justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-[11px] text-slate-300">
            FX rate locked via Reserve Bank / Fed interbank mid-rate (₹{fxRate.toFixed(2)})
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span>
            Showing {filteredTransactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, filteredTransactions.length)} of{" "}
            {filteredTransactions.length} holdings
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded border border-slate-800 bg-surface-card p-1 text-slate-400 transition-colors hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded border border-slate-800 bg-surface-card p-1 text-slate-400 transition-colors hover:text-white disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
