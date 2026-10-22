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
  ShieldCheck,
  MessageCircle,
  Phone,
  MapPin,
  Building2,
  Loader2
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from '../ToastProvider';

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
    return String(dateStr);
  }
};

/**
 * Universal Premium Payment Receipt Modal
 * Supports:
 *  1. Fabrication Mode: { payment, paymentIndex, job, financials }
 *  2. Accounts Income Mode: { receiptData, incomeRecord, settlementData }
 */
const PaymentReceiptModal = ({
  isOpen,
  onClose,
  payment = null,
  paymentIndex = 0,
  job = null,
  financials = null,
  receiptData = null,
  incomeRecord = null,
  settlementData = null
}) => {
  const receiptRef = useRef(null);
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);

  if (!isOpen) return null;

  // Resolve normalized fields from either Fabrication or Accounts data sources
  const resolvedPayment = payment || settlementData || {};
  const resolvedJob = job || (incomeRecord ? {
    jobId: incomeRecord.referenceNo || incomeRecord.orderNumber || incomeRecord.syncSource?.fabricationJobId || 'FAB',
    jobNumber: incomeRecord.referenceNo || incomeRecord.orderNumber || incomeRecord.syncSource?.fabricationJobId || 'FAB',
    clientName: incomeRecord.clientName || incomeRecord.companyName || receiptData?.company || 'Valued Client',
    clientPhone: incomeRecord.clientPhone || incomeRecord.phone || '',
    siteAddress: incomeRecord.siteAddress || incomeRecord.address || '',
    quotationItems: incomeRecord.lineItems || []
  } : {});

  // Receipt Number
  let receiptNo = '';
  if (receiptData?.receiptNo) {
    receiptNo = receiptData.receiptNo;
  } else if (resolvedPayment.transactionReference) {
    receiptNo = resolvedPayment.transactionReference;
  } else if (resolvedPayment.receiptNo) {
    receiptNo = resolvedPayment.receiptNo;
  } else {
    const rawJobNo = (resolvedJob.jobNumber || resolvedJob.jobId || 'FAB').replace(/[^a-zA-Z0-9-]/g, '');
    receiptNo = `REC-${rawJobNo}-${String((paymentIndex || 0) + 1).padStart(2, '0')}`;
  }

  // Payment Amount
  const paymentAmount = parseFloat(
    resolvedPayment.amount !== undefined 
      ? resolvedPayment.amount 
      : (receiptData?.amountPaid !== undefined ? receiptData.amountPaid : (incomeRecord?.receiptAmount || 0))
  ) || 0;

  // Payment Date
  const paymentDate = resolvedPayment.date || resolvedPayment.receiptDate || receiptData?.receiptDate || incomeRecord?.date || new Date();

  // Payment Mode
  const paymentMode = resolvedPayment.paymentMode || resolvedPayment.paymentMethod || receiptData?.wayOfIncome || incomeRecord?.paymentMethod || 'Cash';

  // Remarks / Notes
  const paymentNotes = resolvedPayment.notes || receiptData?.notes || incomeRecord?.notes || '';

  // Financials & Balances
  const totalQuotationValue = financials?.totalQuotation !== undefined
    ? Number(financials.totalQuotation)
    : Number(incomeRecord?.totalAmount || incomeRecord?.amount || paymentAmount);

  const totalPaidToDate = financials?.totalAmountReceived !== undefined
    ? Number(financials.totalAmountReceived)
    : (Array.isArray(incomeRecord?.payments) && incomeRecord.payments.length > 0
        ? incomeRecord.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
        : Number(incomeRecord?.receiptAmount || paymentAmount));

  const balanceDue = financials?.balanceDue !== undefined
    ? Number(financials.balanceDue)
    : Math.max(0, totalQuotationValue - totalPaidToDate);

  const isFullyPaid = balanceDue <= 0.01 && totalQuotationValue > 0;

  // Work Scope / Line Items Summary
  const lineItems = (resolvedJob.quotationItems || incomeRecord?.lineItems || []);
  const workSummary = lineItems.length > 0
    ? lineItems.map(i => i.description).join(', ')
    : (resolvedJob.jobTitle || incomeRecord?.title || 'Fabrication Work Order');

  // Robust Direct PDF Download Handler
  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    const cleanClient = (resolvedJob.clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanRecNo = receiptNo.replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `Receipt_${cleanRecNo}_${cleanClient}.pdf`;

    // Helper to sanitize cloned doc for html2canvas (converts Tailwind v4 oklch colors)
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
      const element = receiptRef.current;
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

      // Fit into exactly 1 single A4 sheet with 6mm margins
      const margin = 6;
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
    } catch (directErr) {
      console.warn('Direct jsPDF export failed, trying html2pdf fallback:', directErr);
      try {
        const element = receiptRef.current;
        const opt = {
          margin: [6, 6, 6, 6],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: sanitizeClonedDocStyles
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const html2pdfFunc = typeof html2pdf === 'function' ? html2pdf : (html2pdf.default || window.html2pdf);
        if (typeof html2pdfFunc === 'function') {
          await html2pdfFunc().set(opt).from(element).save();
          if (showToast) showToast(`Downloaded ${filename} successfully!`, 'success');
        } else {
          window.print();
        }
      } catch (fallbackErr) {
        console.error('All PDF export failed:', fallbackErr);
        window.print();
      }
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share Handler
  const handleWhatsAppShare = () => {
    const rawPhone = String(resolvedJob.clientPhone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = `*PAYMENT ACKNOWLEDGEMENT RECEIPT*\n--------------------------------\n🧾 *Receipt No:* ${receiptNo}\n📅 *Date:* ${formatDate(paymentDate)}\n👤 *Client:* ${resolvedJob.clientName || 'Valued Client'}\n💵 *Amount Received:* ₹${paymentAmount.toLocaleString('en-IN')}\n💳 *Payment Mode:* ${paymentMode}\n💼 *Ref / Order:* #${resolvedJob.jobNumber || resolvedJob.jobId || 'FAB'}\n💰 *Total Work Order:* ₹${totalQuotationValue.toLocaleString('en-IN')}\n⚠️ *Balance Remaining:* ₹${balanceDue.toLocaleString('en-IN')}\n--------------------------------\nThank you for your business!`;
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden max-h-[96vh]">
        
        {/* Top Executive Control Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Receipt size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Official Payment Receipt Voucher
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {receiptNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Verified financial payment acknowledgement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title="Share Receipt on WhatsApp"
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700 shadow-xs"
              title="Print Receipt"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              title="Download Receipt PDF"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{downloading ? 'Downloading...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          
          {/* Printable Receipt Canvas (Fits Perfectly on Single A4 Sheet) */}
          <div
            ref={receiptRef}
            className="w-full max-w-[700px] bg-white text-slate-900 p-7 sm:p-8 rounded-2xl shadow-lg border border-slate-200/90 space-y-4.5 relative overflow-hidden h-fit"
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          >
            {/* Top Multi-Tone Executive Accent Line */}
            <div 
              style={{ height: '4px', background: 'linear-gradient(90deg, #065f46 0%, #059669 35%, #0284c7 70%, #0f172a 100%)' }} 
              className="w-full rounded-full" 
            />

            {/* Header: Company Logo & Document Identity */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex flex-col items-start space-y-1">
                {logoLoaded ? (
                  <img 
                    src="/logo3.png" 
                    alt="FABTEC Logo" 
                    onError={() => setLogoLoaded(false)}
                    className="h-12 w-auto max-w-[200px] object-contain shrink-0" 
                  />
                ) : (
                  <div className="h-10 px-3.5 rounded-xl bg-slate-900 text-white flex items-center gap-2 font-black text-base shadow-xs shrink-0">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs">F</span>
                    <span>FABTEC</span>
                  </div>
                )}

                {/* Company Address & Contacts */}
                <div className="text-[11px] leading-tight space-y-0.5 pt-1 text-slate-600 font-medium">
                  <p>Workshop & Site Office: Vengoor, Kerala, India</p>
                  <p className="font-mono text-slate-700">Ph: +91 81398 77848, +91 77366 92975</p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end space-y-1">
                <div 
                  style={{ letterSpacing: '1.5px', backgroundColor: '#065f46', color: '#ffffff' }}
                  className="inline-block px-3 py-1 text-[10px] font-black uppercase rounded-md shadow-2xs"
                >
                  PAYMENT RECEIPT
                </div>
                <p className="font-mono font-black text-base text-slate-900 tracking-tight">
                  {receiptNo}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Date: <strong className="text-slate-900">{formatDate(paymentDate)}</strong></span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Ref Order: <strong className="text-slate-800">#{resolvedJob.jobNumber || resolvedJob.jobId || 'FAB'}</strong>
                </div>
              </div>
            </div>

            {/* Received From & Transaction Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Received From Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Payment Received From (Client)
                </span>
                <p className="font-black text-sm text-slate-900">
                  {resolvedJob.clientName || 'Valued Client'}
                </p>
                {resolvedJob.clientPhone && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                    <Phone size={11} className="text-slate-400 shrink-0" />
                    <span>{resolvedJob.clientPhone}</span>
                  </div>
                )}
                {resolvedJob.siteAddress && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    <span className="line-clamp-1">{resolvedJob.siteAddress}</span>
                  </div>
                )}
              </div>

              {/* Transaction Particulars Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Payment Mode
                </span>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">Payment Mode:</span>
                  <span className="font-bold text-slate-900 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs">
                    {paymentMode}
                  </span>
                </div>
              </div>
            </div>

            {/* Prominent Amount Spotlight Hero Card */}
            <div 
              className="p-5 rounded-2xl border text-center space-y-1.5 shadow-2xs"
              style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}
            >
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                Amount Received
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-900 tracking-tight">
                {formatCurrency(paymentAmount)}
              </div>
              <p className="text-xs font-semibold text-emerald-800 italic max-w-md mx-auto pt-0.5">
                {convertNumberToWords(paymentAmount)}
              </p>
            </div>

            {/* Work Order Description / Scope Context */}
            {workSummary && (
              <div className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Work Scope / Quotation Reference
                </span>
                <p className="font-semibold text-slate-800 line-clamp-2">
                  {workSummary}
                </p>
              </div>
            )}

            {/* Account Financials Summary Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[9.5px] tracking-wider">
                    <th className="py-2.5 px-3.5">Total Quoted Work Order</th>
                    <th className="py-2.5 px-3.5 text-center">Total Paid To Date</th>
                    <th className="py-2.5 px-3.5 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-slate-50/60 font-semibold">
                  <tr>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {formatCurrency(totalQuotationValue)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                      {formatCurrency(totalPaidToDate)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600 text-xs sm:text-sm">
                      {isFullyPaid ? (
                        <span className="text-emerald-600 font-bold">₹0 (Paid in Full)</span>
                      ) : (
                        formatCurrency(balanceDue)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Remarks if present */}
            {paymentNotes && (
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Remarks</span>
                <p className="text-slate-700 italic">{paymentNotes}</p>
              </div>
            )}

            {/* Declarations & Authorized Signatures Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2 text-center sm:text-left">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 text-xs">Official Payment Voucher</p>
                  <p className="text-[10px] text-slate-400">
                    Computer generated receipt • Verified & credited to company account
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right shrink-0">
                <div className="w-40 border-b border-dashed border-slate-400 mb-1 ml-auto"></div>
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Authorized Signatory
                </p>
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
