import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import membersApi from '../api/members.api.js';
import { generateRenewalMessage } from '../utils/whatsappTemplates';
import { getTodayDateString } from '../utils/formatHelpers.js';
import { 
  RefreshCw, 
  Search, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  X,
  CreditCard,
  DollarSign
} from 'lucide-react';

export const Renewals = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter types: 'all', 'expired', 'expiring'
  const [renewalFilter, setRenewalFilter] = useState('all'); 
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [renewalFilter, searchTerm]);

  // Toast
  const [toast, setToast] = useState(null);

  // Renewal Action Modal State
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappData, setWhatsappData] = useState(null); // { member, message }
  const MEMBERSHIP_PLANS = {
    '1 Day': { price: 150, label: '1 Day (₹150)' },
    '1 Week': { price: 600, label: '1 Week (₹600)' },
    '15 Days': { price: 800, label: '15 Days (₹800)' },
    'Monthly': { price: 1200, label: 'Monthly (₹1200)' },
    '3 Months': { price: 3500, label: '3 Months (₹3500)' },
    '6 Months': { price: 6800, label: '6 Months (₹6800)' },
    '1 Year': { price: 12000, label: '1 Year (₹12000)' },
    'PT': { price: 3500, label: 'PT (Personal Training) (₹3500)' }
  };

  const [renewForm, setRenewForm] = useState({
    planName: 'Monthly',
    amount: '1200',
    paymentMethod: 'upi',
    collectedBy: ''
  });

  const { user } = useAuth();

  useEffect(() => {
    if (user?.name) {
      setRenewForm(prev => ({ ...prev, collectedBy: user.name }));
    }
  }, [user]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  // Autofill amount when planName changes
  useEffect(() => {
    const plan = renewForm.planName;
    const price = MEMBERSHIP_PLANS[plan]?.price || 1200;
    setRenewForm(prev => ({ ...prev, amount: String(price) }));
  }, [renewForm.planName]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      // Fetch expiring/expired members with a large limit to list all of them
      const res = await membersApi.getAll({ expiring: true, limit: 1000 });
      if (res.success && res.data) {
        setMembers(res.data.rows);
      }
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Error loading members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMembers = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filtered = members.filter(m => {
      // 1. Text filter
      const matchesText = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.phone.includes(searchTerm) ||
                          (m.register_number && m.register_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (m.device_user_id && String(m.device_user_id).includes(searchTerm));
      
      if (!matchesText) return false;

      // 2. Expiry conditions
      const expiry = new Date(m.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      const isExpired = expiry < today;
      
      // Expiring in next 15 days
      const fifteenDaysFromNow = new Date(today);
      fifteenDaysFromNow.setDate(today.getDate() + 15);
      const isExpiringSoon = expiry >= today && expiry <= fifteenDaysFromNow;

      if (renewalFilter === 'expired') {
        return isExpired;
      } else if (renewalFilter === 'expiring') {
        return isExpiringSoon;
      }
      
      // Default 'all': Show both expired and expiring soon (30 days) members
      return isExpired || isExpiringSoon;
    });

    // Sort by expiry_date ASC so already expired and soon-to-expire members are at the top
    return filtered.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  };

  const handleOpenRenew = (member) => {
    setSelectedMember(member);
    const initialPlan = MEMBERSHIP_PLANS[member.membership_type] ? member.membership_type : 'Monthly';
    
    const todayStr = getTodayDateString();
    let defaultStartDate = todayStr;
    if (member.status === 'active' && member.expiry_date && member.expiry_date > todayStr) {
      defaultStartDate = member.expiry_date;
    }

    setRenewForm({
      planName: initialPlan,
      amount: String(MEMBERSHIP_PLANS[initialPlan].price),
      paymentMethod: 'upi',
      collectedBy: user?.name || '',
      startDate: defaultStartDate
    });
    setIsRenewModalOpen(true);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!renewForm.amount || isNaN(renewForm.amount) || parseFloat(renewForm.amount) <= 0) {
      showToast('Please enter a valid renewal amount', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      const res = await membersApi.renew(selectedMember.id, {
        planName: renewForm.planName,
        amount: parseFloat(renewForm.amount),
        paymentMethod: renewForm.paymentMethod,
        collectedBy: user?.name || 'Staff',
        startDate: renewForm.startDate
      });

      if (res.success && res.data) {
        // Backend returns { newExpiry, receiptNumber }
        // Plan/amount come from the submitted form (same values sent to server)
        const renewalMsg = generateRenewalMessage(
          selectedMember,
          renewForm.planName,
          renewForm.amount,
          renewForm.startDate,
          res.data.newExpiry
        );
        setWhatsappData({ member: selectedMember, message: renewalMsg });
        setIsWhatsAppModalOpen(true);
        // Show success toast
        showToast(`Renewed successfully! Receipt: ${res.data.receiptNumber}`, 'success');
        // Close renew modal and clear selected member
        setIsRenewModalOpen(false);
        setSelectedMember(null);
        // Members list will refresh on WhatsApp modal close
      } else {
        showToast(res.message || 'Renewal failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Server connection error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredList = getFilteredMembers();
  const todayVal = new Date();

  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Membership Renewals" />

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
        
        {/* Statistics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="glass-panel border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Expired Accounts</span>
              <strong className="text-2xl font-bold text-red-400 mt-1 block font-mono">
                {members.filter(m => new Date(m.expiry_date) < todayVal).length}
              </strong>
            </div>
            <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>

          <div className="glass-panel border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Expiring (Next 15 Days)</span>
              <strong className="text-2xl font-bold text-amber-400 mt-1 block font-mono">
                {members.filter(m => {
                  const exp = new Date(m.expiry_date);
                  const maxLimit = new Date(todayVal);
                  maxLimit.setDate(todayVal.getDate() + 15);
                  return exp >= todayVal && exp <= maxLimit;
                }).length}
              </strong>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Clock size={18} />
            </div>
          </div>

          <div className="glass-panel border-slate-800/80 p-5 rounded-2xl flex items-center justify-between sm:col-span-2 md:col-span-1">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Overall Active Plans</span>
              <strong className="text-2xl font-bold text-emerald-400 mt-1 block font-mono">
                {members.filter(m => m.status === 'active').length}
              </strong>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
            <div className="relative w-full sm:max-w-md flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search member by name or phone..."
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl glass-input"
              />
            </div>

            <div className="flex bg-slate-950 border border-slate-800/80 rounded-xl p-1 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setRenewalFilter('all')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  renewalFilter === 'all' 
                    ? 'gradient-btn text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Dues
              </button>
              <button
                onClick={() => setRenewalFilter('expired')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  renewalFilter === 'expired' 
                    ? 'bg-red-600 text-white' 
                    : 'text-slate-400 hover:text-red-400'
                }`}
              >
                Expired
              </button>
              <button
                onClick={() => setRenewalFilter('expiring')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  renewalFilter === 'expiring' 
                    ? 'bg-amber-500 text-slate-950 font-bold' 
                    : 'text-slate-400 hover:text-amber-400'
                }`}
              >
                Expiring Soon
              </button>
            </div>
          </div>
        </div>

        {/* Renewals Table */}
        <div className="glass-panel border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              <Calendar size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="font-semibold text-slate-400">No expiring memberships matching current filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                    <th className="py-4 px-6">Member Name</th>
                    <th className="py-4 px-6">Phone Number</th>
                    <th className="py-4 px-6">Plan Type</th>
                    <th className="py-4 px-6">Expiry Date</th>
                    <th className="py-4 px-6">Due Amount</th>
                    <th className="py-4 px-6">Due Status</th>
                    <th className="py-4 px-6 text-right">Renewal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-sm">
                  {paginatedList.map((m) => {
                    const expiry = new Date(m.expiry_date);
                    const isExpired = expiry < todayVal;
                    const diffDays = Math.ceil((expiry - todayVal) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={m.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-200 break-words">
                          {m.name}
                          {m.register_number && (
                            <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2">
                              {m.register_number}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-400 font-mono text-xs">{m.phone}</td>
                        <td className="py-4 px-6 text-slate-300 font-medium">{m.membership_type}</td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-300">{m.expiry_date}</td>
                        <td className="py-4 px-6 font-bold text-amber-400">₹{m.outstanding_balance || 0}</td>
                        <td className="py-4 px-6">
                          {isExpired ? (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                              Expired {Math.abs(diffDays)} days ago
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded">
                              Expires in {diffDays} days
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setWhatsappData({ member: m, message: '' });
                                setIsWhatsAppModalOpen(true);
                              }}
                              disabled={!m.phone}
                              className={`p-1.5 border border-transparent rounded-lg transition cursor-pointer ${
                                m.phone
                                  ? 'text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                  : 'text-slate-600 opacity-40 cursor-not-allowed'
                              }`}
                              title={m.phone ? "Send WhatsApp Reminder" : "No phone number available"}
                            >
                              <WhatsAppIcon size={15} />
                            </button>
                            {Number(m.outstanding_balance) > 0 && (
                              <Link
                                to="/payments"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg cursor-pointer whitespace-nowrap transition"
                              >
                                <DollarSign size={12} />
                                <span>Pay Due</span>
                              </Link>
                            )}
                            <button
                              onClick={() => handleOpenRenew(m)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white gradient-btn rounded-lg cursor-pointer whitespace-nowrap"
                            >
                              <RefreshCw size={12} />
                              <span>Quick Renew</span>
                              <ChevronRight size={12} />
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

          {/* Pagination controls */}
          {!loading && totalItems > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4 text-xs">
              <span className="text-slate-400 font-medium">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} members (Page {currentPage} of {totalPages})
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
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Renew Modal Options Dialog */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => {
                setIsRenewModalOpen(false);
                setSelectedMember(null);
              }}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <RefreshCw size={20} className="text-indigo-400" />
              <span>Renew Membership</span>
            </h3>

            <div className="mb-5 p-3.5 bg-slate-950/40 border border-slate-800 rounded-2xl text-xs">
              <div className="flex justify-between">
                <span className="text-slate-550 font-medium">Renewing Member:</span>
                <strong className="text-slate-200 font-bold">
                  {selectedMember?.name}
                  {selectedMember?.register_number && ` (Reg: ${selectedMember.register_number})`}
                </strong>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-slate-550 font-medium">Current Expiry:</span>
                <span className="text-slate-400 font-semibold font-mono">{selectedMember?.expiry_date}</span>
              </div>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              
              {/* Start Date & Renewal Plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={renewForm.startDate}
                    onChange={(e) => setRenewForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Renewal Plan</label>
                  <select
                    value={renewForm.planName}
                    onChange={(e) => {
                      const plan = e.target.value;
                      const price = MEMBERSHIP_PLANS[plan]?.price || 0;
                      setRenewForm(prev => ({ ...prev, planName: plan, amount: String(price) }));
                    }}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs cursor-pointer font-semibold"
                  >
                    {Object.entries(MEMBERSHIP_PLANS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount & payment method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Amount (INR) *</label>
                  <input
                    type="number"
                    value={renewForm.amount}
                    onChange={(e) => setRenewForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Payment Mode</label>
                  <select
                    value={renewForm.paymentMethod}
                    onChange={(e) => setRenewForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs cursor-pointer font-semibold capitalize"
                  >
                    <option value="upi">UPI / GPay</option>
                    <option value="card">Card Payment</option>
                    <option value="cash">Cash Payment</option>
                  </select>
                </div>
              </div>

              {/* Collected By */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Collected By *</label>
                <input
                  type="text"
                  value={renewForm.collectedBy}
                  onChange={(e) => setRenewForm(prev => ({ ...prev, collectedBy: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold"
                  placeholder="Staff or Admin Name"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsRenewModalOpen(false);
                    setSelectedMember(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl gradient-btn cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <CreditCard size={13} />
                  <span>{submitting ? 'Updating validity...' : 'Capture & Renew'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {isWhatsAppModalOpen && whatsappData?.member && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setWhatsappData(null);
            fetchMembers();
          }}
          member={whatsappData.member}
          customMessage={whatsappData.message || ''}
        />
      )}
    </div>
  );
};
export default Renewals;
