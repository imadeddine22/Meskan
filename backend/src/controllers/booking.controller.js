import { effectivePrice } from '../utils/pricing.js';
import Booking from '../models/Booking.js';
import { DEFAULT_POLICIES, freeCancellationDeadline } from '../utils/policies.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';
import House from '../models/House.js';
import { countOverlapping, countOverlappingHouse, isBookingStillAvailable, lostRace } from '../utils/checkAvailability.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { sendEmail } from '../utils/sendEmail.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MAX_NIGHTS = 365;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-DZ');
const fmtDZD = (n, currency = 'DZD') => `${Number(n || 0).toLocaleString('fr-DZ')} ${currency}`;

/** Fire-and-forget email: a missing/failed SMTP must never break the booking flow. */
const notify = (to, subject, html) =>
  to && sendEmail({ to, subject, html }).catch((e) => console.error('Email failed:', e.message));

/** The owner never gets the guest's phone or email (Meskan is the intermediary); admins do. */
const withoutGuestContact = (booking, req) => {
  if (req.user.role === 'admin') return booking;
  const b = booking.toObject ? booking.toObject() : { ...booking };
  if (b.customer && typeof b.customer === 'object') b.customer = { _id: b.customer._id, fullName: b.customer.fullName };
  return b;
};

/** Load a booking with its property (+owner) and customer for owner/admin actions. */
const loadForOwner = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({ path: 'hotel', select: 'name owner', populate: { path: 'owner', select: 'email fullName' } })
    .populate({ path: 'house', select: 'name owner', populate: { path: 'owner', select: 'email fullName' } })
    .populate('room', 'title')
    .populate('customer', 'email fullName phone');
  if (!booking) {
    res.status(404).json({ success: false, message: 'Booking not found' });
    return null;
  }
  const property = booking.propertyType === 'house' ? booking.house : booking.hotel;
  const isOwner = String(property?.owner?._id || property?.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Not your property' });
    return null;
  }
  return { booking, property };
};

/** Tell the owner a new request is waiting for an answer. */
const notifyOwnerOfRequest = async (booking) => {
  const Model = booking.propertyType === 'house' ? House : Hotel;
  const property = await Model.findById(booking.house || booking.hotel).populate('owner', 'email fullName');
  notify(
    property?.owner?.email,
    `Nouvelle demande de réservation — ${property?.name}`,
    `<p>Bonjour ${escapeHtml(property?.owner?.fullName || '')},</p>
     <p>Vous avez reçu une demande de réservation pour <strong>${escapeHtml(property?.name)}</strong>
     du ${fmtDate(booking.checkIn)} au ${fmtDate(booking.checkOut)} (${booking.nights} nuit(s), ${fmtDZD(booking.totalPrice, booking.currency)}).</p>
     <p><a href="${CLIENT_URL}/owner/bookings">Accepter ou refuser la demande</a> — sans réponse sous 48 h, les dates sont libérées.</p>`
  );
};

/** Status and cancellation terms of a new booking, from the property's policies. */
const bookingTerms = (property, checkIn) => {
  const p = { ...DEFAULT_POLICIES, ...(property?.policies?.toObject ? property.policies.toObject() : property?.policies) };
  return {
    status: p.instantBooking ? 'confirmed' : 'pending',
    instant: Boolean(p.instantBooking),
    freeCancellationUntil: freeCancellationDeadline(checkIn, p.freeCancellationDays),
  };
};

/** New booking: a request waits for the owner; an instant booking is confirmed to both sides. */
const announceBooking = async (booking) => {
  if (!booking.instant) return notifyOwnerOfRequest(booking);
  const Model = booking.propertyType === 'house' ? House : Hotel;
  const [property, full] = await Promise.all([
    Model.findById(booking.house || booking.hotel).populate('owner', 'email fullName'),
    Booking.findById(booking._id).populate('customer', 'email fullName'),
  ]);
  const when = `du ${fmtDate(booking.checkIn)} au ${fmtDate(booking.checkOut)} (${booking.nights} nuit(s), ${fmtDZD(booking.totalPrice, booking.currency)})`;
  notify(
    property?.owner?.email,
    `Nouvelle réservation confirmée — ${property?.name}`,
    `<p>Bonjour ${escapeHtml(property?.owner?.fullName || '')},</p>
     <p>Réservation instantanée pour <strong>${escapeHtml(property?.name)}</strong> ${when}. Elle est déjà confirmée ; le paiement se fait sur place à l'arrivée.</p>
     <p><a href="${CLIENT_URL}/owner/bookings">Voir la réservation</a></p>`
  );
  notify(
    full?.customer?.email,
    `✅ Réservation confirmée — ${property?.name}`,
    `<p>Bonjour ${escapeHtml(full?.customer?.fullName || '')},</p>
     <p>Votre réservation à <strong>${escapeHtml(property?.name)}</strong> ${when} est confirmée. Montant à régler sur place à l'arrivée.</p>
     <p><a href="${CLIENT_URL}/my-bookings">Voir mes réservations</a></p>`
  );
};

