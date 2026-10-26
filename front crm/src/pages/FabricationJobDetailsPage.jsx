import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Hammer, Plus, Trash2, Edit3, Calendar, Users, 
  ShoppingCart, DollarSign, CheckCircle2, AlertCircle, Clock, 
  MapPin, Phone, Mail, FileText, Printer, Loader2, Save, X,
  CreditCard, ChevronRight, Download, Percent, Receipt
} from 'lucide-react';
import { 
  getFabricationJobById,
  updateFabricationJob,
  addQuotationItem,
  updateQuotationItem,
  deleteQuotationItem,
  updateQuotationDiscount,
  addDailyWage,
  updateDailyWage,
  deleteDailyWage,
  addPurchaseExpense,
  updatePurchaseExpense,
  deletePurchaseExpense,
  addClientPayment,
  updateClientPayment,
  deleteClientPayment,
  getFabricationMaterials,
  getFabricationWorkScopes,
  getFabricationItemPresets,
  getFabricationVendors,
  getFabricationExpenseCategories
} from '../services/fabricationService';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import QuotationInvoiceModal from '../components/fabrication/QuotationInvoiceModal';
import PurchaseExpenseInvoiceModal from '../components/fabrication/PurchaseExpenseInvoiceModal';
import OverallFabricationLedgerModal from '../components/fabrication/OverallFabricationLedgerModal';
import ExpenseCategoryModal, { DEFAULT_FABRICATION_CATEGORIES } from '../components/fabrication/ExpenseCategoryModal';
import DescriptionVendorModal, { DEFAULT_DESCRIPTIONS, DEFAULT_VENDORS } from '../components/fabrication/DescriptionVendorModal';
import QuotationMaterialModal, { DEFAULT_FABRICATION_MATERIALS } from '../components/fabrication/QuotationMaterialModal';
import WorkScopeModal, { DEFAULT_WORK_SCOPE_DESCRIPTIONS } from '../components/fabrication/WorkScopeModal';
import PaymentReceiptModal from '../components/fabrication/PaymentReceiptModal';
import QuotationUnitModal, { DEFAULT_FABRICATION_UNITS } from '../components/fabrication/QuotationUnitModal';

const UNIT_OPTIONS = [
  'Sq.Ft',
  'Inches',
  'Feet',
  'Kg',
  'Nos',
  'Lengths',
  'Meters',
  'Tons',
  'Box',
  'Litres',
  'Lumpsum',
  'Hours',
  'Days'
];

const EXPENSE_CATEGORIES = [
  'Raw Material (MS/SS Steel)',
  'Pipes & Tubes',
  'Plates & Sheets',
  'Consumables (Welding Rods/Grinding)',
  'Industrial Gas (Oxygen/CO2/Argon)',
  'Hardware & Fasteners',
  'Primer & Painting',
  'Transport & Freight',
  'Crane / Scaffolding Hire',
  'Tools & Equipment Repair',
  'Site Refreshment / Food',
  'Miscellaneous'
];

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit/Pay Later'];
const SHIFT_TYPES = ['Full Day', 'Half Day', 'Overtime', 'Piece Rate'];

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
  } catch (e) {
    return dateStr;
  }
};

