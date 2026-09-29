import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, DollarSign, Users, Calendar, Sparkles, Loader2, CheckCircle2, Clock,
  BookOpen, FileText, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { createSalaryPayment, getSalaryPayments } from '../../services/accountsService';
import { useToast } from '../ToastProvider';

const CreatePayslipModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('add'); // 'add' | 'ledger'
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Core Daily Wage Form States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [dailyWageRate, setDailyWageRate] = useState('');
  const [daysWorked, setDaysWorked] = useState('1');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('PENDING');
  const [partialPaidAmount, setPartialPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');

  // Employee Ledger State
  const [ledgerLogs, setLedgerLogs] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Fetch Active Employees & Reset Date to Today
  useEffect(() => {
    if (!isOpen) return;
    setPaymentDate(new Date().toISOString().split('T')[0]);
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
          const activeList = userList.filter(u => u.isActive !== false);
          setEmployees(activeList);
          if (activeList.length > 0 && !selectedEmployeeId) {
            const firstEmp = activeList[0];
            const empId = firstEmp._id || firstEmp.id;
            setSelectedEmployeeId(empId);
            const initSalary = firstEmp.salary || 0;
            if (initSalary > 0) {
              setDailyWageRate(String(initSalary));
              setAmount(String(initSalary));
            }
          }
        }
      } catch (err) {
        console.error('Error loading employees for wage payment:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [isOpen]);

  // Fetch Employee Ledger logs whenever selected employee changes or modal opens
  const fetchEmployeeLedger = async (empId) => {
    if (!empId) {
      setLedgerLogs([]);
      return;
    }
    setLoadingLedger(true);
    try {
      const res = await getSalaryPayments({ employeeId: empId });
      if (res.success) {
        setLedgerLogs(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching employee wage ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedEmployeeId) {
      fetchEmployeeLedger(selectedEmployeeId);
    }
  }, [isOpen, selectedEmployeeId]);

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setSelectedEmployeeId(empId);
    const empObj = employees.find(u => (u._id || u.id) === empId);
    if (empObj && empObj.salary) {
      setDailyWageRate(String(empObj.salary));
      setAmount(String(Number(empObj.salary) * Number(daysWorked || 1)));
    }
  };

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
    if (!selectedEmployeeId) {
      showToast('Please select an employee.', 'error');
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      showToast('Please enter a valid positive wage amount.', 'error');
      return;
    }
    if (!paymentDate) {
      showToast('Please select a payment date.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const finalPaidVal = status === 'PARTIALLY_PAID'
        ? Number(partialPaidAmount || 0)
        : Number(amount);

      const payload = {
        employeeId: selectedEmployeeId,
        paidAmount: finalPaidVal,
        basicSalary: Number(amount),
        paymentDate,
        month: paymentDate ? new Date(paymentDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        status,
        remarks: remarks ? remarks.trim() : '',
        paymentMode,
        daysWorked: Number(daysWorked || 1),
        workingDays: Number(daysWorked || 1)
      };

      const res = await createSalaryPayment(payload);
      if (res.success) {
        showToast('Daily wage entry created successfully!', 'success');
        fetchEmployeeLedger(selectedEmployeeId);
        onSuccess();
        onClose();
      } else {
        showToast(res.message || 'Failed to create wage entry.', 'error');
      }
    } catch (err) {
      console.error('Error creating wage entry:', err);
      showToast(err.response?.data?.message || 'Error creating wage entry.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEmpObj = employees.find(u => (u._id || u.id) === selectedEmployeeId);
  const totalPaidLedgerAmount = ledgerLogs.reduce((acc, curr) => acc + Number(curr.paidAmount ?? curr.customNetPay ?? curr.basicSalary ?? 0), 0);

  const renderStatusBadge = (logStatus) => {
    switch (logStatus) {
      case 'COMPLETED':
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> {logStatus === 'COMPLETED' ? 'Completed' : 'Approved'}
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock size={11} /> Partially Paid
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={11} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> Pending
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
        <div className="fixed inset-0 bg-slate-950/60" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        >
          {/* Modal Header & Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    Wage Management
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add wage entry or view employee ledger logs
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-t border-slate-200/80 dark:border-slate-800 px-6 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                className={`flex items-center gap-2 py-2.5 px-4 font-extrabold text-xs border-b-2 transition cursor-pointer ${
                  activeTab === 'add'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Plus size={14} /> Add Wage Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`flex items-center gap-2 py-2.5 px-4 font-extrabold text-xs border-b-2 transition cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen size={14} /> Employee Ledger
                {selectedEmployeeId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                    {ledgerLogs.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto text-xs text-slate-800 dark:text-slate-200">
            {/* TAB 1: ADD WAGE FORM */}
            {activeTab === 'add' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1ST ROW: Employee Selection & Auto-Fetched Today's Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-600 dark:text-indigo-400" /> Select Employee *
                    </label>
                    <select
                      required
                      value={selectedEmployeeId}
                      onChange={handleEmployeeChange}
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

                {/* 2ND ROW: Daily Wage Rate & Days Worked */}
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

                {/* 3RD ROW: Wage Amount & Payment Mode */}
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
                      placeholder="Total wage amount"
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

                {/* 4TH ROW: Status */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-600 dark:text-amber-400" /> Status *
                  </label>
                  <select
                    value={status}
                    onChange={e => {
                      const newSt = e.target.value;
                      setStatus(newSt);
                      if (newSt === 'PARTIALLY_PAID' && !partialPaidAmount) {
                        setPartialPaidAmount(String(Math.round(Number(amount || 0) / 2)));
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PARTIALLY_PAID">Partially Paid</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {/* Partial Payment Breakdown if PARTIALLY_PAID */}
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

                {/* 5TH ROW: Remarks */}
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
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold transition shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving Entry...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Add Wage Entry</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: EMPLOYEE LEDGER LOGS */}
            {activeTab === 'ledger' && (
              <div className="space-y-4">
                {/* Employee Selection Bar for Ledger */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600 dark:text-indigo-400" /> Select Employee for Ledger
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={handleEmployeeChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
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

                {/* Ledger Summary Box */}
                <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <h4 className="font-extrabold text-xs tracking-wide text-indigo-200 uppercase">
                      {selectedEmpObj?.name || 'Employee'} - Wage Ledger
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Total {ledgerLogs.length} payment record(s) logged
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Total Disbursed</span>
                    <span className="text-lg font-black text-emerald-400">
                      ₹{totalPaidLedgerAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 font-bold">Payment Date</th>
                          <th className="py-2.5 px-3 font-bold text-right">Amount (₹)</th>
                          <th className="py-2.5 px-3 font-bold">Mode</th>
                          <th className="py-2.5 px-3 font-bold">Status</th>
                          <th className="py-2.5 px-3 font-bold">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loadingLedger ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              <Loader2 size={18} className="animate-spin inline-block mr-2" />
                              Fetching wage ledger logs...
                            </td>
                          </tr>
                        ) : ledgerLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No wage payment logs found for {selectedEmpObj?.name || 'this employee'}.
                            </td>
                          </tr>
                        ) : (
                          ledgerLogs.map((log) => {
                            const paidVal = log.paidAmount !== undefined ? log.paidAmount : (log.customNetPay !== undefined ? log.customNetPay : (log.basicSalary || 0));
                            return (
                              <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                                  {log.paymentDate ? new Date(log.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                  ₹{Number(paidVal).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 font-medium">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                                    {log.paymentMode || 'Cash'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {renderStatusBadge(log.status || 'PENDING')}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={log.remarks}>
                                  {log.remarks || '-'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Switch button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus size={14} /> Add New Wage Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default CreatePayslipModal;
