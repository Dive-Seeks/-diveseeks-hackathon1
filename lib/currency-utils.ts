/**
 * Formats a numeric value (in cents/minor units) into a localized currency string.
 * @param amount Minor units (e.g., cents, pence)
 * @param currency Currency code (e.g., 'GBP', 'USD', 'EUR')
 * @returns Formatted string (e.g., £10.00, $10.00)
 */
export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  const upperCurrency = currency.toUpperCase();
  const formatted = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: upperCurrency,
  }).format(amount / 100);

  // If the result contains the ISO code (e.g. "PKR 100"), try to replace it with a symbol
  if (formatted.includes(upperCurrency) && CURRENCY_SYMBOLS[upperCurrency]) {
    return formatted.replace(upperCurrency, CURRENCY_SYMBOLS[upperCurrency]).trim();
  }

  return formatted;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  PKR: '₨',
  INR: '₹',
  NZD: '$',
  AUD: '$',
  CAD: '$',
  AED: 'د.إ',
  SAR: 'ر.س',
};

/**
 * Returns the currency symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string = 'GBP'): string {
  const upperCurrency = currency.toUpperCase();
  if (CURRENCY_SYMBOLS[upperCurrency]) {
    return CURRENCY_SYMBOLS[upperCurrency];
  }

  try {
    return (0).toLocaleString('en-GB', {
      style: 'currency',
      currency: upperCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).replace(/\d/g, '').trim();
  } catch (e) {
    return upperCurrency === 'GBP' ? '£' : '$';
  }
}
