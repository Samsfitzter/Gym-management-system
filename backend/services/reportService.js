import pool from '../db/database.js';
import { getLocalDateStr, getOffsetLocalDateStr, getTodayStr } from '../utils/dateUtils.js';

export class ReportService {
  static async getCollectionAnalytics(range = 'daily', fromDate = null, toDate = null) {
    const todayStr = getOffsetLocalDateStr(0);
    let startDate = todayStr;
    let endDate = todayStr;

    if (range === 'daily') {
      startDate = todayStr;
      endDate = todayStr;
    } else if (range === 'weekly') {
      startDate = getOffsetLocalDateStr(-6);
      endDate = todayStr;
    } else if (range === 'monthly') {
      startDate = getOffsetLocalDateStr(-29);
      endDate = todayStr;
    } else if (range === 'custom') {
      if (!fromDate) {
        throw new Error('fromDate is required for custom range');
      }
      if (!toDate) {
        throw new Error('toDate is required for custom range');
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(fromDate)) {
        throw new Error('fromDate must be in YYYY-MM-DD format');
      }
      if (!dateRegex.test(toDate)) {
        throw new Error('toDate must be in YYYY-MM-DD format');
      }
      if (fromDate > toDate) {
        throw new Error('fromDate must be less than or equal to toDate');
      }
      if (toDate > todayStr) {
        throw new Error('toDate cannot be in the future');
      }
      const differenceInTime = new Date(toDate).getTime() - new Date(fromDate).getTime();
      const differenceInDays = Math.round(differenceInTime / (1000 * 3600 * 24));
      if (differenceInDays > 365) {
        throw new Error('Custom range cannot exceed 365 days');
      }
      startDate = fromDate;
      endDate = toDate;
    }

    // Parallel execution of reporting queries
    const [
      summaryRes,
      newRevRes,
      renewalRevRes,
      transactionsListRes
    ] = await Promise.all([
      // Get total collections amount, transaction counts, and paid transaction count
      pool.query(
        `SELECT 
           COALESCE(SUM(amount), 0) as total_collections,
           COUNT(*) as total_transactions,
           COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_transactions
         FROM payments 
         WHERE date >= $1 AND date <= $2`,
        [startDate, endDate]
      ),
      // New Membership Revenue (payments where date <= member join_date and paid)
      pool.query(
        `SELECT COALESCE(SUM(p.amount), 0) as total
         FROM payments p
         JOIN members m ON p.member_id = m.id
         WHERE p.date >= $1 AND p.date <= $2 AND p.status = 'paid' AND p.date <= m.join_date`,
        [startDate, endDate]
      ),
      // Renewal Revenue (payments where date > member join_date and paid)
      pool.query(
        `SELECT COALESCE(SUM(p.amount), 0) as total
         FROM payments p
         JOIN members m ON p.member_id = m.id
         WHERE p.date >= $1 AND p.date <= $2 AND p.status = 'paid' AND p.date > m.join_date`,
        [startDate, endDate]
      ),
      // Transaction logs detail
      pool.query(
        `SELECT p.receipt_number, m.name as member_name, m.membership_type as membership_plan, p.payment_method, p.amount, p.date
         FROM payments p
         JOIN members m ON p.member_id = m.id
         WHERE p.date >= $1 AND p.date <= $2
         ORDER BY p.date DESC, p.id DESC`,
        [startDate, endDate]
      )
    ]);

    const summaryRow = summaryRes.rows[0];
    const totalCollections = parseFloat(summaryRow?.total_collections || 0);
    const totalTransactions = parseInt(summaryRow?.total_transactions || 0, 10);
    const paidTransactions = parseInt(summaryRow?.paid_transactions || 0, 10);
    const averageCollection = paidTransactions > 0 ? (totalCollections / paidTransactions) : 0;
    const newMembershipRevenue = parseFloat(newRevRes.rows[0]?.total || 0);
    const renewalRevenue = parseFloat(renewalRevRes.rows[0]?.total || 0);

    // Build Chart trend data
    let chartData = [];
    if (range === 'daily') {
      const hourlyTotals = {};
      for (let h = 6; h <= 22; h++) {
        const hrStr = String(h % 12 || 12).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        hourlyTotals[`${hrStr} ${ampm}`] = 0;
      }
      
      const dailyPayments = await pool.query(
        "SELECT created_at, amount FROM payments WHERE date = $1 AND status = 'paid'",
        [todayStr]
      );
      
      dailyPayments.rows.forEach(r => {
        const dateObj = new Date(r.created_at);
        const hour = dateObj.getHours();
        const hrStr = String(hour % 12 || 12).padStart(2, '0');
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const label = `${hrStr} ${ampm}`;
        if (hourlyTotals[label] !== undefined) {
          hourlyTotals[label] += parseFloat(r.amount);
        }
      });
      chartData = Object.entries(hourlyTotals).map(([label, value]) => ({ label, value }));
    } else {
      const datesTotals = {};
      if (range === 'custom') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          datesTotals[`${yyyy}-${mm}-${dd}`] = 0;
        }
      } else {
        const offsetDays = range === 'weekly' ? -6 : -29;
        for (let i = offsetDays; i <= 0; i++) {
          datesTotals[getOffsetDateString(i)] = 0;
        }
      }

      const trendRes = await pool.query(
        "SELECT date, SUM(amount) as total FROM payments WHERE date >= $1 AND date <= $2 AND status = 'paid' GROUP BY date",
        [startDate, endDate]
      );
      trendRes.rows.forEach(r => {
        if (datesTotals[r.date] !== undefined) {
          datesTotals[r.date] = parseFloat(r.total);
        }
      });
      chartData = Object.entries(datesTotals).map(([date, value]) => {
        const dObj = new Date(date);
        const formatOptions = range === 'weekly' 
          ? { weekday: 'short', month: 'short', day: 'numeric' }
          : { month: 'short', day: 'numeric' };
        const label = dObj.toLocaleDateString('en-US', formatOptions);
        return { label, value };
      });
    }

    // Build monthly collections analytics (last 3 calendar months)
    const monthlyCollections = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    
    for (let i = -2; i <= 0; i++) {
      const mIdx = currentMonthIdx + i;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[(mIdx + 12) % 12];
      
      const m = (mIdx + 12) % 12;
      let y = currentYear;
      if (mIdx < 0) {
        y = currentYear - Math.ceil(Math.abs(mIdx) / 12);
      }
      const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      
      const res = await pool.query(
        "SELECT SUM(amount) as total FROM payments WHERE date LIKE $1 AND status = 'paid'",
        [`${monthPrefix}%`]
      );
      monthlyCollections.push({
        month: monthName,
        amount: parseFloat(res.rows[0]?.total || 0)
      });
    }

    return {
      summary: {
        totalCollections,
        totalTransactions,
        averageCollection,
        newMembershipRevenue,
        renewalRevenue
      },
      chartData,
      monthlyCollections,
      transactions: transactionsListRes.rows
    };
  }
}

export default ReportService;
