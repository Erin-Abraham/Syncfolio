"use client";

import React, { useState, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { Platform } from "@/types/portfolio";
import { uploadStatement } from "@/lib/api";

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [platform, setPlatform] = useState<Platform>("CAMS");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setError(null);
    setSuccessMessage(null);
    const lowerName = selectedFile.name.toLowerCase();
    if (lowerName.endsWith(".pdf")) {
      setPlatform("CAMS");
    } else if (
      lowerName.endsWith(".xls") ||
      lowerName.endsWith(".xlsx") ||
      lowerName.includes("indmoney") ||
      lowerName.includes("drivewealth")
    ) {
      setPlatform("INDMONEY");
    } else if (lowerName.includes("tradebook") || lowerName.includes("zerodha")) {
      setPlatform("ZERODHA_COIN");
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a statement file to upload.");
      return;
    }

    if (platform === "CAMS" && file.name.endsWith(".pdf") && !password) {
      setError("CAMS PDF statements are encrypted. Please enter your CAS password (PAN or email prefix).");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await uploadStatement(file, platform, password);

      setSuccessMessage(
        res.message ||
          `Parsed and reconciled ${res.processed_count} transactions seamlessly.`
      );

      setTimeout(() => {
        setIsUploading(false);
        onSuccess();
        onClose();
        // Reset form
        setFile(null);
        setPassword("");
        setSuccessMessage(null);
      }, 1200);
    } catch (err: unknown) {
      setIsUploading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Statement processing failed. Ensure file format is valid."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={!isUploading ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl transition-all sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Import Statement</h3>
            <p className="text-xs text-slate-400">
              Ingest broker tradebooks & mutual fund CAS ledgers
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Platform Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Statement Source / Platform
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: "CAMS", label: "CAMS CAS", icon: FileText },
                  { id: "INDMONEY", label: "INDmoney", icon: FileSpreadsheet },
                  { id: "ZERODHA_COIN", label: "Zerodha", icon: FileSpreadsheet },
                  { id: "KFINTECH", label: "KFintech", icon: FileText },
                ] as const
              ).map((p) => {
                const Icon = p.icon;
                const isSelected = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/10 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="mb-1 h-4 w-4" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Statement File
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950/80"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xlsx,.xls,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <span className="mt-2 text-sm font-semibold text-white">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB • Click to replace
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-8 w-8 text-slate-500" />
                  <p className="mt-2 text-xs font-medium text-slate-300">
                    <span className="font-semibold text-blue-400">
                      Click to browse
                    </span>{" "}
                    or drag and drop statement
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Supports INDmoney (.xls, .xlsx, .csv), CAMS CAS (.pdf), Zerodha
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Conditional CAS Password (for PDF/CAMS) */}
          {platform === "CAMS" && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div className="flex items-center space-x-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <label className="text-xs font-semibold text-slate-200">
                  CAS Decryption Password
                </label>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                CAMS statements require your password (typically your PAN in uppercase or email ID)
              </p>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter CAS password"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 pr-10 text-xs font-mono text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center space-x-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing Ledger...</span>
                </>
              ) : (
                <span>Ingest & Reconcile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
