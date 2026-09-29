import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, FileText, CheckCircle2, Clock, XCircle, Loader2, Mail, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { sendSalaryPayslipEmail, deleteSalaryPayment, updateSalaryPayment } from '../../services/accountsService';
import { useToast } from '../ToastProvider';
import { useUser } from '../../contexts/UserContext';
import ConfirmModal from '../ConfirmModal';
import StatusSelectPill from './StatusSelectPill';
import PartialPaymentModal from './PartialPaymentModal';

const PayslipModal = ({ isOpen, onClose, salaryRecord, onSaved, isSmall = false }) => {
  const payslipRef = useRef(null);
  const { showToast } = useToast();
  const { user } = useUser();
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('PENDING');
  const [partialModalOpen, setPartialModalOpen] = useState(false);

  useEffect(() => {
    if (salaryRecord) {
      const initialEmail = salaryRecord?.employee?.email || salaryRecord?.email || salaryRecord?.employeeEmail || '';
      setTargetEmail(initialEmail);
      setCurrentStatus(salaryRecord?.status || 'PENDING');
    }
  }, [salaryRecord]);

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'PARTIALLY_PAID') {
      setPartialModalOpen(true);
      return;
    }
    setCurrentStatus(newStatus);
    if (!salaryRecord?._id) return;
    try {
      const payload = { status: newStatus };
      if (newStatus === 'COMPLETED') {
        const tot = Number(salaryRecord.basicSalary || salaryRecord.totalEarnings || salaryRecord.paidAmount || 0);
        payload.paidAmount = tot;
      }
      const res = await updateSalaryPayment(salaryRecord._id, payload);
      if (res?.success !== false) {
        if (showToast) showToast(`Status updated to ${newStatus === 'COMPLETED' ? 'Completed' : 'Pending'}!`, 'success');
        if (onSaved) onSaved();
      }
    } catch (err) {
      if (showToast) showToast('Error updating status.', 'error');
    }
  };

  const handlePartialConfirm = async (partialPaid, totalWage) => {
    if (!salaryRecord?._id) return;
    setCurrentStatus('PARTIALLY_PAID');
    try {
      const res = await updateSalaryPayment(salaryRecord._id, {
        status: 'PARTIALLY_PAID',
        paidAmount: partialPaid,
        basicSalary: totalWage
      });
      if (res?.success !== false) {
        if (showToast) showToast(`Status set to Partially Paid (₹${partialPaid.toLocaleString('en-IN')})`, 'success');
        if (onSaved) onSaved();
      }
    } catch (err) {
      if (showToast) showToast('Error updating partial payment.', 'error');
    } finally {
      setPartialModalOpen(false);
    }
  };

  if (!isOpen || !salaryRecord) return null;

  const handleDelete = async () => {
    if (!salaryRecord?._id) return;
    setDeleteConfirmOpen(false);
    try {
      const res = await deleteSalaryPayment(salaryRecord._id);
      if (res.success) {
        if (showToast) showToast('Wage entry deleted successfully!', 'success');
        onClose();
        if (onSaved) onSaved();
      }
    } catch (err) {
      if (showToast) showToast(err?.response?.data?.message || 'Failed to delete wage entry.', 'error');
    }
  };

  const handlePrint = () => window.print();

  const empName = salaryRecord.employeeName || salaryRecord.employee?.name || 'Employee';
  const empCode = salaryRecord.kbEmployeeId || salaryRecord.employee?.employeeId || 'KB-EMP';
  const designation = salaryRecord.designation || salaryRecord.employee?.designationName || 'Staff Member';
  const department = salaryRecord.department || salaryRecord.employee?.departmentId?.name || 'General';
  const monthPeriod = salaryRecord.month || `${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
  const paymentDateStr = salaryRecord.paymentDate
    ? new Date(salaryRecord.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
  const dateAddedStr = salaryRecord.createdAt
    ? new Date(salaryRecord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : paymentDateStr;
  const paidAmount = Number(salaryRecord.paidAmount ?? salaryRecord.customNetPay ?? salaryRecord.basicSalary ?? 0);
  const dailyRate = Number(salaryRecord.basicSalary || salaryRecord.dailyWageRate || 0);
  const daysWorked = Number(salaryRecord.daysWorked || 1);
  const paymentMode = salaryRecord.paymentMode || 'Cash';
  const status = salaryRecord.status || 'PENDING';
  const remarks = salaryRecord.remarks || '';

  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;
    setDownloading(true);
    const filename = `Wage_Slip_${empName.replace(/\s+/g, '_')}_${paymentDateStr.replace(/\s+/g, '_')}.pdf`;
    try {
      const element = payslipRef.current.querySelector('[data-payslip-inner="true"]') || payslipRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const marginX = 10;
      const marginY = 15;
      const maxW = pdfWidth - (marginX * 2);
      const renderH = (canvas.height * maxW) / canvas.width;

      pdf.addImage(imgData, 'PNG', marginX, marginY, maxW, renderH);
      pdf.save(filename);
      if (showToast) showToast(`Downloaded ${filename} successfully!`, 'success');
    } catch (err) {
      console.error('PDF export failed, trying fallback:', err);
      try {
        const opt = {
          margin: [10, 10, 10, 10],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(payslipRef.current.querySelector('[data-payslip-inner="true"]') || payslipRef.current).save();
      } catch (fallbackErr) {
        console.error('All PDF export failed:', fallbackErr);
        if (showToast) showToast('Error generating PDF.', 'error');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async (emailToUse) => {
    const finalEmail = emailToUse || targetEmail;
    if (!salaryRecord?._id) return;
    if (!finalEmail || !finalEmail.trim()) {
      if (showToast) showToast('Please enter a valid recipient email.', 'error');
      return;
    }

    setShowEmailModal(false);
    if (onClose) onClose();
    if (showToast) showToast(`Sending wage slip email to ${finalEmail.trim()}...`, 'info');

    setSendingEmail(true);
    try {
      const payload = {
        email: finalEmail.trim(),
        brevoApiKey: import.meta.env.VITE_BREVO_API_KEY,
        senderEmail: import.meta.env.VITE_EMAIL_SENDER_ADDRESS,
        senderName: import.meta.env.VITE_EMAIL_SENDER_NAME
      };
      const res = await sendSalaryPayslipEmail(salaryRecord._id, payload);
      if (res?.success !== false) {
        if (showToast) showToast(`Wage slip email sent to ${finalEmail.trim()}!`, 'success');
      } else {
        if (showToast) showToast(res?.message || 'Failed to send email.', 'error');
      }
    } catch (err) {
      console.error('Error sending wage slip email:', err);
      if (showToast) showToast(err?.response?.data?.message || 'Error sending wage slip email.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const renderStatusBadge = (st) => {
    switch (st) {
      case 'COMPLETED':
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={12} /> {st === 'COMPLETED' ? 'Completed' : 'Approved'}
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
            <Clock size={12} /> Partially Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-white text-slate-900 rounded-3xl shadow-2xl my-auto flex flex-col w-full overflow-hidden border border-slate-200 ${
            isSmall ? 'max-w-md' : 'max-w-xl'
          }`}
        >
          {/* Top Action Control Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Official Wage Slip</h3>
                <p className="text-[11px] text-slate-500 font-medium">{empName} — {monthPeriod}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Print Wage Slip"
              >
                <Printer size={13} /> Print
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition flex items-center gap-1 cursor-pointer"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                <span>{downloading ? 'Downloading...' : 'PDF'}</span>
              </button>
              <button
                onClick={() => {
                  const empEmail = salaryRecord?.employee?.email || salaryRecord?.email || targetEmail || '';
                  setTargetEmail(empEmail);
                  setShowEmailModal(true);
                }}
                disabled={sendingEmail}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition flex items-center gap-1 cursor-pointer"
              >
                {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                <span>Email</span>
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                title="Delete Wage Entry"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Printable Minimal Wage Slip Body */}
          <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900" ref={payslipRef}>
            <div
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 text-slate-800"
              data-payslip-inner="true"
            >
              {/* Header: Company Name & Slip Title */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo3.png"
                    alt="Logo"
                    className="h-10 w-auto object-contain"
                    crossOrigin="anonymous"
                  />
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-wide uppercase">KODBRAND SOLUTIONS</h2>
                    <p className="text-[11px] text-slate-500 font-semibold">Authorized Employee Daily Wage Slip</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-black text-xs uppercase tracking-wider">
                    WAGE SLIP
                  </span>
                  <p className="text-[11px] text-slate-400 font-bold mt-1">Date: {paymentDateStr}</p>
                </div>
              </div>

              {/* Employee & Payment Summary Table */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Employee Name</span>
                  <span className="text-sm font-black text-slate-900">{empName}</span>
                  <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">ID: {empCode}</span>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Designation / Dept</span>
                  <span className="text-xs font-bold text-slate-800">{designation}</span>
                  <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">{department}</span>
                </div>
              </div>

              {/* Wage Breakup Particulars */}
              <div className="space-y-2 text-xs">
                <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-slate-500">Wage Details</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  <div className="flex justify-between p-2.5 bg-white font-medium">
                    <span className="text-slate-600">Date Added</span>
                    <span className="font-bold text-slate-900">{dateAddedStr}</span>
                  </div>

                  {dailyRate > 0 && (
                    <div className="flex justify-between p-2.5 bg-white font-medium">
                      <span className="text-slate-600">Daily Wage Rate × Days Worked</span>
                      <span className="font-bold text-slate-900">₹{dailyRate} × {daysWorked} day(s)</span>
                    </div>
                  )}

                  <div className="flex justify-between p-2.5 bg-white font-medium">
                    <span className="text-slate-600">Payment Mode</span>
                    <span className="font-bold text-slate-900">{paymentMode}</span>
                  </div>

                  <div className="flex justify-between p-2.5 bg-white font-medium items-center">
                    <span className="text-slate-600">Status</span>
                    <StatusSelectPill
                      value={currentStatus}
                      onChange={(newStatus) => handleStatusUpdate(newStatus)}
                    />
                  </div>

                  {remarks && (
                    <div className="flex justify-between p-2.5 bg-slate-50/50 font-medium">
                      <span className="text-slate-600">Remarks</span>
                      <span className="font-semibold text-slate-800 max-w-[240px] text-right">{remarks}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Summary Highlight */}
              {currentStatus === 'PARTIALLY_PAID' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl">
                    <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Wage</span>
                    <span className="text-base font-black text-slate-900">
                      ₹{Number(salaryRecord.basicSalary || salaryRecord.totalEarnings || paidAmount).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <span className="block text-[10px] font-black uppercase text-emerald-700 tracking-wider">Paid Amount</span>
                    <span className="text-base font-black text-emerald-700">
                      ₹{paidAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                    <span className="block text-[10px] font-black uppercase text-rose-600 tracking-wider">Remaining Balance</span>
                    <span className="text-base font-black text-rose-700">
                      -₹{Math.max(0, Number(salaryRecord.basicSalary || salaryRecord.totalEarnings || paidAmount) - paidAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <span className="block text-[10px] font-black uppercase text-emerald-100 tracking-wider">Total Wage Amount Paid</span>
                    <span className="text-xs text-emerald-50">Net amount disbursed to employee</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    ₹{paidAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              {/* Footer Signatory */}
              <div className="flex items-end justify-between pt-6 border-t border-slate-200 text-xs">
                <div className="text-[10px] text-slate-400 font-medium space-y-0.5">
                  <p className="font-bold text-slate-600">KODBRAND SOLUTIONS</p>
                  <p>3rd Floor, Aranyakam Building, Up Hill, Malappuram</p>
                </div>

                <div className="text-center space-y-1">
                  <div className="h-8 border-b border-slate-300 w-32 mx-auto"></div>
                  <span className="block text-[10px] font-bold text-slate-600">Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Wage Record"
        message="Are you sure you want to delete this wage record? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      {/* Partial Payment Modal */}
      {partialModalOpen && (
        <PartialPaymentModal
          isOpen={partialModalOpen}
          onClose={() => setPartialModalOpen(false)}
          record={salaryRecord}
          onConfirm={handlePartialConfirm}
        />
      )}

      {/* Email Prompt Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60" onClick={() => setShowEmailModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Send Wage Slip via Email</h3>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Recipient Email Address</label>
              <input
                type="email"
                value={targetEmail}
                onChange={e => setTargetEmail(e.target.value)}
                placeholder="employee@example.com"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendEmail(targetEmail)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PayslipModal;
