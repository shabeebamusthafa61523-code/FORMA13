import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Printer, 
  Receipt, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  Hash, 
  User, 
  Briefcase, 
  MapPin, 
  Phone
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

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

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
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
    return dateStr;
  }
};

const PaymentReceiptModal = ({
  isOpen,
  onClose,
  payment = null,
  paymentIndex = 0,
  job = {},
  financials = {}
}) => {
  const receiptRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);

  if (!isOpen || !payment) return null;

  const rawJobNo = (job.jobNumber || 'FAB').replace(/[^a-zA-Z0-9-]/g, '');
  const receiptNo = `REC-${rawJobNo}-${String(paymentIndex + 1).padStart(2, '0')}`;
  const paymentAmount = parseFloat(payment.amount) || 0;

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setDownloading(true);
      const element = receiptRef.current;
      const cleanClient = (job.clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${receiptNo}_${cleanClient}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const html2pdfFunc = typeof html2pdf === 'function' ? html2pdf : (html2pdf.default || window.html2pdf);
      if (typeof html2pdfFunc === 'function') {
        await html2pdfFunc().set(opt).from(element).save();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden max-h-[95vh]">
        
        {/* Top Control Bar */}
        <div className="p-4 sm:px-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Payment Receipt Voucher
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {receiptNo}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official acknowledgement receipt for payment received
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Print Receipt"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title="Download Receipt PDF"
            >
              <Download size={15} />
              <span>{downloading ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 bg-slate-100/90 flex justify-center">
          
          {/* Printable Receipt Canvas */}
          <div
            ref={receiptRef}
            className="w-full max-w-[760px] bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200 space-y-6 relative overflow-hidden h-fit"
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          >
            {/* Top Emerald Gradient Line */}
            <div 
              style={{ height: '4px', background: 'linear-gradient(90deg, #065f46 0%, #059669 35%, #0284c7 70%, #0f172a 100%)' }} 
              className="w-full rounded-full" 
            />

            {/* Header: Company Logo & Document Title */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex flex-col items-start space-y-1">
                {logoLoaded ? (
                  <img 
                    src="/logo3.png" 
                    alt="FABTEC Logo" 
                    onError={() => setLogoLoaded(false)}
                    className="h-14 w-auto max-w-[220px] object-contain shrink-0" 
                  />
                ) : (
                  <div className="h-12 px-4 rounded-xl bg-slate-900 text-white flex items-center gap-2 font-black text-lg shadow-sm shrink-0">
                    <span className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-sm">F</span>
                    <span>FABTEC</span>
                  </div>
                )}

                {/* Company Address & Phone Details */}
                <div className="text-[11px] leading-tight space-y-0.5 pt-1 font-medium" style={{ color: '#475569' }}>
                  <p>Vengoor</p>
                  <p>8139877848, 7736692975</p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end space-y-1.5">
                <div 
                  style={{ letterSpacing: '2px', backgroundColor: '#065f46', color: '#ffffff' }}
                  className="inline-block px-3.5 py-1 text-[11px] font-black uppercase rounded-md shadow-xs"
                >
                  PAYMENT RECEIPT
                </div>
                <p className="font-mono font-bold text-sm text-slate-900">
                  {receiptNo}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Date: <strong>{formatDate(payment.date)}</strong></span>
                </div>
              </div>
            </div>

            {/* Received From & Project Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Received From Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Received From (Client)
                </span>
                <p className="font-black text-sm text-slate-900">
                  {job.clientName || 'Valued Client'}
                </p>
                {job.clientPhone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Phone size={12} className="text-slate-400" />
                    <span>{job.clientPhone}</span>
                  </div>
                )}
                {job.siteAddress && (
                  <div className="flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <span>{job.siteAddress}</span>
                  </div>
                )}
              </div>

              {/* Work Order / Project Reference Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Job Order Reference
                </span>
                <p className="font-bold text-sm text-slate-900">
                  Workspace Work Order #{job.jobNumber || job.jobId || '—'}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Briefcase size={12} className="text-slate-400" />
                  <span>Job #: <strong className="font-mono">{job.jobNumber || '—'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Payment Status: Received & Verified</span>
                </div>
              </div>
            </div>

            {/* Prominent Amount Highlight Card */}
            <div 
              className="p-6 rounded-2xl border text-center space-y-2"
              style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                Amount Received
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-800 tracking-tight">
                {formatCurrency(paymentAmount)}
              </div>
              <p className="text-xs font-semibold text-emerald-900 italic max-w-lg mx-auto">
                {convertNumberToWords(paymentAmount)}
              </p>
            </div>

            {/* Payment Transaction Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Payment Mode</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {payment.paymentMode || 'Cash'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Transaction / Ref #</span>
                <span className="font-mono font-semibold text-slate-800 text-xs mt-0.5 block truncate" title={payment.transactionReference}>
                  {payment.transactionReference || 'N/A (Cash)'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Payment Date</span>
                <span className="font-medium text-slate-800 text-xs mt-0.5 block">
                  {formatDate(payment.date)}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Received By</span>
                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                  {payment.receivedBy || 'Staff'}
                </span>
              </div>
            </div>

            {/* Payment Notes if present */}
            {payment.notes && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Payment Remarks</span>
                <p className="text-slate-700 italic">{payment.notes}</p>
              </div>
            )}

            {/* Account Financials Summary Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Total Quoted Work Order</th>
                    <th className="py-2.5 px-3 text-center">Total Paid To Date</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-slate-50/50">
                  <tr className="font-semibold">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(financials.totalQuotation || 0)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 text-sm">
                      {formatCurrency(financials.totalAmountReceived || 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(financials.balanceDue || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures & Declarations Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
              <div className="space-y-1 text-center sm:text-left">
                <p className="font-semibold text-slate-700">Thank you for your business!</p>
                <p className="text-[11px] text-slate-400">
                  This official payment voucher acknowledges receipt of the funds indicated above.
                </p>
              </div>

              <div className="text-center sm:text-right shrink-0 pt-4 sm:pt-0">
                <div className="w-48 border-b border-dashed border-slate-400 mb-2"></div>
                <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Authorized Signatory
                </p>
                <p className="text-[10px] text-slate-400">FABTEC WORKS & ENGINEERING</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentReceiptModal;
