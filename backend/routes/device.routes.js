import express from 'express';
import DeviceController from '../controllers/deviceController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', authenticateJWT, DeviceController.getSettings);
router.put('/settings', authenticateJWT, DeviceController.updateSettings);

router.post('/sync', authenticateJWT, DeviceController.sync);
router.get('/health', authenticateJWT, DeviceController.getHealth);

router.get('/members/:memberId/verify', authenticateJWT, DeviceController.verifyMember);
router.post('/members/sync', authenticateJWT, DeviceController.syncAllMembers);

export default router;
