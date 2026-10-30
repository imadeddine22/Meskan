// How a house is rented (same values as House.rentalPeriod on the backend)
export const RENTAL_PERIODS = [
  { key: 'daily', label: 'Location journalière', short: 'Journalier' },
  { key: 'monthly', label: 'Location mensuelle', short: 'Mensuel' },
  { key: 'yearly', label: 'Location annuelle', short: 'Annuel' },
  { key: 'monthly_yearly', label: 'Mensuelle et annuelle', short: 'Mois et année' },
];

/** Older houses have no period: they are rented by the night. */
export const periodOf = (h) => h?.rentalPeriod || 'daily';
export const isNightly = (h) => periodOf(h) === 'daily';

/**
 * Prices to show for a house, in its own period(s):
 * [{ amount, unit }] with unit '/ nuit', '/ mois' or '/ an' (to translate with t()).
 */
export function rentPrices(h) {
  const p = periodOf(h);
  const out = [];
  if (p === 'daily') out.push({ amount: Number(h.pricePerNight) || 0, unit: '/ nuit' });
  if (p === 'monthly' || p === 'monthly_yearly') out.push({ amount: Number(h.pricePerMonth) || 0, unit: '/ mois' });
  if (p === 'yearly' || p === 'monthly_yearly') out.push({ amount: Number(h.pricePerYear) || 0, unit: '/ an' });
  return out;
}
