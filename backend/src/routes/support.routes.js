import { Router } from 'express';
import { getMyThread, getMyUnread, sendToMeskan } from '../controllers/support.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

// Users only ever write to Meskan (the intermediary), never to each other. Admin side: /admin/support
const router = Router();
router.use(protect);

router.get('/thread', getMyThread);
router.get('/unread', getMyUnread);
router.post('/thread/messages', sendToMeskan);

export default router;
