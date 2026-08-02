import pool from '../db/database.js';
import AttendanceService from './attendanceService.js';
import { getLocalDateStr, getOffsetLocalDateStr, getTodayStr, parseLocalDateStr, formatUTCDateStr } from '../utils/dateUtils.js';

export const MEMBERSHIP_PLANS = {
  '1 Day': { price: 150 },
  '1 Week': { price: 600 },
  '15 Days': { price: 800 },
  'Monthly': { price: 1200 },
  '3 Months': { price: 3500 },
  '6 Months': { price: 6800 },
  'Yearly': { price: 12000 },
  '1 Year': { price: 12000 },
  'PT': { price: 3500 }
};

export class MemberService {
  static async getMembers({ limit = 10, page = 1, search = '', status = '', expiring = '' } = {}) {
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    let countSql = 'SELECT COUNT(*) as total FROM members WHERE 1=1';
    let sql = 'SELECT * FROM members WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Search filter
    if (search) {
      const condition = ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR register_number ILIKE $${paramIndex} OR id::text ILIKE $${paramIndex} OR device_user_id ILIKE $${paramIndex})`;
      countSql += condition;
      sql += condition;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Status filter
    if (status) {
      const condition = ` AND status = $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(status);
      paramIndex++;
    }

    // Expiring filter (Next 15 days, already expired, or has outstanding balance)
    if (expiring === 'true' || expiring === true) {
      const todayStr = getTodayStr();
      const fifteenDaysFromNowStr = getOffsetLocalDateStr(15);

      // Expired, expiring in next 15 days, or has outstanding balance
      const condition = ` AND (expiry_date <= $${paramIndex} OR outstanding_balance > 0)`;
      countSql += condition;
      sql += condition;
      params.push(fifteenDaysFromNowStr);
      paramIndex++;
    }

