import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import dashboardApi from '../api/dashboard.api.js';
import expensesApi from '../api/expenses.api.js';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { formatMonetary, formatFullDate, getSelectedRangeLabel, getBezierPath } from '../utils/formatHelpers.js';
import { 
  exportDashboardCSV, 
  exportDashboardPDF 
} from '../api/exportHelpers.js';
import { 
  Users, 
  Fingerprint, 
  DollarSign, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  FileText,
  Gift,
  Bell,
  Clock,
  Eye,
  CheckCircle,
  AlertCircle,
  Wallet
} from 'lucide-react';

export const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState('daily');
  const [analytics, setAnalytics] = useState({
    metrics: {
      totalAttendance: 0,
      activeMembers: 0,
      newRegistrations: 0,
      renewals: 0,
      collections: 0,
      expiringMemberships: 0
    },
    chartData: [],
    monthlyCollections: [],
    lists: {
      activeMembersList: [],
      renewalsList: [],
      expiringList: [],
      collectionsList: [],
      attendanceList: []
    }
  });
  const [loading, setLoading] = useState(true);
  
  // Notification Center States
  const [notifications, setNotifications] = useState({
    birthdaysToday: [],
    birthdaysUpcoming: [],
    expiresTomorrow: [],
    expires3Days: [],
    expires7Days: [],
    expired: [],
    paymentDue: []
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [birthdayTab, setBirthdayTab] = useState('today');
  
  // Modal states
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappMember, setWhatsappMember] = useState(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState('membership');

  // Tooltip & Scroll chart reference states
  const [attendanceTooltip, setAttendanceTooltip] = useState({ visible: false, x: 0, y: 0, label: '', value: 0 });
  const [revenueTooltip, setRevenueTooltip] = useState({ visible: false, x: 0, y: 0, label: '', value: 0 });

  const attendanceChartRef = useRef(null);
  const revenueChartRef = useRef(null);

  const [profitabilityRange, setProfitabilityRange] = useState('current_month');
  const [profitabilityAnalytics, setProfitabilityAnalytics] = useState({
    chartData: [],
    categoryBreakdown: []
  });
  const [profitabilityLoading, setProfitabilityLoading] = useState(false);
  const [profitabilityTooltip, setProfitabilityTooltip] = useState({ visible: false, x: 0, y: 0, label: '', revenue: 0, expenses: 0, profit: 0 });
  const profitabilityChartCardRef = useRef(null);

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  useEffect(() => {
    if (isAdmin()) {
      fetchProfitabilityAnalytics();
    }
  }, [profitabilityRange]);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 5 * 60 * 1000); // 5 minutes periodic refresh
    return () => clearInterval(intervalId);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getAnalytics({ range });
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitabilityAnalytics = async () => {
    try {
      setProfitabilityLoading(true);
      const res = await expensesApi.getAnalytics({ range: profitabilityRange });
      if (res.success && res.data) {
        setProfitabilityAnalytics(res.data);
      }
    } catch (err) {
      console.error('Error fetching profitability analytics:', err);
    } finally {
      setProfitabilityLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const res = await dashboardApi.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleManualRefresh = () => {
    fetchAnalytics();
    fetchNotifications();
  };

  const handleExportExcel = () => {
    exportDashboardCSV(range, analytics.metrics, analytics.lists, isAdmin());
  };

  const handleExportPDF = () => {
    exportDashboardPDF(range, analytics.metrics, analytics.lists, isAdmin());
  };

  const metrics = analytics.metrics;
  const isUserAdmin = isAdmin();

  // Dashboard Cards
  const cards = [
    {
      title: "Total Attendance",
      value: metrics.totalAttendance,
      icon: UserCheck,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      description: "Check-ins inside range"
    },
    {
      title: "Total Members",
      value: metrics.activeMembers,
      icon: Users,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
      description: (
        <span>
          {metrics.absentMembersToday || 0} absent today (
          <span className="text-emerald-400 font-bold">{metrics.todayCheckIns || 0} present</span>)
        </span>
      )
    },
    {
      title: "New Registrations",
      value: metrics.newRegistrations,
      icon: UserPlus,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      description: "New member enrollments"
    },
    {
      title: "Membership Renewals",
      value: metrics.renewals,
      icon: RefreshCw,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      description: "Completed renewals"
    },
    isUserAdmin && {
      title: "Revenue Collections",
      value: formatMonetary(metrics.collections),
      icon: DollarSign,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      description: `Exact: ₹${(metrics.collections || 0).toLocaleString('en-IN')} (Admin only)`
    },
    {
      title: "Expiring Memberships",
      value: metrics.expiringMemberships,
      icon: AlertTriangle,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      description: "Members expiring soon"
    }
  ].filter(Boolean);

  // Render Premium SVG Chart
  const renderTrendChart = () => {
    const data = analytics.chartData || [];
    if (data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          No check-in trend data available for this range
        </div>
      );
    }

    const maxRaw = Math.max(...data.map(d => d.value), 0);
    const maxVal = maxRaw === 0 ? 5 : Math.ceil(maxRaw * 1.15); // headroom & zero fallback
    const width = 800;
    const height = 280;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 35;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = data.map((d, index) => {
      const x = paddingLeft + (index / (data.length - 1 || 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.value / maxVal) * chartHeight;
      return { x, y, label: d.label, value: d.value };
    });

    const pathSmoothD = getBezierPath(points);
    const areaD = `${pathSmoothD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

    return (
      <div ref={attendanceChartRef} className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col h-full justify-between relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-400" />
              <span>Attendance Trend Log</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Check-in statistics over the selected period</p>
          </div>
          <div className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-xl self-start sm:self-center font-mono">
            {getSelectedRangeLabel(range, null, null)}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="relative min-w-[600px] mt-6 flex-1">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingTop + ratio * chartHeight;
                const val = Math.round(maxVal * (1 - ratio));
                return (
                  <g key={i}>
                    <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#475569" strokeWidth="1" strokeDasharray="3,3" className="opacity-30" />
                    <text x={paddingLeft - 12} y={y + 4} textAnchor="end" fill="#cbd5e1" fontSize="12" fontWeight="600" fontFamily="monospace">{val}</text>
                  </g>
                );
              })}

              {/* Area path */}
              <path d={areaD} fill="url(#chartGradient)" />

              {/* Line path */}
              <path d={pathSmoothD} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Interactive Points */}
              {points.map((p, i) => (
                <g key={i} className="group/point">
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="4" 
                    fill="#6366f1" 
                    stroke="#020617" 
                    strokeWidth="2" 
                    className="transition-all duration-200 hover:r-6 hover:fill-emerald-400 cursor-pointer" 
                    onMouseEnter={(e) => {
                      const rect = attendanceChartRef.current.getBoundingClientRect();
                      const ptRect = e.currentTarget.getBoundingClientRect();
                      const tooltipX = ptRect.left - rect.left + ptRect.width / 2;
                      const tooltipY = ptRect.top - rect.top - 75;
                      setAttendanceTooltip({
                        visible: true,
                        x: tooltipX,
                        y: tooltipY,
                        label: p.label,
                        value: p.value
                      });
                    }}
                    onMouseLeave={() => setAttendanceTooltip({ visible: false, x: 0, y: 0, label: '', value: 0 })}
                  />
                </g>
              ))}

              {/* X labels */}
              {points.filter((_, idx) => {
                if (data.length > 15) return idx % 5 === 0 || idx === data.length - 1;
                return true;
              }).map((p, i) => (
                <text key={i} x={p.x} y={height - 8} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="600">{p.label}</text>
              ))}
            </svg>
          </div>
        </div>

        {/* Custom Tooltip */}
        {attendanceTooltip.visible && (
          <div 
            className="absolute bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl pointer-events-none transition-all duration-150 ease-out z-30 font-sans backdrop-blur-md -translate-x-1/2"
            style={{ left: `${attendanceTooltip.x}px`, top: `${attendanceTooltip.y}px` }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{formatFullDate(attendanceTooltip.label)}</div>
            <div className="text-xs font-black text-indigo-300 mt-1">Total: {attendanceTooltip.value} check-ins</div>
          </div>
        )}
      </div>
    );
  };

  const renderMiniRevenueChart = () => {
    if (!isUserAdmin) return null;
    const monthlyData = analytics.monthlyCollections || [];
    if (monthlyData.length === 0) return null;

    const maxRaw = Math.max(...monthlyData.map(d => d.amount), 0);
    const maxVal = maxRaw === 0 ? 1000 : Math.ceil(maxRaw * 1.15); // headroom & zero fallback
    const width = 400;
    const height = 280;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const barWidth = 32;
    const gap = (chartWidth - barWidth * monthlyData.length) / (monthlyData.length + 1);

    return (
      <div ref={revenueChartRef} className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-[380px] relative">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <span>Revenue Trend (Last 3 Months)</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Monthly collection comparisons (Admin only)</p>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="relative min-w-[500px] mt-4 flex-1">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingTop + ratio * chartHeight;
                const val = Math.round(maxVal * (1 - ratio));
                return (
                  <g key={i}>
                    <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#475569" strokeWidth="1" strokeDasharray="3,3" className="opacity-30" />
                    <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="#cbd5e1" fontSize="12" fontWeight="600" fontFamily="monospace">{formatMonetary(val)}</text>
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
                      height={barHeight} 
                      fill="url(#emeraldGradient)" 
                      rx="6" 
                      className="transition-all duration-200 hover:fill-emerald-400 cursor-pointer" 
                      onMouseEnter={(e) => {
                        const rect = revenueChartRef.current.getBoundingClientRect();
                        const barRect = e.currentTarget.getBoundingClientRect();
                        const tooltipX = barRect.left - rect.left + barRect.width / 2;
                        const tooltipY = barRect.top - rect.top - 75;
                        setRevenueTooltip({
                          visible: true,
                          x: tooltipX,
                          y: tooltipY,
                          label: d.month,
                          value: d.amount
                        });
                      }}
                      onMouseLeave={() => setRevenueTooltip({ visible: false, x: 0, y: 0, label: '', value: 0 })}
                    />
                    <text 
                      x={x + barWidth / 2} 
                      y={paddingTop + chartHeight + 18} 
                      textAnchor="middle" 
                      fill="#cbd5e1" 
                      fontSize="11" 
                      fontWeight="600"
                    >
                      {d.month}
                    </text>
                  </g>
                );
              })}

              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Custom Tooltip */}
        {revenueTooltip.visible && (
          <div 
            className="absolute bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl pointer-events-none transition-all duration-150 ease-out z-30 font-sans backdrop-blur-md -translate-x-1/2"
            style={{ left: `${revenueTooltip.x}px`, top: `${revenueTooltip.y}px` }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month: {revenueTooltip.label}</div>
            <div className="text-xs font-black text-emerald-400 mt-1">Exact Collection: ₹{Number(revenueTooltip.value).toLocaleString('en-IN')}</div>
          </div>
        )}
      </div>
    );
  };

  const renderRevenueVsExpenseChart = () => {
    const data = profitabilityAnalytics.chartData || [];
    if (data.length === 0) {
      return (
        <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex items-center justify-center text-slate-500 text-sm h-[380px]">
          No cash flow comparison data available
        </div>
      );
    }

    const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1000) * 1.15;
    const width = 800;
    const height = 280;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 35;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const barWidth = Math.max(3, Math.min(18, (chartWidth / data.length) / 3));
    const step = chartWidth / data.length;

    // Line points for Profit
    const profitPoints = data.map((d, index) => {
      const x = paddingLeft + index * step + step / 2;
      const y = paddingTop + chartHeight - (d.profit / maxVal) * chartHeight;
      return { x, y, label: d.label, profit: d.profit, revenue: d.revenue, expenses: d.expenses };
    });

    const profitPath = getBezierPath(profitPoints);

    return (
      <div ref={profitabilityChartCardRef} className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col h-full justify-between relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <span>Revenue vs Expense Comparison</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Cash flows comparison (Collections vs Expenditures)</p>
          </div>
          
          <div className="flex bg-slate-950 border border-slate-800/80 rounded-xl p-1 shrink-0">
            {[
              { label: '7 Days', value: '7days' },
              { label: '30 Days', value: '30days' },
              { label: 'Month', value: 'current_month' },
              { label: 'Year', value: 'current_year' }
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setProfitabilityRange(t.value)}
                className={`px-2.5 py-1 text-[9px] font-semibold rounded-lg transition cursor-pointer ${
                  profitabilityRange === t.value 
                    ? 'gradient-btn text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="relative min-w-[600px] mt-6 flex-1">
            {profitabilityLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#be123c" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = paddingTop + ratio * chartHeight;
                  const val = Math.round(maxVal * (1 - ratio));
                  return (
                    <g key={i}>
                      <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#475569" strokeWidth="1" strokeDasharray="3,3" className="opacity-20" />
                      <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="#cbd5e1" fontSize="11" fontWeight="600" fontFamily="monospace">{formatMonetary(val)}</text>
                    </g>
                  );
                })}

                {/* Draw side-by-side bars for Revenue & Expenses */}
                {data.map((d, index) => {
                  const groupX = paddingLeft + index * step + (step - barWidth * 2) / 2;
                  const revHeight = (d.revenue / maxVal) * chartHeight;
                  const revY = paddingTop + chartHeight - revHeight;
                  const expHeight = (d.expenses / maxVal) * chartHeight;
                  const expY = paddingTop + chartHeight - expHeight;

                  return (
                    <g key={index} className="group/bargroup">
                      {/* Revenue Bar */}
                      <rect 
                        x={groupX} 
                        y={revY} 
                        width={barWidth} 
                        height={Math.max(2, revHeight)} 
                        fill="url(#revenueBarGrad)" 
                        rx="2"
                        className="transition-all duration-200 hover:opacity-90 cursor-pointer"
                        onMouseEnter={(e) => {
                          const rect = profitabilityChartCardRef.current.getBoundingClientRect();
                          const barRect = e.currentTarget.getBoundingClientRect();
                          setProfitabilityTooltip({
                            visible: true,
                            x: barRect.left - rect.left + barRect.width,
                            y: barRect.top - rect.top - 90,
                            label: d.label,
                            revenue: d.revenue,
                            expenses: d.expenses,
                            profit: d.profit
                          });
                        }}
                        onMouseLeave={() => setProfitabilityTooltip(prev => ({ ...prev, visible: false }))}
                      />
                      {/* Expense Bar */}
                      <rect 
                        x={groupX + barWidth + 2} 
                        y={expY} 
                        width={barWidth} 
                        height={Math.max(2, expHeight)} 
                        fill="url(#expenseBarGrad)" 
                        rx="2"
                        className="transition-all duration-200 hover:opacity-90 cursor-pointer"
                        onMouseEnter={(e) => {
                          const rect = profitabilityChartCardRef.current.getBoundingClientRect();
                          const barRect = e.currentTarget.getBoundingClientRect();
                          setProfitabilityTooltip({
                            visible: true,
                            x: barRect.left - rect.left + barRect.width,
                            y: barRect.top - rect.top - 90,
                            label: d.label,
                            revenue: d.revenue,
                            expenses: d.expenses,
                            profit: d.profit
                          });
                        }}
                        onMouseLeave={() => setProfitabilityTooltip(prev => ({ ...prev, visible: false }))}
                      />
                    </g>
                  );
                })}

                {/* Draw Profit Line overlay */}
                <path d={profitPath} fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Profit points */}
                {profitPoints.map((p, i) => (
                  <circle 
                    key={i} 
                    cx={p.x} 
                    cy={p.y} 
                    r="3.5" 
                    fill="#eab308" 
                    stroke="#020617" 
                    strokeWidth="1.5" 
                    className="hover:r-5 cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = profitabilityChartCardRef.current.getBoundingClientRect();
                      const ptRect = e.currentTarget.getBoundingClientRect();
                      setProfitabilityTooltip({
                        visible: true,
                        x: ptRect.left - rect.left + ptRect.width / 2,
                        y: ptRect.top - rect.top - 90,
                        label: p.label,
                        revenue: p.revenue,
                        expenses: p.expenses,
                        profit: p.profit
                      });
                    }}
                    onMouseLeave={() => setProfitabilityTooltip(prev => ({ ...prev, visible: false }))}
                  />
                ))}

                {/* X Axis Labels */}
                {data.filter((_, idx) => {
                  if (data.length > 20) return idx % 5 === 0 || idx === data.length - 1;
                  return true;
                }).map((p, i) => {
                  const point = data[data.indexOf(p)];
                  const labelX = paddingLeft + data.indexOf(p) * step + step / 2;
                  return (
                    <text key={i} x={labelX} y={height - 8} textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="600">{point.label}</text>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 items-center justify-center pt-3 text-[10px] text-slate-400 font-semibold border-t border-slate-900 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#10b981]"></span>
            <span>Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#f43f5e]"></span>
            <span>Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#eab308]"></span>
            <span>Net Profit (Line)</span>
          </div>
        </div>

        {/* Custom Tooltip */}
        {profitabilityTooltip.visible && (
          <div 
            className="absolute bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl pointer-events-none transition-all duration-150 ease-out z-30 font-sans backdrop-blur-md -translate-x-1/2"
            style={{ left: `${profitabilityTooltip.x}px`, top: `${profitabilityTooltip.y}px` }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-450">{profitabilityTooltip.label}</div>
            <div className="space-y-0.5 mt-1.5 text-[11px] font-semibold">
              <div className="text-emerald-400">Revenue: ₹{profitabilityTooltip.revenue.toLocaleString('en-IN')}</div>
              <div className="text-rose-400">Expenses: ₹{profitabilityTooltip.expenses.toLocaleString('en-IN')}</div>
              <div className="text-amber-400 border-t border-slate-800 pt-1 mt-1 font-bold">Net Profit: ₹{profitabilityTooltip.profit.toLocaleString('en-IN')}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExpenseCategoryBreakdown = () => {
    const breakdown = profitabilityAnalytics.categoryBreakdown || [];
    if (breakdown.length === 0) {
      return (
        <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex items-center justify-center text-slate-500 text-sm h-[380px]">
          No expense categories recorded in range
        </div>
      );
    }

    const categoryColors = {
      'EB Bill': '#f59e0b',
      'Rent': '#ef4444',
      'Trainer Salary': '#3b82f6',
      'Cleaning & Maintenance': '#10b981',
      'Equipment Purchase': '#8b5cf6',
      'Water Bill': '#06b6d4',
      'Internet Bill': '#ec4899',
      'Staff Salary': '#6366f1',
      'Marketing': '#f43f5e',
      'Miscellaneous': '#64748b'
    };

    const getColor = (catName) => categoryColors[catName] || '#475569';

    const circ = 314.16;
    let accumulated = 0;

    return (
      <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-[380px]">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" />
            <span>Category Spending Breakdown</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Overheads percentage contribution</p>
        </div>

        <div className="flex items-center gap-4 py-2 mt-2">
          {/* Doughnut SVG */}
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 120 120" className="-rotate-90 w-full h-full overflow-visible">
              {breakdown.map((item, i) => {
                const strokeLength = (item.percentage / 100) * circ;
                const strokeOffset = circ - (accumulated / 100) * circ;
                accumulated += item.percentage;
                return (
                  <circle
                    key={i}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="transparent"
                    stroke={getColor(item.category)}
                    strokeWidth="11"
                    strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                    strokeDashoffset={strokeOffset}
                    className="transition-all duration-300 hover:stroke-[13] cursor-pointer"
                    title={`${item.category}: ${item.percentage}%`}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Total</span>
              <strong className="text-[11px] font-black text-white mt-0.5">
                ₹{breakdown.reduce((sum, item) => sum + parseFloat(item.total), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </strong>
            </div>
          </div>

          {/* Color legends */}
          <div className="flex-1 overflow-y-auto max-h-48 pr-1 space-y-1.5 custom-scrollbar text-[10px]">
            {breakdown.slice(0, 5).map((item, i) => (
              <div key={i} className="flex justify-between items-center py-0.5 border-b border-slate-900/30">
                <div className="flex items-center gap-1.5 truncate max-w-[100px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getColor(item.category) }}></span>
                  <span className="text-slate-300 font-semibold truncate" title={item.category}>{item.category}</span>
                </div>
                <strong className="text-slate-100 font-mono text-[9px] ml-1">{item.percentage}%</strong>
              </div>
            ))}
            {breakdown.length > 5 && (
              <div className="text-[9px] text-slate-500 italic text-center pt-1">
                + {breakdown.length - 5} more categories
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Gym Dashboard" />
      
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
        {/* Header Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">System Analytics</h2>
            <p className="text-slate-450 text-sm mt-1">Review active collections, attendance check-ins, and membership plans.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {/* Range Selector tabs */}
            <div className="flex bg-slate-950 border border-slate-800/80 rounded-xl p-1 shrink-0">
              {['daily', 'weekly', 'monthly'].map((t) => (
                <button
                  key={t}
                  onClick={() => setRange(t)}
                  className={`px-4.5 py-1.5 text-xs font-semibold rounded-lg transition capitalize cursor-pointer ${
                    range === t 
                      ? 'gradient-btn text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
              title="Export report to Excel"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition"
              title="Export report to PDF"
            >
              <FileText size={14} className="text-indigo-400" />
              <span>Export PDF</span>
            </button>

            <button 
              onClick={handleManualRefresh}
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              title="Refresh Stats"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-6">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="glass-panel border border-slate-800/80 p-6 rounded-3xl shadow-xl flex items-start justify-between min-w-0">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{card.title}</span>
                      <strong className="text-3xl font-extrabold text-white block mt-2">{card.value}</strong>
                      <span className="text-[10px] text-slate-500 font-medium block pt-1">{card.description}</span>
                    </div>
                    <div className={`p-3.5 border rounded-2xl ${card.color}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Cash Flow Cards (Admin Only) */}
            {isUserAdmin && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-4">Daily & Monthly Cash Flow</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  {/* Today's Collection */}
                  <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-start justify-between min-w-0">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Collection</span>
                      <strong className="text-2xl font-black text-emerald-400 block mt-2">₹{(metrics.todayCollections || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="p-2.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <DollarSign size={16} />
                    </div>
                  </div>

                  {/* Today's Expenses */}
                  <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-start justify-between min-w-0">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Expenses</span>
                      <strong className="text-2xl font-black text-rose-450 block mt-2">₹{(metrics.todayExpenses || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="p-2.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-xl">
                      <Wallet size={16} />
                    </div>
                  </div>

                  {/* Monthly Revenue */}
                  <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-start justify-between min-w-0">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Revenue</span>
                      <strong className="text-2xl font-black text-teal-400 block mt-2">₹{(metrics.monthlyRevenue || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="p-2.5 border border-teal-500/20 bg-teal-500/10 text-teal-400 rounded-xl">
                      <DollarSign size={16} />
                    </div>
                  </div>

                  {/* Monthly Expenses */}
                  <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-start justify-between min-w-0">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Expenses</span>
                      <strong className="text-2xl font-black text-amber-450 block mt-2">₹{(metrics.monthlyExpenses || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="p-2.5 border border-amber-500/20 bg-amber-500/10 text-amber-400 rounded-xl">
                      <Wallet size={16} />
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-start justify-between min-w-0">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Profit</span>
                      <strong className={`text-2xl font-black block mt-2 ${((metrics.monthlyRevenue || 0) - (metrics.monthlyExpenses || 0)) >= 0 ? 'text-emerald-450' : 'text-rose-450'}`}>
                        ₹{((metrics.monthlyRevenue || 0) - (metrics.monthlyExpenses || 0)).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className={`p-2.5 border rounded-xl ${((metrics.monthlyRevenue || 0) - (metrics.monthlyExpenses || 0)) >= 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-450' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
                      <TrendingUp size={16} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trend Chart & Bottom Widgets */}
            <div className="space-y-6">
              {/* Chart (Full Width) */}
              <div className="w-full">
                {renderTrendChart()}
              </div>

              {/* Profitability Charts (Admin Only) */}
              {isUserAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {renderRevenueVsExpenseChart()}
                  </div>
                  <div>
                    {renderExpenseCategoryBreakdown()}
                  </div>
                </div>
              )}

              {/* Bottom Widgets Grid */}
              <div className={`grid grid-cols-1 md:grid-cols-2 ${isUserAdmin ? 'lg:grid-cols-3' : ''} gap-6`}>
                {renderMiniRevenueChart()}

                {/* Birthdays Tabbed Widget */}
                <div className="glass-panel border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col justify-between h-[380px]">
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-850">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Gift size={15} className="text-pink-400" />
                          <span>Birthdays</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Member celebrations</p>
                      </div>
                      
                      {/* Tabs */}
                      <div className="flex bg-slate-950 border border-slate-850 rounded-lg p-0.5">
                        <button
                          onClick={() => setBirthdayTab('today')}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition cursor-pointer relative ${
                            birthdayTab === 'today'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          Today
                          {notifications.birthdaysToday.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[8px] px-1 rounded-full font-bold">
                              {notifications.birthdaysToday.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setBirthdayTab('upcoming')}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition cursor-pointer relative ${
                            birthdayTab === 'upcoming'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          Upcoming
                          {notifications.birthdaysUpcoming.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[8px] px-1 rounded-full font-bold">
                              {notifications.birthdaysUpcoming.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="overflow-y-auto h-52 pr-1 space-y-2.5">
                      {birthdayTab === 'today' ? (
                        notifications.birthdaysToday.length === 0 ? (
                          <div className="py-12 text-center text-slate-500 text-xs italic">
                            No birthdays today
                          </div>
                        ) : (
                          notifications.birthdaysToday.map((m) => (
                            <div key={m.id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 hover:bg-slate-900/30 transition">
                              <div className="flex items-center gap-2.5 min-w-0">
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
                                <div className="min-w-0 flex-1">
                                  <strong 
                                    onClick={() => navigate(`/members/${m.id}`)}
                                    className="text-xs font-bold text-slate-200 hover:text-indigo-400 cursor-pointer block transition truncate"
                                  >
                                    {m.name}
                                  </strong>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{m.currentAge} years old</span>
                                </div>
                              </div>
                              
                              <div className="flex gap-1 shrink-0 ml-2">
                                <button
                                  onClick={() => navigate(`/members/${m.id}`)}
                                  className="p-1.5 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                                  title="View Profile"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setWhatsappMember(m);
                                    setWhatsappTemplate('birthday');
                                    setIsWhatsAppModalOpen(true);
                                  }}
                                  disabled={!m.phone}
                                  className={`p-1.5 border border-transparent rounded-lg transition cursor-pointer ${
                                    m.phone
                                      ? 'text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                      : 'text-slate-600 opacity-40 cursor-not-allowed'
                                  }`}
                                  title={m.phone ? "Send Birthday Wish" : "No phone number available"}
                                >
                                  <WhatsAppIcon size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )
                      ) : (
                        notifications.birthdaysUpcoming.length === 0 ? (
                          <div className="py-12 text-center text-slate-500 text-xs italic">
                            No upcoming birthdays
                          </div>
                        ) : (
                          notifications.birthdaysUpcoming.map((m) => (
                            <div key={m.id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 hover:bg-slate-900/30 transition">
                              <div className="flex items-center gap-2.5 min-w-0">
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
                                <div className="min-w-0 flex-1">
                                  <strong 
                                    onClick={() => navigate(`/members/${m.id}`)}
                                    className="text-xs font-bold text-slate-200 hover:text-indigo-400 cursor-pointer block transition truncate"
                                  >
                                    {m.name}
                                  </strong>
                                  <span className="text-[10px] text-slate-450 block mt-0.5 truncate">
                                    Bday: {m.birthdayFormatted} (Turns {m.turningAge})
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex gap-1 shrink-0 ml-2">
                                <button
                                  onClick={() => navigate(`/members/${m.id}`)}
                                  className="p-1.5 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                                  title="View Profile"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setWhatsappMember(m);
                                    setWhatsappTemplate('birthday');
                                    setIsWhatsAppModalOpen(true);
                                  }}
                                  disabled={!m.phone}
                                  className={`p-1.5 border border-transparent rounded-lg transition cursor-pointer ${
                                    m.phone
                                      ? 'text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                      : 'text-slate-600 opacity-40 cursor-not-allowed'
                                  }`}
                                  title={m.phone ? "Send Birthday Wish" : "No phone number available"}
                                >
                                  <WhatsAppIcon size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Upcoming Expiries Sidebar Widget */}
                <div className="glass-panel border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col justify-between h-[380px]">
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-850">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <AlertTriangle size={15} className="text-amber-400" />
                          <span>Upcoming Expiries</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Members expiring soon</p>
                      </div>
                      <Link 
                        to="/renewals" 
                        className="flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                      >
                        <span>Renewals</span>
                        <ArrowRight size={10} />
                      </Link>
                    </div>

                    <div className="overflow-y-auto h-36 pr-1 space-y-2.5">
                      {analytics.lists.expiringList.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-xs italic">
                          No memberships expiring soon
                        </div>
                      ) : (
                        analytics.lists.expiringList.slice(0, 5).map((m) => {
                          const exp = new Date(m.expiry_date);
                          const todayVal = new Date();
                          todayVal.setHours(0,0,0,0);
                          exp.setHours(0,0,0,0);
                          const diffDays = Math.ceil((exp - todayVal) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <div key={m.id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 hover:bg-slate-900/30 transition">
                              <div className="min-w-0 flex-1">
                                <strong 
                                  onClick={() => navigate(`/members/${m.id}`)}
                                  className="text-xs font-bold text-slate-200 hover:text-indigo-400 cursor-pointer block transition truncate"
                                >
                                  {m.name}
                                </strong>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-500 block">Expires: {m.expiry_date}</span>
                                  <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold font-mono ${
                                    diffDays <= 1 
                                      ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                  }`}>
                                    {diffDays < 0 
                                      ? `expired` 
                                      : diffDays === 0 
                                        ? "today" 
                                        : diffDays === 1 
                                          ? "tomorrow" 
                                          : `${diffDays}d`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0 ml-2">
                                <button
                                  onClick={() => navigate(`/members/${m.id}`)}
                                  className="p-1 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                                  title="View Member Profile"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    setWhatsappMember(m);
                                    setWhatsappTemplate('membership');
                                    setIsWhatsAppModalOpen(true);
                                  }}
                                  disabled={!m.phone}
                                  className={`p-1 border border-transparent rounded-lg transition cursor-pointer ${
                                    m.phone
                                      ? 'text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                      : 'text-slate-600 opacity-40 cursor-not-allowed'
                                  }`}
                                  title={m.phone ? "Send Membership Reminder" : "No phone number available"}
                                >
                                  <WhatsAppIcon size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-850 mt-2">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-slate-350">
                      <button 
                        onClick={() => navigate('/members')} 
                        className="py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 rounded-xl transition cursor-pointer"
                      >
                        New Member
                      </button>
                      <button 
                        onClick={() => navigate('/payments')} 
                        className="py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 rounded-xl transition cursor-pointer"
                      >
                        Record Pay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Modal */}
            {isWhatsAppModalOpen && (
              <WhatsAppModal
                isOpen={isWhatsAppModalOpen}
                onClose={() => {
                  setIsWhatsAppModalOpen(false);
                  setWhatsappMember(null);
                }}
                member={whatsappMember}
                defaultTemplate={whatsappTemplate}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
