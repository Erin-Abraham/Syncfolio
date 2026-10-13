"use client";

import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 w-full border-t border-slate-800 bg-surface-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-text-muted sm:px-6 md:flex-row lg:px-8">
        <div className="font-medium text-slate-300">
          © 2026 Syncfolio - Erin Abraham
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="transition-colors hover:text-text-primary"
          >
            Custody Settlement
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="transition-colors hover:text-text-primary"
          >
            RBI / LRS Compliance
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="transition-colors hover:text-text-primary"
          >
            Audited Ledger
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="transition-colors hover:text-text-primary"
          >
            Telemetry Status
          </a>
        </div>
      </div>
    </footer>
  );
};
