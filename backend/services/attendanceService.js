import pool from '../db/database.js';
import { getLocalDateStr, getOffsetLocalDateStr, getTodayStr } from '../utils/dateUtils.js';

/**
 * Format a Date object to "HH:MM AM/PM" for backward-compatible check_in_time VARCHAR column,
 * correctly respecting the local timezone (defaults to Asia/Kolkata).
 */
function formatTimeAMPM(date) {
  const timeZone = process.env.TIMEZONE || 'Asia/Kolkata';
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Format a Date object to "YYYY-MM-DD" respecting the local timezone (defaults to Asia/Kolkata).
 */
function formatLocalDate(date) {
  return getLocalDateStr(date);
}

export class AttendanceService {
  /**
   * Smart scan handler — first scan = check-in, second scan = check-out.
   * Open-session detection is based solely on check_out_time IS NULL (no date filter),
   * which correctly handles sessions crossing midnight.
   * Duplicate scan guard: 30-second window.
   *
   * @returns {{ event: 'check_in'|'check_out', record: Object, member: Object }}
   */
  static async handleScan({ memberId, attendanceMethod = 'manual', scanTimestamp = new Date(), deviceLogId = null, verificationMethod = null, deviceName = null }) {
    if (!(scanTimestamp instanceof Date)) {
      scanTimestamp = new Date(scanTimestamp);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify member exists and is active
      const memberRes = await client.query(
        'SELECT id, name, status, expiry_date FROM members WHERE id = $1',
        [memberId]
      );
      const member = memberRes.rows[0];
      if (!member) throw new Error('Member not found');
      if (member.status !== 'active') {
        throw new Error(`Check-in denied: Member status is '${member.status}'.`);
      }

      // 2. Global duplicate scan guard: reject if < 30 seconds since LAST scan (check-in or check-out)
      const lastScanRes = await client.query(
        `SELECT GREATEST(check_in_timestamp, check_out_time) as last_scan_time
         FROM attendance
         WHERE member_id = $1
         ORDER BY GREATEST(check_in_timestamp, check_out_time) DESC NULLS LAST
         LIMIT 1`,
        [memberId]
      );

      if (lastScanRes.rows.length > 0 && lastScanRes.rows[0].last_scan_time) {
        const lastScanTs = new Date(lastScanRes.rows[0].last_scan_time);
        const diffSeconds = (scanTimestamp - lastScanTs) / 1000;
        if (diffSeconds < 30 && diffSeconds >= 0) {
          throw new Error(
            `Duplicate scan detected — please wait ${Math.ceil(30 - diffSeconds)} more second(s) before scanning again.`
          );
        }
      }

      // 3. Find open session — NO date filter, handles midnight crossovers
      // Added FOR UPDATE to prevent double-insert race conditions
      const openRes = await client.query(
        `SELECT * FROM attendance
         WHERE member_id = $1 AND check_out_time IS NULL
         ORDER BY check_in_timestamp DESC
         LIMIT 1 FOR UPDATE`,
        [memberId]
      );
      const openSession = openRes.rows[0];

      if (openSession) {
        // CHECK-OUT: close the open session
        const checkInTs = new Date(openSession.check_in_timestamp);
        const diffSeconds = (scanTimestamp - checkInTs) / 1000;
        const durationMinutes = Math.round(diffSeconds / 60);

        const updateRes = await client.query(
          `UPDATE attendance
           SET check_out_time = $1,
               duration_minutes = GREATEST(0, $2),
               updated_at = NOW(),
               checkout_device_log_id = $4
           WHERE id = $3
           RETURNING *`,
          [scanTimestamp, durationMinutes, openSession.id, deviceLogId]
        );

        // Mark member as no longer inside
        await client.query(
          'UPDATE members SET is_inside = FALSE, updated_at = NOW() WHERE id = $1',
          [memberId]
        );

        await client.query('COMMIT');
        return { event: 'check_out', record: updateRes.rows[0], member };

      } else {
        // 3c. CHECK-IN: no open session → create a new one
        const todayStr = formatLocalDate(scanTimestamp);
        const timeStr = formatTimeAMPM(scanTimestamp); // backward-compat VARCHAR column

        const insertRes = await client.query(
          `INSERT INTO attendance
             (member_id, check_in_timestamp, check_in_time, date, attendance_method, device_log_id, verification_method, device_name, device_event_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [memberId, scanTimestamp, timeStr, todayStr, attendanceMethod, deviceLogId, verificationMethod, deviceName, scanTimestamp]
        );

        // Mark member as inside
        await client.query(
          'UPDATE members SET is_inside = TRUE, updated_at = NOW() WHERE id = $1',
          [memberId]
        );

        await client.query('COMMIT');
        return { event: 'check_in', record: insertRes.rows[0], member };
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Legacy alias kept for backward compatibility with existing callers.
   * Routes existing checkInMember calls to the new handleScan.
   */
  static async checkInMember(memberId, checkInTime, date, attendanceMethod = 'manual', deviceLogId = null) {
    return this.handleScan({ memberId, attendanceMethod, deviceLogId });
  }

  /**
   * Returns all members currently inside the gym (is_inside = TRUE).
   */
  static async getCurrentlyInside() {
    const res = await pool.query(
      `SELECT
         m.id, m.name, m.phone, m.membership_type, m.register_number,
         a.id as attendance_id,
         a.check_in_timestamp,
         a.check_in_time,
         a.attendance_method
       FROM members m
       JOIN attendance a ON a.member_id = m.id
       WHERE m.is_inside = TRUE
         AND a.check_out_time IS NULL
       ORDER BY a.check_in_timestamp ASC`
    );
    return res.rows;
  }

  /**
   * Nightly auto-close: called at 23:59 every day.
   * Closes ALL open attendance sessions by setting:
   *   check_out_time = end-of-day timestamp
   *   auto_closed = TRUE
   *   members.is_inside = FALSE
   */
  static async autoCloseStale() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Close each open session at the end of its OWN check-in day (not necessarily today).
      // This handles cases where the nightly cron was missed and auto-close runs the next day.
      const closeRes = await client.query(
        `UPDATE attendance
         SET check_out_time  = DATE_TRUNC('day', check_in_timestamp) + INTERVAL '23 hours 59 minutes 59 seconds',
             duration_minutes = GREATEST(
               0,
               ROUND(EXTRACT(EPOCH FROM (
                 DATE_TRUNC('day', check_in_timestamp) + INTERVAL '23 hours 59 minutes 59 seconds'
                 - check_in_timestamp
               )) / 60)::INTEGER
             ),
             auto_closed = TRUE,
             updated_at = NOW()
         WHERE check_out_time IS NULL
         RETURNING member_id`
      );

      const affectedMemberIds = closeRes.rows.map(r => r.member_id);

      if (affectedMemberIds.length > 0) {
        // Reset is_inside for all affected members
        await client.query(
          'UPDATE members SET is_inside = FALSE, updated_at = NOW() WHERE id = ANY($1)',
          [affectedMemberIds]
        );
      }

      await client.query('COMMIT');
      return { closed: affectedMemberIds.length, memberIds: affectedMemberIds };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Staff-initiated manual checkout for a specific attendance record.
   * Sets check_out_time = NOW() and auto_closed = FALSE.
   * This preserves the distinction between staff-corrected attendance
   * and the nightly system cleanup (auto_closed = TRUE).
   *
   * @param {number} attendanceId - The attendance record ID to close
   * @returns {{ record: Object, member: Object }}
   */
  static async manualCheckout(attendanceId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify the session exists and is still open
      const sessionRes = await client.query(
        'SELECT * FROM attendance WHERE id = $1 AND check_out_time IS NULL',
        [attendanceId]
      );
      const session = sessionRes.rows[0];
      if (!session) {
        throw new Error('Session not found or already checked out.');
      }

      const now = new Date();
      const durationMinutes = Math.round((now - new Date(session.check_in_timestamp)) / 60000);

      // Close the session with NOW() — NOT end-of-day — and mark auto_closed = FALSE
      const updateRes = await client.query(
        `UPDATE attendance
         SET check_out_time   = NOW(),
             duration_minutes = $1,
             auto_closed      = FALSE,
             updated_at       = NOW()
         WHERE id = $2
         RETURNING *`,
        [Math.max(0, durationMinutes), attendanceId]
      );

      // Reset is_inside for the member
      await client.query(
        'UPDATE members SET is_inside = FALSE, updated_at = NOW() WHERE id = $1',
        [session.member_id]
      );

      // Fetch member details for the response
      const memberRes = await client.query(
        'SELECT id, name, phone FROM members WHERE id = $1',
        [session.member_id]
      );

      await client.query('COMMIT');
      return { record: updateRes.rows[0], member: memberRes.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * General list query for attendance records with pagination and search/dates filtering.
   * Now includes check_out_time, duration_minutes, auto_closed.
   */
  static async getAttendance({ limit = 10, page = 1, search = '', date = '', fromDate = '', toDate = '', memberId = '', range = '' } = {}) {
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    const getOffsetDateString = (daysOffset) => getOffsetLocalDateStr(daysOffset);

    let targetDate = date;
    let targetFromDate = fromDate;
    let targetToDate = toDate;

    if (range) {
      const todayStr = getOffsetDateString(0);
      if (range === 'daily') {
        targetDate = date || todayStr;
        targetFromDate = '';
        targetToDate = '';
      } else if (range === 'weekly') {
        targetDate = '';
        targetFromDate = getOffsetDateString(-6);
        targetToDate = todayStr;
      } else if (range === 'monthly') {
        targetDate = '';
        targetFromDate = getOffsetDateString(-29);
        targetToDate = todayStr;
      }
    }

    let countSql = `
      SELECT COUNT(*) as total
      FROM attendance a
      JOIN members m ON a.member_id = m.id
      WHERE 1=1
    `;
    let sql = `
      SELECT
        a.*,
        m.name as member_name,
        m.phone as member_phone,
        m.membership_type,
        m.status as member_status,
        m.expiry_date as member_expiry_date,
        m.device_user_id,
        m.register_number as member_register_number
      FROM attendance a
      JOIN members m ON a.member_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      const condition = ` AND (m.name ILIKE $${paramIndex} OR m.phone ILIKE $${paramIndex} OR m.register_number ILIKE $${paramIndex} OR m.id::text ILIKE $${paramIndex})`;
      countSql += condition;
      sql += condition;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (targetDate) {
      const condition = ` AND a.date = $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(targetDate);
      paramIndex++;
    }

    if (targetFromDate) {
      const condition = ` AND a.date >= $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(targetFromDate);
      paramIndex++;
    }

    if (targetToDate) {
      const condition = ` AND a.date <= $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(targetToDate);
      paramIndex++;
    }

    if (memberId) {
      const condition = ` AND a.member_id = $${paramIndex}`;
      countSql += condition;
      sql += condition;
      params.push(memberId);
      paramIndex++;
    }

    // Summary stats by attendance method
    const statsSql = countSql.replace('SELECT COUNT(*) as total', 'SELECT a.attendance_method, COUNT(*) as count')
      + ' GROUP BY a.attendance_method';
    const statsRes = await pool.query(statsSql, params);

    const method_counts = {};
    let total_count = 0;
    statsRes.rows.forEach(r => {
      const count = parseInt(r.count, 10);
      method_counts[r.attendance_method] = count;
      total_count += count;
    });

    // Count currently inside
    const insideRes = await pool.query('SELECT COUNT(*) as count FROM members WHERE is_inside = TRUE');
    const currently_inside = parseInt(insideRes.rows[0].count, 10);

    const summary = { total_count, method_counts, currently_inside };

    sql += ` ORDER BY a.check_in_timestamp DESC NULLS LAST, a.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...params, parsedLimit, offset];

    const countRes = await pool.query(countSql, params);
    const rowsRes = await pool.query(sql, queryParams);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    return { rows: rowsRes.rows, total, page: parsedPage, limit: parsedLimit, summary };
  }

  /**
   * Fetches attendance records for a specific date (includes checkout columns).
   */
  static async getAttendanceByDate(date) {
    const res = await pool.query(
      `SELECT a.*, m.name as member_name, m.phone as member_phone, m.membership_type, m.status as member_status, m.expiry_date as member_expiry_date, m.device_user_id
       FROM attendance a
       JOIN members m ON a.member_id = m.id
       WHERE a.date = $1
       ORDER BY a.check_in_timestamp DESC NULLS LAST, a.id DESC`,
      [date]
    );
    return res.rows;
  }

  /**
   * Get history logs for a member.
   */
  static async getMemberHistory(memberId) {
    const res = await pool.query(
      `SELECT * FROM attendance
       WHERE member_id = $1
       ORDER BY check_in_timestamp DESC NULLS LAST, id DESC`,
      [memberId]
    );
    return res.rows;
  }

  /**
   * Get attendance report/stats for a date, now including checkout data.
   */
  static async getDailyReport(date) {
    const records = await this.getAttendanceByDate(date);
    const methodCounts = records.reduce((acc, curr) => {
      const method = curr.attendance_method || 'manual';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    const insideNow = records.filter(r => r.check_out_time === null).length;

    return {
      date,
      total_count: records.length,
      method_counts: methodCounts,
      currently_inside: insideNow,
      records
    };
  }
}

export default AttendanceService;
