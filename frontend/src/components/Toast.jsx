import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const icons = {
    success: <CheckCircle className="text-emerald-400" size={18} />,
    error: <ShieldAlert className="text-red-400" size={18} />,
    warning: <AlertCircle className="text-amber-400" size={18} />,
    info: <Info className="text-indigo-400" size={18} />
  };

  const colors = {
    success: 'border-emerald-500/20 bg-emerald-950/40 text-emerald-200',
    error: 'border-red-500/20 bg-red-950/40 text-red-200',
    warning: 'border-amber-500/20 bg-amber-950/40 text-amber-200',
    info: 'border-indigo-500/20 bg-indigo-950/40 text-indigo-200'
  };

  return (
    <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 border rounded-xl shadow-2xl backdrop-blur-md animate-fade-in ${colors[type]}`}>
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
      <button 
        onClick={onClose} 
        className="p-1 rounded hover:bg-white/5 transition-colors text-white/40 hover:text-white"
        aria-label="Close notification"
      >
        <X size={14} />
      </button>
    </div>
  );
};
export default Toast;
