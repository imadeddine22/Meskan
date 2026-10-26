import mongoose from 'mongoose';

const pricingSettingsSchema = new mongoose.Schema(
  {
    growthMonthlyPrice: { type: Number, default: 2900 },
    growthYearlyPrice: { type: Number, default: 29000 },
    proMonthlyPrice: { type: Number, default: 6900 },
    proYearlyPrice: { type: Number, default: 69000 },
    // Value of 1 unit of each currency in DZD, set by the admin; only used to show an
    // approximate "≈ X DZD" next to Tunisian / Moroccan prices (bookings stay in their currency)
    // Meskan is the intermediary on investment projects: visitors only ever see this phone / email,
    // never the phone of the person who published the project
    investContact: {
      phone: { type: String, trim: true, maxlength: 30, default: '' },
      email: { type: String, trim: true, maxlength: 120, default: '' },
    },
    exchangeRates: {
      TND: { type: Number, default: 43, min: 0 },
      MAD: { type: Number, default: 13.5, min: 0 },
    },
  },
  { timestamps: true }
);

const PricingSettings = mongoose.model('PricingSettings', pricingSettingsSchema);
export default PricingSettings;
