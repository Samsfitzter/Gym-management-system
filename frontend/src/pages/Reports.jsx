import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import reportsApi from '../api/reports.api.js';
import expensesApi from '../api/expenses.api.js';
import { 
  exportCollectionExcel, 
  exportCollectionPDF,
  exportExpenseExcel,
  exportExpensePDF,
  exportProfitLossExcel,
  exportProfitLossPDF,
  exportCategoryWiseExcel,
  exportCategoryWisePDF
} from '../api/exportHelpers.js';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Wallet,
  PieChart,
  Calendar
} from 'lucide-react';
import { 
  formatMonetary, 
  formatFullDate, 
  formatConciseDate, 
  getSelectedRangeLabel, 
  getBezierPath 
} from '../utils/formatHelpers.js';

export const Reports = () => {
  const { user } = useAuth();
  
  // Tab selector state
  const [activeTab, setActiveTab] = useState('collections'); // 'collections' | 'expenses' | 'profit-loss' | 'category-wise'

  // Common Date Helpers
  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getOffsetDateString = (daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ==========================================
  // TAB 1: COLLECTIONS REPORT STATE & LOGIC
  // ==========================================
  const [collRange, setCollRange] = useState('daily');
  const [collFromDate, setCollFromDate] = useState(getOffsetDateString(-29));
  const [collToDate, setCollToDate] = useState(getTodayString());
  const [collError, setCollError] = useState('');
  const [collAnalytics, setCollAnalytics] = useState({
    summary: {
      totalCollections: 0,
      totalTransactions: 0,
      averageCollection: 0,
      newMembershipRevenue: 0,
      renewalRevenue: 0
    },
    chartData: [],
    monthlyCollections: [],
    transactions: []
  });
  const [collLoading, setCollLoading] = useState(true);

  // Collections charts refs & tooltips
  const trendChartRef = useRef(null);
  const monthlyChartRef = useRef(null);
  const [trendTooltip, setTrendTooltip] = useState({ visible: false, x: 0, y: 0, label: '', value: 0 });
  const [monthlyTooltip, setMonthlyTooltip] = useState({ visible: false, x: 0, y: 0, label: '', value: 0 });

  // Collections search & sorting pagination
  const [collSearchQuery, setCollSearchQuery] = useState('');
  const [collSortField, setCollSortField] = useState('date');
  const [collSortDirection, setCollSortDirection] = useState('desc');
  const [collCurrentPage, setCollCurrentPage] = useState(1);
  const collItemsPerPage = 10;

  useEffect(() => {
    if (activeTab === 'collections') {
      if (collRange === 'custom') {
        if (!collFromDate || !collToDate) {
          setCollError('Please select both from and to dates');
          return;
        }
        if (collFromDate > collToDate) {
          setCollError('From Date must be less than or equal to To Date');
          return;
        }
        const todayStr = getTodayString();
        if (collToDate > todayStr) {
          setCollError('To Date cannot be in the future');
          return;
        }
      }
      setCollError('');
      fetchCollectionData();
      setCollCurrentPage(1);
    }
  }, [activeTab, collRange, collFromDate, collToDate]);

  const fetchCollectionData = async () => {
    try {
      setCollLoading(true);
      const params = { range: collRange };
      if (collRange === 'custom') {
        params.fromDate = collFromDate;
        params.toDate = collToDate;
      }
      const res = await reportsApi.getCollectionAnalytics(params);
      if (res.success && res.data) {
        setCollAnalytics(res.data);
      }
    } catch (err) {
      console.error(err);
      setCollError('Error loading collections report');
    } finally {
      setCollLoading(false);
    }
  };

  const handleCollExportExcel = () => {
    const rangeText = collRange === 'custom' ? `custom_${collFromDate}_to_${collToDate}` : collRange;
    exportCollectionExcel(rangeText, collAnalytics.summary, collAnalytics.transactions, collAnalytics.monthlyCollections);
  };

  const handleCollExportPDF = () => {
    const rangeText = collRange === 'custom' ? `custom_${collFromDate}_to_${collToDate}` : collRange;
    exportCollectionPDF(rangeText, collAnalytics.summary, collAnalytics.transactions, collAnalytics.monthlyCollections, user?.name || 'Admin');
  };

  const handleCollSort = (field) => {
    if (collSortField === field) {
      setCollSortDirection(collSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCollSortField(field);
      setCollSortDirection('asc');
    }
  };

  const filteredCollTransactions = collAnalytics.transactions.filter(t => 
    (t.receipt_number && t.receipt_number.toLowerCase().includes(collSearchQuery.toLowerCase())) ||
    (t.member_name && t.member_name.toLowerCase().includes(collSearchQuery.toLowerCase())) ||
    (t.membership_plan && t.membership_plan.toLowerCase().includes(collSearchQuery.toLowerCase())) ||
    (t.payment_method && t.payment_method.toLowerCase().includes(collSearchQuery.toLowerCase()))
  );

  const sortedCollTransactions = [...filteredCollTransactions].sort((a, b) => {
    let aVal = a[collSortField];
    let bVal = b[collSortField];
    if (collSortField === 'amount') {
      aVal = parseFloat(aVal || 0);
      bVal = parseFloat(bVal || 0);
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }
    if (aVal < bVal) return collSortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return collSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const collTotalPages = Math.max(1, Math.ceil(sortedCollTransactions.length / collItemsPerPage));
  const currentCollTransactions = sortedCollTransactions.slice(
    (collCurrentPage - 1) * collItemsPerPage,
    collCurrentPage * collItemsPerPage
  );


  // ==========================================
  // TAB 2: EXPENSE REPORT STATE & LOGIC
  // ==========================================
  const [expCategories, setExpCategories] = useState([]);
  const [expCategoryFilter, setExpCategoryFilter] = useState('');
  const [expFromDate, setExpFromDate] = useState(getOffsetDateString(-29));
  const [expToDate, setExpToDate] = useState(getTodayString());
  const [expSearchQuery, setExpSearchQuery] = useState('');
  const [expensesList, setExpensesList] = useState([]);
  const [expLoading, setExpLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'expenses') {
      fetchExpCategories();
      fetchExpensesReport();
    }
  }, [activeTab, expCategoryFilter, expFromDate, expToDate]);

  const fetchExpCategories = async () => {
    try {
      const res = await expensesApi.getCategories();
      if (res.success && res.data) {
        setExpCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpensesReport = async () => {
    try {
      setExpLoading(true);
      const params = {
        limit: 1000, // Get all inside range
        category_id: expCategoryFilter,
        fromDate: expFromDate,
        toDate: expToDate,
        search: expSearchQuery
      };
      const res = await expensesApi.getAll(params);
      if (res.success && res.data) {
        setExpensesList(res.data.rows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExpLoading(false);
    }
  };

  const handleExpSearch = (e) => {
    e.preventDefault();
    fetchExpensesReport();
  };

  const handleExpExportExcel = () => {
    exportExpenseExcel(`range_${expFromDate}_to_${expToDate}`, { category_id: expCategoryFilter }, expensesList);
  };

  const handleExpExportPDF = () => {
    exportExpensePDF(`range_${expFromDate}_to_${expToDate}`, { category_id: expCategoryFilter }, expensesList, user?.name || 'Admin');
  };


  // ==========================================
  // TAB 3: PROFIT & LOSS STATE & LOGIC
  // ==========================================
  const [plView, setPlView] = useState('monthly'); // 'monthly' | 'yearly'
  const [plList, setPlList] = useState([]);
  const [plLoading, setPlLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'profit-loss') {
      fetchProfitLossReport();
    }
  }, [activeTab, plView]);

  const fetchProfitLossReport = async () => {
    try {
      setPlLoading(true);
      const res = await expensesApi.getProfitAndLoss({ view: plView });
      if (res.success && res.data) {
        setPlList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPlLoading(false);
    }
  };

  const handlePlExportExcel = () => {
    exportProfitLossExcel(plView, plList);
  };

  const handlePlExportPDF = () => {
    exportProfitLossPDF(plView, plList, user?.name || 'Admin');
  };


  // ==========================================
  // TAB 4: CATEGORY BREAKDOWN STATE & LOGIC
  // ==========================================
  const [catFromDate, setCatFromDate] = useState(getOffsetDateString(-29));
  const [catToDate, setCatToDate] = useState(getTodayString());
  const [categoryList, setCategoryList] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'category-wise') {
      fetchCategoryWiseReport();
    }
  }, [activeTab, catFromDate, catToDate]);

  const fetchCategoryWiseReport = async () => {
    try {
      setCatLoading(true);
      const res = await expensesApi.getCategoryWiseReport({ fromDate: catFromDate, toDate: catToDate });
      if (res.success && res.data) {
        setCategoryList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCatLoading(false);
    }
  };

  const handleCatExportExcel = () => {
    exportCategoryWiseExcel(`range_${catFromDate}_to_${catToDate}`, categoryList);
  };

  const handleCatExportPDF = () => {
    exportCategoryWisePDF(`range_${catFromDate}_to_${catToDate}`, categoryList, user?.name || 'Admin');
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Financial Management Reports" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 space-x-6 pb-0.5 overflow-x-auto flex-nowrap scrollbar-none">
          {[
            { id: 'collections', label: 'Collections Report', icon: DollarSign },
            { id: 'expenses', label: 'Expense Report', icon: Wallet },
            { id: 'profit-loss', label: 'Profit & Loss Statement', icon: TrendingUp },
            { id: 'category-wise', label: 'Category Breakdown', icon: PieChart }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 cursor-pointer transition-all duration-150 shrink-0 ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-500'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1 CONTENT: COLLECTIONS REPORT                        */}
        {/* ======================================================== */}
        {activeTab === 'collections' && (
          <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col gap-6 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 w-full">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Revenue Collections Reports</h2>
                  <p className="text-slate-400 text-xs mt-1">Review membership payments, collections breakdown, and trends.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={handleCollExportExcel}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    onClick={handleCollExportPDF}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
                  >
                    <FileText size={14} className="text-indigo-400" />
                    <span>Export PDF</span>
                  </button>

                  <button 
                    onClick={fetchCollectionData}
                    className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 rounded-xl transition cursor-pointer h-9 w-9 flex items-center justify-center"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-slate-800/40 w-full">
                <div className="flex bg-slate-950 border border-slate-800/80 rounded-xl p-1 w-full sm:w-auto">
                  {['daily', 'weekly', 'monthly', 'custom'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setCollRange(t)}
                      className={`flex-1 sm:flex-initial px-4.5 py-1.5 text-xs font-semibold rounded-lg transition capitalize cursor-pointer ${
                        collRange === t 
                          ? 'gradient-btn text-white' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {collRange === 'custom' && (
                  <div className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800/80 rounded-xl p-1.5 w-full sm:w-auto">
                    <input
                      type="date"
                      value={collFromDate}
                      onChange={(e) => setCollFromDate(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="bg-transparent border-0 text-slate-200 text-xs font-semibold px-2 py-0.5 focus:ring-0 focus:outline-none cursor-pointer flex-1 text-center sm:text-left"
                    />
                    <span className="text-slate-650 text-xs shrink-0">-</span>
                    <input
                      type="date"
                      value={collToDate}
                      onChange={(e) => setCollToDate(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="bg-transparent border-0 text-slate-200 text-xs font-semibold px-2 py-0.5 focus:ring-0 focus:outline-none cursor-pointer flex-1 text-center sm:text-left"
                    />
                  </div>
                )}
              </div>
            </div>

            {collError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-semibold">
                {collError}
              </div>
            )}

            {collLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  {[
                    { title: "Total Collections", value: formatMonetary(collAnalytics.summary.totalCollections), desc: `Exact: ₹${(collAnalytics.summary.totalCollections || 0).toLocaleString('en-IN')}`, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: DollarSign },
                    { title: "Total Transactions", value: collAnalytics.summary.totalTransactions, desc: "Payment receipts count", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: CreditCard },
                    { title: "Average Value", value: formatMonetary(collAnalytics.summary.averageCollection), desc: `Exact: ₹${Math.round(collAnalytics.summary.averageCollection || 0).toLocaleString('en-IN')}`, color: "text-indigo-400 bg-indigo-500/10 border-indigo-550/20", icon: TrendingUp },
                    { title: "Membership Revenue", value: formatMonetary(collAnalytics.summary.newMembershipRevenue), desc: "New registrations", color: "text-teal-400 bg-teal-500/10 border-teal-500/20", icon: DollarSign },
                    { title: "Renewal Revenue", value: formatMonetary(collAnalytics.summary.renewalRevenue), desc: "Plan renewals", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: RefreshCw }
                  ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <div key={i} className="glass-panel border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{card.title}</span>
                          <strong className="text-2xl font-black text-white block mt-1">{card.value}</strong>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          <span className="text-[9px] text-slate-500 font-medium block truncate max-w-[130px]">{card.desc}</span>
                          <div className={`p-2 border rounded-xl ${card.color}`}>
                            <Icon size={14} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Collections Trend */}
                  <div ref={monthlyChartRef} className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-[360px] relative">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-400" />
                        <span>Monthly Revenue Comparisons</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Collections comparisons of last 3 calendar months</p>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <div className="relative min-w-[500px] mt-4 flex-1">
                        {(() => {
                          const monthlyData = collAnalytics.monthlyCollections || [];
                          if (monthlyData.length === 0) {
                            return <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">No collections recorded in monthly comparison range</div>;
                          }

                          const maxRaw = Math.max(...monthlyData.map(d => d.amount), 0);
                          const maxVal = maxRaw === 0 ? 1000 : Math.ceil(maxRaw * 1.15); // headroom & zero fallback
                          const width = 400;
                          const height = 220;
                          const paddingLeft = 55;
                          const paddingRight = 20;
                          const paddingTop = 20;
                          const paddingBottom = 30;

                          const chartWidth = width - paddingLeft - paddingRight;
                          const chartHeight = height - paddingTop - paddingBottom;

                          const barWidth = 32;
                          const gap = (chartWidth - barWidth * monthlyData.length) / (monthlyData.length + 1);

                          return (
                            <div className="relative w-full h-full">
                              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                                <defs>
                                  <linearGradient id="emeraldGradientReports" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34d399" />
                                    <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
                                  </linearGradient>
                                </defs>

                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                  const y = paddingTop + ratio * chartHeight;
                                  const val = Math.round(maxVal * (1 - ratio));
                                  return (
                                    <g key={i}>
                                      <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#475569" strokeWidth="1" strokeDasharray="3,3" className="opacity-20" />
                                      <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="#cbd5e1" fontSize="10" fontWeight="600" fontFamily="monospace">
                                        ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                                      </text>
                                    </g>
                                  );
                                })}

                                {monthlyData.map((d, index) => {
                                  const x = paddingLeft + gap + index * (barWidth + gap);
                                  const barHeight = (d.amount / maxVal) * chartHeight;
                                  const y = paddingTop + chartHeight - barHeight;

                                  return (
                                    <g key={index} className="group/bar">
                                      <rect 
                                        x={x} 
                                        y={y} 
                                        width={barWidth} 
                                        height={Math.max(2, barHeight)} 
                                        fill="url(#emeraldGradientReports)" 
                                        rx="5" 
                                        className="transition-all duration-200 hover:fill-emerald-400 cursor-pointer" 
                                        onMouseEnter={(e) => {
                                          const rect = monthlyChartRef.current.getBoundingClientRect();
                                          const barRect = e.currentTarget.getBoundingClientRect();
                                          const tooltipX = barRect.left - rect.left + barRect.width / 2;
                                          const tooltipY = barRect.top - rect.top - 60;
                                          setMonthlyTooltip({
                                            visible: true,
                                            x: tooltipX,
                                            y: tooltipY,
                                            label: d.month,
                                            value: d.amount
                                          });
                                        }}
                                        onMouseLeave={() => setMonthlyTooltip(prev => ({ ...prev, visible: false }))}
                                      />
                                      <text 
                                        x={x + barWidth / 2} 
                                        y={paddingTop + chartHeight + 16} 
                                        textAnchor="middle" 
                                        fill="#cbd5e1" 
                                        fontSize="10" 
                                        fontWeight="600"
                                      >
                                        {d.month}
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>

                              {monthlyTooltip.visible && (
                                <div 
                                  className="absolute bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 shadow-2xl pointer-events-none transition-all duration-150 ease-out z-30 font-sans backdrop-blur-md -translate-x-1/2"
                                  style={{ left: `${monthlyTooltip.x}px`, top: `${monthlyTooltip.y}px` }}
                                >
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{monthlyTooltip.label}</div>
                                  <div className="text-xs font-black text-emerald-455 mt-1">₹{Number(monthlyTooltip.value).toLocaleString('en-IN')}</div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Daily Trend Line */}
                  <div ref={trendChartRef} className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-[360px] relative">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-400" />
                        <span>Revenue Trend Log</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Collections trajectory logs</p>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <div className="relative min-w-[500px] mt-4 flex-1">
                        {(() => {
                          const trendData = collAnalytics.chartData || [];
                          if (trendData.length === 0) {
                            return <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">No collection records found in range</div>;
                          }

                          const maxRaw = Math.max(...trendData.map(d => d.value), 0);
                          const maxVal = maxRaw === 0 ? 1000 : Math.ceil(maxRaw * 1.15); // headroom & zero fallback
                          const width = 400;
                          const height = 220;
                          const paddingLeft = 55;
                          const paddingRight = 20;
                          const paddingTop = 20;
                          const paddingBottom = 30;

                          const chartWidth = width - paddingLeft - paddingRight;
                          const chartHeight = height - paddingTop - paddingBottom;

                          const points = trendData.map((d, index) => {
                            const x = paddingLeft + (index / (trendData.length - 1 || 1)) * chartWidth;
                            const y = paddingTop + chartHeight - (d.value / maxVal) * chartHeight;
                            return { x, y, label: d.label, value: d.value };
                          });

                          const pathSmoothD = getBezierPath(points);
                          const areaD = `${pathSmoothD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

                          return (
                            <div className="relative w-full h-full">
                              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                                <defs>
                                  <linearGradient id="chartGradientReports" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>
                                
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                  const y = paddingTop + ratio * chartHeight;
                                  const val = Math.round(maxVal * (1 - ratio));
                                  return (
                                    <g key={i}>
                                      <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#475569" strokeWidth="1" strokeDasharray="3,3" className="opacity-20" />
                                      <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="#cbd5e1" fontSize="10" fontWeight="600" fontFamily="monospace">
                                        ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Area path */}
                                <path d={areaD} fill="url(#chartGradientReports)" />

                                {/* Line path */}
                                <path d={pathSmoothD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Interactive Points */}
                                {points.map((p, i) => (
                                  <circle 
                                    key={i}
                                    cx={p.x} 
                                    cy={p.y} 
                                    r="3.5" 
                                    fill="#6366f1" 
                                    stroke="#0f172a" 
                                    strokeWidth="1.5" 
                                    className="transition-all duration-200 hover:r-5 hover:fill-emerald-400 cursor-pointer" 
                                    onMouseEnter={(e) => {
                                      const rect = trendChartRef.current.getBoundingClientRect();
                                      const ptRect = e.currentTarget.getBoundingClientRect();
                                      const tooltipX = ptRect.left - rect.left + ptRect.width / 2;
                                      const tooltipY = ptRect.top - rect.top - 60;
                                      setTrendTooltip({
                                        visible: true,
                                        x: tooltipX,
                                        y: tooltipY,
                                        label: p.label,
                                        value: p.value
                                      });
                                    }}
                                    onMouseLeave={() => setTrendTooltip(prev => ({ ...prev, visible: false }))}
                                  />
                                ))}

                                {/* X labels */}
                                {points.filter((_, idx) => {
                                  if (trendData.length > 8) {
                                    return idx % Math.ceil(trendData.length / 4) === 0 || idx === trendData.length - 1;
                                  }
                                  return true;
                                }).map((p, i) => (
                                  <text key={i} x={p.x} y={height - 8} textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="600">{p.label}</text>
                                ))}
                              </svg>

                              {trendTooltip.visible && (
                                <div 
                                  className="absolute bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 shadow-2xl pointer-events-none transition-all duration-150 ease-out z-30 font-sans backdrop-blur-md -translate-x-1/2"
                                  style={{ left: `${trendTooltip.x}px`, top: `${trendTooltip.y}px` }}
                                >
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{trendTooltip.label}</div>
                                  <div className="text-xs font-black text-indigo-300 mt-1">₹{Number(trendTooltip.value).toLocaleString('en-IN')}</div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collections Transactions Table */}
                <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
                    <h3 className="text-sm font-bold text-white">Collections Transactions</h3>
                    <div className="relative">
                      <input
                        type="text"
                        value={collSearchQuery}
                        onChange={(e) => setCollSearchQuery(e.target.value)}
                        placeholder="Search transactions..."
                        className="px-3.5 py-1.5 pl-9 text-xs rounded-xl glass-input w-56"
                      />
                      <span className="absolute left-3 top-2.5 text-slate-500">
                        <Search size={12} />
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4">Receipt Number</th>
                          <th className="pb-3 pr-4">Member Name</th>
                          <th className="pb-3 pr-4">Plan</th>
                          <th className="pb-3 pr-4">Method</th>
                          <th className="pb-3 pr-4">Amount</th>
                          <th className="pb-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/50 text-xs text-slate-300">
                        {currentCollTransactions.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/20">
                            <td className="py-3 font-mono font-bold text-indigo-400">{t.receipt_number}</td>
                            <td className="py-3 font-bold text-slate-100 break-words">{t.member_name}</td>
                            <td className="py-3">{t.membership_plan}</td>
                            <td className="py-3 uppercase">{t.payment_method}</td>
                            <td className="py-3 font-bold text-slate-100">₹{t.amount.toLocaleString('en-IN')}</td>
                            <td className="py-3 font-mono">{t.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2 CONTENT: EXPENSE REPORT                            */}
        {/* ======================================================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl backdrop-blur-md">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Gym Expense Reports</h2>
                <p className="text-slate-450 text-xs mt-1">Audit operational expenditures, filter by categories and payment methods, and download statements.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
                <button
                  onClick={handleExpExportExcel}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <span>Export Excel</span>
                </button>

                <button
                  onClick={handleExpExportPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
                >
                  <FileText size={14} className="text-indigo-400" />
                  <span>Export PDF</span>
                </button>

                <button 
                  onClick={fetchExpensesReport}
                  className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 rounded-xl transition cursor-pointer h-9 w-9 flex items-center justify-center"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <form onSubmit={handleExpSearch} className="relative w-full md:flex-1">
                <input
                  type="text"
                  value={expSearchQuery}
                  onChange={(e) => setExpSearchQuery(e.target.value)}
                  placeholder="Search description or creator..."
                  className="w-full px-3.5 py-2 pl-9 text-xs rounded-xl glass-input"
                />
                <span className="absolute left-3 top-3 text-slate-500">
                  <Search size={12} />
                </span>
              </form>

              <select
                value={expCategoryFilter}
                onChange={(e) => setExpCategoryFilter(e.target.value)}
                className="w-full md:w-auto px-3.5 py-2 text-xs rounded-xl glass-input cursor-pointer"
              >
                <option value="">All Categories</option>
                {expCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              <div className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-850 rounded-xl p-1.5 w-full md:w-auto shrink-0">
                <input
                  type="date"
                  value={expFromDate}
                  onChange={(e) => setExpFromDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-transparent border-0 text-slate-200 text-xs font-semibold px-2 py-0.5 focus:ring-0 focus:outline-none cursor-pointer flex-1 text-center md:text-left"
                />
                <span className="text-slate-600 text-xs shrink-0">-</span>
                <input
                  type="date"
                  value={expToDate}
                  onChange={(e) => setExpToDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-transparent border-0 text-slate-200 text-xs font-semibold px-2 py-0.5 focus:ring-0 focus:outline-none cursor-pointer flex-1 text-center md:text-left"
                />
              </div>
            </div>

            {/* Expenses list table */}
            <div className="glass-panel border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              {expLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : expensesList.length === 0 ? (
                <div className="py-24 text-center text-slate-500 text-xs font-medium">
                  No expense records match the specified filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                        <th className="py-4 px-6">Date</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Amount</th>
                        <th className="py-4 px-6">Payment Method</th>
                        <th className="py-4 px-6">Description</th>
                        <th className="py-4 px-6">Created By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-xs text-slate-300">
                      {expensesList.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-900/20">
                          <td className="py-4 px-6 font-mono">{e.expenseDate}</td>
                          <td className="py-4 px-6 font-bold text-slate-200">{e.categoryName}</td>
                          <td className="py-4 px-6 font-bold text-amber-400">₹{parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 uppercase">{String(e.paymentMethod).replace('_', ' ')}</td>
                          <td className="py-4 px-6 text-slate-400 truncate max-w-[220px]" title={e.description}>{e.description || '-'}</td>
                          <td className="py-4 px-6 font-semibold">{e.creatorName || 'Staff'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3 CONTENT: PROFIT & LOSS REPORT                      */}
        {/* ======================================================== */}
        {activeTab === 'profit-loss' && (
          <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl backdrop-blur-md">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Profit & Loss Statements</h2>
                <p className="text-slate-455 text-xs mt-1">Perform balance sheet analysis (Collections vs Operational Expenses) to monitor monthly/yearly profit margins.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0 font-semibold text-slate-300">
                <button
                  onClick={handlePlExportExcel}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs rounded-xl cursor-pointer transition"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <span>Export Excel</span>
                </button>

                <button
                  onClick={handlePlExportPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs rounded-xl cursor-pointer transition"
                >
                  <FileText size={14} className="text-indigo-400" />
                  <span>Export PDF</span>
                </button>

                <div className="flex bg-slate-950 border border-slate-800/80 rounded-xl p-1 shrink-0 w-full sm:w-auto">
                  {['monthly', 'yearly'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setPlView(t)}
                      className={`flex-1 sm:flex-initial px-3.5 py-1 text-[10px] rounded-lg transition capitalize cursor-pointer ${
                        plView === t 
                          ? 'gradient-btn text-white' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* P&L Statement Grid list */}
            <div className="glass-panel border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              {plLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : plList.length === 0 ? (
                <div className="py-24 text-center text-slate-500 text-xs font-semibold">
                  No billing transactions recorded to compute Profit & Loss statistics.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                        <th className="py-4 px-6">{plView === 'monthly' ? 'Month' : 'Year'}</th>
                        <th className="py-4 px-6">Total Collections (Income)</th>
                        <th className="py-4 px-6">Total Expenses</th>
                        <th className="py-4 px-6 text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-xs font-semibold">
                      {plList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/20 text-slate-300">
                          <td className="py-4 px-6 text-slate-100 font-bold">{row.period}</td>
                          <td className="py-4 px-6 text-emerald-450">₹{parseFloat(row.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-rose-450">₹{parseFloat(row.expenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className={`py-4 px-6 text-right font-black text-sm ${parseFloat(row.netProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ₹{parseFloat(row.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4 CONTENT: CATEGORY BREAKDOWN                       */}
        {/* ======================================================== */}
        {activeTab === 'category-wise' && (
          <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl backdrop-blur-md">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Category Spending Contribution Breakdown</h2>
                <p className="text-slate-450 text-xs mt-1">Review top operational overhead expenditures grouped by categories, including percentage distribution logs.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
                <button
                  onClick={handleCatExportExcel}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <span>Export Excel</span>
                </button>

                <button
                  onClick={handleCatExportPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
                >
                  <FileText size={14} className="text-indigo-400" />
                  <span>Export PDF</span>
                </button>

                <button 
                  onClick={fetchCategoryWiseReport}
                  className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 rounded-xl transition cursor-pointer h-9 w-9 flex items-center justify-center"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Date range selection */}
            <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <Calendar size={14} className="text-indigo-400" />
                <span>Date Range Filter:</span>
              </span>
              <div className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-850 rounded-xl p-1.5 w-full sm:w-auto shrink-0">
                <input
                  type="date"
                  value={catFromDate}
                  onChange={(e) => setCatFromDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-transparent border-0 text-slate-200 text-xs font-semibold px-2 py-0.5 focus:ring-0 focus:outline-none cursor-pointer flex-1 text-center sm:text-left"
                />
                <span className="text-slate-650 text-xs shrink-0">-</span>
                <input
                  type="date"
                  value={catToDate}
                  onChange={(e) => setCatToDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-transparent border-0 text-slate-200 text-xs font-semibold px-2 py-0.5 focus:ring-0 focus:outline-none cursor-pointer flex-1 text-center sm:text-left"
                />
              </div>
            </div>

            {/* Category breakdown table */}
            <div className="glass-panel border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
              {catLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : categoryList.length === 0 ? (
                <div className="py-24 text-center text-slate-500 text-xs font-semibold">
                  No expense records match the specified date range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                        <th className="py-4 px-6">Expense Category</th>
                        <th className="py-4 px-6">Total Amount recorded</th>
                        <th className="py-4 px-6 text-right">Percentage Contribution (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-xs font-semibold">
                      {categoryList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/20 text-slate-300">
                          <td className="py-4 px-6 text-slate-100 font-bold">{item.category}</td>
                          <td className="py-4 px-6 text-amber-450">₹{parseFloat(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-6 text-right text-indigo-400 font-mono font-bold text-sm">
                            {item.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Reports;
