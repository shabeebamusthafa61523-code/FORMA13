import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  RefreshCw, 
  Loader2, 
  Phone, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  ChevronUp, 
  Sparkles, 
  Building2, 
  PhoneCall, 
  Send,
  ShoppingCart,
  Eye,
  Calendar,
  Layers,
  ArrowUpDown,
  Tag,
  Receipt,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  Filter,
  CreditCard,
  AlertTriangle,
  Check,
  DollarSign,
  BookOpen,
  Clock
} from 'lucide-react';
import { 
  getVendors, 
  createVendor, 
  updateVendor, 
  deleteVendor,
  getVendorPurchases,
  recordSupplierPayment,
  getSupplierLedger,
  deleteSupplierPayment,
  deleteSupplierCredit
} from '../services/accountsService';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import ExcelExportButton from '../components/ExcelExportButton';

const SuppliersPage = () => {
  const { showToast } = useToast();
  const formRef = useRef(null);

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [creditFilter, setCreditFilter] = useState('ALL'); // 'ALL', 'WITH_DUES', 'LIMIT_EXCEEDED', 'SETTLED'

  // Inline Form State (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    openingBalance: '',
    creditLimit: '',
    paymentTermsDays: '30'
  });

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Record Payment Modal State ──
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [supplierForPayment, setSupplierForPayment] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'Bank Transfer',
    date: new Date().toISOString().split('T')[0],
    referenceNo: '',
    notes: ''
  });

  // ── Supplier Drawer State (Purchases & Ledger) ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState('purchases'); // 'purchases' | 'ledger'
  const [activeSupplier, setActiveSupplier] = useState(null);
  const [loadingDrawerData, setLoadingDrawerData] = useState(false);

  // Purchases Tab Data
  const [purchasesData, setPurchasesData] = useState([]);
  const [purchasesSummary, setPurchasesSummary] = useState(null);
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [purchaseCategoryFilter, setPurchaseCategoryFilter] = useState('ALL');
  const [purchasePaymentModeFilter, setPurchasePaymentModeFilter] = useState('ALL');

  // Ledger Tab Data
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('ALL'); // 'ALL', 'PURCHASE', 'PAYMENT', 'OPENING_BALANCE'

  // 1. Fetch All Suppliers
  const fetchSuppliersList = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await getVendors();
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        setSuppliers(list);
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      showToast('Error loading suppliers.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSuppliersList();
  }, [fetchSuppliersList]);

  // Load Drawer Content
  const loadDrawerContent = async (supplier, tab = 'purchases') => {
    setActiveSupplier(supplier);
    setDrawerActiveTab(tab);
    setIsDrawerOpen(true);
    setLoadingDrawerData(true);

    const supId = supplier._id || supplier.id;

    try {
      const [purRes, ledgerRes] = await Promise.allSettled([
        getVendorPurchases(supId),
        getSupplierLedger(supId)
      ]);

      if (purRes.status === 'fulfilled' && purRes.value?.success) {
        setPurchasesData(purRes.value.data?.purchases || []);
        setPurchasesSummary(purRes.value.data?.summary || null);
      } else {
        setPurchasesData([]);
        setPurchasesSummary(null);
      }

      if (ledgerRes.status === 'fulfilled' && ledgerRes.value?.success) {
        setLedgerEntries(ledgerRes.value.data?.ledger || []);
        setLedgerSummary(ledgerRes.value.data?.summary || null);
      } else {
        setLedgerEntries([]);
        setLedgerSummary(null);
      }
    } catch (err) {
      console.error('Error loading drawer data:', err);
      showToast('Failed to load supplier records.', 'error');
    } finally {
      setLoadingDrawerData(false);
    }
  };

  const handleOpenDrawerPurchases = (sup) => {
    loadDrawerContent(sup, 'purchases');
  };

  const handleOpenDrawerLedger = (sup) => {
    loadDrawerContent(sup, 'ledger');
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setActiveSupplier(null);
    setPurchasesData([]);
    setPurchasesSummary(null);
    setLedgerEntries([]);
    setLedgerSummary(null);
  };

  // Open Record Payment Modal
  const handleOpenPaymentModal = (supplier) => {
    setSupplierForPayment(supplier);
    const balance = Number(supplier.creditBalance || 0);
    setPaymentForm({
      amount: balance > 0 ? String(balance) : '',
      paymentMode: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      referenceNo: '',
      notes: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSupplierForPayment(null);
    setPaymentForm({
      amount: '',
      paymentMode: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      referenceNo: '',
      notes: ''
    });
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!supplierForPayment) return;
    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid amount greater than ₹0.', 'warning');
      return;
    }

    setPaymentSubmitting(true);
    try {
      const supId = supplierForPayment._id || supplierForPayment.id;
      const res = await recordSupplierPayment(supId, {
        amount: amt,
        paymentMode: paymentForm.paymentMode,
        date: paymentForm.date,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes
      });

      if (res && res.success !== false) {
        showToast(`Payment of ₹${amt.toLocaleString('en-IN')} recorded for ${supplierForPayment.name}.`, 'success');
        handleClosePaymentModal();
        fetchSuppliersList(true);
        if (isDrawerOpen && activeSupplier && (activeSupplier._id || activeSupplier.id) === supId) {
          loadDrawerContent(supplierForPayment, drawerActiveTab);
        }
      } else {
        showToast(res?.message || 'Failed to record payment.', 'error');
      }
    } catch (err) {
      console.error('Payment submit error:', err);
      showToast(err.response?.data?.message || err.message || 'Error recording payment.', 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Delete Payment Record from Ledger
  const handleDeletePayment = async (paymentId) => {
    if (!activeSupplier || !paymentId) return;
    const supId = activeSupplier._id || activeSupplier.id;
    try {
      const res = await deleteSupplierPayment(supId, paymentId);
      if (res && res.success !== false) {
        showToast('Payment record removed.', 'success');
        fetchSuppliersList(true);
        loadDrawerContent(activeSupplier, 'ledger');
      } else {
        showToast(res?.message || 'Failed to remove payment.', 'error');
      }
    } catch (err) {
      console.error('Delete payment error:', err);
      showToast('Error removing payment.', 'error');
    }
  };

  // Delete Manual Credit Record from Ledger
  const handleDeleteCredit = async (creditId) => {
    if (!activeSupplier || !creditId) return;
    const supId = activeSupplier._id || activeSupplier.id;
    try {
      const res = await deleteSupplierCredit(supId, creditId);
      if (res && res.success !== false) {
        showToast('Credit record removed.', 'success');
        fetchSuppliersList(true);
        loadDrawerContent(activeSupplier, 'ledger');
      } else {
        showToast(res?.message || 'Failed to remove credit record.', 'error');
      }
    } catch (err) {
      console.error('Delete credit error:', err);
      showToast('Error removing credit record.', 'error');
    }
  };

  // Toggle Inline Form
  const handleToggleForm = () => {
    if (isFormOpen && !editingSupplierId) {
      setIsFormOpen(false);
      return;
    }
    setEditingSupplierId(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      notes: '',
      openingBalance: '',
      creditLimit: '',
      paymentTermsDays: '30'
    });
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingSupplierId(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      notes: '',
      openingBalance: '',
      creditLimit: '',
      paymentTermsDays: '30'
    });
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplierId(sup._id || sup.id);
    setFormData({
      name: sup.name || '',
      phone: sup.phone || '',
      address: sup.address || '',
      notes: sup.notes || '',
      openingBalance: sup.openingBalance !== undefined && sup.openingBalance !== null ? String(sup.openingBalance) : '',
      creditLimit: sup.creditLimit !== undefined && sup.creditLimit !== null ? String(sup.creditLimit) : '',
      paymentTermsDays: sup.paymentTermsDays ? String(sup.paymentTermsDays) : '30'
    });
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleOpenDelete = (sup) => {
    setSupplierToDelete(sup);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    setDeleting(true);
    try {
      const id = supplierToDelete._id || supplierToDelete.id;
      const res = await deleteVendor(id);
      if (res && res.success !== false) {
        showToast('Supplier deleted successfully.', 'success');
        if (editingSupplierId === id) handleCancelForm();
        fetchSuppliersList(true);
      } else {
        showToast(res?.message || 'Failed to delete supplier.', 'error');
      }
    } catch (err) {
      console.error('Delete supplier error:', err);
      showToast('Error deleting supplier.', 'error');
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Supplier Name is required.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: '',
        gstin: '',
        address: formData.address.trim(),
        notes: formData.notes.trim(),
        openingBalance: parseFloat(formData.openingBalance) || 0,
        creditLimit: parseFloat(formData.creditLimit) || 0,
        paymentTermsDays: parseInt(formData.paymentTermsDays) || 30
      };

      if (editingSupplierId) {
        const res = await updateVendor(editingSupplierId, payload);
        if (res && res.success !== false) {
          showToast('Supplier updated successfully.', 'success');
          handleCancelForm();
          fetchSuppliersList(true);
        } else {
          showToast(res?.message || 'Failed to update supplier.', 'error');
        }
      } else {
        const res = await createVendor(payload);
        if (res && res.success !== false) {
          showToast('Supplier created successfully.', 'success');
          handleCancelForm();
          fetchSuppliersList(true);
        } else {
          showToast(res?.message || 'Failed to create supplier.', 'error');
        }
      }
    } catch (err) {
      console.error('Save supplier error:', err);
      showToast(err.response?.data?.message || err.message || 'Error saving supplier.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Suppliers List (No GSTIN / No Email filters)
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const name = (sup.name || '').toLowerCase();
        const phone = (sup.phone || '').toLowerCase();
        const notes = (sup.notes || '').toLowerCase();
        const addr = (sup.address || '').toLowerCase();
        if (
          !name.includes(q) &&
          !phone.includes(q) &&
          !notes.includes(q) &&
          !addr.includes(q)
        ) {
          return false;
        }
      }

      // Credit Status Filter
      if (creditFilter === 'WITH_DUES' && Number(sup.creditBalance || 0) <= 0) return false;
      if (creditFilter === 'LIMIT_EXCEEDED' && sup.creditStatus !== 'LIMIT_EXCEEDED') return false;
      if (creditFilter === 'SETTLED' && Number(sup.creditBalance || 0) !== 0) return false;

      return true;
    });
  }, [suppliers, searchTerm, creditFilter]);

  // Top Metrics Calculation
  const stats = useMemo(() => {
    let totalPurchasesCount = 0;
    let totalProcurementSpent = 0;
    let totalOutstandingPayable = 0;
    let suppliersWithDuesCount = 0;

    suppliers.forEach((s) => {
      const bal = Number(s.creditBalance || 0);
      if (bal > 0) {
        totalOutstandingPayable += bal;
        suppliersWithDuesCount++;
      }
      totalPurchasesCount += Number(s.purchaseCount || 0);
      totalProcurementSpent += Number(s.totalPurchasesAmount || 0);
    });

    return {
      total: suppliers.length,
      totalOutstandingPayable,
      suppliersWithDuesCount,
      totalPurchasesCount,
      totalProcurementSpent
    };
  }, [suppliers]);

  // Drawer Purchases Filter
  const filteredDrawerPurchases = useMemo(() => {
    return purchasesData.filter((p) => {
      if (purchaseSearch.trim()) {
        const q = purchaseSearch.toLowerCase().trim();
        const cat = (p.category || '').toLowerCase();
        const desc = (p.itemDescription || '').toLowerCase();
        const job = (p.jobId || '').toLowerCase();
        const client = (p.clientName || '').toLowerCase();
        const bill = (p.billNumber || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        if (!cat.includes(q) && !desc.includes(q) && !job.includes(q) && !client.includes(q) && !bill.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      if (purchaseCategoryFilter !== 'ALL' && p.category !== purchaseCategoryFilter) return false;
      if (purchasePaymentModeFilter !== 'ALL' && p.paymentMode !== purchasePaymentModeFilter) return false;

      return true;
    });
  }, [purchasesData, purchaseSearch, purchaseCategoryFilter, purchasePaymentModeFilter]);

  // Drawer Ledger Filter
  const filteredDrawerLedger = useMemo(() => {
    return ledgerEntries.filter((e) => {
      if (ledgerTypeFilter !== 'ALL') {
        if (ledgerTypeFilter === 'MANUAL_CREDIT') {
          if (!e.isManualCredit) return false;
        } else if (e.type !== ledgerTypeFilter) {
          return false;
        }
      }
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase().trim();
        const title = (e.title || '').toLowerCase();
        const ref = (e.refNo || '').toLowerCase();
        const notes = (e.notes || '').toLowerCase();
        const mode = (e.paymentMode || '').toLowerCase();
        if (!title.includes(q) && !ref.includes(q) && !notes.includes(q) && !mode.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [ledgerEntries, ledgerTypeFilter, ledgerSearch]);

  const drawerCategories = useMemo(() => {
    const set = new Set();
    purchasesData.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }, [purchasesData]);

  const drawerPaymentModes = useMemo(() => {
    const set = new Set();
    purchasesData.forEach(p => { if (p.paymentMode) set.add(p.paymentMode); });
    return Array.from(set).sort();
  }, [purchasesData]);

  // Excel Columns for main suppliers export (No Email, No GSTIN)
  const excelColumns = [
    { header: 'Supplier Name', key: 'name', width: 25 },
    { header: 'Credit Balance (₹)', key: 'creditBalance', width: 18 },
    { header: 'Credit Status', key: 'creditStatus', width: 16 },
    { header: 'Credit Limit (₹)', key: 'creditLimit', width: 16 },
    { header: 'Opening Balance (₹)', key: 'openingBalance', width: 18 },
    { header: 'Total Orders', key: 'purchaseCount', width: 14 },
    { header: 'Total Spent (₹)', key: 'totalPurchasesAmount', width: 18 },
    { header: 'Total Paid (₹)', key: 'totalPaidAmount', width: 18 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Notes', key: 'notes', width: 25 }
  ];

  // Excel Columns for Purchases
  const purchaseExcelColumns = [
    { header: 'Date', key: 'formattedDate', width: 15 },
    { header: 'Job ID', key: 'jobId', width: 15 },
    { header: 'Client Name', key: 'clientName', width: 20 },
    { header: 'Category / Material', key: 'category', width: 22 },
    { header: 'Description / Item', key: 'itemDescription', width: 30 },
    { header: 'Bill #', key: 'billNumber', width: 15 },
    { header: 'Qty', key: 'quantity', width: 10 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Rate (₹)', key: 'rate', width: 12 },
    { header: 'Amount (₹)', key: 'amount', width: 14 },
    { header: 'Payment Mode', key: 'paymentMode', width: 16 },
    { header: 'Notes', key: 'notes', width: 25 }
  ];

  // Excel Columns for Ledger Statement
  const ledgerExcelColumns = [
    { header: 'Date', key: 'formattedDate', width: 15 },
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Description / Title', key: 'title', width: 30 },
    { header: 'Ref / Bill #', key: 'refNo', width: 18 },
    { header: 'Payment Mode', key: 'paymentMode', width: 15 },
    { header: 'Debit / Paid (₹)', key: 'debit', width: 16 },
    { header: 'Credit / Billed (₹)', key: 'credit', width: 16 },
    { header: 'Running Balance (₹)', key: 'runningBalance', width: 18 },
    { header: 'Notes', key: 'notes', width: 25 }
  ];

  const drawerPurchaseExcelData = useMemo(() => {
    return filteredDrawerPurchases.map(p => ({
      ...p,
      formattedDate: p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—'
    }));
  }, [filteredDrawerPurchases]);

  const drawerLedgerExcelData = useMemo(() => {
    return filteredDrawerLedger.map(e => ({
      ...e,
      formattedDate: e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—'
    }));
  }, [filteredDrawerLedger]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-3 max-w-[1700px] mx-auto text-slate-800 dark:text-slate-100">
      
      {/* ── 1. Header Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs">
            <Truck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Suppliers & Credit Payables
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                {suppliers.length} active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Track vendor credits, payment settlements, procurement purchases & live ledgers
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
          <button
            onClick={() => fetchSuppliersList(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Suppliers"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>

          <ExcelExportButton
            data={filteredSuppliers}
            columns={excelColumns}
            filename={`Suppliers_Ledger_${new Date().toISOString().split('T')[0]}`}
            buttonText="Export Excel"
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
          />

          <button
            onClick={handleToggleForm}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
              isFormOpen
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isFormOpen ? <ChevronUp size={14} /> : <Plus size={14} />}
            <span>{isFormOpen ? 'Collapse Form' : 'Add Supplier'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Overview Metrics Cards Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Total Outstanding Payables */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 block leading-tight">
              Total Outstanding Due
            </span>
            <div className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 leading-tight">
              ₹{stats.totalOutstandingPayable.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <CreditCard size={14} />
          </div>
        </div>

        {/* Suppliers With Dues */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 block leading-tight">
              Suppliers with Dues
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {stats.suppliersWithDuesCount} of {stats.total}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={14} />
          </div>
        </div>

        {/* Total Procurement Spent */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
              Total Procurement Spent
            </span>
            <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
              ₹{stats.totalProcurementSpent.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Receipt size={14} />
          </div>
        </div>

        {/* Total Purchases Recorded */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
              Total Purchases Orders
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {stats.totalPurchasesCount} orders
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <ShoppingCart size={14} />
          </div>
        </div>
      </div>

      {/* ── 3. Inline Expandable Form (No Email, No GSTIN) ── */}
      <div ref={formRef}>
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className={`rounded-xl p-3.5 border shadow-xs mb-1.5 ${
                editingSupplierId
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-850 border-indigo-200 dark:border-indigo-900/50'
              }`}>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className={editingSupplierId ? "text-amber-600" : "text-indigo-600"} />
                    <span>{editingSupplierId ? 'Edit Supplier Details & Credit Limits' : 'Add New Supplier / Vendor'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-2.5">
                  {/* Name and Phone Only */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Supplier / Firm Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Golden Aluminium"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Credit & Terms Configuration Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                        Opening Credit Balance (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 (Pre-existing debt owed)"
                        value={formData.openingBalance}
                        onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Pre-existing credit balance</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                        Credit Limit (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 for No Limit"
                        value={formData.creditLimit}
                        onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Max allowable credit</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                        Payment Terms (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="30"
                        value={formData.paymentTermsDays}
                        onChange={(e) => setFormData({ ...formData, paymentTermsDays: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Billing cycle days</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Address / Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Industrial Estate, Calicut Road"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Supplies / Notes / Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Deals in Aluminium Profiles & Hardware"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs cursor-pointer flex items-center gap-1.5 ${
                        editingSupplierId
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          <span>{editingSupplierId ? 'Update Supplier' : 'Save Supplier'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 4. Clean Filter Strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <div className="relative w-52 sm:w-72">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search supplier, phone, address, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Credit Status Filter */}
          <select
            value={creditFilter}
            onChange={(e) => setCreditFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer font-medium"
          >
            <option value="ALL">All Credit Status</option>
            <option value="WITH_DUES">Has Outstanding Due</option>
            <option value="LIMIT_EXCEEDED">⚠️ Limit Exceeded</option>
            <option value="SETTLED">Settled / Clear</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 shrink-0">
          <span>Showing</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {filteredSuppliers.length} of {suppliers.length}
          </span>
        </div>
      </div>

      {/* ── 5. Suppliers Table (No Email, No GSTIN) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-slate-500">Loading Suppliers & Balances...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="py-12 text-center">
            <Truck size={22} className="mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Suppliers Found
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">
              {searchTerm || creditFilter !== 'ALL'
                ? 'Try adjusting your search query or credit filter.'
                : 'Click "+ Add Supplier" above to record your first vendor / supplier.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Credit Balance</th>
                  <th className="py-2.5 px-3">Limit & Terms</th>
                  <th className="py-2.5 px-3">Purchases / Spent</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Location / Address</th>
                  <th className="py-2.5 px-3">Supplies / Remarks</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredSuppliers.map((sup) => {
                  const id = sup._id || sup.id;
                  const isRowBeingEdited = editingSupplierId === id;
                  const balance = Number(sup.creditBalance || 0);
                  const limit = Number(sup.creditLimit || 0);
                  const purchasesCount = Number(sup.purchaseCount || 0);
                  const totalSpent = Number(sup.totalPurchasesAmount || 0);

                  return (
                    <tr 
                      key={id} 
                      className={`transition-colors ${
                        isRowBeingEdited 
                          ? 'bg-amber-50/80 dark:bg-amber-950/40' 
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Name - Click opens drawer */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        <button
                          type="button"
                          onClick={() => handleOpenDrawerPurchases(sup)}
                          className="flex items-center gap-2 group text-left cursor-pointer focus:outline-hidden"
                          title="Click to view purchases & ledger"
                        >
                          <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {(sup.name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {sup.name}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-normal">
                              View purchases &rarr;
                            </span>
                          </div>
                        </button>
                      </td>

                      {/* Credit Balance Badge */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {sup.creditStatus === 'LIMIT_EXCEEDED' ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300">
                            <AlertTriangle size={11} className="text-rose-600" />
                            <span>₹{balance.toLocaleString('en-IN')} Due</span>
                          </div>
                        ) : balance > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                            <span>₹{balance.toLocaleString('en-IN')} Due</span>
                          </div>
                        ) : balance < 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200">
                            <span>₹{Math.abs(balance).toLocaleString('en-IN')} Advance</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200">
                            <Check size={11} />
                            <span>Settled</span>
                          </div>
                        )}
                      </td>

                      {/* Credit Limit & Terms */}
                      <td className="py-2 px-3 whitespace-nowrap text-[11px]">
                        <div className="flex flex-col text-slate-600 dark:text-slate-400">
                          <span>
                            {limit > 0 ? (
                              <strong className="text-slate-800 dark:text-slate-200">
                                ₹{limit.toLocaleString('en-IN')}
                              </strong>
                            ) : (
                              <span className="italic text-slate-400">No limit</span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Term: {sup.paymentTermsDays || 30} days
                          </span>
                        </div>
                      </td>

                      {/* Purchases badge */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDrawerPurchases(sup)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                            purchasesCount > 0
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 hover:border-indigo-300 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200/60'
                          }`}
                          title="Click to view purchase orders"
                        >
                          <ShoppingCart size={11} className={purchasesCount > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                          <span>{purchasesCount} orders</span>
                          {totalSpent > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600 font-normal">•</span>
                              <span className="text-emerald-700 dark:text-emerald-400">
                                ₹{totalSpent.toLocaleString('en-IN')}
                              </span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Phone */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {sup.phone ? (
                          <a
                            href={`tel:${sup.phone}`}
                            className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-medium"
                          >
                            <PhoneCall size={11} className="text-emerald-500" />
                            <span>{sup.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 italic">No phone</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={sup.address}>
                        {sup.address || <span className="text-slate-300 dark:text-slate-600 italic">-</span>}
                      </td>

                      {/* Notes / Remarks */}
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={sup.notes}>
                        {sup.notes || <span className="text-slate-300 dark:text-slate-600 italic">-</span>}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Pay Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(sup)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/80 dark:border-emerald-800/60 transition cursor-pointer shadow-2xs"
                            title="Record Payment to Supplier"
                          >
                            <CreditCard size={11} />
                            <span>Pay</span>
                          </button>

                          {/* Ledger & Statement Button */}
                          <button
                            onClick={() => handleOpenDrawerLedger(sup)}
                            className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition cursor-pointer"
                            title="View Statement & Ledger"
                          >
                            <BookOpen size={13} />
                          </button>

                          {/* Purchases View */}
                          <button
                            onClick={() => handleOpenDrawerPurchases(sup)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                            title="View Purchases"
                          >
                            <ShoppingCart size={13} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(sup)}
                            className={`p-1 rounded transition cursor-pointer ${
                              isRowBeingEdited
                                ? 'text-amber-700 bg-amber-100 font-bold'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Edit Supplier & Limits"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleOpenDelete(sup)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Delete Supplier"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 6. Record Payment Modal ── */}
      {isPaymentModalOpen && supplierForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={handleClosePaymentModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-xs text-slate-800 dark:text-slate-100"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Record Supplier Payment
                  </h3>
                  <p className="text-[11px] text-slate-500">{supplierForPayment.name}</p>
                </div>
              </div>
              <button 
                onClick={handleClosePaymentModal} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Balance Banner */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Current Credit Due
                </span>
                <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                  ₹{Number(supplierForPayment.creditBalance || 0).toLocaleString('en-IN')}
                </span>
              </div>
              {Number(supplierForPayment.creditBalance || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentForm({ ...paymentForm, amount: String(supplierForPayment.creditBalance) })}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 cursor-pointer transition border border-emerald-300"
                >
                  Pay Full Balance
                </button>
              )}
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 15000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UTR / Cheque / Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR12345678"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared Aluminium invoice balance"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {paymentSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>Confirm & Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── 7. Supplier Drawer (Purchases & Ledger Tabs - No GSTIN badge) ── */}
      {isDrawerOpen && activeSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={handleCloseDrawer} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
          >
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {(activeSupplier.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {activeSupplier.name}
                    </h2>
                    {Number(activeSupplier.creditBalance || 0) > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300">
                        ₹{Number(activeSupplier.creditBalance || 0).toLocaleString('en-IN')} Due
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        Settled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {activeSupplier.phone && <span>Tel: {activeSupplier.phone}</span>}
                    {activeSupplier.address && <span>• {activeSupplier.address}</span>}
                  </div>
                </div>
              </div>

              {/* Drawer Top Right Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenPaymentModal(activeSupplier)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CreditCard size={12} />
                  <span>Record Payment</span>
                </button>

                {drawerActiveTab === 'purchases' && filteredDrawerPurchases.length > 0 && (
                  <ExcelExportButton
                    data={drawerPurchaseExcelData}
                    columns={purchaseExcelColumns}
                    filename={`${activeSupplier.name}_Purchases_${new Date().toISOString().split('T')[0]}`}
                    buttonText="Export Excel"
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                  />
                )}

                {drawerActiveTab === 'ledger' && filteredDrawerLedger.length > 0 && (
                  <ExcelExportButton
                    data={drawerLedgerExcelData}
                    columns={ledgerExcelColumns}
                    filename={`${activeSupplier.name}_Statement_Ledger_${new Date().toISOString().split('T')[0]}`}
                    buttonText="Export Statement"
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                  />
                )}

                <button
                  onClick={handleCloseDrawer}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tab Selector Strip */}
            <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
              <button
                type="button"
                onClick={() => setDrawerActiveTab('purchases')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                  drawerActiveTab === 'purchases'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShoppingCart size={13} />
                <span>What We Purchased ({purchasesData.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerActiveTab('ledger')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                  drawerActiveTab === 'ledger'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen size={13} />
                <span>Credit Ledger & Statement ({ledgerEntries.length})</span>
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {loadingDrawerData ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={26} className="animate-spin text-indigo-600" />
                  <p className="text-xs font-semibold">Loading supplier purchases and ledger statement...</p>
                </div>
              ) : drawerActiveTab === 'purchases' ? (
                /* ── TAB 1: PURCHASES TAB ── */
                <>
                  {purchasesData.length === 0 ? (
                    <div className="py-16 text-center">
                      <ShoppingCart size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No Purchases Recorded Yet
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        No raw materials or workspace job purchases have been recorded under "{activeSupplier.name}" so far.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Total Orders
                          </span>
                          <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                            {purchasesSummary?.totalPurchases || purchasesData.length}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Total Procurement Spent
                          </span>
                          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ₹{(purchasesSummary?.totalAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Filtered Total
                          </span>
                          <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            ₹{filteredDrawerPurchases.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Categories
                          </span>
                          <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                            {drawerCategories.length} types
                          </div>
                        </div>
                      </div>

                      {/* Filter Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-2">
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          <div className="relative w-44 sm:w-60">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search item, Job ID, bill #..."
                              value={purchaseSearch}
                              onChange={(e) => setPurchaseSearch(e.target.value)}
                              className="w-full pl-7 pr-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                            />
                          </div>

                          {drawerCategories.length > 1 && (
                            <select
                              value={purchaseCategoryFilter}
                              onChange={(e) => setPurchaseCategoryFilter(e.target.value)}
                              className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              <option value="ALL">All Categories ({drawerCategories.length})</option>
                              {drawerCategories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          )}

                          {drawerPaymentModes.length > 1 && (
                            <select
                              value={purchasePaymentModeFilter}
                              onChange={(e) => setPurchasePaymentModeFilter(e.target.value)}
                              className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              <option value="ALL">All Payment Modes</option>
                              {drawerPaymentModes.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <span className="text-xs font-semibold text-slate-500">
                          {filteredDrawerPurchases.length} of {purchasesData.length} records
                        </span>
                      </div>

                      {/* Purchases Table */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-[46vh] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                              <tr>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Job ID & Client</th>
                                <th className="py-2.5 px-3">Category / Material</th>
                                <th className="py-2.5 px-3">Description / Item</th>
                                <th className="py-2.5 px-3">Bill #</th>
                                <th className="py-2.5 px-3">Qty & Rate</th>
                                <th className="py-2.5 px-3">Amount</th>
                                <th className="py-2.5 px-3">Payment Mode</th>
                                <th className="py-2.5 px-3">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                              {filteredDrawerPurchases.map((p, idx) => (
                                <tr key={p._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                                    {p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                  </td>
                                  <td className="py-2 px-3 whitespace-nowrap font-semibold">
                                    {p.jobId ? (
                                      <div className="flex flex-col">
                                        <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                                          {p.jobId}
                                        </span>
                                        {p.clientName && (
                                          <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                            {p.clientName}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic">General Purchase</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                                      {p.category || 'Raw Material'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 max-w-xs truncate" title={p.itemDescription}>
                                    {p.itemDescription ? (
                                      <span className="font-medium text-slate-900 dark:text-white">
                                        {p.itemDescription}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                                    {p.billNumber ? (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                                        {p.billNumber}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 text-[11px]">
                                    {p.quantity > 0 ? (
                                      <span>
                                        {p.quantity} {p.unit || ''} {p.rate > 0 ? `@ ₹${p.rate}` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                                    ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2 px-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      p.paymentMode === 'Credit/Pay Later'
                                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300'
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                                    }`}>
                                      {p.paymentMode || 'Cash'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 max-w-xs truncate" title={p.notes}>
                                    {p.notes || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* ── TAB 2: CREDIT LEDGER & STATEMENT TAB ── */
                <>
                  {/* Ledger Financial Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Opening Credit
                      </span>
                      <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        ₹{(ledgerSummary?.openingBalance || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Purchases Billed
                      </span>
                      <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        ₹{(ledgerSummary?.totalPurchasesBilled || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
                        Total Paid (Settlements)
                      </span>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ₹{(ledgerSummary?.totalPaid || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                        Current Balance Due
                      </span>
                      <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        ₹{Number(activeSupplier.creditBalance || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Ledger Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-2">
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                      <div className="relative w-44 sm:w-60">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search statement, ref #, mode..."
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          className="w-full pl-7 pr-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                        />
                      </div>

                      <select
                        value={ledgerTypeFilter}
                        onChange={(e) => setLedgerTypeFilter(e.target.value)}
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <option value="ALL">All Entries</option>
                        <option value="PURCHASE">Purchase Bills Only</option>
                        <option value="PAYMENT">Payments Made Only</option>
                            <option value="MANUAL_CREDIT">Direct Credits Only</option>
                        <option value="OPENING_BALANCE">Opening Balance</option>
                      </select>
                    </div>

                    <span className="text-xs font-semibold text-slate-500">
                      {filteredDrawerLedger.length} of {ledgerEntries.length} entries
                    </span>
                  </div>

                  {/* Ledger Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[46vh] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Description / Title</th>
                            <th className="py-2.5 px-3">Ref / Bill #</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-right">Debit / Paid (₹)</th>
                            <th className="py-2.5 px-3 text-right">Credit / Billed (₹)</th>
                            <th className="py-2.5 px-3 text-right">Running Bal (₹)</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                          {filteredDrawerLedger.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400">
                                No statement records match your criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredDrawerLedger.map((e, idx) => {
                              const isPayment = e.type === 'PAYMENT';
                              const isOpening = e.type === 'OPENING_BALANCE';

                              return (
                                <tr key={e._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                                    {e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                  </td>

                                  <td className="py-2 px-3 whitespace-nowrap">
                                    {isPayment ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                                        Payment Paid
                                      </span>
                                    ) : isOpening ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300">
                                        Opening Bal
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        Purchase Bill
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-2 px-3 max-w-xs truncate font-medium text-slate-900 dark:text-white" title={e.title}>
                                    {e.title}
                                  </td>

                                  <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                    {e.refNo || '—'}
                                  </td>

                                  <td className="py-2 px-3 whitespace-nowrap text-[11px]">
                                    <span className="text-slate-600 dark:text-slate-300">{e.paymentMode || '—'}</span>
                                  </td>

                                  {/* Debit / Paid */}
                                  <td className="py-2 px-3 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                                    {e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '—'}
                                  </td>

                                  {/* Credit / Billed */}
                                  <td className="py-2 px-3 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                                    {e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '—'}
                                  </td>

                                  {/* Running Balance */}
                                  <td className="py-2 px-3 text-right whitespace-nowrap font-bold font-mono text-indigo-700 dark:text-indigo-400">
                                    ₹{Number(e.runningBalance || 0).toLocaleString('en-IN')}
                                  </td>

                                  {/* Actions (Delete for manual payment records) */}
                                  <td className="py-2 px-3 text-center whitespace-nowrap">
                                    {isPayment && e._id ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePayment(e._id)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                        title="Delete payment"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    ) : e.isManualCredit && e._id ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCredit(e._id)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                        title="Delete credit record"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Supplier: <strong className="text-slate-900 dark:text-white">{activeSupplier.name}</strong> • Terms: {activeSupplier.paymentTermsDays || 30} days
              </span>
              <button
                onClick={handleCloseDrawer}
                className="px-3 py-1.5 font-semibold text-xs rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Close View
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── 8. Confirm Delete Modal ── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier"
        message={`Are you sure you want to remove supplier "${supplierToDelete?.name}"?`}
        confirmText={deleting ? "Deleting..." : "Delete"}
      />
    </div>
  );
};

export default SuppliersPage;
