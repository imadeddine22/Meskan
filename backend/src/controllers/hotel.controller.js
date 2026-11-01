import { afterOwnerEdit } from '../utils/reviewPlugin.js';
import { effectivePrice } from '../utils/pricing.js';
import { paging, num } from '../utils/query.js';
import { parsePolicies } from '../utils/policies.js';
import { isCountry } from '../utils/countries.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import { parseRoomList } from '../utils/roomList.js';
import { uploadMany, destroyImage } from '../utils/cloudinaryUpload.js';
import { parseCoordinates } from '../utils/parseCoordinates.js';
import { searchRegex, wilayaRegex, placeFilter } from '../utils/searchRegex.js';
import { canView } from '../middlewares/auth.middleware.js';

// Fields an owner may set. Status, ratings and owner are server-controlled.
const EDITABLE = ['name', 'description', 'country', 'wilaya', 'city', 'address', 'starRating', 'type'];
const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

/** Adds the "À partir de" price (cheapest active room after discount) to lean hotels — hotels have no price of their own. */
export async function attachPrices(hotels) {
  const rooms = await Room.find({ hotel: { $in: hotels.map((h) => h._id) }, isActive: true })
    .select('hotel pricePerNight discountPercent discountUntil')
    .lean();
  const best = new Map(); // hotel id → cheapest room price after discount
  for (const r of rooms) {
    const p = effectivePrice(r);
    const cur = best.get(String(r.hotel));
    if (!cur || p.price < cur.price) best.set(String(r.hotel), p);
  }
  hotels.forEach((h) => {
    const p = best.get(String(h._id));
    h.price = p?.price ?? null;
    h.originalPrice = p?.discountPercent ? p.original : null;
    h.discountPercent = p?.discountPercent || 0;
  });
  return hotels;
}

export const MAX_FEATURED = 12;

// GET /hotels/featured — the home page "Hôtels en vedette": the admin's selection in its order,
// or the best-rated hotels while the admin hasn't chosen any
export const getFeaturedHotels = async (req, res, next) => {
  try {
    let hotels = await Hotel.find({ status: 'approved', featured: true }).sort({ featuredRank: 1, updatedAt: -1 }).limit(MAX_FEATURED).lean();
    const chosen = hotels.length > 0;
    if (!chosen) hotels = await Hotel.find({ status: 'approved' }).sort({ avgRating: -1, createdAt: -1 }).limit(8).lean();
    await attachPrices(hotels);
    res.json({ success: true, chosen, count: hotels.length, hotels });
  } catch (err) {
    next(err);
  }
};

// GET /hotels  — public list of APPROVED hotels with filters
export const getHotels = async (req, res, next) => {
  try {
    const { wilaya, city, place, type, minStars, q, sort } = req.query;

    const filter = { status: 'approved' };
    if (isCountry(req.query.country)) filter.country = req.query.country;
    if (wilaya) filter.wilaya = wilayaRegex(wilaya);
    const where = place && placeFilter(place); // undefined for blank input
    if (where) (filter.$and = filter.$and || []).push(where);
    if (city) filter.city = searchRegex(city);
    if (type) filter.type = type;
    if (num(minStars)) filter.starRating = { $gte: num(minStars) };
    if (q) filter.name = searchRegex(q);

    let query = Hotel.find(filter);

    // Sorting
    if (sort === 'rating') query = query.sort({ avgRating: -1 });
    else if (sort === 'newest') query = query.sort({ createdAt: -1 });
    else query = query.sort({ avgRating: -1, createdAt: -1 });

    const { page: pageNum, limit: lim } = paging(req.query);
    const total = await Hotel.countDocuments(filter);

    const hotels = await query
      .skip((pageNum - 1) * lim)
      .limit(lim)
      .lean();

    await attachPrices(hotels);

    res.json({
      success: true,
      count: hotels.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / lim),
      hotels,
    });
  } catch (err) {
    next(err);
  }
};

