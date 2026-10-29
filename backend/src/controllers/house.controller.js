import { meskanContact } from '../utils/meskanContact.js';
import { parseDiscount } from '../utils/pricing.js';
import { paging, num } from '../utils/query.js';
import { parsePolicies } from '../utils/policies.js';
import { isCountry } from '../utils/countries.js';
import House, { periodFilter } from '../models/House.js';
import { uploadMany, destroyImage } from '../utils/cloudinaryUpload.js';
import { parseCoordinates } from '../utils/parseCoordinates.js';
import { searchRegex, wilayaRegex, placeFilter } from '../utils/searchRegex.js';
import { canView } from '../middlewares/auth.middleware.js';

// Fields an owner may set. Status, ratings and owner are server-controlled.
const EDITABLE = ['name', 'description', 'country', 'wilaya', 'city', 'address', 'type', 'starRating', 'rooms', 'bathrooms', 'capacity', 'rentalPeriod', 'pricePerNight', 'pricePerMonth', 'pricePerYear'];
const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// GET /houses — public list of APPROVED houses with filters
export const getHouses = async (req, res, next) => {
  try {
    const { wilaya, city, place, type, minPrice, maxPrice, q, sort } = req.query;

    const filter = { status: 'approved' };
    if (isCountry(req.query.country)) filter.country = req.query.country;
    if (wilaya) filter.wilaya = wilayaRegex(wilaya);
    const where = place && placeFilter(place); // undefined for blank input
    if (where) (filter.$and = filter.$and || []).push(where);
    if (city) filter.city = searchRegex(city);
    if (type) filter.type = type;
    // ?period=daily|monthly|yearly|monthly_yearly — the rentals page categories
    Object.assign(filter, periodFilter(req.query.period));
    if (q) filter.name = searchRegex(q);
    const lo = num(minPrice);
    const hi = num(maxPrice);
    if (lo !== undefined || hi !== undefined) {
      filter.pricePerNight = {};
      if (lo !== undefined) filter.pricePerNight.$gte = lo;
      if (hi !== undefined) filter.pricePerNight.$lte = hi;
    }

    let query = House.find(filter);

    if (sort === 'price_asc') query = query.sort({ pricePerNight: 1 });
    else if (sort === 'price_desc') query = query.sort({ pricePerNight: -1 });
    else if (sort === 'newest') query = query.sort({ createdAt: -1 });
    else query = query.sort({ avgRating: -1, createdAt: -1 });

    const { page: pageNum, limit: lim } = paging(req.query);
    const total = await House.countDocuments(filter);

    const houses = await query
      .skip((pageNum - 1) * lim)
      .limit(lim)
      .lean();

    res.json({
      success: true,
      count: houses.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / lim),
      houses,
    });
  } catch (err) {
    next(err);
  }
};

// GET /houses/:id — public details
export const getHouse = async (req, res, next) => {
  try {
    // no owner name or contact: Meskan is the intermediary between guests and owners (its contact comes along)
    const house = await House.findById(req.params.id);
    // Pending/rejected houses are only visible to their owner and admins
    if (!house || !canView(req, house)) return res.status(404).json({ success: false, message: 'House not found' });
    res.json({ success: true, house, contact: await meskanContact() });
  } catch (err) {
    next(err);
  }
};

// GET /houses/my/list — owner's own houses
export const getMyHouses = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { owner: req.user._id };
    if (type) filter.type = type;
    // ?period=daily|monthly|yearly|monthly_yearly — the rentals page categories
    Object.assign(filter, periodFilter(req.query.period));
    const houses = await House.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: houses.length, houses });
  } catch (err) {
    next(err);
  }
};

// POST /houses — owner creates a house (status: pending)
export const createHouse = async (req, res, next) => {
  try {
    const images = req.files?.length ? await uploadMany(req.files, 'dzhotels/houses') : [];

    const coordinates = parseCoordinates(req.body);
    const house = await House.create({
      ...pick(req.body, EDITABLE),
      amenities: parseArray(req.body.amenities),
      suitableFor: parseArray(req.body.suitableFor),
      ...(parsePolicies(req.body.policies) && { policies: parsePolicies(req.body.policies) }),
      ...parseDiscount(req.body),
      ...(coordinates && { coordinates }),
      owner: req.user._id,
      images,
      status: 'pending',
    });

    res.status(201).json({ success: true, house });
  } catch (err) {
    next(err);
  }
};

// PUT /houses/:id — owner edits own house
export const updateHouse = async (req, res, next) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ success: false, message: 'House not found' });
    if (!isOwnerOrAdmin(req, house)) {
      return res.status(403).json({ success: false, message: 'Not your house' });
    }

    EDITABLE.forEach((f) => {
      if (req.body[f] !== undefined) house[f] = req.body[f];
    });
    if (req.body.amenities !== undefined) house.amenities = parseArray(req.body.amenities);
    if (req.body.suitableFor !== undefined) house.suitableFor = parseArray(req.body.suitableFor);
    const policies = parsePolicies(req.body.policies, house.policies);
    if (policies) house.policies = policies;
    Object.assign(house, parseDiscount(req.body));
    const coordinates = parseCoordinates(req.body);
    if (coordinates) house.coordinates = coordinates;

    if (req.files?.length) {
      const uploaded = await uploadMany(req.files, 'dzhotels/houses');
      house.images.push(...uploaded);
    }

    if (house.status === 'approved') house.status = 'pending';

    await house.save();
    res.json({ success: true, house });
  } catch (err) {
    next(err);
  }
};

// DELETE /houses/:id — owner deletes own house
export const deleteHouse = async (req, res, next) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ success: false, message: 'House not found' });
    if (!isOwnerOrAdmin(req, house)) {
      return res.status(403).json({ success: false, message: 'Not your house' });
    }

    await Promise.all(house.images.map((img) => destroyImage(img.publicId)));
    await house.deleteOne();

    res.json({ success: true, message: 'House deleted' });
  } catch (err) {
    next(err);
  }
};

// --- helpers ---
function isOwnerOrAdmin(req, house) {
  return req.user.role === 'admin' || house.owner.toString() === req.user._id.toString();
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
