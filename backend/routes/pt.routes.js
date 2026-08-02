import express from 'express';
import PTController from '../controllers/ptController.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage for PT client progress images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = req.params.id;
    // Create nested client uploads directory: backend/uploads/pt/{clientId}
    const destDir = path.join(__dirname, '../uploads/pt', clientId);

    fs.mkdirSync(destDir, { recursive: true });
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure file filters and size limits
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
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

// PT Dashboard Stats
router.get('/dashboard', authenticateJWT, PTController.getDashboardStats);
router.get('/trainers', authenticateJWT, PTController.listTrainers);
router.get('/trainers/all', authenticateJWT, PTController.listAllTrainers);
router.post('/trainers', authenticateJWT, requireRole('admin'), PTController.createTrainer);
router.put('/trainers/:id', authenticateJWT, requireRole('admin'), PTController.updateTrainer);
router.delete('/trainers/:id', authenticateJWT, requireRole('admin'), PTController.deactivateTrainer);

// PT Plans
router.get('/plans/active', authenticateJWT, PTController.listActivePlans);
router.get('/plans', authenticateJWT, PTController.listPlans);
router.get('/plans/:id', authenticateJWT, PTController.getPlanDetails);
router.post('/plans', authenticateJWT, requireRole('admin'), PTController.createPlan);
router.put('/plans/:id', authenticateJWT, requireRole('admin'), PTController.updatePlan);
router.delete('/plans/:id', authenticateJWT, requireRole('admin'), PTController.deletePlan);

// PT Clients
router.get('/clients', authenticateJWT, PTController.listClients);
router.get('/clients/:id', authenticateJWT, PTController.getClientDetails);
router.post('/clients', authenticateJWT, requireRole(['admin', 'receptionist']), PTController.createClient);
router.put('/clients/:id', authenticateJWT, requireRole(['admin', 'receptionist']), PTController.updateClient);
router.delete('/clients/:id', authenticateJWT, requireRole('admin'), PTController.deleteClient);
router.post('/clients/:id/renew', authenticateJWT, requireRole(['admin', 'receptionist']), PTController.renewClient);

// PT Progress weight tracking
router.get('/clients/:id/progress', authenticateJWT, PTController.getProgressHistory);
router.post('/clients/:id/progress', authenticateJWT, requireRole(['admin', 'trainer']), PTController.addProgress);

// PT Notes
router.get('/clients/:id/notes', authenticateJWT, PTController.listNotes);
router.post('/clients/:id/notes', authenticateJWT, requireRole(['admin', 'trainer']), PTController.addNote);
router.put('/clients/:id/notes/:noteId', authenticateJWT, requireRole(['admin', 'trainer']), PTController.editNote);

// PT Before / After Images
router.get('/clients/:id/images', authenticateJWT, PTController.getClientImages);
router.post('/clients/:id/images', authenticateJWT, requireRole(['admin', 'trainer']), (req, res, next) => {
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
}, PTController.uploadImage);

// PT Weight History
router.get('/clients/:id/weight-history', authenticateJWT, PTController.getWeightHistory);
router.post('/clients/:id/weight-history', authenticateJWT, requireRole(['admin', 'trainer']), PTController.recordWeight);
router.patch('/clients/:id/target-weight', authenticateJWT, requireRole(['admin', 'trainer']), PTController.updateTargetWeight);

// PT Diet Plan
router.get('/clients/:id/diet-plan', authenticateJWT, PTController.getDietPlan);
router.post('/clients/:id/diet-plan', authenticateJWT, requireRole(['admin', 'trainer']), PTController.saveDietPlan);
router.get('/clients/:id/diet-plan/history', authenticateJWT, PTController.getDietPlanHistory);

// PT Diet Plan Templates
router.get('/diet-templates', authenticateJWT, PTController.listTemplates);
router.post('/diet-templates', authenticateJWT, requireRole(['admin', 'trainer']), PTController.createTemplate);
router.put('/diet-templates/:id', authenticateJWT, requireRole(['admin', 'trainer']), PTController.updateTemplate);
router.patch('/diet-templates/:id/toggle', authenticateJWT, requireRole(['admin', 'trainer']), PTController.toggleTemplateActive);

// PT Progress Images
router.get('/clients/:id/progress-images', authenticateJWT, PTController.getProgressImages);
router.post('/clients/:id/progress-images', authenticateJWT, requireRole(['admin', 'trainer']), (req, res, next) => {
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
}, PTController.uploadProgressImage);

export default router;
