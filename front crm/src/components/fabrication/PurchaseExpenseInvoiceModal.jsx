import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Download, 
  ShoppingCart, 
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
  FileText,
  DollarSign
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Convert number to Indian currency words
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

const PurchaseExpenseInvoiceModal = ({
  isOpen,
  onClose,
  job,
  client,
  purchasesAndExpenses = [],
  financials = {}
}) => {
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Purchase' | 'Expense'

  if (!isOpen) return null;

  // Resolve client & job details
  const clientName = client?.companyName || client?.clientName || client?.name || job?.clientName || job?.client?.name || 'Valued Client';
  const phone = client?.phone || job?.clientPhone || job?.client?.phone || '';
  const siteAddress = client?.address || job?.siteAddress || job?.client?.address || '';
  const invoiceNumber = `FAB-PUR-${(job?.jobId || 'EXP').replace(/[^a-zA-Z0-9-]/g, '')}`;
  const issueDate = formatDate(new Date());

  // Filter items based on active tab
  const items = (purchasesAndExpenses || []).filter(item => {
    if (filterType === 'All') return true;
    return item.type === filterType;
  });

  // Calculate totals
  const totalPurchases = (purchasesAndExpenses || [])
    .filter(p => p.type === 'Purchase')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const totalExpenses = (purchasesAndExpenses || [])
    .filter(p => p.type === 'Expense')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const filteredTotal = items.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const grandTotal = filterType === 'All' ? (totalPurchases + totalExpenses) : filteredTotal;

  // PDF Download Handler
  const handleDownloadPdf = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    setDownloading(true);
    try {
      const cleanClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Purchase_Expense_Invoice_${cleanClient}_${job?.jobId || 'FAB'}.pdf`;

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

      // Try 1-page fit with html2canvas & jsPDF
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: sanitizeClonedDocStyles
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 5;
        const usableWidth = pdfWidth - (margin * 2);
        const usableHeight = pageHeight - (margin * 2);
        const ratio = Math.min(usableWidth / canvas.width, usableHeight / canvas.height);
        const renderWidth = canvas.width * ratio;
        const renderHeight = canvas.height * ratio;
        const xOffset = margin + (usableWidth - renderWidth) / 2;
        const yOffset = margin;

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);
        pdf.save(filename);
      } catch (directErr) {
        console.warn('Direct jsPDF render failed, using html2pdf fallback:', directErr);
        const opt = {
          margin: [4, 4, 4, 4],
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
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-4xl max-h-[96vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Purchases & Expenses Invoice PDF
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                  {items.length} records
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Official itemised material procurement and site expense statement
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
                  <span>Download PDF</span>
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

        {/* TOOLBAR: FILTER TABS & TOTAL SUMMARY */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            {[
              { id: 'All', label: `All Entries (${purchasesAndExpenses.length})` },
              { id: 'Purchase', label: `Purchases (${purchasesAndExpenses.filter(p => p.type === 'Purchase').length})` },
              { id: 'Expense', label: `Site Expenses (${purchasesAndExpenses.filter(p => p.type === 'Expense').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 font-semibold text-slate-600">
            <span>Total Purchases: <strong className="text-slate-900">{formatCurrency(totalPurchases)}</strong></span>
            <span>•</span>
            <span>Total Expenses: <strong className="text-slate-900">{formatCurrency(totalExpenses)}</strong></span>
            <span>•</span>
            <span className="text-rose-600 font-bold">Total Outflow: {formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* SCROLLABLE DOCUMENT PREVIEW */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 bg-slate-100/90 flex justify-center">
          
          {/* PRINTABLE INVOICE CANVAS (A4 Format) */}
          <div 
            ref={invoiceRef}
            id="printable-purchase-expense-invoice"
            className="w-full max-w-[800px] bg-white text-slate-900 px-6 sm:px-8 py-6 rounded-2xl shadow-xl border border-slate-200 space-y-4 relative overflow-hidden h-fit"
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
                #printable-purchase-expense-invoice, #printable-purchase-expense-invoice * { visibility: visible !important; }
                #printable-purchase-expense-invoice {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 16px 20px !important;
                  border: none !important;
                  box-shadow: none !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 6mm;
                }
              }
            `}</style>

            {/* Top Indigo Accent Line */}
            <div style={{ height: '3px', backgroundColor: '#0f172a' }} className="w-full rounded-full" />

            {/* Header: Company Logo & Document Title */}
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
                  {filterType === 'Purchase' ? 'MATERIAL PROCUREMENT INVOICE' : filterType === 'Expense' ? 'SITE OPERATIONAL EXPENSE STATEMENT' : 'PURCHASE & EXPENSE INVOICE'}
                </span>
                <p className="text-sm font-black text-slate-900 tracking-tight">{invoiceNumber}</p>
                <div className="text-[10.5px] text-slate-500 font-medium space-y-0.5">
                  <p>Date: <strong className="text-slate-800 font-bold">{issueDate}</strong></p>
                  <p>Job Ref: <strong className="text-slate-800 font-bold">{job?.jobId || 'FAB-PROJECT'}</strong></p>
                </div>
              </div>
            </div>

            {/* Billed To & Project Details Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                  Project Client Details
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
                  Job ID: <strong className="text-indigo-600 font-bold">{job?.jobId || 'FAB-PROJECT'}</strong>
                </div>
                <div className="text-[10.5px] text-slate-500">
                  Total Items Logged: <strong className="text-slate-800">{items.length} records</strong>
                </div>
              </div>
            </div>

            {/* Itemised Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[9.5px] tracking-wider">
                    <th className="py-2 px-2.5 text-center w-8">#</th>
                    <th className="py-2 px-2.5 w-20">Date</th>
                    <th className="py-2 px-3">Item / Category Description</th>
                    <th className="py-2 px-2.5">Vendor / Supplier</th>
                    <th className="py-2 px-2 text-center w-14">Unit</th>
                    <th className="py-2 px-2 text-right w-12">Qty</th>
                    <th className="py-2 px-2.5 text-right w-16">Rate (₹)</th>
                    <th className="py-2 px-3 text-right w-20">Amount (₹)</th>
                    <th className="py-2 px-2 text-center w-16">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No purchases or expenses matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const hasDesc = item.itemDescription && item.itemDescription.trim() !== '' && item.itemDescription.trim() !== 'Material Purchase' && item.itemDescription.trim() !== 'Site Operational Expense';
                      return (
                        <tr key={item._id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">
                            {formatDate(item.date)}
                          </td>
                          <td className="py-2 px-3">
                            {hasDesc ? (
                              <div className="font-bold text-slate-900">{item.itemDescription.trim()}</div>
                            ) : null}
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                item.type === 'Purchase' 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {item.type}
                              </span>
                              <span>{item.category}</span>
                              {item.billNumber && (
                                <span className="text-slate-400 font-semibold">• Bill #{item.billNumber}</span>
                              )}
                            </div>
                            {item.notes && item.type === 'Expense' && (
                              <div className="text-[9.5px] text-slate-400 italic mt-0.5">{item.notes}</div>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 font-medium">
                            {item.vendorName ? (
                              <span className="font-semibold text-slate-800">{item.vendorName}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600 font-semibold">
                            {item.type === 'Expense' ? '—' : (item.unit || 'Nos')}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-700 font-medium">
                            {item.type === 'Expense' ? '1' : (item.quantity || 1)}
                          </td>
                          <td className="py-2 px-2.5 text-right text-slate-700 font-medium">
                            {item.type === 'Expense' ? formatCurrency(item.amount) : formatCurrency(item.rate)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9.5px] font-medium text-slate-600 whitespace-nowrap">
                              {item.paymentMode || 'Cash'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Totals & In Words */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                  Amount in Words
                </span>
                <p className="text-xs font-bold text-indigo-900 leading-snug">
                  {convertNumberToWords(grandTotal)}
                </p>
                <div className="pt-1 text-[10px] text-slate-500 space-y-0.5">
                  <p>• Verified against supplier vouchers and bills</p>
                  <p>• Reflects net workshop and on-site material disbursements</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                {filterType === 'All' && (
                  <>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Total Material Purchases:</span>
                      <strong className="text-slate-900 font-bold">{formatCurrency(totalPurchases)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Total Operational Expenses:</span>
                      <strong className="text-slate-900 font-bold">{formatCurrency(totalExpenses)}</strong>
                    </div>
                    <div className="border-t border-slate-200 pt-1" />
                  </>
                )}
                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span className="text-xs uppercase tracking-wide">Net Total Amount:</span>
                  <span className="text-base font-black text-rose-600">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Declarations & Signatures */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-[10.5px] text-slate-600 items-end">
              <div>
                <p className="font-bold text-slate-800 mb-0.5">Declaration:</p>
                <p className="text-[9.5px] text-slate-500 leading-tight">
                  This statement constitutes a true record of materials procured, consumables utilized, and site operations undertaken for the project.
                </p>
              </div>

              <div className="text-right space-y-6">
                <p className="text-[10px] font-bold text-slate-700">For FABTEC FABRICATION & ENGINEERING WORKS</p>
                <div className="inline-block border-t border-slate-400 pt-1 px-6">
                  <span className="text-[10px] font-semibold text-slate-500">Authorized Signatory / Manager</span>
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

export default PurchaseExpenseInvoiceModal;