    sql += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...params, parsedLimit, offset];

    const countRes = await pool.query(countSql, params);
    const rowsRes = await pool.query(sql, queryParams);

    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    const rows = rowsRes.rows.map(row => {
      if (row.date_of_birth) {
        const d = new Date(row.date_of_birth);
        row.date_of_birth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      return row;
    });

    return {
      rows,
      total,
      page: parsedPage,
      limit: parsedLimit
    };
  }

  static async getMemberById(id) {
    const memberRes = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    const member = memberRes.rows[0];
    if (!member) {
      return null;
    }

    if (member.date_of_birth) {
      const d = new Date(member.date_of_birth);
      member.date_of_birth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const paymentsRes = await pool.query(
      `SELECT p.*, m.name as member_name, m.phone as member_phone, m.membership_type, m.start_date, m.expiry_date 
       FROM payments p
       JOIN members m ON p.member_id = m.id
       WHERE p.member_id = $1 
       ORDER BY p.date DESC, p.id DESC`,
      [id]
    );

    const attendance = await AttendanceService.getMemberHistory(id);

    return {
      ...member,
      payments: paymentsRes.rows,
      attendance
    };
  }

  static async createMember(memberData) {
    const { name, email, phone, join_date, start_date, membership_type, amount, expiry_date, device_user_id, attendance_method, date_of_birth, profile_image_url, emergency_contact_name, emergency_contact_phone, register_number } = memberData;

    if (!name || !phone || !join_date || !membership_type || !expiry_date) {
      throw new Error('name, phone, join_date, membership_type, and expiry_date are required');
    }

    // Register number conflicts
    if (register_number) {
      const existingReg = await pool.query('SELECT name FROM members WHERE register_number = $1', [register_number]);
      if (existingReg.rows[0]) {
        throw new Error(`Register Number '${register_number}' is already registered to ${existingReg.rows[0].name}`);
      }
    }

    // Biometric device conflicts
    if (device_user_id) {
      const existingRes = await pool.query('SELECT name FROM members WHERE device_user_id = $1', [device_user_id]);
      if (existingRes.rows[0]) {
        throw new Error(`Biometric User ID '${device_user_id}' is already registered to ${existingRes.rows[0].name}`);
      }
    }

    // Phone conflicts
    if (phone) {
      const existingPhone = await pool.query('SELECT name FROM members WHERE phone = $1', [phone]);
      if (existingPhone.rows[0]) {
        throw new Error('Phone number is already registered to another member');
      }
    }

    // Email conflicts
    if (email) {
      const existingEmail = await pool.query('SELECT name FROM members WHERE email = $1', [email]);
      if (existingEmail.rows[0]) {
        throw new Error('Email address is already in use');
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const planFee = MEMBERSHIP_PLANS[membership_type]?.price || amount || 0;
      const initialPayment = parseFloat(amount) || 0;
      const initialOutstanding = Math.max(0, planFee - initialPayment);

      const result = await client.query(
        `INSERT INTO members (name, email, phone, join_date, start_date, membership_type, amount, outstanding_balance, total_paid, status, expiry_date, device_user_id, attendance_method, date_of_birth, profile_image_url, emergency_contact_name, emergency_contact_phone, register_number) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
        [name, email || null, phone, join_date, start_date || join_date, membership_type, planFee, initialOutstanding, initialPayment, expiry_date, device_user_id || null, attendance_method || 'manual', date_of_birth || null, profile_image_url || null, emergency_contact_name || null, emergency_contact_phone || null, register_number || null]
      );
      
      const memberId = result.rows[0].id;

      // Log initial payment if greater than 0
      if (initialPayment > 0) {
        // Generate receipt number
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const countRes = await client.query('SELECT COUNT(*) as count FROM payments');
        const count = parseInt(countRes.rows[0]?.count || 0, 10) + 1;
        const receipt_number = `REC-${dateStr}-${String(count).padStart(4, '0')}`;

        await client.query(
          `INSERT INTO payments (member_id, amount, date, payment_method, receipt_number, status, collected_by)
           VALUES ($1, $2, $3, 'cash', $4, 'paid', 'System')`,
          [memberId, initialPayment, join_date, receipt_number]
        );
      }

      await client.query('COMMIT');
      return { id: memberId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateMember(id, memberData) {
    const { name, email, phone, join_date, start_date, membership_type, amount, expiry_date, device_user_id, attendance_method, date_of_birth, profile_image_url, emergency_contact_name, emergency_contact_phone, register_number } = memberData;

    if (!name || !phone || !join_date || !membership_type || !expiry_date) {
      throw new Error('Missing required fields');
    }

    // Register number conflicts
    if (register_number) {
      const existingReg = await pool.query(
        'SELECT id, name FROM members WHERE register_number = $1 AND id != $2',
        [register_number, id]
      );
      if (existingReg.rows[0]) {
        throw new Error(`Register Number '${register_number}' is already registered to ${existingReg.rows[0].name}`);
      }
    }

    // Biometric conflicts
    if (device_user_id) {
      const existingRes = await pool.query(
        'SELECT id, name FROM members WHERE device_user_id = $1 AND id != $2',
        [device_user_id, id]
      );
      if (existingRes.rows[0]) {
        throw new Error(`Biometric User ID '${device_user_id}' is already registered to ${existingRes.rows[0].name}`);
      }
    }

    // Email conflicts
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id, name FROM members WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (existingEmail.rows[0]) {
        throw new Error('Email address is already in use');
      }
    }

    const memberRes = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    const member = memberRes.rows[0];
    if (!member) {
      throw new Error('Member not found');
    }

    const planFee = MEMBERSHIP_PLANS[membership_type]?.price || 0;
    
    // Calculate the paid amount of the current cycle before this edit
    const oldCyclePaid = Math.max(0, (parseFloat(member.amount) || 0) - (parseFloat(member.outstanding_balance) || 0));
    const newCyclePaid = parseFloat(amount) || 0;
    const diff = newCyclePaid - oldCyclePaid;

    const newTotalPaid = (parseFloat(member.total_paid) || 0) + diff;
    const newOutstanding = Math.max(0, planFee - newCyclePaid);

    const res = await pool.query(
      `UPDATE members 
       SET name = $1, email = $2, phone = $3, join_date = $4, start_date = $5, membership_type = $6, amount = $7, outstanding_balance = $8, total_paid = $9, expiry_date = $10, device_user_id = $11, attendance_method = $12, date_of_birth = $13, profile_image_url = $14, emergency_contact_name = $15, emergency_contact_phone = $16, register_number = $17, updated_at = CURRENT_TIMESTAMP
       WHERE id = $18`,
      [name, email || null, phone, join_date, start_date || join_date, membership_type, planFee, newOutstanding, newTotalPaid, expiry_date, device_user_id || null, attendance_method || 'manual', date_of_birth || null, profile_image_url || null, emergency_contact_name || null, emergency_contact_phone || null, register_number || null, id]
    );

    if (res.rowCount === 0) {
      throw new Error('Member not found');
    }

    return { success: true };
  }

  static async updateMemberStatus(id, status) {
    if (!status || (status !== 'active' && status !== 'inactive')) {
      throw new Error('Invalid status value');
    }

    const res = await pool.query(
      'UPDATE members SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    if (res.rowCount === 0) {
      throw new Error('Member not found');
    }

    return { success: true };
  }

  static async deleteMember(id) {
    const res = await pool.query('DELETE FROM members WHERE id = $1', [id]);
    if (res.rowCount === 0) {
      throw new Error('Member not found');
    }
    return { success: true };
  }

  static async renewMember(id, { planName, amount, paymentMethod, collectedBy, startDate }) {
    if (!planName || amount === undefined || !paymentMethod) {
      throw new Error('planName, amount, and paymentMethod are required');
    }

    const memberRes = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    const member = memberRes.rows[0];
    if (!member) {
      throw new Error('Member not found');
    }

    const todayStr = getTodayStr();
    let baseDate;
    let start_date;

    if (startDate) {
      baseDate = parseLocalDateStr(startDate);
      start_date = startDate;
    } else {
      baseDate = parseLocalDateStr(todayStr);
      start_date = todayStr;

      if (member.status === 'active' && member.expiry_date && member.expiry_date > todayStr) {
        baseDate = parseLocalDateStr(member.expiry_date);
        start_date = member.expiry_date;
      }
    }

    const date = new Date(baseDate.getTime());
    switch (planName) {
      case '1 Day':
        date.setUTCDate(date.getUTCDate() + 1);
        break;
      case '1 Week':
        date.setUTCDate(date.getUTCDate() + 7);
        break;
      case '15 Days':
        date.setUTCDate(date.getUTCDate() + 15);
        break;
      case 'Monthly':
      case 'PT':
        date.setUTCMonth(date.getUTCMonth() + 1);
        break;
      case '3 Months':
        date.setUTCMonth(date.getUTCMonth() + 3);
        break;
      case '6 Months':
        date.setUTCMonth(date.getUTCMonth() + 6);
        break;
      case '1 Year':
        date.setUTCFullYear(date.getUTCFullYear() + 1);
        break;
      default:
        date.setUTCMonth(date.getUTCMonth() + 1);
    }
    const newExpiry = formatUTCDateStr(date);

    // Duplicate renewal check
    if (member.expiry_date && formatUTCDateStr(parseLocalDateStr(member.expiry_date)) === newExpiry) {
      throw new Error('Duplicate renewal: Membership is already renewed to this date');
    }

    // Auto-generate receipt inside helper or service
    const dateStr = todayStr.replace(/-/g, '');
    const countRes = await pool.query('SELECT COUNT(*) as count FROM payments');
    const count = parseInt(countRes.rows[0]?.count || 0, 10) + 1;
    const receiptNum = `REC-${dateStr}-${String(count).padStart(4, '0')}`;

    // Perform database operations within a TRANSACTION
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const planFee = MEMBERSHIP_PLANS[planName]?.price || 0;
      const paidAmount = parseFloat(amount) || 0;
      const currentOutstanding = parseFloat(member.outstanding_balance) || 0;
      
      let newOutstanding = currentOutstanding + planFee - paidAmount;
      if (newOutstanding < 0) newOutstanding = 0;

      // 1. Update member status, planName, start_date, amount, expiry_date, outstanding_balance, total_paid
      await client.query(
        `UPDATE members 
         SET expiry_date = $1, start_date = $2, membership_type = $3, amount = $4, outstanding_balance = $5, total_paid = COALESCE(total_paid, 0) + $6, status = 'active', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $7`,
        [newExpiry, start_date, planName, planFee, newOutstanding, paidAmount, id]
      );

      // 2. Record renewal payment
      await client.query(
        `INSERT INTO payments (member_id, amount, date, payment_method, receipt_number, status, collected_by) 
         VALUES ($1, $2, $3, $4, $5, 'paid', $6)`,
        [id, amount, todayStr, paymentMethod, receiptNum, collectedBy || 'Staff']
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    return {
      newExpiry,
      receiptNumber: receiptNum
    };
  }
}

export default MemberService;
