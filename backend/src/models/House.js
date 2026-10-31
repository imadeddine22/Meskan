import { discountPlugin } from '../utils/pricing.js';
import mongoose from 'mongoose';
import { autoTranslate } from '../utils/autoTranslate.js';
import { countryPlugin } from '../utils/countryPlugin.js';
import { policiesPlugin } from '../utils/policies.js';
import { reelPlugin } from '../utils/reelPlugin.js';

export const RENTAL_PERIODS = ['daily', 'monthly', 'yearly', 'monthly_yearly'];
const isDaily = function () {
  return !this.rentalPeriod || this.rentalPeriod === 'daily';
};
/** Filter for the houses rented by `period`: a "monthly and yearly" house shows under month and under year. */
export const periodFilter = (period) => {
  if (period === 'daily') return { rentalPeriod: { $nin: ['monthly', 'yearly', 'monthly_yearly'] } }; // older houses have no period: nightly
  if (period === 'monthly') return { rentalPeriod: { $in: ['monthly', 'monthly_yearly'] } };
  if (period === 'yearly') return { rentalPeriod: { $in: ['yearly', 'monthly_yearly'] } };
  if (period === 'monthly_yearly') return { rentalPeriod: 'monthly_yearly' };
  return null;
};

const houseSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'House name is required'], trim: true },
    description: { type: String, default: '' },
    wilaya: {
      type: String,
      required: [true, 'Wilaya is required'],
    },
    city: { type: String, required: [true, 'City is required'], trim: true },
    address: { type: String, default: '' },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    amenities: [{ type: String }],
    type: {
      type: String,
      enum: ['Villa', 'Appartement', 'Maison', 'Chalet', 'Studio', 'Duplex', 'Riad', 'Ferme', 'Luxe', 'Affaires', 'Balnéaire', 'Boutique', 'Montagne', 'Désert', 'Appart-hôtel', 'Économique'],
      default: 'Maison',
    },
    suitableFor: [{ 
      type: String, 
      enum: ['Familles', 'Amis', 'Couples', 'Solo', 'Affaires'] 
    }],
    starRating: { type: Number, min: 1, max: 5, default: 3 },
    rooms: { type: Number, default: 1, min: 1 },
    bathrooms: { type: Number, default: 1, min: 1 },
    capacity: { type: Number, default: 2, min: 1 },
    // How the house is rented: by the night (bookable online), by the month, by the year, or both month and year
    rentalPeriod: { type: String, enum: RENTAL_PERIODS, default: 'daily', index: true },
    pricePerNight: { type: Number, required: [isDaily, 'Price per night is required'], min: 0 }, // no default: a nightly house must give it
    pricePerMonth: { type: Number, min: 0, default: 0 }, // 'monthly' / 'monthly_yearly'
    pricePerYear: { type: Number, min: 0, default: 0 }, // 'yearly' / 'monthly_yearly'
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    avgRating: { type: Number, default: 0 }, // out of 10
    reviewsCount: { type: Number, default: 0 },
    // Category averages (/10) from reviews: cleanliness, location, value, staff, comfort
    scores: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

houseSchema.index({ wilaya: 1, status: 1 });

// Name/description/amenities are machine-translated into the other site languages after each save
export const TRANSLATED_FIELDS = ['name', 'description', 'amenities'];
countryPlugin(houseSchema);
reelPlugin(houseSchema);
policiesPlugin(houseSchema);
discountPlugin(houseSchema);
autoTranslate(houseSchema, TRANSLATED_FIELDS);

const House = mongoose.model('House', houseSchema);
export default House;
