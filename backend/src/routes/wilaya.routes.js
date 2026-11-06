import { Router } from 'express';
import { getWilayas, getPopularWilayas, getWilayaCounts, getWilayaCommunes } from '../controllers/wilaya.controller.js';

const router = Router();

router.get('/', getWilayas);
router.get('/popular', getPopularWilayas);
router.get('/counts', getWilayaCounts); // hotels, rentals, sales and projects per wilaya
router.get('/:wilaya/communes', getWilayaCommunes);

export default router;
