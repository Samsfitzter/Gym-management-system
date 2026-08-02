import React, { useState, useEffect } from 'react';
import { X, Send, Edit3, AlertTriangle, User, Calendar, CreditCard, Sparkles, Gift } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { getRemainingDays, generateMembershipReminder, generatePaymentReminder, generateBirthdayWish, generateWelcomeMessage } from '../utils/whatsappTemplates';
import { communicationApi } from '../api/communication.api.js';

export const WhatsAppModal = ({ isOpen, onClose, member, defaultTemplate = 'membership', customMessage = '', communicationType = null, onSuccess }) => {
  if (!isOpen || !member) return null;

  const [activeTab, setActiveTab] = useState(defaultTemplate); // 'membership', 'payment', or 'birthday'
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [validationError, setValidationError] = useState('');

  const daysRemaining = getRemainingDays(member.expiry_date);

  // Base default template text
  const defaultText = defaultTemplate === 'receipt'
    ? customMessage
    : (customMessage || (activeTab === 'membership'
      ? generateMembershipReminder(member, daysRemaining)
      : activeTab === 'payment'
        ? generatePaymentReminder(member)
        : activeTab === 'birthday'
          ? generateBirthdayWish(member)
          : activeTab === 'welcome'
            ? generateWelcomeMessage(member)
            : ''));

  // Sync edited text when active tab changes or modal opens
  useEffect(() => {
    setEditedText(defaultText);
    validatePhone(member.phone);
  }, [activeTab, member, defaultText]);

  const validatePhone = (phone) => {
    if (!phone) {
      setValidationError('Phone number is missing.');
      return false;
    }
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10 || !/^\d+$/.test(cleaned)) {
      setValidationError('Invalid member phone number. Must be exactly 10 digits.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const formatPhoneForWhatsApp = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return '91' + cleaned;
    }
    return cleaned;
  };

  const handleSend = async (textToSend) => {
    if (!validatePhone(member.phone)) {
      alert('Invalid member phone number.');
      return;
    }

    const phoneNum = formatPhoneForWhatsApp(member.phone);
    const encodedText = encodeURIComponent(textToSend);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodedText}`;

    // Determine communication log type
    let logType = activeTab;
    if (activeTab === 'membership') {
      logType = (defaultTemplate === 'membership' && communicationType === 'absence') ? 'absence' : 'expiry';
    }

    try {
      await communicationApi.logWhatsAppOpen(member.id, logType);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to log WhatsApp communication:', err);
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const getProfileImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || ''}${url}`;
  };

  const getMembershipStatus = (m) => {
    if (m.status === 'inactive') {
      return { label: 'Inactive', colorClass: 'bg-red-500/10 text-red-400 border-red-500/20', dotClass: 'bg-red-400' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(m.expiry_date);
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

  const statusInfo = getMembershipStatus(member);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
          <WhatsAppIcon size={22} className="text-[#25D366]" />
          <span>{
            defaultTemplate === 'receipt'
              ? 'Share Receipt via WhatsApp'
              : defaultTemplate === 'welcome'
                ? 'Send Welcome Message'
                : 'Send WhatsApp Reminder'
          }</span>
        </h3>

        {/* Member Information Card */}
        <div className="glass-panel border-slate-800/80 p-4 rounded-2xl flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            {member.profile_image_url ? (
              <img
                src={getProfileImageUrl(member.profile_image_url)}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-indigo-400">
                {member.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-100 truncate text-sm">{member.name}</h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{member.phone}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-850 border border-slate-700/60 text-slate-300 rounded">
                {member.membership_type}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${statusInfo.colorClass}`}>
                <span className={`h-1 w-1 rounded-full ${statusInfo.dotClass}`}></span>
                <span>{statusInfo.label}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Expires: {member.expiry_date}
              </span>
            </div>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Phone Validation Error</p>
              <p className="mt-0.5 text-red-300/90">{validationError}</p>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        {defaultTemplate !== 'receipt' && defaultTemplate !== 'welcome' && (
          <div className="flex flex-wrap sm:flex-nowrap bg-slate-950 border border-slate-800/80 rounded-xl p-1 gap-1 mb-5">
            <button
              onClick={() => {
                setActiveTab('membership');
                setIsEditing(false);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'membership'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Calendar size={13} />
              <span>Membership Status</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('payment');
                setIsEditing(false);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'payment'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <CreditCard size={13} />
              <span>Payment Due</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('birthday');
                setIsEditing(false);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'birthday'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Gift size={13} />
              <span>Birthday Wish</span>
            </button>
          </div>
        )}

        {/* Text Area Preview & Edit */}
        {isEditing ? (
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Edit Message Text</label>
              <button
                onClick={() => {
                  setEditedText(defaultText);
                  setIsEditing(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                Reset Template
              </button>
            </div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 text-xs rounded-xl glass-input font-sans leading-relaxed focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Type your custom reminder message here..."
            />
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Message Preview</span>
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed border-l-4 border-l-emerald-500">
              {defaultText}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="order-last sm:order-first px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition cursor-pointer sm:mr-auto"
          >
            Cancel
          </button>

          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-450 hover:text-slate-200 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition cursor-pointer"
              >
                Back to Preview
              </button>
              <button
                type="button"
                onClick={() => handleSend(editedText)}
                disabled={!!validationError}
                className="px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
              >
                <Send size={13} />
                <span>Send Customized Message</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={!!validationError}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit3 size={13} />
                <span>Preview & Edit</span>
              </button>
              <button
                type="button"
                onClick={() => handleSend(defaultText)}
                disabled={!!validationError}
                className="px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
              >
                <Sparkles size={13} />
                <span>Quick Send</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
