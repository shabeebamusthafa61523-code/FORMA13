import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, ArrowLeft, Save, ShieldAlert, Loader2 } from 'lucide-react';
import { createClient } from '../services/clientService';
import { useToast } from '../components/ToastProvider';
import { formatApiError } from '../utils/errorUtils';

const CreateClientPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    remarks: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
      const fallbackEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}@client.local`;

      const payload = {
        clientName: cleanName,
        companyName: cleanName,
        phone: cleanPhone,
        email: fallbackEmail,
        notes: formData.remarks.trim(),
        status: 'Active',
        industry: 'Technology'
      };

      const res = await createClient(payload);
      if (res && res.success) {
        showToast("Client created successfully!", "success");
        navigate('/clients');
      } else {
        const errMsg = formatApiError(res, 'Failed to create client.');
        setError(errMsg);
        showToast(errMsg, "error");
      }
    } catch (err) {
      console.error("Create client error:", err);
      const errMsg = formatApiError(err, 'Server error creating client.');
      setError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden';

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-600" />
          Add New Client
        </h1>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Client Name *</label>
          <input
            type="text"
            required
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            placeholder="Enter client name"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
          <input
            type="text"
            required
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Remarks</label>
          <textarea
            rows={3}
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            placeholder="Enter any notes or remarks..."
            className={inputCls}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="px-6 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-8 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Client</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateClientPage;
