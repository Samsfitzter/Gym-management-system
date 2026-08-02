import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import paymentsApi from '../api/payments.api.js';
import membersApi from '../api/members.api.js';
import { getTodayDateString } from '../utils/formatHelpers.js';
import { exportReceiptPDF } from '../api/exportHelpers.js';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { generateRenewalMessage } from '../utils/whatsappTemplates';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { receiptConfig } from '../config/receiptConfig.js';
import {
  CreditCard,
  DollarSign,
  Search,
  Plus,
  Receipt,
  X,
  FileText,
  User,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappMember, setWhatsappMember] = useState(null);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState('membership');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [limit] = useState(10);

  // Recording Payment Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberList, setMemberList] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'upi',
    date: getTodayDateString(),
    status: 'paid',
    collected_by: ''
  });

  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({ ...prev, collected_by: user.name }));
    }
  }, [user]);

  // Selected receipt for modal print preview
  const [activeReceipt, setActiveReceipt] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [searchQuery, currentPage]);

  useEffect(() => {
    if (memberSearchQuery.trim().length > 1) {
      searchMembers();
    } else {
      setMemberList([]);
    }
  }, [memberSearchQuery]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentsApi.getAll({
        search: searchQuery,
        page: currentPage,
        limit: limit
      });
      if (res.success && res.data) {
        setPayments(res.data.rows);
        setTotalPayments(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error loading payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchMembers = async () => {
    try {
      const res = await membersApi.getAll({ search: memberSearchQuery });
      if (res.success && res.data) {
        setMemberList(res.data.rows);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setMemberSearchQuery('');
    setMemberList([]);

    // Autofill amount based on outstanding balance, or typical amount based on member's current membership type
    let planPrice = 1200;
    if (member.membership_type === '1 Day') planPrice = 150;
    else if (member.membership_type === '1 Week') planPrice = 600;
    else if (member.membership_type === '15 Days') planPrice = 800;
    else if (member.membership_type === 'Monthly') planPrice = 1200;
    else if (member.membership_type === '3 Months') planPrice = 3500;
    else if (member.membership_type === '6 Months') planPrice = 6800;
    else if (member.membership_type === 'Yearly') planPrice = 12000;
    else if (member.membership_type === 'PT') planPrice = 3500;

    const defaultAmount = Number(member.outstanding_balance) > 0 ? Number(member.outstanding_balance) : planPrice;
    setFormData(prev => ({ ...prev, amount: defaultAmount }));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedMember) {
      showToast('Please select a member first', 'warning');
      return;
    }

    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }

    const payAmount = parseFloat(formData.amount);
    // Validation check removed to allow advance payments or generic receipts

    setIsSubmitting(true);
    try {
      const idempotencyKey = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const payload = {
        member_id: selectedMember.id,
        amount: parseFloat(formData.amount),
        date: formData.date,
        payment_method: formData.payment_method,
        status: formData.status,
        collected_by: formData.collected_by || user?.name || 'Staff',
        idempotency_key: idempotencyKey
      };

      const res = await paymentsApi.create(payload);

      if (res.success && res.data) {
        showToast('Payment recorded successfully', 'success');
        setIsRecordModalOpen(false);
        setSelectedMember(null);
        setFormData({
          amount: '',
          payment_method: 'upi',
          date: getTodayDateString(),
          status: 'paid',
          collected_by: user?.name || ''
        });
        fetchPayments();
      } else {
        showToast(res.message || 'Failed to record payment', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Server error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Collections & Receipts" />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
        {/* Actions panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white">Income Transactions</h3>
            <p className="text-xs text-slate-400 font-medium">Record invoices and view previous collections.</p>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full sm:max-w-xs flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search receipt, name, phone..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl glass-input text-white"
            />
          </div>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white gradient-btn rounded-xl shadow-lg cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        </div>

        {/* Payments History List */}
        <div className="glass-panel border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-24 text-center text-slate-500">
              <FileText size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="font-semibold text-slate-400">No payment records found</p>
              <p className="text-xs text-slate-500 mt-1">Submit a payment using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                    <th className="py-4 px-6">Receipt Number</th>
                    <th className="py-4 px-6">Member</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Payment Date</th>
                    <th className="py-4 px-6">Method</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">WhatsApp</th>
                    <th className="py-4 px-6 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-sm">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-300 break-words">
                        {p.receipt_number}
                      </td>
                      <td className="py-4 px-6">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-100 block break-words">
                            {p.member_name}
                            {p.member_register_number && (
                              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2">
                                {p.member_register_number}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">{p.member_phone}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-extrabold text-slate-100">
                        ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">
                        {p.date}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-slate-300 capitalize font-medium">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${p.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : p.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                          <span className={`h-1 w-1 rounded-full ${p.status === 'paid' ? 'bg-emerald-400' : p.status === 'pending' ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                          <span className="capitalize">{p.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {p.member_phone ? (
                          <button
                            onClick={() => {
                              const member = {
                                name: p.member_name,
                                phone: p.member_phone,
                                membership_type: p.membership_type,
                                expiry_date: p.expiry_date
                              };
                              const msg = generateRenewalMessage(
                                member,
                                p.membership_type,
                                p.amount,
                                p.start_date,
                                p.expiry_date
                              );
                              setWhatsappMember(member);
                              setWhatsappMessage(msg);
                              setWhatsappTemplate('membership');
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="p-1.5 text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded-lg transition cursor-pointer"
                            title="Send WhatsApp Message"
                          >
                            <WhatsAppIcon size={15} />
                          </button>
                        ) : (
                          <span className="text-slate-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            // Link profile name to matching object format
                            setActiveReceipt({
                              ...p,
                              name: p.member_name
                            });
                          }}
                          className="p-2 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 text-xs"
                        >
                          <Receipt size={14} />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination controls */}
          {!loading && totalPayments > limit && (
            <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4 text-xs">
              <span className="text-slate-400 font-medium">
                Showing {payments.length}/{totalPayments} payments (Page {currentPage} of {Math.ceil(totalPayments / limit)})
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={currentPage >= Math.ceil(totalPayments / limit)}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Record Payment Dialog */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => {
                setIsRecordModalOpen(false);
                setSelectedMember(null);
              }}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <DollarSign size={20} className="text-indigo-400" />
              <span>Record Member Payment</span>
            </h3>

            <form onSubmit={handleSubmitPayment} className="space-y-4">

              {/* Member Search input */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Select Member *</label>
                {!selectedMember ? (
                  <>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Search size={15} />
                      </span>
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search by member name, phone or ID..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-sm"
                        required
                      />
                    </div>
                    {memberList.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                        {memberList.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMember(m)}
                            className="px-4 py-2 hover:bg-indigo-600/25 border-b border-slate-850 text-xs font-semibold text-slate-300 cursor-pointer flex justify-between items-center"
                          >
                            <span>
                              {m.name} ({m.membership_type} Plan)
                              {m.register_number && (
                                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2">
                                  {m.register_number}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: #{m.id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold">
                      <div className="flex flex-col text-sm">
                        <span>
                          {selectedMember.name}
                          {selectedMember.register_number && (
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2 font-normal">
                              Reg: {selectedMember.register_number}
                            </span>
                          )}
                        </span>

                        <div className="flex gap-2">
                          <span className="text-xs text-indigo-400 font-normal">
                            ({selectedMember.membership_type} Plan)
                          </span>

                          <span
                            className={`text-xs font-bold ${Number(selectedMember.outstanding_balance) > 0
                              ? 'text-amber-400'
                              : 'text-slate-400'
                              }`}
                          >
                            Due: ₹{selectedMember.outstanding_balance || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMember(null)}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/50"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
              {/* Amount & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Amount Paid Now (INR) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-bold"
                    placeholder="1200"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Payment Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono"
                    required
                  />
                </div>
              </div>

              {/* Mode */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm cursor-pointer capitalize font-semibold"
                >
                  <option value="upi">UPI / QR Scan</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="cash">Cash Payment</option>
                </select>
              </div>

              {/* Collected By */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Collected By *</label>
                <input
                  type="text"
                  value={formData.collected_by}
                  onChange={(e) => setFormData(prev => ({ ...prev, collected_by: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-semibold"
                  placeholder="Staff or Admin Name"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecordModalOpen(false);
                    setSelectedMember(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl gradient-btn cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  Save Transaction
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Invoice Receipt Printable Popup */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-slate-950 rounded-3xl p-6 shadow-2xl relative animate-fade-in font-sans">
            <button
              onClick={() => setActiveReceipt(null)}
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
                  <span className="text-[10px] text-indigo-600 italic block mt-0.5">{receiptConfig.subtitle || "Fitness & Lifestyle Studio"}</span>
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
                  <span className="font-mono font-bold text-slate-800">{activeReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Member Name:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[100px]">{activeReceipt.name || activeReceipt.member_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Phone Number:</span>
                  <span className="font-mono text-slate-800">{activeReceipt.member_phone || activeReceipt.phone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Membership:</span>
                  <span className="font-semibold text-slate-800">{activeReceipt.membership_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Date:</span>
                  <span className="text-slate-800 font-medium">{activeReceipt.start_date || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Payment Date:</span>
                  <span className="text-slate-800 font-medium">{activeReceipt.date}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Expiry Date:</span>
                  <span className="font-semibold text-slate-800">{activeReceipt.expiry_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Method:</span>
                  <span className="uppercase text-slate-800 font-semibold">{activeReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">Collected By:</span>
                  <span className="text-slate-800 font-semibold">{activeReceipt.collected_by || user?.name || 'Staff'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`uppercase font-bold ${activeReceipt.status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>{activeReceipt.status}</span>
                </div>
              </div>
            </div>

            {/* Total Paid Highlighting Card */}
            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Total Amount Paid</span>
              <strong className="text-lg font-black text-indigo-600">₹{activeReceipt.amount}</strong>
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
                onClick={() => exportReceiptPDF(activeReceipt, activeReceipt.name, activeReceipt.collected_by || user?.name || 'Staff')}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>Download Receipt</span>
              </button>
              <button
                onClick={() => {
                  const receipt = activeReceipt;
                  const memberName = receipt.member_name || receipt.name || 'Member';
                  const memberPhone = receipt.member_phone || receipt.phone || '';
                  
                  const formatDate = (dateStr) => {
                    if (!dateStr || dateStr === 'N/A') return 'N/A';
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                    return dateStr;
                  };

                  const formattedAmount = Number(receipt.amount || 0).toLocaleString('en-IN');
                  const formattedPaymentDate = formatDate(receipt.date);
                  const formattedStartDate = formatDate(receipt.start_date);
                  const formattedExpiryDate = formatDate(receipt.expiry_date);
                  const paymentMode = String(receipt.payment_method || 'UPI').toUpperCase();
                  const paymentStatus = String(receipt.status || 'PAID').toUpperCase();

                  const msg = `Hi ${memberName},\n\nYour payment has been received successfully. Thank you for choosing SAM’S FITZTER! 💪\n\n👤 Member Name: ${memberName}\n📱 Mobile: ${memberPhone}\n🧾 Receipt No: ${receipt.receipt_number}\n🏋️ Membership Plan: ${receipt.membership_type || 'N/A'}\n💰 Amount Paid: ₹${formattedAmount}\n📅 Payment Date: ${formattedPaymentDate}\n📆 Membership Start Date: ${formattedStartDate}\n⏳ Membership Expiry Date: ${formattedExpiryDate}\n💳 Payment Mode: ${paymentMode}\n✅ Payment Status: ${paymentStatus}\n\nThank you for being a part of the SAM’S FITZTER FAMILY! ❤️💪\n\nSAM’S FITZTER\nLifestyle & Fitness Studio\nVanji Nagar`;

                  setWhatsappMember({
                    name: memberName,
                    phone: memberPhone,
                    membership_type: receipt.membership_type,
                    expiry_date: receipt.expiry_date,
                  });
                  setWhatsappMessage(msg);
                  setWhatsappTemplate('receipt');
                  setIsWhatsAppModalOpen(true);
                }}
                className="flex-1 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <WhatsAppIcon size={13} />
                <span>Share via WhatsApp</span>
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {isWhatsAppModalOpen && whatsappMember && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setWhatsappMember(null);
            setWhatsappMessage('');
            setWhatsappTemplate('membership');
          }}
          member={whatsappMember}
          customMessage={whatsappMessage}
          defaultTemplate={whatsappTemplate}
        />
      )}
    </div>
  );
};
export default Payments;
