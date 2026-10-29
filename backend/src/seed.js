/**
 * Seed script — populates the database with demo data so the admin
 * dashboard, owner dashboard and search pages have something to show.
 *
 * Run with:  npm run seed
 * WARNING: this wipes the existing collections below before inserting.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Hotel from './models/Hotel.js';
import House from './models/House.js';
import Room from './models/Room.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';
import Message from './models/Message.js';
import Testimonial from './models/Testimonial.js';
import SupportThread from './models/SupportThread.js';
import HouseForSale from './models/HouseForSale.js';
import InvestmentProject from './models/InvestmentProject.js';
import InvestorInterest from './models/InvestorInterest.js';
import Referral from './models/Referral.js';
import { ENABLED_COUNTRIES } from './utils/countries.js';

const img = (id) => ({
  url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`,
  publicId: `seed/${id}`,
});

const HOTELS = [
  { name: 'Sofitel Algiers Hamma', wilaya: 'Alger', city: 'Alger', type: 'Luxe', starRating: 5, photo: '1566073771259-6a8506099945', lat: 36.7460, lng: 3.0626 },
  { name: 'Le Méridien Oran', wilaya: 'Oran', city: 'Oran', type: 'Affaires', starRating: 5, photo: '1571896349842-33c89424de2d', lat: 35.6969, lng: -0.6331 },
  { name: 'Marriott Constantine', wilaya: 'Constantine', city: 'Constantine', type: 'Affaires', starRating: 5, photo: '1582719508461-905c673771fd', lat: 36.3650, lng: 6.6147 },
  { name: 'Riad El Kahina', wilaya: 'Tlemcen', city: 'Tlemcen', type: 'Riad', starRating: 4, photo: '1578683010236-d716f9a3f461', lat: 34.8828, lng: -1.3167 },
  { name: 'Sheraton Club des Pins', wilaya: 'Alger', city: 'Staoueli', type: 'Balnéaire', starRating: 5, photo: '1520250497591-112f2f40a3f4', lat: 36.7500, lng: 2.8833 },
  { name: 'Gourara Timimoun', wilaya: 'Timimoun', city: 'Timimoun', type: 'Désert', starRating: 3, photo: '1469474968028-56623f02e42e', lat: 29.2639, lng: 0.2306 },
];

const ROOM_TYPES = [
  { type: 'single', title: 'Chambre Simple', pricePerNight: 8500, capacity: 1, bedsCount: 1, quantity: 5 },
  { type: 'double', title: 'Chambre Double', pricePerNight: 14000, capacity: 2, bedsCount: 2, quantity: 8 },
  { type: 'suite', title: 'Suite Exécutive', pricePerNight: 28000, capacity: 3, bedsCount: 2, quantity: 3 },
  { type: 'family', title: 'Chambre Familiale', pricePerNight: 22000, capacity: 6, bedsCount: 3, quantity: 4 },
];

const HOUSES = [
  { name: 'Villa Yasmine', wilaya: 'Alger', city: 'Alger', type: 'Villa', rooms: 4, bathrooms: 2, capacity: 8, pricePerNight: 15000, photo: '1564013799919-ab600027ffc6', lat: 36.7372, lng: 3.0866 },
  { name: 'Chalet Tikjda', wilaya: 'Bouira', city: 'Bouira', type: 'Chalet', rooms: 3, bathrooms: 1, capacity: 6, pricePerNight: 9000, photo: '1518780664697-55e3ad937233', lat: 36.3750, lng: 3.9000 },
  { name: 'Appartement Vue Mer', wilaya: 'Béjaïa', city: 'Béjaïa', type: 'Appartement', rooms: 2, bathrooms: 1, capacity: 4, pricePerNight: 6000, photo: '1502672260266-1c1ef2d93688', lat: 36.7500, lng: 5.0667 },
  { name: 'Riad Tlemcen', wilaya: 'Tlemcen', city: 'Tlemcen', type: 'Riad', rooms: 3, bathrooms: 2, capacity: 6, pricePerNight: 11000, photo: '1582719478250-c89cae4dc85b', lat: 34.8828, lng: -1.3167 },
  { name: 'Villa Piscine Tipaza', wilaya: 'Tipaza', city: 'Tipaza', type: 'Villa', rooms: 5, bathrooms: 3, capacity: 10, pricePerNight: 22000, photo: '1499793983690-e29da59ef1c2', lat: 36.5894, lng: 2.4433 },
  { name: 'Studio Moderne Oran', wilaya: 'Oran', city: 'Oran', type: 'Studio', rooms: 1, bathrooms: 1, capacity: 2, pricePerNight: 4500, photo: '1522708323590-d24dbb6b0267', lat: 35.6969, lng: -0.6331 },
];

const MESSAGES = [
  { name: 'Mohamed Salah', email: 'mohamed@example.com', phone: '0555 12 34 56', subject: 'Inscrire mon hôtel', content: 'Bonjour, je possède un hôtel à Annaba et je souhaite le référencer sur votre plateforme. Quelles sont les étapes ?' },
  { name: 'Amel Khelifi', email: 'amel@example.com', phone: '0661 98 76 54', subject: 'Question sur une réservation', content: 'Bonjour, est-il possible de modifier les dates de ma réservation après confirmation ? Merci.' },
  { name: 'Reda Bouzid', email: 'reda@example.com', phone: '+213 21 45 67 89', subject: 'Partenariat', content: 'Nous sommes une agence de voyage et aimerions discuter d\'un partenariat. Pouvez-vous me recontacter ?' },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysFromNow = (d) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(12, 0, 0, 0); return x; };

// Seeds the currently-connected database. Caller is responsible for the
// connection lifecycle (so it can run against Atlas or an in-memory Mongo).
export const seedDatabase = async () => {
  console.log('🌱 Seeding database...');

  // Wipe
  await Promise.all([
    User.deleteMany({}), Hotel.deleteMany({}), House.deleteMany({}), Room.deleteMany({}),
    Booking.deleteMany({}), Review.deleteMany({}), Message.deleteMany({}), Testimonial.deleteMany({}), SupportThread.deleteMany({}), HouseForSale.deleteMany({}),
    InvestmentProject.deleteMany({}), InvestorInterest.deleteMany({}), Referral.deleteMany({}),
  ]);

  // --- Users ---
  const admin = await User.create({
    fullName: 'Admin Meskan', email: 'admin@hotelsdz.dz', password: 'admin123',
    phone: '0550000000', role: 'admin', isVerified: true,
  });
  const owner = await User.create({
    fullName: 'Karim Hôtelier', email: 'owner@hotelsdz.dz', password: 'owner123',
    phone: '0551111111', role: 'owner', isVerified: true,
  });
  const customers = await User.create([
    { fullName: 'Sara Benali', email: 'sara@example.com', password: 'pass123', phone: '0560000001', role: 'customer' },
    { fullName: 'Yacine Meziane', email: 'yacine@example.com', password: 'pass123', phone: '0560000002', role: 'customer' },
    { fullName: 'Lina Haddad', email: 'lina@example.com', password: 'pass123', phone: '0560000003', role: 'customer' },
  ]);
  console.log(`👤 Users: 1 admin, 1 owner, ${customers.length} customers`);

  // --- Hotels + Rooms ---
  const allRooms = [];
  for (let i = 0; i < HOTELS.length; i++) {
    const h = HOTELS[i];
    const hotel = await Hotel.create({
      owner: owner._id,
      name: h.name,
      description: `${h.name} — un établissement ${h.type.toLowerCase()} de ${h.starRating} étoiles à ${h.city}.`,
      wilaya: h.wilaya, city: h.city, address: `${h.city}, Algérie`,
      coordinates: { lat: h.lat, lng: h.lng },
      images: [img(h.photo)], amenities: ['Wifi', 'Parking', 'Climatisation', 'Restaurant'],
      starRating: h.starRating, type: h.type,
      // first 4 approved, last 2 pending (so admin has approvals to review)
      status: i < 4 ? 'approved' : 'pending',
    });
    for (const rt of ROOM_TYPES) {
      const room = await Room.create({ ...rt, hotel: hotel._id, images: [img(h.photo)], amenities: ['Wifi', 'TV'] });
      if (hotel.status === 'approved') allRooms.push({ room, hotel });
    }
  }
  console.log(`🏨 Hotels: ${HOTELS.length} (4 approved, 2 pending), ${allRooms.length} rooms`);

  // --- Houses (4 approved, 2 pending) ---
  const createdHouses = [];
  for (let i = 0; i < HOUSES.length; i++) {
    const h = HOUSES[i];
    const house = await House.create({
      owner: owner._id,
      name: h.name,
      description: `${h.name} — un(e) ${h.type.toLowerCase()} de ${h.rooms} chambres pouvant accueillir ${h.capacity} personnes à ${h.city}.`,
      wilaya: h.wilaya, city: h.city, address: `${h.city}, Algérie`,
      coordinates: { lat: h.lat, lng: h.lng },
      images: [img(h.photo)], amenities: ['Wifi', 'Climatisation', 'Parking', 'Cuisine équipée'],
      type: h.type, rooms: h.rooms, bathrooms: h.bathrooms, capacity: h.capacity,
      pricePerNight: h.pricePerNight,
      status: i < 4 ? 'approved' : 'pending',
    });
    createdHouses.push(house);
  }
  console.log(`🏠 Houses: ${HOUSES.length} (4 approved, 2 pending)`);

  // --- Booking policies on a few demo listings (instant booking, free cancellation) ---
  await Hotel.updateOne({ name: 'Sofitel Algiers Hamma' }, { policies: { checkInFrom: '15:00', checkOutUntil: '12:00', freeCancellationDays: 3, instantBooking: true, childrenAllowed: true, petsAllowed: false, smokingAllowed: false } });
  await House.updateOne({ name: 'Villa Yasmine' }, { policies: { checkInFrom: '16:00', checkOutUntil: '11:00', freeCancellationDays: 7, instantBooking: false, childrenAllowed: true, petsAllowed: true, smokingAllowed: false, customRules: ['Familles uniquement', 'Pas de fêtes ni d’événements'] } });

  // --- Outside Algeria (only when those countries are open): prices in TND / MAD ---
  if (ENABLED_COUNTRIES.includes('TN')) {
  const tnHotel = await Hotel.create({
    owner: owner._id,
    name: 'Dar Sousse Médina',
    description: 'Hôtel de charme au cœur de la médina de Sousse, à dix minutes de la plage.',
    country: 'TN', wilaya: 'Sousse', city: 'Sousse', address: 'Médina, Sousse, Tunisie',
    coordinates: { lat: 35.8256, lng: 10.6411 },
    images: [img('1551882547-ff40c63fe5fa')], amenities: ['Wifi', 'Climatisation', 'Petit-déjeuner'],
    starRating: 4, type: 'Boutique', status: 'approved',
    policies: { checkInFrom: '15:00', checkOutUntil: '11:00', freeCancellationDays: 3, instantBooking: true, petsAllowed: true },
  });
  for (const rt of [
    { type: 'double', title: 'Chambre Double', pricePerNight: 180, capacity: 2, bedsCount: 2, quantity: 6 },
    { type: 'suite', title: 'Suite Médina', pricePerNight: 320, capacity: 3, bedsCount: 2, quantity: 2 },
  ]) await Room.create({ ...rt, hotel: tnHotel._id, images: [img('1551882547-ff40c63fe5fa')], amenities: ['Wifi', 'TV'] });
  }
  if (ENABLED_COUNTRIES.includes('MA')) await House.create({
    owner: owner._id,
    name: 'Riad Jardin Marrakech',
    description: 'Riad traditionnel avec patio et piscine, à cinq minutes de la place Jemaa el-Fna.',
    country: 'MA', wilaya: 'Marrakech', city: 'Marrakech', address: 'Médina, Marrakech, Maroc',
    coordinates: { lat: 31.6295, lng: -7.9811 },
    images: [img('1539437829697-1b4ed5aebd19')], amenities: ['Wifi', 'Piscine', 'Climatisation'],
    type: 'Riad', rooms: 4, bathrooms: 3, capacity: 8, pricePerNight: 1400, status: 'approved',
    policies: { checkInFrom: '16:00', checkOutUntil: '10:00', freeCancellationDays: 7, childrenAllowed: true, smokingAllowed: false },
  });
  if (ENABLED_COUNTRIES.length > 1) console.log(`🌍 Abroad: demo listings for ${ENABLED_COUNTRIES.filter((c) => c !== 'DZ').join(', ')}`);

  // --- Properties for sale (realistic prices in DZD) ---
  const seller = await User.create({
    fullName: 'Nadia Immobilier', email: 'vendeur@hotelsdz.dz', password: 'seller123',
    phone: '0552222222', role: 'seller', isVerified: true,
  });
  const SALES = [
    { title: 'Appartement F4 vue sur la baie', type: 'Appartement', wilaya: 'Alger', city: 'Hydra', price: 38000000, area: 120, rooms: 4, bathrooms: 2, lat: 36.7431, lng: 3.0303, photo: '1502672260266-1c1ef2d93688', days: 2, amenities: ['Ascenseur', 'Parking', 'Climatisation'] },
    { title: 'F3 rénové proche du front de mer', type: 'Appartement', wilaya: 'Oran', city: 'Oran', price: 16500000, area: 85, rooms: 3, bathrooms: 1, lat: 35.7058, lng: -0.6497, photo: '1522708323590-d24dbb6b0267', days: 5, amenities: ['Balcon', 'Climatisation'] },
    { title: 'Villa avec jardin et vue mer', type: 'Villa', wilaya: 'Béjaïa', city: 'Tichy', price: 45000000, area: 250, rooms: 6, bathrooms: 3, lat: 36.6667, lng: 5.1667, photo: '1564013799919-ab600027ffc6', days: 12, amenities: ['Jardin', 'Garage', 'Terrasse'] },
    { title: 'Terrain constructible 400 m²', type: 'Terrain', wilaya: 'Tlemcen', city: 'Mansourah', price: 9000000, area: 400, rooms: 0, bathrooms: 0, lat: 34.8667, lng: -1.3333, photo: '1500382017468-9049fed747ef', days: 20, amenities: ['Acte notarié', 'Viabilisé'] },
    { title: 'F2 au centre-ville', type: 'Appartement', wilaya: 'Constantine', city: 'Constantine', price: 9800000, area: 60, rooms: 2, bathrooms: 1, lat: 36.365, lng: 6.6147, photo: '1493809842364-78817add7ffb', days: 1, amenities: ['Ascenseur'] },
    { title: 'Grande villa avec piscine', type: 'Villa', wilaya: 'Tipaza', city: 'Chenoua', price: 62000000, area: 300, rooms: 7, bathrooms: 4, lat: 36.6, lng: 2.4, photo: '1499793983690-e29da59ef1c2', days: 30, amenities: ['Piscine', 'Jardin', 'Garage'] },
    { title: 'Local commercial sur grand boulevard', type: 'Local commercial', wilaya: 'Sétif', city: 'Sétif', price: 14000000, area: 80, rooms: 1, bathrooms: 1, lat: 36.1911, lng: 5.4137, photo: '1497366216548-37526070297c', days: 9, amenities: ['Vitrine', 'Rideau métallique'] },
    { title: 'Duplex lumineux avec terrasse', type: 'Duplex', wilaya: 'Annaba', city: 'Annaba', price: 28000000, area: 160, rooms: 5, bathrooms: 2, lat: 36.9, lng: 7.7667, photo: '1505691938895-1758d7feb511', days: 4, amenities: ['Terrasse', 'Parking', 'Climatisation'] },
  ];
  for (const x of SALES) {
    const listing = await HouseForSale.create({
      seller: seller._id, title: x.title, type: x.type, wilaya: x.wilaya, city: x.city,
      address: `${x.city}, ${x.wilaya}`, price: x.price, area: x.area, rooms: x.rooms, bathrooms: x.bathrooms,
      description: `${x.title} à ${x.city} (${x.wilaya}) : ${x.area} m²${x.rooms ? `, ${x.rooms} pièce(s)` : ''}. Visite sur rendez-vous, papiers en règle.`,
      coordinates: { lat: x.lat, lng: x.lng }, images: [img(x.photo)], amenities: x.amenities,
      contactPhone: seller.phone, contactEmail: seller.email, status: 'approved',
    });
    // spread the publication dates so "Nouveau" (< 7 days) and sorting are visible
    const created = daysFromNow(-x.days);
    await HouseForSale.collection.updateOne({ _id: listing._id }, { $set: { createdAt: created, updatedAt: created } });
  }
  console.log(`🏷️  Sales: ${SALES.length} (seller vendeur@hotelsdz.dz / seller123)`);

  // --- Investment projects: property owners looking for an investor / partner (not selling) ---
  const PROJECTS = [
    { owner: seller, assetType: 'Local commercial', title: 'Local de 250 m² cherche partenaire pour un restaurant', projectType: 'Commercial', partnership: 'Exploitation en commun', wilaya: 'Alger', city: 'Bab Ezzouar', area: 250, landDocument: 'Acte notarié', budget: 25000000, ownerShare: 50, photo: '1517248135467-4c7edcad34c4', status: 'approved',
      description: "Local commercial au rez-de-chaussée, grande vitrine sur un boulevard passant, près de l'université. J'apporte le local, je cherche un associé qui finance l'aménagement et gère le restaurant ; bénéfices partagés à 50/50." },
    { owner: seller, title: 'Terrain en bord de mer pour résidence touristique', projectType: 'Hôtel et tourisme', partnership: 'Partenariat (parts du projet)', wilaya: 'Tipaza', city: 'Cherchell', area: 12000, landDocument: 'Livret foncier', budget: 450000000, ownerShare: 40, photo: '1501785888041-af3ef285b470', status: 'approved',
      description: "Terrain plat de 1,2 ha à 300 m de la plage, accès par route goudronnée. Je cherche un investisseur pour construire un complexe touristique (bungalows + restaurant). J'apporte le terrain, l'investisseur finance la construction ; partage des bénéfices selon les parts." },
    { owner: customers[0], title: 'Lot en centre-ville pour immeuble de logements', projectType: 'Résidentiel', partnership: 'Construction contre logements', wilaya: 'Sétif', city: 'Sétif', area: 900, landDocument: 'Acte notarié', budget: 180000000, photo: '1500382017468-9049fed747ef', status: 'approved',
      description: "Terrain de 900 m² en zone urbaine, permis de construire R+6 possible. Proposition classique : le promoteur construit, je garde une partie des appartements, il vend le reste." },
    { owner: seller, title: 'Terre agricole irriguée pour serres et élevage', projectType: 'Agricole', partnership: 'Location longue durée', wilaya: 'Biskra', city: 'Tolga', area: 50000, landDocument: 'Acte administratif', budget: 60000000, photo: '1500076656116-558758c991c1', status: 'approved',
      description: 'Cinq hectares avec forage et électricité. Idéal pour des serres de primeurs ou un élevage. Location longue durée (20 ans) ou partenariat sur la production.' },
    { owner: customers[1], title: 'Terrain en montagne pour gîte et activités', projectType: 'Hôtel et tourisme', partnership: 'À discuter', wilaya: 'Tizi Ouzou', city: 'Azazga', area: 3000, landDocument: 'En cours de régularisation', budget: 0, photo: '1464822759023-fed622ff2c3b', status: 'pending',
      description: 'Terrain avec vue sur la forêt, pour un gîte écologique et des randonnées.' },
  ];
  const projects = [];
  for (const p of PROJECTS) {
    projects.push(await InvestmentProject.create({
      owner: p.owner._id, assetType: p.assetType || 'Terrain', title: p.title, description: p.description, projectType: p.projectType, partnership: p.partnership,
      wilaya: p.wilaya, city: p.city, area: p.area, landDocument: p.landDocument, budget: p.budget, ownerShare: p.ownerShare,
      images: [img(p.photo)], documentImages: [img('1450101499163-c8848c66ca85')], contactPhone: p.owner.phone || '', contactEmail: p.owner.email, status: p.status,
    }));
  }
  const investor = await User.create({
    fullName: 'Karim Investissements', email: 'investisseur@hotelsdz.dz', password: 'investor123', phone: '0661234567', role: 'investor', isVerified: true,
    savedProjects: [projects[1]._id],
    investorPrefs: { wilayas: ['Alger', 'Tipaza', 'Oran'], assetTypes: [], projectTypes: ['Commercial', 'Hôtel et tourisme'], maxBudget: 500000000 },
  });
  await InvestorInterest.create({
    project: projects[0]._id, owner: seller._id, investor: investor._id, name: investor.fullName, phone: '0661 23 45 67',
    email: investor.email, amount: 15000000, message: 'Bonjour, je finance des restaurants à Alger et votre local m’intéresse. Pouvons-nous le visiter cette semaine ?',
  });
  await InvestmentProject.updateOne({ _id: projects[0]._id }, { $inc: { interestsCount: 1 } });
  console.log(`💼 Projects: ${PROJECTS.length} (3 published, 1 waiting), 1 investor request`);

  // --- 'How did you hear about us?' answers (welcome notification) ---
  const REFERRALS = [['Facebook', 9], ['Instagram', 6], ['TikTok', 5], ['Google', 4], ['Ami ou famille', 3], ['YouTube', 1], ['Autre', 1]];
  await Referral.insertMany(REFERRALS.flatMap(([source, n]) => Array.from({ length: n }, (_, i) => ({
    source, other: source === 'Autre' ? 'Salon de l’immobilier à Alger' : '', lang: i % 2 ? 'ar' : 'fr', page: '/',
    createdAt: daysFromNow(-(i * 3 + 1)),
  }))));
  console.log('📣 Referrals: 29 answers');

  // --- Contact messages ---
  await Message.create(MESSAGES);
  console.log(`✉️  Messages: ${MESSAGES.length}`);

  // --- Demo reels: a free (CC0) sample clip from MDN; real reels are uploaded by owners.
  // No poster: the site shows the listing photo until the video plays.
  const SAMPLE = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower';
  const demoReel = (file, status, minutesAgo) => ({
    reel: { url: `${SAMPLE}.${file}`, publicId: '', poster: '', duration: 5, status, uploadedAt: new Date(Date.now() - minutesAgo * 60000) },
  });
  await Hotel.updateOne({ name: 'Sofitel Algiers Hamma' }, demoReel('mp4', 'approved', 5));
  await Hotel.updateOne({ name: 'Le Méridien Oran' }, demoReel('mp4', 'approved', 40));
  await House.updateOne({ name: 'Villa Yasmine' }, demoReel('webm', 'approved', 15));
  await House.updateOne({ name: 'Riad Tlemcen' }, demoReel('mp4', 'pending', 2)); // waits for the admin
  await HouseForSale.updateOne({ title: 'Villa avec jardin et vue mer' }, demoReel('mp4', 'approved', 25));
  await HouseForSale.updateOne({ title: 'Grande villa avec piscine' }, demoReel('mp4', 'approved', 60));
  console.log('🎬 Reels: 5 published, 1 waiting for the admin');

  // --- Home page testimonials (3 published, 1 waiting for the admin) ---
  await Testimonial.create([
    { user: customers[0]._id, name: customers[0].fullName, title: 'Cliente, Alger', rating: 5, status: 'approved',
      comment: "Réservation très simple : l'hôtel a confirmé ma demande en quelques heures et j'ai payé sur place. Je recommande !" },
    { user: owner._id, name: owner.fullName, title: 'Hôtelier, Oran', rating: 5, status: 'approved',
      comment: "Inscrire mon hôtel a pris dix minutes. Je reçois les demandes directement et je garde le contrôle sur chaque réservation." },
    { user: customers[1]._id, name: customers[1].fullName, title: 'Client, Constantine', rating: 4, status: 'approved',
      comment: "Large choix de maisons dans toutes les wilayas, avec les prix clairs par nuit. Une vraie aide pour les vacances en famille." },
    { user: customers[2]._id, name: customers[2].fullName, title: 'Cliente, Béjaïa', rating: 5, status: 'pending',
      comment: "Super expérience pour notre séjour à Béjaïa, la maison était exactement comme sur les photos." },
  ]);
  console.log('💬 Testimonials: 3 approved, 1 pending');

  // --- A few favorites for the first customer ---
  const fav = customers[0];
  const approvedHotels = await Hotel.find({ status: 'approved' }).limit(2);
  const approvedHouses = createdHouses.filter((h) => h.status === 'approved').slice(0, 2);
  fav.favoriteHotels = approvedHotels.map((h) => h._id);
  fav.favoriteHouses = approvedHouses.map((h) => h._id);
  await fav.save();
  console.log(`❤️  Favorites: ${fav.favoriteHotels.length} hotels + ${fav.favoriteHouses.length} houses for ${fav.email}`);

  // --- Bookings spread over the last 6 months ---
  const statuses = ['confirmed', 'confirmed', 'confirmed', 'completed', 'pending', 'cancelled'];
  let bookingCount = 0;
  for (let m = 5; m >= 0; m--) {
    const perMonth = 4 + Math.floor(Math.random() * 6);
    for (let b = 0; b < perMonth; b++) {
      const { room, hotel } = rand(allRooms);
      const customer = rand(customers);
      const created = new Date();
      created.setMonth(created.getMonth() - m);
      created.setDate(1 + Math.floor(Math.random() * 25));
      created.setHours(9 + Math.floor(Math.random() * 9), 0, 0, 0);
      // Never put a creation date in the future (current month can overshoot today)
      if (created.getTime() > Date.now()) {
        created.setTime(Date.now() - Math.floor(Math.random() * 5 + 1) * 86400000);
      }
      const checkIn = daysFromNow(10 + Math.floor(Math.random() * 40) - m * 30);
      const nights = 1 + Math.floor(Math.random() * 5);
      const checkOut = new Date(checkIn); checkOut.setDate(checkOut.getDate() + nights);
      const status = rand(statuses);
      const totalPrice = nights * room.pricePerNight;
      // Paid on site: only stays that are confirmed/completed are marked paid by the owner
      const paid = status === 'confirmed' || status === 'completed';

      const booking = await Booking.create({
        customer: customer._id, hotel: hotel._id, room: room._id,
        checkIn, checkOut, nights, guests: 1 + Math.floor(Math.random() * 2),
        totalPrice, status, paymentStatus: paid ? 'paid' : 'unpaid',
        ...(paid && { paidAt: created }),
      });
      // Force the historical createdAt via the raw driver — Mongoose marks
      // the timestamps `createdAt` as immutable, so $set through the model
      // is dropped. The native collection bypasses that, so the charts populate.
      await Booking.collection.updateOne({ _id: booking._id }, { $set: { createdAt: created } });
      bookingCount++;
    }
  }
  console.log(`📅 Bookings: ${bookingCount}`);

  // --- Guest reviews (score /10 + categories) on a few paid stays ---
  const COMMENTS = [
    'Très bon accueil, chambre propre et bien située.',
    'Personnel aux petits soins, je reviendrai.',
    'Bon rapport qualité-prix, petit-déjeuner correct.',
    'Emplacement idéal, un peu de bruit le soir.',
    'Séjour parfait, tout était conforme aux photos.',
  ];
  const paidStays = await Booking.find({ paymentStatus: 'paid', hotel: { $exists: true } }).limit(8);
  for (const [i, b] of paidStays.entries()) {
    const base = 7 + (i % 4); // 7–10
    const cat = () => Math.min(10, Math.max(6, base + Math.round(Math.random() * 2 - 1)));
    await Review.create({
      hotel: b.hotel, customer: b.customer, booking: b._id, score: base,
      categories: { cleanliness: cat(), location: cat(), value: cat(), staff: cat(), comfort: cat() },
      comment: COMMENTS[i % COMMENTS.length],
    });
  }
  console.log(`⭐ Reviews: ${paidStays.length}`);

  // --- A demo conversation between Sara and Meskan (users only write to Meskan, the intermediary) ---
  const saraBooking = await Booking.findOne({ customer: customers[0]._id, hotel: { $exists: true }, status: { $ne: 'cancelled' } }).populate('hotel', 'name');
  if (saraBooking) {
    await SupportThread.create({
      user: customers[0]._id,
      messages: [
        { sender: customers[0]._id, text: 'Bonjour, est-il possible d’arriver vers 22 h ?', about: `Réservation — ${saraBooking.hotel?.name || ''}`, readAt: new Date() },
        { sender: admin._id, fromAdmin: true, text: 'Bonjour Sara, nous avons vérifié avec l’hôtel : oui sans problème, la réception est ouverte 24 h/24.' },
      ],
      lastMessageAt: new Date(),
    });
    console.log('💬 Conversations avec Meskan : 1 (sara)');
  }

  // --- Deals: discounts set by owners ---
  const inMonth = daysFromNow(30);
  await Room.updateOne({ hotel: (await Hotel.findOne({ name: 'Le Méridien Oran' }))?._id, type: 'single' }, { discountPercent: 15, discountUntil: inMonth });
  await House.updateOne({ name: 'Chalet Tikjda' }, { discountPercent: 10, discountUntil: inMonth });
  console.log('🏷️  Deals: -15 % at Le Méridien Oran (single room), -10 % at Chalet Tikjda');

  console.log('\n✅ Seed complete!\n');
  console.log('   Admin   →  admin@hotelsdz.dz  /  admin123');
  console.log('   Hôtelier→  owner@hotelsdz.dz  /  owner123');
  console.log('   Client  →  sara@example.com   /  pass123');
  console.log('   Vendeur →  vendeur@hotelsdz.dz / seller123');
  console.log('   Investisseur → investisseur@hotelsdz.dz / investor123\n');
};

// CLI entry: `npm run seed` connects to the configured DB, seeds, disconnects.
const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('src/seed.js');
if (isDirectRun) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
}
