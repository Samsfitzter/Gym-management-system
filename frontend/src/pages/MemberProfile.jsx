import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import membersApi from '../api/members.api.js';
import { exportReceiptPDF } from '../api/exportHelpers.js';
import { receiptConfig } from '../config/receiptConfig.js';
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  Clock,
  Fingerprint,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Receipt,
  X,
  MessageSquare
} from 'lucide-react';

export const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Receipt modal state
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState('membership');

  const getProfileImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || ''}${url}`;
  };

  const getMembershipStatus = (member) => {
    if (member.status === 'inactive') {
      return { label: 'Inactive', colorClass: 'bg-red-500/10 text-red-400 border-red-500/20', dotClass: 'bg-red-400' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(member.expiry_date);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: 'Expired', colorClass: 'bg-red-500/10 text-red-400 border-red-500/20', dotClass: 'bg-red-400' };
    }

    if (diffDays < 15) {
      return { label: 'Expiring Soon', colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dotClass: 'bg-amber-400' };
    }

    return { label: 'Active', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dotClass: 'bg-emerald-400' };
  };

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await membersApi.getById(id);
      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        showToast(res.message || 'Member profile not found', 'error');
        setTimeout(() => navigate('/members'), 2000);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error connecting to backend', 'error');
      setTimeout(() => navigate('/members'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };


  const checkPaymentStatus = (payments) => {
    if (!payments || payments.length === 0) return { label: 'No Payment History', color: 'text-slate-400 bg-slate-800/40 border-slate-700' };

    const hasOverdue = payments.some(p => p.status === 'overdue');
    if (hasOverdue) return { label: 'Overdue Dues', color: 'text-red-400 bg-red-500/10 border-red-500/20' };

    const hasPending = payments.some(p => p.status === 'pending');
    if (hasPending) return { label: 'Pending Balance', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };

    return { label: 'Accounts Paid', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
        <Header title="Member Profile" />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const paymentStatus = checkPaymentStatus(profile.payments);
  const isExpired = new Date(profile.expiry_date) < new Date();

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title={`${profile.name}'s Profile`} />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
        {/* Back navigation & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <button
            onClick={() => navigate('/members')}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition cursor-pointer w-full sm:w-auto"
          >
            <ArrowLeft size={16} />
            <span>Back to Members</span>
          </button>

          <Link
            to="/renewals"
            className="flex items-center justify-center gap-2 px-4.5 py-2 text-sm font-semibold text-white gradient-btn rounded-xl shadow-lg transition w-full sm:w-auto"
          >
            <RefreshCw size={15} />
            <span>Renew Membership</span>
          </Link>
        </div>

        {/* Profile Card & Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Member Card Summary */}
          <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col space-y-6">
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800/60">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-indigo-500/60 shadow-xl shrink-0 flex items-center justify-center">
                {profile.profile_image_url ? (
                  <img
                    src={getProfileImageUrl(profile.profile_image_url)}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-indigo-400">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mt-4">{profile.name}</h3>
              <span className="text-xs text-slate-500 font-mono mt-1">UID: #{String(profile.id).padStart(4, '0')}</span>
              {profile.register_number && (
                <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 mt-1.5 font-mono">
                  Reg No: {profile.register_number}
                </span>
              )}

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {(() => {
                  const mStatus = getMembershipStatus(profile);
                  return (
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${mStatus.colorClass} flex items-center gap-1.5`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${mStatus.dotClass}`}></span>
                      <span>Membership: {mStatus.label}</span>
                    </span>
                  );
                })()}
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${paymentStatus.color}`}>
                  {paymentStatus.label}
                </span>
              </div>
            </div>

            {/* General Contact Info */}
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                  <Phone size={15} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Phone Number</span>
                  <span className="font-semibold text-slate-200 font-mono">{profile.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                  <Mail size={15} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Email Address</span>
                  <span className="font-semibold text-slate-200">{profile.email || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                  <Calendar size={15} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Date of Birth</span>
                  <span className="font-semibold text-slate-200">
                    {profile.date_of_birth ? (
                      `${profile.date_of_birth} (${calculateAge(profile.date_of_birth)} yrs)`
                    ) : (
                      <span className="text-slate-500 italic">Not Provided</span>
                    )}
                  </span>
                </div>
              </div>

              {profile.emergency_contact_name && (
                <div className="flex items-center gap-3 animate-fade-in">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                    <User size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Emergency Contact Name</span>
                    <span className="font-semibold text-slate-200">{profile.emergency_contact_name}</span>
                  </div>
                </div>
              )}

              {profile.emergency_contact_phone && (
                <div className="flex items-center gap-3 animate-fade-in">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                    <Phone size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Emergency Contact No</span>
                    <span className="font-semibold text-slate-200 font-mono">{profile.emergency_contact_phone}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                  <Clock size={15} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Membership Validity</span>
                  <div className="flex flex-col mt-0.5">
                    <span className="text-xs text-slate-400">Joined: {profile.join_date}</span>
                    <span className="text-xs text-indigo-400 font-semibold">Active Plan: {profile.membership_type} (₹{profile.amount})</span>
                    <span className="text-xs text-slate-400">Start Date: {profile.start_date || profile.join_date}</span>
                    {(() => {
                      const mStatus = getMembershipStatus(profile);
                      return (
                        <span className={`text-xs font-bold ${mStatus.label === 'Expired' ? 'text-red-400' : 'text-slate-200'}`}>
                          Expires: {profile.expiry_date} {mStatus.label === 'Expired' && '(Expired)'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Biometric Integration Status */}
            <div className="pt-6 border-t border-slate-800/60 space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Fingerprint size={14} />
                <span>Biometric Gateway Link</span>
              </h4>
              {profile.device_user_id ? (
                <div className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block">Terminal User ID</span>
                    <span className="font-mono font-bold text-slate-300">{profile.device_user_id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Auth Method</span>
                    <span className="uppercase font-bold text-indigo-400 font-mono">{profile.attendance_method}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">This member is not linked to any biometric hardware terminal. Attendance is recorded manually.</p>
              )}
            </div>

            {/* Communication Section */}
            <div className="pt-6 border-t border-slate-800/60 space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <WhatsAppIcon size={14} className="text-[#25D366]" />
                <span>Communication</span>
              </h4>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappTemplate('membership');
                    setIsWhatsAppModalOpen(true);
                  }}
                  disabled={!profile.phone}
                  className={`w-full py-2 px-3 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${profile.phone
                    ? 'text-[#25D366] hover:text-white bg-[#25D366]/10 hover:bg-[#25D366] border border-[#25D366]/20'
                    : 'text-slate-650 bg-slate-950/40 border border-slate-800/80 cursor-not-allowed opacity-50'
                    }`}
                  title={profile.phone ? "Send WhatsApp Membership Reminder" : "No phone number available"}
                >
                  <WhatsAppIcon size={13} />
                  <span>WhatsApp Membership Reminder</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappTemplate('payment');
                    setIsWhatsAppModalOpen(true);
                  }}
                  disabled={!profile.phone}
                  className={`w-full py-2 px-3 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${profile.phone
                    ? 'text-[#25D366] hover:text-white bg-[#25D366]/10 hover:bg-[#25D366] border border-[#25D366]/20'
                    : 'text-slate-650 bg-slate-950/40 border border-slate-800/80 cursor-not-allowed opacity-50'
                    }`}
                  title={profile.phone ? "Send WhatsApp Payment Reminder" : "No phone number available"}
                >
                  <WhatsAppIcon size={13} />
                  <span>WhatsApp Payment Reminder</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappTemplate('birthday');
                    setIsWhatsAppModalOpen(true);
                  }}
                  disabled={!profile.phone}
                  className={`w-full py-2 px-3 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${profile.phone
                    ? 'text-[#25D366] hover:text-white bg-[#25D366]/10 hover:bg-[#25D366] border border-[#25D366]/20'
                    : 'text-slate-650 bg-slate-950/40 border border-slate-800/80 cursor-not-allowed opacity-50'
                    }`}
                  title={profile.phone ? "Send WhatsApp Birthday Wish" : "No phone number available"}
                >
                  <WhatsAppIcon size={13} />
                  <span>WhatsApp Birthday Wish</span>
                </button>
              </div>

              {/* Recent Communications Placeholder */}
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4 pt-2 border-t border-slate-800/60">
                Recent Communications
              </h5>
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-950/45 border border-slate-850/50 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span>WhatsApp Reminder Sent</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">2 days ago</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/45 border border-slate-850/50 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span>Payment Reminder Sent</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">1 week ago</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/45 border border-slate-850/50 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    <span>Birthday Wish Sent</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">2026-05-12</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Tables (Payments & Attendance History) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Payments Table */}
            <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-5">
                <CreditCard size={18} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Payment Receipts History</h3>
              </div>

              <div className="overflow-x-auto">
                {profile.payments.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4">No payment collections found.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase">
                        <th className="pb-3 pr-4">Receipt</th>
                        <th className="pb-3 pr-4">Amount</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Method</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-sm">
                      {profile.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 pr-4 font-semibold text-slate-300 font-mono text-xs">{p.receipt_number}</td>
                          <td className="py-3 pr-4 font-bold text-slate-200">₹{p.amount}</td>
                          <td className="py-3 pr-4 text-slate-400 font-mono text-xs">{p.date}</td>
                          <td className="py-3 pr-4 text-slate-400 capitalize text-xs">{p.payment_method}</td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${p.status === 'paid'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : p.status === 'pending'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                              }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setSelectedReceipt(p)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                              title="Print Receipt"
                            >
                              <Receipt size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Attendance Logs */}
            <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-5">
                <Clock size={18} className="text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Attendance Logs</h3>
              </div>

              <div className="overflow-x-auto">
                {profile.attendance.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4">No attendance checks logged yet.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase">
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Check-In Time</th>
                        <th className="pb-3 pr-4">Auth Mode</th>
                        <th className="pb-3">Device Log ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-sm">
                      {profile.attendance.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 pr-4 text-slate-300 font-mono text-xs">{a.date}</td>
                          <td className="py-3 pr-4 text-slate-200 font-semibold">{a.check_in_time}</td>
                          <td className="py-3 pr-4">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 rounded">
                              {a.attendance_method}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-xs">{a.device_log_id || 'manual-entry'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Simulated Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white text-slate-950 rounded-3xl p-6 shadow-2xl relative animate-fade-in font-sans">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              <X size={15} />
            </button>

            {/* Print Area Header */}
            <div className="flex justify-between items-start pb-4 border-b border-dashed border-slate-200 mt-2">
              <div className="flex items-center gap-3">
                {receiptConfig.logoUrl ? (
                  <img
                    src={receiptConfig.logoUrl}
                    alt={receiptConfig.gymName}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl border-2 border-indigo-600 flex items-center justify-center font-bold text-indigo-600 bg-indigo-50 shrink-0 text-sm">
                    SF
                  </div>
                )}
                <div className="text-left">
                  <h4 className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">{receiptConfig.gymName.toUpperCase()}</h4>
                  <span className="text-[10px] text-indigo-600 italic block mt-0.5">{receiptConfig.subtitle || "Fitness & Lifestyle Center"}</span>
                  <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">{receiptConfig.location}</span>
                </div>
              </div>
            </div>

            {/* Receipt Title */}
            <div className="text-center py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Receipt</span>
            </div>

            {/* 2-Column Info Grid */}
            <div className="py-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px] border-b border-slate-100">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Member Name:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[100px]">{profile.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Phone Number:</span>
                  <span className="font-mono text-slate-800">{selectedReceipt.member_phone || profile.phone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Membership:</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.membership_type || profile.membership_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Date:</span>
                  <span className="text-slate-800 font-medium">{selectedReceipt.start_date || profile.start_date || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Payment Date:</span>
                  <span className="text-slate-800 font-medium">{selectedReceipt.date}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Expiry Date:</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.expiry_date || profile.expiry_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Method:</span>
                  <span className="uppercase text-slate-800 font-semibold">{selectedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Collected By:</span>
                  <span className="text-slate-800 font-semibold">{selectedReceipt.collected_by || user?.name || 'Staff'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`uppercase font-bold ${selectedReceipt.status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>{selectedReceipt.status}</span>
                </div>
              </div>
            </div>

            {/* Total Paid Highlighting Card */}
            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Total Amount Paid</span>
              <strong className="text-lg font-black text-indigo-600">₹{selectedReceipt.amount}</strong>
            </div>

            {/* Footer Services & Support */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-dashed border-slate-150 text-[10px] text-slate-500">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Our Services:</span>
                <ul className="space-y-0.5 text-[9px]">
                  {receiptConfig.services.slice(0, 4).map(s => <li key={s}>• {s}</li>)}
                </ul>
              </div>
              <div className="sm:pt-4">
                <ul className="space-y-0.5 text-[9px]">
                  {receiptConfig.services.slice(4).map(s => <li key={s}>• {s}</li>)}
                </ul>
              </div>
              <div className="text-left sm:text-right">
                <span className="font-bold text-slate-700 block mb-1">Support Contacts:</span>
                <p>Phone: {receiptConfig.contact}</p>
                <p className="truncate">Email: {receiptConfig.email}</p>
              </div>
            </div>

            {/* Thank You Note */}
            <div className="mt-5 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
              <p className="font-bold text-indigo-600 text-xs">Thank you for choosing Sam's Fitzter.</p>
              <p className="text-[9px] mt-0.5">{receiptConfig.gymName} | {receiptConfig.location}</p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => exportReceiptPDF(selectedReceipt, profile.name, selectedReceipt.collected_by || user?.name || 'Staff')}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Download Receipt</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
          }}
          member={profile}
          defaultTemplate={whatsappTemplate}
        />
      )}
    </div>
  );
};
export default MemberProfile;
