import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, ShieldAlert, Loader2, CheckCircle2, Building } from 'lucide-react';
import { updateClient } from '../../services/clientService';
import { formatApiError } from '../../utils/errorUtils';

const EditClientModal = ({ isOpen, onClose, client, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    remarks: ''
  });

  useEffect(() => {
    if (client && isOpen) {
      setFormData({
        clientName: client.clientName || client.companyName || '',
        phone: client.phone || '',
        remarks: client.notes || client.remarks || ''
      });
      setError('');
      setSuccessMsg('');
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanName = formData.clientName.trim();
    const cleanPhone = formData.phone.trim();

    if (!cleanName) {
      setError('Client Name is required.');
      return;
    }
    if (!cleanPhone) {
      setError('Phone Number is required.');
      return;
    }

    setSubmitting(true);

    try {
      const clientId = client._id || client.id;
      const fallbackEmail = client.email || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}@client.local`;

      const payload = {
        ...client,
        clientName: cleanName,
        companyName: client.companyName || cleanName,
        phone: cleanPhone,
        email: fallbackEmail,
        notes: formData.remarks.trim()
      };

      const res = await updateClient(clientId, payload);

      if (res && res.success) {
        setSuccessMsg('Client updated successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data || res);
          onClose();
        }, 600);
      } else {
        setError(formatApiError(res, 'Failed to update client.'));
      }
    } catch (err) {
      setError(formatApiError(err, 'Server error updating client.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden';

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">Edit Client</h2>
              <p className="text-xs text-slate-400 font-medium">Update client details.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden m-0">
          <div className="p-6 flex flex-col gap-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Name *</label>
              <input type="text" required name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Enter client name" className={inputCls} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
              <input type="text" required name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" className={inputCls} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Remarks</label>
              <textarea rows={3} name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Enter any notes or remarks..." className={inputCls} />
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></> : <><Save className="w-4 h-4" /><span>Save Client</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditClientModal;
