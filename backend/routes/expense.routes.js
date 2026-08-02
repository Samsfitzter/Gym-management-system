import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ExpenseController from '../controllers/expenseController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads/expenses directory exists
const uploadDir = path.join(__dirname, '../uploads/expenses');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize file extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  }
});

// File filter validation
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    
    const isExtensionAllowed = allowedExtensions.test(ext);
    const isMimeTypeAllowed = allowedExtensions.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (isExtensionAllowed && isMimeTypeAllowed) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG, WEBP and PDF formats are allowed'));
    }
  }
});

const router = express.Router();

// Categories routes (Categories listing is open to authenticated users, modification is Admin only)
router.get('/categories', authenticateJWT, ExpenseController.getCategories);
router.post('/categories', authenticateJWT, requireRole('admin'), ExpenseController.createCategory);

// Dashboard / Analytics routes (Admin only)
router.get('/summary', authenticateJWT, requireRole('admin'), ExpenseController.getDashboardExpenseSummary);
router.get('/analytics', authenticateJWT, requireRole('admin'), ExpenseController.getExpenseAnalytics);

// Reports routes (Admin only)
router.get('/reports/profit-loss', authenticateJWT, requireRole('admin'), ExpenseController.getProfitAndLossReport);
router.get('/reports/category-wise', authenticateJWT, requireRole('admin'), ExpenseController.getCategoryWiseReport);

// Core CRUD routes
// Listings/Details: receptionist and admin
router.get('/', authenticateJWT, ExpenseController.getExpenses);
router.get('/:id', authenticateJWT, ExpenseController.getExpenseById);

// Create Expense (includes receipt upload)
router.post('/', authenticateJWT, (req, res, next) => {
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
}, ExpenseController.createExpense);

// Update Expense (includes optional receipt upload)
router.put('/:id', authenticateJWT, (req, res, next) => {
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
}, ExpenseController.updateExpense);

// Delete Expense (Admin only)
router.delete('/:id', authenticateJWT, requireRole('admin'), ExpenseController.deleteExpense);

export default router;
