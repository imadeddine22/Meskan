import { Router } from 'express';
import {
  getPendingHotels,
  approveHotel,
  rejectHotel,
  getUsers,
  toggleBlockUser,
  getStats,
  getBookings,
  getAllHotels,
  getRecentActivity,
  deleteUser,
  deleteHotel,
  createHotelByAdmin,
  updateHotelByAdmin,
  getAllHouses,
  createHouseByAdmin,
  updateHouseByAdmin,
  approveHouse,
  rejectHouse,
  deleteHouse,
  getAllSales,
  approveSale,
  rejectSale,
  deleteSale,
} from '../controllers/admin.controller.js';
import { addWilaya } from '../controllers/wilaya.controller.js';
import { getHotelDemand, setFeaturedHotels } from '../controllers/featured.controller.js';
import { getReelQueue, approveReel, rejectReel } from '../controllers/reel.controller.js';
import { getProjectQueue, approveProject, rejectProject, getAllInterests, markInterestSeen } from '../controllers/project.controller.js';
import { getReferrals } from '../controllers/referral.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

// Every admin route requires an authenticated admin
router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/recent-activity', getRecentActivity);

// Hotels
router.get('/hotels/pending', getPendingHotels);
router.get('/hotels/all', getAllHotels);
// Home page 'Hôtels en vedette': most requested hotels + the selection (before /hotels/:id)
router.get('/hotels/demand', getHotelDemand);
// Listing reels: moderation (deletion: DELETE /reels/:kind/:id)
router.get('/reels', getReelQueue);
router.put('/reels/:kind/:id/approve', approveReel);
router.put('/reels/:kind/:id/reject', rejectReel);
// Investment projects: moderation (deletion: DELETE /projects/:id)
router.get('/projects', getProjectQueue);
router.put('/projects/:id/approve', approveProject);
router.put('/projects/:id/reject', rejectProject);
// Requests sent on investment projects: Meskan puts the two parties in touch
router.get('/project-interests', getAllInterests);
router.put('/project-interests/:id/seen', markInterestSeen);

// How visitors heard about the site (welcome notification answers)
router.get('/referrals', getReferrals);
router.put('/hotels/featured', setFeaturedHotels);
router.post('/hotels', upload.array('images', 10), createHotelByAdmin);
router.put('/hotels/:id', upload.array('images', 10), updateHotelByAdmin);
router.put('/hotels/:id/approve', approveHotel);
router.put('/hotels/:id/reject', rejectHotel);
router.delete('/hotels/:id', deleteHotel);

// Houses
router.get('/houses/all', getAllHouses);
router.post('/houses', upload.array('images', 10), createHouseByAdmin);
router.put('/houses/:id', upload.array('images', 10), updateHouseByAdmin);
router.put('/houses/:id/approve', approveHouse);
router.put('/houses/:id/reject', rejectHouse);
router.delete('/houses/:id', deleteHouse);

// Sales (HouseForSale)
router.get('/sales/all', getAllSales);
router.put('/sales/:id/approve', approveSale);
router.put('/sales/:id/reject', rejectSale);
router.delete('/sales/:id', deleteSale);

// Users
router.get('/users', getUsers);
router.put('/users/:id/block', toggleBlockUser);
router.delete('/users/:id', deleteUser);

// Bookings
router.get('/bookings', getBookings);

// Wilayas
router.post('/wilayas', addWilaya);

export default router;
