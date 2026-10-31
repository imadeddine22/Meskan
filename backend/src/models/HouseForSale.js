import mongoose from 'mongoose';
import { autoTranslate } from '../utils/autoTranslate.js';
import { countryPlugin } from '../utils/countryPlugin.js';
import { reelPlugin } from '../utils/reelPlugin.js';

const houseForSaleSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true },
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
    type: {
      type: String,
      enum: ['Appartement', 'Villa', 'Maison', 'Duplex', 'Studio', 'Terrain', 'Local commercial', 'Ferme', 'Chalet', 'Immeuble'],
      default: 'Appartement',
    },
    // sellerPrice: what the seller asks; price: what buyers see = sellerPrice + Meskan's 1 % (set by the hook below,
    // so every list, filter and sort works on the displayed price)
    sellerPrice: { type: Number, min: 0 },
    price: { type: Number, required: [true, 'Price is required'], min: 0 },
    area: { type: Number, default: 0, min: 0 }, // m²
    rooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    amenities: [{ type: String }],
    // The seller's own contact: never public (Meskan is the intermediary); only the seller and the admins load it
    contactPhone: { type: String, default: '', select: false },
    contactEmail: { type: String, default: '', select: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    views: { type: Number, default: 0 },
    reference: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

// Meskan adds 1 % to every sale price (told to the seller when they publish)
export const MESKAN_SALE_RATE = 0.01;
export const displayedPrice = (sellerPrice) => Math.round(Number(sellerPrice) * (1 + MESKAN_SALE_RATE));

// Before validation, so the required displayed price exists: a listing created with only a price (seed, old code)
// takes it as the seller's price; whenever the seller's price changes, the displayed price follows
houseForSaleSchema.pre('validate', function (next) {
  if (this.sellerPrice == null && this.price != null) this.sellerPrice = this.price;
  if (this.sellerPrice != null && (this.isNew || this.isModified('sellerPrice'))) this.price = displayedPrice(this.sellerPrice);
  next();
});

houseForSaleSchema.pre('save', async function (next) {
  if (!this.reference) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref, exists;
    do {
      ref = 'REF-';
      for (let i = 0; i < 8; i++) {
        ref += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      exists = await mongoose.model('HouseForSale').findOne({ reference: ref });
    } while (exists);
    this.reference = ref;
  }
  next();
});

houseForSaleSchema.index({ wilaya: 1, status: 1 });

// Name/description/amenities are machine-translated into the other site languages after each save
export const TRANSLATED_FIELDS = ['title', 'description', 'amenities'];
countryPlugin(houseForSaleSchema);
reelPlugin(houseForSaleSchema);
autoTranslate(houseForSaleSchema, TRANSLATED_FIELDS);

const HouseForSale = mongoose.model('HouseForSale', houseForSaleSchema);
export default HouseForSale;
