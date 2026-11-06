import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Hammer, Search, Plus, Loader2, ArrowRight, Phone, MapPin, 
  CheckCircle2, Clock, AlertCircle, Trash2, Calendar, 
  DollarSign, RefreshCw, X, TrendingUp, Building2,
  ShoppingCart, Users, CreditCard, FileText, Receipt,
  Filter, SlidersHorizontal, ArrowUpDown, ChevronRight,
  ExternalLink
} from 'lucide-react';
import { 
  getFabricationJobs, 
  createFabricationJob, 
  deleteFabricationJob 
} from '../services/fabricationService';
import { getClients } from '../services/clientService';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import ExcelExportButton from '../components/ExcelExportButton';

const statusColors = {
  'Quotation Stage': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  'Confirmed / In Progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  'On Hold': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
  'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  'Cancelled': 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const FabricationPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Active Main Sub-Tab ('jobs' | 'purchases' | 'wages' | 'site-expenses' | 'payments')
  const [activeMainTab, setActiveMainTab] = useState('jobs');

  const [jobs, setJobs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalJobs, setTotalJobs] = useState(0);
  const [metrics, setMetrics] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalQuoted: 0,
    totalReceived: 0,
    totalDirectCost: 0,
    totalBalanceDue: 0,
    totalNetProfit: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Full datasets for sub-tabs
  const [allJobsData, setAllJobsData] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Sub-Tab Filters & Searches
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const [purchasesVendorFilter, setPurchasesVendorFilter] = useState('ALL');
  const [purchasesJobFilter, setPurchasesJobFilter] = useState('ALL');

  const [wagesSearch, setWagesSearch] = useState('');
  const [wagesEmployeeFilter, setWagesEmployeeFilter] = useState('ALL');
  const [wagesJobFilter, setWagesJobFilter] = useState('ALL');

  const [siteExpSearch, setSiteExpSearch] = useState('');
  const [siteExpCategoryFilter, setSiteExpCategoryFilter] = useState('ALL');
  const [siteExpJobFilter, setSiteExpJobFilter] = useState('ALL');

  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsJobFilter, setPaymentsJobFilter] = useState('ALL');

  // Existing clients for dropdown
  const [clientsList, setClientsList] = useState([]);

  // New Job Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newJobForm, setNewJobForm] = useState({
    selectedClientId: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    siteAddress: '',
    status: 'Confirmed / In Progress',
    startDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    notes: ''
  });

  // Delete Job State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Fetch Paginated Jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFabricationJobs({
        search,
        status: statusFilter,
        page: currentPage,
        limit: itemsPerPage
      });
      if (res && res.success) {
        const rawJobs = res.data.jobs || [];
        const sorted = rawJobs.slice().sort((a, b) => {
          const dA = new Date(a.startDate || a.createdAt || 0).getTime();
          const dB = new Date(b.startDate || b.createdAt || 0).getTime();
          return dB - dA;
        });
        setJobs(sorted);
        setTotalJobs(res.data.pagination?.total ?? (sorted.length || 0));
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      showToast('Error loading workspace jobs', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentPage, itemsPerPage, showToast]);

  // 2. Fetch All Jobs for Sub-Tabs (Purchases, Wages, Site Expenses, Payments)
  const fetchAllJobsData = useCallback(async () => {
    setLoadingAll(true);
    try {
      const res = await getFabricationJobs({ limit: 1000 });
      if (res && res.success && Array.isArray(res.data.jobs)) {
        setAllJobsData(res.data.jobs);
      }
    } catch (err) {
      console.warn('Error fetching all jobs data for tabs:', err);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchAllJobsData();
  }, [fetchAllJobsData]);

  // Fetch Clients for dropdown
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await getClients({ limit: 500 });
        if (res && res.success) {
          setClientsList(res.data.clients || []);
        }
      } catch (err) {
        console.warn('Failed to load clients list:', err);
      }
    };
    loadClients();
  }, []);

  // Sync client selection in new job modal
  const handleClientSelect = (clientId) => {
    if (!clientId) {
      setNewJobForm(prev => ({
        ...prev,
        selectedClientId: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        siteAddress: ''
      }));
      return;
    }

    const c = clientsList.find(item => item._id === clientId);
    if (c) {
      setNewJobForm(prev => ({
        ...prev,
        selectedClientId: c._id,
        clientName: c.clientName || c.companyName || '',
        clientPhone: c.phone || '',
        clientEmail: c.email || '',
        siteAddress: c.address || ''
      }));
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newJobForm.clientName.trim()) {
      showToast('Please provide a client or company name', 'warning');
      return;
    }
    if (!newJobForm.clientPhone.trim()) {
      showToast('Please provide a client contact phone number', 'warning');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        client: newJobForm.selectedClientId || undefined,
        clientName: newJobForm.clientName.trim(),
        clientPhone: newJobForm.clientPhone.trim(),
        clientEmail: newJobForm.clientEmail.trim(),
        siteAddress: newJobForm.siteAddress.trim(),
        status: newJobForm.status,
        startDate: newJobForm.startDate ? new Date(newJobForm.startDate) : new Date(),
        deliveryDate: newJobForm.deliveryDate ? new Date(newJobForm.deliveryDate) : undefined,
        notes: newJobForm.notes.trim()
      };

      const res = await createFabricationJob(payload);
      if (res && res.success) {
        showToast('Workspace job created successfully!', 'success');
        setIsCreateOpen(false);
        setNewJobForm({
          selectedClientId: '',
          clientName: '',
          clientPhone: '',
          clientEmail: '',
          siteAddress: '',
          status: 'Confirmed / In Progress',
          startDate: new Date().toISOString().split('T')[0],
          deliveryDate: '',
          notes: ''
        });
        fetchJobs();
        fetchAllJobsData();
        if (res.data?._id) {
          navigate(`/fabrication/${res.data._id}`);
        }
      } else {
        showToast(res?.message || 'Failed to create fabrication job', 'error');
      }
    } catch (err) {
      console.error('Error creating job:', err);
      showToast(err.response?.data?.message || 'Failed to create fabrication job', 'error');
    } finally {
      setCreating(false);
    }
  };

  const promptDeleteJob = (job, e) => {
    e.stopPropagation();
    setJobToDelete(job);
    setDeleteModalOpen(true);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteFabricationJob(jobToDelete._id);
      if (res && res.success) {
        showToast('Fabrication job deleted successfully', 'success');
        setJobs(prev => prev.filter(j => j._id !== jobToDelete._id));
        fetchJobs();
        fetchAllJobsData();
      } else {
        showToast(res?.message || 'Failed to delete fabrication job', 'error');
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      showToast('Error deleting job', 'error');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setJobToDelete(null);
    }
  };

  // ==========================================
  // MEMOIZED EXTRACTED SUB-LEDGERS
  // ==========================================
  // 1. All Purchases (Material Purchases across jobs)
  const allPurchases = useMemo(() => {
    const list = [];
    allJobsData.forEach(j => {
      (j.purchasesAndExpenses || []).forEach(p => {
        if (p.type === 'Purchase') {
          list.push({
            ...p,
            jobMongoId: j._id,
            jobId: j.jobId,
            clientName: j.clientName,
            clientPhone: j.clientPhone
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [allJobsData]);

  // 2. All Site Expenses (Site Travel, Food, On-site Overheads across jobs)
  const allSiteExpenses = useMemo(() => {
    const list = [];
    allJobsData.forEach(j => {
      (j.purchasesAndExpenses || []).forEach(e => {
        if (e.type === 'Expense') {
          list.push({
            ...e,
            jobMongoId: j._id,
            jobId: j.jobId,
            clientName: j.clientName,
            clientPhone: j.clientPhone
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [allJobsData]);

  // 3. All Daily Wages (Staff & Fabricator Wage Slips across jobs)
  const allDailyWages = useMemo(() => {
    const list = [];
    allJobsData.forEach(j => {
      (j.dailyWages || []).forEach(w => {
        list.push({
          ...w,
          jobMongoId: j._id,
          jobId: j.jobId,
          clientName: j.clientName
        });
      });
    });
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [allJobsData]);

  // 4. All Client Payments (Amount Given by clients across jobs)
  const allClientPayments = useMemo(() => {
    const list = [];
    allJobsData.forEach(j => {
      (j.clientPayments || []).forEach(cp => {
        list.push({
          ...cp,
          jobMongoId: j._id,
          jobId: j.jobId,
          clientName: j.clientName
        });
      });
    });
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [allJobsData]);

  // Unique Dropdown Options
  const uniqueVendors = useMemo(() => {
    const set = new Set();
    allPurchases.forEach(p => { if (p.vendorName) set.add(p.vendorName.trim()); });
    return Array.from(set).sort();
  }, [allPurchases]);

  const uniqueEmployees = useMemo(() => {
    const set = new Set();
    allDailyWages.forEach(w => { if (w.employeeName) set.add(w.employeeName.trim()); });
    return Array.from(set).sort();
  }, [allDailyWages]);

  const uniqueExpenseCategories = useMemo(() => {
    const set = new Set();
    allSiteExpenses.forEach(e => { if (e.category) set.add(e.category.trim()); });
    return Array.from(set).sort();
  }, [allSiteExpenses]);

  const uniqueJobs = useMemo(() => {
    return allJobsData.map(j => ({ id: j.jobId, name: j.clientName })).sort((a, b) => a.id.localeCompare(b.id));
  }, [allJobsData]);

  // Filtered Sub-Lists
  const filteredPurchases = useMemo(() => {
    return allPurchases.filter(p => {
      if (purchasesVendorFilter !== 'ALL' && (p.vendorName || '').toLowerCase() !== purchasesVendorFilter.toLowerCase()) return false;
      if (purchasesJobFilter !== 'ALL' && p.jobId !== purchasesJobFilter) return false;
      if (purchasesSearch.trim()) {
        const q = purchasesSearch.toLowerCase();
        const matches = 
          (p.vendorName || '').toLowerCase().includes(q) ||
          (p.itemDescription || '').toLowerCase().includes(q) ||
          (p.billNumber || '').toLowerCase().includes(q) ||
          (p.clientName || '').toLowerCase().includes(q) ||
          (p.jobId || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allPurchases, purchasesVendorFilter, purchasesJobFilter, purchasesSearch]);

  const filteredDailyWages = useMemo(() => {
    return allDailyWages.filter(w => {
      if (wagesEmployeeFilter !== 'ALL' && (w.employeeName || '').toLowerCase() !== wagesEmployeeFilter.toLowerCase()) return false;
      if (wagesJobFilter !== 'ALL' && w.jobId !== wagesJobFilter) return false;
      if (wagesSearch.trim()) {
        const q = wagesSearch.toLowerCase();
        const matches = 
          (w.employeeName || '').toLowerCase().includes(q) ||
          (w.workDescription || '').toLowerCase().includes(q) ||
          (w.clientName || '').toLowerCase().includes(q) ||
          (w.jobId || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allDailyWages, wagesEmployeeFilter, wagesJobFilter, wagesSearch]);

  const filteredSiteExpenses = useMemo(() => {
    return allSiteExpenses.filter(e => {
      if (siteExpCategoryFilter !== 'ALL' && (e.category || '').toLowerCase() !== siteExpCategoryFilter.toLowerCase()) return false;
      if (siteExpJobFilter !== 'ALL' && e.jobId !== siteExpJobFilter) return false;
      if (siteExpSearch.trim()) {
        const q = siteExpSearch.toLowerCase();
        const matches = 
          (e.category || '').toLowerCase().includes(q) ||
          (e.itemDescription || '').toLowerCase().includes(q) ||
          (e.notes || '').toLowerCase().includes(q) ||
          (e.clientName || '').toLowerCase().includes(q) ||
          (e.jobId || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allSiteExpenses, siteExpCategoryFilter, siteExpJobFilter, siteExpSearch]);

  const filteredClientPayments = useMemo(() => {
    return allClientPayments.filter(cp => {
      if (paymentsJobFilter !== 'ALL' && cp.jobId !== paymentsJobFilter) return false;
      if (paymentsSearch.trim()) {
        const q = paymentsSearch.toLowerCase();
        const matches = 
          (cp.transactionReference || '').toLowerCase().includes(q) ||
          (cp.receivedBy || '').toLowerCase().includes(q) ||
          (cp.notes || '').toLowerCase().includes(q) ||
          (cp.clientName || '').toLowerCase().includes(q) ||
          (cp.jobId || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allClientPayments, paymentsJobFilter, paymentsSearch]);

  // Aggregated totals
  const totalPurchasesSum = useMemo(() => allPurchases.reduce((s, p) => s + (Number(p.amount) || 0), 0), [allPurchases]);
  const totalWagesSum = useMemo(() => allDailyWages.reduce((s, w) => s + (Number(w.totalWage) || 0), 0), [allDailyWages]);
  const totalSiteExpSum = useMemo(() => allSiteExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [allSiteExpenses]);
  const totalPaymentsSum = useMemo(() => allClientPayments.reduce((s, cp) => s + (Number(cp.amount) || 0), 0), [allClientPayments]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Hammer size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Workspace & Job Ledger
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage client projects, quotations, employee daily wages, materials & client payments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchJobs();
              fetchAllJobsData();
            }}
            disabled={loading || loadingAll}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh jobs and ledgers"
          >
            <RefreshCw size={18} className={(loading || loadingAll) ? 'animate-spin text-indigo-600' : ''} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>New Workspace Job</span>
          </button>
        </div>
      </div>

      {/* 2. Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quoted Pipeline */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Quoted</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(metrics.totalQuoted)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {metrics.totalJobs} recorded jobs
          </div>
        </div>

        {/* Amount Given by Clients */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Amount Received</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(metrics.totalReceived)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total advances & installments received
          </div>
        </div>

        {/* Direct Costs Incurred */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Direct Costs</span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(metrics.totalDirectCost)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Purchases + Wages + Site Expenses
          </div>
        </div>

        {/* Outstanding Balance Due */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Balance Due</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <AlertCircle size={16} />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(metrics.totalBalanceDue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Pending receivable from clients
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. WORKSPACE SUB-TABS (Jobs | Purchases | Wages | Site Expenses | Payments)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveMainTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'jobs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Hammer size={15} />
          <span>Workspace Jobs ({metrics.totalJobs})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'purchases'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingCart size={15} />
          <span>Purchases ({allPurchases.length})</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
            activeMainTab === 'purchases' ? 'bg-purple-700 text-white' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
          }`}>
            ₹{totalPurchasesSum.toLocaleString('en-IN')}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('wages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'wages'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Users size={15} />
          <span>Daily Wages ({allDailyWages.length})</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
            activeMainTab === 'wages' ? 'bg-blue-700 text-white' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
          }`}>
            ₹{totalWagesSum.toLocaleString('en-IN')}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('site-expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'site-expenses'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin size={15} />
          <span>Site Expenses ({allSiteExpenses.length})</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
            activeMainTab === 'site-expenses' ? 'bg-rose-700 text-white' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
          }`}>
            ₹{totalSiteExpSum.toLocaleString('en-IN')}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'payments'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard size={15} />
          <span>Client Receipts ({allClientPayments.length})</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
            activeMainTab === 'payments' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
          }`}>
            ₹{totalPaymentsSum.toLocaleString('en-IN')}
          </span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 1: WORKSPACE JOBS LEDGER (DEFAULT)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'jobs' && (
        <div className="space-y-4">
          {/* Search and Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by client name, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['All', 'Confirmed / In Progress', 'Quotation Stage', 'Completed', 'On Hold'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Jobs List Table */}
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
              <p className="text-sm">Loading workspace jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-3">
                <Hammer size={24} />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                No workspace jobs found
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-4">
                {search || statusFilter !== 'All' 
                  ? 'Try modifying your search or filter criteria.' 
                  : 'Create your first client project to start managing quotations, wages, and materials.'}
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={16} />
                <span>Create New Job</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Start Date</th>
                      <th className="py-3.5 px-4">Job & Client Details</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Quotation</th>
                      <th className="py-3.5 px-4 text-right">Costs Incurred</th>
                      <th className="py-3.5 px-4 text-right">Amount Given</th>
                      <th className="py-3.5 px-4 text-right">Balance Due</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {jobs.map((job) => {
                      const fin = job.financials || {};
                      return (
                        <tr
                          key={job._id}
                          onClick={() => navigate(`/fabrication/${job._id}`)}
                          className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                        >
                          {/* Start Date */}
                          <td className="py-4 px-4 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
                            {formatDate(job.startDate || job.createdAt)}
                          </td>

                          {/* Job & Client */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold border border-slate-200 dark:border-slate-700">
                                  {job.jobId}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                  {job.clientName}
                                </span>
                              </div>
                              {job.clientPhone && (
                                <div className="text-xs text-slate-500 font-medium mt-0.5">
                                  📞 {job.clientPhone}
                                </div>
                              )}
                              {job.siteAddress && (
                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-xs">
                                  <MapPin size={12} className="shrink-0" />
                                  <span className="truncate">{job.siteAddress}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              statusColors[job.status] || 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {job.status}
                            </span>
                          </td>

                          {/* Quoted Total */}
                          <td className="py-4 px-4 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap font-mono">
                            {formatCurrency(fin.totalQuotation)}
                          </td>

                          {/* Costs Incurred */}
                          <td className="py-4 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap font-mono">
                            {formatCurrency(fin.totalDirectCost)}
                          </td>

                          {/* Amount Given */}
                          <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap font-mono">
                            {formatCurrency(fin.totalAmountReceived)}
                          </td>

                          {/* Balance Due */}
                          <td className="py-4 px-4 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap font-mono">
                            {formatCurrency(fin.balanceDue)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => navigate(`/fabrication/${job._id}`)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Open Job Ledger"
                              >
                                <ArrowRight size={18} />
                              </button>
                              <button
                                onClick={(e) => promptDeleteJob(job, e)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Delete Job"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Workspace Jobs Pagination */}
          {!loading && totalJobs > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, totalJobs)}</span> of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{totalJobs}</span> jobs
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>

                <Pagination
                  currentPage={currentPage}
                  totalItems={totalJobs}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 2: MATERIAL PURCHASES (SEPARATELY)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'purchases' && (
        <div className="space-y-4">
          {/* Purchases Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
              <div className="relative flex-1 md:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vendor, item, bill #, job..."
                  value={purchasesSearch}
                  onChange={(e) => setPurchasesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Vendor Filter */}
              <select
                value={purchasesVendorFilter}
                onChange={(e) => setPurchasesVendorFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Vendors ({uniqueVendors.length})</option>
                {uniqueVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              {/* Job Filter */}
              <select
                value={purchasesJobFilter}
                onChange={(e) => setPurchasesJobFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Jobs ({uniqueJobs.length})</option>
                {uniqueJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.id} - {j.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Purchases</span>
                <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">
                  ₹{filteredPurchases.reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>

              <ExcelExportButton
                data={filteredPurchases.map(p => ({
                  'Date': formatDate(p.date),
                  'Job ID': p.jobId,
                  'Client': p.clientName,
                  'Vendor': p.vendorName || '-',
                  'Category': p.category || '-',
                  'Item Description': p.itemDescription || '-',
                  'Bill No': p.billNumber || '-',
                  'Qty': p.quantity || 1,
                  'Unit': p.unit || 'Nos',
                  'Rate (₹)': p.rate || 0,
                  'Amount (₹)': p.amount || 0,
                  'Payment Mode': p.paymentMode || 'Cash'
                }))}
                fileName="Workspace_Purchases_Ledger"
                sheetName="Purchases"
                title="Export Excel"
              />
            </div>
          </div>

          {/* Purchases Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Job & Client</th>
                    <th className="py-3 px-4">Vendor / Supplier</th>
                    <th className="py-3 px-4">Item Description</th>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4 text-center">Qty & Unit</th>
                    <th className="py-3 px-4 text-right">Rate (₹)</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Payment Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No purchase records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p, idx) => (
                      <tr key={p._id || idx} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(p.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/fabrication/${p.jobMongoId}`)}
                            className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <span className="font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px]">
                              {p.jobId}
                            </span>
                            <span>{p.clientName}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {p.vendorName || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {p.itemDescription || p.category || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {p.billNumber || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                          {p.quantity ? `${p.quantity} ${p.unit || 'Nos'}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {p.rate ? `₹${Number(p.rate).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap">
                          ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {p.paymentMode || 'Cash'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 3: DAILY WAGES (SEPARATELY)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'wages' && (
        <div className="space-y-4">
          {/* Wages Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
              <div className="relative flex-1 md:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee, work description, job..."
                  value={wagesSearch}
                  onChange={(e) => setWagesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Employee Filter */}
              <select
                value={wagesEmployeeFilter}
                onChange={(e) => setWagesEmployeeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Staff ({uniqueEmployees.length})</option>
                {uniqueEmployees.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>

              {/* Job Filter */}
              <select
                value={wagesJobFilter}
                onChange={(e) => setWagesJobFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Jobs ({uniqueJobs.length})</option>
                {uniqueJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.id} - {j.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Disbursed Wages</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                  ₹{filteredDailyWages.reduce((s, w) => s + (Number(w.totalWage) || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>

              <ExcelExportButton
                data={filteredDailyWages.map(w => ({
                  'Date': formatDate(w.date),
                  'Job ID': w.jobId,
                  'Client': w.clientName,
                  'Employee': w.employeeName || '-',
                  'Shift Type': w.shiftType || 'Full Day',
                  'Daily Rate (₹)': w.dailyRate || 0,
                  'Overtime Hours': w.overtimeHours || 0,
                  'Total Wage (₹)': w.totalWage || 0,
                  'Work Description': w.workDescription || '-'
                }))}
                fileName="Workspace_Daily_Wages_Ledger"
                sheetName="DailyWages"
                title="Export Excel"
              />
            </div>
          </div>

          {/* Wages Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Job & Client</th>
                    <th className="py-3 px-4">Employee Name</th>
                    <th className="py-3 px-4">Shift Type</th>
                    <th className="py-3 px-4 text-right">Daily Rate (₹)</th>
                    <th className="py-3 px-4 text-center">Overtime</th>
                    <th className="py-3 px-4 text-right">Total Wage (₹)</th>
                    <th className="py-3 px-4">Work Scope / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDailyWages.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No wage records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyWages.map((w, idx) => (
                      <tr key={w._id || idx} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(w.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/fabrication/${w.jobMongoId}`)}
                            className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <span className="font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px]">
                              {w.jobId}
                            </span>
                            <span>{w.clientName}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {w.employeeName || '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            {w.shiftType || 'Full Day'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          ₹{Number(w.dailyRate || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                          {w.overtimeHours ? `${w.overtimeHours} hrs` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          ₹{Number(w.totalWage || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {w.workDescription || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 4: SITE EXPENSES (SEPARATELY)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'site-expenses' && (
        <div className="space-y-4">
          {/* Site Expenses Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
              <div className="relative flex-1 md:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search category, site details, job..."
                  value={siteExpSearch}
                  onChange={(e) => setSiteExpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Category Filter */}
              <select
                value={siteExpCategoryFilter}
                onChange={(e) => setSiteExpCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Categories ({uniqueExpenseCategories.length})</option>
                {uniqueExpenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Job Filter */}
              <select
                value={siteExpJobFilter}
                onChange={(e) => setSiteExpJobFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Jobs ({uniqueJobs.length})</option>
                {uniqueJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.id} - {j.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Site Expenses</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                  ₹{filteredSiteExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>

              <ExcelExportButton
                data={filteredSiteExpenses.map(e => ({
                  'Date': formatDate(e.date),
                  'Job ID': e.jobId,
                  'Client': e.clientName,
                  'Category': e.category || '-',
                  'Description': e.itemDescription || e.notes || '-',
                  'Amount (₹)': e.amount || 0,
                  'Payment Mode': e.paymentMode || 'Cash'
                }))}
                fileName="Workspace_Site_Expenses_Ledger"
                sheetName="SiteExpenses"
                title="Export Excel"
              />
            </div>
          </div>

          {/* Site Expenses Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Job & Client</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Expense Details / Particulars</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Payment Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSiteExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No site expenses found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSiteExpenses.map((e, idx) => (
                      <tr key={e._id || idx} className="hover:bg-rose-50/30 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(e.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/fabrication/${e.jobMongoId}`)}
                            className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <span className="font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px]">
                              {e.jobId}
                            </span>
                            <span>{e.clientName}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                            {e.category || 'Site Expense'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-sm">
                          {e.itemDescription || e.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          ₹{Number(e.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {e.paymentMode || 'Cash'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 5: CLIENT PAYMENTS / AMOUNT GIVEN (SEPARATELY)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeMainTab === 'payments' && (
        <div className="space-y-4">
          {/* Client Payments Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
              <div className="relative flex-1 md:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search receipt ref, received by, job..."
                  value={paymentsSearch}
                  onChange={(e) => setPaymentsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Job Filter */}
              <select
                value={paymentsJobFilter}
                onChange={(e) => setPaymentsJobFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Jobs ({uniqueJobs.length})</option>
                {uniqueJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.id} - {j.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Client Inflows</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{filteredClientPayments.reduce((s, cp) => s + (Number(cp.amount) || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>

              <ExcelExportButton
                data={filteredClientPayments.map(cp => ({
                  'Date': formatDate(cp.date),
                  'Job ID': cp.jobId,
                  'Client': cp.clientName,
                  'Amount (₹)': cp.amount || 0,
                  'Payment Mode': cp.paymentMode || 'Cash',
                  'Reference': cp.transactionReference || '-',
                  'Received By': cp.receivedBy || '-',
                  'Notes': cp.notes || '-'
                }))}
                fileName="Workspace_Client_Receipts_Ledger"
                sheetName="ClientReceipts"
                title="Export Excel"
              />
            </div>
          </div>

          {/* Client Payments Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Job & Client</th>
                    <th className="py-3 px-4">Transaction / Receipt Ref</th>
                    <th className="py-3 px-4">Received By</th>
                    <th className="py-3 px-4 text-right">Amount Paid (₹)</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClientPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No client payment receipts found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredClientPayments.map((cp, idx) => (
                      <tr key={cp._id || idx} className="hover:bg-emerald-50/30 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(cp.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/fabrication/${cp.jobMongoId}`)}
                            className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <span className="font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px]">
                              {cp.jobId}
                            </span>
                            <span>{cp.clientName}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {cp.transactionReference || 'Direct Payment'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {cp.receivedBy || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ₹{Number(cp.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {cp.paymentMode || 'Cash'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {cp.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Job Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Hammer size={20} className="text-indigo-600" />
                <span>Create New Workspace Job</span>
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              {/* Select Existing Client or New */}
              {clientsList.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select From Existing Client Directory (Optional)
                  </label>
                  <select
                    value={newJobForm.selectedClientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">-- Or enter new client below --</option>
                    {clientsList.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.clientName || c.companyName} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Client Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Fabrication & Infra"
                  value={newJobForm.clientName}
                  onChange={(e) => setNewJobForm({ ...newJobForm, clientName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newJobForm.clientPhone}
                    onChange={(e) => setNewJobForm({ ...newJobForm, clientPhone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={newJobForm.clientEmail}
                    onChange={(e) => setNewJobForm({ ...newJobForm, clientEmail: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Site Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Site / Work Location Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Industrial Area Phase II"
                  value={newJobForm.siteAddress}
                  onChange={(e) => setNewJobForm({ ...newJobForm, siteAddress: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Status & Start Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newJobForm.status}
                    onChange={(e) => setNewJobForm({ ...newJobForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Confirmed / In Progress">Confirmed / In Progress</option>
                    <option value="Quotation Stage">Quotation Stage</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newJobForm.startDate}
                    onChange={(e) => setNewJobForm({ ...newJobForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Delivery Date (Optional)
                </label>
                <input
                  type="date"
                  value={newJobForm.deliveryDate}
                  onChange={(e) => setNewJobForm({ ...newJobForm, deliveryDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white cursor-pointer"
                />
              </div>

              {/* Scope & Project Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scope & Project Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Key fabrication dimensions, metal specifications, coating notes..."
                  value={newJobForm.notes}
                  onChange={(e) => setNewJobForm({ ...newJobForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  <span>Create & Open Job</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setJobToDelete(null);
        }}
        onConfirm={confirmDeleteJob}
        title="Delete Fabrication Job"
        message={`Are you sure you want to permanently delete workspace job for "${jobToDelete?.clientName}" (${jobToDelete?.jobId})? All associated quotations, wage logs, material expenses, and payment records will be permanently removed.`}
        confirmText={deleting ? "Deleting..." : "Delete Job"}
        isDestructive={true}
      />
    </div>
  );
};

export default FabricationPage;
