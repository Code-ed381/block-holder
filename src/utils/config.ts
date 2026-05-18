/**
 * Global Configuration & Utilities
 */

export const CONFIG = {
  CURRENCY_SYMBOL: "₵",
  DATE_FORMAT: "DD/MM/YYYY",
  FACTORY_NAME: "Block Factory",
};

/**
 * Format a date string (YYYY-MM-DD) to the global format
 */
export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "-";
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

/**
 * Format a number as local currency
 */
export const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined) return `${CONFIG.CURRENCY_SYMBOL}0.00`;
  return `${CONFIG.CURRENCY_SYMBOL}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Helper to get current period (YYYY-MM)
 */
export const getCurrentPeriod = (): string => {
  return new Date().toISOString().substring(0, 7);
};
