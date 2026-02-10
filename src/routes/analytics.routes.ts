import express from 'express';
import { getPublicStats } from '@/controllers/analytics.controller';

const router = express.Router();

/**
 * Public Analytics Routes
 */
router.get('/public-stats', getPublicStats);

export default router;
