import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { notFound, errorHandler } from './middlewares/error.middleware.js';
import { sanitizeInput } from './middlewares/sanitize.middleware.js';
import authRoutes from './routes/auth.routes.js';
import hotelRoutes from './routes/hotel.routes.js';
import houseRoutes from './routes/house.routes.js';
import roomRoutes from './routes/room.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import reviewRoutes from './routes/review.routes.js';
import adminRoutes from './routes/admin.routes.js';
import messageRoutes from './routes/message.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import ownerRoutes from './routes/owner.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import investorRoutes from './routes/investor.routes.js';
import referralRoutes from './routes/referral.routes.js';
import saleRoutes from './routes/sale.routes.js';
import wilayaRoutes from './routes/wilaya.routes.js';
import pricingRoutes from './routes/pricing.routes.js';
import testimonialRoutes from './routes/testimonial.routes.js';
import supportRoutes from './routes/support.routes.js';
import feedRoutes from './routes/feed.routes.js';
import reelRoutes from './routes/reel.routes.js';
import projectRoutes from './routes/project.routes.js';

const app = express();

// Behind Render's proxy (and Cloudflare) the client IP is in X-Forwarded-For. Without this, every
// visitor shares the proxy's IP and therefore one rate-limit bucket. TRUST_PROXY = number of proxy
// hops to trust (default 1 in production, 0 locally).
const trustProxy = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : '0');
app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

// --- Security & core middleware ---
// Disable CSP so local /uploads images are not blocked by browser
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'https://hotel-dz-three.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ];
      if (!origin || allowed.includes(origin)) return cb(null, true);
      // Refusing (not just omitting CORS headers) also stops cross-site form posts riding on the cookie
      const err = new Error('Origin not allowed');
      err.statusCode = 403;
      cb(err);
    },
    credentials: true,
  })
);

// Rate limiting (applied to the API)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // per client IP; many users can share one mobile-carrier IP, so not too low (RATE_LIMIT_MAX to tune)
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
// No MongoDB operators from user input (NoSQL injection)
app.use(sanitizeInput);

// Serve uploaded images as static files (with CORS headers so Next.js can load them)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, '..', 'public', 'uploads')));

// --- Health check ---
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Meskan API is running', timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/houses', houseRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/investor', investorRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/wilayas', wilayaRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);
// users write only to Meskan (the intermediary), never to each other
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/feeds', feedRoutes);
app.use('/api/v1/reels', reelRoutes);
app.use('/api/v1/projects', projectRoutes);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

export default app;
