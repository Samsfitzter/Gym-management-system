import express from 'express';
import MemberController from '../controllers/memberController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save files inside the backend/uploads directory
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure file filters and size limits
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG, and WEBP image formats are allowed'));
    }
  }
});

const router = express.Router();

router.get('/', authenticateJWT, MemberController.getMembers);
router.get('/:id', authenticateJWT, MemberController.getMemberById);
router.post('/', authenticateJWT, MemberController.createMember);
router.put('/:id', authenticateJWT, MemberController.updateMember);
router.put('/:id/status', authenticateJWT, MemberController.updateMemberStatus);
router.post('/:id/renew', authenticateJWT, MemberController.renewMember);
router.delete('/:id', authenticateJWT, requireRole('admin'), MemberController.deleteMember);

// Add upload profile image route
router.post('/upload', authenticateJWT, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message
      });
    }
    next();
  });
}, MemberController.uploadProfileImage);

export default router;
