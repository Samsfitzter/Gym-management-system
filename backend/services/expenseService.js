import pool from '../db/database.js';
import { getLocalDateStr, getOffsetLocalDateStr, getTodayStr } from '../utils/dateUtils.js';

export class ExpenseService {
  // --- Category Operations ---
  static async getCategories() {
    const res = await pool.query('SELECT * FROM expense_categories ORDER BY name ASC');
    return res.rows;
  }

  static async createCategory(name) {
    if (!name || name.trim() === '') {
      throw new Error('Category name is required');
    }
    const trimmed = name.trim();
    const res = await pool.query(
      'INSERT INTO expense_categories (name) VALUES ($1) RETURNING *',
      [trimmed]
    );
    return res.rows[0];
  }

  // --- Expense CRUD Operations ---
  static async createExpense(data) {
    const { expenseDate, categoryId, amount, description, paymentMethod, receiptUrl, createdBy } = data;

    if (!expenseDate || !categoryId || !amount || !paymentMethod || !createdBy) {
      throw new Error('Missing required expense details');
    }

    if (parseFloat(amount) <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    const normalizedMethod = String(paymentMethod).toLowerCase();
    if (!['cash', 'upi', 'bank_transfer', 'card'].includes(normalizedMethod)) {
      throw new Error('Invalid payment method');
    }

    // Verify category exists
    const catCheck = await pool.query('SELECT name FROM expense_categories WHERE id = $1', [categoryId]);
    if (catCheck.rows.length === 0) {
      throw new Error('Invalid Category Selected');
    }

    const res = await pool.query(
      `INSERT INTO expenses (expense_date, category_id, amount, description, payment_method, receipt_url, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING id`,
      [expenseDate, categoryId, amount, description || null, normalizedMethod, receiptUrl || null, createdBy]
    );

    return res.rows[0];
  }

  static async updateExpense(id, data) {
    const { expenseDate, categoryId, amount, description, paymentMethod, receiptUrl, updatedBy } = data;

    if (!expenseDate || !categoryId || !amount || !paymentMethod || !updatedBy) {
      throw new Error('Missing required expense details for update');
    }

    if (parseFloat(amount) <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    const normalizedMethod = String(paymentMethod).toLowerCase();
    if (!['cash', 'upi', 'bank_transfer', 'card'].includes(normalizedMethod)) {
      throw new Error('Invalid payment method');
    }

    // Verify category exists
    const catCheck = await pool.query('SELECT name FROM expense_categories WHERE id = $1', [categoryId]);
    if (catCheck.rows.length === 0) {
      throw new Error('Invalid Category Selected');
    }

    // Check if expense exists and not deleted
    const expCheck = await pool.query('SELECT id FROM expenses WHERE id = $1 AND is_deleted = false', [id]);
    if (expCheck.rows.length === 0) {
      throw new Error('Expense record not found');
    }

    await pool.query(
      `UPDATE expenses
       SET expense_date = $1, category_id = $2, amount = $3, description = $4, payment_method = $5, receipt_url = COALESCE($6, receipt_url), updated_by = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [expenseDate, categoryId, amount, description || null, normalizedMethod, receiptUrl || null, updatedBy, id]
    );

    return { success: true };
  }

  static async deleteExpense(id, userId) {
    if (!userId) {
      throw new Error('Modifier user ID is required for deleting');
    }
    const res = await pool.query(
      `UPDATE expenses
       SET is_deleted = true, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND is_deleted = false`,
      [userId, id]
    );

    if (res.rowCount === 0) {
      throw new Error('Expense record not found or already deleted');
    }

    return { success: true };
  }

  static async getExpenseById(id) {
    const res = await pool.query(
      `SELECT 
         e.id, 
         TO_CHAR(e.expense_date, 'YYYY-MM-DD') as "expenseDate", 
         e.category_id as "categoryId", 
         c.name as "categoryName", 
         e.amount, 
         e.description, 
         e.payment_method as "paymentMethod", 
         e.receipt_url as "receiptUrl", 
         e.created_by as "createdBy", 
         u.name as "creatorName",
         e.updated_by as "updatedBy",
         u2.name as "updaterName",
         e.created_at as "createdAt", 
         e.updated_at as "updatedAt"
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       JOIN users u ON e.created_by = u.id
       LEFT JOIN users u2 ON e.updated_by = u2.id
       WHERE e.id = $1 AND e.is_deleted = false`,
      [id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0];
  }

  static async getExpenses({ limit = 10, page = 1, search = '', category_id = '', fromDate = '', toDate = '', month = '' } = {}) {
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    let countSql = `
      SELECT COUNT(*) as total 
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      JOIN users u ON e.created_by = u.id
      WHERE e.is_deleted = false
    `;
    let sql = `
      SELECT 
        e.id, 
        TO_CHAR(e.expense_date, 'YYYY-MM-DD') as "expenseDate", 
        e.category_id as "categoryId", 
        c.name as "categoryName", 
        e.amount, 
        e.description, 
        e.payment_method as "paymentMethod", 
        e.receipt_url as "receiptUrl", 
        u.name as "creatorName",
        e.created_at as "createdAt"
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      JOIN users u ON e.created_by = u.id
      WHERE e.is_deleted = false
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      const condition = ` AND (c.name ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.payment_method ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
      countSql += condition;
      sql += condition;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category_id) {
      const condition = ` AND e.category_id = $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(category_id);
      paramIndex++;
    }

    if (fromDate) {
      const condition = ` AND e.expense_date >= $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      const condition = ` AND e.expense_date <= $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(toDate);
      paramIndex++;
    }

    if (month) {
      // month format 'YYYY-MM'
      const condition = ` AND TO_CHAR(e.expense_date, 'YYYY-MM') = $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(month);
      paramIndex++;
    }

    sql += ` ORDER BY e.expense_date DESC, e.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...params, parsedLimit, offset];

    const countRes = await pool.query(countSql, params);
    const rowsRes = await pool.query(sql, queryParams);

    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    return {
      rows: rowsRes.rows,
      total,
      page: parsedPage,
      limit: parsedLimit
    };
  }

  // --- Dashboard Summary Operations ---
  static async getDashboardExpenseSummary() {
    const todayStr = getTodayStr();
    const monthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

    const [todayRes, monthRes] = await Promise.all([
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = $1 AND is_deleted = false",
        [todayStr]
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1 AND is_deleted = false",
        [monthPrefix]
      )
    ]);

    return {
      todayExpenses: parseFloat(todayRes.rows[0]?.total || 0),
      monthlyExpenses: parseFloat(monthRes.rows[0]?.total || 0)
    };
  }

  // --- Range-based Revenue vs Expenses vs Profit Analytics ---
  static async getExpenseAnalytics(range = 'monthly') {
    const todayStr = getOffsetLocalDateStr(0);
    let startDate = todayStr;
    let endDate = todayStr;
    let type = 'daily';

    if (range === '7days' || range === 'daily') {
      startDate = getOffsetLocalDateStr(-6);
      endDate = todayStr;
      type = 'daily';
    } else if (range === '30days' || range === 'weekly') {
      startDate = getOffsetLocalDateStr(-29);
      endDate = todayStr;
      type = 'daily';
    } else if (range === 'current_month' || range === 'monthly') {
      const firstDay = new Date();
      firstDay.setDate(1);
      startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = todayStr;
      type = 'daily';
    } else if (range === 'current_year' || range === 'yearly') {
      const currentYear = new Date().getFullYear();
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;
      type = 'monthly';
    }

    if (type === 'daily') {
      // Compile daily map
      const trendMap = {};
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        trendMap[`${yyyy}-${mm}-${dd}`] = { revenue: 0, expenses: 0, profit: 0 };
      }

      // Query collections
      const revRes = await pool.query(
        "SELECT date, SUM(amount) as total FROM payments WHERE date >= $1 AND date <= $2 AND status = 'paid' GROUP BY date",
        [startDate, endDate]
      );
      revRes.rows.forEach(r => {
        if (trendMap[r.date]) {
          trendMap[r.date].revenue = parseFloat(r.total || 0);
        }
      });

      // Query expenses
      const expRes = await pool.query(
        "SELECT TO_CHAR(expense_date, 'YYYY-MM-DD') as date, SUM(amount) as total FROM expenses WHERE expense_date >= $1 AND expense_date <= $2 AND is_deleted = false GROUP BY expense_date",
        [startDate, endDate]
      );
      expRes.rows.forEach(r => {
        if (trendMap[r.date]) {
          trendMap[r.date].expenses = parseFloat(r.total || 0);
        }
      });

      const chartData = Object.entries(trendMap).map(([date, val]) => {
        const dObj = new Date(date);
        const label = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const profit = val.revenue - val.expenses;
        return {
          label,
          revenue: val.revenue,
          expenses: val.expenses,
          profit
        };
      });

      // Category breakdown for doughnut chart inside date range
      const categoryBreakdown = await this.getCategoryBreakdownData(startDate, endDate);

      return {
        chartData,
        categoryBreakdown
      };
    } else {
      // Monthly view for Current Year
      const trendMap = {};
      const currentYear = new Date().getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let m = 1; m <= 12; m++) {
        const key = `${currentYear}-${String(m).padStart(2, '0')}`;
        trendMap[key] = { label: monthNames[m - 1], revenue: 0, expenses: 0, profit: 0 };
      }

      // Query collections
      const revRes = await pool.query(
        "SELECT SUBSTRING(date FROM 1 FOR 7) as month, SUM(amount) as total FROM payments WHERE date >= $1 AND date <= $2 AND status = 'paid' GROUP BY month",
        [startDate, endDate]
      );
      revRes.rows.forEach(r => {
        if (trendMap[r.month]) {
          trendMap[r.month].revenue = parseFloat(r.total || 0);
        }
      });

      // Query expenses
      const expRes = await pool.query(
        "SELECT TO_CHAR(expense_date, 'YYYY-MM') as month, SUM(amount) as total FROM expenses WHERE expense_date >= $1 AND expense_date <= $2 AND is_deleted = false GROUP BY month",
        [startDate, endDate]
      );
      expRes.rows.forEach(r => {
        if (trendMap[r.month]) {
          trendMap[r.month].expenses = parseFloat(r.total || 0);
        }
      });

      const chartData = Object.entries(trendMap).map(([_, val]) => {
        const profit = val.revenue - val.expenses;
        return {
          label: val.label,
          revenue: val.revenue,
          expenses: val.expenses,
          profit
        };
      });

      // Category breakdown for current year
      const categoryBreakdown = await this.getCategoryBreakdownData(startDate, endDate);

      return {
        chartData,
        categoryBreakdown
      };
    }
  }

  static async getCategoryBreakdownData(startDate, endDate) {
    const res = await pool.query(
      `SELECT c.name as category, COALESCE(SUM(e.amount), 0) as total
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       WHERE e.expense_date >= $1 AND e.expense_date <= $2 AND e.is_deleted = false
       GROUP BY c.name
       ORDER BY total DESC`,
      [startDate, endDate]
    );

    // Calculate total expense for percentage math
    const grandTotal = res.rows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0);

    return res.rows.map(row => {
      const amt = parseFloat(row.total || 0);
      const percentage = grandTotal > 0 ? parseFloat(((amt / grandTotal) * 100).toFixed(1)) : 0;
      return {
        category: row.category,
        total: amt,
        percentage
      };
    });
  }

  // --- Reports Service Actions ---
  static async getProfitAndLossReport(view = 'monthly') {
    const now = new Date();
    const currentYear = now.getFullYear();

    if (view === 'monthly') {
      const reportRows = [];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      for (let m = 1; m <= 12; m++) {
        const monthPrefix = `${currentYear}-${String(m).padStart(2, '0')}`;
        
        // Sum payments (Revenue)
        const revRes = await pool.query(
          "SELECT SUM(amount) as total FROM payments WHERE date LIKE $1 AND status = 'paid'",
          [`${monthPrefix}%`]
        );
        
        // Sum expenses
        const expRes = await pool.query(
          "SELECT SUM(amount) as total FROM expenses WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1 AND is_deleted = false",
          [monthPrefix]
        );

        const revenue = parseFloat(revRes.rows[0]?.total || 0);
        const expenses = parseFloat(expRes.rows[0]?.total || 0);
        const netProfit = revenue - expenses;

        reportRows.push({
          period: monthNames[m - 1],
          revenue,
          expenses,
          netProfit
        });
      }

      return reportRows;
    } else {
      // Yearly view (last 5 years)
      const reportRows = [];
      for (let y = currentYear - 4; y <= currentYear; y++) {
        // Sum payments
        const revRes = await pool.query(
          "SELECT SUM(amount) as total FROM payments WHERE date LIKE $1 AND status = 'paid'",
          [`${y}%`]
        );

        // Sum expenses
        const expRes = await pool.query(
          "SELECT SUM(amount) as total FROM expenses WHERE TO_CHAR(expense_date, 'YYYY') = $1 AND is_deleted = false",
          [String(y)]
        );

        const revenue = parseFloat(revRes.rows[0]?.total || 0);
        const expenses = parseFloat(expRes.rows[0]?.total || 0);
        const netProfit = revenue - expenses;

        reportRows.push({
          period: String(y),
          revenue,
          expenses,
          netProfit
        });
      }

      return reportRows.reverse(); // Newest first
    }
  }

  static async getCategoryWiseReport({ fromDate = '', toDate = '' } = {}) {
    const getOffsetDateString = (daysOffset) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const todayStr = getOffsetDateString(0);
    const startDate = fromDate || getOffsetDateString(-29); // default 30 days
    const endDate = toDate || todayStr;

    return await this.getCategoryBreakdownData(startDate, endDate);
  }
}

export default ExpenseService;
