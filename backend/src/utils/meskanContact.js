import PricingSettings from '../models/PricingSettings.js';

/**
 * Meskan's own phone / email, set by the admin. Meskan is the intermediary between guests and owners,
 * buyers and sellers, investors and project owners: listings show this contact, never the publisher's.
 */
export const meskanContact = async () => {
  const s = await PricingSettings.findOne().select('investContact').lean();
  return { phone: s?.investContact?.phone || '', email: s?.investContact?.email || '' };
};
