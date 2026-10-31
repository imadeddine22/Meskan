import mongoose from 'mongoose';
import Wilaya from '../models/Wilaya.js';
import { WILAYAS } from '../utils/wilayas.js';
import Hotel from '../models/Hotel.js';
import House from '../models/House.js';
import HouseForSale, { MESKAN_SALE_RATE } from '../models/HouseForSale.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

// Upsert the official wilayas on every start so new divisions (e.g. 58 → 69) and
// Arabic names reach existing databases. Admin-added wilayas are left untouched.
export const syncWilayas = async () => {
  try {
    const res = await Wilaya.bulkWrite(
      WILAYAS.map((w) => ({
        updateOne: {
          filter: { name: w.name },
          update: { $set: { code: w.code, arabic: w.arabic, ascii: w.ascii } },
          upsert: true,
        },
      }))
    );
    if (res.upsertedCount) console.log(`✅ ${res.upsertedCount} wilaya(s) added`);
    await backfillCountries();
  } catch (error) {
    console.error('❌ Error seeding wilayas:', error.message);
  }
};

// Listings and bookings created before multi-country support are Algerian, in DZD.
const backfillCountries = async () => {
  const missing = { country: { $exists: false } };
  const done = await Promise.all([Hotel, House, HouseForSale].map((M) => M.updateMany(missing, { $set: { country: 'DZ', currency: 'DZD' } })));
  await Booking.updateMany({ currency: { $exists: false } }, { $set: { currency: 'DZD' } });
  const n = done.reduce((sum, r) => sum + (r.modifiedCount || 0), 0);
  if (n) console.log(`🌍 ${n} listing(s) set to Algeria (DZD)`);
  await migrateReviewScores();
};

// Reviews used to be rated 1–5: give them a score out of 10 and recompute the averages (/10)
const migrateReviewScores = async () => {
  const old = await Review.find({ score: { $exists: false }, rating: { $exists: true } }).select('_id rating hotel house');
  if (!old.length) return;
  await Review.bulkWrite(old.map((r) => ({ updateOne: { filter: { _id: r._id }, update: { $set: { score: r.rating * 2 } } } })));
  const hotels = [...new Set(old.filter((r) => r.hotel).map((r) => String(r.hotel)))];
  const houses = [...new Set(old.filter((r) => r.house).map((r) => String(r.house)))];
  await Promise.all([...hotels.map((id) => Review.recalc({ hotel: id })), ...houses.map((id) => Review.recalc({ house: id }))]);
  console.log(`⭐ ${old.length} review(s) moved to a score out of 10`);
};

// Sale listings from before Meskan's 1 %: their price becomes the seller's price and buyers see it + 1 %.
// Only listings without a sellerPrice are touched, so it runs once.
const migrateSalePrices = async () => {
  const { modifiedCount } = await HouseForSale.updateMany({ sellerPrice: { $exists: false } }, [
    { $set: { sellerPrice: '$price', price: { $round: [{ $multiply: ['$price', 1 + MESKAN_SALE_RATE] }, 0] } } },
  ]);
  if (modifiedCount) console.log(`🏷️  ${modifiedCount} sale listing(s): Meskan's 1 % added to the displayed price`);
};

/**
 * Connect to MongoDB using the MONGO_URI environment variable.
 * Exits the process on failure so the app doesn't run without a database.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    await syncWilayas();
    await migrateSalePrices();
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
