import ExpenseService from '../services/expenseService.js';

export class ExpenseController {
  // --- Category Handlers ---
  static async getCategories(req, res) {
    try {
      const categories = await ExpenseService.getCategories();
      return res.json({
        success: true,
        data: categories,
        message: 'Expense categories retrieved successfully'
      });
    } catch (err) {
      console.error('[Get Categories Error]', err);
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async createCategory(req, res) {
    const { name } = req.body;
    try {
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Category name is required'
        });
      }

      const result = await ExpenseService.createCategory(name);
      return res.status(201).json({
        success: true,
        data: result,
        message: 'Expense category created successfully'
      });
    } catch (err) {
      console.error('[Create Category Error]', err);
      return res.status(err.message.includes('unique') || err.message.includes('already') ? 409 : 500).json({
        success: false,
        data: null,
        message: err.message.includes('unique') ? 'Category name already exists' : `Server error: ${err.message}`
      });
    }
  }

  // --- Expense CRUD Handlers ---
  static async getExpenses(req, res) {
    const { limit, page, search, category_id, fromDate, toDate, month } = req.query;
    try {
      const filters = {
        limit: limit ? parseInt(limit, 10) : 10,
        page: page ? parseInt(page, 10) : 1,
        search: search || '',
        category_id: category_id || '',
        fromDate: fromDate || '',
        toDate: toDate || '',
        month: month || ''
      };

      const result = await ExpenseService.getExpenses(filters);

      return res.json({
        success: true,
        data: result,
        message: 'Expenses list retrieved successfully'
      });
    } catch (err) {
      console.error('[Get Expenses Error]', err);
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async getExpenseById(req, res) {
    const { id } = req.params;
    try {
      const expense = await ExpenseService.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Expense record not found'
        });
      }
      return res.json({
        success: true,
        data: expense,
        message: 'Expense details retrieved successfully'
      });
    } catch (err) {
      console.error('[Get Expense By Id Error]', err);
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async createExpense(req, res) {
    try {
      const { expenseDate, categoryId, amount, description, paymentMethod } = req.body;
      const createdBy = req.user ? req.user.id : null;

      if (!expenseDate) {
        return res.status(400).json({ success: false, data: null, message: 'Expense Date is required' });
      }
      if (!categoryId) {
        return res.status(400).json({ success: false, data: null, message: 'Expense Category is required' });
      }
      if (amount === undefined || amount === null || amount === '') {
        return res.status(400).json({ success: false, data: null, message: 'Expense Amount is required' });
      }
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, data: null, message: 'Amount must be greater than zero' });
      }
      if (!paymentMethod) {
        return res.status(400).json({ success: false, data: null, message: 'Payment Method is required' });
      }
      if (!createdBy) {
        return res.status(401).json({ success: false, data: null, message: 'User session not found' });
      }

      let receiptUrl = null;
      if (req.file) {
        receiptUrl = `/uploads/expenses/${req.file.filename}`;
      }

      const payload = {
        expenseDate,
        categoryId: parseInt(categoryId, 10),
        amount: parseFloat(amount),
        description,
        paymentMethod,
        receiptUrl,
        createdBy
      };

      const result = await ExpenseService.createExpense(payload);
      return res.status(201).json({
        success: true,
        data: result,
        message: 'Expense recorded successfully'
      });
    } catch (err) {
      console.error('[Create Expense Error]', err);
      return res.status(err.message.includes('Invalid') || err.message.includes('required') ? 400 : 500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async updateExpense(req, res) {
    const { id } = req.params;
    try {
      const { expenseDate, categoryId, amount, description, paymentMethod } = req.body;
      const updatedBy = req.user ? req.user.id : null;

      if (!expenseDate) {
        return res.status(400).json({ success: false, data: null, message: 'Expense Date is required' });
      }
      if (!categoryId) {
        return res.status(400).json({ success: false, data: null, message: 'Expense Category is required' });
      }
      if (amount === undefined || amount === null || amount === '') {
        return res.status(400).json({ success: false, data: null, message: 'Expense Amount is required' });
      }
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, data: null, message: 'Amount must be greater than zero' });
      }
      if (!paymentMethod) {
        return res.status(400).json({ success: false, data: null, message: 'Payment Method is required' });
      }
      if (!updatedBy) {
        return res.status(401).json({ success: false, data: null, message: 'User session not found' });
      }

      let receiptUrl = null;
      if (req.file) {
        receiptUrl = `/uploads/expenses/${req.file.filename}`;
      }

      const payload = {
        expenseDate,
        categoryId: parseInt(categoryId, 10),
        amount: parseFloat(amount),
        description,
        paymentMethod,
        receiptUrl,
        updatedBy
      };

      const result = await ExpenseService.updateExpense(id, payload);
      return res.json({
        success: true,
        data: result,
        message: 'Expense details updated successfully'
      });
    } catch (err) {
      console.error('[Update Expense Error]', err);
      return res.status(err.message.includes('found') ? 404 : 400).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async deleteExpense(req, res) {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    try {
      if (!userId) {
        return res.status(401).json({ success: false, data: null, message: 'User session not found' });
      }
      await ExpenseService.deleteExpense(id, userId);
      return res.json({
        success: true,
        data: null,
        message: 'Expense deleted successfully'
      });
    } catch (err) {
      console.error('[Delete Expense Error]', err);
      return res.status(err.message.includes('found') ? 404 : 500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  // --- Financial Aggregations & Dashboard Handlers ---
  static async getDashboardExpenseSummary(req, res) {
    try {
      const summary = await ExpenseService.getDashboardExpenseSummary();
      return res.json({
        success: true,
        data: summary,
        message: 'Expense summary stats retrieved successfully'
      });
    } catch (err) {
      console.error('[Get Dashboard Expense Summary Error]', err);
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async getExpenseAnalytics(req, res) {
    const { range } = req.query;
    try {
      const analytics = await ExpenseService.getExpenseAnalytics(range || 'monthly');
      return res.json({
        success: true,
        data: analytics,
        message: 'Expense analytics data retrieved successfully'
      });
    } catch (err) {
      console.error('[Get Expense Analytics Error]', err);
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  // --- Reports Handlers ---
  static async getProfitAndLossReport(req, res) {
    const { view } = req.query; // 'monthly' | 'yearly'
    try {
      const data = await ExpenseService.getProfitAndLossReport(view || 'monthly');
      return res.json({
        success: true,
        data,
        message: 'Profit and loss statement generated successfully'
      });
    } catch (err) {
      console.error('[Get Profit And Loss Error]', err);
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }

  static async getCategoryWiseReport(req, res) {
    const { fromDate, toDate } = req.query;
    try {
      const data = await ExpenseService.getCategoryWiseReport({ fromDate, toDate });
      return res.json({
        success: true,
        data,
        message: 'Category wise expense report generated successfully'
      });
    } catch (err) {
      console.error('[Get Category Wise Report Error]', err);
      return res.status(500).json({
        success: false,
        data: null,
        message: `Server error: ${err.message}`
      });
    }
  }
}

export default ExpenseController;
