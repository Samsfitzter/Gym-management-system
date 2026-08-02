import pool from '../db/database.js';
import { getLocalDateStr, getOffsetLocalDateStr, getTodayStr } from '../utils/dateUtils.js';

export class DashboardService {
  static async getStats() {
    const todayStr = getTodayStr();
    
    const next7DaysStr = getOffsetLocalDateStr(7);

    const monthPrefix = todayStr.substring(0, 7);

    // Parallel execution of all stats queries
    const [
      checkinsRes,
      collectionsRes,
      activeMembersRes,
      expiringMembersRes,
      todayExpensesRes,
      monthlyRevenueRes,
      monthlyExpensesRes
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM attendance WHERE date = $1', [todayStr]),
      pool.query("SELECT SUM(amount) as total FROM payments WHERE date = $1 AND status = 'paid'", [todayStr]),
      pool.query("SELECT COUNT(*) as count FROM members WHERE status = 'active'"),
      pool.query(
        `SELECT id, name, phone, expiry_date, membership_type 
         FROM members 
         WHERE status = 'active' AND expiry_date >= $1 AND expiry_date <= $2
         ORDER BY expiry_date ASC`,
        [todayStr, next7DaysStr]
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = $1 AND is_deleted = false",
        [todayStr]
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date LIKE $1 AND status = 'paid'",
        [`${monthPrefix}%`]
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1 AND is_deleted = false",
        [monthPrefix]
      )
    ]);

