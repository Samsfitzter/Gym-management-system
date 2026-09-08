import pool from '../db/database.js';
import { getTodayStr } from '../utils/dateUtils.js';
import { generateReceiptNumber } from '../utils/receiptUtils.js';

const processedIdempotencyKeys = new Set();

export class PaymentService {
  static async getPayments({ limit = 10, page = 1, search = '', memberId = '' } = {}) {
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    let countSql = `
      SELECT COUNT(*) as total 
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE 1=1
    `;
    let sql = `
      SELECT p.*, m.name as member_name, m.phone as member_phone, m.membership_type, m.start_date, m.expiry_date, m.register_number as member_register_number
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      const condition = ` AND (m.name ILIKE $${paramIndex} OR m.phone ILIKE $${paramIndex} OR m.register_number ILIKE $${paramIndex} OR p.receipt_number ILIKE $${paramIndex})`;
      countSql += condition;
      sql += condition;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (memberId) {
      const condition = ` AND p.member_id = $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(memberId);
      paramIndex++;
    }

    sql += ` ORDER BY p.date DESC, p.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
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

  static async createPayment(paymentData) {
    const { member_id, amount, date, payment_method, status, collected_by, idempotency_key } = paymentData;

    if (!member_id || amount === undefined || !date || !payment_method) {
      throw new Error('Missing payment details');
    }

    if (idempotency_key) {
      if (processedIdempotencyKeys.has(idempotency_key)) {
        throw new Error('Duplicate payment submission detected');
      }
      processedIdempotencyKeys.add(idempotency_key);
      // Clean up memory after 1 hour
      setTimeout(() => processedIdempotencyKeys.delete(idempotency_key), 3600000);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify member exists
      const memberRes = await client.query('SELECT name FROM members WHERE id = $1', [member_id]);
      if (memberRes.rows.length === 0) {
        throw new Error('Member not found');
      }

      // Generate unique receipt number
      const receipt_number = await generateReceiptNumber(client, date);

      // Insert payment
      const result = await client.query(
        `INSERT INTO payments (member_id, amount, date, payment_method, receipt_number, status, collected_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, receipt_number`,
        [member_id, amount, date, payment_method, receipt_number, status || 'paid', collected_by || 'Staff']
      );

      const payAmount = parseFloat(amount) || 0;
      await client.query(
        `UPDATE members 
         SET outstanding_balance = GREATEST(0, outstanding_balance - $1),
             total_paid = COALESCE(total_paid, 0) + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [payAmount, member_id]
      );

      await client.query('COMMIT');

      return {
        id: result.rows[0].id,
        receipt_number: result.rows[0].receipt_number
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updatePaymentStatus(id, status) {
    if (!status || (status !== 'paid' && status !== 'pending' && status !== 'overdue')) {
      throw new Error('Invalid status');
    }

    const res = await pool.query(
      'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    if (res.rowCount === 0) {
      throw new Error('Payment record not found');
    }

    return { success: true };
  }
}

export default PaymentService;
