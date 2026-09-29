import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Calculator, CheckCircle2 } from 'lucide-react';

const PartialPaymentModal = ({ isOpen, onClose, record, onConfirm }) => {
  if (!isOpen || !record) return null;

  const totalWage = Number(record.basicSalary || record.totalEarnings || record.paidAmount || 0);
  const initialPaid = Number(record.paidAmount !== undefined ? record.paidAmount : totalWage);

  const [partialPaid, setPartialPaid] = useState(() => {
    return initialPaid < totalWage && initialPaid > 0 ? String(initialPaid) : String(Math.round(totalWage / 2));
  });

  useEffect(() => {
    if (record) {
      const tot = Number(record.basicSalary || record.totalEarnings || record.paidAmount || 0);
      const paid = Number(record.paidAmount !== undefined ? record.paidAmount : tot);
      setPartialPaid(paid < tot && paid > 0 ? String(paid) : String(Math.round(tot / 2)));
    }
  }, [record]);

  const partialPaidNum = Number(partialPaid || 0);
  const minusAmount = totalWage - partialPaidNum;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isNaN(partialPaidNum) || partialPaidNum < 0) return;
    onConfirm(partialPaidNum, totalWage);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-950/70" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5 text-xs text-slate-800 dark:text-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-sm">
                <Calculator size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Partially Paid Amount</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{record.employeeName || 'Employee'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Total Wage Info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center">
              <span className="font-bold text-slate-600 dark:text-slate-400">Total Wage Amount</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">₹{totalWage.toLocaleString('en-IN')}</span>
            </div>

            {/* Input Partial Paid Amount */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <DollarSign size={14} className="text-sky-600" /> Enter Paid Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                max={totalWage}
                step="any"
                value={partialPaid}
                onChange={(e) => setPartialPaid(e.target.value)}
                placeholder="Enter partial amount paid"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-sky-300 dark:border-sky-700 rounded-xl p-2.5 font-extrabold text-sm text-sky-700 dark:text-sky-300 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Minus / Remaining Due Highlight */}
            <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex justify-between items-center text-rose-800 dark:text-rose-300">
              <div>
                <span className="block text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">Minus Amount (Remaining Due)</span>
                <span className="text-[11px] text-rose-600/80 font-medium">Pending balance to be paid</span>
              </div>
              <div className="text-base font-black tracking-tight text-rose-700 dark:text-rose-400">
                -₹{Math.max(0, minusAmount).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer"
              >
                <CheckCircle2 size={15} /> Save Partial Payment
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default PartialPaymentModal;
