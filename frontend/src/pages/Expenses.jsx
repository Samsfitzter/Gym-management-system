import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import expensesApi from '../api/expenses.api.js';
import { getTodayDateString } from '../utils/formatHelpers.js';
import {
  exportExpenseExcel,
  exportExpensePDF
} from '../api/exportHelpers.js';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  X,
  FileText,
  DollarSign,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  PlusCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import moment from 'moment';

export const Expenses = () => {
  const { user, isAdmin } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const today = getTodayDateString();
  const firstOfMonth = moment().startOf('month').format('YYYY-MM-DD');

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);

  // Sorting & Table Page state
  const [sortField, setSortField] = useState('expenseDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Add/Edit Expense Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [fileInput, setFileInput] = useState(null);
  const [formData, setFormData] = useState({
    expenseDate: getTodayDateString(),
    categoryId: '',
    amount: '',
    description: '',
    paymentMethod: 'upi'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Manage Panel state (Admin only)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  // View Details Modal State
  const [viewingExpense, setViewingExpense] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [currentPage, categoryFilter, fromDate, toDate, sortField, sortDirection]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchCategories = async () => {
    try {
      const res = await expensesApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {
        limit: itemsPerPage,
        page: currentPage,
        search: searchQuery,
        category_id: categoryFilter,
        fromDate,
        toDate,
      };

      const res = await expensesApi.getAll(params);
      if (res.success && res.data) {
        // Apply frontend sorting if needed, but backend supports parameters
        setExpenses(res.data.rows);
        setTotalCount(res.data.total);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error loading expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchExpenses();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setFromDate(firstOfMonth);
    setToDate(today);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  // Category addition
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (isCategorySubmitting) return;

    if (!newCategoryName.trim()) {
      showToast('Category name cannot be empty', 'warning');
      return;
    }

    setIsCategorySubmitting(true);
    try {
      const res = await expensesApi.createCategory({ name: newCategoryName });
      if (res.success) {
        showToast('New category added successfully', 'success');
        setNewCategoryName('');
        fetchCategories();
        setIsCategoryModalOpen(false);
      }
    } catch (err) {
      showToast(err.message || 'Error creating category', 'error');
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setFormData({
      expenseDate: getTodayDateString(),
      categoryId: categories.length > 0 ? categories[0].id : '',
      amount: '',
      description: '',
      paymentMethod: 'upi'
    });
    setFileInput(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      expenseDate: expense.expenseDate,
      categoryId: expense.categoryId,
      amount: expense.amount,
      description: expense.description || '',
      paymentMethod: expense.paymentMethod
    });
    setFileInput(null);
    setIsModalOpen(true);
  };

  // Handle Form Submit (Create/Update)
  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.expenseDate) {
      showToast('Date is required', 'warning');
      return;
    }
    if (!formData.categoryId) {
      showToast('Category is required', 'warning');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Amount must be greater than zero', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataPayload = new FormData();
      dataPayload.append('expenseDate', formData.expenseDate);
      dataPayload.append('categoryId', formData.categoryId);
      dataPayload.append('amount', formData.amount);
      dataPayload.append('description', formData.description);
      dataPayload.append('paymentMethod', formData.paymentMethod);
      if (fileInput) {
        dataPayload.append('receipt', fileInput);
      }

      let res;
      if (editingExpense) {
        res = await expensesApi.update(editingExpense.id, dataPayload);
      } else {
        res = await expensesApi.create(dataPayload);
      }

      if (res.success) {
        showToast(editingExpense ? 'Expense updated successfully' : 'Expense recorded successfully', 'success');
        setIsModalOpen(false);
        fetchExpenses();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save expense details', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await expensesApi.delete(id);
      if (res.success) {
        showToast('Expense record deleted successfully', 'success');
        fetchExpenses();
      }
    } catch (err) {
      showToast(err.message || 'Error deleting expense', 'error');
    }
  };

  const handleExportExcel = () => {
    const rangeText = monthFilter ? `monthly_${monthFilter}` : 'all';
    exportExpenseExcel(rangeText, { category_id: categoryFilter, paymentMethod: '' }, expenses);
  };

  const handleExportPDF = () => {
    const rangeText = monthFilter ? `monthly_${monthFilter}` : 'all';
    exportExpensePDF(rangeText, { category_id: categoryFilter, paymentMethod: '' }, expenses, user?.name || 'Admin');
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  // Static url helper
  const getFullReceiptUrl = (url) => {
    if (!url) return '';
    return `${import.meta.env.VITE_API_URL || ''}${url}`;
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Expense Management" />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
        {/* Actions panel */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet size={20} className="text-amber-500" />
              <span>Operational Expenses</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">Record operational overheads and track general gym outgoings.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            {isAdmin() && (
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-xl cursor-pointer transition"
              >
                <PlusCircle size={14} className="text-indigo-400" />
                <span>Configure Categories</span>
              </button>
            )}

            <button
              onClick={handleOpenCreateModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white gradient-btn rounded-xl shadow-lg cursor-pointer"
            >
              <Plus size={16} />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, creator, method..."
              className="w-full px-3.5 py-2 pl-9 text-xs rounded-xl glass-input"
            />
            <span className="absolute left-3 top-3 text-slate-500">
              <Search size={12} />
            </span>
          </form>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-auto px-3.5 py-2 text-xs rounded-xl glass-input cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Date Range filters */}
          <div className="flex items-center justify-between gap-2 bg-slate-950/40 border border-slate-850 rounded-xl px-2.5 py-1 w-full md:w-auto">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{ colorScheme: 'dark' }}
              className="bg-transparent border-0 text-slate-300 text-[10px] font-semibold focus:ring-0 focus:outline-none cursor-pointer flex-1 text-center md:text-left"
            />
            <span className="text-slate-650 text-xs shrink-0">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              max={getTodayDateString()}
              style={{ colorScheme: 'dark' }}
              className="bg-transparent border-0 text-slate-300 text-[10px] font-semibold focus:ring-0 focus:outline-none cursor-pointer flex-1 text-center md:text-left"
            />
          </div>

          <div className="flex items-center justify-between gap-3 w-full md:w-auto shrink-0 md:ml-auto">
            <button
              onClick={handleClearFilters}
              className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              Clear Filters
            </button>

            {/* Export buttons (Admins only) */}
            {isAdmin() && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="p-2 border border-slate-855 hover:border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                  title="Export list to Excel"
                >
                  <FileText size={14} className="text-emerald-400" />
                </button>
                <button
                  onClick={handleExportPDF}
                  className="p-2 border border-slate-855 hover:border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                  title="Export list to PDF"
                >
                  <FileText size={14} className="text-indigo-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="glass-panel border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-24 text-center text-slate-500">
              <DollarSign size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="font-semibold text-slate-400">No expense logs found</p>
              <p className="text-xs text-slate-500 mt-1">Submit an expense transaction using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto animate-fade-in">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                    <th className="py-4 px-6">
                      <button onClick={() => handleSort('expenseDate')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                        <span>Date</span>
                        <ArrowUpDown size={11} className="text-slate-500" />
                      </button>
                    </th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">
                      <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                        <span>Amount</span>
                        <ArrowUpDown size={11} className="text-slate-500" />
                      </button>
                    </th>
                    <th className="py-4 px-6">Payment Method</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6">Created By</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-sm">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">
                        {e.expenseDate}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-200">
                        {e.categoryName}
                      </td>
                      <td className="py-4 px-6 font-extrabold text-amber-400">
                        ₹{parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-slate-300 capitalize font-medium">
                          {String(e.paymentMethod).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400 truncate max-w-[200px]" title={e.description}>
                        {e.description || '-'}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400 font-semibold">
                        {e.creatorName || 'Staff'}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setViewingExpense(e)}
                            className="p-1.5 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                            title="View receipt and audit trail"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(e)}
                            className="p-1.5 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                            title="Edit Expense"
                          >
                            <Edit size={14} />
                          </button>

                          {isAdmin() && (
                            <button
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition cursor-pointer"
                              title="Delete (Soft Delete)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-slate-500">
              Showing page <strong className="text-slate-300">{currentPage}</strong> of <strong className="text-slate-300">{totalPages}</strong>
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-2 border border-slate-800 bg-slate-900 text-slate-400 hover:text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-2 border border-slate-800 bg-slate-900 text-slate-400 hover:text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Record / Edit Expense Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <Wallet size={20} className="text-amber-500" />
              <span>{editingExpense ? 'Edit Expense Record' : 'Record Gym Expense'}</span>
            </h3>

            <form onSubmit={handleSubmitExpense} className="space-y-4">

              {/* Date & Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Expense Date *</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Amount (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-bold text-amber-400"
                    placeholder="250.00"
                    min="0.01"
                    required
                  />
                </div>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm cursor-pointer font-semibold"
                    required
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm cursor-pointer capitalize font-semibold"
                  >
                    <option value="upi">UPI / QR Scan</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card Payment</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm h-20 resize-none"
                  placeholder="E.g., Internet provider monthly renewal payment receipt"
                />
              </div>

              {/* Receipt File Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Receipt Upload {editingExpense && <span className="text-[10px] text-slate-500 font-normal">(optional override)</span>}
                </label>
                <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 p-2 rounded-xl">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => setFileInput(e.target.files[0])}
                    className="text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 file:hover:bg-slate-700 file:cursor-pointer flex-1"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Supported: JPG, PNG, WEBP, PDF (max 10MB)</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl gradient-btn cursor-pointer shadow-lg"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal (Admin only) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <PlusCircle size={20} className="text-indigo-400" />
              <span>Manage Categories</span>
            </h3>

            {/* Existing Categories list */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-semibold text-slate-400">Current Categories</label>
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                {categories.map((c) => (
                  <div key={c.id} className="text-xs font-semibold text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-850">
                    {c.name}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">New Category Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Electric Bill"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl gradient-btn cursor-pointer shadow-lg"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Detail View Modal */}
      {viewingExpense && (
        <ExpenseDetailModal
          expenseId={viewingExpense.id}
          onClose={() => setViewingExpense(null)}
          getFullReceiptUrl={getFullReceiptUrl}
        />
      )}
    </div>
  );
};

// Component for View Details to handle fetching individual audit records independently
const ExpenseDetailModal = ({ expenseId, onClose, getFullReceiptUrl }) => {
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [expenseId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await expensesApi.getById(expenseId);
      if (res.success && res.data) {
        setExpense(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isPdf = expense?.receiptUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-2xl relative animate-fade-in flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition z-10"
        >
          <X size={16} />
        </button>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : !expense ? (
          <div className="py-12 text-center text-slate-500">
            <AlertTriangle size={36} className="mx-auto text-amber-500 mb-2" />
            <p className="text-sm font-semibold">Expense details could not be loaded.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 overflow-y-auto pr-1 custom-scrollbar">
            {/* Info Section */}
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-amber-500" />
                <span>Expense Details</span>
              </h3>

              <div className="grid grid-cols-1 gap-2.5 text-xs">
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1">
                  <span className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Category</span>
                  <strong className="text-sm text-slate-100">{expense.categoryName}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Amount</span>
                    <strong className="text-sm text-amber-400">₹{parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Expense Date</span>
                    <strong className="text-sm text-slate-100 font-mono">{expense.expenseDate}</strong>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1">
                  <span className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Payment Method</span>
                  <strong className="text-sm text-slate-100 capitalize">{String(expense.paymentMethod).replace('_', ' ')}</strong>
                </div>

                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1">
                  <span className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Description</span>
                  <p className="text-slate-300 leading-relaxed text-xs">{expense.description || 'No description provided.'}</p>
                </div>

                {/* Audit Trial Section */}
                <div className="bg-slate-950/60 border border-slate-850/80 p-3 rounded-2xl space-y-2">
                  <span className="text-indigo-400 font-bold block uppercase tracking-wider text-[9px] flex items-center gap-1">
                    <Clock size={10} />
                    <span>Audit Trail Log</span>
                  </span>
                  <div className="text-[10px] space-y-1.5 text-slate-400">
                    <div className="flex justify-between">
                      <span>Recorded By:</span>
                      <strong className="text-slate-300 font-semibold">{expense.creatorName}</strong>
                    </div>
                    {expense.updaterName && (
                      <div className="flex justify-between">
                        <span>Last Modified By:</span>
                        <strong className="text-slate-300 font-semibold">{expense.updaterName}</strong>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-850 pt-1.5 mt-1">
                      <span>Created Date:</span>
                      <strong className="font-mono text-slate-300">{new Date(expense.createdAt).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Modified:</span>
                      <strong className="font-mono text-slate-300">{new Date(expense.updatedAt).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Preview Section */}
            <div className="w-full md:w-72 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-2">Receipt Document</span>
                {expense.receiptUrl ? (
                  <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden h-64 flex items-center justify-center relative group">
                    {isPdf ? (
                      <div className="text-center p-4">
                        <FileText size={48} className="mx-auto text-red-500 mb-2" />
                        <span className="text-xs text-slate-300 font-bold block truncate max-w-[200px]">PDF Document</span>
                      </div>
                    ) : (
                      <img
                        src={getFullReceiptUrl(expense.receiptUrl)}
                        alt="Receipt"
                        className="w-full h-full object-contain"
                      />
                    )}

                    {/* Hover controls overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                      <a
                        href={getFullReceiptUrl(expense.receiptUrl)}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-850/50 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-950/20">
                    <FileText size={32} className="text-slate-700 mb-2" />
                    <span className="text-xs">No receipt uploaded</span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 shrink-0">
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;
