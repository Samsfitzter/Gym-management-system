import PTService from '../services/ptService.js';
import fs from 'fs';
import path from 'path';

export class PTController {
  // ==========================================
  // PT PLANS
  // ==========================================

  static async createPlan(req, res, next) {
    try {
      const plan = await PTService.createPlan(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: plan,
        message: 'PT Plan created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePlan(req, res, next) {
    try {
      const plan = await PTService.updatePlan(req.params.id, req.body, req.user.id);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'PT Plan not found' });
      }
      res.json({
        success: true,
        data: plan,
        message: 'PT Plan updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async deletePlan(req, res, next) {
    try {
      const plan = await PTService.deletePlan(req.params.id, req.user.id);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'PT Plan not found' });
      }
      res.json({
        success: true,
        data: plan,
        message: 'PT Plan soft-deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async listPlans(req, res, next) {
    try {
      const showDeleted = req.query.showDeleted === 'true';
      const plans = await PTService.listPlans(showDeleted);
      res.json({
        success: true,
        data: plans
      });
    } catch (err) {
      next(err);
    }
  }

  static async listActivePlans(req, res, next) {
    try {
      const plans = await PTService.listActivePlans();
      res.json({
        success: true,
        data: plans
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPlanDetails(req, res, next) {
    try {
      const plan = await PTService.getPlanById(req.params.id);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'PT Plan not found' });
      }
      res.json({
        success: true,
        data: plan
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PT CLIENTS
  // ==========================================

  static async createClient(req, res, next) {
    try {
      const client = await PTService.createClient(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: client,
        message: 'PT Client enrolled successfully'
      });
    } catch (err) {
      if (err.status === 400) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next(err);
    }
  }

  static async updateClient(req, res, next) {
    try {
      const client = await PTService.updateClient(req.params.id, req.body, req.user.id);
      if (!client) {
        return res.status(404).json({ success: false, message: 'PT Client not found' });
      }
      res.json({
        success: true,
        data: client,
        message: 'PT Client details updated successfully'
      });
    } catch (err) {
      if (err.status === 400) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next(err);
    }
  }

  static async listClients(req, res, next) {
    try {
      const filters = {
        search: req.query.search || '',
        status: req.query.status || '',
        trainer_id: req.query.trainer_id || '',
        goal: req.query.goal || '',
        limit: req.query.limit || 10,
        offset: req.query.offset || 0
      };

      const result = await PTService.listClients(filters, req.user.role, req.user.id);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getClientDetails(req, res, next) {
    try {
      const client = await PTService.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ success: false, message: 'PT Client not found' });
      }

      // Verification for trainer access restriction
      if (req.user.role === 'trainer' && client.trainer_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden: Client is not assigned to you' });
      }

      res.json({
        success: true,
        data: client
      });
    } catch (err) {
      next(err);
    }
  }

  static async renewClient(req, res, next) {
    try {
      const updatedClient = await PTService.renewClient(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        data: updatedClient,
        message: 'PT Client renewed successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteClient(req, res, next) {
    try {
      const client = await PTService.deleteClient(req.params.id, req.user.id);
      if (!client) {
        return res.status(404).json({ success: false, message: 'PT Client not found' });
      }
      res.json({
        success: true,
        data: client,
        message: 'PT Client soft-deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PROGRESS TRACKING
  // ==========================================

  static async addProgress(req, res, next) {
    try {
      const { weight, target_weight, notes } = req.body;
      const progress = await PTService.addProgress(
        req.params.id,
        weight,
        target_weight,
        notes,
        req.user.id
      );
      res.status(201).json({
        success: true,
        data: progress,
        message: 'Weight record added successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProgressHistory(req, res, next) {
    try {
      const history = await PTService.getProgressHistory(req.params.id);
      res.json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // NOTES
  // ==========================================

  static async addNote(req, res, next) {
    try {
      const { note } = req.body;
      const trainerId = req.body.trainer_id || req.user.id;

      const dbNote = await PTService.addNote(req.params.id, trainerId, note);
      res.status(201).json({
        success: true,
        data: dbNote,
        message: 'Trainer note added successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async editNote(req, res, next) {
    try {
      const { note } = req.body;
      const dbNote = await PTService.editNote(req.params.noteId, note, req.user.id);
      if (!dbNote) {
        return res.status(404).json({ success: false, message: 'Trainer note not found' });
      }
      res.json({
        success: true,
        data: dbNote,
        message: 'Trainer note updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async listNotes(req, res, next) {
    try {
      const notes = await PTService.listNotes(req.params.id);
      res.json({
        success: true,
        data: notes
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // IMAGES
  // ==========================================

  static async uploadImage(req, res, next) {
    try {
      const { image_type } = req.body;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded' });
      }

      const imageUrl = `/uploads/pt/${req.params.id}/${req.file.filename}`;
      const image = await PTService.uploadImage(req.params.id, image_type, imageUrl, req.user.id);

      res.status(201).json({
        success: true,
        data: image,
        message: 'Transformation image uploaded successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async getClientImages(req, res, next) {
    try {
      const images = await PTService.getClientImages(req.params.id);
      res.json({
        success: true,
        data: images
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  static async getDashboardStats(req, res, next) {
    try {
      const stats = await PTService.getDashboardStats(req.user.role, req.user.id);

      // Receptionist has no access to revenue stats or trainer load counts
      if (req.user.role === 'receptionist') {
        stats.totalRevenue = null;
        stats.monthlyRevenue = null;
        stats.trainerWise = [];
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  }

  static async listTrainers(req, res, next) {
    try {
      const trainers = await PTService.listTrainers();
      res.json({
        success: true,
        data: trainers
      });
    } catch (err) {
      next(err);
    }
  }

  static async listAllTrainers(req, res, next) {
    try {
      const trainers = await PTService.listAllTrainers();
      res.json({ success: true, data: trainers });
    } catch (err) {
      next(err);
    }
  }

  static async createTrainer(req, res, next) {
    try {
      const { phone } = req.body;
      if (!phone || !phone.trim()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Trainer phone number is required'
        });
      }
      if (phone && !/^[6-9]\d{9}$/.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Invalid phone number. Must be a 10-digit Indian mobile number starting with 6–9.'
        });
      }
      const trainer = await PTService.createTrainer(req.body);
      res.status(201).json({ success: true, data: trainer, message: 'Trainer created' });
    } catch (err) {
      next(err);
    }
  }

  static async updateTrainer(req, res, next) {
    try {
      const { phone } = req.body;
      if (!phone || !phone.trim()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Trainer phone number is required'
        });
      }
      if (phone && !/^[6-9]\d{9}$/.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Invalid phone number. Must be a 10-digit Indian mobile number starting with 6–9.'
        });
      }
      const trainer = await PTService.updateTrainer(req.params.id, req.body);
      if (!trainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }
      res.json({ success: true, data: trainer, message: 'Trainer updated' });
    } catch (err) {
      next(err);
    }
  }

  static async deactivateTrainer(req, res, next) {
    try {
      const trainer = await PTService.deactivateTrainer(req.params.id);
      if (!trainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }
      res.json({ success: true, data: trainer, message: 'Trainer deactivated' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // WEIGHT HISTORY
  // ==========================================
  static async recordWeight(req, res, next) {
    try {
      const { weight } = req.body;
      if (!weight || isNaN(weight) || parseFloat(weight) <= 0) {
        return res.status(400).json({ success: false, message: 'Weight must be a positive number' });
      }
      const record = await PTService.recordWeight(req.params.id, weight, req.user.id);
      res.status(201).json({
        success: true,
        data: record,
        message: 'Weight recorded successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async getWeightHistory(req, res, next) {
    try {
      const history = await PTService.getWeightHistory(req.params.id);
      res.json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // DIET PLAN
  // ==========================================
  static async getDietPlan(req, res, next) {
    try {
      const plan = await PTService.getDietPlan(req.params.id);
      res.json({
        success: true,
        data: plan || null
      });
    } catch (err) {
      next(err);
    }
  }

  static async saveDietPlan(req, res, next) {
    try {
      const { title, content } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Diet plan content is required' });
      }
      const plan = await PTService.saveDietPlan(req.params.id, title, content, req.user.id);
      res.status(200).json({
        success: true,
        data: plan,
        message: 'Diet plan saved successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDietPlanHistory(req, res, next) {
    try {
      const history = await PTService.getDietPlanHistory(req.params.id);
      res.json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // DIET PLAN TEMPLATES
  // ==========================================
  static async createTemplate(req, res, next) {
    try {
      const { title, content, category } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Template title is required' });
      }
      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Template content is required' });
      }
      if (!category || !category.trim()) {
        return res.status(400).json({ success: false, message: 'Template category is required' });
      }
      const template = await PTService.createTemplate(title, content, category, req.user.id);
      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTemplate(req, res, next) {
    try {
      const { title, content, category } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Template title is required' });
      }
      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Template content is required' });
      }
      if (!category || !category.trim()) {
        return res.status(400).json({ success: false, message: 'Template category is required' });
      }
      const template = await PTService.updateTemplate(req.params.id, title, content, category);
      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }
      res.json({
        success: true,
        data: template,
        message: 'Template updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async listTemplates(req, res, next) {
    try {
      const onlyActive = req.query.all !== 'true';
      const templates = await PTService.listTemplates(onlyActive);
      res.json({
        success: true,
        data: templates
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleTemplateActive(req, res, next) {
    try {
      const { is_active } = req.body;
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ success: false, message: 'is_active must be a boolean' });
      }
      const template = await PTService.toggleTemplateActive(req.params.id, is_active);
      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }
      res.json({
        success: true,
        data: template,
        message: `Template ${is_active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PROGRESS IMAGES
  // ==========================================
  static async uploadProgressImage(req, res, next) {
    try {
      const { image_type, caption } = req.body;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded' });
      }
      if (!image_type || !['before', 'after'].includes(image_type)) {
        return res.status(400).json({ success: false, message: 'image_type must be either before or after' });
      }

      const imageUrl = `/uploads/pt/${req.params.id}/${req.file.filename}`;
      const image = await PTService.uploadProgressImage(req.params.id, image_type, imageUrl, caption, req.user.id);

      res.status(201).json({
        success: true,
        data: image,
        message: 'Progress image uploaded successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProgressImages(req, res, next) {
    try {
      const images = await PTService.getProgressImages(req.params.id);
      res.json({
        success: true,
        data: images
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTargetWeight(req, res, next) {
    try {
      const { target_weight } = req.body;
      if (target_weight === undefined) {
        return res.status(400).json({ success: false, message: 'target_weight is required' });
      }
      const client = await PTService.updateTargetWeight(req.params.id, target_weight, req.user.id);
      res.json({
        success: true,
        data: client,
        message: 'Target weight updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

export default PTController;
