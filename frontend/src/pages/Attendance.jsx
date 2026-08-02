import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import attendanceApi from '../api/attendance.api.js';
import membersApi from '../api/members.api.js';
import { getTodayDateString } from '../utils/formatHelpers.js';
import {
  exportToCSV,
  exportToPDF
} from '../api/exportHelpers.js';
import {
  Search,
  Fingerprint,
  CheckCircle,
  Calendar,
  Cpu,
  Clock,
  UserCheck,
  LogOut,
  Users,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Timer,
  RefreshCw,
  X
} from 'lucide-react';

export const Attendance = () => {
  const { isAdmin } = useAuth();

  // Report state
  const [selectedReportDate, setSelectedReportDate] = useState(getTodayDateString());
  const [report, setReport] = useState({ total_count: 0, method_counts: {}, records: [], currently_inside: 0 });
  const [reportLoading, setReportLoading] = useState(true);
  const [range, setRange] = useState('daily');
  const [logSearch, setLogSearch] = useState('');

  // Currently inside panel
  const [insideMembers, setInsideMembers] = useState([]);
  const [insideLoading, setInsideLoading] = useState(false);

  // Scan form state
  const [memberQuery, setMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberOpenSession, setMemberOpenSession] = useState(null); // open session for selected member
  const [checkInMethod, setCheckInMethod] = useState('manual');
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  // Per-member manual checkout confirmation modal
  const [confirmModal, setConfirmModal] = useState(null); // { member: Object } | null
  const [checkingOut, setCheckingOut] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAttendanceLogs();
    fetchInsideMembers();

    // Auto-refresh every 10 seconds for real-time biometric updates
    const interval = setInterval(() => {
      fetchAttendanceLogs(true);
      fetchInsideMembers(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedReportDate, range, logSearch]);

  useEffect(() => {
    if (memberQuery.trim().length > 1) {
      searchMembers();
    } else {
      setSearchResults([]);
    }
  }, [memberQuery]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchAttendanceLogs = async (silent = false) => {
    try {
      if (!silent) setReportLoading(true);
      const res = await attendanceApi.getAll({
        range,
        date: range === 'daily' ? selectedReportDate : '',
        search: logSearch,
        limit: 1000
      });
      if (res.success && res.data) {
        setReport({
          records: res.data.rows,
          total_count: res.data.summary.total_count,
          method_counts: res.data.summary.method_counts,
          currently_inside: res.data.summary.currently_inside || 0
        });
      }
    } catch (err) {
      console.error(err);
      if (!silent) showToast(err.message || 'Error loading report data', 'error');
    } finally {
      if (!silent) setReportLoading(false);
    }
  };

  const fetchInsideMembers = async (silent = false) => {
    try {
      if (!silent) setInsideLoading(true);
      const res = await attendanceApi.getInsideMembers();
      if (res.success && res.data) {
        setInsideMembers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setInsideLoading(false);
    }
  };

  const searchMembers = async () => {
    try {
      const res = await membersApi.getAll({ status: 'active', search: memberQuery });
      if (res.success && res.data) {
        setSearchResults(res.data.rows);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * When a member is selected, check if they have an open session.
   */
  const handleSelectMember = async (member) => {
    setSelectedMember(member);
    setCheckInMethod(member.attendance_method || 'manual');
    setSearchResults([]);
    setMemberQuery('');
    setLastScanResult(null);

    // Check open session: query today's attendance for this member
    try {
      const res = await attendanceApi.getMemberHistory(member.id);
      if (res.success && res.data) {
        const openSession = res.data.find(r => r.check_out_time === null);
        setMemberOpenSession(openSession || null);
      }
    } catch (err) {
      setMemberOpenSession(null);
    }
  };

  const handleScan = async () => {
    if (!selectedMember) return;

    setScanning(true);
    try {
      const payload = {
        member_id: selectedMember.id,
        attendance_method: checkInMethod,
      };

      if (checkInMethod !== 'manual') {
        payload.device_log_id = 'DEVLOG-' + Math.floor(Math.random() * 90000 + 10000);
      }

      const res = await attendanceApi.scan(payload);

      if (res.success && res.data) {
        const { event, record } = res.data;
        setLastScanResult({ event, record });

        if (event === 'check_in') {
          showToast(`✅ Check-in registered for ${selectedMember.name}`, 'success');
          setMemberOpenSession(record);
        } else {
          showToast(`🏁 Check-out recorded — ${record.duration_minutes} min session`, 'success');
          setMemberOpenSession(null);
        }

        const todayStr = getTodayDateString();
        if (selectedReportDate === todayStr || range !== 'daily') {
          fetchAttendanceLogs();
        }
        fetchInsideMembers();
      } else {
        showToast(res.message || 'Scan failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Connection failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleManualCheckout = async () => {
    if (!confirmModal) return;
    setCheckingOut(true);
    try {
      const res = await attendanceApi.manualCheckout(confirmModal.attendance_id);
      if (res.success) {
        showToast(`✅ Manual checkout recorded for ${confirmModal.name}`, 'success');
        setConfirmModal(null);
        fetchInsideMembers();
        fetchAttendanceLogs();
      } else {
        showToast(res.message || 'Checkout failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Connection error during checkout', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDuration = (minutes) => {
    if (minutes === null || minutes === undefined) return '—';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getSessionAge = (checkInTs) => {
    if (!checkInTs) return '';
    const diffMs = Date.now() - new Date(checkInTs).getTime();
    const mins = Math.floor(diffMs / 60000);
    return formatDuration(mins);
  };

  const getMembershipStatus = (record) => {
    const status = record.member_status || record.status;
    if (status === 'inactive') {
      return { label: 'Inactive', colorClass: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }
    const expiryDate = record.member_expiry_date || record.expiry_date;
    if (!expiryDate) {
      return { label: 'Active', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: 'Expired', colorClass: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }

    if (diffDays < 15) {
      return { label: 'Expiring Soon', colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }

    return { label: 'Active', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  };

  const handleExportCSV = () => {
    const headers = ['Member Name', 'Member ID', 'Date', 'Check-In', 'Check-Out', 'Duration', 'Membership Status', 'Status'];
    const data = report.records.map(r => [
      r.member_name,
      String(r.member_id).padStart(4, '0'),
      r.date,
      r.check_in_time || formatTimestamp(r.check_in_timestamp),
      r.check_out_time ? formatTimestamp(r.check_out_time) : 'Open',
      r.duration_minutes !== null ? formatDuration(r.duration_minutes) : 'Open',
      getMembershipStatus(r).label,
      r.check_out_time ? (r.auto_closed ? 'Auto-closed' : 'Checked out') : 'Inside'
    ]);
    exportToCSV(data, headers, `attendance_report_${range}_${getTodayDateString()}.csv`);
  };

  const handleExportPDF = () => {
    const headers = ['Member Name', 'Member ID', 'Date', 'Check-In', 'Check-Out', 'Duration', 'Membership Status'];
    const data = report.records.map(r => [
      r.member_name,
      String(r.member_id).padStart(4, '0'),
      r.date,
      r.check_in_time || formatTimestamp(r.check_in_timestamp),
      r.check_out_time ? formatTimestamp(r.check_out_time) : 'Open',
      r.duration_minutes !== null ? formatDuration(r.duration_minutes) : 'Open',
      getMembershipStatus(r).label
    ]);
    const summary = {
      'Range': range.toUpperCase(),
      'Total Sessions': report.total_count,
      'Currently Inside': report.currently_inside,
      'Manual Entry': report.method_counts.manual || 0,
      'Biometric': Object.keys(report.method_counts).reduce((acc, curr) => {
        return curr !== 'manual' ? acc + (report.method_counts[curr] || 0) : acc;
      }, 0)
    };
    exportToPDF(`Attendance Log Report - ${range.toUpperCase()}`, headers, data, summary);
  };

  const isCheckingOut = Boolean(memberOpenSession);

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Attendance Gate" />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">

        {/* Scan Panel + Currently Inside side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Member Scan Form — 2 cols */}
          <div className="lg:col-span-2 glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">Attendance Gate</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Search a member to register <span className="text-emerald-400 font-semibold">Check-In</span> or <span className="text-rose-400 font-semibold">Check-Out</span> automatically.
              </p>
            </div>

            {/* Member search bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Type name, phone or ID to search active members..."
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl glass-input"
              />

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                  {searchResults.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className="px-4 py-2.5 hover:bg-indigo-600/20 text-sm cursor-pointer border-b border-slate-800/60 last:border-0 transition flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{member.name}</span>
                        {member.register_number && (
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2">
                            {member.register_number}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 ml-2 font-mono">{member.phone}</span>
                      </div>
                      {member.is_inside && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold">
                          Inside
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Member Panel */}
            {selectedMember ? (
              <div className={`p-5 border rounded-2xl flex flex-col space-y-4 animate-fade-in transition-colors ${isCheckingOut
                ? 'bg-rose-950/20 border-rose-500/30'
                : 'bg-emerald-950/20 border-emerald-500/30'
                }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-md font-bold text-slate-200">{selectedMember.name}</h4>
                      {isCheckingOut && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full font-bold">
                          🟢 Currently Inside
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      ID: #{String(selectedMember.id).padStart(4, '0')} {selectedMember.register_number && `| Reg: ${selectedMember.register_number}`} | {selectedMember.phone}
                    </p>
                    {isCheckingOut && memberOpenSession && (
                      <p className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                        <Clock size={11} />
                        Checked in at {memberOpenSession.check_in_time || formatTimestamp(memberOpenSession.check_in_timestamp)}
                        {' '}— {getSessionAge(memberOpenSession.check_in_timestamp)} ago
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedMember(null); setMemberOpenSession(null); setLastScanResult(null); }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Membership</span>
                    <p className="text-xs text-emerald-400 mt-1 font-semibold">Active</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-semibold">Expires: {selectedMember.expiry_date}</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isCheckingOut ? 'Check-Out Mode' : 'Check-In Mode'}
                    </label>
                    <select
                      value={checkInMethod}
                      onChange={(e) => setCheckInMethod(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg glass-input text-xs cursor-pointer capitalize font-semibold"
                    >
                      <option value="manual">Manual Entry (Front Desk)</option>
                      <option value="fingerprint">Fingerprint Scan (Biometric)</option>
                      <option value="face">Facial Recognition (Biometric)</option>
                      <option value="card">RFID Badge (Terminal)</option>
                      <option value="password">Keypad Passcode</option>
                      <option value="qr">QR Code Scan</option>
                    </select>
                  </div>
                </div>

                {/* Last scan result banner */}
                {lastScanResult && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${lastScanResult.event === 'check_in'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                    }`}>
                    {lastScanResult.event === 'check_in' ? <UserCheck size={14} /> : <LogOut size={14} />}
                    {lastScanResult.event === 'check_in'
                      ? `Checked in at ${formatTimestamp(lastScanResult.record.check_in_timestamp)}`
                      : `Checked out — Session duration: ${formatDuration(lastScanResult.record.duration_minutes)}`
                    }
                  </div>
                )}

                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className={`w-full py-3 font-semibold text-white rounded-xl cursor-pointer shadow-lg text-sm flex items-center justify-center gap-2 transition ${isCheckingOut
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : 'gradient-btn shadow-indigo-600/20'
                    }`}
                >
                  {isCheckingOut ? <LogOut size={16} /> : <UserCheck size={16} />}
                  <span>
                    {scanning
                      ? 'Processing...'
                      : isCheckingOut
                        ? `Register Check-Out (${checkInMethod})`
                        : `Register Check-In (${checkInMethod})`
                    }
                  </span>
                </button>
              </div>
            ) : (
              <div className="py-10 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600">
                <Fingerprint size={32} className="mb-2 text-slate-700" />
                <p className="text-xs font-semibold">No member selected</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Search and select a member to scan.</p>
              </div>
            )}
          </div>

          {/* Right column — Stats + Currently Inside */}
          <div className="flex flex-col gap-4">
            {/* Daily Summary */}
            <div className="glass-panel border border-slate-800/80 rounded-3xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Daily Summary</h3>
                <p className="text-xs text-slate-400 font-medium">Selected date stats</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total Sessions:</span>
                  <strong className="text-xl font-bold text-white font-mono">{report.total_count}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Currently Inside:</span>
                  <strong className="text-xl font-bold text-emerald-400 font-mono">{report.currently_inside}</strong>
                </div>

                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Auth Methods</span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-850 px-2 py-1 rounded-lg">
                      <span className="text-slate-500">Manual:</span>
                      <span className="text-slate-200 font-mono">{report.method_counts.manual || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-850 px-2 py-1 rounded-lg">
                      <span className="text-slate-500">Biometric:</span>
                      <span className="text-slate-200 font-mono">
                        {Object.keys(report.method_counts).reduce((acc, curr) => {
                          return curr !== 'manual' ? acc + (report.method_counts[curr] || 0) : acc;
                        }, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-500">
                <Cpu size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">Biometric logs auto-link to member profiles when device is connected.</p>
              </div>
            </div>

            {/* Currently Inside Panel */}
            <div className="glass-panel border border-emerald-900/40 rounded-3xl p-5 shadow-xl space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Members Inside</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold font-mono">
                    {insideMembers.length}
                  </span>
                </div>
                <button
                  onClick={fetchInsideMembers}
                  disabled={insideLoading}
                  className="p-1 hover:bg-slate-800 rounded-lg transition text-slate-500 hover:text-slate-300 cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw size={13} className={insideLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {insideLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
                </div>
              ) : insideMembers.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-600 font-medium">No members currently inside.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                  {insideMembers.map(m => {
                    const sessionMins = Math.floor((Date.now() - new Date(m.check_in_timestamp).getTime()) / 60000);
                    const isStale = sessionMins > 12 * 60;
                    return (
                      <div key={m.attendance_id} className={`flex flex-col gap-2 px-3 py-2.5 rounded-xl border ${isStale ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900/60 border-slate-800/60'
                        }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold flex items-center gap-1 truncate ${isStale ? 'text-amber-300' : 'text-slate-200'
                              }`}>
                              {isStale && <AlertCircle size={10} className="text-amber-400 shrink-0" />}
                              {m.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Inside for: <span className={`font-bold ${isStale ? 'text-amber-400' : 'text-emerald-400'}`}>{getSessionAge(m.check_in_timestamp)}</span>
                            </p>
                            {isStale && (
                              <p className="text-[10px] text-amber-500 font-semibold mt-0.5">⚠ Possible missed checkout</p>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmModal({ name: m.name, attendance_id: m.attendance_id, check_in_timestamp: m.check_in_timestamp })}
                            className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${isStale
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                              : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
                              }`}
                          >
                            <LogOut size={10} />
                            Manual Checkout
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Log Report */}
        <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Attendance Log Report</h3>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
              <div className="flex bg-slate-950 border border-slate-800/80 rounded-xl p-1 w-full sm:w-auto">
                {['daily', 'weekly', 'monthly'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setRange(t)}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition capitalize cursor-pointer ${range === t
                      ? 'gradient-btn text-white'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-44 flex-1">
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full px-3 py-2 pl-8 text-xs rounded-xl glass-input"
                />
                <span className="absolute left-2.5 top-2.5 text-slate-500">
                  <Search size={12} />
                </span>
              </div>

              {range === 'daily' && (
                <input
                  type="date"
                  value={selectedReportDate}
                  onChange={(e) => setSelectedReportDate(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl glass-input w-full sm:w-36"
                />
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
                  title="Export to Excel"
                >
                  <FileSpreadsheet size={13} className="text-emerald-400" />
                  <span>Excel</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
                  title="Export to PDF"
                >
                  <FileText size={13} className="text-indigo-400" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {reportLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : report.records.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CheckCircle size={32} className="mx-auto text-slate-700 mb-2" />
                <p className="text-xs font-medium">No sessions logged for this range.</p>
              </div>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Member</th>
                    <th className="pb-3 pr-4">ID</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Check-In</th>
                    <th className="pb-3 pr-4">Check-Out</th>
                    <th className="pb-3 pr-4">Duration</th>
                    <th className="pb-3 pr-4">Membership Status</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-sm">
                  {report.records.map((record) => {
                    const isOpen = record.check_out_time === null;
                    const wasAutoClosed = record.auto_closed;
                    return (
                      <tr key={record.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 pr-4 font-bold text-slate-200 break-words">
                          <div>{record.member_name}</div>
                          {record.member_register_number && (
                            <div className="text-[10px] font-semibold text-indigo-400 mt-0.5">Reg: {record.member_register_number}</div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-400 font-mono text-xs">#{String(record.member_id).padStart(4, '0')}</td>
                        <td className="py-3 pr-4 text-slate-400 font-mono text-xs">{record.date}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-100 text-xs">
                          <span className="flex items-center gap-1.5">
                            <Clock size={11} className="text-indigo-400" />
                            {record.check_in_time || formatTimestamp(record.check_in_timestamp)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs font-semibold">
                          {isOpen ? (
                            <span className="text-emerald-400">—</span>
                          ) : (
                            <span className="text-slate-300">{formatTimestamp(record.check_out_time)}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs font-semibold font-mono">
                          {isOpen ? (
                            <span className="text-slate-500 italic">Live</span>
                          ) : (
                            <span className="text-slate-300 flex items-center gap-1">
                              <Timer size={10} className="text-slate-500" />
                              {formatDuration(record.duration_minutes)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          {(() => {
                            const mStatus = getMembershipStatus(record);
                            return (
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${mStatus.colorClass}`}>
                                {mStatus.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3">
                          {isOpen ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              🟢 Inside
                            </span>
                          ) : wasAutoClosed ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Auto-closed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              Checked out
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Manual Checkout Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
            <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <LogOut size={16} className="text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Manual Checkout</h4>
                    <p className="text-xs text-slate-500">Staff-corrected attendance</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmModal(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Member Info */}
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/50 rounded-xl space-y-2">
                <p className="text-sm font-bold text-slate-100">{confirmModal.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock size={11} className="text-indigo-400" />
                  <span>Checked in at {formatTimestamp(confirmModal.check_in_timestamp)}</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-semibold text-amber-400">{getSessionAge(confirmModal.check_in_timestamp)} ago</span>
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-800/30 border border-slate-700/40 rounded-xl p-3">
                <AlertCircle size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                <p>Checkout time will be set to <span className="font-bold text-white">now</span> and recorded as a staff correction — not an auto-close.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualCheckout}
                  disabled={checkingOut}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  <LogOut size={12} />
                  {checkingOut ? 'Checking out...' : 'Confirm Checkout'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Attendance;
