import * as XLSX from "xlsx";
import { Platform, TransactionItem } from "@/types/portfolio";

export interface ParseResult {
  transactions: TransactionItem[];
  recordsParsed: number;
  fileName: string;
}

/**
 * Converts potential Excel date serial or date string to ISO string
 */
function parseExcelDate(val: unknown): string {
  if (!val) return new Date().toISOString();

  if (typeof val === "number") {
    // Excel date serial number
    const date = new Date((val - 25569) * 86400 * 1000);
    return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
  }

  if (val instanceof Date) {
    return !isNaN(val.getTime()) ? val.toISOString() : new Date().toISOString();
  }

  if (typeof val === "string") {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = val.split(/[-/]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const customDate = new Date(Date.UTC(y, m, d));
      if (!isNaN(customDate.getTime())) {
        return customDate.toISOString();
      }
    }
  }

  return new Date().toISOString();
}

/**
 * Cleans numerical strings (e.g. "$1,234.50" or "₹15,000.00" -> 1234.5)
 */
function parseCleanNumber(val: unknown, fallback: number = 0): number {
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const str = String(val).trim();
  // Strip currency symbols and commas
  const cleaned = str.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * Detects whether a string specifically represents legal disclaimers,
 * notes, or footer text rather than a fund or security.
 */
export function isDisclaimerOrFooterText(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // 1. Explicit disclaimer bullet prefixes
  if (/^[*#•~]/.test(trimmed)) return true;
  if (/^(note|disclaimer|warning|notice|source|terms|attention|important):/i.test(trimmed)) return true;

  const lower = trimmed.toLowerCase();

  // 2. Specific legal disclaimer phrases
  const disclaimerPhrases = [
    "disclaimer",
    "past performance",
    "future results",
    "entire scope",
    "does not make any warranty",
    "express or implied",
    "consequential liability",
    "financial advisor",
    "tax advisor",
    "investment advice",
    "investment decisions",
    "authenticity",
    "terms and conditions",
    "all rights reserved",
    "confidential",
    "report may not reflect",
    "indmoney does not",
    "drivewealth llc",
    "member finra",
    "sipc",
    "subject to market risk",
    "read all scheme related",
    "unauthorized use",
    "not intended as an offer",
    "solicitation",
    "market data provided by",
    "as of close of business",
    "information contained herein",
    "grand total",
    "sub-total",
    "total portfolio value",
  ];

  for (const phrase of disclaimerPhrases) {
    if (lower.includes(phrase)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a given security or row represents a US-denominated asset
 */
function isUsdSecurity(symbol: string, name: string, combinedRow: string, platform: Platform): boolean {
  const combined = (symbol + " " + name + " " + combinedRow).toLowerCase();

  // If explicit dollar sign
  if (combinedRow.includes("$") || /usd/i.test(combinedRow)) return true;

  // Indian Mutual Funds and Indian equities are in INR
  if (
    /hdfc|icici|sbi|axis|nippon|mirae|parag\s*parikh|ppfas|uti|tata|kotak|quant|motilal|dsp|bandhan|inr|₹/i.test(
      combined
    ) ||
    symbol.startsWith("INF") ||
    symbol.startsWith("INE")
  ) {
    return false;
  }

  // Common US tickers
  if (
    /^(voo|spy|qqq|aapl|msft|googl|amzn|nvda|tsla|vti|schd|meta|brk|dia|iwm)$/i.test(symbol.trim()) ||
    /vanguard|spdr|ishares|invesco|apple|microsoft|google|alphabet|amazon|nvidia|tesla/i.test(combined)
  ) {
    return true;
  }

  // If platform is INDmoney US Account
  if (platform === "INDMONEY" && !/growth|direct|regular|folio|fund/i.test(combined)) {
    return true;
  }

  return false;
}

/**
 * Formats a clean, readable symbol from raw symbol or fund name
 */
function formatSecuritySymbol(rawSymbol: string, rawName: string): string {
  const s = rawSymbol.trim();
  if (s && s.length <= 16 && !s.includes(" ")) {
    return s.toUpperCase();
  }

  // Look for ticker in parentheses in the name e.g. "Apple Inc (AAPL)" or "Vanguard 500 Index Fund (VOO)"
  const parenMatch = rawName.match(/\(([A-Za-z0-9.]+)\)/);
  if (parenMatch && parenMatch[1].length <= 10) {
    return parenMatch[1].toUpperCase();
  }

  // Look for ISIN code (12 characters, starts with IN)
  const isinMatch = (rawSymbol + " " + rawName).match(/\b(IN[A-Z0-9]{10})\b/i);
  if (isinMatch) {
    return isinMatch[1].toUpperCase();
  }

  // If rawSymbol is clean
  if (s && s.length <= 20) {
    return s.toUpperCase();
  }

  // Generate a clean ticker from the first 2-3 words of the fund name
  const words = rawName
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(fund|growth|direct|plan|option|scheme|etf|series|class)$/i.test(w));

  if (words.length >= 2) {
    return (words[0].slice(0, 5) + "-" + words[1].slice(0, 5)).toUpperCase();
  } else if (words.length === 1) {
    return words[0].slice(0, 10).toUpperCase();
  }

  return (rawName.slice(0, 10) || "ASSET").toUpperCase();
}

/**
 * Parses broker statement files (.xls, .xlsx, .csv) into TransactionItem records.
 * Parses all sheets in the workbook and extracts all authentic holdings and funds.
 */
export async function parseBrokerStatement(
  file: File,
  platform: Platform
): Promise<ParseResult> {
  const transactions: TransactionItem[] = [];

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    raw: false,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("Statement file has no readable sheets.");
  }

  const seenSymbols = new Set<string>();

  // Process ALL sheets in the workbook (e.g. US Stocks, Indian Mutual Funds, Equities)
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    if (!rows || rows.length < 2) continue;

    // Scan up to row 50 for the table header
    let headerRowIndex = -1;
    let symbolIdx = -1;
    let nameIdx = -1;
    let dateIdx = -1;
    let typeIdx = -1;
    let unitsIdx = -1;
    let priceIdx = -1;
    let amountIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 50); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || "").toLowerCase().trim();

        if (symbolIdx === -1 && /(ticker|symbol|instrument|security\s*code|isin|tradingsymbol)/i.test(cell)) {
          symbolIdx = c;
        }
        if (
          nameIdx === -1 &&
          /(company|security\s*name|stock\s*name|description|scheme|fund\s*name|mutual\s*fund|asset\s*name|particulars)/i.test(
            cell
          )
        ) {
          nameIdx = c;
        }
        if (dateIdx === -1 && /(date|trade\s*date|exec.*date|transaction\s*date|order\s*date|time)/i.test(cell)) {
          dateIdx = c;
        }
        if (typeIdx === -1 && /(type|activity|action|side|buy.*sell|order\s*type|trans.*type)/i.test(cell)) {
          typeIdx = c;
        }
        if (
          unitsIdx === -1 &&
          /(qty|quantity|units|shares|nos|filled\s*shares|unit\s*balance|holding\s*units|balance)/i.test(cell)
        ) {
          unitsIdx = c;
        }
        if (
          priceIdx === -1 &&
          /(price|rate|avg.*price|nav|cost.*unit|exec.*price|avg.*cost|purchase\s*nav|average\s*price)/i.test(cell)
        ) {
          priceIdx = c;
        }
        if (
          amountIdx === -1 &&
          /(amount|gross.*amount|value|total|invested|order\s*value|net\s*amount|current\s*value|market\s*value|cost\s*value|cost\s*basis)/i.test(
            cell
          )
        ) {
          amountIdx = c;
        }
      }

      // If we found at least a name or symbol, plus units or amount, we have the header
      if ((symbolIdx !== -1 || nameIdx !== -1) && (unitsIdx !== -1 || amountIdx !== -1)) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      continue; // Try next sheet
    }

    // Process data rows
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      let rawSymbol = symbolIdx !== -1 ? String(row[symbolIdx] || "").trim() : "";
      let rawName = nameIdx !== -1 ? String(row[nameIdx] || "").trim() : "";

      // Ignore disclaimer bullets, footer notes, or empty rows
      if (isDisclaimerOrFooterText(rawSymbol) || isDisclaimerOrFooterText(rawName)) {
        continue;
      }

      // If both symbol and name are empty, skip
      if (!rawSymbol && !rawName) continue;

      const name = (rawName || rawSymbol).trim();
      const symbol = formatSecuritySymbol(rawSymbol, name);

      // Extract units, price, and amount
      let units = parseCleanNumber(unitsIdx !== -1 ? row[unitsIdx] : null, 0);
      let price = parseCleanNumber(priceIdx !== -1 ? row[priceIdx] : null, 0);
      let grossAmount = parseCleanNumber(amountIdx !== -1 ? row[amountIdx] : null, 0);

      // Auto-compute math if 2 out of 3 are present
      if (grossAmount === 0 && units > 0 && price > 0) {
        grossAmount = Math.round(units * price * 100) / 100;
      }
      if (price === 0 && units > 0 && grossAmount > 0) {
        price = Math.round((grossAmount / units) * 100) / 100;
      }
      if (units === 0 && price > 0 && grossAmount > 0) {
        units = Math.round((grossAmount / price) * 10000) / 10000;
      }

      // Fallback: if grossAmount > 0 but units is missing, set units = 1
      if (grossAmount > 0 && units === 0) {
        units = 1;
        price = grossAmount;
      }

      // Discard rows with 0 amount
      if (grossAmount <= 0) {
        continue;
      }

      // Transaction type
      const rawType = typeIdx !== -1 ? String(row[typeIdx] || "").toUpperCase() : "";
      const isSell = /sell|sale|redemption|credit/i.test(rawType);
      const transactionType = isSell ? "SELL" : "BUY";

      const executionDate = dateIdx !== -1 ? parseExcelDate(row[dateIdx]) : new Date().toISOString();

      // Determine currency accurately
      const combinedRow = row.join(" ");
      const isUsd = isUsdSecurity(symbol, name, combinedRow, platform);

      const uniqueKey = `${symbol}-${executionDate.slice(0, 10)}-${units}`;
      if (seenSymbols.has(uniqueKey)) {
        continue; // Deduplicate
      }
      seenSymbols.add(uniqueKey);

      transactions.push({
        id: `tx-${platform.toLowerCase()}-${Date.now()}-${transactions.length + 1}`,
        symbol,
        name,
        platform,
        transaction_type: transactionType,
        execution_date: executionDate,
        units: Math.abs(units),
        price: Math.abs(price) || (units > 0 ? grossAmount / units : grossAmount),
        gross_amount: Math.abs(grossAmount),
        currency: isUsd ? "USD" : "INR",
      });
    }
  }

  if (transactions.length === 0) {
    throw new Error(
      `No valid holdings or trades found in "${file.name}". Please ensure the file contains security names and investment values.`
    );
  }

  return {
    transactions,
    recordsParsed: transactions.length,
    fileName: file.name,
  };
}