// GET /hotels/:id — public details (approved) or owner/admin can see own
export const getHotel = async (req, res, next) => {
  try {
    // public page: the owner's name only (their email/phone are not shown there and stay private)
    const hotel = await Hotel.findById(req.params.id).populate('owner', 'fullName');
    // Pending/rejected hotels are only visible to their owner and admins
    if (!hotel || !canView(req, hotel)) return res.status(404).json({ success: false, message: 'Hotel not found' });

    const rooms = await Room.find({ hotel: hotel._id, isActive: true });
    res.json({ success: true, hotel, rooms });
  } catch (err) {
    next(err);
  }
};

// GET /hotels/my/list — owner's own hotels
export const getMyHotels = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { owner: req.user._id };
    if (type) filter.type = type;
    const hotels = await Hotel.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: hotels.length, hotels });
  } catch (err) {
    next(err);
  }
};

// POST /hotels — owner creates a hotel (status: pending)
export const createHotel = async (req, res, next) => {
  try {
    // Room types offered (single, double…) can be sent with the hotel; validate before saving anything
    const { rooms: roomList, error: roomError } = parseRoomList(req.body.rooms);
    if (roomError) return res.status(400).json({ success: false, message: roomError });

    const images = req.files?.length ? await uploadMany(req.files, 'dzhotels/hotels') : [];

    const coordinates = parseCoordinates(req.body);
    const hotel = await Hotel.create({
      ...pick(req.body, EDITABLE),
      amenities: parseArray(req.body.amenities),
      suitableFor: parseArray(req.body.suitableFor),
      ...(parsePolicies(req.body.policies) && { policies: parsePolicies(req.body.policies) }),
      ...(coordinates && { coordinates }),
      owner: req.user._id,
      images,
      status: 'pending',
    });
    // create() (not insertMany) so each room's save hooks run (automatic translation)
    const rooms = roomList.length ? await Room.create(roomList.map((r) => ({ ...r, hotel: hotel._id }))) : [];

    res.status(201).json({ success: true, hotel, rooms });
  } catch (err) {
    next(err);
  }
};

// PUT /hotels/:id — owner edits own hotel
export const updateHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
    if (!isOwnerOrAdmin(req, hotel)) {
      return res.status(403).json({ success: false, message: 'Not your hotel' });
    }

    EDITABLE.forEach((f) => {
      if (req.body[f] !== undefined) hotel[f] = req.body[f];
    });
    if (req.body.amenities !== undefined) hotel.amenities = parseArray(req.body.amenities);
    if (req.body.suitableFor !== undefined) hotel.suitableFor = parseArray(req.body.suitableFor);
    const policies = parsePolicies(req.body.policies, hotel.policies);
    if (policies) hotel.policies = policies;
    const coordinates = parseCoordinates(req.body);
    if (coordinates) hotel.coordinates = coordinates;

    // Append newly uploaded images
    if (req.files?.length) {
      const uploaded = await uploadMany(req.files, 'dzhotels/hotels');
      hotel.images.push(...uploaded);
    }

    // Owner edits: an approved hotel stays online and is flagged for the admin; a rejected one goes back to review
    if (req.user.role !== 'admin') afterOwnerEdit(hotel);

    await hotel.save();
    res.json({ success: true, hotel });
  } catch (err) {
    next(err);
  }
};

// DELETE /hotels/:id — owner deletes own hotel (+ its rooms & images)
export const deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
    if (!isOwnerOrAdmin(req, hotel)) {
      return res.status(403).json({ success: false, message: 'Not your hotel' });
    }

    await Promise.all(hotel.images.map((img) => destroyImage(img.publicId)));
    await Room.deleteMany({ hotel: hotel._id });
    await hotel.deleteOne();

    res.json({ success: true, message: 'Hotel deleted' });
  } catch (err) {
    next(err);
  }
};

// --- helpers ---
function isOwnerOrAdmin(req, hotel) {
  return req.user.role === 'admin' || hotel.owner.toString() === req.user._id.toString();
}

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
