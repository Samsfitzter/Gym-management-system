import React, { useState, useEffect } from 'react';
import { Weight, Plus, Calendar, User, TrendingDown, ArrowRight, Edit, Check, X } from 'lucide-react';
import ptApi from '../api/pt.api';

export default function WeightHistory({ clientId, userRole, targetWeight, onWeightUpdated }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(targetWeight || '');
  const [updatingTarget, setUpdatingTarget] = useState(false);
  const [error, setError] = useState('');

  // Sync prop changes to state
  useEffect(() => {
    setTargetInput(targetWeight || '');
  }, [targetWeight]);

  const handleTargetSubmit = async (e) => {
    e.preventDefault();
    if (!targetInput || isNaN(targetInput) || parseFloat(targetInput) <= 0) {
      return;
    }
    try {
      setUpdatingTarget(true);
      setError('');
      const res = await ptApi.updateTargetWeight(clientId, { target_weight: parseFloat(targetInput) });
      if (res.success) {
        setIsEditingTarget(false);
        if (onWeightUpdated) {
          onWeightUpdated();
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update target weight.');
    } finally {
      setUpdatingTarget(false);
    }
  };

  const canEdit = userRole === 'admin' || userRole === 'trainer';

  const fetchWeightHistory = async () => {
    try {
      setLoading(true);
      const res = await ptApi.getWeightHistory(clientId);
      if (res.success) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error('Error fetching weight history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchWeightHistory();
    }
  }, [clientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!weightInput || isNaN(weightInput) || parseFloat(weightInput) <= 0) {
      setError('Please enter a valid weight.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await ptApi.recordWeight(clientId, { weight: parseFloat(weightInput) });
      if (res.success) {
        setWeightInput('');
        await fetchWeightHistory();
        if (onWeightUpdated) {
          onWeightUpdated();
        }
      }
    } catch (err) {
      console.error('Error recording weight:', err);
      setError(err.response?.data?.message || 'Failed to record weight.');
    } finally {
      setSubmitting(false);
    }
  };

  const [weightInput, setWeightInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculations
  const startingWeight = history.length > 0 ? parseFloat(history[history.length - 1].weight) : null;
  const currentWeight = history.length > 0 ? parseFloat(history[0].weight) : null;
  
  const getWeightDiff = () => {
    if (startingWeight === null || currentWeight === null) return null;
    const diff = currentWeight - startingWeight;
    return diff;
  };

  const getTargetDiff = () => {
    if (currentWeight === null || !targetWeight) return null;
    return targetWeight - currentWeight;
  };

  const weightDiff = getWeightDiff();
  const targetDiff = getTargetDiff();

  // SVG Chart Renderer
  const renderChart = () => {
    if (history.length < 1) {
      return <div className="text-center py-8 text-slate-500 text-xs italic">No weight logs found yet. Log weight to track progress.</div>;
    }

    // Sort ascending for chart plotting
    const chartData = [...history].reverse();

    const width = 500;
    const height = 160;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const weights = chartData.map(h => parseFloat(h.weight));
    const allVals = targetWeight ? [...weights, parseFloat(targetWeight)] : weights;
    const minW = Math.min(...allVals) - 2;
    const maxW = Math.max(...allVals) + 2;
    const diff = maxW - minW || 1;

    const points = chartData.map((h, i) => {
      const x = paddingLeft + (i / (chartData.length - 1 || 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((parseFloat(h.weight) - minW) / diff) * chartHeight;
      return { x, y, weight: h.weight, date: h.recorded_at };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    const targetY = targetWeight ? paddingTop + chartHeight - ((parseFloat(targetWeight) - minW) / diff) * chartHeight : null;

    return (
      <div className="w-full bg-slate-950/40 border border-slate-850 rounded-2xl p-4 overflow-x-auto">
        <div className="min-w-[500px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {/* Target line */}
            {targetY !== null && (
              <>
                <line x1={paddingLeft} y1={targetY} x2={width - paddingRight} y2={targetY} stroke="#eab308" strokeWidth="1" strokeDasharray="3,3" />
                <text x={width - paddingRight} y={targetY - 4} textAnchor="end" fill="#eab308" fontSize="8" fontWeight="bold">Target ({targetWeight}kg)</text>
              </>
            )}

            {/* Line path */}
            {points.length > 1 && (
              <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            )}

            {/* Points */}
            {points.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="3.5" fill="#6366f1" stroke="#0f172a" strokeWidth="1.5" />
                <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#f8fafc" fontSize="8" fontWeight="bold">{p.weight}</text>
                <text x={p.x} y={height - 5} textAnchor="middle" fill="#64748b" fontSize="7">
                  {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
        <Weight size={14} />
        <span>Weight Progress Tracking</span>
      </h4>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl text-center">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Starting Weight</span>
          <strong className="text-base font-extrabold text-slate-200 mt-1 block font-mono">
            {startingWeight !== null ? `${startingWeight} kg` : '-'}
          </strong>
        </div>
        <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl text-center">
          <span className="text-[9px] uppercase font-bold text-indigo-400 block">Current Weight</span>
          <strong className="text-base font-extrabold text-indigo-300 mt-1 block font-mono">
            {currentWeight !== null ? `${currentWeight} kg` : '-'}
          </strong>
        </div>
        <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl text-center relative group">
          <span className="text-[9px] uppercase font-bold text-amber-500 block">Target Weight</span>
          {isEditingTarget ? (
            <form onSubmit={handleTargetSubmit} className="flex items-center justify-center gap-1 mt-1">
              <input
                type="number"
                step="0.1"
                required
                className="w-16 bg-slate-900 border border-indigo-500 rounded px-1 py-0.5 text-xs text-center text-white font-mono focus:outline-none"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                autoFocus
              />
              <button type="submit" disabled={updatingTarget} className="text-emerald-400 hover:text-emerald-350 cursor-pointer p-0.5">
                <Check size={12} />
              </button>
              <button type="button" onClick={() => setIsEditingTarget(false)} className="text-slate-400 hover:text-white cursor-pointer p-0.5">
                <X size={12} />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <strong className="text-base font-extrabold text-amber-400 font-mono">
                {targetWeight ? `${targetWeight} kg` : '-'}
              </strong>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditingTarget(true)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition cursor-pointer p-0.5"
                  title="Edit Target Weight"
                >
                  <Edit size={10} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl text-center">
          <span className="text-[9px] uppercase font-bold text-emerald-500 block">Weight Change</span>
          <strong className={`text-base font-extrabold mt-1 block font-mono ${weightDiff > 0 ? 'text-rose-450' : 'text-emerald-400'}`}>
            {weightDiff !== null ? `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(1)} kg` : '-'}
          </strong>
        </div>
      </div>

      {/* Weight History Graph */}
      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        renderChart()
      )}

      {/* Record weight form */}
      {canEdit && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              step="0.1"
              required
              placeholder="Log current weight (kg)..."
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full glass-input px-3.5 py-2 text-xs rounded-xl pr-8 font-mono"
            />
            <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-bold uppercase">kg</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
          >
            <Plus size={13} />
            <span>{submitting ? 'Saving...' : 'Log Weight'}</span>
          </button>
        </form>
      )}

      {error && <p className="text-red-400 text-[10px] font-bold mt-1">{error}</p>}

      {/* Weight List Table */}
      {!loading && history.length > 0 && (
        <div className="overflow-hidden border border-slate-850 rounded-2xl">
          <div className="max-h-[160px] overflow-y-auto">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-center">Weight</th>
                  <th className="py-2 px-3 text-right">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-2.5 px-3 font-mono flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar size={10} />
                      {new Date(row.recorded_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-100 text-[11px] font-mono">
                      {row.weight} kg
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 text-[11px] flex items-center justify-end gap-1">
                      <User size={10} />
                      {row.recorder_name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
