import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({ 
  isOpen, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to perform this action? This cannot be undone.', 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  isDanger = true 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20' 
                : 'gradient-btn'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmModal;