    return {
      todayCheckIns: parseInt(checkinsRes.rows[0]?.count || 0, 10),
      todayCollections: parseFloat(collectionsRes.rows[0]?.total || 0),
      activeMembers: parseInt(activeMembersRes.rows[0]?.count || 0, 10),
      expiringMembers: expiringMembersRes.rows,
      todayExpenses: parseFloat(todayExpensesRes.rows[0]?.total || 0),
      monthlyRevenue: parseFloat(monthlyRevenueRes.rows[0]?.total || 0),
      monthlyExpenses: parseFloat(monthlyExpensesRes.rows[0]?.total || 0)
    };
  }

  static async getAnalytics(range = 'daily') {
    const todayStr = getOffsetLocalDateStr(0);
    let startDate = todayStr;
    let endDate = todayStr;
    let expiringStart = todayStr;
    let expiringEnd = todayStr;

    if (range === 'daily') {
      startDate = todayStr;
      endDate = todayStr;
      expiringStart = todayStr;
      expiringEnd = todayStr;
    } else if (range === 'weekly') {
      startDate = getOffsetLocalDateStr(-6);
      endDate = todayStr;
      expiringStart = todayStr;
      expiringEnd = getOffsetLocalDateStr(6);
    } else if (range === 'monthly') {
      startDate = getOffsetLocalDateStr(-29);
      endDate = todayStr;
      expiringStart = todayStr;
      expiringEnd = getOffsetLocalDateStr(29);
    }

    const monthPrefix = todayStr.substring(0, 7);

    const [
      attendanceCountRes,
      activeCountRes,
      newRegsCountRes,
      renewalsCountRes,
      collectionsCountRes,
      expiringCountRes,
      activeMembersList,
      renewalsList,
      expiringList,
      collectionsList,
      attendanceList,
      todayCollectionsRes,
      todayExpensesRes,
      monthlyRevenueRes,
      monthlyExpensesRes,
      totalMembersRes,
      activeMembersTodayRes,
      todayCheckInsRes
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM attendance WHERE date >= $1 AND date <= $2', [startDate, endDate]),
      pool.query("SELECT COUNT(*) as count FROM members WHERE status = 'active' AND join_date <= $2 AND expiry_date >= $1", [startDate, endDate]),
      pool.query('SELECT COUNT(*) as count FROM members WHERE join_date >= $1 AND join_date <= $2', [startDate, endDate]),
      pool.query(
        `SELECT COUNT(p.id) as count 
         FROM payments p 
         JOIN members m ON p.member_id = m.id 
         WHERE p.date >= $1 AND p.date <= $2 AND p.date > m.join_date`,
        [startDate, endDate]
      ),
      pool.query("SELECT SUM(amount) as total FROM payments WHERE date >= $1 AND date <= $2 AND status = 'paid'", [startDate, endDate]),
      pool.query(
        `SELECT COUNT(*) as count 
         FROM members 
         WHERE status = 'active' AND expiry_date >= $1 AND expiry_date <= $2`,
        [expiringStart, expiringEnd]
      ),
      // Detailed Lists
      pool.query(
        `SELECT id, name, phone, join_date, expiry_date, membership_type, amount 
         FROM members 
         WHERE status = 'active' AND join_date <= $2 AND expiry_date >= $1 
         ORDER BY id DESC`,
        [startDate, endDate]
      ),
      pool.query(
        `SELECT p.id, p.receipt_number, m.name as member_name, m.id as member_id, p.amount, p.date, p.payment_method 
         FROM payments p 
         JOIN members m ON p.member_id = m.id 
         WHERE p.date >= $1 AND p.date <= $2 AND p.date > m.join_date 
         ORDER BY p.date DESC, p.id DESC`,
        [startDate, endDate]
      ),
      pool.query(
        `SELECT id, name, phone, expiry_date, membership_type, amount 
         FROM members 
         WHERE status = 'active' AND expiry_date >= $1 AND expiry_date <= $2 
         ORDER BY expiry_date ASC`,
        [expiringStart, expiringEnd]
      ),
      pool.query(
        `SELECT p.id, p.receipt_number, m.name as member_name, m.id as member_id, p.amount, p.date, p.payment_method, p.status 
         FROM payments p 
         JOIN members m ON p.member_id = m.id 
         WHERE p.date >= $1 AND p.date <= $2 
         ORDER BY p.date DESC, p.id DESC`,
        [startDate, endDate]
      ),
      pool.query(
        `SELECT a.id, a.check_in_time, a.date, a.attendance_method, a.device_log_id, m.name as member_name, m.id as member_id, m.membership_type 
         FROM attendance a 
         JOIN members m ON a.member_id = m.id 
         WHERE a.date >= $1 AND a.date <= $2 
         ORDER BY a.id DESC`,
        [startDate, endDate]
      ),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date = $1 AND status = 'paid'", [todayStr]),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = $1 AND is_deleted = false", [todayStr]),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date LIKE $1 AND status = 'paid'", [`${monthPrefix}%`]),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1 AND is_deleted = false", [monthPrefix]),
      pool.query('SELECT COUNT(*) as count FROM members'),
      pool.query("SELECT COUNT(*) as count FROM members WHERE status = 'active'"),
      pool.query("SELECT COUNT(DISTINCT member_id) as count FROM attendance WHERE date = $1", [todayStr])
    ]);

    // Build Chart trend data
    let chartData = [];
    if (range === 'daily') {
      const hourlyCounts = {};
      for (let h = 6; h <= 22; h++) {
        const hrStr = String(h % 12 || 12).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        hourlyCounts[`${hrStr} ${ampm}`] = 0;
      }
      
      const todayAttendance = await pool.query('SELECT check_in_time FROM attendance WHERE date = $1', [todayStr]);
      todayAttendance.rows.forEach(r => {
        const time = r.check_in_time;
        const match = time.match(/(\d+):\d+\s+(AM|PM)/i);
        if (match) {
          const hr = String(parseInt(match[1], 10)).padStart(2, '0');
          const ampm = match[2].toUpperCase();
          const label = `${hr} ${ampm}`;
          if (hourlyCounts[label] !== undefined) {
            hourlyCounts[label]++;
          }
        }
      });
      chartData = Object.entries(hourlyCounts).map(([label, value]) => ({ label, value }));
    } else {
      const datesCounts = {};
      const offsetDays = range === 'weekly' ? -6 : -29;
      for (let i = offsetDays; i <= 0; i++) {
        datesCounts[getOffsetDateString(i)] = 0;
      }

      const trendQuery = `
        SELECT date, COUNT(*) as count 
        FROM attendance 
        WHERE date >= $1 AND date <= $2 
        GROUP BY date
      `;
      const trendRes = await pool.query(trendQuery, [startDate, endDate]);
      trendRes.rows.forEach(r => {
        if (datesCounts[r.date] !== undefined) {
          datesCounts[r.date] = parseInt(r.count, 10);
        }
      });

      chartData = Object.entries(datesCounts).map(([date, value]) => {
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
      metrics: {
        totalAttendance: parseInt(attendanceCountRes.rows[0]?.count || 0, 10),
        activeMembers: parseInt(activeCountRes.rows[0]?.count || 0, 10),
        newRegistrations: parseInt(newRegsCountRes.rows[0]?.count || 0, 10),
        renewals: parseInt(renewalsCountRes.rows[0]?.count || 0, 10),
        collections: parseFloat(collectionsCountRes.rows[0]?.total || 0),
        expiringMemberships: parseInt(expiringCountRes.rows[0]?.count || 0, 10),
        todayCollections: parseFloat(todayCollectionsRes.rows[0]?.total || 0),
        todayExpenses: parseFloat(todayExpensesRes.rows[0]?.total || 0),
        monthlyRevenue: parseFloat(monthlyRevenueRes.rows[0]?.total || 0),
        monthlyExpenses: parseFloat(monthlyExpensesRes.rows[0]?.total || 0),
        totalMembers: parseInt(totalMembersRes.rows[0]?.count || 0, 10),
        activeMembersToday: parseInt(activeMembersTodayRes.rows[0]?.count || 0, 10),
        todayCheckIns: parseInt(todayCheckInsRes.rows[0]?.count || 0, 10),
        absentMembersToday: Math.max(0, parseInt(activeMembersTodayRes.rows[0]?.count || 0, 10) - parseInt(todayCheckInsRes.rows[0]?.count || 0, 10))
      },
      chartData,
      monthlyCollections,
      lists: {
        activeMembersList: activeMembersList.rows,
        renewalsList: renewalsList.rows,
        expiringList: expiringList.rows,
        collectionsList: collectionsList.rows,
        attendanceList: attendanceList.rows
      }
    };
  }

  static async getNotifications() {
    const todayStr = getTodayStr();
    const tomorrowStr = getOffsetLocalDateStr(1);
    const threeDaysStr = getOffsetLocalDateStr(3);
    const sevenDaysStr = getOffsetLocalDateStr(7);

    // Birthdays range MMDD chronologically
    const getMMDDRange = (startOffset, endOffset) => {
      const arr = [];
      const base = new Date();
      for (let i = startOffset; i <= endOffset; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        arr.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
      return arr;
    };

    const todayMMDD = getMMDDRange(0, 0);
    const upcomingMMDD = getMMDDRange(1, 7);

    const [
      birthdaysTodayRes,
      birthdaysUpcomingRes,
      expiresTomorrowRes,
      expires3DaysRes,
      expires7DaysRes,
      expiredRes,
      paymentDueRes,
      longLeaveRes
    ] = await Promise.all([
      pool.query(
        "SELECT id, name, phone, date_of_birth, profile_image_url FROM members WHERE date_of_birth IS NOT NULL AND TO_CHAR(date_of_birth, 'MM-DD') = ANY($1)",
        [todayMMDD]
      ),
      pool.query(
        "SELECT id, name, phone, date_of_birth, profile_image_url FROM members WHERE date_of_birth IS NOT NULL AND TO_CHAR(date_of_birth, 'MM-DD') = ANY($1)",
        [upcomingMMDD]
      ),
      pool.query(
        "SELECT id, name, phone, expiry_date, membership_type, profile_image_url FROM members WHERE status = 'active' AND expiry_date = $1 ORDER BY name ASC",
        [tomorrowStr]
      ),
      pool.query(
        "SELECT id, name, phone, expiry_date, membership_type, profile_image_url FROM members WHERE status = 'active' AND expiry_date = $1 ORDER BY name ASC",
        [threeDaysStr]
      ),
      pool.query(
        "SELECT id, name, phone, expiry_date, membership_type, profile_image_url FROM members WHERE status = 'active' AND expiry_date = $1 ORDER BY name ASC",
        [sevenDaysStr]
      ),
      pool.query(
        "SELECT id, name, phone, expiry_date, membership_type, profile_image_url FROM members WHERE status = 'active' AND expiry_date < $1 ORDER BY expiry_date DESC, name ASC",
        [todayStr]
      ),
      pool.query(
        `SELECT id, name, phone, profile_image_url, membership_type, join_date, expiry_date, amount, outstanding_balance as due_amount, outstanding_balance
         FROM members
         WHERE outstanding_balance > 0
         ORDER BY name ASC`
      ),
      // Members active but absent for 7+ days (last attendance >= 7 days ago or never attended)
      pool.query(
        `SELECT m.id, m.name, m.phone, m.membership_type, m.expiry_date, m.profile_image_url,
                MAX(a.date) as last_visit
         FROM members m
         LEFT JOIN attendance a ON a.member_id = m.id
         WHERE m.status = 'active'
         GROUP BY m.id, m.name, m.phone, m.membership_type, m.expiry_date, m.profile_image_url
         HAVING MAX(a.date) IS NULL OR MAX(a.date) <= $1
         ORDER BY MAX(a.date) ASC NULLS FIRST, m.name ASC`,
        [getOffsetLocalDateStr(-7)]
      )
    ]);
    // Fetch latest communication logs per member and type
    const logsRes = await pool.query(
      `SELECT member_id, type, MAX(initiated_at) as last_sent
       FROM communication_logs
       GROUP BY member_id, type`
    );
    const logsMap = {};
    logsRes.rows.forEach(r => {
      if (!logsMap[r.member_id]) logsMap[r.member_id] = {};
      logsMap[r.member_id][r.type] = r.last_sent;
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const calculateBirthdayMetrics = (rows) => {
      return rows.map(r => {
        const dob = new Date(r.date_of_birth);
        const now = new Date();
        
        let currentAge = now.getFullYear() - dob.getFullYear();
        const mDiff = now.getMonth() - dob.getMonth();
        if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) {
          currentAge--;
        }
        
        // Year wrap-around calculation for turning age
        let nextBirthdayYear = now.getFullYear();
        if (dob.getMonth() < now.getMonth() || (dob.getMonth() === now.getMonth() && dob.getDate() < now.getDate())) {
          nextBirthdayYear = now.getFullYear() + 1;
        }
        const turningAge = nextBirthdayYear - dob.getFullYear();
        const birthdayFormatted = `${monthNames[dob.getMonth()]} ${dob.getDate()}`;
        
        return {
          ...r,
          date_of_birth: dob.toISOString().split('T')[0],
          currentAge,
          turningAge,
          birthdayFormatted,
          type: 'birthday',
          lastBirthdayWishSent: logsMap[r.id]?.birthday ? new Date(logsMap[r.id].birthday).toISOString() : null,
          lastMembershipReminderSent: logsMap[r.id]?.expiry ? new Date(logsMap[r.id].expiry).toISOString() : null,
          lastPaymentReminderSent: logsMap[r.id]?.payment ? new Date(logsMap[r.id].payment).toISOString() : null,
          lastAbsenceReminderSent: logsMap[r.id]?.absence ? new Date(logsMap[r.id].absence).toISOString() : null
        };
      });
    };

    const mapExpiries = (rows, type = 'expiry') => {
      return rows.map(r => ({
        ...r,
        type,
        lastBirthdayWishSent: logsMap[r.id]?.birthday ? new Date(logsMap[r.id].birthday).toISOString() : null,
        lastMembershipReminderSent: logsMap[r.id]?.expiry ? new Date(logsMap[r.id].expiry).toISOString() : null,
        lastPaymentReminderSent: logsMap[r.id]?.payment ? new Date(logsMap[r.id].payment).toISOString() : null,
        lastAbsenceReminderSent: logsMap[r.id]?.absence ? new Date(logsMap[r.id].absence).toISOString() : null
      }));
    };

    const mapPayments = (rows) => {
      return rows.map(r => ({
        ...r,
        type: 'payment_due',
        lastBirthdayWishSent: logsMap[r.id]?.birthday ? new Date(logsMap[r.id].birthday).toISOString() : null,
        lastMembershipReminderSent: logsMap[r.id]?.expiry ? new Date(logsMap[r.id].expiry).toISOString() : null,
        lastPaymentReminderSent: logsMap[r.id]?.payment ? new Date(logsMap[r.id].payment).toISOString() : null,
        lastAbsenceReminderSent: logsMap[r.id]?.absence ? new Date(logsMap[r.id].absence).toISOString() : null
      }));
    };

    const birthdaysToday = calculateBirthdayMetrics(birthdaysTodayRes.rows);
    const birthdaysUpcoming = calculateBirthdayMetrics(birthdaysUpcomingRes.rows);

    // Sort upcoming birthdays chronologically based on their index in upcomingMMDD array
    birthdaysUpcoming.sort((a, b) => {
      const aMMDD = a.date_of_birth ? a.date_of_birth.substring(5, 10) : '';
      const bMMDD = b.date_of_birth ? b.date_of_birth.substring(5, 10) : '';
      const indexA = upcomingMMDD.indexOf(aMMDD);
      const indexB = upcomingMMDD.indexOf(bMMDD);
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      return a.name.localeCompare(b.name);
    });

    // Sort birthdays today alphabetically by name
    birthdaysToday.sort((a, b) => a.name.localeCompare(b.name));

    const longLeaveMembers = longLeaveRes.rows.map(r => {
      const lastVisit = r.last_visit ? r.last_visit.toString().split('T')[0] : null;
      let daysSinceLastVisit = null;
      if (lastVisit) {
        const last = new Date(lastVisit);
        last.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        daysSinceLastVisit = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      }
      return {
        ...r,
        last_visit: lastVisit,
        daysSinceLastVisit,
        type: 'long_leave',
        lastBirthdayWishSent: logsMap[r.id]?.birthday ? new Date(logsMap[r.id].birthday).toISOString() : null,
        lastMembershipReminderSent: logsMap[r.id]?.expiry ? new Date(logsMap[r.id].expiry).toISOString() : null,
        lastPaymentReminderSent: logsMap[r.id]?.payment ? new Date(logsMap[r.id].payment).toISOString() : null,
        lastAbsenceReminderSent: logsMap[r.id]?.absence ? new Date(logsMap[r.id].absence).toISOString() : null
      };
    });

    return {
      birthdaysToday,
      birthdaysUpcoming,
      expiresTomorrow: mapExpiries(expiresTomorrowRes.rows, 'expiry'),
      expires3Days: mapExpiries(expires3DaysRes.rows, 'expiry'),
      expires7Days: mapExpiries(expires7DaysRes.rows, 'expiry'),
      expired: mapExpiries(expiredRes.rows, 'expired'),
      paymentDue: mapPayments(paymentDueRes.rows),
      longLeaveMembers
    };
  }
}

export default DashboardService;
