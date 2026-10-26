import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Building2,
  Calendar,
  CreditCard,
  Hash,
  User,
  MapPin,
  Phone,
  Briefcase,
  DollarSign,
  ShoppingCart,
  Users,
  Layers,
  ArrowRight
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  return str.trim() ? 'Rupees ' + str.trim() + ' Only' : 'Zero Rupees Only';
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) 
      ? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

const OverallFabricationLedgerModal = ({
  isOpen,
  onClose,
  job,
  client,
  financials = {}
}) => {
  const documentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);

  if (!isOpen) return null;

  // Resolve client & job details
  const clientName = client?.companyName || client?.clientName || client?.name || job?.clientName || job?.client?.name || 'Valued Client';
  const phone = client?.phone || job?.clientPhone || job?.client?.phone || '';
  const siteAddress = client?.address || job?.siteAddress || job?.client?.address || '';
  const ledgerNumber = `FAB-LEDGER-${(job?.jobId || 'PROJECT').replace(/[^a-zA-Z0-9-]/g, '')}`;
  const reportDate = formatDate(new Date());

  // Data collections - ONLY show tables that have data
  const quotationItems = job?.quotationItems || [];
  const purchasesAndExpenses = job?.purchasesAndExpenses || [];
  const dailyWages = job?.dailyWages || [];
  const clientPayments = job?.clientPayments || [];

  // Financial metrics
  const totalQuotation = financials.totalQuotation || 0;
  const totalReceived = financials.totalAmountReceived || 0;
  const balanceDue = financials.balanceDue ?? Math.max(0, totalQuotation - totalReceived);
  const totalPurchases = financials.totalPurchases || 0;
  const totalWages = financials.totalWages || 0;
  const totalExpenses = financials.totalExpenses || 0;
  const totalDirectCost = financials.totalDirectCost || (totalPurchases + totalWages + totalExpenses);
  const netProfit = financials.netProfit ?? (totalReceived - totalDirectCost);

  const hasAnyData = quotationItems.length > 0 || purchasesAndExpenses.length > 0 || dailyWages.length > 0 || clientPayments.length > 0;

  // PDF Download Handler
  const handleDownloadPdf = async () => {
    const element = documentRef.current;
    if (!element) return;

    setDownloading(true);
    try {
      const cleanClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Overall_Ledger_Report_${cleanClient}_${job?.jobId || 'FAB'}.pdf`;

      // Helper to sanitize Tailwind v4 oklch/oklab styles for html2canvas
      const sanitizeClonedDocStyles = (clonedDoc) => {
        try {
          const replaceOklch = (str) => {
            if (!str || typeof str !== 'string') return str;
            return str
              .replace(/oklch\([^)]+\)/gi, '#4f46e5')
              .replace(/oklab\([^)]+\)/gi, '#4f46e5')
              .replace(/color-mix\([^)]+\)/gi, '#4f46e5');
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
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const html2pdfFunc = typeof html2pdf === 'function' ? html2pdf : (html2pdf.default || window.html2pdf);
      if (typeof html2pdfFunc === 'function') {
        await html2pdfFunc().set(opt).from(element).save();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Failed to generate Overall PDF:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-5xl max-h-[96vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Overall Project Ledger PDF
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                  Data Tables Only
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Complete fabrication reconciliation report containing all populated data tables
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
              title="Print document"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Download Overall PDF</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ACTIVE DATA TABLES STATUS BAR */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap text-slate-600 font-medium">
            <span className="text-[10px] uppercase font-bold text-slate-400">Tables Included in PDF:</span>
            {quotationItems.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[10.5px]">
                ✓ 1. Quotation ({quotationItems.length})
              </span>
            )}
            {purchasesAndExpenses.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10.5px]">
                ✓ 2. Purchases & Expenses ({purchasesAndExpenses.length})
              </span>
            )}
            {dailyWages.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[10.5px]">
                ✓ 3. Daily Wages ({dailyWages.length})
              </span>
            )}
            {clientPayments.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10.5px]">
                ✓ 4. Payments ({clientPayments.length})
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold text-[10.5px]">
              ✓ 5. Financial Summary
            </span>
          </div>

          <div className="flex items-center gap-2 font-bold text-xs text-slate-700">
            <span>Quoted: <strong className="text-slate-900">{formatCurrency(totalQuotation)}</strong></span>
            <span>•</span>
            <span>Received: <strong className="text-emerald-700">{formatCurrency(totalReceived)}</strong></span>
            <span>•</span>
            <span>Margin: <strong className={netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}>{formatCurrency(netProfit)}</strong></span>
          </div>
        </div>

        {/* SCROLLABLE DOCUMENT PREVIEW */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 bg-slate-100/90 flex justify-center">
          
          {/* PRINTABLE LEDGER CANVAS */}
          <div 
            ref={documentRef}
            id="printable-overall-fabrication-ledger"
            className="w-full max-w-[820px] bg-white text-slate-900 px-6 sm:px-8 py-6 rounded-2xl shadow-xl border border-slate-200 space-y-5 relative overflow-hidden h-fit"
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          >
            {/* Print Stylesheet */}
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #printable-overall-fabrication-ledger, #printable-overall-fabrication-ledger * { visibility: visible !important; }
                #printable-overall-fabrication-ledger {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 16px 20px !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .pdf-table-section {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 8mm;
                }
              }
            `}</style>

            {/* Top Accent Line */}
            <div style={{ height: '3px', backgroundColor: '#0f172a' }} className="w-full rounded-full" />

            {/* Header: Company Info & Document Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex flex-col items-start space-y-1">
                {logoLoaded ? (
                  <img 
                    src="/logo3.png" 
                    alt="FABTEC Logo" 
                    onError={() => setLogoLoaded(false)}
                    className="h-12 w-auto max-w-[200px] object-contain shrink-0" 
                  />
                ) : (
                  <div className="h-11 px-4 rounded-xl bg-slate-900 text-white flex items-center gap-2 font-black text-base shadow-sm shrink-0">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs">F</span>
                    <span>FABTEC</span>
                  </div>
                )}
                <div className="text-[10px] leading-tight space-y-0.5 pt-0.5 font-medium" style={{ color: '#475569' }}>
                  <p className="font-bold text-slate-800">FABTEC FABRICATION & ENGINEERING WORKS</p>
                  <p>Vengoor</p>
                  <p>Phone: 8139877848, 7736692975</p>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                  OVERALL PROJECT FABRICATION LEDGER
                </span>
                <p className="text-sm font-black text-slate-900 tracking-tight">{ledgerNumber}</p>
                <div className="text-[10.5px] text-slate-500 font-medium space-y-0.5">
                  <p>Statement Date: <strong className="text-slate-800 font-bold">{reportDate}</strong></p>
                  <p>Job Ref: <strong className="text-indigo-600 font-bold">{job?.jobId || 'FAB-PROJECT'}</strong></p>
                </div>
              </div>
            </div>

            {/* Project Identity & Client Reference Box */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                  Client & Site Details
                </span>
                <div className="font-bold text-slate-900 text-xs">{clientName}</div>
                {phone && <div className="text-[10.5px] text-slate-600">Ph: {phone}</div>}
                {siteAddress && <div className="text-[10.5px] text-slate-500 leading-snug">{siteAddress}</div>}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                  Fabrication Job Order
                </span>
                <div className="font-bold text-slate-900 text-xs">
                  {job?.jobTitle || 'Custom Metal Fabrication Work'}
                </div>
                <div className="text-[10.5px] text-slate-600">
                  Status: <strong className="text-slate-800 font-bold">{job?.status || 'Active'}</strong>
                </div>
                <div className="text-[10.5px] text-slate-500">
                  Start Date: <strong className="text-slate-800">{formatDate(job?.startDate || job?.createdAt)}</strong>
                </div>
              </div>
            </div>

            {/* Quick Financial Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">Total Quoted</span>
                <span className="text-xs font-black text-slate-900">{formatCurrency(totalQuotation)}</span>
              </div>
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <span className="text-[9.5px] uppercase font-bold text-emerald-600 block mb-0.5">Client Paid</span>
                <span className="text-xs font-black text-emerald-700">{formatCurrency(totalReceived)}</span>
              </div>
              <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                <span className="text-[9.5px] uppercase font-bold text-amber-600 block mb-0.5">Balance Pending</span>
                <span className="text-xs font-black text-amber-700">{formatCurrency(balanceDue)}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${netProfit >= 0 ? 'bg-indigo-50/60 border-indigo-200' : 'bg-rose-50/60 border-rose-200'}`}>
                <span className={`text-[9.5px] uppercase font-bold block mb-0.5 ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>Net Margin</span>
                <span className={`text-xs font-black ${netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>{formatCurrency(netProfit)}</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* TABLE 1: QUOTATION LINE ITEMS (ONLY IF POPULATED)                        */}
            {/* ========================================================================= */}
            {quotationItems.length > 0 && (
              <div className="pdf-table-section space-y-2 pt-1" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Itemised Work Quotation & Measurements</span>
                    <span className="text-[10px] font-semibold text-slate-400">({quotationItems.length} items)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-700">Subtotal: {formatCurrency(totalQuotation)}</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-[10.5px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[9px] tracking-wider">
                        <th className="py-2 px-2.5 text-center w-8">#</th>
                        <th className="py-2 px-3">Work / Item Description</th>
                        <th className="py-2 px-2.5 text-center">Material</th>
                        <th className="py-2 px-2 text-center w-14">Unit</th>
                        <th className="py-2 px-2 text-right w-16">Measurements</th>
                        <th className="py-2 px-2.5 text-right w-20">Unit Rate (₹)</th>
                        <th className="py-2 px-3 text-right w-24">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotationItems.map((item, idx) => (
                        <tr key={item._id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{item.description}</div>
                            {item.notes && <div className="text-[9.5px] text-slate-400">{item.notes}</div>}
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-600">{item.material || '—'}</td>
                          <td className="py-2 px-2 text-center font-semibold text-slate-700">{item.unit || 'Sq.Ft'}</td>
                          <td className="py-2 px-2 text-right font-medium text-slate-700">{item.quantity}</td>
                          <td className="py-2 px-2.5 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200 text-[11px]">
                        <td colSpan={6} className="py-2 px-3 text-right uppercase text-slate-500 text-[10px]">
                          Total Quoted Contract:
                        </td>
                        <td className="py-2 px-3 text-right font-black text-slate-900">
                          {formatCurrency(totalQuotation)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TABLE 2: MATERIAL PURCHASES & EXPENSES (ONLY IF POPULATED)               */}
            {/* ========================================================================= */}
            {purchasesAndExpenses.length > 0 && (
              <div className="pdf-table-section space-y-2 pt-1" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Material Purchases & Operational Expenses</span>
                    <span className="text-[10px] font-semibold text-slate-400">({purchasesAndExpenses.length} items)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-rose-600">Total Outflow: {formatCurrency(totalPurchases + totalExpenses)}</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-[10.5px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[9px] tracking-wider">
                        <th className="py-2 px-2.5 text-center w-8">#</th>
                        <th className="py-2 px-2.5 w-20">Date</th>
                        <th className="py-2 px-3">Item / Category Description</th>
                        <th className="py-2 px-2.5">Vendor / Supplier</th>
                        <th className="py-2 px-2 text-center w-12">Unit</th>
                        <th className="py-2 px-2 text-right w-12">Qty</th>
                        <th className="py-2 px-2.5 text-right w-16">Rate (₹)</th>
                        <th className="py-2 px-3 text-right w-20">Amount (₹)</th>
                        <th className="py-2 px-2 text-center w-16">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchasesAndExpenses.map((item, idx) => {
                        const hasDesc = item.itemDescription && item.itemDescription.trim() !== '' && item.itemDescription.trim() !== 'Material Purchase' && item.itemDescription.trim() !== 'Site Operational Expense';
                        return (
                          <tr key={item._id || idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-2.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                            <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{formatDate(item.date)}</td>
                            <td className="py-2 px-3">
                              {hasDesc ? (
                                <div className="font-bold text-slate-900">{item.itemDescription.trim()}</div>
                              ) : null}
                              <div className="flex items-center gap-1.5 text-[9.5px] text-slate-500">
                                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                                  item.type === 'Purchase' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {item.type}
                                </span>
                                <span>{item.category}</span>
                                {item.billNumber && <span className="text-slate-400">• Bill #{item.billNumber}</span>}
                              </div>
                              {item.notes && item.type === 'Expense' && (
                                <div className="text-[9px] text-slate-400 italic">{item.notes}</div>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-slate-700">{item.vendorName || '—'}</td>
                            <td className="py-2 px-2 text-center font-medium text-slate-600">{item.type === 'Expense' ? '—' : (item.unit || 'Nos')}</td>
                            <td className="py-2 px-2 text-right text-slate-700">{item.type === 'Expense' ? '1' : (item.quantity || 1)}</td>
                            <td className="py-2 px-2.5 text-right text-slate-700">{item.type === 'Expense' ? formatCurrency(item.amount) : formatCurrency(item.rate)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                            <td className="py-2 px-2 text-center text-slate-600">{item.paymentMode || 'Cash'}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200 text-[10.5px]">
                        <td colSpan={7} className="py-2 px-3 text-right uppercase text-slate-500 text-[9.5px]">
                          Purchases: {formatCurrency(totalPurchases)} • Expenses: {formatCurrency(totalExpenses)} | Total:
                        </td>
                        <td className="py-2 px-3 text-right font-black text-rose-600">
                          {formatCurrency(totalPurchases + totalExpenses)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TABLE 3: EMPLOYEE DAILY WAGES TRACKER (ONLY IF POPULATED)                */}
            {/* ========================================================================= */}
            {dailyWages.length > 0 && (
              <div className="pdf-table-section space-y-2 pt-1" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Employee Daily Wage Tracker</span>
                    <span className="text-[10px] font-semibold text-slate-400">({dailyWages.length} shifts)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-rose-600">Total Wages: {formatCurrency(totalWages)}</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-[10.5px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[9px] tracking-wider">
                        <th className="py-2 px-2.5 text-center w-8">#</th>
                        <th className="py-2 px-2.5 w-20">Date</th>
                        <th className="py-2 px-3">Worker / Fabricator Name</th>
                        <th className="py-2 px-2.5">Shift & Scope Notes</th>
                        <th className="py-2 px-2.5 text-right w-20">Daily Rate (₹)</th>
                        <th className="py-2 px-2.5 text-right w-20">Overtime (₹)</th>
                        <th className="py-2 px-3 text-right w-24">Total Wage (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyWages.map((wage, idx) => (
                        <tr key={wage._id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{formatDate(wage.date)}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">👷 {wage.employeeName}</td>
                          <td className="py-2 px-2.5 text-slate-600">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[9.5px] mr-1.5">
                              {wage.shiftType || 'Full Day'}
                            </span>
                            <span>{wage.workDescription || wage.notes || 'General Fabrication'}</span>
                          </td>
                          <td className="py-2 px-2.5 text-right text-slate-700">{formatCurrency(wage.dailyRate)}</td>
                          <td className="py-2 px-2.5 text-right text-slate-700">{formatCurrency(wage.overtimeAmount)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(wage.totalWage)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200 text-[10.5px]">
                        <td colSpan={6} className="py-2 px-3 text-right uppercase text-slate-500 text-[9.5px]">
                          Total Employee Wages Paid:
                        </td>
                        <td className="py-2 px-3 text-right font-black text-rose-600">
                          {formatCurrency(totalWages)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TABLE 4: CLIENT PAYMENTS RECEIVED (ONLY IF POPULATED)                    */}
            {/* ========================================================================= */}
            {clientPayments.length > 0 && (
              <div className="pdf-table-section space-y-2 pt-1" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Client Payments & Advances ("Amount Given")</span>
                    <span className="text-[10px] font-semibold text-slate-400">({clientPayments.length} receipts)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700">Total Received: {formatCurrency(totalReceived)}</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-[10.5px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[9px] tracking-wider">
                        <th className="py-2 px-2.5 text-center w-8">#</th>
                        <th className="py-2 px-2.5 w-20">Date</th>
                        <th className="py-2 px-2.5 w-24">Payment Mode</th>
                        <th className="py-2 px-3">Transaction Reference</th>
                        <th className="py-2 px-3">Received By / Notes</th>
                        <th className="py-2 px-3 text-right w-28">Amount Received (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientPayments.map((pay, idx) => (
                        <tr key={pay._id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{formatDate(pay.date)}</td>
                          <td className="py-2 px-2.5">
                            <span className="px-2 py-0.5 rounded font-bold text-[9.5px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {pay.paymentMode || 'Cash'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">{pay.transactionReference || '—'}</td>
                          <td className="py-2 px-3 text-slate-600">
                            {pay.receivedBy && <span className="font-semibold text-slate-800">Recv by: {pay.receivedBy} </span>}
                            {pay.notes && <span className="text-slate-400 italic">({pay.notes})</span>}
                            {!pay.receivedBy && !pay.notes && '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatCurrency(pay.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200 text-[10.5px]">
                        <td colSpan={5} className="py-2 px-3 text-right uppercase text-slate-500 text-[9.5px]">
                          Total Amount Received from Client:
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-700">
                          {formatCurrency(totalReceived)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TABLE 5: MASTER FINANCIAL RECONCILIATION & LEDGER SUMMARY                */}
            {/* ========================================================================= */}
            <div className="pdf-table-section space-y-2 pt-1" style={{ pageBreakInside: 'avoid' }}>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">5</span>
                  <span>Overall Financial Reconciliation & Ledger Summary</span>
                </h3>
                <span className={`text-[11px] font-black ${netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                  Net Realized Margin: {formatCurrency(netProfit)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-[10.5px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[9px] tracking-wider">
                      <th className="py-2 px-3">Financial Parameter</th>
                      <th className="py-2 px-3">Calculation Details</th>
                      <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
                      <th className="py-2 px-3 text-right w-28">Status / Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-900">Total Quoted Work Order</td>
                      <td className="py-2 px-3 text-slate-500">Agreed contract line items and structural measurements</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(totalQuotation)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-600">Total Contract</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-emerald-700">Total Amount Received from Client</td>
                      <td className="py-2 px-3 text-slate-500">Advances and installments given by client</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatCurrency(totalReceived)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                        {totalQuotation > 0 ? Math.round((totalReceived / totalQuotation) * 100) : 0}% Paid
                      </td>
                    </tr>
                    <tr className="bg-amber-50/40">
                      <td className="py-2 px-3 font-bold text-amber-800">Outstanding Receivable Balance</td>
                      <td className="py-2 px-3 text-slate-500">Total Quoted − Total Amount Received</td>
                      <td className="py-2 px-3 text-right font-bold text-amber-800">{formatCurrency(balanceDue)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-amber-700">
                        {totalQuotation > 0 ? (100 - Math.round((totalReceived / totalQuotation) * 100)) : 0}% Due
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-700">Total Material Purchases</td>
                      <td className="py-2 px-3 text-slate-500">Steel pipes, sheets, rods, hardware & consumables</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-700">{formatCurrency(totalPurchases)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">Direct Material</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-700">Total Employee Daily Wages</td>
                      <td className="py-2 px-3 text-slate-500">Worker shifts, welder daily rates & overtime</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-700">{formatCurrency(totalWages)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">Direct Labor</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-700">Operational & Site Expenses</td>
                      <td className="py-2 px-3 text-slate-500">Freight, transport, fuel, crane & site incidental expenses</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-700">{formatCurrency(totalExpenses)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">Site Direct Cost</td>
                    </tr>
                    <tr className="bg-rose-50/40 font-bold border-t border-slate-200">
                      <td className="py-2 px-3 text-rose-800">Total Direct Workshop Costs Incurred</td>
                      <td className="py-2 px-3 text-slate-500">Purchases + Daily Wages + Operational Expenses</td>
                      <td className="py-2 px-3 text-right font-black text-rose-700">{formatCurrency(totalDirectCost)}</td>
                      <td className="py-2 px-3 text-right text-rose-600 font-bold">Total Outflow</td>
                    </tr>
                    <tr className={`font-black ${netProfit >= 0 ? 'bg-indigo-50/60' : 'bg-rose-50/60'}`}>
                      <td className="py-2.5 px-3 text-xs text-slate-900">Current Net Profit (Realized Margin)</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[9.5px]">Amount Received from Client − Direct Outflow Incurred</td>
                      <td className={`py-2.5 px-3 text-right text-xs ${netProfit >= 0 ? 'text-indigo-800 font-black' : 'text-rose-800 font-black'}`}>
                        {formatCurrency(netProfit)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-indigo-700">
                        {netProfit >= 0 ? 'Profitable' : 'Deficit'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Amount In Words & Verification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start pt-1 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Total Contract In Words
                </span>
                <p className="text-[11px] font-bold text-indigo-900 leading-snug">
                  {convertNumberToWords(totalQuotation)}
                </p>
                <div className="pt-1 text-[9.5px] text-slate-500 space-y-0.5">
                  <p>• Auto-compiled from project database records</p>
                  <p>• Tables without populated data are omitted from this statement</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Quoted Value:</span>
                  <strong className="text-slate-900">{formatCurrency(totalQuotation)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Direct Costs:</span>
                  <strong className="text-rose-600">{formatCurrency(totalDirectCost)}</strong>
                </div>
                <div className="border-t border-slate-200 pt-1 flex justify-between font-bold">
                  <span>Project Realized Balance:</span>
                  <strong className={netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}>{formatCurrency(netProfit)}</strong>
                </div>
              </div>
            </div>

            {/* Declarations & Signatures */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-[10px] text-slate-600 items-end">
              <div>
                <p className="font-bold text-slate-800 mb-0.5">Verification Note:</p>
                <p className="text-[9px] text-slate-500 leading-tight">
                  This document serves as an exhaustive fabrication ledger statement detailing all materials, shifts, expenses, and client settlements.
                </p>
              </div>

              <div className="text-right space-y-5">
                <p className="text-[9.5px] font-bold text-slate-700">For FABTEC FABRICATION & ENGINEERING WORKS</p>
                <div className="inline-block border-t border-slate-400 pt-1 px-6">
                  <span className="text-[9.5px] font-semibold text-slate-500">Authorized Signatory / Workshop Manager</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default OverallFabricationLedgerModal;
