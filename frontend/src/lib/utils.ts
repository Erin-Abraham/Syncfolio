import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AssetClass, Platform } from "@/types/portfolio";

/**
 * Merges multiple tailwind and condition classes safely.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats monetary amounts with strict localization:
 * - INR: en-IN formatting with Rupee symbol (₹)
 * - USD: en-US formatting with Dollar symbol ($)
 */
export function formatCurrency(
  amount: number,
  currency: 'INR' | 'USD' = 'INR'
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return currency === 'INR' ? '₹0.00' : '$0.00';
  }

  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a decimal percentage to standard display string.
 * Example: 12.34 -> "12.34%"
 */
export function formatPercent(val: number, includeSign: boolean = false): string {
  if (isNaN(val) || val === null || val === undefined) {
    return '0.00%';
  }
  const prefix = includeSign && val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}

/**
 * Maps system AssetClass enum to human-readable institutional label.
 */
export function getAssetClassLabel(assetClass: AssetClass): string {
  switch (assetClass) {
    case 'DOMESTIC_EQUITY_MF':
      return 'Domestic Equity MF';
    case 'US_EQUITY_ETF':
      return 'US Equity ETF';
    case 'COMMODITY_GOLD':
      return 'Commodity Gold';
    case 'DEBT_CASH':
      return 'Debt & Cash';
    default:
      return assetClass;
  }
}

/**
 * Maps system Platform enum to human-readable provider label.
 */
export function getPlatformLabel(platform: Platform): string {
  switch (platform) {
    case 'ZERODHA_COIN':
      return 'Zerodha Coin';
    case 'INDMONEY':
      return 'INDmoney';
    case 'CAMS':
      return 'CAMS CAS';
    case 'KFINTECH':
      return 'KFintech';
    case 'MANUAL':
      return 'Manual Entry';
    default:
      return platform;
  }
}

/**
 * Returns consistent accent color tokens per asset class.
 */
export function getAssetClassColor(assetClass: AssetClass): string {
  switch (assetClass) {
    case 'DOMESTIC_EQUITY_MF':
      return '#3B82F6'; // Blue
    case 'US_EQUITY_ETF':
      return '#8B5CF6'; // Violet / Purple
    case 'COMMODITY_GOLD':
      return '#F59E0B'; // Amber Gold
    case 'DEBT_CASH':
      return '#10B981'; // Emerald Green
    default:
      return '#94A3B8'; // Slate
  }
}

/**
 * Formats ISO date string into readable date.
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}
