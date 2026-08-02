import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { ConfirmModal } from '../components/ConfirmModal';
import { Toast } from '../components/Toast';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import membersApi from '../api/members.api.js';
import ptApi from '../api/pt.api.js';
import { getTodayDateString } from '../utils/formatHelpers.js';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  Fingerprint,
  Phone,
  Mail,
  Calendar,
  X,
  Camera,
  Upload,
  ChevronLeft,
  ChevronRight,
  Dumbbell
} from 'lucide-react';

export const Members = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [limit] = useState(10);

  // Notifications
  const [toast, setToast] = useState(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappMember, setWhatsappMember] = useState(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState('membership');

  // PT Integration states
  const [includePT, setIncludePT] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [ptPlans, setPtPlans] = useState([]);
  const [ptForm, setPtForm] = useState({
    trainer_id: '',
    pt_plan_id: '',
    goal: 'Weight Loss',
    target_weight: '',
    monthly_fee: ''
  });

  // Profile image upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    register_number: '',
    join_date: getTodayDateString(),
    start_date: getTodayDateString(),
    membership_type: 'Monthly',
    amount: 1200,
    expiry_date: '',
    device_user_id: '',
    attendance_method: 'manual',
    date_of_birth: '',
    profile_image_url: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  useEffect(() => {
    fetchMembers();
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    if (isFormModalOpen && !selectedMember) {
      fetchPTConfig();
    }
  }, [isFormModalOpen, selectedMember]);

  const fetchPTConfig = async () => {
    try {
      const [trainersRes, plansRes] = await Promise.all([
        ptApi.getTrainers(),
        ptApi.getActivePlans()
      ]);
      if (trainersRes.success && trainersRes.data) {
        setTrainers(trainersRes.data);
      }
      if (plansRes.success && plansRes.data) {
        setPtPlans(plansRes.data);
      }
    } catch (e) {
      console.error('Failed to load PT configurations:', e);
    }
  };

  // Handle auto-calculation of expiry date
  useEffect(() => {
    if (formData.start_date && formData.membership_type) {
      const computedExpiry = calculateExpiry(formData.start_date, formData.membership_type);
      setFormData(prev => ({ ...prev, expiry_date: computedExpiry }));
    }
  }, [formData.start_date, formData.membership_type]);

  const calculateExpiry = (startDateStr, type) => {
    const date = new Date(startDateStr);
    if (isNaN(date.getTime())) return '';

    switch (type) {
      case '1 Day':
        date.setDate(date.getDate() + 1);
        break;
      case '1 Week':
        date.setDate(date.getDate() + 7);
        break;
      case '15 Days':
        date.setDate(date.getDate() + 15);
        break;
      case 'Monthly':
      case 'PT':
        date.setMonth(date.getMonth() + 1);
        break;
      case '3 Months':
        date.setMonth(date.getMonth() + 3);
        break;
      case '6 Months':
        date.setMonth(date.getMonth() + 6);
        break;
      case '1 Year':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString().split('T')[0];
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await membersApi.getAll({
        search: searchTerm,
        status: statusFilter,
        page: currentPage,
        limit: limit
      });
      if (res.success && res.data) {
        setMembers(res.data.rows);
        setTotalMembers(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const openAddModal = () => {
    setSelectedMember(null);
    setSelectedFile(null);
    setPreviewUrl('');
    setIncludePT(false);
    setPtForm({
      trainer_id: '',
      pt_plan_id: '',
      goal: 'Weight Loss',
      target_weight: '',
      monthly_fee: ''
    });
    const today = getTodayDateString();
    setFormData({
      name: '',
      email: '',
      phone: '',
      register_number: '',
      join_date: today,
      start_date: today,
      membership_type: 'Monthly',
      amount: 1200,
      expiry_date: calculateExpiry(today, 'Monthly'),
      device_user_id: '',
      attendance_method: 'manual',
      date_of_birth: '',
      profile_image_url: '',
      emergency_contact_name: '',
      emergency_contact_phone: ''
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setSelectedFile(null);
    setPreviewUrl(member.profile_image_url ? getProfileImageUrl(member.profile_image_url) : '');
    setFormData({
      name: member.name,
      email: member.email || '',
      phone: member.phone,
      register_number: member.register_number || '',
      join_date: member.join_date,
      start_date: member.start_date || member.join_date,
      membership_type: member.membership_type,
      amount: Math.max(0, (Number(member.amount) || 0) - (Number(member.outstanding_balance) || 0)),
      expiry_date: member.expiry_date,
      device_user_id: member.device_user_id || '',
      attendance_method: member.attendance_method || 'manual',
      date_of_birth: member.date_of_birth || '',
      profile_image_url: member.profile_image_url || '',
      emergency_contact_name: member.emergency_contact_name || '',
      emergency_contact_phone: member.emergency_contact_phone || ''
    });
    setIsFormModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Supported formats: JPG, JPEG, PNG, WEBP', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Maximum file size is 5 MB', 'error');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFormData(prev => ({ ...prev, profile_image_url: '' }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || uploadingImage) return;

    const isEdit = !!selectedMember;

    // Validate register number
    if (!formData.register_number || !formData.register_number.trim()) {
      showToast('Register number is required', 'error');
      return;
    }

    // Validate and clean phone number (10 digits only, space-trimmed)
    const cleanPhone = formData.phone.trim().replace(/\s/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      showToast('Phone number must be exactly 10 digits', 'error');
      return;
    }

    // Validate emergency phone number
    let cleanEmergencyPhone = null;
    if (formData.emergency_contact_phone && formData.emergency_contact_phone.trim()) {
      cleanEmergencyPhone = formData.emergency_contact_phone.trim().replace(/\s/g, '');
      if (!/^\d{10}$/.test(cleanEmergencyPhone)) {
        showToast('Emergency contact phone number must be exactly 10 digits', 'error');
        return;
      }
    } else {
      showToast('Emergency contact phone number is required', 'error');
      return;
    }

    if (!formData.emergency_contact_name || !formData.emergency_contact_name.trim()) {
      showToast('Emergency contact name is required', 'error');
      return;
    }

    // Validate DOB (cannot be in the future, age cannot exceed 100)
    if (!formData.date_of_birth) {
      showToast('Date of birth is required', 'error');
      return;
    }

    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dob > today) {
        showToast('Date of birth cannot be in the future', 'error');
        return;
      }
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age > 100) {
        showToast('Age cannot exceed 100 years', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let imageUrl = formData.profile_image_url;

      if (selectedFile) {
        setUploadingImage(true);
        const uploadData = new FormData();
        uploadData.append('image', selectedFile);

        const uploadRes = await membersApi.uploadImage(uploadData);
        if (uploadRes.success && uploadRes.data?.url) {
          imageUrl = uploadRes.data.url;
        } else {
          showToast(uploadRes.message || 'Image upload failed', 'error');
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      const payload = {
        ...formData,
        register_number: formData.register_number.trim(),
        phone: cleanPhone,
        emergency_contact_phone: cleanEmergencyPhone || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        profile_image_url: imageUrl || null,
        date_of_birth: formData.date_of_birth || null
      };
      if (!payload.email) delete payload.email;
      if (!payload.device_user_id) payload.device_user_id = null;

      const res = isEdit
        ? await membersApi.update(selectedMember.id, payload)
        : await membersApi.create(payload);

      if (res.success) {
        if (!isEdit && includePT) {
          try {
            const newMemberId = res.data.id;
            const start = new Date(formData.start_date);
            const ptExpiry = new Date(start.setMonth(start.getMonth() + 1)).toISOString().split('T')[0];

            const ptRes = await ptApi.createClient({
              member_id: newMemberId,
              trainer_id: ptForm.trainer_id,
              pt_plan_id: ptForm.pt_plan_id,
              goal: ptForm.goal,
              target_weight: ptForm.target_weight || '',
              start_date: formData.start_date,
              expiry_date: ptExpiry,
              monthly_fee: ptForm.monthly_fee,
              status: 'Active'
            });
            if (!ptRes.success) {
              showToast('Member registered, but PT enrollment failed: ' + ptRes.message, 'warning');
            }
          } catch (ptErr) {
            console.error('PT enrollment error:', ptErr);
            showToast('Member registered, but PT enrollment failed.', 'warning');
          }
        }
        showToast(isEdit ? 'Member updated successfully' : 'Member added successfully', 'success');
        setIsFormModalOpen(false);
        fetchMembers();

        if (!isEdit) {
          const createdMember = {
            id: res.data.id,
            name: payload.name,
            phone: payload.phone,
            register_number: payload.register_number,
            membership_type: payload.membership_type,
            expiry_date: payload.expiry_date,
            status: 'active',
            profile_image_url: payload.profile_image_url || null
          };
          setWhatsappMember(createdMember);
          setWhatsappTemplate('welcome');
          setIsWhatsAppModalOpen(true);
        }
      } else {
        showToast(res.message || 'Operation failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Operation failed', 'error');
      setUploadingImage(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (member) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await membersApi.updateStatus(member.id, newStatus);
      if (res.success) {
        showToast(`Member marked as ${newStatus}`, 'success');
        fetchMembers();
      } else {
        showToast(res.message || 'Status update failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Server connection failed', 'error');
    }
  };

  const handleDeletePrompt = (member) => {
    setSelectedMember(member);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await membersApi.delete(selectedMember.id);
      if (res.success) {
        showToast('Member deleted successfully', 'success');
        setIsDeleteModalOpen(false);
        fetchMembers();
      } else {
        showToast(res.message || 'Failed to delete member', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Server error during deletion', 'error');
    }
  };


  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
      <Header title="Member Directory" />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
            <div className="relative w-full sm:max-w-md flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search member name, ID, phone, biometric..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl glass-input"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto px-4 py-2 text-sm rounded-xl glass-input cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="inactive">Inactive Members</option>
            </select>
          </div>

          <button
            onClick={openAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white gradient-btn rounded-xl shadow-lg cursor-pointer shrink-0"
          >
            <UserPlus size={16} />
            <span>Add Member</span>
          </button>
        </div>

        {/* Directory Table */}
        <div className="glass-panel border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : members.length === 0 ? (
            <div className="py-24 text-center text-slate-500">
              <Search size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="font-semibold text-slate-400">No members found</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting search filters or add a new record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                    <th className="py-4 px-6 whitespace-nowrap align-middle">ID</th>
                    <th className="py-4 px-6 whitespace-nowrap align-middle">Member info</th>
                    <th className="py-4 px-6 whitespace-nowrap align-middle">Joined / Expiry</th>
                    <th className="py-4 px-6 whitespace-nowrap align-middle">Biometric details</th>
                    <th className="py-4 px-6 whitespace-nowrap align-middle">Status</th>
                    <th className="py-4 px-6 text-right whitespace-nowrap align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-sm">
                  {members.map((member) => {
                    return (
                      <tr key={member.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-500 align-middle whitespace-nowrap">
                          {String(member.id).padStart(4, '0')}
                        </td>
                        <td className="py-4 px-6 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700/60 shrink-0 flex items-center justify-center">
                              {member.profile_image_url ? (
                                <img
                                  src={getProfileImageUrl(member.profile_image_url)}
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold text-indigo-400">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span
                                onClick={() => navigate(`/members/${member.id}`)}
                                className="font-bold text-slate-100 hover:text-indigo-400 cursor-pointer transition-colors block break-words"
                              >
                                {member.name}
                              </span>
                              <div className="flex flex-col gap-0.5 mt-1 text-xs text-slate-400">
                                {member.register_number && (
                                  <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 w-fit block mb-1">
                                    Reg: {member.register_number}
                                  </span>
                                )}
                                <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-500" />{member.phone}</span>
                                {member.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-500" />{member.email}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-300 align-middle whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500 block">Joined: {member.join_date}</span>
                            <span className="text-xs text-indigo-400 font-semibold block">{member.membership_type} (₹{member.amount})</span>
                            {(() => {
                              const mStatus = getMembershipStatus(member);
                              return (
                                <span className={`px-2 py-0.5 text-xs rounded-md border font-semibold block w-fit ${mStatus.colorClass}`}>
                                  Expires: {member.expiry_date}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-4 px-6 align-middle whitespace-nowrap">
                          {member.device_user_id ? (
                            <div className="flex items-center gap-2">
                              <Fingerprint size={16} className="text-indigo-400" />
                              <div>
                                <span className="text-xs font-semibold text-slate-300 block">ID: {member.device_user_id}</span>
                                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">{member.attendance_method}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unlinked (Manual)</span>
                          )}
                        </td>
                        <td className="py-4 px-6 align-middle whitespace-nowrap">
                          {(() => {
                            const mStatus = getMembershipStatus(member);
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${mStatus.colorClass}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${mStatus.dotClass}`}></span>
                                <span>{mStatus.label}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-6 text-right align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/members/${member.id}`)}
                              className="p-2 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
                              title="View Member Profile"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setWhatsappMember(member);
                                setIsWhatsAppModalOpen(true);
                              }}
                              disabled={!member.phone}
                              className={`p-2 border border-transparent rounded-xl transition cursor-pointer ${member.phone
                                  ? 'text-[#25D366] hover:text-[#20ba59] hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                  : 'text-slate-600 opacity-40 cursor-not-allowed'
                                }`}
                              title={member.phone ? "Send WhatsApp Reminder" : "No phone number available"}
                            >
                              <WhatsAppIcon size={16} />
                            </button>
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-2 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
                              title="Edit Member"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(member)}
                              className={`p-2 hover:bg-slate-800 border border-transparent hover:border-slate-700/50 rounded-xl transition cursor-pointer ${member.status === 'active' ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                                }`}
                              title={member.status === 'active' ? 'Deactivate Membership' : 'Reactivate Membership'}
                            >
                              {member.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            {isAdmin() && (
                              <button
                                onClick={() => handleDeletePrompt(member)}
                                className="p-2 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 text-red-400 hover:text-red-300 rounded-xl transition cursor-pointer"
                                title="Delete Member"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
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
          {!loading && totalMembers > limit && (
            <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4 text-xs">
              <span className="text-slate-550 font-medium">
                Showing {members.length}/{totalMembers} members (Page {currentPage} of {Math.ceil(totalMembers / limit)})
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
                  disabled={currentPage >= Math.ceil(totalMembers / limit)}
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

      {/* Add / Edit Member Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition"
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-bold text-white mb-6">
              {selectedMember ? 'Edit Member Profile' : 'Register New Member'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Profile Photo Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-950/30 border border-slate-800/80 rounded-2xl">
                <div className="relative w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden group shrink-0">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-500" />
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="block text-sm font-semibold text-slate-200">Profile Image</span>
                  <span className="block text-xs text-slate-500">Supports JPG, JPEG, PNG, WEBP. Max 5MB. Can capture from camera on mobile.</span>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <label
                      htmlFor="profile_photo"
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-650 hover:bg-indigo-500 rounded-xl cursor-pointer transition flex items-center gap-1.5"
                    >
                      <Upload size={12} />
                      <span>Select Photo / Capture</span>
                    </label>
                    <input
                      type="file"
                      id="profile_photo"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Register Number *</label>
                  <input
                    type="text"
                    value={formData.register_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, register_number: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="e.g. REG-001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="10-digit number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    max={getTodayDateString()}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Emergency Contact Name *</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Emergency Contact No *</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    placeholder="10-digit phone number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Membership Type</label>
                  <select
                    value={formData.membership_type}
                    onChange={(e) => {
                      const plan = e.target.value;
                      const price = MEMBERSHIP_PLANS[plan]?.price || 0;
                      const ptFee = includePT ? (parseFloat(ptForm.monthly_fee) || 0) : 0;
                      setFormData(prev => ({ ...prev, membership_type: plan, amount: price + ptFee }));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm cursor-pointer"
                  >
                    {Object.entries(MEMBERSHIP_PLANS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                {/* PT Checkbox Toggle */}
                {!selectedMember && (
                  <div className="flex items-center h-full pt-6">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includePT}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIncludePT(checked);
                          const planPrice = MEMBERSHIP_PLANS[formData.membership_type]?.price || 0;
                          const ptFee = checked ? (parseFloat(ptForm.monthly_fee) || 0) : 0;
                          setFormData(prev => ({ ...prev, amount: planPrice + ptFee }));
                        }}
                        className="w-4.5 h-4.5 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-200 block">Include Personal Training (PT)</span>
                        <span className="text-xs text-slate-500 block">Enroll this member under a PT trainer today</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Dates & Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Join Date</label>
                  <input
                    type="date"
                    value={formData.join_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, join_date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Plan Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Plan Expiry Date (Auto-calculated)</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Amount Paid Now (INR) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Collapsible PT Fields Section */}
              {!selectedMember && includePT && (
                <div className="p-5 bg-slate-950/40 border border-indigo-950/60 rounded-2xl space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <Dumbbell size={14} className="text-indigo-400" />
                    <span>Personal Training (PT) Enrollment Details</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trainer */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Assign Trainer *</label>
                      <select
                        required={includePT}
                        value={ptForm.trainer_id}
                        onChange={(e) => setPtForm(prev => ({ ...prev, trainer_id: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer text-slate-200"
                      >
                        <option value="" className="bg-slate-950 text-slate-400">-- Choose Trainer --</option>
                        {trainers.map(t => (
                          <option key={t.id} value={t.id} className="bg-slate-950 text-slate-200">{t.name} {t.specialization ? `(${t.specialization})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    {/* PT Plan */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Select PT Plan *</label>
                      <select
                        required={includePT}
                        value={ptForm.pt_plan_id}
                        onChange={(e) => {
                          const planId = e.target.value;
                          const selected = ptPlans.find(p => p.id === parseInt(planId));
                          const fee = selected ? parseFloat(selected.monthly_fee) : 0;
                          setPtForm(prev => ({ ...prev, pt_plan_id: planId, monthly_fee: fee }));
                          const planPrice = MEMBERSHIP_PLANS[formData.membership_type]?.price || 0;
                          setFormData(prev => ({ ...prev, amount: planPrice + fee }));
                        }}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer text-slate-200"
                      >
                        <option value="" className="bg-slate-950 text-slate-400">-- Choose Plan --</option>
                        {ptPlans.map(p => (
                          <option key={p.id} value={p.id} className="bg-slate-950 text-slate-200">{p.name} (₹{parseFloat(p.monthly_fee).toFixed(0)})</option>
                        ))}
                      </select>
                    </div>

                    {/* Goal */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Goal *</label>
                      <select
                        required={includePT}
                        value={ptForm.goal}
                        onChange={(e) => setPtForm(prev => ({ ...prev, goal: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer text-slate-200"
                      >
                        <option value="Weight Loss" className="bg-slate-950 text-slate-200">Weight Loss</option>
                        <option value="Muscle Gain" className="bg-slate-950 text-slate-200">Muscle Gain</option>
                        <option value="General Fitness" className="bg-slate-950 text-slate-200">General Fitness</option>
                        <option value="Strength Training" className="bg-slate-950 text-slate-200">Strength Training</option>
                      </select>
                    </div>

                    {/* Custom PT Fee */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">PT Monthly Fee (INR) *</label>
                      <input
                        type="number"
                        required={includePT}
                        value={ptForm.monthly_fee}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPtForm(prev => ({ ...prev, monthly_fee: val }));
                          const planPrice = MEMBERSHIP_PLANS[formData.membership_type]?.price || 0;
                          setFormData(prev => ({ ...prev, amount: planPrice + val }));
                        }}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-semibold text-slate-200"
                        placeholder="Plan fee"
                      />
                    </div>

                    {/* Target Weight */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Target Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ptForm.target_weight}
                        onChange={(e) => setPtForm(prev => ({ ...prev, target_weight: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-200"
                        placeholder="Optional weight target"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Biometric Fields */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Fingerprint size={14} />
                  <span>Biometric Integration Setup (Phase 2 Ready)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Device User ID</label>
                    <input
                      type="text"
                      value={formData.device_user_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, device_user_id: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                      placeholder="e.g. 101"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Verification Mode</label>
                    <select
                      value={formData.attendance_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, attendance_method: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer capitalize"
                    >
                      <option value="manual">manual (desktop check-in)</option>
                      <option value="fingerprint">fingerprint scan</option>
                      <option value="face">facial recognition</option>
                      <option value="card">RFID badge swipe</option>
                      <option value="password">numerical passcode</option>
                      <option value="qr">QR code scan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl gradient-btn cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  {selectedMember ? 'Save Changes' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Member Profile"
        message={`Are you sure you want to delete member '${selectedMember?.name}'? This will remove all their payment receipts, attendance logs, and unlink them from biometric devices permanently.`}
        confirmText="Permanently Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDanger={true}
      />

      {/* WhatsApp Reminder Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setWhatsappMember(null);
            setWhatsappTemplate('membership');
          }}
          member={whatsappMember}
          defaultTemplate={whatsappTemplate}
        />
      )}
    </div>
  );
};
export default Members;
