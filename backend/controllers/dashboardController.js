import DashboardService from '../services/dashboardService.js';

export class DashboardController {
  static async getStats(req, res) {
    try {
      const stats = await DashboardService.getStats();
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isAdmin) {
        stats.todayCollections = 0;
        stats.todayExpenses = 0;
        stats.monthlyRevenue = 0;
        stats.monthlyExpenses = 0;
      }
      return res.json({
        success: true,
        data: stats,
        message: 'Dashboard aggregated stats retrieved successfully'
      });
    } catch (err) {
      console.error('[Dashboard Stats Error] GET /api/dashboard/stats failed:', {
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

  static async getAnalytics(req, res) {
    const { range } = req.query;
    try {
      const analytics = await DashboardService.getAnalytics(range || 'daily');
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isAdmin) {
        // Enforce role-based restrictions
        analytics.metrics.collections = null;
        analytics.metrics.todayCollections = null;
        analytics.metrics.todayExpenses = null;
        analytics.metrics.monthlyRevenue = null;
        analytics.metrics.monthlyExpenses = null;
        analytics.lists.collectionsList = [];
        analytics.monthlyCollections = [];
      }
      return res.json({
        success: true,
        data: analytics,
        message: 'Dashboard analytics retrieved successfully'
      });
    } catch (err) {
      console.error('[Dashboard Analytics Error] GET /api/dashboard/analytics failed:', {
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

  static async getNotifications(req, res) {
    try {
      const data = await DashboardService.getNotifications();
      return res.json({
        success: true,
        data,
        message: 'Dashboard notification center data retrieved successfully'
      });
    } catch (err) {
      console.error('[Dashboard Notifications Error] GET /api/dashboard/notifications failed:', {
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
}

export default DashboardController;
