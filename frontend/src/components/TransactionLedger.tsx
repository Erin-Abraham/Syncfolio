"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Layers,
  Receipt,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Platform, TransactionItem } from "@/types/portfolio";
import {
  formatCurrency,
  formatDate,
  getPlatformLabel,
} from "@/lib/utils";

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
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Classify transaction category
  const getCategory = (tx: TransactionItem): string => {
    const combined = (tx.symbol + " " + tx.name).toUpperCase();
    if (combined.includes("GOLD") || combined.includes("SILVER") || combined.includes("COMMODITY")) {
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

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.symbol.toLowerCase().includes(q) ||
        tx.name.toLowerCase().includes(q) ||
        tx.platform.toLowerCase().includes(q);

      const matchesPlatform =
        platformFilter === "ALL" || tx.platform === platformFilter;

      const matchesType =
        typeFilter === "ALL" || tx.transaction_type === typeFilter;

      const matchesCategory =
        assetCategoryFilter === "ALL" || getCategory(tx) === assetCategoryFilter;

      return matchesSearch && matchesPlatform && matchesType && matchesCategory;
    });
  }, [transactions, searchQuery, platformFilter, typeFilter, assetCategoryFilter]);

  // Aggregate stats
  const totalGrossInr = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const val = tx.currency === "USD" ? tx.gross_amount * fxRate : tx.gross_amount;
      return acc + val;
    }, 0);
  }, [transactions, fxRate]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const getPlatformBadge = (platform: Platform) => {
    switch (platform) {
      case "CAMS":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "INDMONEY":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "ZERODHA_COIN":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "KFINTECH":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const getTickerAvatarColor = (symbol: string) => {
    const colors = [
      "from-blue-600 to-indigo-600",
      "from-purple-600 to-pink-600",
      "from-emerald-600 to-teal-600",
      "from-amber-600 to-orange-600",
      "from-cyan-600 to-blue-600",
    ];
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Export transactions to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["ID", "Symbol", "Name", "Platform", "Type", "Date", "Units", "Price", "Gross Amount", "Currency"];
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
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Syncfolio_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      {/* Background glow decoration */}
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-blue-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-purple-600/5 blur-3xl" />

      {/* Header and Controls */}
      <div className="relative z-10 flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Reconciled Transaction Ledger
                </h2>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400 ring-1 ring-inset ring-blue-500/20">
                  {transactions.length} Records
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Immutable ledger of audited trade executions & verified holdings
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {transactions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}
          {onOpenIngestion && (
            <button
              onClick={onOpenIngestion}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Add Statement</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="relative z-10 mt-5 flex flex-col gap-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "ALL", label: "All Assets", count: transactions.length },
            {
              id: "DOMESTIC_EQUITY_MF",
              label: "Domestic MFs",
              count: transactions.filter((t) => getCategory(t) === "DOMESTIC_EQUITY_MF").length,
            },
            {
              id: "US_EQUITY_ETF",
              label: "US Equities ($)",
              count: transactions.filter((t) => getCategory(t) === "US_EQUITY_ETF").length,
            },
            {
              id: "COMMODITY_GOLD",
              label: "Gold & Commodities",
              count: transactions.filter((t) => getCategory(t) === "COMMODITY_GOLD").length,
            },
            {
              id: "DEBT_CASH",
              label: "Debt & Cash",
              count: transactions.filter((t) => getCategory(t) === "DEBT_CASH").length,
            },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setAssetCategoryFilter(cat.id);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center space-x-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                assetCategoryFilter === cat.id
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "border border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  assetCategoryFilter === cat.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Select Toolbars */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search ticker, fund, scheme..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-8 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Platform Filter */}
          <div className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-medium text-slate-300 focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900">All Platforms</option>
              <option value="INDMONEY" className="bg-slate-900">INDmoney</option>
              <option value="CAMS" className="bg-slate-900">CAMS CAS</option>
              <option value="ZERODHA_COIN" className="bg-slate-900">Zerodha</option>
              <option value="KFINTECH" className="bg-slate-900">KFintech</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-medium text-slate-300 focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900">All Order Types</option>
              <option value="BUY" className="bg-slate-900">BUY / Inflow</option>
              <option value="SELL" className="bg-slate-900">SELL / Outflow</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="ml-auto hidden items-center space-x-2 sm:flex">
            <span className="text-[11px] text-slate-500">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value={5} className="bg-slate-900">5</option>
              <option value={10} className="bg-slate-900">10</option>
              <option value={25} className="bg-slate-900">25</option>
              <option value={50} className="bg-slate-900">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="relative z-10 mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 pr-4">Security / Fund Name</th>
              <th className="py-3 px-3">Platform</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Execution Date</th>
              <th className="py-3 px-3 text-right">Units / Quantity</th>
              <th className="py-3 px-3 text-right">Unit Price</th>
              <th className="py-3 pl-3 text-right">Gross Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((tx) => {
                const isUsd = tx.currency === "USD";
                const displayInPreferred =
                  currency === "INR"
                    ? isUsd
                      ? tx.gross_amount * fxRate
                      : tx.gross_amount
                    : isUsd
                    ? tx.gross_amount
                    : tx.gross_amount / fxRate;

                return (
                  <tr
                    key={tx.id}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    {/* Security */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr ${getTickerAvatarColor(
                            tx.symbol
                          )} text-[10px] font-bold text-white shadow-sm`}
                        >
                          {tx.symbol.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-white">
                              {tx.symbol}
                            </span>
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                              IMPORTED
                            </span>
                          </div>
                          <p className="max-w-md truncate text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                            {tx.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Platform Tag */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getPlatformBadge(
                          tx.platform
                        )}`}
                      >
                        {getPlatformLabel(tx.platform)}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center space-x-1 font-mono text-xs font-bold ${
                          tx.transaction_type === "BUY"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {tx.transaction_type === "BUY" ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        <span>{tx.transaction_type}</span>
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-400">
                      {formatDate(tx.execution_date)}
                    </td>

                    {/* Units */}
                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-200">
                      {tx.units.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                      {isUsd
                        ? `$${tx.price.toFixed(2)}`
                        : `₹${tx.price.toFixed(2)}`}
                    </td>

                    {/* Gross Amount */}
                    <td className="py-3.5 pl-3 text-right font-mono font-bold text-white">
                      <div>
                        {isUsd
                          ? `$${tx.gross_amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : `₹${tx.gross_amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                      </div>
                      {/* Secondary currency conversion footnote */}
                      {isUsd && currency === "INR" && (
                        <div className="text-[10px] font-normal text-slate-500">
                          ≈ ₹{Math.round(tx.gross_amount * fxRate).toLocaleString("en-IN")}
                        </div>
                      )}
                      {!isUsd && currency === "USD" && (
                        <div className="text-[10px] font-normal text-slate-500">
                          ≈ ${(tx.gross_amount / fxRate).toFixed(2)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-600">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        {searchQuery || platformFilter !== "ALL" || assetCategoryFilter !== "ALL"
                          ? "No transactions match your current filters"
                          : "No statement transactions imported yet"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {searchQuery || platformFilter !== "ALL" || assetCategoryFilter !== "ALL"
                          ? "Try resetting your search or filter criteria"
                          : "Import your CAMS CAS, INDmoney, or Zerodha statement to populate the ledger"}
                      </p>
                    </div>
                    {onOpenIngestion && (
                      <button
                        onClick={onOpenIngestion}
                        className="mt-2 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-colors"
                      >
                        Import Statement
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredTransactions.length > 0 && (
        <div className="relative z-10 mt-5 flex flex-col justify-between gap-4 border-t border-slate-800/80 pt-4 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-400">
            Showing{" "}
            <span className="font-semibold text-white">
              {(currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {Math.min(currentPage * pageSize, filteredTransactions.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-white">
              {filteredTransactions.length}
            </span>{" "}
            records
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center space-x-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-mono text-xs text-slate-400 px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center space-x-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
