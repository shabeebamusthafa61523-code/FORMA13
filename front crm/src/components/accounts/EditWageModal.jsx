import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, DollarSign, Users, Calendar, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { updateSalaryPayment } from '../../services/accountsService';
import { useToast } from '../ToastProvider';

const EditWageModal = ({ isOpen, onClose, record, onSuccess }) => {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [dailyWageRate, setDailyWageRate] = useState('');
  const [daysWorked, setDaysWorked] = useState('1');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [partialPaidAmount, setPartialPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');

  // Prefill state when record changes
  useEffect(() => {
    if (record) {
      const empId = record.employee?._id || record.employee?.id || record.employee || '';
      setSelectedEmployeeId(empId);
      const totalAmt = Number(record.basicSalary || record.totalEarnings || record.paidAmount || 0);
      const daily = Number(record.basicSalary || totalAmt);
      const days = Number(record.daysWorked || 1);
      setDailyWageRate(String(daily));
      setDaysWorked(String(days));
      setAmount(String(totalAmt));
      setPaymentDate(record.paymentDate ? new Date(record.paymentDate).toISOString().split('T')[0] : '');
      setStatus(record.status || 'PENDING');
      setPartialPaidAmount(String(record.paidAmount ?? totalAmt));
      setPaymentMode(record.paymentMode || 'Cash');
      setRemarks(record.remarks || '');
    }
  }, [record]);

  // Fetch staff list for employee selector
  useEffect(() => {
    if (!isOpen) return;
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        let token = localStorage.getItem('token') || '';
        token = token.replace(/^"(.*)"$/, '$1').trim();
        if (token.startsWith('Bearer ')) token = token.slice(7).trim();

        const host = import.meta.env.VITE_API_URL || '/api';
        const apiUrl = `${host.replace(/\/+$/, '')}/v1/users`;

        const res = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const userList = res.data?.data || res.data || [];
        if (Array.isArray(userList)) {
          setEmployees(userList.filter(u => u.isActive !== false));
        }
      } catch (err) {
        console.error('Error fetching employees for edit:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [isOpen]);

  const handleDailyRateChange = (rateVal) => {
    setDailyWageRate(rateVal);
    if (rateVal !== '' && !isNaN(rateVal)) {
      const computed = Number(rateVal) * Number(daysWorked || 1);
      setAmount(String(computed));
    }
  };

  const handleDaysWorkedChange = (daysVal) => {
    setDaysWorked(daysVal);
    if (dailyWageRate !== '' && !isNaN(dailyWageRate)) {
      const computed = Number(dailyWageRate) * Number(daysVal || 1);
      setAmount(String(computed));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!record?._id) return;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      showToast('Please enter a valid wage amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const finalPaidVal = status === 'PARTIALLY_PAID'
        ? Number(partialPaidAmount || 0)
        : Number(amount);

      const empObj = employees.find(u => (u._id || u.id) === selectedEmployeeId);

      const payload = {
        employee: selectedEmployeeId,
        employeeName: empObj?.name || record.employeeName,
        paidAmount: finalPaidVal,
        basicSalary: Number(amount),
        paymentDate,
        status,
        paymentMode,
        remarks: remarks ? remarks.trim() : '',
        daysWorked: Number(daysWorked || 1)
      };

      const res = await updateSalaryPayment(record._id, payload);
      if (res?.success !== false) {
        showToast('Wage payment entry updated successfully!', 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast(res.message || 'Failed to update wage entry.', 'error');
      }
    } catch (err) {
      console.error('Error updating wage entry:', err);
      showToast(err.response?.data?.message || 'Error updating wage entry.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !record) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4">
        <div className="fixed inset-0 bg-slate-950/60" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto text-xs text-slate-800 dark:text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                <Edit size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Edit Wage Entry</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update payment details for {record.employeeName || 'Employee'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
            {/* ROW 1: Employee & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-600 dark:text-indigo-400" /> Select Employee *
                </label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {loadingEmployees ? (
                    <option value="">Loading staff list...</option>
                  ) : (
                    employees.map(e => (
                      <option key={e._id || e.id} value={e._id || e.id}>
                        {e.name} ({e.designationName || e.designation || 'Staff'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600 dark:text-indigo-400" /> Wage Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* ROW 2: Daily Rate & Days Worked */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Daily Wage Rate (₹/day)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  value={dailyWageRate}
                  onChange={e => handleDailyRateChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Days Worked
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={daysWorked}
                  onChange={e => handleDaysWorkedChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium"
                />
              </div>
            </div>

            {/* ROW 3: Total Wage Amount & Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" /> Wage Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Cash">Cash Disbursal</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="UPI">UPI / Online</option>
                </select>
              </div>
            </div>

            {/* ROW 4: Status */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-600 dark:text-amber-400" /> Status *
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Partial Payment Section if PARTIALLY_PAID */}
            {status === 'PARTIALLY_PAID' && (
              <div className="p-3.5 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-sky-800 dark:text-sky-300 mb-1">
                      Amount Paid So Far (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={Number(amount || 0)}
                      step="any"
                      value={partialPaidAmount}
                      onChange={e => setPartialPaidAmount(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-xl p-2.5 font-extrabold text-sky-700 dark:text-sky-300 outline-none"
                    />
                  </div>

                  <div className="flex flex-col justify-center bg-rose-50/80 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                    <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">Minus Amount (Remaining Due)</span>
                    <span className="text-base font-black text-rose-700 dark:text-rose-300">
                      -₹{Math.max(0, Number(amount || 0) - Number(partialPaidAmount || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ROW 5: Remarks */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Remarks / Description
              </label>
              <textarea
                rows={2}
                placeholder="Enter wage payment remarks or details..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Entry...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default EditWageModal;
