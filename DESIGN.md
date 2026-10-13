# Syncfolio Design System (DESIGN.md)

> Modern, high-trust, cross-border wealth management dashboard for Indian Mutual Funds and US Equities.

---

## 1. Brand Identity & Design Atmosphere
* **Tone:** Professional, precise, minimalist fintech (inspired by Mercury, Linear, and Wealthfront).
* **Atmosphere:** Dark-mode first, high information density without clutter, crisp contrast for financial figures, calm dark slate surfaces with purposeful emerald and indigo accents.
* **Target Audience:** Sophisticated cross-border retail investors managing assets across currencies (INR ₹ and USD $).

---

## 2. Color Palette & Semantic Tokens

### Backgrounds & Surfaces
* **Canvas Background:** `#090D16` (Deep Midnight Slate) — `bg-slate-950`
* **Surface / Card Background:** `#131C2E` with 70% opacity — `bg-slate-900/70 backdrop-blur-md`
* **Card Border:** `rgba(255, 255, 255, 0.08)` — `border-slate-800`
* **Surface Hover:** `#1E293B` — `hover:bg-slate-800/60`

### Brand & Accents
* **Primary Indigo:** `#6366F1` — `text-indigo-400`, `bg-indigo-600`
* **Electric Cyan:** `#38BDF8` — `text-sky-400`, `bg-sky-500`
* **Financial Positive (Gains/Profits):** `#10B981` (Vibrant Emerald) — `text-emerald-400`, `bg-emerald-500/10`
* **Financial Negative (Losses):** `#F43F5E` (Rose) — `text-rose-400`, `bg-rose-500/10`
* **Drift / Rebalance Warning:** `#F59E0B` (Amber) — `text-amber-400`, `bg-amber-500/10`

### Typography Colors
* **Text Primary (Headings, Values):** `#F8FAFC` (Pure Crisp White) — `text-slate-100`
* **Text Secondary (Labels, Subtitles):** `#94A3B8` (Cool Slate) — `text-slate-400`
* **Text Muted (Footnotes, Table headers):** `#64748B` — `text-slate-500`

---

## 3. Typography
* **Primary Font:** Inter, system-ui, -apple-system, sans-serif
* **Numerical / Financial Figures:** Monospace (`font-mono`) or tabular numbers (`tabular-nums`) for perfect digit alignment across table rows and KPI cards.
* **Scale Hierarchy:**
  * **Hero Metric (Total Net Worth):** `text-4xl sm:text-5xl font-extrabold tracking-tight`
  * **Card Titles:** `text-sm font-semibold uppercase tracking-wider text-slate-400`
  * **Table & Data Rows:** `text-sm font-medium`
  * **Badges & Tags:** `text-xs font-semibold uppercase tracking-wide`

---

## 4. Layout & Grid Architecture
* **Container Max Width:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
* **Spacing Scale:** Standard 4px grid (`gap-6`, `p-6`, `space-y-6`).
* **Header Bar (Sticky):**
  * Brand logo with gradient icon.
  * Statement Import button (`Upload CAS / Excel`).
  * Live FX ticker badge (`USD/INR: ~₹96.88`).
  * Currency Switcher Pill (`INR ₹` vs `USD $`).
* **Hero Section (Top Grid):**
  * Primary Net Worth card with 24h P&L pill and multi-currency conversion preview.
  * Quick metric stats: Invested Value, Unrealized Gain, Cash balance.
* **Analytics Section (Middle 2-Column Grid):**
  * **Left (Asset Allocation):** Clean Donut chart with category legend (Indian Mutual Funds, US Equities, Liquid Cash).
  * **Right (Drift Matrix & Target Rebalance):** Horizontal progress bars comparing Current Allocation % against Target %, with colored drift delta badges (`+2.4%`, `-1.8%`).
* **Holdings & Transaction Ledger (Bottom Section):**
  * Tab navigation / Filter chips (`All Assets`, `Indian Mutual Funds`, `US Stocks`, `Cash`).
  * Search bar with instant filtering.
  * Data table with columns: Fund/Ticker Name, Asset Class badge, Folio/Symbol, Units, Avg Cost, Current NAV/Price, Total Value, P&L.
  * Clean pagination and record count.

---

## 5. Component Patterns & Styling Rules

### Cards & Panels
```html
<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl transition-all duration-200 hover:border-slate-700">
  <!-- Card content -->
</div>
```

### Currency Toggle Pill (Segmented Control)
```html
<div class="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
  <button class="rounded-lg px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white shadow-sm">INR (₹)</button>
  <button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white">USD ($)</button>
</div>
```

### Status & Asset Class Badges
* **Indian Mutual Fund:** `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`
* **US Equity:** `bg-sky-500/10 text-sky-400 border border-sky-500/20`
* **On-Target:** `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
* **Drift Alert (> 5%):** `bg-amber-500/10 text-amber-400 border border-amber-500/20`

---

## 6. Constraints (Do's and Don'ts)
* **DO** use clean Tailwind CSS v3 utility classes.
* **DO** prioritize tabular readability with monospace numbers for monetary amounts.
* **DO** provide clear visual separation between INR-denominated and USD-denominated values.
* **DON'T** use heavy 3D gradients, harsh neon drop-shadows, or bright white card backgrounds.
* **DON'T** alter backend endpoints, database schemas, or authentication logic.
* **DON'T** hide critical financial information behind nested modals or complex dropdowns.
