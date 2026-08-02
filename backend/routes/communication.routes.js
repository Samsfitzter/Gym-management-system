import express from 'express';
import CommunicationController from '../controllers/communicationController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.post('/log', authenticateJWT, CommunicationController.log);

export default router;
