import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Printer, 
  Download, 
  Loader2, 
  MessageCircle
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { updateSalaryPayment } from '../../services/accountsService';
import { useToast } from '../ToastProvider';
import StatusSelectPill from './StatusSelectPill';
import PartialPaymentModal from './PartialPaymentModal';

// Number to Indian currency words
export const convertNumberToWords = (num) => {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  
  return str.trim() ? str.trim() + ' Rupees Only' : 'Zero Rupees Only';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateStr);
  }
};

const PayslipModal = ({ isOpen, onClose, salaryRecord, onSaved }) => {
  const payslipRef = useRef(null);
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('PENDING');
  const [partialModalOpen, setPartialModalOpen] = useState(false);

  useEffect(() => {
    if (salaryRecord) {
      setCurrentStatus(salaryRecord?.status || 'PENDING');
    }
  }, [salaryRecord]);

  if (!isOpen || !salaryRecord) return null;

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

  const handlePrint = () => window.print();

  // Employee details
  const empName = salaryRecord.employeeName || salaryRecord.employee?.name || 'Staff Member';
  const empCode = salaryRecord.kbEmployeeId || salaryRecord.employee?.employeeId || (salaryRecord._id ? `EMP-${salaryRecord._id.slice(-4).toUpperCase()}` : 'EMP-FT');
  const designation = salaryRecord.designation || salaryRecord.employee?.designationName || 'Technician / Worker';
  const department = salaryRecord.department || salaryRecord.employee?.departmentId?.name || 'Fabrication Operations';
  const monthPeriod = salaryRecord.month || (salaryRecord.paymentDate ? new Date(salaryRecord.paymentDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
  
  const paymentDateStr = formatDate(salaryRecord.paymentDate || salaryRecord.createdAt);
  const paidAmount = Number(salaryRecord.paidAmount ?? salaryRecord.customNetPay ?? salaryRecord.basicSalary ?? 0);
  const dailyRate = Number(salaryRecord.basicSalary || salaryRecord.dailyWageRate || paidAmount);
  const paymentMode = salaryRecord.paymentMode || 'Cash';
  const remarks = salaryRecord.remarks || '';
  const workerPhone = salaryRecord.employee?.phone || salaryRecord.employee?.mobile || salaryRecord.phone || '';
  
  // Voucher Number
  const slipNo = salaryRecord.voucherNo || (salaryRecord._id ? `WS-${salaryRecord._id.slice(-6).toUpperCase()}` : `WS-${Date.now().toString().slice(-6)}`);

  // WhatsApp Share Handler
  const handleWhatsAppShare = () => {
    const rawPhone = String(workerPhone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = `*WAGE SLIP - FABTEC WORKS*\n────────────────────\n🧾 *Slip No:* ${slipNo}\n📅 *Date:* ${paymentDateStr}\n👤 *Employee:* ${empName} (${empCode})\n💼 *Role:* ${designation}\n💰 *Daily Wage:* ₹${dailyRate.toLocaleString('en-IN')}\n💵 *Net Paid:* ₹${paidAmount.toLocaleString('en-IN')}\n💳 *Mode:* ${paymentMode}\n📌 *Status:* ${currentStatus}\n${remarks ? `📝 *Remarks:* ${remarks}\n` : ''}────────────────────\n*FABTEC WORKS & ENGINEERING*\nVengoor, Kerala • Ph: +91 81398 77848`;
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Download PDF Handler
  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;
    setDownloading(true);
    const cleanEmp = empName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanSlipNo = slipNo.replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `Wage_Slip_${cleanSlipNo}_${cleanEmp}.pdf`;

    // Helper to sanitize cloned doc styles (converts Tailwind v4 oklch colors)
    const sanitizeClonedDocStyles = (clonedDoc) => {
      try {
        const replaceOklch = (str) => {
          if (!str || typeof str !== 'string') return str;
          return str
            .replace(/oklch\([^)]+\)/gi, '#059669')
            .replace(/oklab\([^)]+\)/gi, '#059669')
            .replace(/color-mix\([^)]+\)/gi, '#059669');
        };

        const styleElements = clonedDoc.querySelectorAll('style');
        styleElements.forEach((style) => {
          try {
            if (style.textContent) style.textContent = replaceOklch(style.textContent);
          } catch (e) {}
        });

        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          try {
            const inlineStyle = el.getAttribute('style');
            if (inlineStyle && (inlineStyle.includes('oklab') || inlineStyle.includes('oklch') || inlineStyle.includes('color-mix'))) {
              el.setAttribute('style', replaceOklch(inlineStyle));
            }
          } catch (e) {}
        });
      } catch (e) {}
    };

    try {
      const element = payslipRef.current.querySelector('[data-payslip-inner="true"]') || payslipRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: sanitizeClonedDocStyles
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;
      const usableWidth = pdfWidth - (margin * 2);
      const usableHeight = pageHeight - (margin * 2);
      const ratio = Math.min(usableWidth / canvas.width, usableHeight / canvas.height);
      const renderWidth = canvas.width * ratio;
      const renderHeight = canvas.height * ratio;
      const xOffset = margin + (usableWidth - renderWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);
      pdf.save(filename);
      if (showToast) showToast(`Downloaded ${filename} successfully!`, 'success');
    } catch (err) {
      console.error('PDF export failed:', err);
      try {
        window.print();
      } catch (e) {
        if (showToast) showToast('Error generating PDF.', 'error');
      }
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="bg-white rounded-2xl max-w-xl w-full flex flex-col shadow-xl border border-slate-200 overflow-hidden my-auto"
        >
          {/* Minimalist Top Control Bar */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">Wage Slip</span>
              <span className="font-mono text-xs text-slate-400">#{slipNo}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                title="Share via WhatsApp"
              >
                <MessageCircle size={14} />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                title="Print Wage Slip"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Download PDF"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer ml-1"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Minimalist Printable Wage Slip Canvas */}
          <div className="p-5 sm:p-7 bg-slate-50 flex justify-center" ref={payslipRef}>
            <div
              className="w-full bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 space-y-4"
              data-payslip-inner="true"
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                backgroundColor: '#ffffff',
                color: '#0f172a'
              }}
            >
              {/* Header: Company & Slip Identity */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div className="space-y-0.5">
                  <h2 className="text-base font-black tracking-tight text-slate-900">
                    FABTEC WORKS & ENGINEERING
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Vengoor, Kerala • Ph: +91 81398 77848, +91 77366 92975
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    WAGE SLIP
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-700 block">
                    {slipNo}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Date: {paymentDateStr}
                  </span>
                </div>
              </div>

              {/* Minimal Employee & Payment Profile */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-3 border-b border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Employee
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {empName}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] ml-1">
                    ({empCode})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Role / Dept
                  </span>
                  <span className="text-slate-800 font-medium">
                    {designation}
                  </span>
                  {department && (
                    <span className="text-slate-500"> • {department}</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Payment Mode & Period
                  </span>
                  <span className="text-slate-800 font-medium">
                    {paymentMode}
                  </span>
                  <span className="text-slate-500"> ({monthPeriod})</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
                    Status
                  </span>
                  <div className="scale-95 origin-left">
                    <StatusSelectPill
                      value={currentStatus}
                      onChange={(newStatus) => handleStatusUpdate(newStatus)}
                    />
                  </div>
                </div>
              </div>

              {/* Clean Minimal Wage Breakdown */}
              <div className="py-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="text-left pb-2 font-semibold">Particulars</th>
                      <th className="text-right pb-2 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    <tr>
                      <td className="py-3 pr-2">
                        <div className="font-semibold text-slate-900">Daily Wage</div>
                        {remarks && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {remarks}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        ₹{dailyRate.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Minimal Net Pay Summary */}
              {currentStatus === 'PARTIALLY_PAID' ? (
                <div className="py-3 border-t border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Wage Entitled:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ₹{Number(salaryRecord.basicSalary || salaryRecord.totalEarnings || paidAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Disbursed Amount:</span>
                    <span className="font-mono text-sm">
                      ₹{paidAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Remaining Balance:</span>
                    <span className="font-mono text-sm">
                      ₹{Math.max(0, Number(salaryRecord.basicSalary || salaryRecord.totalEarnings || paidAmount) - paidAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline justify-between pt-3 pb-1 border-t-2 border-slate-900">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Net Wage Disbursed
                    </span>
                    <span className="text-[11px] text-slate-500 italic">
                      {convertNumberToWords(paidAmount)}
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    ₹{paidAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              {/* Minimal Signatures Footer */}
              <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
                <div className="text-center">
                  <div className="w-28 border-b border-slate-300 mb-1"></div>
                  <span className="text-[10px] text-slate-400">Worker Signature</span>
                </div>
                <div className="text-center">
                  <div className="w-28 border-b border-slate-300 mb-1"></div>
                  <span className="text-[10px] font-semibold text-slate-700">Authorized Signatory</span>
                  <p className="text-[9px] text-slate-400">FABTEC WORKS</p>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>

      {/* Partial Payment Modal */}
      {partialModalOpen && (
        <PartialPaymentModal
          isOpen={partialModalOpen}
          onClose={() => setPartialModalOpen(false)}
          record={salaryRecord}
          onConfirm={handlePartialConfirm}
        />
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PayslipModal;