import { parseDiscount } from '../utils/pricing.js';
import { paging } from '../utils/query.js';
import { parsePolicies } from '../utils/policies.js';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import House from '../models/House.js';
import HouseForSale from '../models/HouseForSale.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import { uploadMany } from '../utils/cloudinaryUpload.js';
import { parseCoordinates } from '../utils/parseCoordinates.js';

// GET /admin/hotels/pending
export const getPendingHotels = async (req, res, next) => {
  try {
    const hotels = await Hotel.find({ status: 'pending' })
      .populate('owner', 'fullName email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: hotels.length, hotels });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/hotels/:id/approve
export const approveHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: '' },
      { new: true }
    );
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
    res.json({ success: true, hotel });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/hotels/:id/reject
export const rejectHotel = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason || '' },
      { new: true }
    );
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
    res.json({ success: true, hotel });
  } catch (err) {
    next(err);
  }
};

// GET /admin/users
export const getUsers = async (req, res, next) => {
  try {
    const { role, q } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (q) filter.$or = [{ fullName: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/users/:id/block  — toggles blocked state
export const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot block an admin' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ success: true, user: { _id: user._id, isBlocked: user.isBlocked } });
  } catch (err) {
    next(err);
  }
};

// GET /admin/stats  — enhanced with chart data
export const getStats = async (req, res, next) => {
  try {
    const [users, owners, sellers, investors, hotels, pendingHotels, bookings, paidPayments, reviews, houses, pendingHouses, sales, pendingSales] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: 'investor' }),
      Hotel.countDocuments({ status: 'approved' }),
      Hotel.countDocuments({ status: 'pending' }),
      Booking.countDocuments(),
      // Revenue = bookings the owners marked as paid on site
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        // one total per currency: dinars and dirhams are never added together
        { $group: { _id: { $ifNull: ['$currency', 'DZD'] }, total: { $sum: '$totalPrice' } } },
      ]),
      Review.countDocuments(),
      House.countDocuments({ status: 'approved' }),
      House.countDocuments({ status: 'pending' }),
      HouseForSale.countDocuments({ status: 'approved' }),
      HouseForSale.countDocuments({ status: 'pending' }),
    ]);

    // Monthly revenue for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Grouped by payment date (older paid bookings have no paidAt → fall back to updatedAt)
    const monthlyRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'paid', currency: { $in: ['DZD', null] } } }, // chart in DZD
      { $addFields: { paidOn: { $ifNull: ['$paidAt', '$updatedAt'] } } },
      { $match: { paidOn: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$paidOn' }, month: { $month: '$paidOn' } },
          total: { $sum: '$totalPrice' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Monthly bookings for the last 6 months
    const monthlyBookings = await Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Monthly new users
    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Booking status distribution
    const bookingsByStatus = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Hotels by type
    const hotelsByType = await Hotel.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      stats: {
        users,
        owners,
        sellers,
        investors,
        hotels,
        pendingHotels,
        houses,
        pendingHouses,
        sales,
        pendingSales,
        bookings,
        reviews,
        revenue: paidPayments.find((r) => r._id === 'DZD')?.total || 0,
        revenueByCurrency: Object.fromEntries(paidPayments.map((r) => [r._id, r.total])),
        charts: {
          monthlyRevenue,
          monthlyBookings,
          monthlyUsers,
          bookingsByStatus,
          hotelsByType,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/bookings — all bookings with filtering
export const getBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const { limit, skip } = paging(req.query, { def: 20, max: 100 });
    const [bookingsData, total] = await Promise.all([
      Booking.find(filter)
        .populate('customer', 'fullName email')
        .populate('hotel', 'name wilaya city')
        .populate('room', 'title type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: bookingsData.length,
      total,
      pages: Math.ceil(total / limit),
      bookings: bookingsData,
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/hotels/all — all hotels with filtering
export const getAllHotels = async (req, res, next) => {
  try {
    const { status, q, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (q) filter.name = new RegExp(q, 'i');

    const { limit, skip } = paging(req.query, { def: 20, max: 100 });
    const [hotelsData, total] = await Promise.all([
      Hotel.find(filter)
        .populate('owner', 'fullName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Hotel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: hotelsData.length,
      total,
      pages: Math.ceil(total / limit),
      hotels: hotelsData,
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/recent-activity — recent bookings + registrations
export const getRecentActivity = async (req, res, next) => {
  try {
    const [recentBookings, recentUsers] = await Promise.all([
      Booking.find()
        .populate('customer', 'fullName email avatar')
        .populate('hotel', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.json({ success: true, recentBookings, recentUsers });
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/users/:id — delete a user
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete an admin' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /admin/hotels — admin creates a hotel directly (status: approved)
export const deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
    // Orphan rooms would still be bookable and crash on room.hotel.status
    await Room.deleteMany({ hotel: hotel._id });
    res.json({ success: true, message: 'Hotel deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /admin/hotels — admin creates a hotel directly (status: approved)
export const createHotelByAdmin = async (req, res, next) => {
  try {
    const images = req.files?.length ? await uploadMany(req.files, 'dzhotels/hotels') : [];

    const coordinates = parseCoordinates(req.body);
    const hotel = await Hotel.create({
      ...req.body,
      policies: parsePolicies(req.body.policies),
      amenities: parseArray(req.body.amenities),
      ...(coordinates && { coordinates }),
      owner: req.body.owner || req.user._id,
      images,
      status: req.body.status || 'approved',
    });

    res.status(201).json({ success: true, hotel });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/hotels/:id — admin updates a hotel
export const updateHotelByAdmin = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });

    const fields = ['name', 'description', 'country', 'wilaya', 'city', 'address', 'type', 'starRating', 'status'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) hotel[f] = req.body[f];
    });
    if (req.body.amenities !== undefined) hotel.amenities = parseArray(req.body.amenities);
    const hotelPolicies = parsePolicies(req.body.policies, hotel.policies);
    if (hotelPolicies) hotel.policies = hotelPolicies;
    const hotelCoords = parseCoordinates(req.body);
    if (hotelCoords) hotel.coordinates = hotelCoords;

    if (req.files?.length) {
      const uploaded = await uploadMany(req.files, 'dzhotels/hotels');
      hotel.images.push(...uploaded);
    }

    await hotel.save();
    res.json({ success: true, hotel });
  } catch (err) {
    next(err);
  }
};

// ============ HOUSES ============

// GET /admin/houses/all — all houses with filtering
export const getAllHouses = async (req, res, next) => {
  try {
    const { status, q, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (q) filter.name = new RegExp(q, 'i');

    const { limit, skip } = paging(req.query, { def: 20, max: 100 });
    const [housesData, total] = await Promise.all([
      House.find(filter)
        .populate('owner', 'fullName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      House.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: housesData.length,
      total,
      pages: Math.ceil(total / limit),
      houses: housesData,
    });
  } catch (err) {
    next(err);
  }
};

// POST /admin/houses — admin creates a house directly
export const createHouseByAdmin = async (req, res, next) => {
  try {
    const images = req.files?.length ? await uploadMany(req.files, 'dzhotels/houses') : [];

    const coordinates = parseCoordinates(req.body);
    const house = await House.create({
      ...req.body,
      policies: parsePolicies(req.body.policies),
      ...parseDiscount(req.body),
      amenities: parseArray(req.body.amenities),
      ...(coordinates && { coordinates }),
      owner: req.body.owner || req.user._id,
      images,
      status: req.body.status || 'approved',
    });

    res.status(201).json({ success: true, house });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/houses/:id — admin updates a house
export const updateHouseByAdmin = async (req, res, next) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ success: false, message: 'House not found' });

    const fields = ['name', 'description', 'country', 'wilaya', 'city', 'address', 'type', 'rooms', 'bathrooms', 'capacity', 'pricePerNight', 'status'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) house[f] = req.body[f];
    });
    if (req.body.amenities !== undefined) house.amenities = parseArray(req.body.amenities);
    const housePolicies = parsePolicies(req.body.policies, house.policies);
    if (housePolicies) house.policies = housePolicies;
    Object.assign(house, parseDiscount(req.body));
    const houseCoords = parseCoordinates(req.body);
    if (houseCoords) house.coordinates = houseCoords;

    if (req.files?.length) {
      const uploaded = await uploadMany(req.files, 'dzhotels/houses');
      house.images.push(...uploaded);
    }

    await house.save();
    res.json({ success: true, house });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/houses/:id/approve
export const approveHouse = async (req, res, next) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: '' },
      { new: true }
    );
    if (!house) return res.status(404).json({ success: false, message: 'House not found' });
    res.json({ success: true, house });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/houses/:id/reject
export const rejectHouse = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason || '' },
      { new: true }
    );
    if (!house) return res.status(404).json({ success: false, message: 'House not found' });
    res.json({ success: true, house });
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/houses/:id — delete a house
export const deleteHouse = async (req, res, next) => {
  try {
    const house = await House.findByIdAndDelete(req.params.id);
    if (!house) return res.status(404).json({ success: false, message: 'House not found' });
    res.json({ success: true, message: 'House deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ============ SALES (HouseForSale) ============

// GET /admin/sales/all — all sale listings with filtering
export const getAllSales = async (req, res, next) => {
  try {
    const { status, q, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (q) filter.title = new RegExp(q, 'i');

    const { limit, skip } = paging(req.query, { def: 20, max: 100 });
    const [salesData, total] = await Promise.all([
      HouseForSale.find(filter)
        .select('+contactPhone +contactEmail')
        .populate('seller', 'fullName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      HouseForSale.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: salesData.length,
      total,
      pages: Math.ceil(total / limit),
      sales: salesData,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/sales/:id/approve
export const approveSale = async (req, res, next) => {
  try {
    const sale = await HouseForSale.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: '' },
      { new: true }
    );
    if (!sale) return res.status(404).json({ success: false, message: 'Sale listing not found' });
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/sales/:id/reject
export const rejectSale = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const sale = await HouseForSale.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason || '' },
      { new: true }
    );
    if (!sale) return res.status(404).json({ success: false, message: 'Sale listing not found' });
    res.json({ success: true, sale });
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/sales/:id — delete a sale listing
export const deleteSale = async (req, res, next) => {
  try {
    const sale = await HouseForSale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale listing not found' });
    res.json({ success: true, message: 'Sale listing deleted successfully' });
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
