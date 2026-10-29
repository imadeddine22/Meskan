import { meskanContact } from '../utils/meskanContact.js';
import { isCountry } from '../utils/countries.js';
import { paging, num } from '../utils/query.js';
import HouseForSale from '../models/HouseForSale.js';
import { searchRegex, wilayaRegex, placeFilter } from '../utils/searchRegex.js';
import { canView } from '../middlewares/auth.middleware.js';

// GET /sales — public list of APPROVED sale listings with filters
export const getListings = async (req, res, next) => {
  try {
    const { wilaya, city, place, type, minPrice, maxPrice, priceRanges, reference, q, sort, order = 'desc' } = req.query;

    const filter = { status: 'approved' };
    if (isCountry(req.query.country)) filter.country = req.query.country;
    if (wilaya) filter.wilaya = wilayaRegex(wilaya);
    const where = place && placeFilter(place); // undefined for blank input
    if (where) (filter.$and = filter.$and || []).push(where);
    if (city) filter.city = searchRegex(city);
    if (type && type !== 'Tous') filter.type = type;
    // Rooms like Algerian "F" sizes: rooms=3 → exactly 3 (F3), rooms=5+ → 5 or more
    if (req.query.rooms) {
      const r = String(req.query.rooms);
      const n = parseInt(r, 10);
      if (Number.isInteger(n) && n > 0) filter.rooms = r.endsWith('+') ? { $gte: n } : n;
    }
    const minArea = Number(req.query.minArea);
    const maxArea = Number(req.query.maxArea);
    if (minArea > 0 || maxArea > 0) {
      filter.area = {};
      if (minArea > 0) filter.area.$gte = minArea;
      if (maxArea > 0) filter.area.$lte = maxArea;
    }
    if (reference) filter.reference = searchRegex(reference);
    if (q) {
      const rx = searchRegex(q);
      filter.$or = [{ title: rx }, { reference: rx }];
    }

    // Handle price range filters
    const priceConditions = [];
    const lo = num(minPrice);
    const hi = num(maxPrice);
    if (lo !== undefined || hi !== undefined) {
      const cond = {};
      if (lo !== undefined) cond.$gte = lo;
      if (hi !== undefined) cond.$lte = hi;
      priceConditions.push({ price: cond });
    }

    if (priceRanges) {
      // "min-max" strings, comma-separated or repeated (anything else, e.g. ?priceRanges[x]=…, is ignored)
      const ranges = [].concat(priceRanges).filter((r) => typeof r === 'string').flatMap((r) => r.split(','));
      ranges.forEach(r => {
        const parts = r.split('-');
        if (parts.length === 2) {
          const min = Number(parts[0].trim());
          const max = Number(parts[1].trim());
          if (!isNaN(min) && !isNaN(max)) {
            priceConditions.push({ price: { $gte: min, $lte: max } });
          }
        }
      });
    }

    if (priceConditions.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: priceConditions });
    }

    let sortObj = {};
    if (sort === 'price_asc') {
      sortObj = { price: 1 };
    } else if (sort === 'price_desc') {
      sortObj = { price: -1 };
    } else if (sort === 'newest') {
      sortObj = { createdAt: -1 };
    } else if (sort === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sort === 'updatedAt_asc') {
      sortObj = { updatedAt: 1 };
    } else if (sort === 'updatedAt_desc') {
      sortObj = { updatedAt: -1 };
    } else if (sort === 'updatedAt') {
      sortObj = { updatedAt: order === 'asc' ? 1 : -1 };
    } else if (sort === 'price') {
      sortObj = { price: order === 'asc' ? 1 : -1 };
    } else {
      sortObj = { updatedAt: -1 };
    }

    let query = HouseForSale.find(filter).sort(sortObj);

    const { page: pageNum, limit: lim } = paging(req.query);
    const total = await HouseForSale.countDocuments(filter);

    const listings = await query
      .skip((pageNum - 1) * lim)
      .limit(lim)
      .lean();

    res.json({
      success: true,
      count: listings.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / lim),
      listings,
      contact: await meskanContact(), // buyers call Meskan, never the seller
    });
  } catch (err) {
    next(err);
  }
};

// GET /sales/:id — public details (increments view count)
export const getListing = async (req, res, next) => {
  try {
    // no seller name or contact: Meskan is the intermediary between buyers and sellers (its contact comes along)
    const listing = await HouseForSale.findById(req.params.id);
    // Pending/rejected listings are only visible to their seller and admins
    if (!listing || !canView(req, listing, 'seller')) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    // Count public views only; ?noview=1 lets server-side renderers (SEO metadata) read without inflating them
    if (listing.status === 'approved' && !req.query.noview) {
      await HouseForSale.updateOne({ _id: listing._id }, { $inc: { views: 1 } });
      listing.views += 1;
    }

    res.json({ success: true, listing, contact: await meskanContact() });
  } catch (err) {
    next(err);
  }
};
