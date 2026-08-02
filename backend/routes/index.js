import express from 'express';
import authRoutes from './auth.routes.js';
import memberRoutes from './member.routes.js';
import attendanceRoutes from './attendance.routes.js';
import paymentsRoutes from './payments.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import deviceRoutes from './device.routes.js';
import reportRoutes from './report.routes.js';
import expenseRoutes from './expense.routes.js';
import ptRoutes from './pt.routes.js';
import communicationRoutes from './communication.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/payments', paymentsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/device', deviceRoutes);
router.use('/reports', reportRoutes);
router.use('/expenses', expenseRoutes);
router.use('/pt', ptRoutes);
router.use('/communications', communicationRoutes);

export default router;
