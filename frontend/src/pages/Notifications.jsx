import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import dashboardApi from '../api/dashboard.api.js';
import paymentsApi from '../api/payments.api.js';
import { useAuth } from '../context/AuthContext';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { Toast } from '../components/Toast';
import { getTodayDateString } from '../utils/formatHelpers.js';
import { generateAbsenceMessage } from '../utils/whatsappTemplates';
import { Bell, CheckCircle, Eye, AlertTriangle, X, DollarSign } from 'lucide-react';

const formatLogTime = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const currentYear = new Date().getFullYear();
    const yearText = year !== currentYear ? ` ${year}` : '';

    return `${day} ${month}${yearText}, ${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return '';
  }
};

export const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Pay Due Modal states
  const [isPayDueModalOpen, setIsPayDueModalOpen] = useState(false);
  const [payDueMember, setPayDueMember] = useState(null);
  const [payDueForm, setPayDueForm] = useState({
    amount: '',
    payment_method: 'upi',
    date: getTodayDateString(),
    collected_by: '',
    isSubmitting: false
  });

  const openPayDueModal = (member) => {
    setPayDueMember(member);
    setPayDueForm({
      amount: String(member.outstanding_balance),
      payment_method: 'upi',
      date: getTodayDateString(),
      collected_by: user?.name || 'Staff',
      isSubmitting: false
    });
    setIsPayDueModalOpen(true);
  };

  const handlePayDueSubmit = async (e) => {
    e.preventDefault();
    if (payDueForm.isSubmitting) return;

    const amountNum = parseFloat(payDueForm.amount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }

    if (amountNum > parseFloat(payDueMember.outstanding_balance)) {
      showToast('Payment amount cannot exceed outstanding balance', 'warning');
      return;
    }

    setPayDueForm(prev => ({ ...prev, isSubmitting: true }));
    try {
      const payload = {
        member_id: payDueMember.id,
        amount: amountNum,
        date: payDueForm.date,
        payment_method: payDueForm.payment_method,
        status: 'paid',
        collected_by: payDueForm.collected_by || user?.name || 'Staff',
        idempotency_key: Date.now().toString(36) + Math.random().toString(36).substring(2)
      };

      const res = await paymentsApi.create(payload);
      if (res.success) {
        showToast('Due payment recorded successfully!', 'success');
        setIsPayDueModalOpen(false);
        setPayDueMember(null);
        fetchNotifications();
      } else {
        showToast(res.message || 'Failed to record payment', 'error');
      }
    } catch (err) {
      console.error('Error submitting due payment:', err);
      showToast(err.message || 'Server error recording payment', 'error');
    } finally {
      setPayDueForm(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Notification Center States
  const [notifications, setNotifications] = useState({
    birthdaysToday: [],
    birthdaysUpcoming: [],
    expiresTomorrow: [],
    expires3Days: [],
    expires7Days: [],
    expired: [],
    paymentDue: [],
    longLeaveMembers: []
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('expired');

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Modal states
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappMember, setWhatsappMember] = useState(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState('membership');
  const [whatsappCustomMessage, setWhatsappCustomMessage] = useState('');
  const [whatsappType, setWhatsappType] = useState(null);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 5 * 60 * 1000); // 5 minutes periodic refresh
    return () => clearInterval(intervalId);
  }, []);

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const res = await dashboardApi.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
      } else {
        showToast(res.message || 'Failed to fetch alerts', 'error');
      }
    } catch (err) {
      console.error('Error fetching notifications page data:', err);
      showToast(err.message || 'Server error fetching notifications', 'error');
    } finally {
      setNotificationsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Notification Center" />

      <main className="flex-1 p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
        {/* Header Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bell size={24} className="text-indigo-400 animate-pulse" />
              <span>System Alerts</span>
            </h2>
            <p className="text-slate-450 text-sm mt-1">
              Manage reminders for client birthdays, membership expiries, and outstanding payments.
            </p>
          </div>

          <button
            onClick={fetchNotifications}
            className="flex items-center gap-1.5 px-4.5 py-2 border border-slate-850 bg-slate-950 hover:bg-slate-900 text-xs font-semibold text-slate-300 rounded-xl transition cursor-pointer"
            title="Refresh Alerts"
          >
            <span>Refresh Alerts</span>
          </button>
        </div>

        {notificationsLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Notification Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
              {[
                { key: 'birthdaysToday', label: 'Birthdays Today', count: notifications.birthdaysToday.length, color: 'border-pink-500/20 text-pink-400 bg-pink-500/5' },
                { key: 'birthdaysUpcoming', label: 'Upcoming Birthdays', count: notifications.birthdaysUpcoming.length, color: 'border-blue-500/20 text-blue-400 bg-blue-500/5' },
                { key: 'expiresTomorrow', label: 'Expires Tomorrow', count: notifications.expiresTomorrow.length, color: 'border-red-500/20 text-red-400 bg-red-500/5' },
                { key: 'expires3Days', label: 'Expires in 3 Days', count: notifications.expires3Days.length, color: 'border-amber-500/20 text-amber-400 bg-amber-500/5' },
                { key: 'expires7Days', label: 'Expires in 7 Days', count: notifications.expires7Days.length, color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
                { key: 'expired', label: 'Expired Memberships', count: notifications.expired.length, color: 'border-red-700/20 text-red-400 bg-red-800/5' },
                { key: 'paymentDue', label: 'Payments Due', count: notifications.paymentDue ? notifications.paymentDue.length : 0, color: 'border-red-500/25 text-red-350 bg-red-950/20' },
                { key: 'longLeaveMembers', label: 'Long Leave (7+ Days)', count: notifications.longLeaveMembers ? notifications.longLeaveMembers.length : 0, color: 'border-violet-500/20 text-violet-400 bg-violet-500/5' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveCategory(item.key)}
                  className={`p-4 border rounded-2xl flex flex-col items-center justify-center text-center transition shadow-md cursor-pointer ${activeCategory === item.key
                    ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                    : `${item.color} hover:opacity-85`
                    }`}
                >
                  <span className="text-2xl font-black font-mono block">{item.count}</span>
                  <span className="text-[9px] font-bold tracking-wider uppercase mt-1.5 text-slate-350 block leading-tight">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Detail List Panel */}
            <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl">
              {(() => {
                const getCategoryDetails = () => {
                  switch (activeCategory) {
                    case 'birthdaysToday':
                      return {
                        title: "Birthdays Today",
                        list: notifications.birthdaysToday,
                        priority: { label: 'Medium Priority', color: 'text-amber-400 bg-amber-500/5 border-amber-500/25' },
                        emptyMsg: "No birthdays today",
                        isBirthday: true
                      };
                    case 'birthdaysUpcoming':
                      return {
                        title: "Upcoming Birthdays (Next 7 Days)",
                        list: notifications.birthdaysUpcoming,
                        priority: { label: 'Low Priority', color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/25' },
                        emptyMsg: "No upcoming birthdays soon",
                        isBirthday: true
                      };
                    case 'expiresTomorrow':
                      return {
                        title: "Membership Expires Tomorrow",
                        list: notifications.expiresTomorrow,
                        priority: { label: 'High Priority', color: 'text-red-400 bg-red-500/5 border-red-500/25 font-black animate-pulse' },
                        emptyMsg: "No memberships expiring tomorrow",
                        isBirthday: false
                      };
                    case 'expires3Days':
                      return {
                        title: "Membership Expires in 3 Days",
                        list: notifications.expires3Days,
                        priority: { label: 'Medium Priority', color: 'text-amber-400 bg-amber-500/5 border-amber-500/25' },
                        emptyMsg: "No memberships expiring in 3 days",
                        isBirthday: false
                      };
                    case 'expires7Days':
                      return {
                        title: "Membership Expires in 7 Days",
                        list: notifications.expires7Days,
                        priority: { label: 'Low Priority', color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/25' },
                        emptyMsg: "No memberships expiring in 7 days",
                        isBirthday: false
                      };
                    case 'paymentDue':
                      return {
                        title: "Payments Due",
                        list: notifications.paymentDue || [],
                        priority: { label: 'High Priority', color: 'text-red-400 bg-red-500/5 border-red-500/25 font-black' },
                        emptyMsg: "No pending or overdue payments",
                        isBirthday: false,
                        isPayment: true
                      };
                    case 'longLeaveMembers':
                      return {
                        title: "Long Leave Members (Absent 7+ Days)",
                        list: notifications.longLeaveMembers || [],
                        priority: { label: 'Re-engagement Alert', color: 'text-violet-400 bg-violet-500/5 border-violet-500/25' },
                        emptyMsg: "All active members have visited within the last 7 days 🎉",
                        isBirthday: false,
                        isPayment: false,
                        isLongLeave: true
                      };
                    case 'expired':
                    default:
                      return {
                        title: "Expired Memberships",
                        list: notifications.expired,
                        priority: { label: 'High Priority', color: 'text-red-400 bg-red-500/5 border-red-500/25 font-black' },
                        emptyMsg: "No expired memberships",
                        isBirthday: false
                      };
                  }
                };

                const cat = getCategoryDetails();

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                      <h3 className="font-bold text-white text-md">{cat.title}</h3>
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold border rounded-full ${cat.priority.color}`}>
                        {cat.priority.label}
                      </span>
                    </div>

                    {cat.list.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-sm">
                        <CheckCircle size={32} className="text-slate-700 mb-2.5" />
                        <p className="italic">{cat.emptyMsg}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className={`w-full text-left border-collapse ${cat.isPayment ? 'min-w-[1150px]' : 'min-w-[800px]'}`}>
                          <thead>
                            <tr className="border-b border-slate-850/80 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/10">
                              {cat.isPayment ? (
                                <>
                                  <th className="py-2.5 px-4 whitespace-nowrap">Member Info</th>
                                  <th className="py-2.5 px-4 whitespace-nowrap">Membership Plan</th>
                                  <th className="py-2.5 px-4 whitespace-nowrap">Plan Amount</th>
                                  <th className="py-2.5 px-4 whitespace-nowrap">Amount Paid</th>
                                  <th className="py-2.5 px-4 whitespace-nowrap">Payment Due</th>
                                  <th className="py-2.5 px-4 whitespace-nowrap">Join Date</th>
                                  <th className="py-2.5 px-4 whitespace-nowrap">Expiry Date</th>
                                  <th className="py-2.5 px-4 whitespace-nowrap">Communication sent log</th>
                                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Actions</th>
                                </>
                              ) : (
                                <>
                                  <th className="py-2.5 px-4">Member Info</th>
                                  <th className="py-2.5 px-4">Contact</th>
                                  <th className="py-2.5 px-4">
                                    {cat.isBirthday ? 'Birthday Details' : cat.isLongLeave ? 'Last Visit' : 'Expiry Details'}
                                  </th>
                                  <th className="py-2.5 px-4">Communication sent log</th>
                                  <th className="py-2.5 px-4 text-right">Actions</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850/30 text-sm">
                            {cat.list.map((m) => {
                              let dayDiff = null;
                              if (!cat.isBirthday && !cat.isPayment && m.expiry_date) {
                                const exp = new Date(m.expiry_date);
                                const todayVal = new Date();
                                todayVal.setHours(0, 0, 0, 0);
                                exp.setHours(0, 0, 0, 0);
                                dayDiff = Math.ceil((exp - todayVal) / (1000 * 60 * 60 * 24));
                              }

                              if (cat.isPayment) {
                                return (
                                  <tr key={m.id} className="hover:bg-slate-900/20 transition-colors">
                                    <td className="py-3 px-4 align-middle whitespace-nowrap">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                                          {m.profile_image_url ? (
                                            <img
                                              src={m.profile_image_url.startsWith('http') ? m.profile_image_url : `${import.meta.env.VITE_API_URL || ''}${m.profile_image_url}`}
                                              alt={m.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <span className="text-xs font-bold text-indigo-400">
                                              {m.name.charAt(0).toUpperCase()}
                                            </span>
                                          )}
                                        </div>
                                        <div className="whitespace-nowrap">
                                          <span className="font-bold text-slate-200 block whitespace-nowrap">{m.name}</span>
                                          <span className="text-[10px] text-slate-500 font-mono block whitespace-nowrap">UID: #{String(m.id).padStart(4, '0')}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-slate-350 font-semibold align-middle">{m.membership_type}</td>
                                    <td className="py-3 px-4 text-slate-200 font-mono align-middle">₹{Number(m.amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="py-3 px-4 text-slate-200 font-mono align-middle">₹{Number((m.amount || 0) - (m.outstanding_balance || 0)).toLocaleString('en-IN')}</td>
                                    <td className="py-3 px-4 text-red-400 font-bold font-mono align-middle whitespace-nowrap">₹{Number(m.outstanding_balance || 0).toLocaleString('en-IN')}</td>
                                    <td className="py-3 px-4 text-slate-350 font-mono text-xs align-middle whitespace-nowrap">{m.join_date}</td>
                                    <td className="py-3 px-4 text-slate-350 font-mono text-xs align-middle whitespace-nowrap">{m.expiry_date}</td>
                                    <td className="py-3 px-4 text-xs text-slate-450 italic align-middle whitespace-nowrap">
                                      {m.lastPaymentReminderSent ? `Sent on ${formatLogTime(m.lastPaymentReminderSent)}` : "Never sent"}
                                    </td>
                                    <td className="py-3 px-4 text-right align-middle">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => openPayDueModal(m)}
                                          className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer shadow-sm shrink-0"
                                          title="Pay Due"
                                        >
                                          Pay Due
                                        </button>
                                        <button
                                          onClick={() => navigate(`/members/${m.id}`)}
                                          className="p-1.5 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                                          title="View Member Profile"
                                        >
                                          <Eye size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setWhatsappMember(m);
                                            setWhatsappCustomMessage('');
                                            setWhatsappTemplate('payment');
                                            setWhatsappType('payment');
                                            setIsWhatsAppModalOpen(true);
                                          }}
                                          disabled={!m.phone}
                                          className={`p-1.5 border border-transparent rounded-lg transition cursor-pointer ${m.phone
                                            ? 'text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                            : 'text-slate-600 opacity-40 cursor-not-allowed'
                                            }`}
                                          title={m.phone ? "Send Payment Reminder" : "No phone number available"}
                                        >
                                          <WhatsAppIcon size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={m.id} className="hover:bg-slate-900/20 transition-colors">
                                  <td className="py-3 px-4 align-middle whitespace-nowrap">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                                        {m.profile_image_url ? (
                                          <img
                                            src={m.profile_image_url.startsWith('http') ? m.profile_image_url : `${import.meta.env.VITE_API_URL || ''}${m.profile_image_url}`}
                                            alt={m.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-xs font-bold text-indigo-400">
                                            {m.name.charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                      <div className="whitespace-nowrap">
                                        <span className="font-bold text-slate-200 block whitespace-nowrap">{m.name}</span>
                                        <span className="text-[10px] text-slate-500 font-mono block whitespace-nowrap">UID: #{String(m.id).padStart(4, '0')}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                                    {m.phone}
                                  </td>
                                  <td className="py-3 px-4">
                                    {cat.isBirthday ? (
                                      <div className="space-y-0.5">
                                        <span className="text-xs text-indigo-400 font-semibold block">
                                          Turning {m.turningAge} on {m.birthdayFormatted}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">DOB: {m.date_of_birth}</span>
                                      </div>
                                    ) : cat.isPayment ? (
                                      <div className="space-y-0.5">
                                        <span className="text-xs text-red-400 font-semibold block">
                                          ₹{(m.due_amount || 0).toLocaleString('en-IN')} Due
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">Current Plan: {m.membership_type}</span>
                                      </div>
                                    ) : cat.isLongLeave ? (
                                      <div className="space-y-0.5">
                                        <span className="text-xs text-violet-400 font-semibold block">
                                          {m.last_visit ? `Last visit: ${m.last_visit}` : 'Never visited'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-semibold block">
                                          {m.daysSinceLastVisit != null
                                            ? `Absent for ${m.daysSinceLastVisit} days`
                                            : 'No attendance recorded'}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <span className="text-xs text-indigo-400 font-semibold block">
                                          {m.membership_type} (Expiry: {m.expiry_date})
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-semibold block">
                                          {dayDiff < 0
                                            ? `Expired ${Math.abs(dayDiff)} days ago`
                                            : dayDiff === 0
                                              ? "Expires today"
                                              : dayDiff === 1
                                                ? "Expires tomorrow"
                                                : `Expires in ${dayDiff} days`}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-xs text-slate-450 italic">
                                    {cat.isBirthday ? (
                                      m.lastBirthdayWishSent ? `Sent on ${formatLogTime(m.lastBirthdayWishSent)}` : "Never sent"
                                    ) : cat.isPayment ? (
                                      m.lastPaymentReminderSent ? `Sent on ${formatLogTime(m.lastPaymentReminderSent)}` : "Never sent"
                                    ) : cat.isLongLeave ? (
                                      m.lastAbsenceReminderSent ? `Sent on ${formatLogTime(m.lastAbsenceReminderSent)}` : "Never sent"
                                    ) : (
                                      m.lastMembershipReminderSent ? `Sent on ${formatLogTime(m.lastMembershipReminderSent)}` : "Never sent"
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => navigate(`/members/${m.id}`)}
                                        className="p-1.5 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                                        title="View Member Profile"
                                      >
                                        <Eye size={14} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setWhatsappMember(m);
                                          if (cat.isLongLeave) {
                                            setWhatsappCustomMessage(generateAbsenceMessage(m, m.daysSinceLastVisit));
                                            setWhatsappTemplate('membership');
                                            setWhatsappType('absence');
                                          } else {
                                            setWhatsappCustomMessage('');
                                            setWhatsappTemplate(cat.isBirthday ? 'birthday' : cat.isPayment ? 'payment' : 'membership');
                                            setWhatsappType(cat.isBirthday ? 'birthday' : cat.isPayment ? 'payment' : 'expiry');
                                          }
                                          setIsWhatsAppModalOpen(true);
                                        }}
                                        disabled={!m.phone}
                                        className={`p-1.5 border border-transparent rounded-lg transition cursor-pointer ${m.phone
                                          ? 'text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                          : 'text-slate-600 opacity-40 cursor-not-allowed'
                                          }`}
                                        title={m.phone ? (cat.isBirthday ? "Send Birthday Wish" : cat.isPayment ? "Send Payment Reminder" : cat.isLongLeave ? "Send Come Back Message" : "Send Membership Reminder") : "No phone number available"}
                                      >
                                        <WhatsAppIcon size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </main>

      {/* WhatsApp Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setWhatsappMember(null);
            setWhatsappCustomMessage('');
            setWhatsappType(null);
          }}
          member={whatsappMember}
          defaultTemplate={whatsappTemplate}
          customMessage={whatsappCustomMessage}
          communicationType={whatsappType}
          onSuccess={() => {
            fetchNotifications();
            showToast('WhatsApp communication initiated successfully!');
          }}
        />
      )}

      {/* Pay Due Modal */}
      {isPayDueModalOpen && payDueMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in text-left">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsPayDueModalOpen(false);
                setPayDueMember(null);
              }}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <DollarSign size={20} className="text-indigo-400" />
              <span>Record Pay Due</span>
            </h3>

            <form onSubmit={handlePayDueSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Member Name</label>
                <input
                  type="text"
                  value={payDueMember.name}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-850 text-sm font-semibold text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Membership Plan</label>
                  <input
                    type="text"
                    value={payDueMember.membership_type}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-850 text-sm font-semibold text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Outstanding Balance</label>
                  <input
                    type="text"
                    value={`₹${Number(payDueMember.outstanding_balance || 0).toLocaleString('en-IN')}`}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-850 text-sm font-bold text-amber-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount Paid Now *</label>
                  <input
                    type="number"
                    value={payDueForm.amount}
                    onChange={(e) => setPayDueForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Enter amount"
                    min="1"
                    max={payDueMember.outstanding_balance}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={payDueForm.date}
                    onChange={(e) => setPayDueForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                <select
                  value={payDueForm.payment_method}
                  onChange={(e) => setPayDueForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="upi">UPI / QR Scan</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="cash">Cash Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Collected By *</label>
                <input
                  type="text"
                  value={payDueForm.collected_by}
                  onChange={(e) => setPayDueForm(prev => ({ ...prev, collected_by: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Collected by staff name"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPayDueModalOpen(false);
                    setPayDueMember(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payDueForm.isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl gradient-btn cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {payDueForm.isSubmitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Notifications;
