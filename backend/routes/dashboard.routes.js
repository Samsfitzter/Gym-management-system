import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticateJWT, DashboardController.getStats);
router.get('/analytics', authenticateJWT, DashboardController.getAnalytics);
router.get('/notifications', authenticateJWT, DashboardController.getNotifications);

export default router;