// POST /bookings  (customer) — hotel room booking
export const createBooking = async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut, guests = 1 } = req.body;

    const room = await Room.findById(roomId).populate('hotel', 'name status currency policies');
    if (!room || !room.isActive) {
      return res.status(404).json({ success: false, message: 'Room not available' });
    }
    if (room.hotel.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Hotel is not available for booking' });
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ success: false, message: 'Invalid dates' });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'checkOut must be after checkIn' });
    }
    if (start < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({ success: false, message: 'checkIn cannot be in the past' });
    }
    if (end - start > MAX_NIGHTS * MS_PER_DAY) {
      return res.status(400).json({ success: false, message: 'A stay cannot exceed 365 nights' });
    }
    if (guests > room.capacity) {
      return res.status(400).json({ success: false, message: `Room capacity is ${room.capacity} guests` });
    }

    // Availability check
    const booked = await countOverlapping(room._id, start, end);
    if (booked >= room.quantity) {
      return res.status(409).json({ success: false, message: 'No rooms available for these dates' });
    }

    const nights = Math.round((end - start) / MS_PER_DAY);
    const deal = effectivePrice(room);
    const totalPrice = nights * deal.price;

    const booking = await Booking.create({
      customer: req.user._id,
      propertyType: 'hotel',
      hotel: room.hotel._id,
      room: room._id,
      checkIn: start,
      checkOut: end,
      nights,
      guests,
      totalPrice,
      discountPercent: deal.discountPercent,
      currency: room.hotel.currency || 'DZD',
      ...bookingTerms(room.hotel, start),
      paymentStatus: 'unpaid',
    });
    // simultaneous requests for the last unit(s): only the earliest ones are kept
    if (await lostRace(booking, room.quantity)) {
      await booking.deleteOne();
      return res.status(409).json({ success: false, message: 'No rooms available for these dates' });
    }

    announceBooking(booking).catch(() => {});
    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

// POST /bookings/house  (customer) — house booking
export const createHouseBooking = async (req, res, next) => {
  try {
    const { houseId, checkIn, checkOut, guests = 1 } = req.body;

    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ success: false, message: 'House not found' });
    }
    if (house.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'House is not available for booking' });
    }
    // monthly / yearly rentals are arranged through Meskan, not booked night by night
    if (house.rentalPeriod && house.rentalPeriod !== 'daily') {
      return res.status(400).json({ success: false, message: 'This house is rented by the month or the year: contact Meskan to rent it' });
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ success: false, message: 'Invalid dates' });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'checkOut must be after checkIn' });
    }
    if (start < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({ success: false, message: 'checkIn cannot be in the past' });
    }
    if (end - start > MAX_NIGHTS * MS_PER_DAY) {
      return res.status(400).json({ success: false, message: 'A stay cannot exceed 365 nights' });
    }
    if (guests > house.capacity) {
      return res.status(400).json({ success: false, message: `House capacity is ${house.capacity} guests` });
    }

    // A house is a single unit — only 1 booking at a time
    const overlap = await countOverlappingHouse(house._id, start, end);
    if (overlap > 0) {
      return res.status(409).json({ success: false, message: 'House is not available for these dates' });
    }

    const nights = Math.round((end - start) / MS_PER_DAY);
    const deal = effectivePrice(house);
    const totalPrice = nights * deal.price;

    const booking = await Booking.create({
      customer: req.user._id,
      propertyType: 'house',
      house: house._id,
      checkIn: start,
      checkOut: end,
      nights,
      guests,
      totalPrice,
      discountPercent: deal.discountPercent,
      currency: house.currency || 'DZD',
      ...bookingTerms(house, start),
      paymentStatus: 'unpaid',
    });
    // simultaneous requests for the same dates: only the earliest one is kept
    if (await lostRace(booking, 1)) {
      await booking.deleteOne();
      return res.status(409).json({ success: false, message: 'House is not available for these dates' });
    }

    announceBooking(booking).catch(() => {});
    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

// GET /bookings/my  (customer)
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate('hotel', 'name wilaya city images')
      .populate('room', 'title type pricePerNight')
      .populate('house', 'name wilaya city images pricePerNight type')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};

