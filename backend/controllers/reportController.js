import ReportService from '../services/reportService.js';

export class ReportController {
  static async getCollectionAnalytics(req, res) {
    const { range, fromDate, toDate } = req.query;
    try {
      const data = await ReportService.getCollectionAnalytics(range || 'daily', fromDate, toDate);
      return res.json({
        success: true,
        data,
        message: 'Collections analytics retrieved successfully'
      });
    } catch (err) {
      console.error('Report controller error:', err.message);
      const isValidationError = err.message.includes('required') || 
                               err.message.includes('must be') || 
                               err.message.includes('format') ||
                               err.message.includes('exceed') ||
                               err.message.includes('future');
      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        data: null,
        message: err.message
      });
    }
  }
}

export default ReportController;
