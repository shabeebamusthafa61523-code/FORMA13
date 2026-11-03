import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ReceiptText, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  RefreshCw, 
  Loader2, 
  Tag, 
  FolderPlus,
  CheckCircle2,
  ChevronUp,
  Sparkles,
  DollarSign,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  getExpenseCategories, 
  createExpenseCategory 
} from '../services/accountsService';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import ExcelExportButton from '../components/ExcelExportButton';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit/Pay Later'];

const GeneralExpensePage = () => {
  const { showToast } = useToast();
  const formRef = useRef(null);

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('ALL');
  const [dateRange, setDateRange] = useState('this-month'); // 'today', 'this-week', 'this-month', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // ── Inline Expandable Card State ──
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    amount: '',
    paidTo: '',
    paymentMode: 'Cash',
    description: ''
  });

  // Quick Category Add inside Form
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [savingNewCat, setSavingNewCat] = useState(false);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Fetch Categories dynamically from Expense Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await getExpenseCategories();
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        setCategories(list);
        return list;
      }
    } catch (err) {
      console.error('Failed to fetch expense categories:', err);
    }
    return [];
  }, []);

  // 2. Fetch General Expenses
  const fetchExpensesList = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await getExpenses({ generalOnly: 'true' });
      const rawData = res?.data || res || [];
      if (Array.isArray(rawData)) {
        const generalList = rawData.filter(exp => {
          const syncMod = exp?.syncSource?.module;
          const jobId = exp?.syncSource?.fabricationJobId;
          if (syncMod === 'Fabrication' && jobId) return false;
          return true;
        });
        setExpenses(generalList);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('Failed to fetch general expenses:', err);
      showToast('Error loading general expenses.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCategories();
    fetchExpensesList();
  }, [fetchCategories, fetchExpensesList]);

  // Handle Quick Add Category Inline
  const handleCreateCategoryInline = async (e) => {
    e.preventDefault();
    if (!newCatName || !newCatName.trim()) {
      showToast('Please enter category name.', 'warning');
      return;
    }
    setSavingNewCat(true);
    try {
      const res = await createExpenseCategory({
        name: newCatName.trim(),
        description: `General category for ${newCatName.trim()}`
      });
      if (res?.success || res?.data) {
        showToast('Category created!', 'success');
        const updatedCats = await fetchCategories();
        const createdCat = updatedCats.find(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());
        if (createdCat) {
          setFormData(prev => ({ ...prev, categoryId: createdCat._id }));
        }
        setNewCatName('');
        setIsAddingNewCat(false);
      } else {
        showToast(res?.message || 'Failed to create category.', 'warning');
      }
    } catch (err) {
      console.error('Error adding category:', err);
      showToast('Error creating category.', 'error');
    } finally {
      setSavingNewCat(false);
    }
  };

  // Toggle or Open Form for Adding
  const handleToggleForm = () => {
    if (isFormOpen && !editingExpenseId) {
      setIsFormOpen(false);
      return;
    }
    setEditingExpenseId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      categoryId: categories.length > 0 ? categories[0]._id : '',
      amount: '',
      paidTo: '',
      paymentMode: 'Cash',
      description: ''
    });
    setIsAddingNewCat(false);
    setNewCatName('');
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (exp) => {
    setEditingExpenseId(exp._id);
    let dateStr = new Date().toISOString().split('T')[0];
    if (exp.date) {
      try {
        dateStr = new Date(exp.date).toISOString().split('T')[0];
      } catch (e) {}
    }

    const catId = exp.category?._id || exp.category || '';
    setFormData({
      date: dateStr,
      categoryId: catId || (categories.length > 0 ? categories[0]._id : ''),
      amount: exp.amount !== undefined ? String(exp.amount) : '',
      paidTo: exp.paidTo || '',
      paymentMode: exp.paymentMode || 'Cash',
      description: exp.description || ''
    });
    setIsAddingNewCat(false);
    setIsFormOpen(true);

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Cancel Form
  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingExpenseId(null);
  };

  // Submit Form (Handles both Add & Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Please enter a valid expense amount.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const matchedCat = categories.find(c => String(c._id) === String(formData.categoryId));
      const categoryName = matchedCat ? matchedCat.name : 'General';

      const payload = {
        date: formData.date,
        category: formData.categoryId || undefined,
        categoryName,
        amount: parseFloat(formData.amount),
        totalAmount: parseFloat(formData.amount),
        paymentMode: formData.paymentMode,
        paidTo: formData.paidTo ? formData.paidTo.trim() : '',
        description: formData.description ? formData.description.trim() : '',
        module: 'General',
        syncSource: { module: 'General', fabricationJobId: null, isAutoSynced: false }
      };

      if (editingExpenseId) {
        const res = await updateExpense(editingExpenseId, payload);
        if (res?.success || res?.data) {
          showToast('Expense updated!', 'success');
          setIsFormOpen(false);
          setEditingExpenseId(null);
          fetchExpensesList(true);
        } else {
          showToast(res?.message || 'Failed to update.', 'warning');
        }
      } else {
        const res = await createExpense(payload);
        if (res?.success || res?.data) {
          showToast('Expense recorded!', 'success');
          setFormData(prev => ({
            ...prev,
            amount: '',
            paidTo: '',
            description: ''
          }));
          fetchExpensesList(true);
        } else {
          showToast(res?.message || 'Failed to record expense.', 'error');
        }
      }
    } catch (err) {
      console.error('Error submitting general expense:', err);
      showToast('Failed to save expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action
  const handleOpenDelete = (exp) => {
    setExpenseToDelete(exp);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteExpense(expenseToDelete._id);
      if (res?.success) {
        showToast('Expense deleted.', 'success');
        setIsDeleteModalOpen(false);
        setExpenseToDelete(null);
        fetchExpensesList(true);
      } else {
        showToast(res?.message || 'Failed to delete expense.', 'error');
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      showToast('Error deleting expense.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const dayOfWeek = today.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return expenses.filter(exp => {
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const pTo = (exp.paidTo || '').toLowerCase();
        const desc = (exp.description || '').toLowerCase();
        const cat = (exp.categoryName || exp.category?.name || '').toLowerCase();
        if (!pTo.includes(q) && !desc.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      if (selectedCategory !== 'ALL') {
        const expCatId = String(exp.category?._id || exp.category || '');
        const expCatName = (exp.categoryName || exp.category?.name || '').toLowerCase();
        const targetCat = categories.find(c => String(c._id) === selectedCategory);
        if (targetCat) {
          if (expCatId !== selectedCategory && expCatName !== targetCat.name.toLowerCase()) {
            return false;
          }
        }
      }

      if (selectedPaymentMode !== 'ALL') {
        if ((exp.paymentMode || '').toLowerCase() !== selectedPaymentMode.toLowerCase()) {
          return false;
        }
      }

      if (exp.date) {
        const expDate = new Date(exp.date);
        const expDateStr = expDate.toISOString().split('T')[0];

        if (dateRange === 'today') {
          if (expDateStr !== todayStr) return false;
        } else if (dateRange === 'this-week') {
          if (expDate < startOfWeek) return false;
        } else if (dateRange === 'this-month') {
          if (expDate < startOfMonth) return false;
        } else if (dateRange === 'custom') {
          if (customStartDate && expDateStr < customStartDate) return false;
          if (customEndDate && expDateStr > customEndDate) return false;
        }
      }

      return true;
    });
  }, [expenses, searchTerm, selectedCategory, selectedPaymentMode, dateRange, customStartDate, customEndDate, categories]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    let todayTotal = 0;
    let thisMonthTotal = 0;
    let overallTotal = 0;
    const catMap = {};

    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount || exp.totalAmount || 0);
      overallTotal += amt;

      const catName = exp.categoryName || exp.category?.name || 'General';
      catMap[catName] = (catMap[catName] || 0) + amt;

      if (exp.date) {
        const d = new Date(exp.date);
        const dStr = d.toISOString().split('T')[0];
        if (dStr === todayStr) {
          todayTotal += amt;
        }
        if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
          thisMonthTotal += amt;
        }
      }
    });

    let topCategory = 'None';
    let topCategoryAmt = 0;
    Object.entries(catMap).forEach(([cName, cAmt]) => {
      if (cAmt > topCategoryAmt) {
        topCategory = cName;
        topCategoryAmt = cAmt;
      }
    });

    return {
      todayTotal,
      thisMonthTotal,
      overallTotal,
      topCategory,
      topCategoryAmt,
      totalCount: expenses.length
    };
  }, [expenses]);

  // Prepare Excel Data
  const exportData = useMemo(() => {
    return filteredExpenses.map((exp, index) => ({
      'Sl No': index + 1,
      'Date': exp.date ? new Date(exp.date).toLocaleDateString('en-GB') : '',
      'Category': exp.categoryName || exp.category?.name || 'General',
      'Paid To': exp.paidTo || '',
      'Amount (₹)': parseFloat(exp.amount || 0).toFixed(2),
      'Payment Mode': exp.paymentMode || 'Cash',
      'Description / Purpose': exp.description || '',
      'Recorded By': exp.addedByName || 'Admin'
    }));
  }, [filteredExpenses]);

  return (
    <div className="space-y-3 pb-6">
      {/* ── 1. Minimal Header Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ReceiptText size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            General Expense
          </h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {stats.totalCount} records
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              fetchCategories();
              fetchExpensesList(true);
            }}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <ExcelExportButton
            data={exportData}
            fileName={`General_Expenses_${new Date().toISOString().split('T')[0]}`}
            title="Excel"
            size="sm"
          />

          <button
            onClick={handleToggleForm}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer ${
              isFormOpen && !editingExpenseId
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isFormOpen && !editingExpenseId ? (
              <>
                <ChevronUp size={14} />
                <span>Close Form</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>+ Add Expense</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. Overview Metrics: 4 Small Compact Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Today's Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
              Today's Total
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              ₹{stats.todayTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={14} />
          </div>
        </div>

        {/* This Month's Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
              This Month
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              ₹{stats.thisMonthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar size={14} />
          </div>
        </div>

        {/* All-Time Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
              All-Time Total
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              ₹{stats.overallTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <TrendingUp size={14} />
          </div>
        </div>

        {/* Top Category Spent */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
              Top Category
            </span>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate" title={stats.topCategory}>
              {stats.topCategory}
            </div>
            {stats.topCategoryAmt > 0 && (
              <span className="text-[10px] text-slate-400 font-medium">
                ₹{stats.topCategoryAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Tag size={14} />
          </div>
        </div>
      </div>

      {/* ── 3. Compact Inline Expandable Card (No Receipt Upload) ── */}
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
                editingExpenseId
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-850 border-indigo-200 dark:border-indigo-900/50'
              }`}>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className={editingExpenseId ? "text-amber-600" : "text-indigo-600"} />
                    <span>{editingExpenseId ? 'Edit General Expense' : 'Quick Add Non-Client Expense'}</span>
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
                  {/* Grid 1: Category, Amount, Date, Paid To */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Category *</label>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                          className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <FolderPlus size={10} />
                          <span>{isAddingNewCat ? 'Cancel' : '+ New'}</span>
                        </button>
                      </div>

                      {isAddingNewCat ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Category name..."
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg text-slate-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleCreateCategoryInline}
                            disabled={savingNewCat}
                            className="px-2 py-1 bg-indigo-600 text-white font-semibold text-[11px] rounded-lg cursor-pointer"
                          >
                            {savingNewCat ? '...' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <select
                          value={formData.categoryId}
                          onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer font-medium"
                          required
                        >
                          <option value="" disabled>Select category...</option>
                          {categories.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Amount (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full pl-6 pr-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Date *</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    {/* Paid To */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Paid To (Payee)</label>
                      <input
                        type="text"
                        placeholder="e.g. Tea Stall, Cleaner (optional)"
                        value={formData.paidTo}
                        onChange={(e) => setFormData(prev => ({ ...prev, paidTo: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Grid 2: Payment Mode, Notes, and Submit */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
                    {/* Payment Mode */}
                    <div className="lg:col-span-5 flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Mode:</span>
                      <div className="flex flex-wrap gap-1">
                        {PAYMENT_MODES.slice(0, 4).map((mode) => (
                          <button
                            type="button"
                            key={mode}
                            onClick={() => setFormData(prev => ({ ...prev, paymentMode: mode }))}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                              formData.paymentMode === mode
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="lg:col-span-4">
                      <input
                        type="text"
                        placeholder="Purpose / notes (optional)..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Form Action Buttons */}
                    <div className="lg:col-span-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelForm}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        <span>{submitting ? 'Saving' : editingExpenseId ? 'Save' : 'Record'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 4. Compact 1-Line Filter Strip (Right Above Table) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {/* Quick Search */}
          <div className="relative w-44 sm:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search payee, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          {/* Payment Mode */}
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Modes</option>
            {PAYMENT_MODES.map((pm) => (
              <option key={pm} value={pm}>{pm}</option>
            ))}
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Date</option>
          </select>
        </div>

        {/* Total Summary */}
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 shrink-0">
          <span>{filteredExpenses.length} items</span>
          <span className="font-bold text-slate-900 dark:text-white">
            ₹{filteredExpenses.reduce((s, e) => s + (parseFloat(e.amount || 0)), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Custom Date inputs if selected */}
      {dateRange === 'custom' && (
        <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-slate-500">From:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
          />
          <span className="font-semibold text-slate-500">To:</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
          />
          <button
            onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
            className="text-rose-600 hover:underline font-semibold ml-2 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── 5. High-Density, Prominently Visible Data Table ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-slate-500">Loading General Expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 text-center">
            <ReceiptText size={22} className="mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No General Expenses Found
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">
              {searchTerm || selectedCategory !== 'ALL' || selectedPaymentMode !== 'ALL'
                ? 'Try adjusting your filters.'
                : 'Click "+ Add Expense" above to log your first overhead.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Paid To</th>
                  <th className="py-2.5 px-3">Description / Purpose</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredExpenses.map((exp) => {
                  const catName = exp.categoryName || exp.category?.name || 'General';
                  const dateStr = exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                  const payMode = exp.paymentMode || 'Cash';
                  const isRowBeingEdited = editingExpenseId === exp._id;

                  return (
                    <tr 
                      key={exp._id} 
                      className={`transition-colors ${
                        isRowBeingEdited 
                          ? 'bg-amber-50/80 dark:bg-amber-950/40' 
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-medium">
                        {dateStr}
                      </td>

                      {/* Category */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                          <Tag size={10} />
                          {catName}
                        </span>
                      </td>

                      {/* Paid To */}
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                        {exp.paidTo || '-'}
                      </td>

                      {/* Description */}
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={exp.description}>
                        {exp.description || <span className="text-slate-300 dark:text-slate-600 italic">No notes</span>}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          payMode.toLowerCase() === 'cash' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : payMode.toLowerCase().includes('upi')
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                            : payMode.toLowerCase().includes('bank')
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {payMode}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className={`p-1 rounded transition cursor-pointer ${
                              isRowBeingEdited
                                ? 'text-amber-700 bg-amber-100 font-bold'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(exp)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Delete"
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

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete General Expense"
        message={`Are you sure you want to delete this expense of ₹${parseFloat(expenseToDelete?.amount || 0).toLocaleString('en-IN')} paid to "${expenseToDelete?.paidTo || 'Payee'}"?`}
        confirmText={deleting ? "Deleting..." : "Delete"}
      />
    </div>
  );
};

export default GeneralExpensePage;
