export type AssetClass =
  | 'DOMESTIC_EQUITY_MF'
  | 'US_EQUITY_ETF'
  | 'COMMODITY_GOLD'
  | 'DEBT_CASH';

export type Platform =
  | 'ZERODHA_COIN'
  | 'INDMONEY'
  | 'CAMS'
  | 'KFINTECH'
  | 'MANUAL';

export interface PortfolioSummary {
  total_inr: number;
  total_usd: number;
  fx_rate: number;
  holdings_count: number;
  last_updated: string;
}

export interface AllocationItem {
  asset_class: AssetClass;
  current_value_inr: number;
  actual_pct: number;
  target_pct: number;
  drift_pct: number;
  status: 'BALANCED' | 'UNDERWEIGHT' | 'OVERWEIGHT';
}

export interface TransactionItem {
  id: string;
  symbol: string;
  name: string;
  platform: Platform;
  transaction_type: string;
  execution_date: string;
  units: number;
  price: number;
  gross_amount: number;
  currency: string;
}

export interface RebalanceRecommendation {
  asset_class: AssetClass;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount_inr: number;
  target_weight_pct: number;
  current_weight_pct: number;
  projected_weight_pct: number;
  rationale: string;
}

export interface RebalancePlan {
  portfolio_id?: string;
  strategy: 'FULL_REBALANCE' | 'CASH_INFLOW_OPTIMIZED';
  current_portfolio_value_inr: number;
  cash_inflow_inr: number;
  projected_portfolio_value_inr: number;
  orders: RebalanceRecommendation[];
  total_buy_amount_inr: number;
  total_sell_amount_inr: number;
}

export interface IngestionResponse {
  status: string;
  processed_count: number;
  message?: string;
  account_id?: string;
}

export interface SystemHealthStatus {
  status: 'online' | 'degraded' | 'offline';
  environment?: string;
  latency_ms?: number;
  database?: string;
  timestamp?: string;
}
