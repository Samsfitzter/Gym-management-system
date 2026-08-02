import CommunicationService from '../services/communicationService.js';

export class CommunicationController {
  static async log(req, res) {
    const { memberId, type } = req.body;
    const initiatedBy = req.user ? req.user.id : null;

    try {
      if (!memberId) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'memberId is required'
        });
      }

      if (!type) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'type is required'
        });
      }

      // Valid types check
      const validTypes = ['birthday', 'expiry', 'payment', 'absence', 'welcome'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: `Invalid communication type. Allowed: ${validTypes.join(', ')}`
        });
      }

      const logEntry = await CommunicationService.logCommunication({
        memberId: parseInt(memberId, 10),
        type,
        initiatedBy
      });

      return res.json({
        success: true,
        data: logEntry,
        message: 'Communication log created successfully'
      });
    } catch (err) {
      console.error('[Communication Log Error] POST /api/communications/log failed:', {
        body: req.body,
        message: err.message,
        stack: err.stack,
        user: req.user ? { id: req.user.id } : 'anonymous'
      });
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }
}

export default CommunicationController;