// GET /bookings/owner  (owner) — bookings on the owner's hotels & houses
export const getOwnerBookings = async (req, res, next) => {
  try {
    const hotelIds = await Hotel.find({ owner: req.user._id }).distinct('_id');
    const houseIds = await House.find({ owner: req.user._id }).distinct('_id');

    const bookings = await Booking.find({
      $or: [
        { hotel: { $in: hotelIds } },
        { house: { $in: houseIds } },
      ],
    })
      .populate('hotel', 'name wilaya city')
      .populate('room', 'title type')
      .populate('house', 'name wilaya city type')
      .populate('customer', 'fullName') // no guest phone or email: Meskan is the intermediary
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};

// PUT /bookings/:id/cancel
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('hotel', 'owner')
      .populate('house', 'owner');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isCustomer = booking.customer.toString() === req.user._id.toString();
    const ownerRef = booking.propertyType === 'house' ? booking.house : booking.hotel;
    const isOwner = ownerRef?.owner?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isCustomer && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (['cancelled', 'completed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Booking already ${booking.status}` });
    }
    // A stay that has already started can't be cancelled (and marked refunded) by the customer or owner
    if (!isAdmin && new Date(booking.checkIn) <= new Date()) {
      return res.status(400).json({ success: false, message: 'This stay has already started and can no longer be cancelled' });
    }

    booking.status = 'cancelled';
    booking.cancelledBy = isAdmin ? 'admin' : isCustomer ? 'customer' : 'owner';
    booking.lateCancellation = isCustomer && !isAdmin && (!booking.freeCancellationUntil || new Date() > booking.freeCancellationUntil);
    if (booking.paymentStatus === 'paid') booking.paymentStatus = 'refunded';
    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

// ── Owner actions ───────────────────────────────────────────────
// Bookings are requests: the owner accepts or refuses them, and marks them
// paid once the guest has paid on site (there is no online payment).

// PUT /bookings/:id/confirm  (owner of the property / admin)
export const confirmBooking = async (req, res, next) => {
  try {
    const loaded = await loadForOwner(req, res);
    if (!loaded) return;
    const { booking, property } = loaded;

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking is ${booking.status}, not pending` });
    }
    if (new Date(booking.checkIn) < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({ success: false, message: 'This request is for dates that have already passed' });
    }
    // An unanswered request stops holding its dates after 48 h — make sure they are still free
    if (!(await isBookingStillAvailable(booking, Room))) {
      return res.status(409).json({ success: false, message: 'These dates are no longer available' });
    }

    booking.status = 'confirmed';
    await booking.save();

    notify(
      booking.customer?.email,
      `✅ Réservation confirmée — ${property?.name}`,
      `<p>Bonjour ${escapeHtml(booking.customer?.fullName || '')},</p>
       <p>Votre réservation à <strong>${escapeHtml(property?.name)}</strong> du ${fmtDate(booking.checkIn)} au ${fmtDate(booking.checkOut)}
       est confirmée. Montant à régler sur place à l'arrivée : <strong>${fmtDZD(booking.totalPrice, booking.currency)}</strong>.</p>
       <p><a href="${CLIENT_URL}/my-bookings">Voir mes réservations</a></p>`
    );
    res.json({ success: true, booking: withoutGuestContact(booking, req) });
  } catch (err) {
    next(err);
  }
};

// PUT /bookings/:id/reject  { reason }  (owner of the property / admin)
export const rejectBooking = async (req, res, next) => {
  try {
    const loaded = await loadForOwner(req, res);
    if (!loaded) return;
    const { booking, property } = loaded;

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking is ${booking.status}, not pending` });
    }
    booking.status = 'cancelled';
    booking.rejectionReason = String(req.body?.reason || '').trim().slice(0, 500);
    await booking.save();

    notify(
      booking.customer?.email,
      `Demande de réservation refusée — ${property?.name}`,
      `<p>Bonjour ${escapeHtml(booking.customer?.fullName || '')},</p>
       <p>Votre demande pour <strong>${escapeHtml(property?.name)}</strong> du ${fmtDate(booking.checkIn)} au ${fmtDate(booking.checkOut)}
       n'a pas pu être acceptée.${booking.rejectionReason ? ` Motif : ${escapeHtml(booking.rejectionReason)}` : ''}</p>
       <p><a href="${CLIENT_URL}/hotels">Trouver un autre hébergement</a></p>`
    );
    res.json({ success: true, booking: withoutGuestContact(booking, req) });
  } catch (err) {
    next(err);
  }
};

// PUT /bookings/:id/paid  (owner of the property / admin) — guest paid on site
export const markBookingPaid = async (req, res, next) => {
  try {
    const loaded = await loadForOwner(req, res);
    if (!loaded) return;
    const { booking } = loaded;

    if (!['confirmed', 'completed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Only a confirmed booking can be marked as paid' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }
    booking.paymentStatus = 'paid';
    booking.paidAt = new Date();
    await booking.save();
    res.json({ success: true, booking: withoutGuestContact(booking, req) });
  } catch (err) {
    next(err);
  }
};
