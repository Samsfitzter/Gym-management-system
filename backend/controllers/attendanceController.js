import AttendanceService from '../services/attendanceService.js';
import { getTodayStr } from '../utils/dateUtils.js';

export class AttendanceController {
  /**
   * Smart scan endpoint — handles both check-in and check-out automatically.
   * First scan with open_session = FALSE → check-in
   * Second scan with open_session = TRUE and elapsed > 30s → check-out
   */
  static async scan(req, res) {
    const { member_id, attendance_method, device_log_id } = req.body;

    if (!member_id) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'member_id is required'
      });
    }

    const method = attendance_method || 'manual';

    try {
      const result = await AttendanceService.handleScan({ 
        memberId: member_id, 
        attendanceMethod: method, 
        deviceLogId: device_log_id || null 
      });

      const isCheckIn = result.event === 'check_in';
      return res.status(isCheckIn ? 201 : 200).json({
        success: true,
        data: {
          event: result.event,
          record: result.record,
          member_name: result.member.name
        },
        message: isCheckIn
          ? `Check-in recorded for ${result.member.name}`
          : `Check-out recorded for ${result.member.name} — ${result.record.duration_minutes} min session`
      });
    } catch (err) {
      console.error('Scan controller error:', err.message);
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message
      });
    }
  }

  /**
   * Legacy check-in endpoint — delegates to scan() for backward compatibility.
   */
  static async checkIn(req, res) {
    return AttendanceController.scan(req, res);
  }

  static async getAttendance(req, res) {
    const { fromDate, toDate, date, limit, page, search, memberId, range } = req.query;
    try {
      const filters = {
        fromDate: fromDate || '',
        toDate: toDate || '',
        date: date || '',
        limit: limit ? parseInt(limit, 10) : 10,
        page: page ? parseInt(page, 10) : 1,
        search: search || '',
        memberId: memberId || '',
        range: range || ''
      };

      const result = await AttendanceService.getAttendance(filters);

      return res.json({
        success: true,
        data: result,
        message: 'Attendance records retrieved'
      });
    } catch (err) {
      console.error('Get attendance controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }

  static async getToday(req, res) {
    try {
      const todayStr = getTodayStr();
      const records = await AttendanceService.getAttendanceByDate(todayStr);
      return res.json({
        success: true,
        data: records,
        message: "Today's attendance records retrieved"
      });
    } catch (err) {
      console.error('Today attendance controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }

  static async getHistory(req, res) {
    const { date } = req.query;
    try {
      const targetDate = date || getTodayStr();
      const report = await AttendanceService.getDailyReport(targetDate);
      return res.json({
        success: true,
        data: report,
        message: 'Daily attendance report retrieved'
      });
    } catch (err) {
      console.error('History report controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }

  static async getMemberHistory(req, res) {
    const { id } = req.params;
    try {
      const records = await AttendanceService.getMemberHistory(id);
      return res.json({
        success: true,
        data: records,
        message: 'Member history retrieved successfully'
      });
    } catch (err) {
      console.error('Member history controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }

  /**
   * Returns all members currently inside the gym (is_inside = TRUE).
   */
  static async getCurrentlyInside(req, res) {
    try {
      const members = await AttendanceService.getCurrentlyInside();
      return res.json({
        success: true,
        data: members,
        message: `${members.length} member(s) currently inside`
      });
    } catch (err) {
      console.error('Currently inside controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }

  /**
   * Staff-initiated manual checkout for a single open session.
   * checkout_time = NOW(), auto_closed = FALSE.
   */
  static async manualCheckout(req, res) {
    const { id } = req.params; // attendance record ID
    if (!id) {
      return res.status(400).json({ success: false, data: null, message: 'Attendance record ID is required' });
    }
    try {
      const result = await AttendanceService.manualCheckout(parseInt(id, 10));
      return res.json({
        success: true,
        data: result,
        message: `Manual checkout recorded for ${result.member.name} — ${result.record.duration_minutes} min session`
      });
    } catch (err) {
      console.error('Manual checkout controller error:', err.message);
      return res.status(400).json({ success: false, data: null, message: err.message });
    }
  }

  /**
   * Manually trigger stale session auto-close (admin only).
   * Also called automatically by the nightly cron at 23:59.
   */
  static async autoCloseStale(req, res) {
    try {
      const result = await AttendanceService.autoCloseStale();
      return res.json({
        success: true,
        data: result,
        message: `Auto-closed ${result.closed} stale attendance session(s)`
      });
    } catch (err) {
      console.error('Auto-close stale controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }
}

export default AttendanceController;
