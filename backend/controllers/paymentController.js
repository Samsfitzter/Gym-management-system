import PaymentService from '../services/paymentService.js';

export class PaymentController {
  static async getPayments(req, res) {
    const { limit, page, search, member_id } = req.query;
    try {
      const filters = {
        limit: limit ? parseInt(limit, 10) : 10,
        page: page ? parseInt(page, 10) : 1,
        search: search || '',
        memberId: member_id || ''
      };

      const result = await PaymentService.getPayments(filters);

      return res.json({
        success: true,
        data: result,
        message: 'Payments history retrieved successfully'
      });
    } catch (err) {
      console.error('[Get Payments Error] GET /api/payments failed:', {
        query: req.query,
        message: err.message,
        stack: err.stack,
        user: req.user ? { id: req.user.id, role: req.user.role } : 'anonymous'
      });
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async createPayment(req, res) {
    try {
      const result = await PaymentService.createPayment(req.body);
      return res.status(201).json({
        success: true,
        data: result,
        message: 'Payment recorded successfully'
      });
    } catch (err) {
      console.error('[Create Payment Error] POST /api/payments failed:', {
        body: req.body,
        message: err.message,
        stack: err.stack,
        user: req.user ? { id: req.user.id, role: req.user.role } : 'anonymous'
      });
      return res.status(err.message === 'Member not found' ? 404 : 500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async updatePaymentStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await PaymentService.updatePaymentStatus(id, status);
      return res.json({
        success: true,
        data: null,
        message: 'Payment status updated'
      });
    } catch (err) {
      console.error('[Update Payment Status Error] PUT /api/payments/:id/status failed:', {
        params: req.params,
        body: req.body,
        message: err.message,
        stack: err.stack,
        user: req.user ? { id: req.user.id, role: req.user.role } : 'anonymous'
      });
      return res.status(400).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async uploadReceipt(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'No file uploaded'
        });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      return res.json({
        success: true,
        data: { url: fileUrl },
        message: 'Receipt PDF uploaded successfully'
      });
    } catch (err) {
      console.error('Upload receipt PDF controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error during upload'
      });
    }
  }
}

export default PaymentController;
