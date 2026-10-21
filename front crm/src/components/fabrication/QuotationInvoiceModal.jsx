import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Building2,
  Plus,
  Edit3,
  Trash2,
  Check,
  SlidersHorizontal,
  Eye,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Percent,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Receipt,
  Calendar,
  Sparkles,
  Layers,
  ArrowRight,
  Wallet
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

// Convert number to Indian currency words
export const convertNumberToWords = (num) => {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return 'Rupees ' + str.trim() + ' Only';
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

export const DEFAULT_INVOICE_TERMS = [
  { id: 'term-2', text: '50% advance payment required with confirmed work order to procure raw materials.', enabled: true },
  { id: 'term-3', text: 'Balance payable upon delivery / site erection completion and final inspection.', enabled: true },
  { id: 'term-4', text: 'Extra scope, design alterations or dimensions beyond quoted measurements will be billed extra.', enabled: true },
  { id: 'term-5', text: 'GST & taxes applicable as per standard government tax rates.', enabled: true },
  { id: 'term-6', text: 'Delivery & installation timeline: within 10–15 business days from advance confirmation.', enabled: false },
  { id: 'term-7', text: 'Electricity & site water supply for installation to be provided by client.', enabled: false }
];

const LOCAL_STORAGE_TERMS_KEY = 'crm_fab_invoice_terms_list';

const QuotationInvoiceModal = ({
  isOpen,
  onClose,
  client,
  job,
  quotationItems = [],
  financials = {}
}) => {
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);

  // Overall Financial View toggle (default OFF per user preference)
  const [showOverallSummary, setShowOverallSummary] = useState(false);

  // Terms and Conditions State
  const [terms, setTerms] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TERMS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_INVOICE_TERMS;
  });

  const [isManagingTerms, setIsManagingTerms] = useState(false);
  const [newTermText, setNewTermText] = useState('');
  const [editingTermId, setEditingTermId] = useState(null);
  const [editingTermText, setEditingTermText] = useState('');

  // Persist terms to localStorage
  const persistTerms = (list) => {
    setTerms(list);
    try {
      localStorage.setItem(LOCAL_STORAGE_TERMS_KEY, JSON.stringify(list));
    } catch (e) {}
  };

  const toggleTerm = (id) => {
    const updated = terms.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t);
    persistTerms(updated);
  };

  const handleAddTerm = (e) => {
    if (e) e.preventDefault();
    const trimmed = newTermText.trim();
    if (!trimmed) return;
    const newEntry = {
      id: `term-${Date.now()}`,
      text: trimmed,
      enabled: true
    };
    persistTerms([...terms, newEntry]);
    setNewTermText('');
  };

  const handleSaveEditTerm = (id) => {
    const trimmed = editingTermText.trim();
    if (!trimmed) return;
    const updated = terms.map(t => t.id === id ? { ...t, text: trimmed } : t);
    persistTerms(updated);
    setEditingTermId(null);
    setEditingTermText('');
  };

  const handleDeleteTerm = (id) => {
    const updated = terms.filter(t => t.id !== id);
    persistTerms(updated);
  };

  const handleResetTerms = () => {
    persistTerms(DEFAULT_INVOICE_TERMS);
  };

  if (!isOpen) return null;

  const clientName = client?.companyName || client?.clientName || job?.clientName || 'Valued Client';
  const phone = client?.phone || job?.clientPhone || '';
  const siteAddress = client?.address || job?.siteAddress || '';
  const gstNumber = client?.gstNumber || '';
  const invoiceNumber = `FAB-QT-${job?.jobId || '2026-001'}`;
  const issueDate = formatDate(job?.startDate || new Date());
  
  // Financial Totals
  const grossTotal = financials.grossQuotation || quotationItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const discountAmount = financials.discountAmount || job?.quotationDiscount?.amount || 0;
  const totalQuoted = financials.totalQuotation || Math.max(0, grossTotal - discountAmount);
  const amountReceived = financials.totalAmountReceived || 0;
  const balanceDue = financials.balanceDue ?? Math.max(0, totalQuoted - amountReceived);

  // Overall Direct Costs & Margins
  const totalPurchases = financials.totalPurchases || 0;
  const totalWages = financials.totalWages || 0;
  const totalExpenses = financials.totalExpenses || 0;
  const totalDirectCost = financials.totalDirectCost || (totalPurchases + totalWages + totalExpenses);
  const netProfit = financials.netProfit ?? (amountReceived - totalDirectCost);

  // Enabled terms to display on invoice
  const activeTerms = terms.filter(t => t.enabled);

  const handleDownloadPdf = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    setDownloading(true);
    try {
      const cleanClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Quotation_Invoice_${cleanClient}_${job?.jobId || 'FAB'}.pdf`;

      // Helper to sanitize cloned doc for html2canvas
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
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const html2pdfFunc = typeof html2pdf === 'function' ? html2pdf : (html2pdf.default || window.html2pdf);
      if (typeof html2pdfFunc === 'function') {
        await html2pdfFunc().set(opt).from(element).save();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
      <div className="relative z-10 w-full max-w-5xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col h-[94vh] max-h-[94vh] overflow-hidden my-auto">
        
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-sm shrink-0">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Fabrication Quotation & Work Measurements</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold">
                  {job?.jobId ? `#${job.jobId}` : 'Estimate'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Itemized estimate & bill of measurements for <strong className="text-slate-800">{clientName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Manage Terms & Conditions Toggle Button */}
            <button
              type="button"
              onClick={() => setIsManagingTerms(!isManagingTerms)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isManagingTerms
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
              }`}
              title="Edit Terms & Conditions with checkboxes"
            >
              <SlidersHorizontal size={14} className={isManagingTerms ? 'text-white' : 'text-indigo-600'} />
              <span>Terms & Clauses</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                isManagingTerms ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {activeTerms.length}/{terms.length}
              </span>
              {isManagingTerms ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
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
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* OVERALL QUICK SUMMARY RIBBON & VIEW CONTROLS */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center flex-wrap gap-2 font-medium text-slate-700">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Overall Financials:</span>
            
            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-xs">
              <span className="text-slate-500 text-[11px]">Quoted:</span>
              <strong className="text-slate-900 font-bold">{formatCurrency(totalQuoted)}</strong>
            </div>

            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-emerald-800 shadow-xs">
              <span className="text-emerald-600 text-[11px]">Received:</span>
              <strong className="font-bold">{formatCurrency(amountReceived)}</strong>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-800 shadow-xs">
              <span className="text-amber-600 text-[11px]">Balance:</span>
              <strong className="font-bold">{formatCurrency(balanceDue)}</strong>
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 shadow-xs">
              <span className="text-slate-500 text-[11px]">Direct Cost:</span>
              <strong className="font-semibold">{formatCurrency(totalDirectCost)}</strong>
            </div>

            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border shadow-xs ${
              netProfit >= 0 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <span className="text-[11px]">Margin:</span>
              <strong className="font-bold">{formatCurrency(netProfit)}</strong>
            </div>
          </div>

          {/* Toggle Switch for Overall Ledger Inclusion */}
          <button
            type="button"
            onClick={() => setShowOverallSummary(!showOverallSummary)}
            className="flex items-center gap-2.5 cursor-pointer select-none bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs transition-all self-start lg:self-auto"
          >
            <span className="text-xs font-semibold text-slate-700">Include Overall Ledger in PDF</span>
            <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
              showOverallSummary ? 'bg-indigo-600' : 'bg-slate-300'
            }`}>
              <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${
                showOverallSummary ? 'translate-x-3.5' : 'translate-x-0'
              }`} />
            </div>
          </button>
        </div>

        {/* TERMS & CONDITIONS MANAGEMENT DRAWER (COLLAPSIBLE) */}
        {isManagingTerms && (
          <div className="bg-indigo-50/60 p-4 sm:p-5 border-b border-indigo-100 space-y-3.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-indigo-600" />
                <span className="text-xs font-bold text-slate-900 tracking-wide">
                  Terms & Conditions Management (Check to include on invoice • Add or edit custom clauses)
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetTerms}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors"
                title="Reset to standard workshop defaults"
              >
                <RotateCcw size={12} />
                <span>Reset Standard Defaults</span>
              </button>
            </div>

            {/* Checkbox List of Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {terms.map((term) => (
                <div 
                  key={term.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${
                    term.enabled 
                      ? 'bg-white border-indigo-200 shadow-xs text-slate-800 ring-1 ring-indigo-500/10' 
                      : 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={term.enabled}
                    onChange={() => toggleTerm(term.id)}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0 accent-indigo-600"
                  />

                  {editingTermId === term.id ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editingTermText}
                        onChange={(e) => setEditingTermText(e.target.value)}
                        autoFocus
                        className="flex-1 px-2.5 py-1 bg-white border border-indigo-400 rounded-lg text-xs text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditTerm(term.id)}
                        className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTermId(null)}
                        className="p-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span 
                      onClick={() => toggleTerm(term.id)}
                      className="flex-1 min-w-0 cursor-pointer leading-snug select-none text-slate-800"
                    >
                      {term.text}
                    </span>
                  )}

                  {editingTermId !== term.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTermId(term.id);
                          setEditingTermText(term.text);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                        title="Edit clause text"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTerm(term.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                        title="Delete clause"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add New Term Input */}
            <form onSubmit={handleAddTerm} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Type new custom clause (e.g. 1-Year structural warranty on welding & joint stability...)"
                value={newTermText}
                onChange={(e) => setNewTermText(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!newTermText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} />
                <span>Add Clause</span>
              </button>
            </form>
          </div>
        )}

        {/* Scrollable Document Preview Area with guaranteed flex-1 min-h-0 overflow-y-auto */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 bg-slate-100/90 flex justify-center">
          
          {/* Printable Invoice Container (Strict A4 Canvas Styling) */}
          <div 
            ref={invoiceRef}
            className="w-full max-w-[820px] bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 space-y-6 relative overflow-hidden h-fit"
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          >
            {/* Top Luxury Gradient Hairline */}
            <div 
              style={{ height: '4px', background: 'linear-gradient(90deg, #1e1b4b 0%, #4338ca 35%, #0284c7 70%, #059669 100%)' }} 
              className="w-full rounded-full" 
            />

            {/* Header: Company Logo & Document Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex flex-col items-start space-y-1">
                {/* Official Company Logo */}
                {logoLoaded ? (
                  <img 
                    src="/logo3.png" 
                    alt="FABTEC Logo" 
                    onError={() => setLogoLoaded(false)}
                    className="h-16 w-auto max-w-[240px] object-contain shrink-0" 
                  />
                ) : (
                  <div className="h-14 px-4 rounded-xl bg-slate-900 text-white flex items-center gap-2 font-black text-xl shadow-sm shrink-0">
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-base">F</span>
                    <span>FABTEC</span>
                  </div>
                )}

                {/* Company Address & Phone Details */}
                <div className="text-[11px] leading-tight space-y-0.5 pt-1 font-medium" style={{ color: '#475569' }}>
                  <p>Vengoor</p>
                  <p>8139877848, 7736692975</p>
                </div>
              </div>

              {/* Document Meta Block */}
              <div className="flex flex-col sm:items-end space-y-2">
                <div 
                  style={{ letterSpacing: '2.5px', backgroundColor: '#0f172a', color: '#ffffff' }}
                  className="inline-block px-3.5 py-1 text-[11px] font-black uppercase rounded-md shadow-xs"
                >
                  OFFICIAL QUOTATION
                </div>
                <div className="sm:text-right space-y-1 text-xs">
                  <p className="font-mono font-bold text-sm tracking-tight" style={{ color: '#0f172a' }}>
                    {invoiceNumber}
                  </p>
                  <div className="flex items-center sm:justify-end gap-3 text-[11.5px]" style={{ color: '#475569' }}>
                    <span>Date: <strong style={{ color: '#0f172a' }}>{issueDate}</strong></span>
                  </div>
                  {job?.status && (
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Status: {job.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Client Bill-To Card */}
            <div 
              className="p-4 rounded-xl border space-y-1.5 text-xs"
              style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
            >
              <div className="flex items-center gap-1.5 border-b pb-2 mb-1" style={{ borderColor: '#e2e8f0' }}>
                <Building2 size={13} style={{ color: '#4338ca' }} />
                <span style={{ letterSpacing: '1px', color: '#64748b' }} className="text-[10px] font-extrabold uppercase">
                  QUOTED TO (CLIENT)
                </span>
              </div>
              <h3 className="text-sm font-black tracking-tight" style={{ color: '#0f172a' }}>
                {clientName}
              </h3>
              {phone && (
                <p className="text-[11.5px]" style={{ color: '#475569' }}>
                  <span>{phone}</span>
                </p>
              )}
              {siteAddress && (
                <p className="text-[11.5px]" style={{ color: '#475569' }}>
                  <span>Site: {siteAddress}</span>
                </p>
              )}
              {gstNumber && (
                <p className="text-[10.5px] font-mono font-medium pt-0.5" style={{ color: '#64748b' }}>
                  GSTIN: <strong style={{ color: '#0f172a' }}>{gstNumber}</strong>
                </p>
              )}
            </div>

            {/* Itemized Quotation & Measurements Table */}
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#cbd5e1' }}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr 
                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                    className="font-bold uppercase text-[10px] tracking-wider"
                  >
                    <th className="py-3 px-3 w-10 text-center" style={{ color: '#ffffff' }}>#</th>
                    <th className="py-3 px-3" style={{ color: '#ffffff' }}>Description of Work / Specifications</th>
                    <th className="py-3 px-3 text-center w-20" style={{ color: '#ffffff' }}>Unit</th>
                    <th className="py-3 px-3 text-right w-24" style={{ color: '#ffffff', textAlign: 'right' }}>Measurements</th>
                    <th className="py-3 px-3 text-right w-28" style={{ color: '#ffffff', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                  {quotationItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No itemized quotation items recorded for this client.
                      </td>
                    </tr>
                  ) : (
                    quotationItems.map((item, idx) => (
                      <tr 
                        key={item._id || idx} 
                        style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd' }}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-xs">{item.description}</div>
                          {item.material && (
                            <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                              Material: {item.material}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-700 text-xs">
                          {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* OVERALL FINANCIAL LEDGER & DIRECT COST BREAKDOWN (CONDITIONAL VIEW) */}
            {showOverallSummary && (
              <div 
                className="rounded-xl border p-4 space-y-3 text-xs"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              >
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: '#e2e8f0' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span style={{ color: '#0f172a' }} className="font-bold uppercase tracking-wider text-[11px]">
                      Overall Job Financial Ledger & Workshop Cost Breakdown
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Workshop Financial Summary
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 bg-white rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Material Purchases</span>
                    <span className="font-bold text-slate-900 font-mono">{formatCurrency(totalPurchases)}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Labor & Daily Wages</span>
                    <span className="font-bold text-slate-900 font-mono">{formatCurrency(totalWages)}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Operational Expenses</span>
                    <span className="font-bold text-slate-900 font-mono">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Total Direct Cost</span>
                    <span className="font-bold text-rose-600 font-mono">{formatCurrency(totalDirectCost)}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t text-[11px]" style={{ borderColor: '#e2e8f0' }}>
                  <div className="flex items-center gap-3 text-slate-600 flex-wrap">
                    <span>Quoted: <strong className="text-slate-900 font-mono">{formatCurrency(totalQuoted)}</strong></span>
                    <span>•</span>
                    <span>Received: <strong className="text-emerald-700 font-mono">{formatCurrency(amountReceived)}</strong></span>
                    <span>•</span>
                    <span>Balance Due: <strong className="text-amber-700 font-mono">{formatCurrency(balanceDue)}</strong></span>
                  </div>
                  <div className="font-bold">
                    <span>Net Margin: </span>
                    <span className={netProfit >= 0 ? "text-indigo-700 font-mono font-black" : "text-rose-600 font-mono font-black"}>
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary & Amount in Words */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start pt-1">
              {/* Left Column: Words & Terms */}
              <div className="sm:col-span-7 space-y-3">
                {/* Total Quoted in Words Card */}
                <div 
                  className="p-3.5 rounded-xl border space-y-1"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    TOTAL QUOTED AMOUNT IN WORDS:
                  </span>
                  <p className="text-xs font-bold italic tracking-tight" style={{ color: '#0f172a' }}>
                    {convertNumberToWords(totalQuoted)}
                  </p>
                </div>

                {/* Selected Terms & Conditions Card */}
                <div 
                  className="p-3.5 rounded-xl border text-[11px] space-y-2"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#334155' }}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: '#e2e8f0' }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Terms & Conditions:
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {activeTerms.length} clauses specified
                    </span>
                  </div>
                  {activeTerms.length === 0 ? (
                    <p className="text-slate-400 italic">No specific terms selected for this quotation.</p>
                  ) : (
                    activeTerms.map((term, i) => (
                      <p key={term.id} className="leading-relaxed flex items-start gap-1.5">
                        <span className="font-bold text-slate-900 shrink-0">{i + 1}.</span>
                        <span>{term.text}</span>
                      </p>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Executive Totals Ledger */}
              <div 
                className="sm:col-span-5 p-4 rounded-xl border space-y-2.5 text-xs"
                style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
              >
                <div className="flex justify-between items-center text-slate-600">
                  <span>Gross Quoted Total:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(grossTotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-bold">
                    <span>
                      Quotation Discount {job?.quotationDiscount?.type === 'percentage' ? `(${job.quotationDiscount.value}%)` : ''}:
                    </span>
                    <span className="font-mono">− {formatCurrency(discountAmount)}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-900 font-bold pt-1.5 border-t" style={{ borderColor: '#e2e8f0' }}>
                    <span>Net Quoted Total:</span>
                    <span className="font-mono">{formatCurrency(totalQuoted)}</span>
                  </div>
                )}

                {amountReceived > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 font-semibold">
                    <span>Advance / Amount Received:</span>
                    <span className="font-mono font-bold">− {formatCurrency(amountReceived)}</span>
                  </div>
                )}

                {/* Final Net Balance Due Standout Box */}
                <div 
                  className="p-3 rounded-lg border-2 mt-2 flex justify-between items-center"
                  style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#ffffff' }}
                >
                  <span className="font-black text-[11px] uppercase tracking-wider text-slate-300">
                    Net Balance Due:
                  </span>
                  <span className="font-mono font-black text-lg text-emerald-400">
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>


            {/* Document Verification & Security Footnote */}
            <div className="pt-4 border-t flex items-center justify-between text-[10px] text-slate-400" style={{ borderColor: '#f1f5f9' }}>
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-slate-400" />
                <span>Official Computer Generated Fabrication Quotation</span>
              </div>
              <div className="font-mono">
                Ref: {invoiceNumber}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default QuotationInvoiceModal;