import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Users, BookOpen, Calendar, Search, Filter, Loader2, FileText, CheckCircle2,
  Clock, XCircle, DollarSign, Download, Printer, RefreshCw, Edit
} from 'lucide-react';
import { getSalaryPayments, updateSalaryPayment } from '../../services/accountsService';
import { useToast } from '../ToastProvider';
import ExcelExportButton from '../ExcelExportButton';
import PayslipModal from './PayslipModal';
import StatusSelectPill from './StatusSelectPill';
import PartialPaymentModal from './PartialPaymentModal';
import EditWageModal from './EditWageModal';

const EmployeeLedgerTab = () => {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Ledger Logs State
  const [ledgerLogs, setLedgerLogs] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, APPROVED, PENDING, REJECTED
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Payslip Modal State
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  // Fetch active employees
  useEffect(() => {
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
            setSelectedEmployeeId(activeList[0]._id || activeList[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching employees for ledger:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch ledger logs for selected employee
  const fetchLedger = useCallback(async () => {
    if (!selectedEmployeeId) {
      setLedgerLogs([]);
      return;
    }
    setLoadingLedger(true);
    try {
      const res = await getSalaryPayments({ employeeId: selectedEmployeeId });
      if (res.success) {
        setLedgerLogs(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching employee wage ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const [partialModalRecord, setPartialModalRecord] = useState(null);

  const handleStatusChange = async (recordId, newStatus, recordObj) => {
    if (newStatus === 'PARTIALLY_PAID') {
      const target = recordObj || ledgerLogs.find(l => l._id === recordId);
      setPartialModalRecord(target);
      return;
    }
    try {
      const payload = { status: newStatus };
      if (newStatus === 'COMPLETED') {
        const target = recordObj || ledgerLogs.find(l => l._id === recordId);
        if (target) {
          const tot = Number(target.basicSalary || target.totalEarnings || target.paidAmount || 0);
          payload.paidAmount = tot;
        }
      }
      const res = await updateSalaryPayment(recordId, payload);
      if (res?.success !== false) {
        showToast(`Status updated to ${newStatus === 'COMPLETED' ? 'Completed' : 'Pending'}!`, 'success');
        fetchLedger();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Error updating status.', 'error');
    }
  };

  const handlePartialConfirm = async (partialPaid, totalWage) => {
    if (!partialModalRecord) return;
    try {
      const res = await updateSalaryPayment(partialModalRecord._id, {
        status: 'PARTIALLY_PAID',
        paidAmount: partialPaid,
        basicSalary: totalWage
      });
      if (res?.success !== false) {
        showToast(`Status set to Partially Paid (₹${partialPaid.toLocaleString('en-IN')})`, 'success');
        fetchLedger();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update partial payment.', 'error');
    } finally {
      setPartialModalRecord(null);
    }
  };

  const selectedEmpObj = employees.find(u => (u._id || u.id) === selectedEmployeeId);

  // Filtered Logs
  const filteredLogs = ledgerLogs.filter(log => {
    // Status Filter
    if (statusFilter !== 'ALL') {
      const st = (log.status || 'PENDING').toUpperCase();
      if (st !== statusFilter) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const remarksStr = (log.remarks || '').toLowerCase();
      const monthStr = (log.month || '').toLowerCase();
      const modeStr = (log.paymentMode || '').toLowerCase();
      const amountStr = String(log.paidAmount || log.customNetPay || log.basicSalary || '');
      if (!remarksStr.includes(q) && !monthStr.includes(q) && !modeStr.includes(q) && !amountStr.includes(q)) {
        return false;
      }
    }

    // Date Range
    if (startDate) {
      const logDate = new Date(log.paymentDate).getTime();
      const start = new Date(startDate).getTime();
      if (logDate < start) return false;
    }
    if (endDate) {
      const logDate = new Date(log.paymentDate).getTime();
      const end = new Date(endDate + 'T23:59:59').getTime();
      if (logDate > end) return false;
    }

    return true;
  });

  // Financial Stats Summary
  const totalAmountDisbursed = filteredLogs.reduce((sum, item) => sum + Number(item.paidAmount ?? item.customNetPay ?? item.basicSalary ?? 0), 0);
  const approvedCount = filteredLogs.filter(item => item.status === 'APPROVED').length;
  const pendingCount = filteredLogs.filter(item => (item.status || 'PENDING') === 'PENDING').length;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> {status === 'COMPLETED' ? 'Completed' : 'Approved'}
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock size={12} /> Partially Paid
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Employee Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Employee Wage Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              View individual wage logs, payment history, and ledger statements for employees
            </p>
          </div>

          {/* Employee Selection Dropdown */}
          <div className="w-full md:w-80">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Users size={12} className="text-indigo-600" /> Select Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {loadingEmployees ? (
                <option value="">Loading employee list...</option>
              ) : (
                employees.map(e => (
                  <option key={e._id || e.id} value={e._id || e.id}>
                    {e.name} ({e.designationName || e.designation || 'Staff'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Selected Employee Summary Cards */}
        {selectedEmpObj && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
              <span className="block text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Selected Employee</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{selectedEmpObj.name}</span>
              <span className="block text-[11px] text-slate-500">{selectedEmpObj.designationName || selectedEmpObj.designation || 'Staff Member'}</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <span className="block text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Total Disbursed Wage</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                ₹{totalAmountDisbursed.toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] text-emerald-600/80 font-medium">{filteredLogs.length} payment entry/entries</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 flex justify-between items-center">
              <div>
                <span className="block text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Approval Breakdown</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {approvedCount} Approved / {pendingCount} Pending
                </span>
              </div>
              <button
                onClick={fetchLedger}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                title="Refresh Ledger"
              >
                <RefreshCw size={14} className={loadingLedger ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Filters & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search remarks, month..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Date Filters */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 font-medium"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 font-medium"
            />
          </div>
        </div>

        {/* Export Excel Button */}
        <div className="flex items-center gap-2">
          <ExcelExportButton
            data={filteredLogs.map(l => ({
              'Payment Date': l.paymentDate ? new Date(l.paymentDate).toISOString().split('T')[0] : '',
              'Employee Name': selectedEmpObj?.name || l.employeeName || '',
              'Date Added': l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : (l.paymentDate ? new Date(l.paymentDate).toISOString().split('T')[0] : ''),
              'Paid Amount (₹)': Number(l.paidAmount ?? l.customNetPay ?? l.basicSalary ?? 0),
              'Payment Mode': l.paymentMode || '',
              'Status': l.status || 'PENDING',
              'Remarks': l.remarks || ''
            }))}
            fileName={`Wage_Ledger_${selectedEmpObj?.name || 'Employee'}`}
            sheetName="WageLedger"
            title="Export Excel"
          />
        </div>
      </div>

      {/* 3. Detailed Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">Payment Date</th>
                <th className="py-3 px-4 font-bold">Date Added</th>
                <th className="py-3 px-4 font-bold text-right">Amount Paid (₹)</th>
                <th className="py-3 px-4 font-bold">Payment Mode</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Remarks</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loadingLedger ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 size={22} className="animate-spin inline-block mr-2" />
                    Loading employee wage ledger logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No wage payment ledger logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const paidVal = log.paidAmount !== undefined ? log.paidAmount : (log.customNetPay !== undefined ? log.customNetPay : (log.basicSalary || 0));
                  return (
                    <tr key={log._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                        {log.paymentDate ? new Date(log.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (log.paymentDate ? new Date(log.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold whitespace-nowrap">
                        {log.status === 'PARTIALLY_PAID' ? (
                          <div className="space-y-0.5 text-right">
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Total: ₹{Number(log.basicSalary || log.totalEarnings || paidVal).toLocaleString('en-IN')}</div>
                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">Paid: ₹{Number(paidVal).toLocaleString('en-IN')}</div>
                            <div className="text-[11px] font-black text-rose-600 dark:text-rose-400">Bal: -₹{Math.max(0, Number(log.basicSalary || log.totalEarnings || paidVal) - Number(paidVal)).toLocaleString('en-IN')}</div>
                          </div>
                        ) : (
                          <div className="text-emerald-600 dark:text-emerald-400">
                            ₹{Number(paidVal).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {log.paymentMode || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusSelectPill
                          value={log.status || 'PENDING'}
                          onChange={(newStatus) => handleStatusChange(log._id, newStatus, log)}
                        />
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={log.remarks}>
                        {log.remarks || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPayslipRecord(log)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                            title="View / Download Official Payslip"
                          >
                            <FileText size={12} /> Wage Slip
                          </button>
                          <button
                            onClick={() => setEditingRecord(log)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Edit Wage Entry"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal View */}
      {selectedPayslipRecord && (
        <PayslipModal
          isOpen={!!selectedPayslipRecord}
          onClose={() => setSelectedPayslipRecord(null)}
          salaryRecord={selectedPayslipRecord}
        />
      )}

      {/* Edit Wage Modal */}
      {editingRecord && (
        <EditWageModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          record={editingRecord}
          onSuccess={fetchLedger}
        />
      )}

      {/* Partial Payment Modal */}
      {partialModalRecord && (
        <PartialPaymentModal
          isOpen={!!partialModalRecord}
          onClose={() => setPartialModalRecord(null)}
          record={partialModalRecord}
          onConfirm={handlePartialConfirm}
        />
      )}
    </div>
  );
};

export default EmployeeLedgerTab;
