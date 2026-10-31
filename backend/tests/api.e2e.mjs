/**
 * End-to-end API tests for every role: visitor, customer, hotel/house owner, seller, admin.
 *
 * Run against the in-memory demo server (never against production — it creates and deletes data):
 *   SMTP_HOST= RATE_LIMIT_MAX=5000 npm run dev:local   # terminal 1 (the suite sends several hundred requests)
 *   node tests/api.e2e.mjs              # terminal 2   (API_URL defaults to http://localhost:5000/api/v1)
 *
 */
const API = process.env.API_URL || 'http://localhost:5000/api/v1';
if (/onrender\.com|vercel\.app/.test(API)) {
  console.error('Refusing to run destructive e2e tests against a deployed API.');
  process.exit(1);
}

let passed = 0;
const failures = [];
let section = '';

const describe = (name) => {
  section = name;
  console.log(`\n▸ ${name}`);
};

function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`[${section}] ${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = new FormData();
    for (const [k, v] of Object.entries(form)) {
      if (k === 'images' || k === 'documents') v.forEach((blob, i) => payload.append(k, blob, `img${i}.png`));
      else payload.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, data: data || {} };
}

const expectStatus = (name, r, status) =>
  check(name, r.status === status, `expected ${status}, got ${r.status} ${r.data?.message || ''}`);

// 1×1 transparent PNG
const PNG = new Blob(
  [Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')],
  { type: 'image/png' }
);

const day = (offset) => {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const uid = Date.now().toString(36);

async function login(email, password) {
  const r = await req('POST', '/auth/login', { body: { email, password } });
  return r.data.token;
}

async function register(role, extra = {}) {
  const email = `${role}.${uid}.${Math.random().toString(36).slice(2, 6)}@test.dz`;
  const r = await req('POST', '/auth/register', {
    body: { fullName: `Test ${role}`, email, password: 'secret123', phone: '0555000000', role, ...extra },
  });
  return { email, token: r.data.token, user: r.data.user, status: r.status };
}

// ───────────────────────────────────────────────────────────────
describe('Visitor (public pages)');
{
  expectStatus('health check', await req('GET', '/health'), 200);

  const hotels = await req('GET', '/hotels?limit=50');
  expectStatus('list hotels', hotels, 200);
  check('only approved hotels are listed', hotels.data.hotels?.every((h) => h.status === 'approved'));

  const houses = await req('GET', '/houses?limit=50');
  check('only approved houses are listed', houses.data.houses?.every((h) => h.status === 'approved'));

  const w = await req('GET', '/wilayas');
  check('69 official wilayas are available', (w.data.wilayas || []).filter((x) => x.code >= 1 && x.code <= 69).length === 69, `got ${w.data.wilayas?.length}`);
  check('wilayas have Arabic names', w.data.wilayas?.find((x) => x.code === 6)?.arabic === 'بجاية');

  const communes = await req('GET', '/wilayas/16/communes');
  check('communes of Alger', communes.data.count === 57, `got ${communes.data.count}`);

  const accent = await req('GET', `/hotels?wilaya=${encodeURIComponent('Bejaia')}`);
  const accented = await req('GET', `/hotels?wilaya=${encodeURIComponent('Béjaïa')}`);
  check('wilaya filter ignores accents', accent.data.total === accented.data.total);

  // Home search "place" = wilaya OR commune, accent-insensitive
  const byWilaya = await req('GET', `/houses?place=${encodeURIComponent('bejaia')}`);
  check('place search matches a wilaya without accents', byWilaya.data.total >= 1 && byWilaya.data.houses.every((h) => h.wilaya === 'Béjaïa' || /b[eé]ja[iï]a/i.test(h.city)));
  const anyHouse = (await req('GET', '/houses?limit=1')).data.houses[0];
  const byCity = await req('GET', `/houses?place=${encodeURIComponent(anyHouse.city)}`);
  check('place search matches a commune/city', byCity.data.houses.some((h) => h._id === anyHouse._id));
  expectStatus('blank place is ignored', await req('GET', '/hotels?place=%20%20'), 200);
  expectStatus('regex characters in place do not crash', await req('GET', `/hotels?place=${encodeURIComponent('(*[')}`), 200);

  expectStatus('pricing settings are public', await req('GET', '/pricing/prices'), 200);
  expectStatus('invalid hotel id → 404/400, not 500', { status: [400, 404].includes((await req('GET', '/hotels/not-an-id')).status) ? 404 : 500, data: {} }, 404);
  expectStatus('regex metacharacters in search do not crash', await req('GET', `/hotels?q=${encodeURIComponent('(*[')}`), 200);

  expectStatus('contact form', await req('POST', '/messages', { body: { name: 'Test', email: 'v@test.dz', phone: '0555 12 34 56', subject: 'Question', content: 'Bonjour' } }), 201);
  expectStatus('contact form: phone number required', await req('POST', '/messages', { body: { name: 'Test', email: 'v@test.dz', subject: 'Question', content: 'Bonjour' } }), 400);
  for (const bad of ['123', 'abc12345678', '+213-------'])
    expectStatus(`contact form: phone "${bad}" rejected`, await req('POST', '/messages', { body: { name: 'Test', email: 'v@test.dz', phone: bad, subject: 'Question', content: 'Bonjour' } }), 400);
  expectStatus('contact form: international phone accepted', await req('POST', '/messages', { body: { name: 'Test', email: 'v@test.dz', phone: '+213 (21) 45-67-89', subject: 'Question', content: 'Bonjour' } }), 201);
  expectStatus('contact form validates fields', await req('POST', '/messages', { body: { name: 'Test' } }), 400);
}

// ───────────────────────────────────────────────────────────────
describe('Authentication');
const customer = await register('customer');
const customer2 = await register('customer');
{
  check('register customer', customer.status === 201 && customer.user?.role === 'customer');
  const dup = await req('POST', '/auth/register', { body: { fullName: 'Dup', email: customer.email, password: 'secret123' } });
  expectStatus('duplicate email rejected', dup, 409);
  const dupCase = await req('POST', '/auth/register', { body: { fullName: 'Dup', email: customer.email.toUpperCase(), password: 'secret123' } });
  expectStatus('duplicate email rejected regardless of case', dupCase, 409);
  const admin = await req('POST', '/auth/register', { body: { fullName: 'Hacker', email: `h.${uid}@test.dz`, password: 'secret123', role: 'admin' } });
  expectStatus('cannot self-register as admin', admin, 400);
  expectStatus('wrong password', await req('POST', '/auth/login', { body: { email: customer.email, password: 'nope' } }), 401);
  check('login works with upper-case email', Boolean(await login(customer.email.toUpperCase(), 'secret123')));
  const me = await req('GET', '/auth/me', { token: customer.token });
  check('GET /auth/me', me.data.user?.email === customer.email);
  check('password hash never returned', me.data.user?.password === undefined);
  expectStatus('no token → 401', await req('GET', '/auth/me'), 401);
  expectStatus('forged token → 401', await req('GET', '/auth/me', { token: 'abc.def.ghi' }), 401);
  const upd = await req('PUT', '/auth/update-profile', { token: customer.token, body: { fullName: 'Client Testé' } });
  check('update profile', upd.data.user?.fullName === 'Client Testé');
  const role = await req('PUT', '/auth/update-profile', { token: customer.token, body: { role: 'admin' } });
  check('cannot change own role via profile', role.status === 400 || role.data.user?.role === 'customer');
}

// ───────────────────────────────────────────────────────────────
describe('Customer — hotel booking');
const adminToken = await login('admin@hotelsdz.dz', 'admin123');
const ownerToken = await login('owner@hotelsdz.dz', 'owner123');
const sara = await login('sara@example.com', 'pass123');
check('demo accounts log in', Boolean(adminToken && ownerToken && sara));

// a hotel in request mode (instant-booking hotels confirm at once, see the policies tests)
const approvedHotel = (await req('GET', '/hotels?limit=50')).data.hotels.find((h) => !h.policies?.instantBooking);
const detail = await req('GET', `/hotels/${approvedHotel._id}`);
const room = detail.data.rooms?.[0];
check('hotel detail returns rooms', Boolean(room));

let hotelBookingId;
{
  const avail = await req('POST', `/rooms/${room._id}/availability`, { body: { checkIn: day(40), checkOut: day(42) } });
  check('room availability', avail.data.available === true);

  expectStatus('anonymous cannot book', await req('POST', '/bookings', { body: { roomId: room._id, checkIn: day(40), checkOut: day(42) } }), 401);
  expectStatus('past check-in rejected', await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: day(-3), checkOut: day(-1) } }), 400);
  expectStatus('check-out before check-in rejected', await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: day(42), checkOut: day(40) } }), 400);
  expectStatus('too many guests rejected', await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: day(40), checkOut: day(42), guests: room.capacity + 5 } }), 400);
  expectStatus('zero guests rejected', await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: day(40), checkOut: day(42), guests: 0 } }), 400);
  expectStatus('garbage dates rejected', await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: 'xx', checkOut: 'yy' } }), 400);

  const b = await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: day(40), checkOut: day(43), guests: 1 } });
  expectStatus('book a room', b, 201);
  hotelBookingId = b.data.booking?._id;
  // the room may be on a deal (seed): the server prices it after the running discount
  const nightly = room.discountPercent && (!room.discountUntil || new Date(room.discountUntil) >= new Date()) ? Math.round(room.pricePerNight * (1 - room.discountPercent / 100)) : room.pricePerNight;
  check('total price = nights × price (after any deal)', b.data.booking?.totalPrice === 3 * nightly, `${b.data.booking?.totalPrice} vs ${3 * nightly}`);
  check('new booking is pending/unpaid', b.data.booking?.status === 'pending' && b.data.booking?.paymentStatus === 'unpaid');

  const mine = await req('GET', '/bookings/my', { token: customer.token });
  check('booking appears in my bookings', mine.data.bookings?.some((x) => x._id === hotelBookingId));
  const other = await req('GET', '/bookings/my', { token: customer2.token });
  check("other customer can't see it", !other.data.bookings?.some((x) => x._id === hotelBookingId));

  expectStatus("other customer can't cancel it", await req('PUT', `/bookings/${hotelBookingId}/cancel`, { token: customer2.token }), 403);
  expectStatus('customer cannot confirm a booking', await req('PUT', `/bookings/${hotelBookingId}/confirm`, { token: customer.token }), 403);
  expectStatus('customer cannot mark a booking paid', await req('PUT', `/bookings/${hotelBookingId}/paid`, { token: customer.token }), 403);
  expectStatus('online payment API is gone', await req('POST', '/payments/checkout', { token: customer.token, body: { bookingId: hotelBookingId } }), 404);

  // Unpaid booking must not allow a review
  const rev = await req('POST', `/hotels/${approvedHotel._id}/reviews`, { token: customer.token, body: { bookingId: hotelBookingId, rating: 5, comment: 'Top' } });
  check('cannot review an unpaid booking', rev.status === 400 || rev.status === 403, `got ${rev.status}`);

  // Fully booked room → 409
  const tiny = (detail.data.rooms || []).reduce((a, r) => (r.quantity < a.quantity ? r : a), room);
  const statuses = [];
  for (let i = 0; i < tiny.quantity + 1; i++) {
    const r = await req('POST', '/bookings', { token: customer2.token, body: { roomId: tiny._id, checkIn: day(60), checkOut: day(61) } });
    statuses.push(r.status);
  }
  check('overbooking prevented (409 once all units are taken)', statuses.at(-1) === 409, statuses.join(','));

  const cancel = await req('PUT', `/bookings/${hotelBookingId}/cancel`, { token: customer.token });
  check('cancel own booking', cancel.data.booking?.status === 'cancelled');
  expectStatus('cancel twice → 400', await req('PUT', `/bookings/${hotelBookingId}/cancel`, { token: customer.token }), 400);
  expectStatus('owner cannot confirm a cancelled booking', await req('PUT', `/bookings/${hotelBookingId}/confirm`, { token: ownerToken }), 400);

  // Seeded customer has stays in the past: those can no longer be cancelled (and marked refunded)
  const saraBookings = (await req('GET', '/bookings/my', { token: sara })).data.bookings || [];
  const past = saraBookings.find((x) => x.status === 'confirmed' && new Date(x.checkIn) < new Date());
  if (past) {
    expectStatus('cannot cancel a stay that already started', await req('PUT', `/bookings/${past._id}/cancel`, { token: sara }), 400);
  } else {
    check('seed has a past confirmed stay to test cancellation', false);
  }
}

// ───────────────────────────────────────────────────────────────
describe('Customer — house booking, favorites');
{
  const house = (await req('GET', '/houses?limit=50')).data.houses[0];
  const hd = await req('GET', `/houses/${house._id}`);
  expectStatus('house detail', hd, 200);
  const b1 = await req('POST', '/bookings/house', { token: customer.token, body: { houseId: house._id, checkIn: day(50), checkOut: day(53), guests: 2 } });
  expectStatus('book a house', b1, 201);
  check('house total = nights × price', b1.data.booking?.totalPrice === 3 * house.pricePerNight);
  const b2 = await req('POST', '/bookings/house', { token: customer2.token, body: { houseId: house._id, checkIn: day(52), checkOut: day(55) } });
  expectStatus('overlapping house booking rejected', b2, 409);
  const b3 = await req('POST', '/bookings/house', { token: customer2.token, body: { houseId: house._id, checkIn: day(53), checkOut: day(55) } });
  expectStatus('back-to-back house booking allowed (check-out day = check-in day)', b3, 201);

  const fav = await req('POST', `/favorites/hotels/${approvedHotel._id}`, { token: customer.token });
  check('add hotel to favorites', fav.status === 200 || fav.status === 201);
  const favH = await req('POST', `/favorites/houses/${house._id}`, { token: customer.token });
  check('add house to favorites', favH.status === 200 || favH.status === 201);
  const favs = await req('GET', '/favorites', { token: customer.token });
  const favHotels = favs.data.hotels || favs.data.favorites?.hotels || favs.data.favoriteHotels || [];
  check('favorites list contains the hotel', JSON.stringify(favs.data).includes(approvedHotel._id), JSON.stringify(favs.data).slice(0, 120));
  await req('POST', `/favorites/hotels/${approvedHotel._id}`, { token: customer.token });
  const favs2 = await req('GET', '/favorites', { token: customer.token });
  check('toggle removes the favorite', !JSON.stringify(favs2.data).includes(approvedHotel._id) || favHotels.length === 0);

  expectStatus('customer blocked from admin API', await req('GET', '/admin/stats', { token: customer.token }), 403);
  expectStatus('customer blocked from owner API', await req('GET', '/owner/stats', { token: customer.token }), 403);
  expectStatus('customer blocked from seller API', await req('GET', '/seller/listings', { token: customer.token }), 403);
  expectStatus('customer cannot create a hotel', await req('POST', '/hotels', { token: customer.token, form: { name: 'X', wilaya: 'Alger', city: 'Alger' } }), 403);
}

// ───────────────────────────────────────────────────────────────
describe('Hotel owner');
const owner2 = await register('owner');
let newHotelId;
{
  check('register owner', owner2.user?.role === 'owner');
  const create = await req('POST', '/hotels', {
    token: owner2.token,
    form: {
      name: `Hôtel Test ${uid}`, description: 'Hôtel de test', wilaya: 'Béjaïa', city: 'Tichy', address: 'Rue 1',
      starRating: 4, type: 'Balnéaire', amenities: ['WiFi', 'Parking'], lat: 36.75, lng: 5.08,
      avgRating: 5, reviewsCount: 999, status: 'approved', images: [PNG],
    },
  });
  expectStatus('create hotel with image', create, 201);
  newHotelId = create.data.hotel?._id;
  check('new hotel is pending review', create.data.hotel?.status === 'pending');
  check('rating cannot be spoofed on create', create.data.hotel?.avgRating === 0 && create.data.hotel?.reviewsCount === 0, `avg=${create.data.hotel?.avgRating} count=${create.data.hotel?.reviewsCount}`);
  check('image stored', create.data.hotel?.images?.length === 1);
  check('amenities parsed', create.data.hotel?.amenities?.length === 2);

  const pub = await req('GET', '/hotels?limit=50');
  check('pending hotel hidden from public list', !pub.data.hotels.some((h) => h._id === newHotelId));
  expectStatus('pending hotel detail hidden from public', await req('GET', `/hotels/${newHotelId}`), 404);
  expectStatus('owner can still open own pending hotel', await req('GET', `/hotels/${newHotelId}`, { token: owner2.token }), 200);

  const mine = await req('GET', '/hotels/my/list', { token: owner2.token });
  check('hotel in my hotels', mine.data.hotels?.some((h) => h._id === newHotelId));

  const roomR = await req('POST', `/hotels/${newHotelId}/rooms`, {
    token: owner2.token,
    form: { type: 'double', title: 'Chambre vue mer', pricePerNight: 7500, capacity: 2, bedsCount: 1, quantity: 3, images: [PNG] },
  });
  expectStatus('add room to own hotel', roomR, 201);
  expectStatus("owner can't add rooms to someone else's hotel", await req('POST', `/hotels/${approvedHotel._id}/rooms`, { token: owner2.token, form: { type: 'double', title: 'X', pricePerNight: 1, capacity: 1, quantity: 1 } }), 403);
  expectStatus("owner can't edit someone else's hotel", await req('PUT', `/hotels/${approvedHotel._id}`, { token: owner2.token, form: { name: 'Pwned' } }), 403);
  expectStatus("owner can't delete someone else's hotel", await req('DELETE', `/hotels/${approvedHotel._id}`, { token: owner2.token }), 403);
  expectStatus("owner can't edit someone else's room", await req('PUT', `/rooms/${room._id}`, { token: owner2.token, form: { pricePerNight: 1 } }), 403);

  const upd = await req('PUT', `/rooms/${roomR.data.room?._id}`, { token: owner2.token, form: { pricePerNight: 8000 } });
  check('update own room price', upd.data.room?.pricePerNight === 8000);
  expectStatus('booking a room of a pending hotel is refused', await req('POST', '/bookings', { token: customer.token, body: { roomId: roomR.data.room?._id, checkIn: day(30), checkOut: day(31) } }), 400);

  const editH = await req('PUT', `/hotels/${newHotelId}`, { token: owner2.token, form: { description: 'Nouvelle description' } });
  check('edit own hotel', editH.data.hotel?.description === 'Nouvelle description');

  // Booking requests: the property owner accepts/refuses them and records on-site payment
  const reqA = await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: day(80), checkOut: day(82) } });
  const idA = reqA.data.booking?._id;
  expectStatus("another owner can't confirm the request", await req('PUT', `/bookings/${idA}/confirm`, { token: owner2.token }), 403);
  expectStatus("another owner can't refuse the request", await req('PUT', `/bookings/${idA}/reject`, { token: owner2.token, body: { reason: 'x' } }), 403);
  expectStatus('cannot mark a pending request as paid', await req('PUT', `/bookings/${idA}/paid`, { token: ownerToken }), 400);
  const rej = await req('PUT', `/bookings/${idA}/reject`, { token: ownerToken, body: { reason: 'Complet à ces dates' } });
  check('owner refuses a request with a reason', rej.data.booking?.status === 'cancelled' && rej.data.booking?.rejectionReason === 'Complet à ces dates');
  check('customer sees the refusal reason', (await req('GET', '/bookings/my', { token: customer.token })).data.bookings?.find((x) => x._id === idA)?.rejectionReason === 'Complet à ces dates');

  const reqB = await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: day(84), checkOut: day(86) } });
  const idB = reqB.data.booking?._id;
  const conf = await req('PUT', `/bookings/${idB}/confirm`, { token: ownerToken });
  check('owner accepts a request', conf.data.booking?.status === 'confirmed' && conf.data.booking?.paymentStatus === 'unpaid');
  expectStatus('cannot accept twice', await req('PUT', `/bookings/${idB}/confirm`, { token: ownerToken }), 400);
  expectStatus('cannot refuse an accepted booking', await req('PUT', `/bookings/${idB}/reject`, { token: ownerToken, body: { reason: 'x' } }), 400);
  const paid = await req('PUT', `/bookings/${idB}/paid`, { token: ownerToken });
  check('owner marks the stay as paid on site', paid.data.booking?.paymentStatus === 'paid' && Boolean(paid.data.booking?.paidAt));
  expectStatus('cannot mark paid twice', await req('PUT', `/bookings/${idB}/paid`, { token: ownerToken }), 400);
  expectStatus('paid stay unlocks a review', await req('POST', `/hotels/${approvedHotel._id}/reviews`, { token: customer.token, body: { bookingId: idB, rating: 4, comment: 'Très bien' } }), 201);
  expectStatus('admin can also confirm requests', await req('PUT', `/bookings/${(await req('POST', '/bookings', { token: customer.token, body: { roomId: room._id, checkIn: day(88), checkOut: day(89) } })).data.booking?._id}/confirm`, { token: adminToken }), 200);

  // Demo owner: stats & bookings
  const stats = await req('GET', '/owner/stats', { token: ownerToken });
  expectStatus('owner stats', stats, 200);
  const ob = await req('GET', '/bookings/owner', { token: ownerToken });
  // Revenue is per currency: dinars and Tunisian dinars are never added together
  const paidBy = {};
  for (const b of (ob.data.bookings || []).filter((x) => x.paymentStatus === 'paid' && x.status !== 'cancelled')) {
    paidBy[b.currency || 'DZD'] = (paidBy[b.currency || 'DZD'] || 0) + b.totalPrice;
  }
  check('owner revenue counts only paid bookings (DZD)', stats.data.totalRevenue === (paidBy.DZD || 0), `stats=${stats.data.totalRevenue} paid=${paidBy.DZD}`);
  check('owner revenue is split by currency', JSON.stringify(stats.data.revenueByCurrency) === JSON.stringify(paidBy) || Object.entries(paidBy).every(([c, v]) => stats.data.revenueByCurrency?.[c] === v), JSON.stringify(stats.data.revenueByCurrency));
  check('owner bookings show the guest name only (no phone/email: Meskan is the intermediary)', ob.data.bookings?.length > 0 && ob.data.bookings.every((b) => !b.customer || (b.customer.fullName && b.customer.email === undefined && b.customer.phone === undefined)));
  const ob2 = await req('GET', '/bookings/owner', { token: owner2.token });
  check("owner doesn't see other owners' bookings", (ob2.data.bookings || []).length === 0);
}

describe('House owner');
{
  const h = await req('POST', '/houses', {
    token: owner2.token,
    form: { name: `Villa ${uid}`, description: 'Villa test', wilaya: 'Tipaza', city: 'Cherchell', type: 'Villa', rooms: 3, bathrooms: 2, capacity: 6, pricePerNight: 12000, avgRating: 5, images: [PNG] },
  });
  expectStatus('create house', h, 201);
  const id = h.data.house?._id;
  check('new house pending', h.data.house?.status === 'pending');
  check('house rating cannot be spoofed', h.data.house?.avgRating === 0);
  expectStatus('pending house hidden from public', await req('GET', `/houses/${id}`), 404);
  const u = await req('PUT', `/houses/${id}`, { token: owner2.token, form: { pricePerNight: 13000 } });
  check('update own house', u.data.house?.pricePerNight === 13000);
  expectStatus("other owner can't edit it", await req('PUT', `/houses/${id}`, { token: ownerToken, form: { pricePerNight: 1 } }), 403);
  expectStatus('booking a pending house refused', await req('POST', '/bookings/house', { token: customer.token, body: { houseId: id, checkIn: day(30), checkOut: day(31) } }), 400);
  expectStatus('delete own house', await req('DELETE', `/houses/${id}`, { token: owner2.token }), 200);
}

// ───────────────────────────────────────────────────────────────
describe('Home seller');
const seller = await register('seller');
const seller2 = await register('seller');
let listingId;
{
  check('register seller', seller.user?.role === 'seller');
  const c = await req('POST', '/seller/listings', {
    token: seller.token,
    form: {
      title: `F3 Hydra ${uid}`, description: 'Bel appartement', wilaya: 'Alger', city: 'Hydra', type: 'Appartement',
      price: 25000000, area: 95, rooms: 3, bathrooms: 1, views: 100000, reference: 'REF-HACKED1', status: 'approved', images: [PNG],
    },
  });
  expectStatus('create sale listing', c, 201);
  listingId = c.data.listing?._id;
  check('listing pending review', c.data.listing?.status === 'pending');
  check('views cannot be spoofed', c.data.listing?.views === 0, `views=${c.data.listing?.views}`);
  check('reference is generated, not user-supplied', c.data.listing?.reference?.startsWith('REF-') && c.data.listing?.reference !== 'REF-HACKED1', c.data.listing?.reference);
  check('contact defaults to seller', c.data.listing?.contactEmail === seller.email);

  const pub = await req('GET', '/sales?limit=50');
  check('pending listing hidden from public list', !pub.data.listings?.some((l) => l._id === listingId));
  expectStatus('pending listing detail hidden from public', await req('GET', `/sales/${listingId}`), 404);
  expectStatus("other seller can't edit", await req('PUT', `/seller/listings/${listingId}`, { token: seller2.token, form: { price: 1 } }), 403);
  expectStatus("other seller can't delete", await req('DELETE', `/seller/listings/${listingId}`, { token: seller2.token }), 403);
  expectStatus('owner role blocked from seller API', await req('GET', '/seller/listings', { token: ownerToken }), 403);
  const u = await req('PUT', `/seller/listings/${listingId}`, { token: seller.token, form: { price: 24000000 } });
  check('edit own listing: seller price kept, buyers see +1 % (Meskan)', u.data.listing?.sellerPrice === 24000000 && u.data.listing?.price === 24240000, `${u.data.listing?.sellerPrice} → ${u.data.listing?.price}`);
  check('created listing: displayed price = seller price + 1 %', c.data.listing?.sellerPrice === 25000000 && c.data.listing?.price === 25250000, `${c.data.listing?.sellerPrice} → ${c.data.listing?.price}`);
  const t2 = await req('PUT', `/seller/listings/${listingId}`, { token: seller.token, form: { description: 'Texte modifié' } });
  check('editing something else keeps both prices', t2.data.listing?.sellerPrice === 24000000 && t2.data.listing?.price === 24240000);
  const s = await req('GET', '/seller/stats', { token: seller.token });
  check('seller stats', s.data.totalListings === 1 && s.data.pendingListings === 1);
  const invalid = await req('POST', '/seller/listings', { token: seller.token, form: { title: 'X', wilaya: 'Alger', city: 'Alger', price: -5 } });
  expectStatus('negative price rejected', invalid, 400);
}

// ───────────────────────────────────────────────────────────────
describe('Admin');
{
  const stats = await req('GET', '/admin/stats', { token: adminToken });
  expectStatus('admin stats', stats, 200);
  expectStatus('recent activity', await req('GET', '/admin/recent-activity', { token: adminToken }), 200);

  const pending = await req('GET', '/admin/hotels/pending', { token: adminToken });
  check('new hotel in pending queue', pending.data.hotels?.some((h) => h._id === newHotelId));
  const ap = await req('PUT', `/admin/hotels/${newHotelId}/approve`, { token: adminToken });
  check('approve hotel', ap.data.hotel?.status === 'approved');
  expectStatus('approved hotel now public', await req('GET', `/hotels/${newHotelId}`), 200);
  const rj = await req('PUT', `/admin/hotels/${newHotelId}/reject`, { token: adminToken, body: { reason: 'Photos floues' } });
  check('reject hotel with reason', rj.data.hotel?.status === 'rejected' && rj.data.hotel?.rejectionReason === 'Photos floues');
  await req('PUT', `/admin/hotels/${newHotelId}/approve`, { token: adminToken });
  check('approval clears the rejection reason', (await req('GET', `/hotels/${newHotelId}`)).data.hotel?.rejectionReason === '');

  const sa = await req('PUT', `/admin/sales/${listingId}/approve`, { token: adminToken });
  check('approve sale', sa.data.sale?.status === 'approved');
  const v1 = (await req('GET', `/sales/${listingId}`)).data.listing?.views;
  const v2 = (await req('GET', `/sales/${listingId}`)).data.listing?.views;
  const v3 = (await req('GET', `/sales/${listingId}?noview=1`)).data.listing?.views;
  check('public view increments views; noview does not', v2 === v1 + 1 && v3 === v2, `${v1},${v2},${v3}`);
  check('listing searchable by reference', (await req('GET', `/sales?reference=${sa.data.sale?.reference}`)).data.total === 1);

  const users = await req('GET', '/admin/users', { token: adminToken });
  check('list users', users.data.users?.length >= 5);
  check('user list has no password hashes', !JSON.stringify(users.data).includes('"password"'));
  const block = await req('PUT', `/admin/users/${customer2.user._id}/block`, { token: adminToken });
  check('block user', block.data.user?.isBlocked === true);
  expectStatus('blocked user cannot log in', await req('POST', '/auth/login', { body: { email: customer2.email, password: 'secret123' } }), 403);
  expectStatus("blocked user's token stops working", await req('GET', '/auth/me', { token: customer2.token }), 403);
  await req('PUT', `/admin/users/${customer2.user._id}/block`, { token: adminToken });
  check('unblock user', Boolean(await login(customer2.email, 'secret123')));
  const adminId = users.data.users.find((u) => u.role === 'admin')._id;
  expectStatus('cannot block an admin', await req('PUT', `/admin/users/${adminId}/block`, { token: adminToken }), 400);

  const bookings = await req('GET', '/admin/bookings', { token: adminToken });
  check('admin sees all bookings', (bookings.data.bookings || []).length > 0);
  const msgs = await req('GET', '/messages', { token: adminToken });
  const msg = msgs.data.messages?.[0];
  check('admin sees contact messages', Boolean(msg));
  check('admin sees the sender phone', msgs.data.messages.some((m) => m.phone === '+213 (21) 45-67-89'));
  check('mark message read', (await req('PUT', `/messages/${msg._id}/read`, { token: adminToken })).data.message?.isRead === true);
  expectStatus('delete message', await req('DELETE', `/messages/${msg._id}`, { token: adminToken }), 200);
  expectStatus('owner cannot read messages', await req('GET', '/messages', { token: ownerToken }), 403);

  expectStatus('duplicate wilaya rejected', await req('POST', '/admin/wilayas', { token: adminToken, body: { name: 'alger' } }), 400);

  const pr = await req('PUT', '/pricing/prices', { token: adminToken, body: { growthMonthlyPrice: 3100 } });
  expectStatus('admin updates pricing', pr, 200);
  check('new price is public', (await req('GET', '/pricing/prices')).data.settings?.growthMonthlyPrice === 3100);
  expectStatus('owner cannot update pricing', await req('PUT', '/pricing/prices', { token: ownerToken, body: { growthMonthlyPrice: 1 } }), 403);

  // Deleting a hotel must also remove its rooms (otherwise booking an orphan room crashes)
  const hotelRooms = (await req('GET', `/hotels/${newHotelId}/rooms`)).data.rooms || [];
  expectStatus('admin deletes hotel', await req('DELETE', `/admin/hotels/${newHotelId}`, { token: adminToken }), 200);
  const orphan = await req('POST', '/bookings', { token: customer.token, body: { roomId: hotelRooms[0]?._id, checkIn: day(70), checkOut: day(71) } });
  check('rooms of a deleted hotel are not bookable (no 500)', orphan.status === 404, `got ${orphan.status}`);

  expectStatus('admin deletes sale', await req('DELETE', `/admin/sales/${listingId}`, { token: adminToken }), 200);
  expectStatus('admin deletes user', await req('DELETE', `/admin/users/${customer2.user._id}`, { token: adminToken }), 200);
}

describe('Home page testimonials (moderated)');
{
  const pub = await req('GET', '/testimonials');
  expectStatus('approved testimonials are public', pub, 200);
  check('only approved testimonials are listed', pub.data.testimonials?.length >= 1 && pub.data.testimonials.every((t) => !('status' in t) || t.status === 'approved'));
  check('public list exposes no e-mail', !JSON.stringify(pub.data).includes('@'));

  expectStatus('visitor cannot post a testimonial', await req('POST', '/testimonials', { body: { rating: 5, comment: 'Anonymous spam text' } }), 401);
  const writer = await register('customer');
  expectStatus('rating is validated', await req('POST', '/testimonials', { token: writer.token, body: { rating: 9, comment: 'Excellent plateforme vraiment' } }), 400);
  expectStatus('short comment rejected', await req('POST', '/testimonials', { token: writer.token, body: { rating: 5, comment: 'Bien' } }), 400);
  const sent = await req('POST', '/testimonials', {
    token: writer.token,
    body: { rating: 4, title: 'Client, Tlemcen', comment: `Très bonne plateforme ${uid}`, status: 'approved', name: 'Spoofed' },
  });
  expectStatus('customer posts a testimonial', sent, 201);
  const tid = sent.data.testimonial?._id;
  check('new testimonial waits for moderation (status not spoofable)', sent.data.testimonial?.status === 'pending');
  check('author name comes from the account', sent.data.testimonial?.name === 'Test customer');
  check('pending testimonial is not public', !(await req('GET', '/testimonials')).data.testimonials.some((t) => t._id === tid));
  check('author sees own pending testimonial', (await req('GET', '/testimonials/mine', { token: writer.token })).data.testimonial?._id === tid);

  const again = await req('POST', '/testimonials', { token: writer.token, body: { rating: 5, comment: `Encore mieux ${uid}` } });
  check('posting again updates the same testimonial', again.data.testimonial?._id === tid && again.data.testimonial?.rating === 5);

  expectStatus('customer cannot moderate', await req('PUT', `/testimonials/${tid}/approve`, { token: writer.token }), 403);
  expectStatus('customer cannot list moderation queue', await req('GET', '/testimonials/admin', { token: writer.token }), 403);

  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const queue = await req('GET', '/testimonials/admin?status=pending', { token: admin });
  check('admin sees it in the pending queue', queue.data.testimonials?.some((t) => t._id === tid) && queue.data.pending >= 1);
  expectStatus('admin approves', await req('PUT', `/testimonials/${tid}/approve`, { token: admin }), 200);
  check('approved testimonial is public', (await req('GET', '/testimonials')).data.testimonials.some((t) => t._id === tid));

  const edited = await req('POST', '/testimonials', { token: writer.token, body: { rating: 1, comment: `Changé après validation ${uid}` } });
  check('editing an approved testimonial sends it back to moderation', edited.data.testimonial?.status === 'pending');
  check('edited testimonial leaves the public list', !(await req('GET', '/testimonials')).data.testimonials.some((t) => t._id === tid));

  expectStatus('admin deletes', await req('DELETE', `/testimonials/${tid}`, { token: admin }), 200);
  expectStatus('deleted testimonial is gone', await req('DELETE', `/testimonials/${tid}`, { token: admin }), 404);
}

describe('Countries and currencies (Algeria only for now)');
{
  const seller = await register('owner');
  const make = (extra) =>
    req('POST', '/hotels', {
      token: seller.token,
      form: { name: `Hôtel Pays ${uid}`, description: 'Test', city: 'Oran', address: 'Rue 1', starRating: 3, type: 'Boutique', images: [PNG], ...extra },
    });
  const dz = await make({ wilaya: 'oran', currency: 'TND' });
  expectStatus('owner creates a hotel (Algeria by default)', dz, 201);
  check('no country = Algeria', dz.data.hotel?.country === 'DZ');
  check('currency follows the country (DZD), not the client', dz.data.hotel?.currency === 'DZD', dz.data.hotel?.currency);
  check('wilaya stored in its official spelling', dz.data.hotel?.wilaya === 'Oran', dz.data.hotel?.wilaya);
  expectStatus('Tunisia not open yet', await make({ country: 'TN', wilaya: 'Sousse' }), 400);
  expectStatus('unknown country rejected', await make({ country: 'FR', wilaya: 'Paris' }), 400);
  const moved = await req('PUT', `/hotels/${dz.data.hotel?._id}`, { token: seller.token, body: { country: 'MA', wilaya: 'Marrakech' } });
  expectStatus('moving a listing to a closed country rejected', moved, 400);
  check('closed-country filter is ignored', (await req('GET', '/hotels?country=TN&limit=50')).data.hotels?.every((h) => h.country === 'DZ'));
  check('every listing is Algerian, in DZD', (await req('GET', '/houses?limit=50')).data.houses?.every((h) => h.country === 'DZ' && h.currency === 'DZD'));

  const anyRoom = (await req('GET', `/hotels/${(await req('GET', '/hotels?limit=1')).data.hotels[0]._id}/rooms`)).data;
  check('room list carries the hotel currency', anyRoom.currency === 'DZD');
  const bk = await req('POST', '/bookings', { token: customer.token, body: { roomId: anyRoom.rooms?.[0]?._id, checkIn: day(80), checkOut: day(82), guests: 1 } });
  expectStatus('book a room', bk, 201);
  check('booking stores its currency', bk.data.booking?.currency === 'DZD');
  check('payment stays on site', bk.data.booking?.paymentMethod === 'on_site');

  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const rates = await req('PUT', '/pricing/prices', { token: admin, body: { exchangeRates: { TND: 44.5, MAD: -3 } } });
  check('exchange rates kept for later (invalid ones ignored)', rates.data.settings?.exchangeRates?.TND === 44.5 && rates.data.settings?.exchangeRates?.MAD > 0);
  const stats = await req('GET', '/admin/stats', { token: admin });
  check('admin revenue is split by currency', typeof (stats.data.stats || stats.data).revenueByCurrency === 'object');
}

describe('Policies, instant booking and free cancellation');
{
  const host = await register('owner');
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const policies = { instantBooking: true, freeCancellationDays: 5, checkInFrom: '15:00', checkOutUntil: '25:99', petsAllowed: 'true', hack: 1, customRules: ['  Familles   uniquement ', 'familles uniquement', '', 'x'.repeat(120), ...Array.from({ length: 12 }, (_, i) => `Règle ${i}`)] };
  const h = await req('POST', '/houses', {
    token: host.token,
    form: { name: `Maison Règles ${uid}`, description: 'Test', wilaya: 'Tipaza', city: 'Tipaza', type: 'Villa', rooms: 2, bathrooms: 1, capacity: 4, pricePerNight: 8000, policies, images: [PNG] },
  });
  expectStatus('owner creates a house with policies', h, 201);
  const p = h.data.house?.policies || {};
  check('policies saved', p.instantBooking === true && p.freeCancellationDays === 5 && p.checkInFrom === '15:00' && p.petsAllowed === true);
  check('invalid policy values fall back to defaults', p.checkOutUntil === '12:00' && p.hack === undefined, JSON.stringify(p));
  const cr = p.customRules || [];
  check('custom rules trimmed, deduplicated, capped (10 × 80 chars)', cr.length === 10 && cr[0] === 'Familles uniquement' && cr[1].length === 80 && !cr.includes(''), JSON.stringify(cr));
  const houseId = h.data.house?._id;
  await req('PUT', `/admin/houses/${houseId}/approve`, { token: admin });

  const instant = await req('POST', '/bookings/house', { token: customer.token, body: { houseId, checkIn: day(30), checkOut: day(32), guests: 2 } });
  expectStatus('instant booking accepted', instant, 201);
  check('instant booking is confirmed at once', instant.data.booking?.status === 'confirmed' && instant.data.booking?.instant === true);
  const deadline = new Date(instant.data.booking?.freeCancellationUntil);
  check('free cancellation deadline = check-in minus 5 days', Math.round((new Date(day(30)) - deadline) / 86400000) === 5, String(deadline));
  check('instant booking blocks the dates', (await req('POST', '/bookings/house', { token: customer.token, body: { houseId, checkIn: day(31), checkOut: day(33) } })).status === 409);
  const c1 = await req('PUT', `/bookings/${instant.data.booking?._id}/cancel`, { token: customer.token });
  check('cancel before the deadline is free', c1.data.booking?.status === 'cancelled' && c1.data.booking?.lateCancellation === false && c1.data.booking?.cancelledBy === 'customer');

  const soon = await req('POST', '/bookings/house', { token: customer.token, body: { houseId, checkIn: day(2), checkOut: day(3) } });
  const c2 = await req('PUT', `/bookings/${soon.data.booking?._id}/cancel`, { token: customer.token });
  check('cancel after the deadline is flagged late', c2.data.booking?.lateCancellation === true);

  // switching back to request mode: new bookings wait for the owner again
  const upd = await req('PUT', `/houses/${houseId}`, { token: host.token, body: { policies: { instantBooking: false } } });
  check('owner edits policies (others kept)', upd.data.house?.policies?.instantBooking === false && upd.data.house?.policies?.freeCancellationDays === 5 && upd.data.house?.policies?.customRules?.length === 10);
  const upd2 = await req('PUT', `/houses/${houseId}`, { token: host.token, body: { policies: { customRules: ['Familles uniquement', 'Calme après 22 h'] } } });
  check('owner replaces custom rules', JSON.stringify(upd2.data.house?.policies?.customRules) === '["Familles uniquement","Calme après 22 h"]', JSON.stringify(upd2.data.house?.policies));
  await req('PUT', `/admin/houses/${houseId}/approve`, { token: admin }); // editing sends it back to review
  const req2 = await req('POST', '/bookings/house', { token: customer.token, body: { houseId, checkIn: day(40), checkOut: day(41) } });
  check('request mode: booking waits for the owner', req2.data.booking?.status === 'pending' && req2.data.booking?.instant === false);
  const byOwner = await req('PUT', `/bookings/${req2.data.booking?._id}/cancel`, { token: host.token });
  check('owner cancellation is never "late"', byOwner.data.booking?.cancelledBy === 'owner' && byOwner.data.booking?.lateCancellation === false);

  const sofitel = (await req('GET', '/hotels?limit=50')).data.hotels.find((x) => x.name === 'Sofitel Algiers Hamma');
  check('policies are public on listings', sofitel?.policies?.instantBooking === true);
  const pub = await req('GET', `/houses/${houseId}`);
  check('custom rules are public on the listing', pub.data.house?.policies?.customRules?.includes('Calme après 22 h'), JSON.stringify(pub.data.house?.policies));
}

describe('Scores out of 10, house reviews and deals');
{
  const host = await register('owner');
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const h = await req('POST', '/houses', {
    token: host.token,
    form: { name: `Maison Promo ${uid}`, description: 'Test', wilaya: 'Jijel', city: 'Jijel', type: 'Villa', rooms: 2, bathrooms: 1, capacity: 4, pricePerNight: 10000, discountPercent: 20, discountUntil: '', images: [PNG] },
  });
  expectStatus('owner creates a house with a deal', h, 201);
  check('deal saved', h.data.house?.discountPercent === 20);
  const houseId = h.data.house?._id;
  await req('PUT', `/admin/houses/${houseId}/approve`, { token: admin });

  const b = await req('POST', '/bookings/house', { token: customer.token, body: { houseId, checkIn: day(50), checkOut: day(52), guests: 2 } });
  expectStatus('book a house on deal', b, 201);
  check('deal applied by the server (2 nights × 8 000)', b.data.booking?.totalPrice === 16000 && b.data.booking?.discountPercent === 20, `${b.data.booking?.totalPrice}`);

  // an expired deal no longer applies
  await req('PUT', `/houses/${houseId}`, { token: host.token, body: { discountUntil: day(-2) } });
  await req('PUT', `/admin/houses/${houseId}/approve`, { token: admin });
  const b2 = await req('POST', '/bookings/house', { token: customer.token, body: { houseId, checkIn: day(60), checkOut: day(61) } });
  check('expired deal = full price', b2.data.booking?.totalPrice === 10000 && b2.data.booking?.discountPercent === 0, `${b2.data.booking?.totalPrice}`);
  expectStatus('discount over 90 % ignored', await req('PUT', `/houses/${houseId}`, { token: host.token, body: { discountPercent: 99 } }), 200);
  check('discount stays within limits', (await req('GET', '/houses/my/list', { token: host.token })).data.houses?.find((x) => x._id === houseId)?.discountPercent === 20);
  await req('PUT', `/admin/houses/${houseId}/approve`, { token: admin }); // editing sent it back to review

  // complete the stay: owner confirms + marks paid, then the guest reviews the house
  await req('PUT', `/bookings/${b.data.booking?._id}/confirm`, { token: host.token });
  await req('PUT', `/bookings/${b.data.booking?._id}/paid`, { token: host.token });
  expectStatus('score above 10 rejected', await req('POST', `/houses/${houseId}/reviews`, { token: customer.token, body: { bookingId: b.data.booking?._id, score: 11 } }), 400);
  const rv = await req('POST', `/houses/${houseId}/reviews`, {
    token: customer.token,
    body: { bookingId: b.data.booking?._id, score: 9, categories: { cleanliness: 10, location: 8, value: 99, hack: 5 }, comment: 'Super maison' },
  });
  expectStatus('guest reviews a house', rv, 201);
  check('invalid category scores dropped', rv.data.review?.categories?.cleanliness === 10 && rv.data.review?.categories?.value === undefined);
  expectStatus('one review per stay', await req('POST', `/houses/${houseId}/reviews`, { token: customer.token, body: { bookingId: b.data.booking?._id, score: 5 } }), 409);
  expectStatus('cannot review an unpaid future stay', await req('POST', `/houses/${houseId}/reviews`, { token: customer.token, body: { bookingId: b2.data.booking?._id, score: 5 } }), 403);
  const listed = (await req('GET', `/houses/${houseId}`)).data.house;
  check('house score out of 10 + categories', listed?.avgRating === 9 && listed?.reviewsCount === 1 && listed?.scores?.cleanliness === 10, JSON.stringify({ a: listed?.avgRating, s: listed?.scores }));
  check('house reviews are public', (await req('GET', `/houses/${houseId}/reviews`)).data.count === 1);
  check('guest sees which stays are reviewed', (await req('GET', '/reviews/mine', { token: customer.token })).data.reviews?.some((r) => String(r.booking) === String(b.data.booking?._id)));

  // legacy 1–5 ratings count double; hotel lists show the deal on the cheapest room
  const hotels = (await req('GET', '/hotels?limit=50')).data.hotels;
  check('hotel scores are out of 10', hotels.every((x) => x.avgRating <= 10));
  const meridien = hotels.find((x) => x.name === 'Le Méridien Oran');
  check('hotel "from" price includes the running deal', meridien?.discountPercent === 15 && meridien?.originalPrice > meridien?.price, JSON.stringify({ p: meridien?.price, o: meridien?.originalPrice }));
}

describe('Messages: users only write to Meskan');
{
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const user = await register('customer');
  expectStatus('old user-to-user chat is gone', await req('GET', '/conversations', { token: user.token }), 404);
  expectStatus('visitor cannot read messages', await req('GET', '/support/thread'), 401);
  const empty = await req('GET', '/support/thread', { token: user.token });
  check('a new user starts with an empty conversation', empty.status === 200 && empty.data.thread?.messages?.length === 0);
  expectStatus('empty message rejected', await req('POST', '/support/thread/messages', { token: user.token, body: { text: '   ' } }), 400);
  expectStatus('too long rejected', await req('POST', '/support/thread/messages', { token: user.token, body: { text: 'x'.repeat(2001) } }), 400);
  const sent = await req('POST', '/support/thread/messages', { token: user.token, body: { text: 'Bonjour, la villa est-elle libre ?', about: 'Villa test (REF-1)' } });
  check('user writes to Meskan, with what it is about', sent.status === 201 && sent.data.message?.about === 'Villa test (REF-1)' && sent.data.message?.fromAdmin === false);
  expectStatus('non-admin cannot read the admin inbox', await req('GET', '/admin/support', { token: user.token }), 403);
  check('admin has an unread message', (await req('GET', '/admin/support/unread', { token: admin })).data.unread >= 1);
  const inbox = await req('GET', '/admin/support', { token: admin });
  const th = inbox.data.threads?.find((x) => x.user?.email === user.email);
  check('admin sees the conversation with the user\'s contact', Boolean(th) && th.unread === 1 && th.lastMessage?.about === 'Villa test (REF-1)');
  const before = (await req('GET', '/admin/support/unread', { token: admin })).data.unread;
  check('admin opens it', (await req('GET', `/admin/support/${th?._id}`, { token: admin })).data.thread?.messages?.length === 1);
  check('…then it is read', (await req('GET', '/admin/support/unread', { token: admin })).data.unread === before - 1);
  expectStatus('admin replies', await req('POST', `/admin/support/user/${th?.user?._id}/messages`, { token: admin, body: { text: 'Oui, elle est libre en août.' } }), 201);
  expectStatus('admin cannot write to an unknown user', await req('POST', '/admin/support/user/000000000000000000000000/messages', { token: admin, body: { text: 'x' } }), 404);
  check('user has 1 unread reply', (await req('GET', '/support/unread', { token: user.token })).data.unread === 1);
  const thread = await req('GET', '/support/thread', { token: user.token });
  check('user reads the reply', thread.data.thread?.messages?.[1]?.fromAdmin === true);
  check('…then it is read', (await req('GET', '/support/unread', { token: user.token })).data.unread === 0);
}

describe('Meskan is the only contact on listings');
{
  const house = (await req('GET', '/houses?limit=1')).data.houses?.[0];
  const hd = await req('GET', `/houses/${house?._id}`);
  check('house page: no owner name, phone or email', typeof hd.data.house?.owner === 'string');
  check("house page: Meskan's contact comes along", hd.data.contact && 'phone' in hd.data.contact);
  const sales = await req('GET', '/sales?limit=50');
  check('sales list: no seller phone or email', sales.data.listings?.length > 0 && sales.data.listings.every((l) => l.contactPhone === undefined && l.contactEmail === undefined));
  check("sales list: Meskan's contact comes along", sales.data.contact && 'phone' in sales.data.contact);
  const sd = await req('GET', `/sales/${sales.data.listings[0]._id}`);
  check('sale page: no seller name, phone or email', typeof sd.data.listing?.seller === 'string' && sd.data.listing.contactPhone === undefined);
  const demoSeller = await login('vendeur@hotelsdz.dz', 'seller123'); // the test seller's listing was deleted by the admin section
  check('seller still sees their own contact', (await req('GET', '/seller/listings', { token: demoSeller })).data.listings?.[0]?.contactEmail === 'vendeur@hotelsdz.dz');
}

describe('Rental types (day, month, year, month and year)');
{
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const host = await register('owner');
  const mk = (name, extra) => req('POST', '/houses', { token: host.token, form: { name: `${name} ${uid}`, description: 'Test', wilaya: 'Oran', city: 'Oran', type: 'Appartement', rooms: 2, bathrooms: 1, capacity: 4, images: [PNG], ...extra } });
  const monthly = await mk('Appart au mois', { rentalPeriod: 'monthly', pricePerMonth: 45000 });
  check('owner publishes a monthly rental (no nightly price needed)', monthly.status === 201 && monthly.data.house?.rentalPeriod === 'monthly' && monthly.data.house?.pricePerMonth === 45000, `${monthly.status} ${monthly.data.message || ''}`);
  const yearly = await mk('Maison à l\'année', { rentalPeriod: 'yearly', pricePerYear: 480000 });
  const both = await mk('Studio mois ou année', { rentalPeriod: 'monthly_yearly', pricePerMonth: 30000, pricePerYear: 320000 });
  expectStatus('nightly rental still needs its price', await mk('Sans prix', { rentalPeriod: 'daily' }), 400);
  expectStatus('unknown rental type rejected', await mk('Bizarre', { rentalPeriod: 'weekly', pricePerNight: 5000 }), 400);
  for (const h of [monthly, yearly, both]) await req('PUT', `/admin/houses/${h.data.house?._id}/approve`, { token: admin });
  const ids = (p) => req('GET', `/houses?limit=100${p ? `&period=${p}` : ''}`).then((r) => r.data.houses.map((h) => h._id));
  const [mIds, yIds, bIds, dIds] = await Promise.all([ids('monthly'), ids('yearly'), ids('monthly_yearly'), ids('daily')]);
  const [m, y, b] = [monthly, yearly, both].map((h) => h.data.house?._id);
  check('"monthly" tab: monthly and month+year houses', mIds.includes(m) && mIds.includes(b) && !mIds.includes(y));
  check('"yearly" tab: yearly and month+year houses', yIds.includes(y) && yIds.includes(b) && !yIds.includes(m));
  check('"month and year" tab: only those', bIds.includes(b) && !bIds.includes(m) && !bIds.includes(y));
  check('"daily" tab: none of them (older houses count as daily)', ![m, y, b].some((id) => dIds.includes(id)) && dIds.length > 0);
  expectStatus('a yearly house cannot be booked by the night', await req('POST', '/bookings/house', { token: customer.token, body: { houseId: y, checkIn: day(40), checkOut: day(42) } }), 400);
  const ed = await req('PUT', `/admin/houses/${m}`, { token: admin, form: { rentalPeriod: 'monthly_yearly', pricePerYear: 500000 } });
  check('admin switches it to month and year', ed.data.house?.rentalPeriod === 'monthly_yearly' && ed.data.house?.pricePerYear === 500000);
  const adm = await req('POST', '/admin/houses', { token: admin, form: { name: `Admin sans "adapté à" ${uid}`, wilaya: 'Oran', city: 'Oran', rooms: 1, bathrooms: 1, capacity: 2, pricePerNight: 5000, suitableFor: '' } });
  check('admin creates a house without "suitable for" (used to fail)', adm.status === 201, `${adm.status} ${adm.data.message || ''}`);
  for (const id of [m, y, b, adm.data.house?._id]) if (id) await req('DELETE', `/admin/houses/${id}`, { token: admin });
}

describe('Sales categories and 1 % in filters');
{
  const homes = (await req('GET', '/sales?category=homes&limit=50')).data.listings || [];
  const land = (await req('GET', '/sales?category=land&limit=50')).data.listings || [];
  check('homes: flats, villas, houses…', homes.length > 0 && homes.every((l) => ['Appartement', 'Villa', 'Maison', 'Duplex', 'Studio', 'Chalet'].includes(l.type)));
  check('land: land, shops, buildings, farms', land.length > 0 && land.every((l) => ['Terrain', 'Local commercial', 'Immeuble', 'Ferme'].includes(l.type)));
  check('every listing shows seller price + 1 %', [...homes, ...land].every((l) => l.price === Math.round(l.sellerPrice * 1.01)));
  check('a single type still wins over the category', ((await req('GET', '/sales?category=land&type=Villa&limit=50')).data.listings || []).every((l) => l.type === 'Villa'));
}

describe('Sales search filters');
{
  const all = (await req('GET', '/sales?limit=50')).data;
  check('demo properties for sale are listed', all.total >= 8, `total=${all.total}`);
  const f3 = (await req('GET', '/sales?rooms=3&limit=50')).data.listings || [];
  check('rooms=3 → exactly 3 rooms (F3)', f3.length > 0 && f3.every((l) => l.rooms === 3));
  const big = (await req('GET', `/sales?rooms=${encodeURIComponent('5+')}&limit=50`)).data.listings || [];
  check('rooms=5+ → 5 rooms or more', big.length > 0 && big.every((l) => l.rooms >= 5));
  const area = (await req('GET', '/sales?minArea=100&maxArea=200&limit=50')).data.listings || [];
  check('area range', area.length > 0 && area.every((l) => l.area >= 100 && l.area <= 200));
  const cheap = (await req('GET', '/sales?priceRanges=0-10000000&limit=50')).data.listings || [];
  check('price range in millions', cheap.length > 0 && cheap.every((l) => l.price <= 10000000));
  const sorted = (await req('GET', '/sales?sort=price_asc&limit=50')).data.listings || [];
  check('sort by price ascending', sorted.every((l, i) => i === 0 || sorted[i - 1].price <= l.price));
  const bej = (await req('GET', `/sales?wilaya=${encodeURIComponent('Bejaia')}&limit=50`)).data.listings || [];
  check('wilaya filter (accent-insensitive)', bej.length > 0 && bej.every((l) => l.wilaya === 'Béjaïa'));
  expectStatus('bad filter values do not crash', await req('GET', '/sales?rooms=abc&minArea=-5&maxArea=x'), 200);
}

describe('Arabic place search');
{
  const q = (path, v) => req('GET', `${path}?place=${encodeURIComponent(v)}&limit=50`);
  const oran = (await q('/hotels', 'وهران')).data.hotels || [];
  check('«وهران» finds Oran hotels', oran.length > 0 && oran.every((h) => h.wilaya === 'Oran'));
  const alger = (await q('/houses', 'الجزائر')).data.houses || [];
  check('«الجزائر» means the wilaya Alger, not the whole country', alger.length > 0 && alger.every((h) => h.wilaya === 'Alger' || /alger/i.test(h.city)));
  const hydra = (await q('/sales', 'حيدرة')).data.listings || [];
  check('Arabic commune name «حيدرة» finds Hydra', hydra.length > 0 && hydra.every((l) => l.city === 'Hydra'));
  const bej = (await q('/sales', 'بجايه')).data.listings || [];
  check('spelling variants (ة/ه) still match', bej.length > 0);
}

describe('Rooms listed when adding a hotel');
{
  const hotelier = await register('owner');
  const base = { name: `Hôtel Chambres ${uid}`, description: 'Test', wilaya: 'Biskra', city: 'Lichana', starRating: 3, type: 'Économique', images: [PNG] };
  const rooms = [
    { type: 'single', capacity: 1, pricePerNight: 4500, quantity: 6 },
    { type: 'double', capacity: 2, pricePerNight: 7000, quantity: 10, hotel: 'hack', status: 'x' },
    { type: 'family', capacity: 5, pricePerNight: 12000, quantity: 2 },
  ];
  const ok = await req('POST', '/hotels', { token: hotelier.token, form: { ...base, rooms } });
  expectStatus('hotel created with its room list', ok, 201);
  check('3 room types created', ok.data.rooms?.length === 3);
  check('rooms belong to the new hotel (no injected fields)', ok.data.rooms?.every((r) => r.hotel === ok.data.hotel?._id));
  check('room defaults (titles, quantities)', ok.data.rooms?.[0]?.title === 'Chambre simple' && ok.data.rooms?.[1]?.quantity === 10 && ok.data.rooms?.[2]?.capacity === 5);
  const bad = await req('POST', '/hotels', { token: hotelier.token, form: { ...base, name: `Bad ${uid}`, rooms: [{ type: 'single', pricePerNight: 0 }] } });
  expectStatus('room without a price rejected', bad, 400);
  check('nothing created when a room is invalid', !(await req('GET', '/hotels/my/list', { token: hotelier.token })).data.hotels?.some((h) => h.name === `Bad ${uid}`));
  expectStatus('unknown room type rejected', await req('POST', '/hotels', { token: hotelier.token, form: { ...base, rooms: [{ type: 'penthouse', pricePerNight: 9000 }] } }), 400);
  expectStatus('hotel without rooms still works', await req('POST', '/hotels', { token: hotelier.token, form: { ...base, name: `Sans chambres ${uid}` } }), 201);
}

describe('Forgot password and Google sign-in');
{
  const u = await register('customer');
  const generic = 'If an account exists for this email, a reset link has been sent';
  const unknown = await req('POST', '/auth/forgot-password', { body: { email: `nobody.${uid}@test.dz` } });
  check('unknown email gets the same answer (no account discovery)', unknown.status === 200 && unknown.data.message === generic && !unknown.data.devResetUrl);

  const fp = await req('POST', '/auth/forgot-password', { body: { email: u.email, lang: 'ar' } });
  const link = fp.data.devResetUrl || '';
  const token = new URL(link || 'http://x').searchParams.get('token') || '';
  check('reset link created (dev: returned when SMTP is off)', fp.status === 200 && /\/reset-password\?token=[a-f0-9]{64}&lang=ar$/.test(link), link);
  check('reset token never exposed on the user', !JSON.stringify(fp.data).includes('resetPassword'));

  expectStatus('wrong reset token rejected', await req('POST', '/auth/reset-password', { body: { token: 'a'.repeat(64), password: 'nouveau123' } }), 400);
  expectStatus('too short new password rejected', await req('POST', '/auth/reset-password', { body: { token, password: '123' } }), 400);

  await new Promise((r) => setTimeout(r, 1100)); // JWT times are in seconds: the old token must be strictly older
  const rp = await req('POST', '/auth/reset-password', { body: { token, password: 'nouveau123' } });
  expectStatus('password reset with the emailed token', rp, 200);
  check('reset logs the user in', Boolean(rp.data.token) && rp.data.user?.email === u.email);
  check('new password works', Boolean(await login(u.email, 'nouveau123')));
  check('old password no longer works', !(await login(u.email, 'secret123')));
  expectStatus('sessions from before the reset are logged out', await req('GET', '/auth/me', { token: u.token }), 401);
  expectStatus('new session works', await req('GET', '/auth/me', { token: rp.data.token }), 200);
  expectStatus('reset link is single-use', await req('POST', '/auth/reset-password', { body: { token, password: 'encore123' } }), 400);

  await new Promise((r) => setTimeout(r, 1100));
  const up = await req('PUT', '/auth/update-profile', { token: rp.data.token, body: { password: 'profil123' } });
  check('changing the password in the profile returns a fresh session', up.status === 200 && Boolean(up.data.token));
  expectStatus('…which keeps working', await req('GET', '/auth/me', { token: up.data.token }), 200);

  expectStatus('Google sign-in needs a credential', await req('POST', '/auth/google', { body: {} }), 400);
  const g = await req('POST', '/auth/google', { body: { credential: 'not-a-real-token' } });
  check('Google sign-in: 503 when not configured, 401 for a bad token', g.status === 503 || g.status === 401, String(g.status));
}

describe('Audit regressions: double booking, bad input, abuse limits');
{
  // Concurrent requests for the same dates must not overbook (they used to all be accepted)
  const guests = await Promise.all(Array.from({ length: 8 }, () => register('customer')));
  const house = (await req('GET', '/houses?limit=50')).data.houses.find((h) => !h.policies?.instantBooking) || (await req('GET', '/houses')).data.houses[0];
  const burst = await Promise.all(guests.map((g) => req('POST', '/bookings/house', { token: g.token, body: { houseId: house._id, checkIn: day(300), checkOut: day(302) } })));
  check('8 simultaneous bookings of one house → exactly 1 accepted', burst.filter((r) => r.status === 201).length === 1, burst.map((r) => r.status).join(','));
  check('…the others get 409', burst.filter((r) => r.status === 409).length === 7);

  const hotelsList = (await req('GET', '/hotels?limit=50')).data.hotels;
  let room;
  for (const h of hotelsList) {
    room = ((await req('GET', `/hotels/${h._id}/rooms`)).data.rooms || []).sort((a, b) => a.quantity - b.quantity)[0];
    if (room) break;
  }
  const burst2 = await Promise.all(guests.map((g) => req('POST', '/bookings', { token: g.token, body: { roomId: room._id, checkIn: day(310), checkOut: day(311) } })));
  const okRooms = burst2.filter((r) => r.status === 201).length;
  check(`8 simultaneous bookings of a room type with ${room.quantity} unit(s) → no overbooking`, okRooms === Math.min(8, room.quantity), `${okRooms} accepted`);

  expectStatus('stay longer than 365 nights rejected', await req('POST', '/bookings/house', { token: guests[0].token, body: { houseId: house._id, checkIn: day(400), checkOut: day(800) } }), 400);

  // Pagination and filters can't be abused
  const all = await req('GET', '/hotels?limit=0');
  check('?limit=0 no longer means "everything"', all.status === 200 && all.data.count <= 12 && Number.isFinite(all.data.pages));
  const neg = await req('GET', '/houses?limit=-5&page=abc');
  check('negative limit / bad page fall back to defaults', neg.status === 200 && neg.data.page === 1 && Number.isFinite(neg.data.pages));
  check('?limit=999 capped at 50', (await req('GET', '/sales?limit=999')).data.count <= 50);
  expectStatus('non-numeric minStars ignored (was 500)', await req('GET', '/hotels?minStars=abc'), 200);
  expectStatus('non-numeric minPrice ignored (was 500)', await req('GET', '/sales?minPrice=abc'), 200);
  expectStatus('malformed priceRanges ignored (was 500)', await req('GET', '/sales?priceRanges%5B0%5D%5Bx%5D=1'), 200);
  const op = await req('GET', '/hotels?type%5B%24ne%5D=x');
  check('query operator ?type[$ne]= is not executed', op.status === 400 || (op.status === 200 && op.data.count === 0), String(op.status));

  // NoSQL injection on login: operators are stripped, the request is rejected
  const inj = await req('POST', '/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } });
  check('login with {"$gt": ""} rejected', inj.status === 400 && !inj.data.token);

  // Cross-site requests are refused (also blocks form posts riding on the cookie)
  const foreign = await fetch(`${API}/health`, { headers: { Origin: 'https://evil.example' } });
  expectStatus('request from a foreign origin refused with 403 (was 500)', { status: foreign.status, data: {} }, 403);

  // Contact form: validated
  expectStatus('contact form: missing fields rejected', await req('POST', '/messages', { body: { name: 'A' } }), 400);
  expectStatus('contact form: 10 000-character message rejected', await req('POST', '/messages', { body: { name: 'Amel', email: 'amel@test.dz', phone: '0661 98 76 54', subject: 'Question', content: 'x'.repeat(10000) } }), 400);
  expectStatus('contact form: valid message accepted', await req('POST', '/messages', { body: { name: 'Amel', email: 'amel@test.dz', phone: '0661 98 76 54', subject: 'Question', content: 'Bonjour, une question.' } }), 201);

  // Password guessing: 20 failed logins per account and IP, then 429 — other accounts unaffected
  const victim = `victim.${uid}@test.dz`;
  let last;
  for (let i = 0; i < 21; i++) last = await req('POST', '/auth/login', { body: { email: victim, password: `guess${i}` } });
  expectStatus('21st failed login on one account → 429', last, 429);
  expectStatus('another account can still log in', await req('POST', '/auth/login', { body: { email: 'sara@example.com', password: 'pass123' } }), 200);

  // Public hotel page: the owner's name only, never their email/phone
  const pubHotel = (await req('GET', `/hotels/${hotelsList[0]._id}`)).data.hotel;
  check('public hotel hides the owner email and phone', pubHotel?.owner?.fullName && !pubHotel.owner.email && !pubHotel.owner.phone, JSON.stringify(pubHotel?.owner));

  // Footer destinations: counted server-side, small answer
  const pop = await req('GET', '/wilayas/popular?limit=5');
  check('popular wilayas: ≤ 5 rows of { wilaya, count }, most listings first', pop.status === 200 && pop.data.wilayas.length <= 5 && pop.data.wilayas.every((w, i, a) => typeof w.wilaya === 'string' && w.count > 0 && (i === 0 || a[i - 1].count >= w.count)), JSON.stringify(pop.data.wilayas));
}

describe('Featured hotels (chosen by the admin)');
{
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const before = await req('GET', '/hotels/featured');
  check('home page section works before any choice (best-rated fallback)', before.status === 200 && before.data.chosen === false && before.data.count > 0);

  expectStatus('customer cannot see hotel demand', await req('GET', '/admin/hotels/demand', { token: customer.token }), 403);
  expectStatus('customer cannot choose featured hotels', await req('PUT', '/admin/hotels/featured', { token: customer.token, body: { ids: [] } }), 403);

  const demand = await req('GET', '/admin/hotels/demand?days=0', { token: admin });
  const rows = demand.data.hotels || [];
  check('demand: approved hotels with request counts, most requested first', demand.status === 200 && rows.length > 1 && rows.every((h, i) => typeof h.requests === 'number' && (i === 0 || rows[i - 1].requests >= h.requests)));
  check('demand: booking requests are counted', rows.some((h) => h.requests > 0) && rows.every((h) => h.confirmed <= h.requests));

  const [a, b] = [rows[1]._id, rows[0]._id];
  expectStatus('admin saves a selection', await req('PUT', '/admin/hotels/featured', { token: admin, body: { ids: [a, b] } }), 200);
  const after = await req('GET', '/hotels/featured');
  check('home page shows exactly the selection, in the chosen order', after.data.chosen === true && after.data.hotels.map((h) => h._id).join() === [a, b].join());
  check('featured hotels carry their "from" price', after.data.hotels.every((h) => 'price' in h));
  check('demand lists the selection in order', (await req('GET', '/admin/hotels/demand', { token: admin })).data.featured.join() === [a, b].join());

  const tooMany = Array.from({ length: 13 }, (_, i) => `65a0000000000000000000${String(i).padStart(2, '0')}`);
  expectStatus('more than 12 hotels rejected', await req('PUT', '/admin/hotels/featured', { token: admin, body: { ids: tooMany } }), 400);
  expectStatus('unknown / unpublished hotel rejected', await req('PUT', '/admin/hotels/featured', { token: admin, body: { ids: ['65a000000000000000000001'] } }), 400);
  expectStatus('ids must be a list', await req('PUT', '/admin/hotels/featured', { token: admin, body: { ids: 'x' } }), 400);
  check('a rejected save leaves the selection unchanged', (await req('GET', '/hotels/featured')).data.hotels.map((h) => h._id).join() === [a, b].join());

  expectStatus('admin clears the selection', await req('PUT', '/admin/hotels/featured', { token: admin, body: { ids: [] } }), 200);
  check('back to the best-rated fallback', (await req('GET', '/hotels/featured')).data.chosen === false);
}

describe('Profile photo (every role)');
{
  const putAvatar = async (token, file, name = 'me.png') => {
    const fd = new FormData();
    if (file) fd.append('avatar', file, name);
    const r = await fetch(`${API}/auth/avatar`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };
  const adminToken = await login('admin@hotelsdz.dz', 'admin123');
  const people = {
    customer: customer.token,
    owner: (await register('owner')).token,
    seller: (await register('seller')).token,
    admin: adminToken,
  };
  for (const [role, token] of Object.entries(people)) {
    const r = await putAvatar(token, PNG);
    check(`${role} adds a profile photo`, r.status === 200 && Boolean(r.data.user?.avatar?.url), `${r.status} ${r.data.message || ''}`);
  }
  const me = (await req('GET', '/auth/me', { token: people.seller })).data.user;
  check('the photo is part of the logged-in user', Boolean(me?.avatar?.url));
  const img = await fetch(new URL(me.avatar.url, API.replace(/\/api\/v1$/, '/')));
  check('the photo is served as an image', img.ok && (img.headers.get('content-type') || '').startsWith('image/'), `${img.status} ${img.headers.get('content-type')}`);

  const first = me.avatar.url;
  const again = await putAvatar(people.seller, PNG);
  check('a new photo replaces the old one', again.status === 200 && again.data.user.avatar.url !== first);

  expectStatus('no file → 400', await putAvatar(people.customer, null), 400);
  expectStatus('not an image → 400', await putAvatar(people.customer, new Blob(['hello'], { type: 'text/plain' }), 'x.txt'), 400);
  expectStatus('more than 2 MB → 400 (not 500)', await putAvatar(people.customer, new Blob([new Uint8Array(2 * 1024 * 1024 + 10)], { type: 'image/png' })), 400);
  expectStatus('visitor cannot upload a photo', await putAvatar('', PNG), 401);

  const del = await req('DELETE', '/auth/avatar', { token: people.customer });
  check('photo removed (back to the initial)', del.status === 200 && !del.data.user?.avatar?.url);
}

describe('Meta catalog feed (Facebook / Instagram catalog ads)');
{
  const r = await fetch(`${API}/feeds/meta-catalog.csv`);
  const csv = (await r.text()).replace(/^﻿/, '');
  const [head, ...lines] = csv.trim().split('\n');
  check('feed is a public CSV', r.ok && (r.headers.get('content-type') || '').startsWith('text/csv'));
  check('feed has the Meta product columns', ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'].every((c) => head.split(',').includes(c)), head);
  check('hotels, houses and properties for sale are all in it', ['hotel-', 'house-', 'sale-'].every((p) => lines.some((l) => l.startsWith(p))));
  check('every item has a price in DZD, a photo URL and a tracked link', lines.every((l) => / DZD,/.test(l) && /,https?:\/\/[^,]+utm_source=facebook[^,]*,https?:\/\//.test(l)));

  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const pending = (await req('GET', '/admin/houses/all?status=pending', { token: admin })).data.houses || [];
  check('unpublished listings are left out', pending.length > 0 && pending.every((h) => !csv.includes(`house-${h._id}`)));

  const ar = await (await fetch(`${API}/feeds/meta-catalog.csv?lang=ar`)).text();
  check('Arabic catalog: Arabic place names and /ar links', /[؀-ۿ]/.test(ar) && /\/ar\/(hotels|houses|sales)\//.test(ar));
}

describe('Listing reels (videos)');
{
  const putReel = async (token, kind, id, blob, duration = '12', name = 'tour.mp4', size = { width: 1080, height: 1920 }) => {
    const fd = new FormData();
    if (blob) fd.append('video', blob, name);
    if (duration !== null) fd.append('duration', duration);
    if (size) {
      fd.append('width', String(size.width));
      fd.append('height', String(size.height));
    }
    const r = await fetch(`${API}/reels/${kind}/${id}`, { method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };
  const MP4 = new Blob([new Uint8Array(2048)], { type: 'video/mp4' }); // content isn't decoded server-side

  const feed = await req('GET', '/reels?limit=20');
  check('public feed: published reels of published listings', feed.status === 200 && feed.data.reels.length >= 3 && feed.data.reels.every((r) => r.reel.url && ['hotel', 'house', 'sale'].includes(r.kind)));
  check('feed is newest first', feed.data.reels.every((r, i, a) => i === 0 || new Date(a[i - 1].reel.uploadedAt) >= new Date(r.reel.uploadedAt)));
  check('reels waiting for the admin are not public', !feed.data.reels.some((r) => r.title === 'Riad Tlemcen'));
  const sales = await req('GET', '/reels?type=sales');
  check('category filter (sales only)', sales.data.reels.length > 0 && sales.data.reels.every((r) => r.kind === 'sale'));
  check('feed cards carry price and listing photo', feed.data.reels.every((r) => 'price' in r && typeof r.image === 'string'));

  // Wilaya filter (with or without a category)
  const wl = await req('GET', '/reels/wilayas');
  check('wilayas with reels, with counts', wl.status === 200 && wl.data.wilayas.length > 0 && wl.data.wilayas.every((w) => w.wilaya && w.count > 0) && wl.data.total === feed.data.total);
  const top = wl.data.wilayas[0];
  const inWilaya = await req('GET', `/reels?wilaya=${encodeURIComponent(top.wilaya)}&limit=20`);
  check(`?wilaya=${top.wilaya}: only that wilaya, all categories`, inWilaya.data.reels.length === top.count && inWilaya.data.reels.every((r) => r.wilaya === top.wilaya));
  const lower = await req('GET', `/reels?wilaya=${encodeURIComponent(top.wilaya.toLowerCase())}&limit=20`);
  check('wilaya filter ignores case / accents', lower.data.reels.length === top.count);
  const both = await req('GET', '/reels?type=sales&wilaya=Alger&limit=20');
  check('category + wilaya combined', both.data.reels.every((r) => r.kind === 'sale' && r.wilaya === 'Alger'));
  check('no partial matches (« Alg » ≠ Alger)', (await req('GET', '/reels?wilaya=Alg')).data.reels.length === 0);
  const salesWl = await req('GET', '/reels/wilayas?type=sales');
  check('wilaya list follows the category', salesWl.data.total === sales.data.total);

  const ownerToken = await login('owner@hotelsdz.dz', 'owner123');
  const myHouse = (await req('GET', '/houses/my/list', { token: ownerToken })).data.houses.find((h) => h.status === 'approved' && h.reel?.status !== 'pending');
  const up = await putReel(ownerToken, 'house', myHouse._id, MP4);
  check('owner uploads a reel for their house → waits for approval', up.status === 200 && up.data.reel?.status === 'pending' && up.data.reel.duration === 12, `${up.status} ${up.data.message || ''}`);
  check('…not public yet', !(await req('GET', '/reels?type=houses&limit=20')).data.reels.some((r) => r._id === myHouse._id));
  check('…listing itself stays published', (await req('GET', `/houses/${myHouse._id}`)).data.house?.status === 'approved');

  const stranger = await register('owner');
  expectStatus('another owner cannot touch it', await putReel(stranger.token, 'house', myHouse._id, MP4), 403);
  expectStatus('a customer cannot upload reels', await putReel(customer.token, 'house', myHouse._id, MP4), 403);
  expectStatus('visitor cannot upload reels', await putReel('', 'house', myHouse._id, MP4), 401);
  expectStatus('not a video → 400', await putReel(ownerToken, 'house', myHouse._id, new Blob(['x'], { type: 'text/plain' }), '5', 'x.txt'), 400);
  expectStatus('longer than 90 s → 400', await putReel(ownerToken, 'house', myHouse._id, MP4, '120'), 400);
  expectStatus('no file → 400', await putReel(ownerToken, 'house', myHouse._id, null), 400);
  expectStatus('unknown kind → 404', await putReel(ownerToken, 'boat', myHouse._id, MP4), 404);
  // Reels format only
  expectStatus('landscape video (16:9) refused', await putReel(ownerToken, 'house', myHouse._id, MP4, '12', 'tour.mp4', { width: 1920, height: 1080 }), 400);
  expectStatus('square video refused', await putReel(ownerToken, 'house', myHouse._id, MP4, '12', 'tour.mp4', { width: 1080, height: 1080 }), 400);
  expectStatus('3:4 video refused', await putReel(ownerToken, 'house', myHouse._id, MP4, '12', 'tour.mp4', { width: 1080, height: 1440 }), 400);
  expectStatus('too small (360×640) refused', await putReel(ownerToken, 'house', myHouse._id, MP4, '12', 'tour.mp4', { width: 360, height: 640 }), 400);
  expectStatus('missing dimensions refused', await putReel(ownerToken, 'house', myHouse._id, MP4, '12', 'tour.mp4', null), 400);
  expectStatus('shorter than 3 s refused', await putReel(ownerToken, 'house', myHouse._id, MP4, '1'), 400);
  const tall = await putReel(ownerToken, 'house', myHouse._id, MP4, '12', 'tour.mp4', { width: 1170, height: 2532 });
  check('phone-screen 9:19.5 video accepted', tall.status === 200 && tall.data.reel?.width === 1170, `${tall.status} ${tall.data.message || ''}`);

  const admin = await login('admin@hotelsdz.dz', 'admin123');
  expectStatus('customer cannot see the moderation queue', await req('GET', '/admin/reels', { token: customer.token }), 403);
  const queue = await req('GET', '/admin/reels?status=pending', { token: admin });
  check('admin sees the reel waiting', queue.data.reels.some((r) => r._id === myHouse._id && r.owner?.email === 'owner@hotelsdz.dz'));
  expectStatus('admin publishes it', await req('PUT', `/admin/reels/house/${myHouse._id}/approve`, { token: admin }), 200);
  check('…now in the public feed', (await req('GET', '/reels?type=houses&limit=20')).data.reels.some((r) => r._id === myHouse._id));
  check('…and on the listing', (await req('GET', `/houses/${myHouse._id}`)).data.house?.reel?.status === 'approved');
  expectStatus('approving again → 404 (nothing pending)', await req('PUT', `/admin/reels/house/${myHouse._id}/approve`, { token: admin }), 404);

  // Rejection with a reason
  expectStatus('reject needs a reason', await req('PUT', `/admin/reels/house/${myHouse._id}/reject`, { token: admin, body: { reason: ' ' } }), 400);
  expectStatus('owner cannot reject', await req('PUT', `/admin/reels/house/${myHouse._id}/reject`, { token: ownerToken, body: { reason: 'Floue' } }), 403);
  expectStatus('admin rejects with a reason', await req('PUT', `/admin/reels/house/${myHouse._id}/reject`, { token: admin, body: { reason: 'Qualité insuffisante (floue)' } }), 200);
  const mine = (await req('GET', '/houses/my/list', { token: ownerToken })).data.houses.find((h) => h._id === myHouse._id);
  check('owner sees "rejected" and the reason', mine?.reel?.status === 'rejected' && mine.reel.rejectionReason === 'Qualité insuffisante (floue)');
  check('rejected reel is no longer public', !(await req('GET', '/reels?type=houses&limit=20')).data.reels.some((r) => r._id === myHouse._id));
  check('admin "rejected" tab lists it', (await req('GET', '/admin/reels?status=rejected', { token: admin })).data.reels.some((r) => r._id === myHouse._id));
  expectStatus('admin can still publish a rejected reel', await req('PUT', `/admin/reels/house/${myHouse._id}/approve`, { token: admin }), 200);
  check('…published again, reason cleared', (await req('GET', `/houses/${myHouse._id}`)).data.house?.reel?.rejectionReason === '');
  const again = await putReel(ownerToken, 'house', myHouse._id, MP4);
  check('a new upload goes back to review', again.data.reel?.status === 'pending' && again.data.reel.rejectionReason === '');

  expectStatus('owner deletes the reel', await req('DELETE', `/reels/house/${myHouse._id}`, { token: ownerToken }), 200);
  check('…gone from the feed', !(await req('GET', '/reels?type=houses&limit=20')).data.reels.some((r) => r._id === myHouse._id));
  const adminUp = await putReel(admin, 'house', myHouse._id, MP4);
  check('admin uploads are published at once', adminUp.data.reel?.status === 'approved');
  await req('DELETE', `/reels/house/${myHouse._id}`, { token: admin });
}

describe('Investment projects (land or property looking for an investor)');
{
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const list = await req('GET', '/projects');
  check('public list: published projects only', list.status === 200 && list.data.total === 4 && list.data.projects.every((p) => p.status === 'approved' && typeof p.owner === 'string' && p.contactPhone === undefined));
  check('filter by project type', (await req('GET', '/projects?projectType=Agricole')).data.projects.every((p) => p.projectType === 'Agricole'));
  check('filter by wilaya', (await req('GET', '/projects?wilaya=Tipaza')).data.projects.length === 1);
  check('search', (await req('GET', '/projects?q=serres')).data.projects.length === 1);
  check('unknown filter values ignored', (await req('GET', '/projects?projectType=Boat&partnership=x&assetType=Yacht')).data.total === 4);
  const shops = (await req('GET', '/projects?assetType=' + encodeURIComponent('Local commercial'))).data;
  check('filter by property type (not only land)', shops.total === 1 && shops.projects[0].assetType === 'Local commercial');

  const pendingSeed = (await req('GET', '/admin/projects', { token: admin })).data.projects[0];
  expectStatus('pending project hidden from visitors', await req('GET', `/projects/${pendingSeed._id}`), 404);

  // A land owner (any registered user) posts a project
  const landOwner = await register('customer');
  const base = { title: `Terrain test ${uid}`, description: 'Projet de résidence', assetType: 'Terrain', projectType: 'Résidentiel', partnership: 'Construction contre logements', wilaya: 'Oran', city: 'Oran', area: 1500, landDocument: 'Acte notarié', budget: 90000000, ownerShare: 35 };
  const created = await req('POST', '/projects', { token: landOwner.token, form: { ...base, images: [PNG], documents: [PNG] } });
  check('any registered user can post a project → waits for approval', created.status === 201 && created.data.project?.status === 'pending' && /^PRJ-/.test(created.data.project.reference), `${created.status} ${created.data.message || ''}`);
  const pid = created.data.project?._id;
  expectStatus('visitor cannot post', await req('POST', '/projects', { form: base }), 401);
  expectStatus('area is required', await req('POST', '/projects', { token: landOwner.token, form: { ...base, area: '' } }), 400);
  expectStatus('unknown project type rejected', await req('POST', '/projects', { token: landOwner.token, form: { ...base, projectType: 'Casino' } }), 400);
  expectStatus('unknown property type rejected', await req('POST', '/projects', { token: landOwner.token, form: { ...base, assetType: 'Bateau' } }), 400);
  expectStatus('photo of the ownership document required', await req('POST', '/projects', { token: landOwner.token, form: { ...base, images: [PNG] } }), 400);
  expectStatus('at most 2 document photos', await req('POST', '/projects', { token: landOwner.token, form: { ...base, images: [PNG], documents: [PNG, PNG, PNG] } }), 400);
  const regularising = await req('POST', '/projects', { token: landOwner.token, form: { ...base, landDocument: 'En cours de régularisation', images: [PNG] } });
  check('papers being regularised: no document photo needed', regularising.status === 201, String(regularising.status));
  if (regularising.data.project) await req('DELETE', `/projects/${regularising.data.project._id}`, { token: landOwner.token });
  expectStatus('"other" property must say what it is', await req('POST', '/projects', { token: landOwner.token, form: { ...base, assetType: 'Autre bien', images: [PNG], documents: [PNG] } }), 400);
  const other = await req('POST', '/projects', { token: landOwner.token, form: { ...base, assetType: 'Autre bien', assetOther: 'Station-service', images: [PNG], documents: [PNG] } });
  check('"other" property saved with its description', other.status === 201 && other.data.project?.assetOther === 'Station-service');
  if (other.data.project) await req('DELETE', `/projects/${other.data.project._id}`, { token: landOwner.token });
  expectStatus('"other" document must be named', await req('POST', '/projects', { token: landOwner.token, form: { ...base, landDocument: 'Autre', images: [PNG], documents: [PNG] } }), 400);
  const mineView = await req('GET', `/projects/${pid}`, { token: landOwner.token });
  check('owner sees their pending project with the document photo', mineView.status === 200 && mineView.data.project?.documentImages?.length === 1);
  check('not public before approval', !(await req('GET', '/projects?limit=50')).data.projects.some((p) => p._id === pid));
  check('"my projects" lists it', (await req('GET', '/projects/mine', { token: landOwner.token })).data.projects.some((p) => p._id === pid));

  const stranger = await register('customer');
  expectStatus('someone else cannot edit it', await req('PUT', `/projects/${pid}`, { token: stranger.token, body: { title: 'Piraté' } }), 403);
  expectStatus('customer cannot moderate', await req('PUT', `/admin/projects/${pid}/approve`, { token: landOwner.token }), 403);
  expectStatus('reject needs a reason', await req('PUT', `/admin/projects/${pid}/reject`, { token: admin, body: {} }), 400);
  await req('PUT', `/admin/projects/${pid}/reject`, { token: admin, body: { reason: 'Photos du terrain manquantes' } });
  check('owner sees the rejection reason', (await req('GET', '/projects/mine', { token: landOwner.token })).data.projects.find((p) => p._id === pid)?.rejectionReason === 'Photos du terrain manquantes');
  const edited = await req('PUT', `/projects/${pid}`, { token: landOwner.token, body: { title: `Terrain test corrigé ${uid}` } });
  check('editing sends it back to review, reason cleared', edited.data.project?.status === 'pending' && edited.data.project.rejectionReason === '');
  expectStatus('admin approves', await req('PUT', `/admin/projects/${pid}/approve`, { token: admin }), 200);
  check('now public', (await req('GET', '/projects?limit=50')).data.projects.some((p) => p._id === pid));
  check('document photos never public (page)', (await req('GET', `/projects/${pid}`)).data.project?.documentImages === undefined);
  check('document photos never public (list)', (await req('GET', '/projects?limit=50')).data.projects.every((p) => p.documentImages === undefined));
  check('…not even for another member', (await req('GET', `/projects/${pid}`, { token: stranger.token })).data.project?.documentImages === undefined);
  check('admin sees the document photo (verification)', (await req('GET', '/admin/projects?status=approved', { token: admin })).data.projects.find((p) => p._id === pid)?.documentImages?.length === 1);
  expectStatus('removing the last document photo is refused', await req('PUT', `/projects/${pid}`, { token: landOwner.token, form: { keepDocuments: '[]' } }), 400);
  check('…and nothing was changed', (await req('GET', `/projects/${pid}`, { token: landOwner.token })).data.project?.documentImages?.length === 1);

  // Investors' requests
  const interest = { name: 'Investisseur Test', phone: '0555 98 76 54', email: 'invest@test.dz', amount: 50000000, message: 'Projet intéressant, je souhaite en discuter.' };
  expectStatus('investor (visitor) sends an interest request', await req('POST', `/projects/${pid}/interest`, { body: interest }), 201);
  expectStatus('…phone number required', await req('POST', `/projects/${pid}/interest`, { body: { ...interest, phone: '' } }), 400);
  expectStatus('…message too short', await req('POST', `/projects/${pid}/interest`, { body: { ...interest, message: 'Salut' } }), 400);
  expectStatus('owner cannot answer their own project', await req('POST', `/projects/${pid}/interest`, { token: landOwner.token, body: interest }), 400);
  expectStatus('no request on an unpublished project', await req('POST', `/projects/${pendingSeed._id}/interest`, { body: interest }), 404);
  check('unread request counted in "my projects"', (await req('GET', '/projects/mine', { token: landOwner.token })).data.projects.find((p) => p._id === pid)?.unreadInterests === 1);
  const received = await req('GET', `/projects/${pid}/interests`, { token: landOwner.token });
  check('owner sees the message and amount, not who sent it (Meskan is the intermediary)', received.data.interests?.[0]?.amount === 50000000 && received.data.interests[0].phone === undefined && received.data.interests[0].name === undefined);
  const inbox = (await req('GET', '/admin/project-interests', { token: admin })).data.interests || [];
  const mine = inbox.find((i) => String(i.project?._id) === String(pid));
  check('admin sees both parties: the investor…', mine?.phone === '0555 98 76 54' && mine?.name === 'Investisseur Test');
  check('…and the publisher\'s private contact', mine?.project?.owner?.email === landOwner.email);
  expectStatus('admin marks it handled', await req('PUT', `/admin/project-interests/${mine?._id}/seen`, { token: admin, body: { seen: true } }), 200);
  expectStatus('only admins read all requests', await req('GET', '/admin/project-interests', { token: landOwner.token }), 403);
  const pub = await req('GET', `/projects/${pid}`);
  check('project page: no publisher contact, Meskan\'s contact instead', pub.data.project?.contactPhone === undefined && typeof pub.data.project?.owner === 'string' && pub.data.contact && 'phone' in pub.data.contact);

  // Capital holders publish what they look for
  const capital = await req('POST', '/projects', { token: stranger.token, body: { kind: 'capital', title: `Je cherche un terrain ${uid}`, assetType: 'Terrain', projectType: 'Résidentiel', partnership: 'À discuter', wilaya: 'Oran', city: '', area: 800, areaMax: 2000, budgetMin: 5000000, budget: 20000000 } });
  check('an investor publishes a search: no commune, papers or photos needed', capital.status === 201 && capital.data.project?.kind === 'capital' && capital.data.project?.areaMax === 2000, `${capital.status} ${capital.data.message || ''}`);
  await req('PUT', `/admin/projects/${capital.data.project?._id}/approve`, { token: admin });
  check('listed with investors\' searches only', (await req('GET', '/projects?kind=capital')).data.projects.some((p) => p._id === capital.data.project?._id) && !(await req('GET', '/projects?limit=50')).data.projects.some((p) => p._id === capital.data.project?._id));
  if (capital.data.project) await req('DELETE', `/projects/${capital.data.project._id}`, { token: stranger.token });
  expectStatus('others cannot read the requests', await req('GET', `/projects/${pid}/interests`, { token: stranger.token }), 403);
  check('interest counter on the project', (await req('GET', `/projects/${pid}`)).data.project?.interestsCount === 1);

  expectStatus('owner deletes the project', await req('DELETE', `/projects/${pid}`, { token: landOwner.token }), 200);
  expectStatus('…gone', await req('GET', `/projects/${pid}`), 404);
}

describe('Investor space');
{
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const inv = await register('investor');
  check('anyone can sign up as an investor', inv.status === 201 && inv.user?.role === 'investor', String(inv.status));
  const cust = await register('customer');
  expectStatus('customer has no investor space', await req('GET', '/investor/dashboard', { token: cust.token }), 403);
  expectStatus('visitor has no investor space', await req('GET', '/investor/dashboard'), 401);

  const empty = (await req('GET', '/investor/dashboard', { token: inv.token })).data;
  check('new investor: no preferences → every published project matches', empty.stats?.matches === 4 && empty.stats.requests === 0 && empty.stats.saved === 0);

  expectStatus('unknown property type in preferences rejected', await req('PUT', '/investor/preferences', { token: inv.token, body: { assetTypes: ['Bateau'] } }), 400);
  await req('PUT', '/investor/preferences', { token: inv.token, body: { wilayas: ['Alger'], assetTypes: ['Local commercial'], projectTypes: [], maxBudget: 30000000 } });
  const prefs = (await req('GET', '/investor/dashboard', { token: inv.token })).data;
  check('"projects for you" follow the preferences', prefs.stats.matches === 1 && prefs.matches[0]?.assetType === 'Local commercial' && prefs.prefs.wilayas[0] === 'Alger');

  const shop = prefs.matches[0];
  expectStatus('save a published project', await req('POST', `/investor/saved/${shop._id}`, { token: inv.token }), 200);
  await req('POST', `/investor/saved/${shop._id}`, { token: inv.token }); // twice → still one
  const saved = (await req('GET', '/investor/saved', { token: inv.token })).data;
  check('saved list (no duplicates)', saved.projects.length === 1 && saved.ids.length === 1);
  const pendingSeed = (await req('GET', '/admin/projects', { token: admin })).data.projects.find((p) => p.status === 'pending');
  if (pendingSeed) expectStatus('cannot save an unpublished project', await req('POST', `/investor/saved/${pendingSeed._id}`, { token: inv.token }), 404);
  await req('DELETE', `/investor/saved/${shop._id}`, { token: inv.token });
  check('unsave', (await req('GET', '/investor/saved', { token: inv.token })).data.projects.length === 0);

  await req('POST', `/projects/${shop._id}/interest`, { token: inv.token, body: { name: 'Test investor', phone: '0555000000', message: 'Je suis intéressé par ce local.' } });
  const sent = (await req('GET', '/investor/requests', { token: inv.token })).data.requests;
  check('the investor sees the request they sent, with the project', sent.length === 1 && sent[0].project?._id === shop._id && sent[0].seen === false);
  check('investor can book a stay too (not refused by role)', (await req('POST', '/bookings', { token: inv.token, body: {} })).status !== 403);
  const stats = (await req('GET', '/admin/stats', { token: admin })).data;
  check('admin stats count investors', (stats.stats?.investors ?? stats.investors) >= 1);
}

describe('One account, every space (switch freely)');
{
  const me = await register('customer');
  expectStatus('traveller cannot open the seller space yet', await req('GET', '/seller/stats', { token: me.token }), 403);
  const toSeller = await req('PUT', '/auth/space', { token: me.token, body: { role: 'seller' } });
  check('switch to seller', toSeller.status === 200 && toSeller.data.user?.role === 'seller');
  expectStatus('…the seller space opens with the same token', await req('GET', '/seller/stats', { token: me.token }), 200);
  await req('PUT', '/auth/space', { token: me.token, body: { role: 'investor' } });
  expectStatus('switch to investor → investor space', await req('GET', '/investor/dashboard', { token: me.token }), 200);
  await req('PUT', '/auth/space', { token: me.token, body: { role: 'owner' } });
  expectStatus('switch to host → host space', await req('GET', '/owner/stats', { token: me.token }), 200);
  expectStatus('cannot switch to admin', await req('PUT', '/auth/space', { token: me.token, body: { role: 'admin' } }), 400);
  expectStatus('visitor cannot switch', await req('PUT', '/auth/space', { body: { role: 'owner' } }), 401);
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  expectStatus('admin keeps the admin role', await req('PUT', '/auth/space', { token: admin, body: { role: 'customer' } }), 403);
  check('back to traveller', (await req('PUT', '/auth/space', { token: me.token, body: { role: 'customer' } })).data.user?.role === 'customer');
}

describe('"How did you hear about us?" (welcome notification)');
{
  const admin = await login('admin@hotelsdz.dz', 'admin123');
  const before = (await req('GET', '/admin/referrals', { token: admin })).data;
  check('admin sees answers per source (every source listed)', before.sources?.length === 8 && before.total >= 29);
  expectStatus('a visitor answers', await req('POST', '/referrals', { body: { source: 'TikTok', lang: 'ar', page: '/ar' } }), 201);
  expectStatus('"other" with details', await req('POST', '/referrals', { body: { source: 'Autre', other: 'Radio Algérie', lang: 'fr' } }), 201);
  expectStatus('unknown source rejected', await req('POST', '/referrals', { body: { source: 'Pigeon' } }), 400);
  expectStatus('source required', await req('POST', '/referrals', { body: {} }), 400);
  const after = (await req('GET', '/admin/referrals', { token: admin })).data;
  check('answers reach the admin', after.total === before.total + 2 && after.sources.find((s) => s.source === 'TikTok').count === before.sources.find((s) => s.source === 'TikTok').count + 1);
  check('latest answers with the "other" details', after.latest?.[0]?.other === 'Radio Algérie' || after.latest?.[1]?.other === 'Radio Algérie');
  check('period filter', (await req('GET', '/admin/referrals?days=7', { token: admin })).data.total <= after.total);
  const cust = await register('customer');
  expectStatus('only the admin reads the answers', await req('GET', '/admin/referrals', { token: cust.token }), 403);
}

describe('No online payment');
{
  const r = await fetch(`${API}/payments/webhook`, { method: 'POST', body: '{}' });
  check('payment webhook endpoint removed', r.status === 404);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
