import HouseForSale from '../models/HouseForSale.js';
import { uploadMany, destroyImage } from '../utils/cloudinaryUpload.js';
import { parseCoordinates } from '../utils/parseCoordinates.js';

// Fields a seller may set. Status, views and reference are server-controlled.
// 'price' in the form is the seller's own price (sellerPrice); the model adds Meskan's 1 % to give the displayed price
const EDITABLE = ['title', 'description', 'country', 'wilaya', 'city', 'address', 'type', 'area', 'rooms', 'bathrooms', 'contactPhone', 'contactEmail'];
const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// GET /seller/stats
export const getSellerStats = async (req, res, next) => {
  try {
    const sellerId = req.user._id;

    const totalListings = await HouseForSale.countDocuments({ seller: sellerId });
    const approvedListings = await HouseForSale.countDocuments({ seller: sellerId, status: 'approved' });
    const pendingListings = await HouseForSale.countDocuments({ seller: sellerId, status: 'pending' });
    const totalViews = await HouseForSale.aggregate([
      { $match: { seller: sellerId } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);

    res.json({
      success: true,
      totalListings,
      approvedListings,
      pendingListings,
      totalViews: totalViews[0]?.total || 0,
    });
  } catch (err) {
    next(err);
  }
};

// GET /seller/listings — seller's own listings
export const getMyListings = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = { seller: req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;
    const listings = await HouseForSale.find(filter).select('+contactPhone +contactEmail').sort({ createdAt: -1 });
    res.json({ success: true, count: listings.length, listings });
  } catch (err) {
    next(err);
  }
};

// POST /seller/listings — create a listing
export const createListing = async (req, res, next) => {
  try {
    const images = req.files?.length ? await uploadMany(req.files, 'dzhotels/sales') : [];

    const coordinates = parseCoordinates(req.body);
    const listing = await HouseForSale.create({
      ...pick(req.body, EDITABLE),
      sellerPrice: req.body.price,
      amenities: parseArray(req.body.amenities),
      ...(coordinates && { coordinates }),
      seller: req.user._id,
      contactPhone: req.body.contactPhone || req.user.phone || '',
      contactEmail: req.body.contactEmail || req.user.email || '',
      images,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
    });

    res.status(201).json({ success: true, listing });
  } catch (err) {
    next(err);
  }
};

// PUT /seller/listings/:id — update own listing
export const updateListing = async (req, res, next) => {
  try {
    const listing = await HouseForSale.findById(req.params.id).select('+contactPhone +contactEmail');
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not your listing' });
    }

    EDITABLE.forEach((f) => {
      if (req.body[f] !== undefined) listing[f] = req.body[f];
    });
    if (req.body.price !== undefined && req.body.price !== '') listing.sellerPrice = Number(req.body.price);
    if (req.body.amenities !== undefined) listing.amenities = parseArray(req.body.amenities);
    const coordinates = parseCoordinates(req.body);
    if (coordinates) listing.coordinates = coordinates;

    if (req.files?.length) {
      const uploaded = await uploadMany(req.files, 'dzhotels/sales');
      listing.images.push(...uploaded);
    }

    // Re-submit for approval if it was approved
    if (listing.status === 'approved') listing.status = 'pending';

    await listing.save();
    res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
};

// DELETE /seller/listings/:id — delete own listing
export const deleteListing = async (req, res, next) => {
  try {
    const listing = await HouseForSale.findById(req.params.id).select('+contactPhone +contactEmail');
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not your listing' });
    }

    await Promise.all(listing.images.map((img) => destroyImage(img.publicId)));
    await listing.deleteOne();

    res.json({ success: true, message: 'Listing deleted' });
  } catch (err) {
    next(err);
  }
};

// --- helpers ---
function parseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
}
