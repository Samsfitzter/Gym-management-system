import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/me', authenticateJWT, AuthController.me);

export default router;
