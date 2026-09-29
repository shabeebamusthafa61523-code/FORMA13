import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSalaryPayments,
  deleteSalaryPayment,
  updateSalaryPayment
} from '../../services/accountsService';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import ExcelExportButton from '../ExcelExportButton';
import PayslipModal from './PayslipModal';
import CreatePayslipModal from './CreatePayslipModal';
import StatusSelectPill from './StatusSelectPill';
import PartialPaymentModal from './PartialPaymentModal';
import EditWageModal from './EditWageModal';
import {
  FileText,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
  Plus,
  BookOpen,
  ChevronDown,
  Edit
} from 'lucide-react';

const SalaryPaymentTab = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payslip Modal State
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const fetchSalaryPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSalaryPayments();
      if (res.success) setSalaryPayments(res.data || []);
    } catch (err) {
      console.error('Error fetching salary payments:', err);
      setError('Failed to fetch salary payment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryPayments();
  }, []);

  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', confirmText: 'Confirm', type: 'danger', onConfirm: null });
  const [partialModalRecord, setPartialModalRecord] = useState(null);

  const handleStatusChange = async (recordId, newStatus, recordObj) => {
    if (newStatus === 'PARTIALLY_PAID') {
      const target = recordObj || salaryPayments.find(p => p._id === recordId);
      setPartialModalRecord(target);
      return;
    }
    try {
      const payload = { status: newStatus };
      if (newStatus === 'COMPLETED') {
        const target = recordObj || salaryPayments.find(p => p._id === recordId);
        if (target) {
          const tot = Number(target.basicSalary || target.totalEarnings || target.paidAmount || 0);
          payload.paidAmount = tot;
        }
      }
      const res = await updateSalaryPayment(recordId, payload);
      if (res?.success !== false) {
        showToast(`Status updated to ${newStatus === 'COMPLETED' ? 'Completed' : 'Pending'}!`, 'success');
        fetchSalaryPayments();
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
        fetchSalaryPayments();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update partial payment.', 'error');
    } finally {
      setPartialModalRecord(null);
    }
  };

  const handleDeleteSalary = (id) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Wage Entry',
      message: 'Are you sure you want to delete this wage entry? This will also remove the automatically created expense entry.',
      confirmText: 'Delete Entry',
      type: 'danger',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await deleteSalaryPayment(id);
          if (res.success) {
            setSuccessMsg('Wage entry and synced expense entry removed.');
            fetchSalaryPayments();
            setTimeout(() => setSuccessMsg(''), 3000);
          }
        } catch (err) {
          showToast(err.response?.data?.message || 'Error deleting wage entry.', 'error');
        }
      }
    });
  };

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
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Salary Payments History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Wage Payment History
          </h3>

          <div className="flex items-center gap-2">
            <ExcelExportButton
              data={salaryPayments.map(s => ({
                'Payment Date': s.paymentDate ? new Date(s.paymentDate).toISOString().split('T')[0] : '',
                'Employee Name': s.employeeName || s.employeeId?.name || '',
                'Date Added': s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : (s.paymentDate ? new Date(s.paymentDate).toISOString().split('T')[0] : ''),
                'Net Payable (₹)': Number(s.customNetPay ?? s.paidAmount ?? 0),
                'Payment Mode': s.paymentMode || '',
                'Status': s.status || 'PENDING',
                'Remarks': s.remarks || ''
              }))}
              fileName="Salary_Wage_Payments"
              sheetName="SalaryPayments"
              title="Export Excel"
            />

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus size={14} /> Add Wage
            </button>

            <button
              onClick={() => navigate('/accounts/employee-ledger')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <BookOpen size={14} /> Employee Ledger
            </button>

            <button
              onClick={fetchSalaryPayments}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Refresh List"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-y border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 font-semibold">Payment Date</th>
                <th className="py-3 px-3 font-semibold">Employee</th>
                <th className="py-3 px-3 font-semibold">Date Added</th>
                <th className="py-3 px-3 font-semibold text-right">Net Paid Amount (₹)</th>
                <th className="py-3 px-3 font-semibold">Mode</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading salary payment records...
                  </td>
                </tr>
              ) : salaryPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No salary payment records found.
                  </td>
                </tr>
              ) : (
                salaryPayments.map((p) => {
                  const status = p.status || 'PENDING';
                  const netPaid = p.paidAmount !== undefined ? p.paidAmount : (p.customNetPay !== undefined ? p.customNetPay : (p.totalEarnings ? Math.max(0, (p.totalEarnings || 0) - (p.totalDeductions || 0)) : (p.basicSalary || 0)));
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 whitespace-nowrap font-medium">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {p.employeeName || p.employee?.name || 'Employee'}
                        {p.employee?.designation && (
                          <span className="block text-[10px] text-slate-400 font-normal">{p.employee.designation}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold whitespace-nowrap">
                        {status === 'PARTIALLY_PAID' ? (
                          <div className="space-y-0.5 text-right">
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Total: ₹{Number(p.basicSalary || p.totalEarnings || netPaid).toLocaleString('en-IN')}</div>
                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">Paid: ₹{Number(netPaid).toLocaleString('en-IN')}</div>
                            <div className="text-[11px] font-black text-rose-600 dark:text-rose-400">Bal: -₹{Math.max(0, Number(p.basicSalary || p.totalEarnings || netPaid) - Number(netPaid)).toLocaleString('en-IN')}</div>
                          </div>
                        ) : (
                          <div className="text-emerald-600 dark:text-emerald-400">
                            ₹{Number(netPaid).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {p.paymentMode || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusSelectPill
                          value={status}
                          onChange={(newStatus) => handleStatusChange(p._id, newStatus, p)}
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPayslipRecord(p)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                            title="View / Download Official Payslip"
                          >
                            <FileText size={12} /> Wage Slip
                          </button>
                          <button
                            onClick={() => setEditingRecord(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Edit Wage Entry"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSalary(p._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
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

      {/* OFFICIAL PAYSLIP MODAL */}
      <PayslipModal
        isOpen={!!selectedPayslipRecord}
        onClose={() => setSelectedPayslipRecord(null)}
        salaryRecord={selectedPayslipRecord}
      />

      {/* CREATE PAYSLIP MODAL */}
      <CreatePayslipModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchSalaryPayments}
      />

      {/* EDIT WAGE MODAL */}
      <EditWageModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSuccess={fetchSalaryPayments}
      />

      {/* PARTIAL PAYMENT MODAL */}
      <PartialPaymentModal
        isOpen={!!partialModalRecord}
        onClose={() => setPartialModalRecord(null)}
        record={partialModalRecord}
        onConfirm={handlePartialConfirm}
      />

      {/* Viewport Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        type={confirmState.type}
      />
    </div>
  );
};

export default SalaryPaymentTab;
