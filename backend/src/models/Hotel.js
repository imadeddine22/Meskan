import mongoose from 'mongoose';
import { autoTranslate } from '../utils/autoTranslate.js';
import { countryPlugin } from '../utils/countryPlugin.js';
import { reviewPlugin } from '../utils/reviewPlugin.js';
import { policiesPlugin } from '../utils/policies.js';
import { reelPlugin } from '../utils/reelPlugin.js';

const hotelSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Hotel name is required'], trim: true },
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
    starRating: { type: Number, min: 1, max: 5, default: 3 },
    type: {
      type: String,
      enum: ['Luxe', 'Affaires', 'Balnéaire', 'Riad', 'Boutique', 'Montagne', 'Désert', 'Appart-hôtel', 'Économique'],
      default: 'Économique',
    },
    suitableFor: [{ 
      type: String, 
      enum: ['Familles', 'Amis', 'Couples', 'Solo', 'Affaires'] 
    }],
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
    // Home page "Hôtels en vedette": chosen by the admin, shown in featuredRank order (0 = first)
    featured: { type: Boolean, default: false, index: true },
    featuredRank: { type: Number, default: 0 },
  },
  { timestamps: true }
);

hotelSchema.index({ wilaya: 1, status: 1 });

// Name/description/amenities are machine-translated into the other site languages after each save
export const TRANSLATED_FIELDS = ['name', 'description', 'amenities'];
countryPlugin(hotelSchema);
reviewPlugin(hotelSchema); // edits after approval stay online, flagged for the admin
reelPlugin(hotelSchema);
policiesPlugin(hotelSchema);
autoTranslate(hotelSchema, TRANSLATED_FIELDS);

const Hotel = mongoose.model('Hotel', hotelSchema);
export default Hotel;
