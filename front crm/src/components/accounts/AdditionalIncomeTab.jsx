import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  PlusCircle, 
  Search, 
  Trash2, 
  Pencil, 
  X, 
  RefreshCw, 
  Wallet, 
  Calendar, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  ArrowUpDown, 
  Filter,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import ExcelExportButton from '../ExcelExportButton';
import { 
  getAdditionalIncomes, 
  createAdditionalIncome, 
  updateAdditionalIncome, 
  deleteAdditionalIncome 
} from '../../services/accountsService';

const PAYMENT_MODES = [
  'Bank Transfer',
  'UPI',
  'Cash',
  'Cheque',
  'Bank',
  'Other'
];

const AdditionalIncomeTab = () => {
  const toastContext = useToast();
  const notify = useCallback((msg, type = 'info') => {
    if (toastContext?.showToast) {
      toastContext.showToast(msg, type);
    } else {
      console.log(`[${type}] ${msg}`);
    }
  }, [toastContext]);

  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date-desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    source: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    notes: ''
  });

  // Fetch Incomes
  const fetchIncomes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdditionalIncomes();
      if (res && res.success) {
        setIncomes(res.data || []);
      } else {
        setIncomes([]);
      }
    } catch (err) {
      console.error('Failed to load additional incomes:', err);
      notify('Failed to load additional income records', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  // Handle Form Open (New)
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      source: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'Bank Transfer',
      referenceNo: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Handle Form Open (Edit)
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      source: item.source || '',
      amount: item.amount !== undefined ? String(item.amount) : '',
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMode: item.paymentMode || 'Bank Transfer',
      referenceNo: item.referenceNo || '',
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  // Handle Form Submit (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.source.trim()) {
      notify('Please enter income source name', 'error');
      return;
    }
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      notify('Please enter a valid positive amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        source: formData.source.trim(),
        amount: parsedAmount,
        date: formData.date ? new Date(formData.date) : new Date(),
        paymentMode: formData.paymentMode,
        referenceNo: formData.referenceNo.trim(),
        notes: formData.notes.trim()
      };

      if (editingItem) {
        await updateAdditionalIncome(editingItem._id, payload);
        notify('Additional income record updated successfully', 'success');
      } else {
        await createAdditionalIncome(payload);
        notify('Additional income recorded successfully & added to Profit & Loss', 'success');
      }

      setIsModalOpen(false);
      setEditingItem(null);
      await fetchIncomes();
    } catch (err) {
      console.error('Error saving additional income:', err);
      notify(err.response?.data?.message || 'Failed to save additional income', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    try {
      await deleteAdditionalIncome(id);
      notify('Additional income record removed', 'success');
      setDeleteConfirmId(null);
      await fetchIncomes();
    } catch (err) {
      console.error('Error deleting income:', err);
      notify(err.response?.data?.message || 'Failed to delete record', 'error');
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalAmount = incomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const count = incomes.length;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const thisMonthAmount = incomes.filter(item => {
      if (!item.date) return false;
      const d = new Date(item.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const bankAmount = incomes.filter(item => 
      ['Bank Transfer', 'UPI', 'Cheque', 'Bank'].includes(item.paymentMode)
    ).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const cashAmount = incomes.filter(item => 
      item.paymentMode === 'Cash'
    ).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      totalAmount,
      count,
      thisMonthAmount,
      bankAmount,
      cashAmount,
      avgInflow: count > 0 ? totalAmount / count : 0
    };
  }, [incomes]);

  // Filtering & Sorting
  const filteredIncomes = useMemo(() => {
    let list = [...incomes];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(item => 
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.referenceNo && item.referenceNo.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.createdByName && item.createdByName.toLowerCase().includes(q)) ||
        (item.paymentMode && item.paymentMode.toLowerCase().includes(q))
      );
    }

    // Payment Mode filter
    if (paymentModeFilter !== 'ALL') {
      if (paymentModeFilter === 'CASH') {
        list = list.filter(item => (item.paymentMode || '').toLowerCase() === 'cash');
      } else if (paymentModeFilter === 'BANK_UPI') {
        list = list.filter(item => ['bank transfer', 'upi', 'bank', 'cheque'].includes((item.paymentMode || '').toLowerCase()));
      } else {
        list = list.filter(item => (item.paymentMode || '').toLowerCase() === paymentModeFilter.toLowerCase());
      }
    }

    // Sort
    list.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
      const amtA = Number(a.amount) || 0;
      const amtB = Number(b.amount) || 0;

      if (sortBy === 'date-desc') return dateB - dateA;
      if (sortBy === 'date-asc') return dateA - dateB;
      if (sortBy === 'amount-desc') return amtB - amtA;
      if (sortBy === 'amount-asc') return amtA - amtB;
      return 0;
    });

    return list;
  }, [incomes, searchTerm, paymentModeFilter, sortBy]);

  // Excel Export Data Preparation
  const excelData = useMemo(() => {
    return filteredIncomes.map((item, idx) => ({
      'S.No': idx + 1,
      'Date': item.date ? new Date(item.date).toLocaleDateString('en-IN') : '',
      'Income Source': item.source || '',
      'Amount (₹)': Number(item.amount) || 0,
      'Payment Mode': item.paymentMode || 'Bank Transfer',
      'Reference / Txn No': item.referenceNo || '',
      'Purpose / Notes': item.notes || '',
      'Recorded By': item.createdByName || 'Accountant'
    }));
  }, [filteredIncomes]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Additional Income
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Record scrap sales, commissions, interest, rental, and other secondary revenue. Amounts automatically sync to Profit &amp; Loss, Day Book, and Partner Share.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExcelExportButton
            data={excelData}
            filename={`Additional_Income_${new Date().toISOString().split('T')[0]}`}
            sheetName="Additional Income"
            buttonText="Export Excel"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
          />

          <button
            onClick={fetchIncomes}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Record Income</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Additional Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Additional Inflow</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Wallet size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            ₹{stats.totalAmount.toLocaleString('en-IN')}
          </h4>
          <p className="text-[10px] text-slate-400 mt-1">
            Added to Business P&amp;L Net Profit
          </p>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">This Month</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Calendar size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
            ₹{stats.thisMonthAmount.toLocaleString('en-IN')}
          </h4>
          <p className="text-[10px] text-slate-400 mt-1">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Bank vs Cash Split */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bank &amp; UPI / Cash</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <CreditCard size={16} />
            </div>
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mt-2 font-mono">
            Bank: ₹{stats.bankAmount.toLocaleString('en-IN')}
          </h4>
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
            Cash: ₹{stats.cashAmount.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Total Records */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Records</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <FileText size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2 font-mono">
            {stats.count}
          </h4>
          <p className="text-[10px] text-slate-400 mt-1">
            Avg: ₹{Math.round(stats.avgInflow).toLocaleString('en-IN')} / entry
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by source (e.g. Scrap Sale), reference no, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Mode Filter & Sort */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">Mode:</span>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="ALL">All Modes</option>
              <option value="BANK_UPI">Bank &amp; UPI</option>
              <option value="CASH">Cash Only</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={13} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (High → Low)</option>
              <option value="amount-asc">Amount (Low → High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Income Records Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Recorded Additional Incomes ({filteredIncomes.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Income Source</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3">Payment Mode</th>
                <th className="py-2.5 px-3">Reference / Txn No</th>
                <th className="py-2.5 px-3">Notes / Purpose</th>
                <th className="py-2.5 px-3">Recorded By</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-slate-300" />
                    Loading additional income entries...
                  </td>
                </tr>
              ) : filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <AlertCircle size={28} className="mx-auto mb-2 text-slate-300" />
                    No additional income entries found. Click &quot;Record Income&quot; to add one.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="truncate max-w-[200px]" title={item.source}>{item.source}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      +₹{Number(item.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.paymentMode === 'Cash'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}>
                        {item.paymentMode || 'Bank Transfer'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {item.referenceNo || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-[220px] truncate" title={item.notes || ''}>
                      {item.notes || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {item.createdByName || 'Accountant'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Edit record"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item._id)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record / Edit Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {editingItem ? 'Edit Additional Income' : 'Record Additional Income'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Revenue recorded here will be automatically added to the Profit &amp; Loss statement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Income Source */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Income Source <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scrap Metal Sale, Machine Rental, Sublet, Service Charge"
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Amount and Date (Grid 2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date Received
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Mode and Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMode: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {PAYMENT_MODES.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reference / Txn / Cheque No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-98234, CHQ-1002"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenceNo: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Purpose / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Purpose / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details, buyer name, or additional remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>{editingItem ? 'Save Changes' : 'Record Income'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Delete Income Entry?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete this additional income entry? It will be removed from the Profit &amp; Loss calculations.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdditionalIncomeTab;
