import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import ReportController from '../controllers/reportController.js';

const router = express.Router();

router.get('/collections', authenticateJWT, requireRole('admin'), ReportController.getCollectionAnalytics);

export default router;
