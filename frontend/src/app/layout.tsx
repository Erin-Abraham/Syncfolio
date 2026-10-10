import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Syncfolio | Institutional Portfolio Reconciliation & Drift Engine",
  description:
    "Institutional-grade portfolio reconciliation, multi-currency aggregation, and tax-optimized drift engine for Indian and US equities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-blue-500/20 selection:text-blue-300"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
