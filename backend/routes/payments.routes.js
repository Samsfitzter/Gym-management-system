import express from 'express';
import PaymentController from '../controllers/paymentController.js';
import { authenticateJWT } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage for receipts
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure file filters and size limits
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF format is allowed'));
    }
  }
});

const router = express.Router();

router.get('/', authenticateJWT, PaymentController.getPayments);
router.post('/', authenticateJWT, PaymentController.createPayment);
router.put('/:id/status', authenticateJWT, PaymentController.updatePaymentStatus);

// PDF receipt upload route
router.post('/upload-receipt', authenticateJWT, (req, res, next) => {
  upload.single('receipt')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message
      });
    }
    next();
  });
}, PaymentController.uploadReceipt);

export default router;
