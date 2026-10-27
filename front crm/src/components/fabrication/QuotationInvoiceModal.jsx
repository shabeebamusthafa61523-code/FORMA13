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
  Wallet,
  Database
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  getQuotationTerms,
  createQuotationTerm,
  updateQuotationTerm,
  deleteQuotationTerm,
  resetQuotationTerms,
  updateJobTerms
} from '../../services/fabricationService';

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

// Normalize term helper for consistent handling across DB & localStorage
const normalizeTerm = (t, index = 0) => ({
  id: t._id || t.id || `term-${index}-${Date.now()}`,
  _id: t._id || t.id,
  text: t.text || '',
  enabled: t.enabled !== undefined ? Boolean(t.enabled) : true,
  order: t.order !== undefined ? t.order : index + 1
});

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

  // Terms and Conditions State (MongoDB backend with localStorage fallback)
  const [terms, setTerms] = useState(() => {
    if (job?.terms && Array.isArray(job.terms) && job.terms.length > 0) {
      return job.terms.map(normalizeTerm);
    }
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TERMS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizeTerm);
      }
    } catch (e) {}
    return DEFAULT_INVOICE_TERMS.map(normalizeTerm);
  });

  const [loadingTerms, setLoadingTerms] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [isManagingTerms, setIsManagingTerms] = useState(false);
  const [newTermText, setNewTermText] = useState('');
  const [editingTermId, setEditingTermId] = useState(null);
  const [editingTermText, setEditingTermText] = useState('');

  // Editable Quotation Date
  const [customInvoiceDate, setCustomInvoiceDate] = useState(() => {
    if (job?.startDate) {
      try {
        const d = new Date(job.startDate);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch (e) {}
    }
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (isOpen) {
      if (job?.startDate) {
        try {
          const d = new Date(job.startDate);
          if (!isNaN(d.getTime())) {
            setCustomInvoiceDate(d.toISOString().split('T')[0]);
            return;
          }
        } catch (e) {}
      }
      setCustomInvoiceDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, job?.startDate]);

  // Fetch Master Terms from MongoDB on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchDbTerms = async () => {
      // If job already has saved snapshot terms, use them
      if (job?.terms && Array.isArray(job.terms) && job.terms.length > 0) {
        setTerms(job.terms.map(normalizeTerm));
        return;
      }

      try {
        setLoadingTerms(true);
        const res = await getQuotationTerms();
        if (isMounted && res?.success && Array.isArray(res.data) && res.data.length > 0) {
          const normalized = res.data.map(normalizeTerm);
          setTerms(normalized);
          try {
            localStorage.setItem(LOCAL_STORAGE_TERMS_KEY, JSON.stringify(normalized));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Could not fetch terms from MongoDB, using cached fallback:', err);
      } finally {
        if (isMounted) setLoadingTerms(false);
      }
    };

    fetchDbTerms();

    return () => {
      isMounted = false;
    };
  }, [isOpen, job?._id]);

  // Persist terms to state, localStorage & job document
  const persistTerms = (list) => {
    const normalized = list.map(normalizeTerm);
    setTerms(normalized);
    try {
      localStorage.setItem(LOCAL_STORAGE_TERMS_KEY, JSON.stringify(normalized));
    } catch (e) {}

    // If active job exists, save snapshot to this job in DB
    if (job?._id) {
      updateJobTerms(job._id, normalized).catch(err => {
        console.warn('Failed to sync terms snapshot to job:', err);
      });
    }
  };

  const toggleTerm = async (id) => {
    const target = terms.find(t => (t._id || t.id) === id);
    if (!target) return;
    const newEnabled = !target.enabled;

    const updated = terms.map(t => (t._id || t.id) === id ? { ...t, enabled: newEnabled } : t);
    persistTerms(updated);

    // Sync toggle to MongoDB master collection if it has a MongoDB _id
    if (target._id && String(target._id).length === 24) {
      try {
        setIsSavingDb(true);
        await updateQuotationTerm(target._id, { enabled: newEnabled });
      } catch (e) {
        console.error('Failed to sync toggle to DB:', e);
      } finally {
        setIsSavingDb(false);
      }
    }
  };

  const handleAddTerm = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newTermText.trim();
    if (!trimmed) return;

    try {
      setIsSavingDb(true);
      const res = await createQuotationTerm({ text: trimmed, enabled: true });
      if (res?.success && res.data) {
        const newEntry = normalizeTerm(res.data);
        const updated = [...terms, newEntry];
        persistTerms(updated);
      } else {
        const fallbackEntry = normalizeTerm({ id: `term-${Date.now()}`, text: trimmed, enabled: true });
        persistTerms([...terms, fallbackEntry]);
      }
    } catch (err) {
      console.warn('DB create term error, falling back locally:', err);
      const fallbackEntry = normalizeTerm({ id: `term-${Date.now()}`, text: trimmed, enabled: true });
      persistTerms([...terms, fallbackEntry]);
    } finally {
      setIsSavingDb(false);
      setNewTermText('');
    }
  };

  const handleSaveEditTerm = async (id) => {
    const trimmed = editingTermText.trim();
    if (!trimmed) return;

    const target = terms.find(t => (t._id || t.id) === id);
    const updated = terms.map(t => (t._id || t.id) === id ? { ...t, text: trimmed } : t);
    persistTerms(updated);
    setEditingTermId(null);
    setEditingTermText('');

    if (target && target._id && String(target._id).length === 24) {
      try {
        setIsSavingDb(true);
        await updateQuotationTerm(target._id, { text: trimmed });
      } catch (err) {
        console.error('Failed to update term in DB:', err);
      } finally {
        setIsSavingDb(false);
      }
    }
  };

  const handleDeleteTerm = async (id) => {
    const target = terms.find(t => (t._id || t.id) === id);
    const updated = terms.filter(t => (t._id || t.id) !== id);
    persistTerms(updated);

    if (target && target._id && String(target._id).length === 24) {
      try {
        setIsSavingDb(true);
        await deleteQuotationTerm(target._id);
      } catch (err) {
        console.error('Failed to delete term in DB:', err);
      } finally {
        setIsSavingDb(false);
      }
    }
  };

  const handleResetTerms = async () => {
    try {
      setIsSavingDb(true);
      const res = await resetQuotationTerms();
      if (res?.success && Array.isArray(res.data)) {
        const normalized = res.data.map(normalizeTerm);
        persistTerms(normalized);
      } else {
        persistTerms(DEFAULT_INVOICE_TERMS.map(normalizeTerm));
      }
    } catch (err) {
      console.warn('DB reset error, resetting to local defaults:', err);
      persistTerms(DEFAULT_INVOICE_TERMS.map(normalizeTerm));
    } finally {
      setIsSavingDb(false);
    }
  };

  if (!isOpen) return null;

  const clientName = client?.companyName || client?.clientName || job?.clientName || 'Valued Client';
  const phone = client?.phone || job?.clientPhone || '';
  const siteAddress = client?.address || job?.siteAddress || '';
  const gstNumber = client?.gstNumber || '';
  const invoiceNumber = `FAB-QT-${job?.jobId || '2026-001'}`;
  const issueDate = formatDate(customInvoiceDate || new Date());
  
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
          function oklchToRgb(l, c, h) {
            const hr = (h || 0) * Math.PI / 180;
            const a = (c || 0) * Math.cos(hr);
            const b = (c || 0) * Math.sin(hr);

            const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
            const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
            const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

            const l3 = l_ * l_ * l_;
            const m3 = m_ * m_ * m_;
            const s3 = s_ * s_ * s_;

            let r = +4.0767434720 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
            let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
            let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

            const toRgb = (x) => {
              x = Math.max(0, Math.min(1, x));
              return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
            };

            const R = Math.round(toRgb(r) * 255);
            const G = Math.round(toRgb(g) * 255);
            const B = Math.round(toRgb(bl) * 255);

            return `rgb(${R}, ${G}, ${B})`;
          }

          const replaceOklch = (str) => {
            if (!str || typeof str !== 'string') return str;
            return str
              .replace(/oklch\(\s*([\d.]+)(?:%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\s*\)/gi, (match, l, c, h) => {
                let lNum = parseFloat(l);
                if (l.includes('%') || lNum > 1) lNum = lNum / 100;
                return oklchToRgb(lNum, parseFloat(c), parseFloat(h));
              })
              .replace(/oklch\([^)]+\)/gi, '#475569')
              .replace(/oklab\([^)]+\)/gi, '#475569')
              .replace(/color-mix\([^)]+\)/gi, '#475569');
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
          // Ensure container matches full A4 width cleanly without dialog shadows or rounded borders
          const target = clonedDoc.getElementById('printable-quotation-invoice');
          if (target) {
            target.style.boxShadow = 'none';
            target.style.border = 'none';
            target.style.borderRadius = '0';
            target.style.width = '100%';
            target.style.maxWidth = '100%';
          }

          // Hide interactive-only buttons/icons from PDF export
          const noPrint = clonedDoc.querySelectorAll('.print\\:hidden, .no-print');
          noPrint.forEach((el) => {
            el.style.display = 'none';
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

            {/* Edit Invoice Date */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs">
              <Calendar size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Date:</span>
              <input
                type="date"
                value={customInvoiceDate}
                onChange={(e) => setCustomInvoiceDate(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                title="Change quotation date"
              />
            </div>

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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal size={15} className="text-indigo-600" />
                <span className="text-xs font-bold text-slate-900 tracking-wide">
                  Terms & Conditions Management
                </span>
                <span className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-2xs">
                  <Database size={11} />
                  <span>MongoDB Synced</span>
                </span>
                {isSavingDb && (
                  <span className="flex items-center gap-1 text-[10.5px] text-amber-600 font-semibold animate-pulse">
                    <Loader2 size={11} className="animate-spin" />
                    <span>Saving...</span>
                  </span>
                )}
                {loadingTerms && (
                  <span className="flex items-center gap-1 text-[10.5px] text-slate-400 font-medium">
                    <Loader2 size={11} className="animate-spin" />
                    <span>Loading DB...</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleResetTerms}
                disabled={isSavingDb}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors disabled:opacity-50"
                title="Reset to standard workshop defaults in MongoDB"
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
            id="printable-quotation-invoice"
            className="w-full max-w-[800px] bg-white text-slate-900 px-6 sm:px-8 py-5 sm:py-6 rounded-2xl shadow-xl border border-slate-200 space-y-3 relative overflow-hidden h-fit"
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          >
            {/* Print Stylesheet for exact 1-page output */}
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #printable-quotation-invoice, #printable-quotation-invoice * { visibility: visible !important; }
                #printable-quotation-invoice {
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

            {/* Top Luxury Accent Line */}
            <div 
              style={{ height: '3px', backgroundColor: '#0f172a' }} 
              className="w-full rounded-full" 
            />

            {/* Header: Company Logo & Document Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex flex-col items-start space-y-1">
                {/* Official Company Logo */}
                {logoLoaded ? (
                  <img 
                    src="/logo3.png" 
                    alt="FABTEC Logo" 
                    onError={() => setLogoLoaded(false)}
                    className="h-13 w-auto max-w-[200px] object-contain shrink-0" 
                  />
                ) : (
                  <div className="h-12 px-4 rounded-xl bg-slate-900 text-white flex items-center gap-2 font-black text-lg shadow-sm shrink-0">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm">F</span>
                    <span>FABTEC</span>
                  </div>
                )}

                {/* Company Address & Phone Details */}
                <div className="text-[10px] leading-tight space-y-0.5 pt-0.5 font-medium" style={{ color: '#475569' }}>
                  <p>perinthalmanna,malappuram Dt.,pin:679322</p>
                  <p>ph:8139-877848,7736-692975</p>
                  <p>Email:forma13interiors@gmail.com</p>
                </div>
              </div>

              {/* Document Meta Block */}
              <div className="flex flex-col sm:items-end space-y-1.5">
                <div 
                  style={{ letterSpacing: '2px', backgroundColor: '#0f172a', color: '#ffffff' }}
                  className="inline-block px-3 py-0.5 text-[10.5px] font-black uppercase rounded-md shadow-xs"
                >
                  OFFICIAL QUOTATION
                </div>
                <div className="sm:text-right space-y-0.5 text-xs">
                  <p className="font-mono font-bold text-xs tracking-tight" style={{ color: '#0f172a' }}>
                    {invoiceNumber}
                  </p>
                  <div className="flex items-center sm:justify-end gap-1.5 text-[11px]" style={{ color: '#475569' }}>
                    <Calendar size={13} style={{ color: '#94a3b8' }} />
                    <span>Date: <strong style={{ color: '#0f172a' }}>{issueDate}</strong></span>
                    <label className="cursor-pointer text-indigo-600 hover:text-indigo-800 p-0.5 rounded hover:bg-indigo-50 transition-colors inline-flex items-center print:hidden" title="Click to edit date">
                      <Edit3 size={11} />
                      <input
                        type="date"
                        value={customInvoiceDate}
                        onChange={(e) => setCustomInvoiceDate(e.target.value)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Bill-To Card */}
            <div 
              className="p-2.5 sm:p-3 rounded-xl border space-y-1 text-xs"
              style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
            >
              <div className="flex items-center gap-1.5 border-b pb-1 mb-1" style={{ borderColor: '#e2e8f0' }}>
                <Building2 size={12} style={{ color: '#4338ca' }} />
                <span style={{ letterSpacing: '1px', color: '#64748b' }} className="text-[9.5px] font-extrabold uppercase">
                  QUOTED TO (CLIENT)
                </span>
              </div>
              <h3 className="text-xs font-black tracking-tight" style={{ color: '#0f172a' }}>
                {clientName}
              </h3>
              {phone && (
                <p className="text-[11px]" style={{ color: '#475569' }}>
                  <span>{phone}</span>
                </p>
              )}
              {siteAddress && (
                <p className="text-[11px]" style={{ color: '#475569' }}>
                  <span>Site: {siteAddress}</span>
                </p>
              )}
              {gstNumber && (
                <p className="text-[10px] font-mono font-medium pt-0.5" style={{ color: '#64748b' }}>
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
                    className="font-bold uppercase text-[9.5px] tracking-wider"
                  >
                    <th className="py-2 px-2.5 w-10 text-center" style={{ color: '#ffffff' }}>#</th>
                    <th className="py-2 px-2.5" style={{ color: '#ffffff' }}>Description of Work / Specifications</th>
                    <th className="py-2 px-2.5 text-center w-20" style={{ color: '#ffffff' }}>Unit</th>
                    <th className="py-2 px-2.5 text-right w-24" style={{ color: '#ffffff', textAlign: 'right' }}>Measurements</th>
                    <th className="py-2 px-2.5 text-right w-28" style={{ color: '#ffffff', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                  {quotationItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">
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
                        <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-2.5">
                          <div className="font-bold text-slate-900 text-xs">{item.description}</div>
                          {item.material && (
                            <div className="text-[9.5px] font-semibold text-indigo-600 mt-0.5">
                              Material: {item.material}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[10.5px] text-slate-500 italic mt-0.5">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-medium text-slate-700 text-xs">
                          {item.unit}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-medium text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 text-xs">
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start pt-0.5">
              {/* Left Column: Words & Terms */}
              <div className="sm:col-span-7 space-y-2">
                {/* Total Quoted in Words Card */}
                <div 
                  className="p-2.5 rounded-lg border space-y-0.5"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                >
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                    TOTAL QUOTED AMOUNT IN WORDS:
                  </span>
                  <p className="text-xs font-bold italic tracking-tight" style={{ color: '#0f172a' }}>
                    {convertNumberToWords(totalQuoted)}
                  </p>
                </div>

                {/* Selected Terms & Conditions Card */}
                <div 
                  className="p-2.5 rounded-lg border text-[10.5px] space-y-1"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#334155' }}
                >
                  <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: '#e2e8f0' }}>
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 block">
                      Terms & Conditions:
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      {activeTerms.length} clauses specified
                    </span>
                  </div>
                  {activeTerms.length === 0 ? (
                    <p className="text-slate-400 italic text-[10px]">No specific terms selected for this quotation.</p>
                  ) : (
                    activeTerms.map((term, i) => (
                      <p key={term.id} className="leading-snug flex items-start gap-1.5 text-[10px]">
                        <span className="font-bold text-slate-900 shrink-0">{i + 1}.</span>
                        <span>{term.text}</span>
                      </p>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Executive Totals Ledger */}
              <div 
                className="sm:col-span-5 p-3 rounded-xl border space-y-1.5 text-xs"
                style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
              >
                <div className="flex justify-between items-center text-slate-600">
                  <span>Gross Quoted Total:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{formatCurrency(grossTotal)}</span>
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
                  <div className="flex justify-between items-center text-slate-900 font-bold pt-1 border-t" style={{ borderColor: '#e2e8f0' }}>
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
                  className="p-2.5 rounded-lg border mt-1 flex justify-between items-center"
                  style={{ backgroundColor: '#0f172a', borderColor: '#0f172a', color: '#ffffff' }}
                >
                  <span className="font-bold text-[10.5px] uppercase tracking-wider" style={{ color: '#ffffff' }}>
                    Net Balance Due:
                  </span>
                  <span className="font-mono font-black text-base" style={{ color: '#34d399' }}>
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Approved FORM13 Signature Area */}
            <div className="pt-4 border-t flex justify-end" style={{ borderColor: '#e2e8f0' }}>
              <div className="text-right space-y-1 shrink-0">
                <div className="h-9 flex items-end justify-end">
                  <div style={{ width: '180px', borderBottom: '1.5px dashed #64748b' }} />
                </div>
                <p className="font-bold text-[11px] uppercase tracking-wider" style={{ color: '#0f172a' }}>
                  Approved FORM13 Signature
                </p>
                <p className="text-[10px]" style={{ color: '#64748b' }}>
                  Authorized Signatory
                </p>
              </div>
            </div>


            {/* Document Verification & Security Footnote */}
            <div className="pt-2 border-t flex items-center justify-between text-[9px] text-slate-400" style={{ borderColor: '#f1f5f9' }}>
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={13} className="text-slate-400" />
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