const groupWagesByDate = (dailyWages = []) => {
  if (!dailyWages || !dailyWages.length) return [];
  const sorted = [...dailyWages].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const groups = [];
  const map = new Map();

  for (const wage of sorted) {
    let key = 'undated';
    let displayDate = 'Undated';
    if (wage.date) {
      const d = new Date(wage.date);
      if (!isNaN(d.getTime())) {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        displayDate = formatDate(wage.date);
      }
    }

    if (!map.has(key)) {
      const newGroup = {
        key,
        displayDate,
        rawDate: wage.date,
        entries: [],
        totalWage: 0,
      };
      map.set(key, newGroup);
      groups.push(newGroup);
    }

    const grp = map.get(key);
    grp.entries.push(wage);
    grp.totalWage += Number(wage.totalWage || 0);
  }

  return groups;
};

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const FabricationJobDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  // Staff members for employee selection dropdown
  const [employees, setEmployees] = useState([]);

  // Purchases filter pill: 'All' | 'Purchase' | 'Expense'
  const [expenseFilter, setExpenseFilter] = useState('All');

  // Modals state for EDIT operations
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [editingQuotationItem, setEditingQuotationItem] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPurchaseInvoiceOpen, setIsPurchaseInvoiceOpen] = useState(false);
  const [isOverallLedgerOpen, setIsOverallLedgerOpen] = useState(false);

  // Overall Quotation Discount state
  const [overallDiscount, setOverallDiscount] = useState({ type: 'fixed', value: '' });
  const [savingDiscount, setSavingDiscount] = useState(false);

  const [isWageModalOpen, setIsWageModalOpen] = useState(false);
  const [editingWage, setEditingWage] = useState(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Modals for Category & Description/Vendor management
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDescVendorModalOpen, setIsDescVendorModalOpen] = useState(false);
  const [descVendorModalTab, setDescVendorModalTab] = useState('descriptions'); // 'descriptions' | 'vendors'
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  // Payment Receipt Modal State
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);
  const [selectedReceiptIndex, setSelectedReceiptIndex] = useState(0);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const handleOpenReceipt = (pay, idx) => {
    setSelectedReceiptPayment(pay);
    setSelectedReceiptIndex(idx);
    setIsReceiptModalOpen(true);
  };

  const [materialsList, setMaterialsList] = useState(() => {
    try {
      const cached = localStorage.getItem('crm_fab_quotation_materials');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_FABRICATION_MATERIALS;
  });

  const handleSelectMaterial = (mat) => {
    setQuoteForm(prev => ({ ...prev, material: mat }));
  };

  const handleMaterialsChanged = (newList) => {
    setMaterialsList(newList);
  };

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitsList, setUnitsList] = useState(() => {
    try {
      const cached = localStorage.getItem('crm_fab_quotation_units');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_FABRICATION_UNITS;
  });

  const handleSelectUnit = (unit) => {
    setQuoteForm(prev => ({ ...prev, unit }));
  };

  const handleUnitsChanged = (newList) => {
    setUnitsList(newList);
  };

  const [isWorkScopeModalOpen, setIsWorkScopeModalOpen] = useState(false);
  const [workScopeDescriptions, setWorkScopeDescriptions] = useState(() => {
    try {
      const cached = localStorage.getItem('crm_fab_work_scope_descriptions');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_WORK_SCOPE_DESCRIPTIONS;
  });

  const handleSelectWorkScope = (desc) => {
    setQuoteForm(prev => ({ ...prev, description: desc }));
  };

  const handleWorkScopesChanged = (newList) => {
    setWorkScopeDescriptions(newList);
  };

  const [categoriesList, setCategoriesList] = useState(() => {
    try {
      const cached = localStorage.getItem('crm_fab_expense_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(c => typeof c === 'string' ? c : c.name);
        }
      }
    } catch (e) {}
    return DEFAULT_FABRICATION_CATEGORIES;
  });

  const [savedDescriptions, setSavedDescriptions] = useState(() => {
    try {
      const cached = localStorage.getItem('crm_fab_item_descriptions');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_DESCRIPTIONS;
  });

  const [savedVendors, setSavedVendors] = useState(() => {
    try {
      const cached = localStorage.getItem('crm_fab_vendors_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_VENDORS;
  });

  // Live sync configuration lists from MongoDB on mount
  useEffect(() => {
    let isMounted = true;
    const fetchLiveConfig = async () => {
      try {
        const [matRes, scopeRes, descRes, venRes, catRes] = await Promise.allSettled([
          getFabricationMaterials(),
          getFabricationWorkScopes(),
          getFabricationItemPresets(),
          getFabricationVendors(),
          getFabricationExpenseCategories()
        ]);
        if (!isMounted) return;
        if (matRes.status === 'fulfilled' && matRes.value?.success && Array.isArray(matRes.value.data)) {
          setMaterialsList(matRes.value.data.map(m => m.name));
        }
        if (scopeRes.status === 'fulfilled' && scopeRes.value?.success && Array.isArray(scopeRes.value.data)) {
          setWorkScopeDescriptions(scopeRes.value.data.map(s => s.title));
        }
        if (descRes.status === 'fulfilled' && descRes.value?.success && Array.isArray(descRes.value.data)) {
          setSavedDescriptions(descRes.value.data.map(d => d.description));
        }
        if (venRes.status === 'fulfilled' && venRes.value?.success && Array.isArray(venRes.value.data)) {
          setSavedVendors(venRes.value.data);
        }
        if (catRes.status === 'fulfilled' && catRes.value?.success && Array.isArray(catRes.value.data)) {
          setCategoriesList(catRes.value.data.map(c => c.name));
        }
      } catch (e) {
        console.warn('Error fetching live fabrication configs from DB:', e);
      }
    };
    fetchLiveConfig();
    return () => { isMounted = false; };
  }, []);

  const openItemDescriptionModal = () => {
    setDescVendorModalTab('descriptions');
    setIsDescVendorModalOpen(true);
  };

  const openVendorSupplierModal = () => {
    setDescVendorModalTab('vendors');
    setIsDescVendorModalOpen(true);
  };

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  // Generic Confirm Delete Modal state
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Edit Job details modal
  const [isEditJobOpen, setIsEditJobOpen] = useState(false);
  const [editJobForm, setEditJobForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    siteAddress: '',
    status: 'Confirmed / In Progress',
    deliveryDate: '',
    notes: ''
  });

  // ================= INLINE FORM STATES =================
  // 1. Quotation Item Form
  const [quoteForm, setQuoteForm] = useState({
    description: '',
    material: '',
    quantity: 1,
    unit: 'Sq.Ft',
    unitPrice: '',
    amount: 0,
    notes: ''
  });

  // 2. Daily Wage Form
  const [wageForm, setWageForm] = useState({
    date: new Date().toISOString().split('T')[0],
    employee: '',
    employeeName: '',
    workDescription: '',
    shiftType: 'Full Day',
    dailyRate: 800,
    overtimeHours: 0,
    overtimeRate: 100,
    totalWage: 800,
    notes: ''
  });

  // 3. Purchases & Expenses Form
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Purchase',
    category: 'Raw Material (MS/SS Steel)',
    itemDescription: '',
    vendorName: '',
    billNumber: '',
    quantity: 1,
    unit: 'Sq.Ft',
    rate: '',
    amount: 0,
    paymentMode: 'Cash',
    notes: ''
  });

  // 4. Client Payment Form ("Amount Given")
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'Cash',
    transactionReference: '',
    receivedBy: '',
    notes: ''
  });

  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFabricationJobById(id);
      if (res && res.success) {
        setJob(res.data);
        setEditJobForm({
          clientName: res.data.clientName || '',
          clientPhone: res.data.clientPhone || '',
          clientEmail: res.data.clientEmail || '',
          siteAddress: res.data.siteAddress || '',
          status: res.data.status || 'Confirmed / In Progress',
          deliveryDate: res.data.deliveryDate ? new Date(res.data.deliveryDate).toISOString().split('T')[0] : '',
          notes: res.data.notes || ''
        });
      } else {
        showToast(res?.message || 'Failed to load fabrication job', 'error');
      }
    } catch (err) {
      console.error('Error fetching fabrication job:', err);
      showToast('Error loading fabrication job', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  const fetchEmployees = useCallback(async () => {
    try {
      const rawToken = localStorage.getItem('token') || '';
      const cleanToken = rawToken.replace(/^"(.*)"$/, '$1').trim();
      const headers = { Authorization: cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
      const endpoint = API_BASE.endsWith('/v1') ? `${API_BASE}/users` : `${API_BASE}/v1/users`;
      const res = await fetch(endpoint, { headers });
      const data = await res.json();
      if (res.ok && data.data) {
        setEmployees(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  }, []);

  useEffect(() => {
    fetchJob();
    fetchEmployees();
  }, [fetchJob, fetchEmployees]);

  useEffect(() => {
    if (job?.quotationDiscount) {
      setOverallDiscount({
        type: job.quotationDiscount.type || 'fixed',
        value: job.quotationDiscount.value !== undefined ? job.quotationDiscount.value : ''
      });
    }
  }, [job]);

  // ================= AUTO CALCULATION EFFECTS =================
  const handleQuoteQtyPriceChange = (
    quantity = quoteForm.quantity, 
    unitPrice = quoteForm.unitPrice
  ) => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(unitPrice) || 0;
    const amount = Math.round(q * p * 100) / 100;

    setQuoteForm(prev => ({
      ...prev,
      quantity,
      unitPrice,
      amount
    }));
  };

  const handleApplyOverallDiscount = async (e) => {
    if (e) e.preventDefault();
    if (!job?._id) return;
    setSavingDiscount(true);
    try {
      const res = await updateQuotationDiscount(job._id, {
        type: overallDiscount.type,
        value: parseFloat(overallDiscount.value) || 0
      });
      if (res && res.success) {
        showToast('Overall quotation discount updated', 'success');
        setJob(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update discount', 'error');
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleWageCalcChange = (dailyRate, overtimeHours, overtimeRate) => {
    const r = parseFloat(dailyRate) || 0;
    const oth = parseFloat(overtimeHours) || 0;
    const otr = parseFloat(overtimeRate) || 0;
    setWageForm(prev => ({
      ...prev,
      dailyRate,
      overtimeHours,
      overtimeRate,
      totalWage: Math.round((r + (oth * otr)) * 100) / 100
    }));
  };

  const handleExpenseQtyRateChange = (quantity, rate) => {
    const q = parseFloat(quantity) || 0;
    const r = parseFloat(rate) || 0;
    setExpenseForm(prev => ({
      ...prev,
      quantity,
      rate,
      amount: Math.round(q * r * 100) / 100
    }));
  };

  const handleSelectCategory = (catName) => {
    setExpenseForm(prev => ({
      ...prev,
      category: catName
    }));
  };

  const handleSelectDescVendor = ({ itemDescription, vendorName }) => {
    setExpenseForm(prev => {
      const next = { ...prev };
      if (itemDescription !== undefined) {
        next.itemDescription = itemDescription;
      }
      if (vendorName !== undefined) {
        next.vendorName = vendorName;
      }
      return next;
    });
  };

  // ================= 1. QUOTATION HANDLERS =================
  const handleSaveQuotationItem = async (e) => {
    e.preventDefault();
    if (!job?._id) return;
    if (!quoteForm.description.trim()) {
      showToast('Please provide an item description', 'warning');
      return;
    }

    try {
      const itemData = {
        ...quoteForm,
        discountType: 'fixed',
        discountValue: 0,
        discountAmount: 0
      };
      let res;
      if (editingQuotationItem) {
        res = await updateQuotationItem(job._id, editingQuotationItem._id, itemData);
      } else {
        res = await addQuotationItem(job._id, itemData);
      }

      if (res && res.success) {
        showToast(editingQuotationItem ? 'Quotation item updated' : 'Quotation item added', 'success');
        setJob(res.data);
        setIsQuotationModalOpen(false);
        setEditingQuotationItem(null);
        setQuoteForm({
          description: '',
          material: '',
          quantity: 1,
          unit: 'Sq.Ft',
          unitPrice: '',
          amount: 0,
          notes: ''
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save quotation item', 'error');
    }
  };

  const openEditQuotationModal = (item) => {
    setEditingQuotationItem(item);
    setQuoteForm({
      description: item.description || '',
      material: item.material || '',
      quantity: item.quantity ?? 1,
      unit: item.unit || 'Sq.Ft',
      unitPrice: item.unitPrice ?? '',
      amount: item.amount ?? 0,
      notes: item.notes || ''
    });
    setIsQuotationModalOpen(true);
  };

  const promptDeleteQuotationItem = (item) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete Quotation Item',
      message: `Delete item "${item.description}"? This will update the quotation total.`,
      onConfirm: async () => {
        try {
          const res = await deleteQuotationItem(job._id, item._id);
          if (res && res.success) {
            showToast('Quotation item deleted', 'success');
            setJob(res.data);
          }
        } catch (err) {
          showToast('Failed to delete quotation item', 'error');
        } finally {
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // ================= 2. DAILY WAGES HANDLERS =================
  const handleEmployeeDropdownSelect = (e) => {
    const empId = e.target.value;
    if (!empId) {
      setWageForm(prev => ({ ...prev, employee: '', employeeName: '' }));
      return;
    }
    const emp = employees.find(u => (u._id || u.id) === empId);
    if (emp) {
      setWageForm(prev => ({
        ...prev,
        employee: empId,
        employeeName: emp.name || emp.username || 'Employee'
      }));
    }
  };

  const handleSaveWage = async (e) => {
    e.preventDefault();
    if (!job?._id) return;
    if (!wageForm.employeeName.trim()) {
      showToast('Please select or specify an employee name', 'warning');
      return;
    }

    try {
      let res;
      if (editingWage) {
        res = await updateDailyWage(job._id, editingWage._id, wageForm);
      } else {
        res = await addDailyWage(job._id, wageForm);
      }

      if (res && res.success) {
        showToast(editingWage ? 'Daily wage record updated' : 'Daily wage recorded successfully', 'success');
        setJob(res.data);
        setIsWageModalOpen(false);
        setEditingWage(null);
        setWageForm({
          date: new Date().toISOString().split('T')[0],
          employee: '',
          employeeName: '',
          workDescription: '',
          shiftType: 'Full Day',
          dailyRate: 800,
          overtimeHours: 0,
          overtimeRate: 100,
          totalWage: 800,
          notes: ''
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save daily wage', 'error');
    }
  };

  const openEditWageModal = (wage) => {
    setEditingWage(wage);
    setWageForm({
      date: wage.date ? new Date(wage.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      employee: wage.employee?._id || wage.employee || '',
      employeeName: wage.employeeName || '',
      workDescription: wage.workDescription || '',
      shiftType: wage.shiftType || 'Full Day',
      dailyRate: wage.dailyRate ?? 0,
      overtimeHours: wage.overtimeHours ?? 0,
      overtimeRate: wage.overtimeRate ?? 0,
      totalWage: wage.totalWage ?? 0,
      notes: wage.notes || ''
    });
    setIsWageModalOpen(true);
  };

  const promptDeleteWage = (wage) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete Wage Record',
      message: `Delete daily wage entry for ${wage.employeeName} on ${formatDate(wage.date)} (${formatCurrency(wage.totalWage)})?`,
      onConfirm: async () => {
        try {
          const res = await deleteDailyWage(job._id, wage._id);
          if (res && res.success) {
            showToast('Daily wage record deleted', 'success');
            setJob(res.data);
          }
        } catch (err) {
          showToast('Failed to delete wage record', 'error');
        } finally {
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // ================= 3. PURCHASES & EXPENSES HANDLERS =================
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!job?._id) return;

    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      showToast('Please enter a valid amount or quantity and rate', 'warning');
      return;
    }

    const payload = {
      ...expenseForm,
      itemDescription: (expenseForm.itemDescription || '').trim(),
      amount: parseFloat(expenseForm.amount) || 0,
      quantity: expenseForm.type === 'Expense' ? 1 : (parseFloat(expenseForm.quantity) || 1),
      rate: expenseForm.type === 'Expense' ? (parseFloat(expenseForm.amount) || 0) : (parseFloat(expenseForm.rate) || 0)
    };

    try {
      let res;
      if (editingExpense) {
        res = await updatePurchaseExpense(job._id, editingExpense._id, payload);
      } else {
        res = await addPurchaseExpense(job._id, payload);
      }

      if (res && res.success) {
        showToast(editingExpense ? 'Entry updated successfully' : `${expenseForm.type} recorded successfully`, 'success');
        setJob(res.data);
        setIsExpenseModalOpen(false);
        setEditingExpense(null);
        setExpenseForm({
          date: new Date().toISOString().split('T')[0],
          type: expenseForm.type,
          category: expenseForm.category,
          itemDescription: '',
          vendorName: '',
          billNumber: '',
          quantity: 1,
          unit: 'Sq.Ft',
          rate: '',
          amount: 0,
          paymentMode: 'Cash',
          notes: ''
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save expense', 'error');
    }
  };

  const openEditExpenseModal = (entry) => {
    setEditingExpense(entry);
    setExpenseForm({
      date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type: entry.type || 'Purchase',
      category: entry.category || 'Raw Material (MS/SS Steel)',
      itemDescription: entry.itemDescription || '',
      vendorName: entry.vendorName || '',
      billNumber: entry.billNumber || '',
      quantity: entry.quantity ?? 1,
      unit: entry.unit || 'Sq.Ft',
      rate: entry.rate ?? 0,
      amount: entry.amount ?? 0,
      paymentMode: entry.paymentMode || 'Cash',
      notes: entry.notes || ''
    });
    setIsExpenseModalOpen(true);
  };

  const promptDeleteExpense = (entry) => {
    setDeleteConfirm({
      isOpen: true,
      title: `Delete ${entry.type}`,
      message: entry.itemDescription?.trim()
        ? `Delete ${entry.type.toLowerCase()} record "${entry.itemDescription.trim()}" (${formatCurrency(entry.amount)})?`
        : `Delete ${entry.type.toLowerCase()} record (${formatCurrency(entry.amount)})?`,
      onConfirm: async () => {
        try {
          const res = await deletePurchaseExpense(job._id, entry._id);
          if (res && res.success) {
            showToast(`${entry.type} record deleted`, 'success');
            setJob(res.data);
          }
        } catch (err) {
          showToast('Failed to delete expense entry', 'error');
        } finally {
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // ================= 4. CLIENT PAYMENTS HANDLERS ("Amount Given") =================
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!job?._id) return;
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      showToast('Please enter a valid payment amount', 'warning');
      return;
    }

    try {
      let res;
      if (editingPayment) {
        res = await updateClientPayment(job._id, editingPayment._id, paymentForm);
      } else {
        res = await addClientPayment(job._id, paymentForm);
      }

      if (res && res.success) {
        showToast(editingPayment ? 'Payment updated successfully' : 'Client payment recorded successfully', 'success');
        setJob(res.data);
        setIsPaymentModalOpen(false);
        setEditingPayment(null);
        setPaymentForm({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          paymentMode: 'Cash',
          transactionReference: '',
          receivedBy: '',
          notes: ''
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record payment', 'error');
    }
  };

  const openEditPaymentModal = (pay) => {
    setEditingPayment(pay);
    setPaymentForm({
      date: pay.date ? new Date(pay.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amount: pay.amount ?? '',
      paymentMode: pay.paymentMode || 'Cash',
      transactionReference: pay.transactionReference || '',
      receivedBy: pay.receivedBy || '',
      notes: pay.notes || ''
    });
    setIsPaymentModalOpen(true);
  };

  const promptDeletePayment = (pay) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete Client Payment',
      message: `Delete payment receipt of ${formatCurrency(pay.amount)} dated ${formatDate(pay.date)}? This will restore the client's balance due.`,
      onConfirm: async () => {
        try {
          const res = await deleteClientPayment(job._id, pay._id);
          if (res && res.success) {
            showToast('Payment record deleted', 'success');
            setJob(res.data);
          }
        } catch (err) {
          showToast('Failed to delete payment', 'error');
        } finally {
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // ================= EDIT JOB META =================
  const handleUpdateJobDetails = async (e) => {
    e.preventDefault();
    try {
      const res = await updateFabricationJob(job._id, {
        clientName: editJobForm.clientName,
        clientPhone: editJobForm.clientPhone,
        clientEmail: editJobForm.clientEmail,
        siteAddress: editJobForm.siteAddress,
        status: editJobForm.status,
        deliveryDate: editJobForm.deliveryDate ? new Date(editJobForm.deliveryDate) : undefined,
        notes: editJobForm.notes
      });
      if (res && res.success) {
        showToast('Job details updated successfully', 'success');
        setJob(res.data);
        setIsEditJobOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update job details', 'error');
    }
  };

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-500">Loading fabrication job ledger...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl mx-auto my-12">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Job Not Found</h2>
        <p className="text-sm text-slate-500 mb-4">The fabrication job could not be located or may have been deleted.</p>
        <button
          onClick={() => navigate('/fabrication')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Return to Fabrication Directory
        </button>
      </div>
    );
  }

  const fin = job.financials || {
    totalQuotation: 0,
    totalPurchases: 0,
    totalWages: 0,
    totalExpenses: 0,
    totalDirectCost: 0,
    totalAmountReceived: 0,
    balanceDue: 0,
    netProfit: 0
  };

  const quotationCount = (job.quotationItems || []).length;
  const wagesCount = (job.dailyWages || []).length;
  const groupedWages = groupWagesByDate(job.dailyWages);
  const purchasesCount = (job.purchasesAndExpenses || []).length;
  const paymentsCount = (job.clientPayments || []).length;

  const paidPercent = fin.totalQuotation > 0 
    ? Math.min(100, Math.round((fin.totalAmountReceived / fin.totalQuotation) * 100))
    : 0;

  const filteredPurchasesAndExpenses = (job.purchasesAndExpenses || []).filter(item => {
    if (expenseFilter === 'All') return true;
    return item.type === expenseFilter;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* 1. Header Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/fabrication')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Workspace</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOverallLedgerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            title="Download Overall Project Report PDF (Tables with Data Only)"
          >
            <Download size={14} />
            <span>Overall PDF Report</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs"
          >
            <Printer size={14} />
            <span>Print Ledger</span>
          </button>
          <button
            onClick={() => setIsEditJobOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Job Info</span>
          </button>
        </div>
      </div>

      {/* 2. Client Identity Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            {job.clientName?.[0]?.toUpperCase() || 'C'}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {job.clientName}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold border border-indigo-200 dark:border-indigo-800">
                {job.jobId}
              </span>
              <span className="text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg font-bold border border-emerald-200 dark:border-emerald-800">
                {job.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
              {job.clientPhone && (
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" />
                  <a href={`tel:${job.clientPhone}`} className="hover:underline">{job.clientPhone}</a>
                </span>
              )}
              {job.clientEmail && (
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-slate-400" />
                  <a href={`mailto:${job.clientEmail}`} className="hover:underline">{job.clientEmail}</a>
                </span>
              )}
              {job.siteAddress && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  <span>{job.siteAddress}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Highlights Badge */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 w-full md:w-auto justify-between md:justify-start">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Balance Pending</span>
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
              {formatCurrency(fin.balanceDue)}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Quoted</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(fin.totalQuotation)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sticky Quick Jump Anchor Navigation Bar */}
      <div className="sticky top-2 z-30 p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-md flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-extrabold uppercase text-slate-400 px-2 hidden sm:inline">
            Jump to:
          </span>

          <button
            onClick={() => scrollToSection('section-quotation')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileText size={14} className="text-indigo-600" />
            <span>1. Quotation ({quotationCount})</span>
          </button>

          <button
            onClick={() => scrollToSection('section-purchases')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ShoppingCart size={14} className="text-indigo-600" />
            <span>2. Purchases & Expenses ({purchasesCount})</span>
          </button>

          <button
            onClick={() => scrollToSection('section-wages')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Users size={14} className="text-indigo-600" />
            <span>3. Daily Wages ({wagesCount})</span>
          </button>

          <button
            onClick={() => scrollToSection('section-payments')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <CreditCard size={14} className="text-emerald-600" />
            <span>4. Amount Given ({paymentsCount})</span>
          </button>

          <button
            onClick={() => scrollToSection('section-financials')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer whitespace-nowrap border border-indigo-200 dark:border-indigo-800/60"
          >
            <DollarSign size={14} />
            <span>5. Overall Financials</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Paid: {paidPercent}%</span>
          <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-2" style={{ width: `${paidPercent}%` }} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: 📋 ITEMISED WORK QUOTATION & MEASUREMENTS                      */}
      {/* ========================================================================= */}
      <section id="section-quotation" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/50">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                1. Quotation & Work Measurements
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {quotationCount} items
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Itemize fabrication scopes, dimensions (Sq.Ft / Inches / Kg / Nos), rates and auto-calculate total.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Quotation Subtotal</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {formatCurrency(fin.totalQuotation)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsInvoiceOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Download or Print Quotation Work Invoice PDF"
            >
              <Download size={15} />
              <span>Download Invoice</span>
            </button>
          </div>
        </div>

        {/* INLINE QUICK-ADD FORM FOR QUOTATION */}
        <form onSubmit={handleSaveQuotationItem} className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Plus size={15} />
              <span>Add Quotation Item (Direct Inline Entry)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Auto-calculates Amount = Measurements × Unit Rate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Item / Work Scope Description <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsWorkScopeModalOpen(true)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                  title="Add, Edit or Delete Descriptions"
                >
                  <Plus size={11} className="stroke-[3]" />
                  <span>Manage</span>
                </button>
              </div>
              <input
                type="text"
                required
                list="fab-work-scope-descriptions-list"
                placeholder="e.g. Main Gate Tubular MS Frame (12x7 ft)"
                value={quoteForm.description}
                onChange={(e) => setQuoteForm({ ...quoteForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <datalist id="fab-work-scope-descriptions-list">
                {workScopeDescriptions.map((desc, i) => (
                  <option key={i} value={desc} />
                ))}
              </datalist>
            </div>

            {/* Material Dropdown with + Manage */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Material
                </label>
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(true)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                  title="Add, Edit or Delete Materials"
                >
                  <Plus size={11} className="stroke-[3]" />
                  <span>Manage</span>
                </button>
              </div>
              <select
                value={quoteForm.material}
                onChange={(e) => setQuoteForm({ ...quoteForm, material: e.target.value })}
                className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Select Material</option>
                {materialsList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Unit
                </label>
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(true)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                  title="Add, Edit or Delete Measurement Units"
                >
                  <Plus size={11} className="stroke-[3]" />
                  <span>Manage</span>
                </button>
              </div>
              <select
                value={quoteForm.unit}
                onChange={(e) => setQuoteForm({ ...quoteForm, unit: e.target.value })}
                className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {unitsList.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 truncate" title="Measurements">
                Measurements
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={quoteForm.quantity}
                onChange={(e) => handleQuoteQtyPriceChange(e.target.value, quoteForm.unitPrice)}
                className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Rate (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Rate"
                value={quoteForm.unitPrice}
                onChange={(e) => handleQuoteQtyPriceChange(quoteForm.quantity, e.target.value)}
                className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between gap-1.5">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  {formatCurrency(quoteForm.amount)}
                </span>
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                + Add Item
              </button>
            </div>
          </div>
        </form>

        {/* QUOTATION TABLE */}
        {quotationCount === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <FileText size={28} className="mx-auto text-slate-400 mb-1.5" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No quotation items added yet</p>
            <p className="text-[11px] text-slate-400">Use the form above to enter your first line item with measurements & rates.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Work / Item Description</th>
                    <th className="py-3 px-4 text-center">Material</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-right">Measurements</th>
                    <th className="py-3 px-4 text-right">Unit Rate</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {job.quotationItems.map((item, idx) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{item.description}</div>
                        {item.notes && <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.material ? (
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded font-semibold text-[11px] border border-indigo-100 dark:border-indigo-900/50">
                            {item.material}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-semibold">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditQuotationModal(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => promptDeleteQuotationItem(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Subtotal & Discount row */}
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="py-2.5 px-4 text-left">
                      <button
                        type="button"
                        onClick={() => setIsInvoiceOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 shadow-xs cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Download Invoice PDF</span>
                      </button>
                    </td>
                    <td colSpan={3} className="py-2.5 px-4 text-right text-[11px] uppercase text-slate-500 tracking-wider">
                      {fin.discountAmount > 0 ? (
                        <span>Gross Total: {formatCurrency(fin.grossQuotation)} • Discount: −{formatCurrency(fin.discountAmount)} • Net Quoted:</span>
                      ) : (
                        <span>Total Quotation Value:</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-sm text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(fin.totalQuotation)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overall Quotation Discount Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
              <Percent size={16} />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Overall Quotation Discount
              </span>
              <span className="text-[11px] text-slate-500">
                Deduct special flat amount (₹) or percentage (%) from total quoted work order
              </span>
            </div>
          </div>

          <form onSubmit={handleApplyOverallDiscount} className="flex items-center gap-2">
            <select
              value={overallDiscount.type}
              onChange={(e) => setOverallDiscount(prev => ({ ...prev, type: e.target.value }))}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              <option value="fixed">Flat (₹)</option>
              <option value="percentage">Percent (%)</option>
            </select>
            <input
              type="number"
              step="any"
              min="0"
              placeholder={overallDiscount.type === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
              value={overallDiscount.value}
              onChange={(e) => setOverallDiscount(prev => ({ ...prev, value: e.target.value }))}
              className="w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="submit"
              disabled={savingDiscount}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingDiscount ? 'Applying...' : 'Apply Discount'}
            </button>
          </form>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: 🛒 MATERIAL PURCHASES & OPERATIONAL EXPENSES                   */}
      {/* ========================================================================= */}
      <section id="section-purchases" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/50">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                2. Material Purchases & Operational Expenses
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {purchasesCount} items
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Log metal purchases (Sq.Ft, Inches, Kg, Tubes), welding consumables, transport & site expenses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPurchaseInvoiceOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Download Material Purchases & Expenses Statement / Invoice PDF"
            >
              <Download size={14} />
              <span>Download Invoice</span>
            </button>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Purchases & Expenses</span>
              <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                {formatCurrency(fin.totalPurchases + fin.totalExpenses)}
              </span>
            </div>
          </div>
        </div>

        {/* INLINE QUICK-ADD FORM FOR PURCHASES & EXPENSES */}
        <form onSubmit={handleSaveExpense} className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Plus size={15} />
                <span>Add Material Purchase or Site Expense</span>
              </span>
              <div className="inline-flex p-0.5 bg-slate-200 dark:bg-slate-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseForm(prev => ({ ...prev, type: 'Purchase' }));
                    setExpenseFilter('Purchase');
                  }}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    expenseForm.type === 'Purchase' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Material Purchase
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseForm(prev => ({ ...prev, type: 'Expense' }));
                    setExpenseFilter('Expense');
                  }}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    expenseForm.type === 'Expense' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Operational Expense
                </button>
              </div>
            </div>

            <span className="text-[11px] text-slate-400 font-normal">
              {expenseForm.type === 'Expense' ? 'Direct site expense / petty cash entry' : 'Amount = Quantity × Unit Rate'}
            </span>
          </div>

          {expenseForm.type === 'Expense' ? (
            /* ========================================================================= */
            /* OPERATIONAL EXPENSE FORM: Date, Type & Category, Amount, Mode, Remarks, Actions */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
              {/* 1. Date */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* 2. Type & Category */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                    title="Add, Edit or Delete Categories"
                  >
                    <Plus size={11} className="stroke-[3]" />
                    <span>Manage</span>
                  </button>
                </div>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 3. Amount */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="e.g. 1500"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 4. Mode */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Mode
                </label>
                <select
                  value={expenseForm.paymentMode}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                  className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {PAYMENT_MODES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 5. Remarks (If any) */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Remarks (If any)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tea & snacks for site team, diesel"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 6. Actions */}
              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs text-center"
                >
                  + Add
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* MATERIAL PURCHASE FORM: Full 2 Rows                                      */
            /* ========================================================================= */
            <>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Date */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Category */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                      title="Add, Edit or Delete Categories"
                    >
                      <Plus size={11} className="stroke-[3]" />
                      <span>Manage</span>
                    </button>
                  </div>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 1. SEPARATE FIELD: Item Description */}
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Item Description
                    </label>
                    <button
                      type="button"
                      onClick={openItemDescriptionModal}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                      title="Add, Edit or Delete Item Descriptions"
                    >
                      <Plus size={11} className="stroke-[3]" />
                      <span>Manage</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    list="fab-job-item-descriptions-list"
                    placeholder="e.g. MS Square Pipe 2x2 inch (Optional)"
                    value={expenseForm.itemDescription}
                    onChange={(e) => setExpenseForm({ ...expenseForm, itemDescription: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="fab-job-item-descriptions-list">
                    {savedDescriptions.map((desc, i) => (
                      <option key={i} value={desc} />
                    ))}
                  </datalist>
                </div>

                {/* 2. SEPARATE FIELD: Vendor / Supplier */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Vendor / Supplier
                    </label>
                    <button
                      type="button"
                      onClick={openVendorSupplierModal}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                      title="Add, Edit or Delete Suppliers / Vendors"
                    >
                      <Plus size={11} className="stroke-[3]" />
                      <span>Manage</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    list="fab-job-vendors-list"
                    placeholder="e.g. Krishna Steels & Hardware"
                    value={expenseForm.vendorName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="fab-job-vendors-list">
                    {savedVendors.map((v, i) => (
                      <option key={i} value={typeof v === 'string' ? v : v.name} />
                    ))}
                  </datalist>
                </div>

                {/* Unit Dropdown */}
                <div className="md:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Unit
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsUnitModalOpen(true)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                      title="Add, Edit or Delete Measurement Units"
                    >
                      <Plus size={11} className="stroke-[3]" />
                      <span>Manage</span>
                    </button>
                  </div>
                  <select
                    value={expenseForm.unit}
                    onChange={(e) => setExpenseForm({ ...expenseForm, unit: e.target.value })}
                    className="w-full px-1 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {unitsList.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={expenseForm.quantity}
                    onChange={(e) => handleExpenseQtyRateChange(e.target.value, expenseForm.rate)}
                    className="w-full px-1.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Rate */}
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Rate"
                    value={expenseForm.rate}
                    onChange={(e) => handleExpenseQtyRateChange(expenseForm.quantity, e.target.value)}
                    className="w-full px-1.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: Optional Bill #, Payment Mode, Total & Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Bill/Inv #:</span>
                    <input
                      type="text"
                      placeholder="Optional (e.g. INV-8492)"
                      value={expenseForm.billNumber}
                      onChange={(e) => setExpenseForm({ ...expenseForm, billNumber: e.target.value })}
                      className="w-36 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Mode:</span>
                    <select
                      value={expenseForm.paymentMode}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {PAYMENT_MODES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Cost</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {formatCurrency(expenseForm.amount)}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    + Add Entry
                  </button>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Filter Pills & Download PDF Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {['All', 'Purchase', 'Expense'].map(type => (
              <button
                key={type}
                onClick={() => setExpenseFilter(type)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expenseFilter === type
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {type === 'All' ? `All Entries (${purchasesCount})` : type === 'Purchase' ? `Purchases (${job?.purchasesAndExpenses?.filter(p => p.type === 'Purchase').length || 0})` : `Site Expenses (${job?.purchasesAndExpenses?.filter(p => p.type === 'Expense').length || 0})`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsPurchaseInvoiceOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 shadow-xs cursor-pointer"
            title="Download Purchases & Expenses Invoice PDF"
          >
            <Download size={13} />
            <span>Download Invoice PDF</span>
          </button>
        </div>

        {/* PURCHASES & EXPENSES TABLE */}
        {filteredPurchasesAndExpenses.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <ShoppingCart size={28} className="mx-auto text-slate-400 mb-1.5" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No purchases or expenses logged</p>
            <p className="text-[11px] text-slate-400">Record steel sheets, tubular pipes, fasteners, and workshop expenses above.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  {expenseFilter === 'Expense' ? (
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type & Category</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Mode</th>
                      <th className="py-3 px-4">Remarks (If any)</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  ) : (
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type & Category</th>
                      <th className="py-3 px-4">Item Description</th>
                      <th className="py-3 px-4">Vendor / Supplier</th>
                      <th className="py-3 px-4 text-center">Unit</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-right">Rate</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Mode</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPurchasesAndExpenses.map((entry) => (
                    expenseFilter === 'Expense' ? (
                      <tr key={entry._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold mr-2 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {entry.type}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300 font-semibold">{entry.category}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap text-slate-500">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300">
                            {entry.paymentMode || 'Cash'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {entry.notes?.trim() || (entry.itemDescription?.trim() && entry.itemDescription.trim() !== 'Material Purchase' && entry.itemDescription.trim() !== 'Site Operational Expense' ? entry.itemDescription.trim() : null) || <span className="text-slate-400 italic">No remarks</span>}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditExpenseModal(entry)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="Edit Entry"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => promptDeleteExpense(entry)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="Delete Entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={entry._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold mr-2 ${
                            entry.type === 'Purchase' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {entry.type}
                          </span>
                          <span className="text-slate-500">{entry.category}</span>
                        </td>
                        <td className="py-3 px-4">
                          {entry.itemDescription?.trim() && entry.itemDescription.trim() !== 'Material Purchase' && entry.itemDescription.trim() !== 'Site Operational Expense' ? (
                            <div className="font-bold text-slate-900 dark:text-white">{entry.itemDescription.trim()}</div>
                          ) : null}
                          {entry.billNumber && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Bill #{entry.billNumber}</div>
                          )}
                          {entry.notes && entry.type === 'Expense' && (
                            <div className="text-[10px] text-slate-500 mt-0.5 italic">{entry.notes}</div>
                          )}
                          {!entry.itemDescription?.trim() && !entry.billNumber && (!entry.notes || entry.type !== 'Expense') && (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {entry.vendorName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              🏪 {entry.vendorName}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300">
                            {entry.unit || 'Nos'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                          {entry.type === 'Expense' ? '—' : entry.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                          {entry.type === 'Expense' ? '—' : (entry.rate > 0 ? formatCurrency(entry.rate) : '-')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap text-slate-500">
                          {entry.paymentMode}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditExpenseModal(entry)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="Edit Entry"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => promptDeleteExpense(entry)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="Delete Entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                  {/* Subtotal row */}
                  {expenseFilter === 'Expense' ? (
                    <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                      <td colSpan={2} className="py-2.5 px-4 text-right text-[11px] uppercase text-slate-500 tracking-wider">
                        Site Operational Expenses Total:
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatCurrency(fin.totalExpenses)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  ) : (
                    <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                      <td colSpan={7} className="py-2.5 px-4 text-right text-[11px] uppercase text-slate-500 tracking-wider">
                        {expenseFilter === 'Purchase' ? 'Material Purchases Total:' : 'Purchases & Site Expenses Total:'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatCurrency(expenseFilter === 'Purchase' ? fin.totalPurchases : (fin.totalPurchases + fin.totalExpenses))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: 👷 EMPLOYEE DAILY WAGES TRACKER                                */}
      {/* ========================================================================= */}
      <section id="section-wages" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/50">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                3. Employee Daily Wage Tracker
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {wagesCount} entries
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Log daily worker wages with a calendar date picker, employee picker, shifts and overtime payout.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Wages Incurred</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(fin.totalWages)}
            </span>
          </div>
        </div>

        {/* INLINE QUICK-ADD FORM FOR DAILY WAGES */}
        <form onSubmit={handleSaveWage} className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Plus size={15} />
              <span>Log Daily Wage (Direct Inline Entry)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Total Wage = Daily Rate + (OT Hours × OT Rate)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Calendar Date Picker */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Work Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={wageForm.date}
                onChange={(e) => setWageForm({ ...wageForm, date: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Employee Selection Dropdown */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Select Employee / Welder <span className="text-rose-500">*</span>
              </label>
              <select
                value={wageForm.employee}
                onChange={handleEmployeeDropdownSelect}
                className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">-- Choose Employee / Staff --</option>
                {employees.map(emp => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {emp.name || emp.username} ({emp.designation || emp.role?.name || emp.role || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Type */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Shift Type
              </label>
              <select
                value={wageForm.shiftType}
                onChange={(e) => setWageForm({ ...wageForm, shiftType: e.target.value })}
                className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {SHIFT_TYPES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Daily Rate */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Daily Rate (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={wageForm.dailyRate}
                onChange={(e) => handleWageCalcChange(e.target.value, wageForm.overtimeHours, wageForm.overtimeRate)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Overtime (Hours & Rate) */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                OT (Hrs @ ₹/hr)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Hrs"
                  value={wageForm.overtimeHours}
                  onChange={(e) => handleWageCalcChange(wageForm.dailyRate, e.target.value, wageForm.overtimeRate)}
                  className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="₹/hr"
                  value={wageForm.overtimeRate}
                  onChange={(e) => handleWageCalcChange(wageForm.dailyRate, wageForm.overtimeHours, e.target.value)}
                  className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Submit & Wage Subtotal */}
            <div className="md:col-span-1">
              <button
                type="submit"
                className="w-full px-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
                title={`Log Wage: ${formatCurrency(wageForm.totalWage)}`}
              >
                + Log
              </button>
            </div>
          </div>
        </form>

        {/* WAGES TABLE */}
        {wagesCount === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Users size={28} className="mx-auto text-slate-400 mb-1.5" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No daily wage records logged yet</p>
            <p className="text-[11px] text-slate-400">Select an employee and work date above to track labor costs.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee / Fabricator</th>
                    <th className="py-3 px-4">Shift & Work Notes</th>
                    <th className="py-3 px-4 text-right">Daily Rate</th>
                    <th className="py-3 px-4 text-right">Overtime</th>
                    <th className="py-3 px-4 text-right">Total Wage</th>
                    <th className="py-3 px-4 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {groupedWages.map((group) => (
                    <React.Fragment key={group.key}>
                      {/* Minimal Date Head Row */}
                      <tr className="bg-slate-100/80 dark:bg-slate-800/70 border-t border-b border-slate-200 dark:border-slate-700">
                        <td colSpan={6} className="py-2 px-4">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span className="font-bold text-slate-900 dark:text-white">
                                {group.displayDate}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                • {group.entries.length} {group.entries.length === 1 ? 'shift' : 'shifts'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11.5px]">
                              <span className="text-slate-500 dark:text-slate-400">Day Total:</span>
                              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                                {formatCurrency(group.totalWage)}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Shift / Employee Rows under this Date */}
                      {group.entries.map((wage) => (
                        <tr key={wage._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            👷 {wage.employeeName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-[11px] font-bold mr-2">
                              {wage.shiftType}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {wage.workDescription || wage.notes || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                            {formatCurrency(wage.dailyRate)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {wage.overtimeHours > 0 ? (
                              <span>{wage.overtimeHours}h @ {formatCurrency(wage.overtimeRate)}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(wage.totalWage)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditWageModal(wage)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => promptDeleteWage(wage)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {/* Subtotal row */}
                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={4} className="py-2.5 px-4 text-right text-[11px] uppercase text-slate-500 tracking-wider">
                      Total Employee Daily Wages:
                    </td>
                    <td className="py-2.5 px-4 text-right text-sm text-rose-600 dark:text-rose-400">
                      {formatCurrency(fin.totalWages)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: 💳 CLIENT PAYMENTS ("AMOUNT GIVEN")                             */}
      {/* ========================================================================= */}
      <section id="section-payments" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-100 dark:border-emerald-900/50">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                4. Client Payments ("Amount Given")
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  {paymentsCount} payments
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Track client advances, milestone installment payments, and final settlements.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Amount Given</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(fin.totalAmountReceived)}
            </span>
          </div>
        </div>

        {/* INLINE QUICK-ADD FORM FOR CLIENT PAYMENTS */}
        <form onSubmit={handleSavePayment} className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Plus size={15} className="text-emerald-600" />
              <span>Record Client Payment Receipt (Direct Inline Entry)</span>
            </span>
            <span className="text-[11px] text-emerald-600/80 font-normal">
              Reduces Client Balance Due in real-time
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Payment Date */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Amount Given */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                Amount Given (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                step="any"
                min="1"
                placeholder="e.g. 50000"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Payment Mode */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentForm.paymentMode}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {PAYMENT_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Transaction Ref */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                Reference / Cheque #
              </label>
              <input
                type="text"
                placeholder="e.g. GPay / UPI Ref / Cheque # / NEFT"
                value={paymentForm.transactionReference}
                onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Record Payment Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                + Record Payment
              </button>
            </div>
          </div>
        </form>

        {/* PAYMENTS TABLE */}
        {paymentsCount === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <CreditCard size={28} className="mx-auto text-slate-400 mb-1.5" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No payment receipts recorded yet</p>
            <p className="text-[11px] text-slate-400">Record client advance amounts or milestone installments above.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Reference / Transaction ID</th>
                    <th className="py-3 px-4">Received By & Notes</th>
                    <th className="py-3 px-4 text-right">Amount Given</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {job.clientPayments.map((pay, idx) => (
                    <tr key={pay._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {formatDate(pay.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                          {pay.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {pay.transactionReference || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {pay.receivedBy && <div className="font-semibold text-slate-800 dark:text-slate-200">Recv by: {pay.receivedBy}</div>}
                        {pay.notes && <div className="text-slate-400">{pay.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(pay, idx)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer transition-all"
                            title="Receipt / Print Voucher"
                          >
                            <Receipt size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPaymentModal(pay)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="Edit Payment"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => promptDeletePayment(pay)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="Delete Payment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Payments Subtotals */}
                  <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold border-t-2 border-emerald-200 dark:border-emerald-800">
                    <td colSpan={4} className="py-2.5 px-4 text-right text-[11px] uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                      Total Amount Received from Client:
                    </td>
                    <td className="py-2.5 px-4 text-right text-sm text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                      {formatCurrency(fin.totalAmountReceived)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 font-bold">
                    <td colSpan={4} className="py-2 px-4 text-right text-[11px] uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                      Outstanding Client Balance:
                    </td>
                    <td className="py-2 px-4 text-right text-sm text-amber-700 dark:text-amber-300 whitespace-nowrap">
                      {formatCurrency(fin.balanceDue)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: 📊 OVERALL FINANCIAL SUMMARY & LEDGER DETAILS                  */}
      {/* ========================================================================= */}
      <section id="section-financials" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/50 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <DollarSign size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                5. Overall Financial Statement & Details
              </h2>
              <p className="text-xs text-slate-500">
                Complete financial reconciliation: Total Quoted, Direct Costs, Amount Given, Pending Balance & Profit.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOverallLedgerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Download Complete Overall Project Ledger PDF"
            >
              <Download size={14} />
              <span>Download Overall Report PDF</span>
            </button>
            <span className="font-mono text-xs px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold border border-indigo-200 dark:border-indigo-800 hidden sm:inline-block">
              Real-Time Auto-Calculated
            </span>
          </div>
        </div>

        {/* 6 Key Financial Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Quoted */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Total Quoted
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {formatCurrency(fin.totalQuotation)}
            </div>
            <span className="text-[11px] text-slate-400">{quotationCount} line items</span>
          </div>

          {/* Amount Given by Client */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              Amount Given
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              {formatCurrency(fin.totalAmountReceived)}
            </div>
            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400">
              {paidPercent}% collected
            </span>
          </div>

          {/* Balance Due */}
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/70 dark:border-amber-800/60">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block mb-1">
              Balance Due
            </span>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300">
              {formatCurrency(fin.balanceDue)}
            </div>
            <span className="text-[11px] text-amber-600/80 dark:text-amber-400">
              Pending client payment
            </span>
          </div>

          {/* Material Purchases */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Purchases
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {formatCurrency(fin.totalPurchases)}
            </div>
            <span className="text-[11px] text-slate-400">Steel & consumables</span>
          </div>

          {/* Labor Wages */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Labor Wages
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {formatCurrency(fin.totalWages)}
            </div>
            <span className="text-[11px] text-slate-400">{wagesCount} daily wage shifts</span>
          </div>

          {/* Net Margin */}
          <div className={`p-4 rounded-2xl border ${
            fin.netProfit >= 0 
              ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/60' 
              : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60'
          }`}>
            <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
              fin.netProfit >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              Net Margin
            </span>
            <div className={`text-xl font-black ${
              fin.netProfit >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-rose-700 dark:text-rose-300'
            }`}>
              {formatCurrency(fin.netProfit)}
            </div>
            <span className={`text-[11px] ${
              fin.netProfit >= 0 ? 'text-indigo-600/80 dark:text-indigo-400' : 'text-rose-600/80 dark:text-rose-400'
            }`}>
              Amount Given vs Direct Costs
            </span>
          </div>
        </div>

        {/* Detailed Breakdown Ledger Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px]">
                <th className="py-3 px-4">Financial Parameter</th>
                <th className="py-3 px-4">Calculation Formula</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-right">Status / Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Total Quoted Work Order</td>
                <td className="py-3 px-4 text-slate-500">Sum of all approved quotation line items</td>
                <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">{formatCurrency(fin.totalQuotation)}</td>
                <td className="py-3 px-4 text-right font-semibold text-indigo-600">Total Agreed Contract</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-emerald-700 dark:text-emerald-400">Total Amount Received from Client</td>
                <td className="py-3 px-4 text-slate-500">Sum of client advances & payment receipts</td>
                <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(fin.totalAmountReceived)}</td>
                <td className="py-3 px-4 text-right font-semibold text-emerald-600">{paidPercent}% Received</td>
              </tr>
              <tr className="bg-amber-50/30 dark:bg-amber-950/10">
                <td className="py-3 px-4 font-bold text-amber-700 dark:text-amber-400">Outstanding Receivable Balance</td>
                <td className="py-3 px-4 text-slate-500">Total Quoted − Total Amount Given</td>
                <td className="py-3 px-4 text-right font-black text-amber-700 dark:text-amber-400">{formatCurrency(fin.balanceDue)}</td>
                <td className="py-3 px-4 text-right font-semibold text-amber-600">{100 - paidPercent}% Pending</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Total Material Purchases</td>
                <td className="py-3 px-4 text-slate-500">Steel pipes, sheets, consumables & hardware</td>
                <td className="py-3 px-4 text-right font-black text-slate-700 dark:text-slate-300">{formatCurrency(fin.totalPurchases)}</td>
                <td className="py-3 px-4 text-right text-slate-500">Direct Cost</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Total Employee Daily Wages</td>
                <td className="py-3 px-4 text-slate-500">Worker shifts, welder daily rates & overtime</td>
                <td className="py-3 px-4 text-right font-black text-slate-700 dark:text-slate-300">{formatCurrency(fin.totalWages)}</td>
                <td className="py-3 px-4 text-right text-slate-500">Labor Cost</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Operational & Site Expenses</td>
                <td className="py-3 px-4 text-slate-500">Freight, gas, crane hire & refreshments</td>
                <td className="py-3 px-4 text-right font-black text-slate-700 dark:text-slate-300">{formatCurrency(fin.totalExpenses)}</td>
                <td className="py-3 px-4 text-right text-slate-500">Site Cost</td>
              </tr>
              <tr className="bg-rose-50/30 dark:bg-rose-950/10">
                <td className="py-3 px-4 font-bold text-rose-700 dark:text-rose-400">Total Direct Workshop Costs Incurred</td>
                <td className="py-3 px-4 text-slate-500">Purchases + Daily Wages + Operational Expenses</td>
                <td className="py-3 px-4 text-right font-black text-rose-700 dark:text-rose-400">{formatCurrency(fin.totalDirectCost)}</td>
                <td className="py-3 px-4 text-right font-bold text-rose-600">Total Outflow</td>
              </tr>
              <tr className={`font-bold ${fin.netProfit >= 0 ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'bg-rose-50/40 dark:bg-rose-950/20'}`}>
                <td className="py-3.5 px-4 text-sm font-black text-slate-900 dark:text-white">Current Net Profit (Realized Margin)</td>
                <td className="py-3.5 px-4 text-slate-500">Amount Given − Total Direct Costs Incurred</td>
                <td className={`py-3.5 px-4 text-right text-base font-black ${fin.netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(fin.netProfit)}
                </td>
                <td className={`py-3.5 px-4 text-right font-black ${fin.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {fin.netProfit >= 0 ? 'Profitable' : 'Deficit / Pending Payment'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Progress bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Client Payment Collection Progress</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{paidPercent}% of Quoted Total Received</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODALS FOR EDITING EXISTING LINE ITEMS                                    */}
      {/* ========================================================================= */}

      {/* 1. Edit Quotation Modal */}
      {isQuotationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Quotation Item
              </h3>
              <button onClick={() => { setIsQuotationModalOpen(false); setEditingQuotationItem(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuotationItem} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Item / Work Scope Description <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsWorkScopeModalOpen(true)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                    title="Add, Edit or Delete Descriptions"
                  >
                    <Plus size={11} className="stroke-[3]" />
                    <span>Manage</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  list="fab-work-scope-descriptions-list"
                  placeholder="e.g. Main Gate Tubular MS Frame (12x7 ft)"
                  value={quoteForm.description}
                  onChange={(e) => setQuoteForm({ ...quoteForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Material
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMaterialModalOpen(true)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                    title="Add, Edit or Delete Materials"
                  >
                    <Plus size={11} className="stroke-[3]" />
                    <span>Manage</span>
                  </button>
                </div>
                <select
                  value={quoteForm.material || ''}
                  onChange={(e) => setQuoteForm({ ...quoteForm, material: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">Select Material (Optional)</option>
                  {materialsList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Measurements
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={quoteForm.quantity}
                    onChange={(e) => handleQuoteQtyPriceChange(e.target.value, quoteForm.unitPrice)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Unit
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsUnitModalOpen(true)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                      title="Add, Edit or Delete Measurement Units"
                    >
                      <Plus size={11} className="stroke-[3]" />
                      <span>Manage</span>
                    </button>
                  </div>
                  <select
                    value={quoteForm.unit}
                    onChange={(e) => setQuoteForm({ ...quoteForm, unit: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {unitsList.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rate per Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={quoteForm.unitPrice}
                    onChange={(e) => handleQuoteQtyPriceChange(quoteForm.quantity, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 block">
                    Total Item Amount:
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Calculated as Measurements × Rate per Unit
                  </span>
                </div>
                <span className="text-base font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                  {formatCurrency(quoteForm.amount)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specifications / Notes
                </label>
                <textarea
                  rows={2}
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  placeholder="Material specs, thickness, powder coating, etc."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsQuotationModalOpen(false); setEditingQuotationItem(null); }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Wage Modal */}
      {isWageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Daily Wage Record
              </h3>
              <button onClick={() => { setIsWageModalOpen(false); setEditingWage(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWage} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Picker <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={wageForm.date}
                    onChange={(e) => setWageForm({ ...wageForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shift Type
                  </label>
                  <select
                    value={wageForm.shiftType}
                    onChange={(e) => setWageForm({ ...wageForm, shiftType: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {SHIFT_TYPES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee Selection <span className="text-rose-500">*</span>
                </label>
                <select
                  value={wageForm.employee}
                  onChange={handleEmployeeDropdownSelect}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer mb-1.5"
                >
                  <option value="">-- Select from Staff List --</option>
                  {employees.map(emp => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name || emp.username} ({emp.designation || 'Staff'})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter employee / welder name directly"
                  value={wageForm.employeeName}
                  onChange={(e) => setWageForm({ ...wageForm, employeeName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={wageForm.dailyRate}
                    onChange={(e) => handleWageCalcChange(e.target.value, wageForm.overtimeHours, wageForm.overtimeRate)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    OT Hours
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={wageForm.overtimeHours}
                    onChange={(e) => handleWageCalcChange(wageForm.dailyRate, e.target.value, wageForm.overtimeRate)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    OT Rate (₹/hr)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={wageForm.overtimeRate}
                    onChange={(e) => handleWageCalcChange(wageForm.dailyRate, wageForm.overtimeHours, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                  Total Wage Payout:
                </span>
                <span className="text-base font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                  {formatCurrency(wageForm.totalWage)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsWageModalOpen(false); setEditingWage(null); }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit {expenseForm.type} Entry
              </h3>
              <button onClick={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entry Type
                  </label>
                  <select
                    value={expenseForm.type}
                    onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Purchase">Material Purchase</option>
                    <option value="Expense">Site Operational Expense</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                    >
                      <Plus size={11} className="stroke-[3]" />
                      <span>Manage</span>
                    </button>
                  </div>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date Picker <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {expenseForm.type === 'Expense' ? (
                <>
                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="e.g. 1500"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={expenseForm.paymentMode}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {PAYMENT_MODES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Remarks (If any)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Site team refreshments, diesel, travel"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* 1. SEPARATE FIELD: Item Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Item Description
                      </label>
                      <button
                        type="button"
                        onClick={openItemDescriptionModal}
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                        title="Add, Edit or Delete Item Descriptions"
                      >
                        <Plus size={11} className="stroke-[3]" />
                        <span>Manage</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      list="fab-job-item-descriptions-list"
                      placeholder="e.g. MS Square Pipe 2x2 inch (Optional)"
                      value={expenseForm.itemDescription}
                      onChange={(e) => setExpenseForm({ ...expenseForm, itemDescription: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* 2. SEPARATE FIELD: Vendor / Supplier */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Vendor / Supplier
                      </label>
                      <button
                        type="button"
                        onClick={openVendorSupplierModal}
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                        title="Add, Edit or Delete Suppliers / Vendors"
                      >
                        <Plus size={11} className="stroke-[3]" />
                        <span>Manage</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      list="fab-job-vendors-list"
                      placeholder="e.g. Krishna Steels & Hardware"
                      value={expenseForm.vendorName}
                      onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={expenseForm.quantity}
                        onChange={(e) => handleExpenseQtyRateChange(e.target.value, expenseForm.rate)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Unit
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsUnitModalOpen(true)}
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                          title="Add, Edit or Delete Measurement Units"
                        >
                          <Plus size={11} className="stroke-[3]" />
                          <span>Manage</span>
                        </button>
                      </div>
                      <select
                        value={expenseForm.unit}
                        onChange={(e) => setExpenseForm({ ...expenseForm, unit: e.target.value })}
                        className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        {unitsList.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Rate per Unit (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={expenseForm.rate}
                        onChange={(e) => handleExpenseQtyRateChange(expenseForm.quantity, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-900 dark:text-rose-300">
                      Total Cost:
                    </span>
                    <span className="text-base font-bold text-rose-700 dark:text-rose-400 font-mono">
                      {formatCurrency(expenseForm.amount)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Client Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Client Payment Receipt
              </h3>
              <button onClick={() => { setIsPaymentModalOpen(false); setEditingPayment(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Received <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Received (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="1"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {PAYMENT_MODES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reference / Cheque Number
                </label>
                <input
                  type="text"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  placeholder="UPI transaction reference, Cheque number, etc."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsPaymentModalOpen(false); setEditingPayment(null); }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Job Info Modal */}
      {isEditJobOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Fabrication Job Info
              </h3>
              <button onClick={() => setIsEditJobOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateJobDetails} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editJobForm.clientName}
                    onChange={(e) => setEditJobForm({ ...editJobForm, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Phone
                  </label>
                  <input
                    type="text"
                    value={editJobForm.clientPhone}
                    onChange={(e) => setEditJobForm({ ...editJobForm, clientPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Site / Delivery Address
                </label>
                <input
                  type="text"
                  value={editJobForm.siteAddress}
                  onChange={(e) => setEditJobForm({ ...editJobForm, siteAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editJobForm.status}
                    onChange={(e) => setEditJobForm({ ...editJobForm, status: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Quotation Stage">Quotation Stage</option>
                    <option value="Confirmed / In Progress">Confirmed / In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={editJobForm.deliveryDate}
                    onChange={(e) => setEditJobForm({ ...editJobForm, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditJobOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Update Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Universal Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Overall Project Ledger Report Modal (Data Tables Only) */}
      <OverallFabricationLedgerModal
        isOpen={isOverallLedgerOpen}
        onClose={() => setIsOverallLedgerOpen(false)}
        job={job}
        client={{
          companyName: job.clientName,
          clientName: job.clientName,
          phone: job.clientPhone,
          email: job.clientEmail,
          address: job.siteAddress
        }}
        financials={fin}
      />

      {/* Material Purchases & Operational Expenses Invoice Modal */}
      <PurchaseExpenseInvoiceModal
        isOpen={isPurchaseInvoiceOpen}
        onClose={() => setIsPurchaseInvoiceOpen(false)}
        client={{
          companyName: job.clientName,
          clientName: job.clientName,
          phone: job.clientPhone,
          email: job.clientEmail,
          address: job.siteAddress
        }}
        job={job}
        purchasesAndExpenses={job.purchasesAndExpenses || []}
        financials={fin}
      />

      {/* 7. Quotation & Work Measurements Invoice Modal */}
      <QuotationInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        client={{
          companyName: job.clientName,
          clientName: job.clientName,
          phone: job.clientPhone,
          email: job.clientEmail,
          address: job.siteAddress
        }}
        job={job}
        quotationItems={job.quotationItems || []}
        financials={fin}
      />

      {/* 8. Manage Expense Categories Modal */}
      <ExpenseCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        selectedCategory={expenseForm.category}
        onSelectCategory={handleSelectCategory}
        onCategoriesChanged={(newCats) => setCategoriesList(newCats)}
      />

      {/* 9. Manage Descriptions & Vendors Modal */}
      <DescriptionVendorModal
        isOpen={isDescVendorModalOpen}
        onClose={() => setIsDescVendorModalOpen(false)}
        initialTab={descVendorModalTab}
        initialDescription={expenseForm.itemDescription}
        initialVendor={expenseForm.vendorName}
        onSelect={handleSelectDescVendor}
      />

      {/* 10. Manage Quotation Materials Modal */}
      <QuotationMaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        selectedMaterial={quoteForm.material}
        onSelectMaterial={handleSelectMaterial}
        onMaterialsChanged={handleMaterialsChanged}
      />

      {/* Manage Quotation Units Modal */}
      <QuotationUnitModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        selectedUnit={quoteForm.unit}
        onSelectUnit={handleSelectUnit}
        onUnitsChanged={handleUnitsChanged}
      />

      {/* 11. Manage Work Scope Descriptions Modal */}
      <WorkScopeModal
        isOpen={isWorkScopeModalOpen}
        onClose={() => setIsWorkScopeModalOpen(false)}
        selectedDescription={quoteForm.description}
        onSelectDescription={handleSelectWorkScope}
        onDescriptionsChanged={handleWorkScopesChanged}
      />

      {/* 12. Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceiptPayment(null);
        }}
        payment={selectedReceiptPayment}
        paymentIndex={selectedReceiptIndex}
        job={job}
        financials={fin}
      />
    </div>
  );
};

export default FabricationJobDetailsPage;
