import express from 'express';
import AttendanceController from '../controllers/attendanceController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Primary scan endpoint — check-in OR check-out (smart toggle)
router.post('/scan', authenticateJWT, AttendanceController.scan);

// Backward-compatible aliases
router.post('/check-in', authenticateJWT, AttendanceController.checkIn);
router.post('/', authenticateJWT, AttendanceController.checkIn);

// Read endpoints
router.get('/', authenticateJWT, AttendanceController.getAttendance);
router.get('/today', authenticateJWT, AttendanceController.getToday);
router.get('/history', authenticateJWT, AttendanceController.getHistory);
router.get('/member/:id', authenticateJWT, AttendanceController.getMemberHistory);

// Live presence
router.get('/inside', authenticateJWT, AttendanceController.getCurrentlyInside);

// Admin-only: manual trigger for nightly auto-close (bulk stale sessions)
router.post('/auto-close-stale', authenticateJWT, requireRole('admin'), AttendanceController.autoCloseStale);

// Admin-only: staff-initiated manual checkout for a single open session
// checkout_time = NOW(), auto_closed = FALSE
router.post('/manual-checkout/:id', authenticateJWT, requireRole('admin'), AttendanceController.manualCheckout);

export default router;
