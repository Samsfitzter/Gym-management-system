import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import ptApi from '../api/pt.api.js';
import membersApi from '../api/members.api.js';
import { getTodayDateString, formatLocalDate } from '../utils/formatHelpers.js';
import WeightHistory from '../components/WeightHistory';
import DietPlanEditor from '../components/DietPlanEditor';
import ImageGallery from '../components/ImageGallery';
import {
  Users,
  Dumbbell,
  Plus,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Edit2,
  RefreshCw,
  FileText,
  Upload,
  Camera,
  Weight,
  Clock,
  Settings,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Lock
} from 'lucide-react';

export const PT = () => {
  const { user, isAdmin } = useAuth();

  // Tabs: 'dashboard', 'plans'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data states
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    expiredClients: 0,
    renewalsDue: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    trainerWise: [],
    goalWise: []
  });
  const [clientsData, setClientsData] = useState({ total: 0, clients: [] });
  const [plans, setPlans] = useState([]);
  const [activePlans, setActivePlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]); // All gym members for dropdown

  // Loading & UI states
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Details drawer states
  const [selectedClient, setSelectedClient] = useState(null);
  const [progressHistory, setProgressHistory] = useState([]);
  const [clientImages, setClientImages] = useState([]);
  const [clientNotes, setClientNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  // Client forms
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  
  // Trainer Management states
  const [allTrainers, setAllTrainers] = useState([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [trainerStatusFilter, setTrainerStatusFilter] = useState('all');
  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState(false);
  const [trainerForm, setTrainerForm] = useState({
    id: '',
    name: '',
    phone: '',
    specialization: '',
    status: 'active'
  });

  // Form values
  const [enrollForm, setEnrollForm] = useState({
    member_id: '',
    trainer_id: '',
    pt_plan_id: '',
    goal: 'Weight Loss',
    target_weight: '',
    start_date: getTodayDateString(),
    expiry_date: '',
    monthly_fee: '',
    status: 'Active'
  });

  const [editForm, setEditForm] = useState({
    id: '',
    trainer_id: '',
    pt_plan_id: '',
    goal: '',
    target_weight: '',
    start_date: '',
    expiry_date: '',
    monthly_fee: '',
    status: ''
  });

  const [renewForm, setRenewForm] = useState({
    id: '',
    client_name: '',
    new_expiry_date: '',
    renewed_amount: ''
  });

  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    monthly_fee: '',
    description: '',
    status: 'active'
  });

  const [progressForm, setProgressForm] = useState({
    weight: '',
    target_weight: '',
    notes: ''
  });

  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Filtering & Search
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    trainer_id: '',
    goal: '',
    limit: 8,
    page: 1
  });

  const fileInputRef = useRef(null);
  const [uploadImageType, setUploadImageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial core data
  useEffect(() => {
    fetchStats();
    fetchPlans();
    fetchActivePlans();
    fetchTrainers();
    fetchMembers();
    fetchAllTrainers();
  }, []);

  // Fetch clients on filter change
  useEffect(() => {
    fetchClients();
  }, [filters]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await ptApi.getDashboard();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const res = await ptApi.getPlans({ showDeleted: false });
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchActivePlans = async () => {
    try {
      const res = await ptApi.getActivePlans();
      if (res.success && res.data) {
        setActivePlans(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await ptApi.getTrainers();
      if (res.success && res.data) {
        setTrainers(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllTrainers = async () => {
    try {
      setTrainersLoading(true);
      const res = await ptApi.listAllTrainers();
      if (res.success && res.data) {
        setAllTrainers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTrainersLoading(false);
    }
  };

  const PHONE_REGEX = /^[6-9]\d{9}$/;

  const handleTrainerSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!trainerForm.name.trim()) {
      showToast('Trainer name is required', 'error');
      return;
    }
    if (!trainerForm.phone || !trainerForm.phone.trim()) {
      showToast('Trainer phone number is required', 'error');
      return;
    }
    if (trainerForm.phone && !PHONE_REGEX.test(trainerForm.phone.trim())) {
      showToast('Enter a valid 10-digit Indian mobile number (starts with 6-9)', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      let res;
      if (trainerForm.id) {
        res = await ptApi.updateTrainer(trainerForm.id, trainerForm);
      } else {
        res = await ptApi.createTrainer(trainerForm);
      }
      if (res.success) {
        showToast(trainerForm.id ? 'Trainer updated successfully' : 'Trainer created successfully');
        fetchTrainers();
        fetchAllTrainers();
        setIsTrainerModalOpen(false);
      }
    } catch (err) {
      showToast(err.message || 'Error saving trainer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTrainer = (trainer) => {
    setTrainerForm({
      id: trainer.id,
      name: trainer.name,
      phone: trainer.phone || '',
      specialization: trainer.specialization || '',
      status: trainer.status
    });
    setIsTrainerModalOpen(true);
  };

  const handleDeactivateTrainer = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this trainer? This will prevent new client assignments but preserve historical records.')) {
      try {
        const res = await ptApi.deactivateTrainer(id);
        if (res.success) {
          showToast('Trainer deactivated successfully');
          fetchTrainers();
          fetchAllTrainers();
        }
      } catch (err) {
        showToast(err.message || 'Deactivation failed', 'error');
      }
    }
  };

  const getEditTrainerOptions = () => {
    const isCurrentlyAssignedActive = trainers.some(t => t.id === parseInt(editForm.trainer_id));
    if (isCurrentlyAssignedActive || !editForm.trainer_id) {
      return trainers;
    }
    const inactiveTrainer = allTrainers.find(t => t.id === parseInt(editForm.trainer_id));
    if (inactiveTrainer) {
      return [...trainers, inactiveTrainer];
    }
    return trainers;
  };

  const fetchMembers = async () => {
    try {
      const res = await membersApi.getAll({ limit: 200, status: 'active' });
      if (res.success && res.data && res.data.rows) {
        setMembers(res.data.rows);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMemberSearch = async () => {
    if (!memberSearch.trim()) {
      fetchMembers();
      return;
    }
    try {
      setSearchingMembers(true);
      const res = await membersApi.getAll({ search: memberSearch, status: 'active', limit: 100 });
      if (res.success && res.data && res.data.rows) {
        setMembers(res.data.rows);
        if (res.data.rows.length === 1) {
          setEnrollForm(prev => ({ ...prev, member_id: res.data.rows[0].id }));
        }
      }
    } catch (err) {
      console.error('Error searching members:', err);
    } finally {
      setSearchingMembers(false);
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const offset = (filters.page - 1) * filters.limit;
      const params = {
        search: filters.search,
        status: filters.status,
        trainer_id: filters.trainer_id,
        goal: filters.goal,
        limit: filters.limit,
        offset
      };
      const res = await ptApi.getClients(params);
      if (res.success && res.data) {
        setClientsData(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading PT client directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Drawer client details loader
  const loadClientDetails = async (client) => {
    setSelectedClient(client);
    setNotesLoading(true);
    setProgressLoading(true);
    setImagesLoading(true);

    try {
      const progressRes = await ptApi.getProgress(client.id);
      if (progressRes.success) setProgressHistory(progressRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setProgressLoading(false);
    }

    try {
      const notesRes = await ptApi.getNotes(client.id);
      if (notesRes.success) setClientNotes(notesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setNotesLoading(false);
    }

    try {
      const imagesRes = await ptApi.getImages(client.id);
      if (imagesRes.success) setClientImages(imagesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setImagesLoading(false);
    }
  };

  // Plan actions
  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      let res;
      if (planForm.id) {
        res = await ptApi.updatePlan(planForm.id, planForm);
      } else {
        res = await ptApi.createPlan(planForm);
      }
      if (res.success) {
        showToast(planForm.id ? 'PT Plan updated' : 'PT Plan created');
        fetchPlans();
        fetchActivePlans();
        setIsPlanModalOpen(false);
      }
    } catch (err) {
      showToast(err.message || 'Error processing plan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPlan = (plan) => {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      monthly_fee: plan.monthly_fee,
      description: plan.description || '',
      status: plan.status
    });
    setIsPlanModalOpen(true);
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm('Are you sure you want to delete this PT plan?')) {
      try {
        const res = await ptApi.deletePlan(id);
        if (res.success) {
          showToast('PT Plan deleted successfully');
          fetchPlans();
          fetchActivePlans();
        }
      } catch (err) {
        showToast(err.message || 'Error deleting plan', 'error');
      }
    }
  };

  // Client Enrollment actions
  const handlePlanSelect = (planId, type) => {
    const selected = plans.find(p => p.id === parseInt(planId));
    if (selected) {
      if (type === 'enroll') {
        const start = new Date(enrollForm.start_date + 'T00:00:00');
        start.setMonth(start.getMonth() + 1);
        const expiry = formatLocalDate(start);
        setEnrollForm(prev => ({
          ...prev,
          pt_plan_id: planId,
          monthly_fee: selected.monthly_fee,
          expiry_date: expiry
        }));
      } else {
        setEditForm(prev => ({
          ...prev,
          pt_plan_id: planId,
          monthly_fee: selected.monthly_fee
        }));
      }
    }
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!enrollForm.member_id || !enrollForm.trainer_id || !enrollForm.pt_plan_id) {
      showToast('Please fill all required enrollment fields', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await ptApi.createClient(enrollForm);
      if (res.success) {
        showToast('PT Client enrolled successfully');
        fetchClients();
        fetchStats();
        setIsEnrollModalOpen(false);
        setEnrollForm({
          member_id: '',
          trainer_id: '',
          pt_plan_id: '',
          goal: 'Weight Loss',
          target_weight: '',
          start_date: getTodayDateString(),
          expiry_date: '',
          monthly_fee: '',
          status: 'Active'
        });
      }
    } catch (err) {
      showToast(err.message || 'Enrollment failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client Update actions
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await ptApi.updateClient(editForm.id, editForm);
      if (res.success) {
        showToast('Client PT details updated');
        fetchClients();
        fetchStats();
        setIsEditModalOpen(false);
        if (selectedClient && selectedClient.id === editForm.id) {
          const updatedDetails = await ptApi.getClientDetails(editForm.id);
          if (updatedDetails.success) {
            setSelectedClient(updatedDetails.data);
          }
        }
      }
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerEditModal = (client) => {
    setEditForm({
      id: client.id,
      trainer_id: client.trainer_id,
      pt_plan_id: client.pt_plan_id,
      goal: client.goal,
      target_weight: client.target_weight || '',
      start_date: client.start_date,
      expiry_date: client.expiry_date,
      monthly_fee: client.monthly_fee,
      status: client.status
    });
    setIsEditModalOpen(true);
  };

  // Client Renewal actions
  const triggerRenewModal = (client) => {
    const today = new Date();
    const expiry = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

    setRenewForm({
      id: client.id,
      client_name: client.client_name,
      new_expiry_date: formatLocalDate(expiry),
      renewed_amount: client.monthly_fee
    });
    setIsRenewModalOpen(true);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await ptApi.renewClient(renewForm.id, {
        new_expiry_date: renewForm.new_expiry_date,
        renewed_amount: renewForm.renewed_amount
      });
      if (res.success) {
        showToast('PT Plan renewed successfully');
        fetchClients();
        fetchStats();
        setIsRenewModalOpen(false);
        if (selectedClient && selectedClient.id === renewForm.id) {
          loadClientDetails(res.data);
        }
      }
    } catch (err) {
      showToast(err.message || 'Renewal failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDeleteClient = async (id) => {
    if (window.confirm('Are you sure you want to remove this member from Personal Training?')) {
      try {
        const res = await ptApi.deleteClient(id);
        if (res.success) {
          showToast('PT Client record cancelled/removed');
          fetchClients();
          fetchStats();
          setSelectedClient(null);
        }
      } catch (err) {
        showToast(err.message || 'Cancellation failed', 'error');
      }
    }
  };

  // Progress submission
  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!progressForm.weight) {
      showToast('Weight is required', 'error');
      return;
    }
    try {
      setProgressLoading(true);
      const target = progressForm.target_weight || (progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].target_weight : '');
      const res = await ptApi.addProgress(selectedClient.id, {
        weight: progressForm.weight,
        target_weight: target || 0,
        notes: progressForm.notes
      });
      if (res.success) {
        showToast('Weight progress recorded');
        setProgressForm({ weight: '', target_weight: '', notes: '' });
        // Refresh details
        const progressRes = await ptApi.getProgress(selectedClient.id);
        if (progressRes.success) setProgressHistory(progressRes.data);
      }
    } catch (err) {
      showToast(err.message || 'Progress tracking failed', 'error');
    } finally {
      setProgressLoading(false);
    }
  };

  // Note actions
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setNotesLoading(true);
      const res = await ptApi.addNote(selectedClient.id, { note: newNote });
      if (res.success) {
        showToast('Trainer note added');
        setNewNote('');
        const notesRes = await ptApi.getNotes(selectedClient.id);
        if (notesRes.success) setClientNotes(notesRes.data);
      }
    } catch (err) {
      showToast('Failed to add note', 'error');
    } finally {
      setNotesLoading(false);
    }
  };

  const handleEditNoteSubmit = async (e) => {
    e.preventDefault();
    if (!editingNoteText.trim()) return;
    try {
      setNotesLoading(true);
      const res = await ptApi.updateNote(selectedClient.id, editingNoteId, { note: editingNoteText });
      if (res.success) {
        showToast('Trainer note updated');
        setEditingNoteId(null);
        setEditingNoteText('');
        const notesRes = await ptApi.getNotes(selectedClient.id);
        if (notesRes.success) setClientNotes(notesRes.data);
      }
    } catch (err) {
      showToast('Failed to update note', 'error');
    } finally {
      setNotesLoading(false);
    }
  };

  // Transformation Photo actions
  const triggerImageUpload = (type) => {
    setUploadImageType(type);
    fileInputRef.current.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('image_type', uploadImageType);

    try {
      setImagesLoading(true);
      const res = await ptApi.uploadImage(selectedClient.id, formData);
      if (res.success) {
        showToast('Transformation photo uploaded');
        const imagesRes = await ptApi.getImages(selectedClient.id);
        if (imagesRes.success) setClientImages(imagesRes.data);
      }
    } catch (err) {
      showToast(err.message || 'Image upload failed', 'error');
    } finally {
      setImagesLoading(false);
    }
  };

  const getPTImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || ''}${url}`;
  };

  // Weight history calculation helpers
  const startingWeight = progressHistory.length > 0 ? progressHistory[0].weight : 0;
  const currentWeight = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].weight : 0;
  const targetWeight = selectedClient?.target_weight !== null && selectedClient?.target_weight !== undefined
    ? parseFloat(selectedClient.target_weight)
    : 0;

  // Build merged chronological history timeline
  const getTimelineEvents = () => {
    const events = [];

    // Base creation event
    if (selectedClient) {
      events.push({
        date: selectedClient.start_date,
        title: 'PT Enrollment Created',
        desc: `Enrolled in ${selectedClient.pt_plan_name || 'PT'} with goal: ${selectedClient.goal}. Fee: ₹${selectedClient.monthly_fee}`,
        icon: PlusCircle,
        color: 'text-indigo-400'
      });
    }

    // Weight progress events
    progressHistory.forEach(p => {
      events.push({
        date: p.recorded_at,
        title: 'Weight Logged',
        desc: `Recorded weight: ${p.weight} kg (Target: ${p.target_weight} kg). Notes: ${p.notes || '-'}`,
        icon: Weight,
        color: 'text-amber-400'
      });
    });

    // Notes events
    clientNotes.forEach(n => {
      events.push({
        date: n.created_at.split('T')[0],
        title: 'Trainer Note Added',
        desc: `"${n.note}" - by ${n.trainer_name}`,
        icon: FileText,
        color: 'text-teal-400'
      });
    });

    // Sort by date descending
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const isUserReceptionist = user?.role === 'receptionist';

  // Render SVG progress line chart
  const renderWeightChart = () => {
    if (progressHistory.length === 0) {
      return <div className="text-center py-6 text-slate-500 text-xs italic">No weight logs found. Log your weights to generate tracking charts.</div>;
    }

    const width = 500;
    const height = 150;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const weights = progressHistory.map(h => h.weight);
    const minW = Math.min(...weights, targetWeight) - 2;
    const maxW = Math.max(...weights, targetWeight) + 2;
    const diff = maxW - minW || 1;

    const points = progressHistory.map((h, i) => {
      const x = paddingLeft + (i / (progressHistory.length - 1 || 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((h.weight - minW) / diff) * chartHeight;
      return { x, y, weight: h.weight, date: h.recorded_at };
    });

    // Generate path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Target weight line
    const targetY = paddingTop + chartHeight - ((targetWeight - minW) / diff) * chartHeight;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible mt-2">
        {/* Horizontal grid guide */}
        <line x1={paddingLeft} y1={targetY} x2={width - paddingRight} y2={targetY} stroke="#eab308" strokeWidth="1" strokeDasharray="3,3" />
        <text x={width - paddingRight} y={targetY - 4} textAnchor="end" fill="#eab308" fontSize="8" fontWeight="bold">Target ({targetWeight}kg)</text>

        {/* Chart Line path */}
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="3" fill="#6366f1" stroke="#0f172a" strokeWidth="1" />
            <text x={p.x} y={p.y - 6} textAnchor="middle" fill="#cbd5e1" fontSize="8" fontWeight="bold">{p.weight}</text>
            <text x={p.x} y={height - 5} textAnchor="middle" fill="#64748b" fontSize="7">{p.date.split('-').slice(1).reverse().join('/')}</text>
          </g>
        ))}
      </svg>
    );
  };

  // Render SVG metrics visualizations
  const renderSimpleAnalytics = () => {
    if (isUserReceptionist) return null;

    const goalColors = {
      'Weight Loss': 'bg-rose-500',
      'Muscle Gain': 'bg-blue-500',
      'Strength Training': 'bg-amber-500',
      'General Fitness': 'bg-teal-500'
    };

    const getGoalColor = (goal) => goalColors[goal] || 'bg-slate-500';

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Trainer Client Load */}
        <div className="glass-panel min-w-0 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" />
            <span>Trainer Workload Distribution (Active PT Clients)</span>
          </h4>
          {stats.trainerWise.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-6 text-center">No workloads registered.</p>
          ) : (
            <div className="space-y-4">
              {stats.trainerWise.map((t, idx) => {
                const maxCount = Math.max(...stats.trainerWise.map(tr => parseInt(tr.client_count)), 1) || 1;
                const percentage = Math.min(100, Math.round((parseInt(t.client_count) / maxCount) * 100));
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300 break-words">{t.trainer_name}</span>
                      <span className="text-indigo-400 font-mono">{t.client_count} client(s)</span>
                    </div>
                    <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-slate-800/40">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Goal Distributions */}
        <div className="glass-panel min-w-0 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <span>Client Training Goals Distribution</span>
          </h4>
          {stats.goalWise.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-6 text-center">No goals logs registered.</p>
          ) : (
            <div className="space-y-4">
              {stats.goalWise.map((g, idx) => {
                const totalGoalCount = stats.goalWise.reduce((sum, item) => sum + parseInt(item.count), 0) || 1;
                const percentage = Math.round((parseInt(g.count) / totalGoalCount) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300 break-words">{g.goal}</span>
                      <span className="text-emerald-400 font-mono">{g.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-slate-800/40">
                      <div className={`h-full rounded-full transition-all duration-500 ${getGoalColor(g.goal)}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Personal Training Portal" />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">

        {/* Navigation Tabs bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/60 pb-4">
          <div className="flex flex-wrap gap-1.5 bg-slate-900/40 border border-slate-800/60 p-1 rounded-2xl backdrop-blur-md">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${activeTab === 'dashboard'
                  ? 'gradient-btn text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Dumbbell size={14} />
              <span>PT Dashboard</span>
            </button>

            {isAdmin() && (
              <>
                <button
                  onClick={() => setActiveTab('plans')}
                  className={`px-4.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${activeTab === 'plans'
                      ? 'gradient-btn text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Settings size={14} />
                  <span>PT Plans Directory</span>
                </button>
                <button
                  onClick={() => setActiveTab('trainers')}
                  className={`px-4.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${activeTab === 'trainers'
                      ? 'gradient-btn text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Users size={14} />
                  <span>Trainer Management</span>
                </button>
              </>
            )}
          </div>

          {activeTab === 'dashboard' && (
            <button
              onClick={() => {
                setMemberSearch('');
                fetchMembers();
                setIsEnrollModalOpen(true);
              }}
              className="w-full sm:w-auto px-4.5 py-2 text-xs font-bold text-white gradient-btn rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Enroll New PT Client</span>
            </button>
          )}

          {activeTab === 'plans' && (
            <button
              onClick={() => {
                setPlanForm({ id: '', name: '', monthly_fee: '', description: '', status: 'active' });
                setIsPlanModalOpen(true);
              }}
              className="w-full sm:w-auto px-4.5 py-2 text-xs font-bold text-white gradient-btn rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Create New PT Plan</span>
            </button>
          )}

          {activeTab === 'trainers' && (
            <button
              onClick={() => {
                setTrainerForm({ id: '', name: '', phone: '', specialization: '', status: 'active' });
                setIsTrainerModalOpen(true);
              }}
              className="w-full sm:w-auto px-4.5 py-2 text-xs font-bold text-white gradient-btn rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Add PT Trainer</span>
            </button>
          )}
        </div>

        {/* Tab 1: PT Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* KPI Cards section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Total Clients */}
              <div className="glass-panel min-w-0 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-md relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Total Clients</span>
                {statsLoading ? (
                  <div className="h-6 w-8 bg-slate-800 animate-pulse rounded"></div>
                ) : (
                  <strong className="text-2xl font-black text-white">{stats.totalClients}</strong>
                )}
                <span className="text-[9px] text-slate-500 font-medium">All-time enrols</span>
                <Users className="absolute -bottom-3 -right-3 text-indigo-500/10" size={54} />
              </div>

              {/* Active Clients */}
              <div className="glass-panel min-w-0 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-md relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Active Clients</span>
                {statsLoading ? (
                  <div className="h-6 w-8 bg-slate-800 animate-pulse rounded"></div>
                ) : (
                  <strong className="text-2xl font-black text-white">{stats.activeClients}</strong>
                )}
                <span className="text-[9px] text-slate-500 font-medium">Currently training</span>
                <Dumbbell className="absolute -bottom-3 -right-3 text-teal-500/10" size={54} />
              </div>

              {/* Expired Clients */}
              <div className="glass-panel min-w-0 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-md relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Expired Clients</span>
                {statsLoading ? (
                  <div className="h-6 w-8 bg-slate-800 animate-pulse rounded"></div>
                ) : (
                  <strong className="text-2xl font-black text-white">{stats.expiredClients}</strong>
                )}
                <span className="text-[9px] text-slate-500 font-medium">Pending renewal</span>
                <Clock className="absolute -bottom-3 -right-3 text-red-500/10" size={54} />
              </div>

              {/* Renewals Due */}
              <div className="glass-panel min-w-0 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-md relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Renewals Due</span>
                {statsLoading ? (
                  <div className="h-6 w-8 bg-slate-800 animate-pulse rounded"></div>
                ) : (
                  <strong className="text-2xl font-black text-white">{stats.renewalsDue}</strong>
                )}
                <span className="text-[9px] text-slate-500 font-medium">Expiring in 7 days</span>
                <Calendar className="absolute -bottom-3 -right-3 text-amber-500/10" size={54} />
              </div>

              {/* Overall Revenue */}
              <div className="glass-panel min-w-0 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-md relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Overall Revenue</span>
                {statsLoading ? (
                  <div className="h-6 w-8 bg-slate-800 animate-pulse rounded"></div>
                ) : isUserReceptionist ? (
                  <strong className="text-sm font-semibold text-slate-500 flex items-center gap-1"><Lock size={12} /> Masked</strong>
                ) : (
                  <strong className="text-lg font-black text-white">₹{stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                )}
                <span className="text-[9px] text-slate-500 font-medium">Total collections</span>
                <DollarSign className="absolute -bottom-3 -right-3 text-emerald-500/10" size={54} />
              </div>

              {/* Monthly Revenue */}
              <div className="glass-panel min-w-0 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-md relative overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Monthly Revenue</span>
                {statsLoading ? (
                  <div className="h-6 w-8 bg-slate-800 animate-pulse rounded"></div>
                ) : isUserReceptionist ? (
                  <strong className="text-sm font-semibold text-slate-500 flex items-center gap-1"><Lock size={12} /> Masked</strong>
                ) : (
                  <strong className="text-lg font-black text-white">₹{stats.monthlyRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                )}
                <span className="text-[9px] text-slate-500 font-medium">Current calendar month</span>
                <DollarSign className="absolute -bottom-3 -right-3 text-blue-500/10" size={54} />
              </div>
            </div>

            {/* Layout Priority: Main Client Management Table */}
            <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-5">

              {/* Header Filters & Searches */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-white">PT Directory Directory</h3>
                  <p className="text-xs text-slate-500">Track and filter active enrollments, details, and client goals.</p>
                </div>

                {/* Filter and Search Box inputs */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative shrink-0 w-full md:w-48">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                      type="text"
                      placeholder="Search Client..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                      className="w-full glass-input pl-10 pr-4 py-2 text-xs rounded-xl"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                    className="w-full sm:w-auto glass-input px-3.5 py-2 text-xs rounded-xl select-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {/* Trainer Filter */}
                  {!isUserReceptionist && (
                    <select
                      value={filters.trainer_id}
                      onChange={(e) => setFilters(prev => ({ ...prev, trainer_id: e.target.value, page: 1 }))}
                      className="w-full sm:w-auto glass-input px-3.5 py-2 text-xs rounded-xl"
                    >
                      <option value="">All Trainers</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Goal Filter */}
                  <select
                    value={filters.goal}
                    onChange={(e) => setFilters(prev => ({ ...prev, goal: e.target.value, page: 1 }))}
                    className="w-full sm:w-auto glass-input px-3.5 py-2 text-xs rounded-xl"
                  >
                    <option value="">All Goals</option>
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Muscle Gain">Muscle Gain</option>
                    <option value="General Fitness">General Fitness</option>
                    <option value="Strength Training">Strength Training</option>
                  </select>
                </div>
              </div>

              {/* Clients Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  </div>
                ) : clientsData.clients.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No PT Clients matching filters found. Create an enrollment to get started.
                  </div>
                ) : (
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 pr-4">Client Name</th>
                        <th className="pb-3 pr-4">Assigned Trainer</th>
                        <th className="pb-3 pr-4">Fitness Goal</th>
                        <th className="pb-3 pr-4">PT Plan</th>
                        <th className="pb-3 pr-4">Monthly Fee</th>
                        <th className="pb-3 pr-4">Start Date</th>
                        <th className="pb-3 pr-4">Expiry Date</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-sm">
                      {clientsData.clients.map((client) => (
                        <tr
                          key={client.id}
                          className="hover:bg-slate-900/30 transition-colors cursor-pointer group"
                          onClick={() => loadClientDetails(client)}
                        >
                          <td className="py-3.5 pr-4 font-bold text-slate-200 group-hover:text-indigo-400 transition-colors break-words max-w-[150px]">{client.client_name}</td>
                          <td className="py-3.5 pr-4 text-slate-400 font-semibold break-words max-w-[120px]">{client.trainer_name}</td>
                          <td className="py-3.5 pr-4 text-slate-300">
                            <span className="px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900/50 text-xs font-medium">
                              {client.goal}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-slate-400 font-semibold break-words max-w-[150px]">{client.pt_plan_name}</td>
                          <td className="py-3.5 pr-4 font-bold text-slate-200">₹{parseFloat(client.monthly_fee).toLocaleString('en-IN')}</td>
                          <td className="py-3.5 pr-4 text-slate-500 font-mono text-xs">{client.start_date}</td>
                          <td className="py-3.5 pr-4 text-slate-500 font-mono text-xs">{client.expiry_date}</td>
                          <td className="py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full border ${client.status === 'Active'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : client.status === 'Expired'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}>
                              {client.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => triggerEditModal(client)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                              title="Edit Client"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => triggerRenewModal(client)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                              title="Renew Plan"
                            >
                              <RefreshCw size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination controls */}
              {clientsData.total > filters.limit && (
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing {clientsData.clients.length}/{clientsData.total} clients (Page {filters.page} of {Math.ceil(clientsData.total / filters.limit)})
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={filters.page === 1}
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      disabled={filters.page >= Math.ceil(clientsData.total / filters.limit)}
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Analytics graphs */}
            {renderSimpleAnalytics()}
          </div>
        )}

        {/* Tab 2: PT Plans List (Admin only) */}
        {activeTab === 'plans' && isAdmin() && (
          <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-white">Active PT Packages</h3>
              <p className="text-xs text-slate-500">Create, edit, or deactivate packages available for enrollment.</p>
            </div>

            {plansLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map(p => (
                  <div key={p.id} className="glass-panel min-w-0 rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between h-[200px] relative overflow-hidden group hover:border-slate-750/65 transition-all duration-300 shadow-md">
                    {/* Decorative Background Icon */}
                    <div className="absolute -bottom-3 -right-3 text-slate-800/10 group-hover:text-indigo-500/10 transition-colors duration-300 pointer-events-none">
                      <Dumbbell size={88} />
                    </div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start">
                        <h4 className="text-base font-extrabold text-white">{p.name}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${p.status === 'active'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-550'
                          }`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-450 mt-2.5 line-clamp-3 leading-relaxed">{p.description || 'No description provided.'}</p>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-850/60 relative z-10">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Monthly Fee</span>
                        <strong className="text-base font-extrabold text-indigo-400 font-mono">₹{parseFloat(p.monthly_fee).toLocaleString('en-IN')}</strong>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditPlan(p)}
                          className="p-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                          title="Edit Plan"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p.id)}
                          className="p-2 border border-red-950/40 hover:border-red-900 bg-red-950/10 hover:bg-red-500/10 rounded-xl text-red-400 hover:text-red-300 transition cursor-pointer"
                          title="Delete Plan"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Tab 3: PT Trainers List (Admin only) */}
        {activeTab === 'trainers' && isAdmin() && (
          <div className="glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-white">Trainer Master Registry</h3>
                <p className="text-xs text-slate-500">Manage active and inactive trainers in your fitness center.</p>
              </div>

              {/* Status Filter for Trainers */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-semibold">Filter:</span>
                <select
                  value={trainerStatusFilter}
                  onChange={(e) => setTrainerStatusFilter(e.target.value)}
                  className="w-full sm:w-auto glass-input px-3.5 py-2 text-xs rounded-xl"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>
            </div>

            {trainersLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Trainer Name</th>
                      <th className="pb-3 pr-4">Phone Number</th>
                      <th className="pb-3 pr-4">Specialization</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50 text-sm">
                    {allTrainers
                      .filter(t => {
                        if (trainerStatusFilter === 'active') return t.status === 'active';
                        if (trainerStatusFilter === 'inactive') return t.status === 'inactive';
                        return true;
                      })
                      .map(trainer => (
                        <tr key={trainer.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 pr-4 font-bold text-slate-200 break-words max-w-[150px]">{trainer.name}</td>
                          <td className="py-3.5 pr-4 text-slate-400 font-mono text-xs">{trainer.phone || '-'}</td>
                          <td className="py-3.5 pr-4 text-slate-350 break-words max-w-[150px]">{trainer.specialization || 'General Training'}</td>
                          <td className="py-3.5 pr-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full border ${trainer.status === 'active'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}>
                              {trainer.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditTrainer(trainer)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                              title="Edit Trainer Details"
                            >
                              <Edit2 size={13} />
                            </button>
                            {trainer.status === 'active' && (
                              <button
                                onClick={() => handleDeactivateTrainer(trainer.id)}
                                className="p-1.5 text-slate-450 hover:text-red-400 hover:bg-slate-800/40 rounded-xl transition cursor-pointer"
                                title="Deactivate Trainer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* DETAILED CLIENT DRAWER VIEW */}
      {selectedClient && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end">
          <div
            className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-fade-in relative z-50 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900 flex flex-wrap gap-4 justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 shrink-0">
                  {selectedClient.client_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-none">{selectedClient.client_name}</h3>
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold font-mono mt-1 block">
                    {selectedClient.pt_plan_name} • {selectedClient.goal}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => triggerRenewModal(selectedClient)}
                  className="px-3.5 py-1.5 text-[11px] font-bold text-white gradient-btn rounded-xl shadow transition cursor-pointer"
                >
                  Renew PT
                </button>
                {isAdmin() && (
                  <button
                    onClick={() => handleSoftDeleteClient(selectedClient.id)}
                    className="p-2 border border-red-500/10 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 rounded-xl transition cursor-pointer"
                    title="Cancel Enrollment"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-2 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Drawer Content Body */}
            <div className="flex-1 p-6 space-y-6">

              {/* Profile details grid */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-800/60 pb-6">
                <div>
                  <span className="text-slate-500 block">Trainer</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">{selectedClient.trainer_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Monthly Fee</span>
                  <span className="font-bold text-slate-200 mt-0.5 block font-mono text-sm">₹{parseFloat(selectedClient.monthly_fee).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Start Date</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block font-mono">{selectedClient.start_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expiry Date</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block font-mono">{selectedClient.expiry_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact Info</span>
                  <span className="text-slate-300 mt-0.5 block font-mono">{selectedClient.client_phone} | {selectedClient.client_email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded uppercase mt-0.5 border ${selectedClient.status === 'Active'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {selectedClient.status}
                  </span>
                </div>
              </div>

              {/* Weight History Section */}
              <div className="space-y-4 border-b border-slate-800/60 pb-6">
                <WeightHistory
                  clientId={selectedClient.id}
                  userRole={user?.role}
                  targetWeight={targetWeight}
                  onWeightUpdated={async () => {
                    ptApi.getProgress(selectedClient.id).then(res => {
                      if (res.success) setProgressHistory(res.data);
                    });
                    try {
                      const clientRes = await ptApi.getClientDetails(selectedClient.id);
                      if (clientRes.success && clientRes.data) {
                        setSelectedClient(clientRes.data);
                      }
                    } catch (e) {
                      console.error('Error refreshing client details:', e);
                    }
                  }}
                />
              </div>

              {/* Diet Plan Section */}
              <div className="space-y-4 border-b border-slate-800/60 pb-6">
                <DietPlanEditor
                  clientId={selectedClient.id}
                  userRole={user?.role}
                />
              </div>

              {/* Transformation Gallery Section */}
              <div className="space-y-4 border-b border-slate-800/60 pb-6">
                <ImageGallery
                  clientId={selectedClient.id}
                  userRole={user?.role}
                />
              </div>

              {/* Trainer Notes Section */}
              <div className="space-y-4 border-b border-slate-800/60 pb-6">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} />
                  <span>Trainer Progress Notes</span>
                </h4>

                {/* Add note */}
                {user.role !== 'receptionist' && editingNoteId === null && (
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add assessment note..."
                      required
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 glass-input px-3.5 py-1.5 text-xs rounded-xl"
                    />
                    <button
                      type="submit"
                      disabled={notesLoading}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Save
                    </button>
                  </form>
                )}

                {/* Edit note */}
                {editingNoteId !== null && (
                  <form onSubmit={handleEditNoteSubmit} className="flex gap-2 bg-slate-950/20 p-2.5 rounded-xl border border-teal-500/20">
                    <input
                      type="text"
                      required
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      className="flex-1 glass-input px-3.5 py-1.5 text-xs rounded-xl"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(null)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                )}

                {/* Notes Feed */}
                {notesLoading ? (
                  <div className="h-12 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                  </div>
                ) : clientNotes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No notes recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {clientNotes.map(note => (
                      <div key={note.id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl text-xs relative group/note">
                        <div className="flex justify-between items-start text-slate-400 font-semibold mb-1">
                          <span>By {note.trainer_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{note.created_at.split('T')[0]}</span>
                        </div>
                        <p className="text-slate-350 leading-relaxed">{note.note}</p>

                        {/* Edit Action */}
                        {user.role !== 'receptionist' && (
                          <button
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteText(note.note);
                            }}
                            className="absolute right-2 top-2 p-1 text-slate-500 hover:text-white bg-slate-900 border border-slate-850 rounded-lg opacity-0 group-hover/note:opacity-100 transition cursor-pointer"
                            title="Edit Note"
                          >
                            <Edit2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History Timeline component */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>Timeline Operations History</span>
                </h4>

                <div className="relative border-l border-slate-800 pl-4.5 space-y-4.5 ml-2 mt-2">
                  {getTimelineEvents().map((ev, idx) => {
                    const Icon = ev.icon;
                    return (
                      <div key={idx} className="relative">
                        <span className={`absolute -left-[27px] top-0.5 p-1 bg-slate-900 border border-slate-800 rounded-full ${ev.color}`}>
                          <Icon size={10} />
                        </span>
                        <div>
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-300">{ev.title}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{ev.date}</span>
                          </div>
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed">{ev.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ENROLL CLIENT MODAL */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleEnrollSubmit} className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative animate-fade-in text-xs space-y-4">
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={15} />
            </button>

            <h3 className="text-base font-extrabold text-white">Enroll Member in Personal Training</h3>
            <p className="text-slate-500">Associate an active gym member with a trainer and monthly PT plan.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Member */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-400 font-semibold">Select Member *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search member by name or phone..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleMemberSearch();
                        }
                      }}
                      className="w-full glass-input pl-9 pr-3 py-2 text-xs rounded-xl"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleMemberSearch}
                    disabled={searchingMembers}
                    className="px-4 py-2 text-xs font-bold text-white gradient-btn rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {searchingMembers ? 'Searching...' : 'Search'}
                  </button>
                  {memberSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setMemberSearch('');
                        fetchMembers();
                      }}
                      className="px-3 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-450 rounded-xl transition cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <select
                  required
                  value={enrollForm.member_id}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, member_id: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs mt-1.5"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
              </div>

              {/* Trainer */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Assign Trainer *</label>
                <select
                  required
                  value={enrollForm.trainer_id}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, trainer_id: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <option value="">-- Choose Trainer --</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} {t.specialization ? `(${t.specialization})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* PT Plan */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Select PT Plan *</label>
                <select
                  required
                  value={enrollForm.pt_plan_id}
                  onChange={(e) => handlePlanSelect(e.target.value, 'enroll')}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <option value="">-- Choose Plan --</option>
                  {activePlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{parseFloat(p.monthly_fee).toFixed(0)})</option>
                  ))}
                </select>
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Goal *</label>
                <select
                  required
                  value={enrollForm.goal}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, goal: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="General Fitness">General Fitness</option>
                  <option value="Strength Training">Strength Training</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Start Date *</label>
                <input
                  type="date"
                  required
                  value={enrollForm.start_date}
                  onChange={(e) => {
                    const start = new Date(e.target.value + 'T00:00:00');
                    start.setMonth(start.getMonth() + 1);
                    const expiry = formatLocalDate(start);
                    setEnrollForm(prev => ({ ...prev, start_date: e.target.value, expiry_date: expiry }));
                  }}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={enrollForm.expiry_date}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Monthly Fee */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-400 font-semibold">Custom Monthly Fee (INR) *</label>
                <input
                  type="number"
                  required
                  value={enrollForm.monthly_fee}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, monthly_fee: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                  placeholder="Plan fee is pre-populated, edit if necessary"
                />
              </div>

              {/* Target Weight */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-400 font-semibold">Target Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={enrollForm.target_weight}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, target_weight: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                  placeholder="Optional target weight in kg"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="px-4.5 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 text-white gradient-btn rounded-xl shadow-lg transition cursor-pointer"
              >
                Enroll Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT CLIENT DETAILS MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleEditSubmit} className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative animate-fade-in text-xs space-y-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={15} />
            </button>

            <h3 className="text-base font-extrabold text-white">Edit Personal Training Details</h3>
            <p className="text-slate-500">Modify client assigned trainer, active plan, status, or date validations.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trainer */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Assign Trainer *</label>
                <select
                  required
                  value={editForm.trainer_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, trainer_id: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  {getEditTrainerOptions().map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.status === 'inactive' ? ' (Inactive)' : ''} {t.specialization ? `(${t.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* PT Plan */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Select PT Plan *</label>
                <select
                  required
                  value={editForm.pt_plan_id}
                  onChange={(e) => handlePlanSelect(e.target.value, 'edit')}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  {(() => {
                    const hasCurrentPlan = activePlans.some(p => p.id === parseInt(editForm.pt_plan_id));
                    const options = [...activePlans];
                    if (!hasCurrentPlan && editForm.pt_plan_id) {
                      const currentPlan = plans.find(p => p.id === parseInt(editForm.pt_plan_id));
                      if (currentPlan) {
                        options.push({
                          ...currentPlan,
                          isCurrentAndInactive: true
                        });
                      } else {
                        options.push({
                          id: parseInt(editForm.pt_plan_id),
                          name: selectedClient?.pt_plan_name || 'Current Plan',
                          monthly_fee: editForm.monthly_fee || 0,
                          status: 'inactive',
                          isCurrentAndInactive: true
                        });
                      }
                    }
                    return options.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.isCurrentAndInactive || p.status === 'inactive' ? ' (Inactive)' : ''} (₹{parseFloat(p.monthly_fee).toFixed(0)})
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Goal *</label>
                <select
                  required
                  value={editForm.goal}
                  onChange={(e) => setEditForm(prev => ({ ...prev, goal: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="General Fitness">General Fitness</option>
                  <option value="Strength Training">Strength Training</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Status *</label>
                <select
                  required
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Start Date *</label>
                <input
                  type="date"
                  required
                  value={editForm.start_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={editForm.expiry_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Monthly Fee */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-400 font-semibold">Monthly Fee (INR) *</label>
                <input
                  type="number"
                  required
                  value={editForm.monthly_fee}
                  onChange={(e) => setEditForm(prev => ({ ...prev, monthly_fee: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Target Weight */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-400 font-semibold">Target Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.target_weight}
                  onChange={(e) => setEditForm(prev => ({ ...prev, target_weight: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                  placeholder="Optional target weight in kg"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4.5 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 text-white gradient-btn rounded-xl shadow-lg transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RENEW CLIENT MODAL */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleRenewSubmit} className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative animate-fade-in text-xs space-y-4">
            <button
              type="button"
              onClick={() => setIsRenewModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={15} />
            </button>

            <h3 className="text-base font-extrabold text-white">Renew PT Subscription</h3>
            <p className="text-slate-500">Record a renewal payment and extend active training validity for {renewForm.client_name}.</p>

            <div className="space-y-3">
              {/* New Expiry Date */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">New Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={renewForm.new_expiry_date}
                  onChange={(e) => setRenewForm(prev => ({ ...prev, new_expiry_date: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Renewed Amount */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Renewed Amount (INR) *</label>
                <input
                  type="number"
                  required
                  value={renewForm.renewed_amount}
                  onChange={(e) => setRenewForm(prev => ({ ...prev, renewed_amount: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsRenewModalOpen(false)}
                className="px-4.5 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 text-white gradient-btn rounded-xl shadow-lg transition cursor-pointer"
              >
                Confirm Renewal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PLAN FORM MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handlePlanSubmit} className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative animate-fade-in text-xs space-y-4">
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={15} />
            </button>

            <h3 className="text-base font-extrabold text-white">{planForm.id ? 'Edit PT Package' : 'Create PT Package'}</h3>
            <p className="text-slate-500">Configure package names, standard monthly fees, and description summaries.</p>

            <div className="space-y-3">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Strength PT"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Monthly Fee */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Standard Monthly Fee (INR) *</label>
                <input
                  type="number"
                  required
                  placeholder="5000"
                  value={planForm.monthly_fee}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, monthly_fee: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Description</label>
                <textarea
                  placeholder="Enter details of what is covered in this program..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs h-20"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Status *</label>
                <select
                  value={planForm.status}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4.5 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 text-white gradient-btn rounded-xl shadow-lg transition cursor-pointer"
              >
                {planForm.id ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TRAINER FORM MODAL */}
      {isTrainerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleTrainerSubmit} className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative animate-fade-in text-xs space-y-4">
            <button
              type="button"
              onClick={() => setIsTrainerModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={15} />
            </button>

            <h3 className="text-base font-extrabold text-white">{trainerForm.id ? 'Edit Trainer Details' : 'Add PT Trainer'}</h3>
            <p className="text-slate-500">Configure trainer profile information, specialization, and status.</p>

            <div className="space-y-3">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Trainer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Kumar"
                  value={trainerForm.name}
                  onChange={(e) => setTrainerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  value={trainerForm.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setTrainerForm(prev => ({ ...prev, phone: val }));
                  }}
                  className={`w-full glass-input px-3.5 py-2.5 rounded-xl text-xs ${
                    trainerForm.phone && !/^[6-9]\d{9}$/.test(trainerForm.phone)
                      ? 'border border-rose-500/60 focus:border-rose-400'
                      : ''
                  }`}
                />
                {trainerForm.phone && !/^[6-9]\d{9}$/.test(trainerForm.phone) && (
                  <p className="text-rose-400 text-[10px] mt-0.5 flex items-center gap-1">
                    <span>⚠</span> Must be a 10-digit number starting with 6–9
                  </p>
                )}
              </div>

              {/* Specialization */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Weight Loss, Strength"
                  value={trainerForm.specialization}
                  onChange={(e) => setTrainerForm(prev => ({ ...prev, specialization: e.target.value }))}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Status (Only show when editing) */}
              {trainerForm.id && (
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Status *</label>
                  <select
                    value={trainerForm.status}
                    onChange={(e) => setTrainerForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsTrainerModalOpen(false)}
                className="px-4.5 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 text-white gradient-btn rounded-xl shadow-lg transition cursor-pointer"
              >
                {trainerForm.id ? 'Save Changes' : 'Add Trainer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PT;
