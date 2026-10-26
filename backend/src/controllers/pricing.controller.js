import PricingSettings from '../models/PricingSettings.js';

// GET /pricing/prices
export const getPrices = async (req, res, next) => {
  try {
    let settings = await PricingSettings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await PricingSettings.create({});
    }
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
};

// PUT /pricing/prices (Admin only)
export const updatePrices = async (req, res, next) => {
  try {
    const { growthMonthlyPrice, growthYearlyPrice, proMonthlyPrice, proYearlyPrice } = req.body;

    let settings = await PricingSettings.findOne();
    if (!settings) {
      settings = new PricingSettings();
    }

    if (growthMonthlyPrice !== undefined) settings.growthMonthlyPrice = Number(growthMonthlyPrice);
    if (growthYearlyPrice !== undefined) settings.growthYearlyPrice = Number(growthYearlyPrice);
    if (proMonthlyPrice !== undefined) settings.proMonthlyPrice = Number(proMonthlyPrice);
    if (proYearlyPrice !== undefined) settings.proYearlyPrice = Number(proYearlyPrice);
    for (const k of ['phone', 'email']) {
      const v = req.body.investContact?.[k];
      if (typeof v === 'string') settings.investContact[k] = v.trim().slice(0, k === 'phone' ? 30 : 120);
    }
    for (const cur of ['TND', 'MAD']) {
      const rate = Number(req.body.exchangeRates?.[cur]);
      if (req.body.exchangeRates?.[cur] !== undefined && Number.isFinite(rate) && rate > 0) settings.exchangeRates[cur] = rate;
    }

    await settings.save();

    res.json({ success: true, settings, message: 'Tarification mise à jour avec succès' });
  } catch (err) {
    next(err);
  }
};
