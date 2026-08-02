import React, { useState, useEffect } from 'react';
import { FileText, Save, Clock, ChevronDown, Check, Trash2, Edit, AlertCircle, Copy, Search, RefreshCw, Plus } from 'lucide-react';
import ptApi from '../api/pt.api';

export default function DietPlanEditor({ clientId, userRole }) {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Templates
  const [templates, setTemplates] = useState([]);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showTemplateCreateModal, setShowTemplateCreateModal] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({ title: '', category: 'Weight Loss' });
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewingHistoryItem, setViewingHistoryItem] = useState(null);

  const canEdit = userRole === 'admin' || userRole === 'trainer';

  // Categories
  const categories = [
    'Weight Loss',
    'Muscle Gain',
    'Fat Loss',
    'Maintenance',
    'Contest Prep',
    'Senior Citizen',
    'Beginner'
  ];

  const fetchDietPlan = async () => {
    try {
      setLoading(true);
      const res = await ptApi.getDietPlan(clientId);
      if (res.success && res.data) {
        setCurrentPlan(res.data);
        setTitle(res.data.title || '');
        setContent(res.data.content || '');
      } else {
        setCurrentPlan(null);
        setTitle('');
        setContent('');
      }
    } catch (err) {
      console.error('Error fetching diet plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      // Fetch templates (admin/trainer gets all, else only active)
      const res = await ptApi.getTemplates(canEdit);
      if (res.success) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await ptApi.getDietPlanHistory(clientId);
      if (res.success) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error('Error fetching diet history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchDietPlan();
      fetchTemplates();
    }
  }, [clientId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!content || !content.trim()) {
      setError('Diet plan content cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');
      const res = await ptApi.saveDietPlan(clientId, { title, content });
      if (res.success) {
        setCurrentPlan(res.data);
        setSuccessMsg('Diet plan saved successfully.');
        setIsEditing(false);
        // Refresh history if history is open
        if (showHistory) {
          fetchHistory();
        }
      }
    } catch (err) {
      console.error('Error saving diet plan:', err);
      setError(err.response?.data?.message || 'Failed to save diet plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = (tpl) => {
    setTitle(tpl.title);
    setContent(tpl.content);
    setShowTemplatesDropdown(false);
    setIsEditing(true);
    setSuccessMsg(`Loaded template: "${tpl.title}"`);
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (creatingTemplate) return;
    if (!newTemplateForm.title.trim()) return;
    if (!content.trim()) {
      setError('Cannot create template from empty content.');
      setShowTemplateCreateModal(false);
      return;
    }

    setCreatingTemplate(true);
    try {
      setError('');
      setSuccessMsg('');
      const res = await ptApi.createTemplate({
        title: newTemplateForm.title,
        content: content,
        category: newTemplateForm.category
      });
      if (res.success) {
        setSuccessMsg(`Template "${newTemplateForm.title}" created successfully.`);
        setNewTemplateForm({ title: '', category: 'Weight Loss' });
        setShowTemplateCreateModal(false);
        fetchTemplates();
      }
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template.');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleToggleTemplate = async (templateId, currentActive) => {
    try {
      const res = await ptApi.toggleTemplate(templateId, !currentActive);
      if (res.success) {
        fetchTemplates();
      }
    } catch (err) {
      console.error('Error toggling template:', err);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(templateSearch.toLowerCase()) || 
                          t.category.toLowerCase().includes(templateSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={14} />
          <span>Diet Plan Management</span>
        </h4>
        
        {/* Toggle History operations */}
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchHistory();
          }}
          className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
        >
          <Clock size={12} />
          <span>{showHistory ? 'Hide History' : 'View History'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* History Version Timeline Panel */}
      {showHistory && (
        <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Diet Plan Revision History</span>
          {historyLoading ? (
            <div className="py-6 flex justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No revision history found.</p>
          ) : (
            <div className="divide-y divide-slate-850 max-h-[180px] overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-slate-200 block break-words max-w-[200px]">{item.diet_title || 'Untitled Diet Plan'}</strong>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Saved by {item.creator_name || 'System'} on {new Date(item.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingHistoryItem(item)}
                      className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-[10px] transition cursor-pointer"
                    >
                      View
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setTitle(item.diet_title || '');
                          setContent(item.diet_content || '');
                          setIsEditing(true);
                          setSuccessMsg(`Restored version from ${new Date(item.created_at).toLocaleDateString()}`);
                        }}
                        className="px-2 py-1 bg-indigo-650/20 hover:bg-indigo-650/30 text-indigo-400 rounded-lg text-[10px] transition cursor-pointer"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Load Template and Editing actions (Admins/Trainers only) */}
      {canEdit && (
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="relative">
            <button
              onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Load Template</span>
              <ChevronDown size={13} />
            </button>

            {showTemplatesDropdown && (
              <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-20 space-y-2">
                <div className="flex gap-1.5 items-center">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-1.5 pl-7 pr-3 text-[11px] text-slate-300 focus:outline-none"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl py-1.5 px-2 text-[10px] text-slate-400 focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
                  {filteredTemplates.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic py-2 text-center">No active templates found.</p>
                  ) : (
                    filteredTemplates.map(tpl => (
                      <div key={tpl.id} className="p-2 hover:bg-slate-950/60 rounded-xl group/tpl flex justify-between items-start cursor-pointer transition">
                        <div onClick={() => handleLoadTemplate(tpl)} className="flex-1">
                          <div className="flex justify-between items-baseline">
                            <strong className="text-[11px] text-slate-200">{tpl.title}</strong>
                            <span className="text-[8px] uppercase tracking-wider font-bold text-indigo-400 px-1 bg-indigo-500/10 rounded">{tpl.category}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{tpl.content}</p>
                        </div>
                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTemplate(tpl.id, tpl.is_active);
                            }}
                            className={`p-1 rounded-lg ml-2 transition ${
                              tpl.is_active 
                                ? 'text-rose-450 hover:bg-rose-500/10' 
                                : 'text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title={tpl.is_active ? 'Deactivate (Soft Delete)' : 'Reactivate'}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Edit size={13} />
                <span>{currentPlan ? 'Edit Diet Plan' : 'Create Diet Plan'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowTemplateCreateModal(true)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  disabled={!content.trim()}
                >
                  <Copy size={13} />
                  <span>Save as Template</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    if (currentPlan) {
                      setTitle(currentPlan.title || '');
                      setContent(currentPlan.content || '');
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Editor Card */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500"></div>
        </div>
      ) : isEditing && canEdit ? (
        <form onSubmit={handleSave} className="space-y-3 bg-slate-950/20 p-4 border border-slate-850 rounded-2xl">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Diet Plan Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Fat Loss Diet Plan - Summer 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-input px-3.5 py-2 text-xs rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Diet Instructions *</label>
            <textarea
              required
              rows={8}
              placeholder="Breakfast:
- 4 Egg Whites
- 50g Oats

Lunch:
- 150g Chicken Breast
- 100g Rice"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full glass-input px-3.5 py-2 text-xs rounded-xl font-mono leading-relaxed focus:outline-none"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <Save size={13} />
              <span>{saving ? 'Saving...' : 'Save Diet Plan'}</span>
            </button>
          </div>
        </form>
      ) : currentPlan ? (
        <div className="p-5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-4">
          <div className="flex justify-between items-start border-b border-slate-850 pb-3">
            <div>
              <h5 className="font-extrabold text-slate-200 text-sm leading-none">{currentPlan.title || 'PT Client Diet Plan'}</h5>
              <span className="text-[10px] text-slate-500 mt-1.5 block">
                Last updated on {new Date(currentPlan.updated_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            {currentPlan.creator_name && (
              <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                By {currentPlan.creator_name}
              </span>
            )}
          </div>
          
          {/* Display instructions with multiline breaks preserved */}
          <div className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
            {currentPlan.content}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-950/20 border border-dashed border-slate-850 rounded-2xl space-y-2">
          <p className="text-slate-500 text-xs italic">No diet plan has been assigned to this client yet.</p>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer mt-2"
            >
              <Plus size={13} />
              <span>Create Plan Now</span>
            </button>
          )}
        </div>
      )}

      {/* POPUP MODAL: View History Revision Detail */}
      {viewingHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-sm">{viewingHistoryItem.diet_title || 'Revision Diet Plan'}</h3>
                <span className="text-[9px] text-slate-500 block mt-1">
                  Saved on {new Date(viewingHistoryItem.created_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setViewingHistoryItem(null)}
                className="px-2.5 py-1 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-400 hover:text-white transition text-[10px] cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-3 bg-slate-950/50 border border-slate-850 rounded-2xl text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {viewingHistoryItem.diet_content}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Save Draft as New Template */}
      {showTemplateCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateTemplate} className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-white text-sm">Save as Diet Plan Template</h3>
            
            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">Template Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Keto Plan for Muscle Gain"
                value={newTemplateForm.title}
                onChange={(e) => setNewTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">Category *</label>
              <select
                value={newTemplateForm.category}
                onChange={(e) => setNewTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowTemplateCreateModal(false)}
                className="px-3.5 py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Create Template
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
