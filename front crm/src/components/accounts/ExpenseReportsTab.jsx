import React, { useState, useEffect } from 'react';
import { getDailyReport, getMonthlyReport, getCategoryWiseReport, getSalaryReport, getTotalReport } from '../../services/accountsService';
import { BarChart3, Calendar, PieChart, DollarSign, ArrowDownToLine, RefreshCw, TrendingUp, TrendingDown, Coins, ShoppingCart, Search, Filter, ArrowUpDown, Wallet, CreditCard, Users, Receipt } from 'lucide-react';
import ExcelExportButton from '../ExcelExportButton';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const getApiEndpoint = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE.endsWith('/v1')) {
    return `${API_BASE}${cleanPath}`;
  }
  if (API_BASE.endsWith('/api')) {
    return `${API_BASE}/v1${cleanPath}`;
  }
  return `${API_BASE}/api/v1${cleanPath}`;
};

const getAuthHeaders = () => {
  const rawToken = localStorage.getItem('token') || '';
  const cleanToken = rawToken.replace(/^"(.*)"$/, '$1').trim();
  return {
    'Content-Type': 'application/json',
    'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`
  };
};

const ExpenseReportsTab = () => {
  const [activeReportSubTab, setActiveReportSubTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [capitals, setCapitals] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [generalExpenses, setGeneralExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [error, setError] = useState('');

  // Daily Filter
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Monthly Filter
  const [monthlyYear, setMonthlyYear] = useState(() => new Date().getFullYear().toString());
  const [monthlyMonth, setMonthlyMonth] = useState(() => (new Date().getMonth() + 1).toString());

  // Category Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Salary Filter
  const [salaryMonth, setSalaryMonth] = useState('');

  // Search, Filter & Sort Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [flowFilter, setFlowFilter] = useState('ALL'); // 'ALL' | 'INCOME' | 'EXPENSE' | 'PURCHASE' | 'CAPITAL'
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

  const fetchIncomeData = async () => {
    try {
      const res = await fetch(getApiEndpoint('/accounts/income'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setIncomes(data.data);
        }
      }
    } catch (e) {
      console.warn('Error fetching income for financial report:', e);
    }
  };

  const fetchExpensesAndPurchasesData = async () => {
    try {
      const savedPurchasesLocal = JSON.parse(localStorage.getItem('crm_purchase_records') || '[]');
      const res = await fetch(getApiEndpoint('/accounts/expenses'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAllExpenses(data.data);

          const isOwnerDrawing = (item) => {
            const cat = String(item.categoryName || item.category || '').toLowerCase();
            const desc = String(item.description || '').toLowerCase();
            return cat.includes('owner drawing') || cat.includes('partner drawing') || desc.includes('[owner 1]') || desc.includes('[owner 2]');
          };
          const isPur = (item) => item.isPurchase === true || String(item.categoryName || item.category || '').toLowerCase().includes('purchase') || String(item.categoryName || item.category || '').toLowerCase().includes('inventory');
          const isSal = (item) => item.type === 'Salary' || String(item.categoryName || item.category || '').toLowerCase() === 'salary';

          const filteredPurchases = data.data.filter(item => !isOwnerDrawing(item) && isPur(item));
          const filteredGeneral = data.data.filter(item => !isOwnerDrawing(item) && !isPur(item) && !isSal(item));

          const combinedPurchasesMap = new Map();
          savedPurchasesLocal.forEach(p => combinedPurchasesMap.set(String(p._id || p.id), p));
          filteredPurchases.forEach(p => combinedPurchasesMap.set(String(p._id || p.id), p));
          setPurchases(Array.from(combinedPurchasesMap.values()));

          setGeneralExpenses(filteredGeneral);
          return;
        }
      }
      setPurchases(savedPurchasesLocal);
    } catch (e) {
      console.warn('Error fetching expenses/purchases:', e);
      const saved = localStorage.getItem('crm_purchase_records');
      if (saved) setPurchases(JSON.parse(saved));
    }
  };

  const fetchPurchaseData = fetchExpensesAndPurchasesData;

  const fetchCapitalData = async () => {
    try {
      const savedLocal = JSON.parse(localStorage.getItem('crm_capital_records') || '[]');
      const res = await fetch(getApiEndpoint('/accounts/capital'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCapitals(data.data);
          return;
        }
      }
      setCapitals(savedLocal);
    } catch (e) {
      const saved = localStorage.getItem('crm_capital_records');
      if (saved) setCapitals(JSON.parse(saved));
    }
  };

  const fetchSuppliersData = async () => {
    try {
      const res = await fetch(getApiEndpoint('/accounts/vendors'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSuppliers(data.data);
        }
      }
    } catch (e) {
      console.warn('Error fetching vendors for financial report:', e);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchIncomeData(), fetchExpensesAndPurchasesData(), fetchCapitalData(), fetchSuppliersData()]);

      if (activeReportSubTab === 'daily') {
        const res = await getDailyReport({ date: dailyDate });
        if (res.success) setReportData(res);
      } else if (activeReportSubTab === 'monthly') {
        const res = await getMonthlyReport({ year: monthlyYear, month: monthlyMonth });
        if (res.success) setReportData(res);
      } else if (activeReportSubTab === 'total') {
        const res = await getTotalReport();
        if (res.success) setReportData(res);
      } else if (activeReportSubTab === 'category') {
        const res = await getCategoryWiseReport({ startDate, endDate });
        if (res.success) setReportData(res);
      } else if (activeReportSubTab === 'salary') {
        const res = await getSalaryReport({ month: salaryMonth });
        if (res.success) setReportData(res);
      }
    } catch (err) {
      console.error('Fetch report error:', err);
      setError('Error loading report analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReportSubTab, dailyDate, monthlyYear, monthlyMonth, startDate, endDate, salaryMonth]);

  const handlePrintReport = () => {
    window.print();
  };

  // Helper calculations for Daily Income, Purchases & Expense
  const isOwnerDrawingExpense = (e) => {
    const cat = String(e.categoryName || e.category || '').toLowerCase();
    const desc = String(e.description || '').toLowerCase();
    return cat.includes('owner drawing') || cat.includes('partner drawing') || desc.includes('[owner 1]') || desc.includes('[owner 2]');
  };
  const isPurchaseExpense = (e) => e.isPurchase || String(e.categoryName || e.category || '').toLowerCase().includes('purchase') || String(e.categoryName || e.category || '').toLowerCase().includes('inventory');
  const isSalaryExpense = (e) => e.type === 'Salary' || String(e.categoryName || e.category || '').toLowerCase() === 'salary';

  const getDailyIncomes = () => {
    if (!dailyDate || !Array.isArray(incomes)) return [];
    return incomes.filter(inc => {
      const incDate = inc.date ? new Date(inc.date).toISOString().split('T')[0] : '';
      return incDate === dailyDate;
    });
  };

  const getDailyPurchases = () => {
    if (!dailyDate || !Array.isArray(purchases)) return [];
    return purchases.filter(pur => {
      const purDate = pur.date || pur.purchaseDate ? new Date(pur.date || pur.purchaseDate).toISOString().split('T')[0] : '';
      return purDate === dailyDate;
    });
  };

  const getDailyCapitals = () => {
    if (!dailyDate || !Array.isArray(capitals)) return [];
    return capitals.filter(cap => {
      const capDate = cap.date ? new Date(cap.date).toISOString().split('T')[0] : '';
      return capDate === dailyDate;
    });
  };

  const getDailyGeneralExpenses = () => {
    if (!dailyDate || !Array.isArray(generalExpenses)) return [];
    return generalExpenses.filter(exp => {
      const expDate = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
      return expDate === dailyDate;
    });
  };

  const dayIncomesList = getDailyIncomes();
  const dayPurchasesList = getDailyPurchases();
  const dayCapitalsList = getDailyCapitals();
  const dayGenExpList = getDailyGeneralExpenses();

  const dayBackendList = Array.isArray(reportData?.data) ? reportData.data : [];
  const dayBackendPurchases = dayBackendList.filter(e => !isOwnerDrawingExpense(e) && isPurchaseExpense(e));
  const dayBackendGenExp = dayBackendList.filter(e => !isOwnerDrawingExpense(e) && !isPurchaseExpense(e) && !isSalaryExpense(e));

  const allDayPurchasesMap = new Map();
  dayPurchasesList.forEach(p => allDayPurchasesMap.set(String(p._id || p.id), p));
  dayBackendPurchases.forEach(p => allDayPurchasesMap.set(String(p._id || p.id), p));
  const dayPurchaseTotal = Array.from(allDayPurchasesMap.values()).reduce((sum, item) => sum + (Number(item.amount || item.totalAmount) || 0), 0);

  const allDayGenExpMap = new Map();
  dayGenExpList.forEach(e => allDayGenExpMap.set(String(e._id || e.id), e));
  dayBackendGenExp.forEach(e => allDayGenExpMap.set(String(e._id || e.id), e));
  const combinedDayGenExpList = Array.from(allDayGenExpMap.values());
  const dayExpenseTotal = reportData?.summary?.generalExpenseTotal !== undefined
    ? reportData.summary.generalExpenseTotal
    : combinedDayGenExpList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const getPaidIncomeAmt = (item) => {
    let paid = 0;
    if (Array.isArray(item.payments) && item.payments.length > 0) {
      paid = item.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    }
    if (paid <= 0 && typeof item.receiptAmount === 'number' && item.receiptAmount > 0) {
      paid = item.receiptAmount;
    }
    if (paid <= 0 && (item.status || item.paymentStatus || '').toLowerCase() === 'paid') {
      paid = parseFloat(item.totalAmount || item.amount || 0);
    }
    return paid;
  };

  const dayIncomeTotal = dayIncomesList.reduce((sum, item) => sum + getPaidIncomeAmt(item), 0);
  const dayCapitalTotal = dayCapitalsList.reduce((sum, item) => sum + (Number(item.totalCapital || 0) || (Number(item.amount || 0) + Number(item.openingBalance || 0))), 0);
  const dayTotalSales = dayIncomesList.reduce((sum, item) => sum + (Number(item.totalAmount || item.amount) || 0), 0);
  const dayTotalOutflow = dayExpenseTotal + dayPurchaseTotal;
  const dayNetSurplus = (dayIncomeTotal + dayCapitalTotal) - dayTotalOutflow;

  const getDailyCombinedRegister = () => {
    const combined = [];

    // 1. Day Incomes
    dayIncomesList.forEach(inc => {
      combined.push({
        _id: inc._id || inc.id,
        flowType: 'INCOME',
        date: inc.date || dailyDate,
        title: inc.title || 'Client Revenue',
        category: inc.department || 'Income',
        payee: inc.clientName || 'Client',
        paymentMode: inc.paymentMethod || 'Bank Transfer',
        amount: getPaidIncomeAmt(inc)
      });
    });

    // 2. Day Capitals
    dayCapitalsList.forEach(cap => {
      combined.push({
        _id: cap._id || cap.id,
        flowType: 'CAPITAL',
        date: cap.date || dailyDate,
        title: cap.remarks ? `Capital: ${cap.remarks}` : 'Capital Inflow',
        category: 'Capital Account',
        payee: cap.investorName || 'Investor / Contributor',
        paymentMode: cap.paymentMethod || 'Bank Transfer',
        amount: Number(cap.totalCapital || 0) || (Number(cap.amount || 0) + Number(cap.openingBalance || 0))
      });
    });

    // 3. Day Purchases
    Array.from(allDayPurchasesMap.values()).forEach(pur => {
      combined.push({
        _id: pur._id || pur.id,
        flowType: 'PURCHASE',
        date: pur.date || pur.purchaseDate || dailyDate,
        title: pur.description || pur.itemName || 'Vendor Procurement',
        category: 'Inventory & Purchase',
        payee: pur.paidTo || pur.vendorName || 'Vendor',
        paymentMode: pur.paymentMode || pur.paymentMethod || 'Bank Transfer',
        amount: Number(pur.amount || pur.totalAmount) || 0
      });
    });

    // 4. Day General Expenses
    combinedDayGenExpList.forEach(exp => {
      combined.push({
        _id: exp._id || exp.id,
        flowType: 'EXPENSE',
        date: exp.date || dailyDate,
        title: exp.title || exp.description || exp.categoryName || 'General Expense',
        category: exp.categoryName || 'General',
        payee: exp.paidTo || 'Vendor / Employee',
        paymentMode: exp.paymentMode || 'Cash',
        amount: Number(exp.amount) || 0
      });
    });

    // 5. Day Salaries
    dayBackendList.filter(e => !isOwnerDrawingExpense(e) && isSalaryExpense(e)).forEach(sal => {
      combined.push({
        _id: sal._id || sal.id,
        flowType: 'SALARY',
        date: sal.date || dailyDate,
        title: sal.description || sal.categoryName || 'Staff Wage Payment',
        category: 'Employee Payroll',
        payee: sal.paidTo || 'Staff Member',
        paymentMode: sal.paymentMode || 'Bank Transfer',
        amount: Number(sal.amount) || 0
      });
    });

    // 6. Day Owner Drawings
    dayBackendList.filter(isOwnerDrawingExpense).forEach(drw => {
      combined.push({
        _id: drw._id || drw.id,
        flowType: 'OWNER DRAWING',
        date: drw.date || dailyDate,
        title: drw.description || 'Partner Profit Withdrawal',
        category: 'Owner Profit Withdrawal',
        payee: drw.paidTo || 'Partner',
        paymentMode: drw.paymentMode || 'Bank Transfer',
        amount: Number(drw.amount) || 0
      });
    });

    return combined;
  };

  // Helper calculations for Monthly
  const getMonthlyIncomes = () => {
    if (!monthlyYear || !monthlyMonth || !Array.isArray(incomes)) return [];
    const targetPeriod = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    return incomes.filter(inc => {
      if (!inc.date) return false;
      const d = new Date(inc.date);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return period === targetPeriod;
    });
  };

  const getMonthlyPurchases = () => {
    if (!monthlyYear || !monthlyMonth || !Array.isArray(purchases)) return [];
    const targetPeriod = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    return purchases.filter(pur => {
      const purDate = pur.date || pur.purchaseDate;
      if (!purDate) return false;
      const d = new Date(purDate);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return period === targetPeriod;
    });
  };

  const getMonthlyCapitals = () => {
    if (!monthlyYear || !monthlyMonth || !Array.isArray(capitals)) return [];
    const targetPeriod = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    return capitals.filter(cap => {
      if (!cap.date) return false;
      const d = new Date(cap.date);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return period === targetPeriod;
    });
  };

  const getMonthlyGeneralExpenses = () => {
    if (!monthlyYear || !monthlyMonth || !Array.isArray(generalExpenses)) return [];
    const targetPeriod = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`;
    return generalExpenses.filter(exp => {
      if (!exp.date) return false;
      const d = new Date(exp.date);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return period === targetPeriod;
    });
  };

  const monthIncomesList = getMonthlyIncomes();
  const monthPurchasesList = getMonthlyPurchases();
  const monthCapitalsList = getMonthlyCapitals();
  const monthGenExpList = getMonthlyGeneralExpenses();

  const monthIncomeTotal = monthIncomesList.reduce((sum, item) => sum + getPaidIncomeAmt(item), 0);
  const monthCapitalTotal = monthCapitalsList.reduce((sum, item) => sum + (Number(item.totalCapital || 0) || (Number(item.amount || 0) + Number(item.openingBalance || 0))), 0);

  const backendExpList = Array.isArray(reportData?.data) ? reportData.data : [];
  const monthBackendPurchases = backendExpList.filter(e => !isOwnerDrawingExpense(e) && isPurchaseExpense(e));
  const monthBackendGenExp = backendExpList.filter(e => !isOwnerDrawingExpense(e) && !isPurchaseExpense(e) && !isSalaryExpense(e));

  const allMonthlyPurchasesMap = new Map();
  monthPurchasesList.forEach(p => allMonthlyPurchasesMap.set(String(p._id || p.id), p));
  monthBackendPurchases.forEach(p => allMonthlyPurchasesMap.set(String(p._id || p.id), p));
  const monthPurchaseTotal = Array.from(allMonthlyPurchasesMap.values()).reduce((sum, item) => sum + (Number(item.amount || item.totalAmount) || 0), 0);

  const allMonthGenExpMap = new Map();
  monthGenExpList.forEach(e => allMonthGenExpMap.set(String(e._id || e.id), e));
  monthBackendGenExp.forEach(e => allMonthGenExpMap.set(String(e._id || e.id), e));
  const combinedMonthGenExpList = Array.from(allMonthGenExpMap.values());
  const monthGeneralExpenseTotal = reportData?.summary?.generalExpenseTotal !== undefined
    ? reportData.summary.generalExpenseTotal
    : combinedMonthGenExpList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const monthTotalSales = monthIncomesList.reduce((sum, item) => sum + (Number(item.totalAmount || item.amount) || 0), 0);
  const monthTotalOutflow = monthGeneralExpenseTotal + monthPurchaseTotal;
  const monthNetProfit = (monthIncomeTotal + monthCapitalTotal) - monthTotalOutflow;

  const getMonthlyCombinedRegister = () => {
    const combined = [];
    monthIncomesList.forEach(inc => {
      combined.push({
        _id: inc._id || inc.id,
        flowType: 'INCOME',
        date: inc.date,
        title: inc.title || 'Client Revenue',
        category: inc.department || 'Income',
        payee: inc.clientName || 'Client',
        paymentMode: inc.paymentMethod || 'Bank Transfer',
        amount: getPaidIncomeAmt(inc)
      });
    });

    monthCapitalsList.forEach(cap => {
      combined.push({
        _id: cap._id || cap.id,
        flowType: 'CAPITAL',
        date: cap.date,
        title: cap.remarks ? `Capital: ${cap.remarks}` : 'Capital Account Inflow',
        category: 'Capital Account',
        payee: cap.investorName || 'Investor / Contributor',
        paymentMode: cap.paymentMethod || 'Bank Transfer',
        amount: Number(cap.totalCapital || 0) || (Number(cap.amount || 0) + Number(cap.openingBalance || 0))
      });
    });

    Array.from(allMonthlyPurchasesMap.values()).forEach(pur => {
      combined.push({
        _id: pur._id || pur.id,
        flowType: 'PURCHASE',
        date: pur.date || pur.purchaseDate,
        title: pur.description || pur.itemName || 'Vendor Procurement',
        category: 'Inventory & Purchase',
        payee: pur.paidTo || pur.vendorName || 'Vendor',
        paymentMode: pur.paymentMode || pur.paymentMethod || 'Bank Transfer',
        amount: Number(pur.amount || pur.totalAmount) || 0
      });
    });

    combinedMonthGenExpList.forEach(exp => {
      combined.push({
        _id: exp._id || exp.id,
        flowType: 'EXPENSE',
        date: exp.date,
        title: exp.title || exp.description || exp.categoryName || 'General Expense',
        category: exp.categoryName || 'General',
        payee: exp.paidTo || 'Vendor / Employee',
        paymentMode: exp.paymentMode || 'Cash',
        amount: Number(exp.amount) || 0
      });
    });

    backendExpList.filter(e => !isOwnerDrawingExpense(e) && isSalaryExpense(e)).forEach(sal => {
      combined.push({
        _id: sal._id || sal.id,
        flowType: 'SALARY',
        date: sal.date,
        title: sal.description || sal.categoryName || 'Staff Wage Payment',
        category: 'Employee Payroll',
        payee: sal.paidTo || 'Staff Member',
        paymentMode: sal.paymentMode || 'Bank Transfer',
        amount: Number(sal.amount) || 0
      });
    });

    backendExpList.filter(isOwnerDrawingExpense).forEach(drw => {
      combined.push({
        _id: drw._id || drw.id,
        flowType: 'OWNER DRAWING',
        date: drw.date,
        title: drw.description || 'Partner Profit Withdrawal',
        category: 'Owner Profit Withdrawal',
        payee: drw.paidTo || 'Partner',
        paymentMode: drw.paymentMode || 'Bank Transfer',
        amount: Number(drw.amount) || 0
      });
    });

    return combined;
  };

  const getTotalCombinedRegister = () => {
    const combined = [];

    (incomes || []).forEach(inc => {
      combined.push({
        _id: inc._id || inc.id,
        flowType: 'INCOME',
        date: inc.date,
        title: inc.title || 'Client Revenue',
        category: inc.department || 'Income',
        payee: inc.clientName || 'Client',
        paymentMode: inc.paymentMethod || 'Bank Transfer',
        amount: getPaidIncomeAmt(inc)
      });
    });

    (capitals || []).forEach(cap => {
      combined.push({
        _id: cap._id || cap.id,
        flowType: 'CAPITAL',
        date: cap.date,
        title: cap.remarks ? `Capital: ${cap.remarks}` : 'Capital Account Inflow',
        category: 'Capital Account',
        payee: cap.investorName || 'Investor / Contributor',
        paymentMode: cap.paymentMethod || 'Bank Transfer',
        amount: Number(cap.totalCapital || 0) || (Number(cap.amount || 0) + Number(cap.openingBalance || 0))
      });
    });

    const backendItems = Array.isArray(reportData?.data) ? reportData.data : [];
    const addedIds = new Set();

    backendItems.forEach(exp => {
      addedIds.add(String(exp._id));
      const cat = String(exp.categoryName || '').toLowerCase();
      const desc = String(exp.description || '').toLowerCase();
      const isOwnerDrawing = cat.includes('owner drawing') || cat.includes('partner drawing') || desc.includes('[owner 1]') || desc.includes('[owner 2]');
      const isPur = exp.isPurchase || cat.includes('purchase') || cat.includes('inventory');
      const isSalary = exp.type === 'Salary' || cat === 'salary';

      let flowType = 'EXPENSE';
      let displayCat = exp.categoryName || 'General';

      if (isOwnerDrawing) {
        flowType = 'OWNER DRAWING';
        displayCat = 'Owner Profit Withdrawal';
      } else if (isPur) {
        flowType = 'PURCHASE';
        displayCat = 'Inventory & Purchase';
      } else if (isSalary) {
        flowType = 'SALARY';
        displayCat = 'Employee Payroll';
      }

      combined.push({
        _id: exp._id,
        flowType,
        date: exp.date,
        title: exp.title || exp.description || exp.categoryName || flowType,
        category: displayCat,
        payee: exp.paidTo || (isOwnerDrawing ? 'Partner' : 'Payee'),
        paymentMode: exp.paymentMode || 'Cash',
        amount: exp.amount || 0
      });
    });

    (purchases || []).forEach(pur => {
      const pId = String(pur._id || pur.id);
      if (!addedIds.has(pId)) {
        addedIds.add(pId);
        combined.push({
          _id: pId,
          flowType: 'PURCHASE',
          date: pur.date || pur.purchaseDate,
          title: pur.description || pur.itemName || 'Vendor Procurement',
          category: 'Inventory & Purchase',
          payee: pur.paidTo || pur.vendorName || 'Vendor',
          paymentMode: pur.paymentMode || pur.paymentMethod || 'Bank Transfer',
          amount: Number(pur.amount || pur.totalAmount) || 0
        });
      }
    });

    return combined;
  };

  const filteredGeneralExpenses = generalExpenses.filter(e => {
    const q = expenseSearchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (e.categoryName || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.paidTo || '').toLowerCase().includes(q) ||
      (e.paymentMode || '').toLowerCase().includes(q);
    const matchesCategory = expenseCategoryFilter === 'ALL' || (e.categoryName || 'General') === expenseCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const applyFilterAndSort = (items) => {
    let result = [...items];

    if (flowFilter && flowFilter !== 'ALL') {
      result = result.filter(item => item.flowType === flowFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        (item.title || '').toLowerCase().includes(q) ||
        (item.payee || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.paymentMode || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'amount-desc') {
        return (b.amount || 0) - (a.amount || 0);
      }
      if (sortBy === 'amount-asc') {
        return (a.amount || 0) - (b.amount || 0);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date || 0) - new Date(b.date || 0);
      }
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    return result;
  };

  const dayRawList = getDailyCombinedRegister();
  const dayCombinedList = applyFilterAndSort(dayRawList);

  const monthRawList = getMonthlyCombinedRegister();
  const monthCombinedList = applyFilterAndSort(monthRawList);

  const totalRawList = getTotalCombinedRegister();
  const totalCombinedList = applyFilterAndSort(totalRawList);

  const computedSupplierCredit = (reportData?.summary?.supplierCreditTotal !== undefined && Number(reportData.summary.supplierCreditTotal) > 0)
    ? Number(reportData.summary.supplierCreditTotal)
    : (suppliers || []).reduce((sum, s) => sum + Math.max(0, Number(s.creditBalance || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Profit & Loss Statement (P&L Analytics)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consolidated statement of Sales, Income Receipts, Vendor Procurement Purchases, Operational Expenses, and Net Profit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
          >
            <ArrowDownToLine size={14} />
            <span>Print / Export PDF</span>
          </button>
          <button
            onClick={fetchReport}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Refresh Financial Report"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Report Sub-tab Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <button
          onClick={() => setActiveReportSubTab('daily')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportSubTab === 'daily'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar size={15} />
          <span>Daily Ledger</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('monthly')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportSubTab === 'monthly'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 size={15} />
          <span>Monthly P&L</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('total')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportSubTab === 'total'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp size={15} />
          <span>Total P&L</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('expense')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportSubTab === 'expense'
              ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Receipt size={15} />
          <span>General Expenses</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('purchase')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportSubTab === 'purchase'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingCart size={15} />
          <span>Purchase Register</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('category')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportSubTab === 'category'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <PieChart size={15} />
          <span>Categories</span>
        </button>

        <button
          onClick={() => setActiveReportSubTab('salary')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeReportSubTab === 'salary'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign size={15} />
          <span>Salary Report</span>
        </button>
      </div>

      {/* ── REPORT CONTENT PANEL ── */}

      {/* 1. DAILY FINANCIAL LEDGER (INCOME + EXPENSES) */}
      {activeReportSubTab === 'daily' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Daily Financial Ledger
              </h3>
              <p className="text-xs text-slate-400">Consolidated day-wise view of income receipts and expense outflows.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Date:</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-medium cursor-pointer"
              />
              <ExcelExportButton
                data={(dayCombinedList || []).map(t => ({
                  'Date': t.date ? new Date(t.date).toISOString().split('T')[0] : dailyDate,
                  'Flow Type': t.flowType || '',
                  'Title / Description': t.title || '',
                  'Category / Dept': t.category || '',
                  'Payee / Recipient / Client': t.payee || '',
                  'Payment Mode': t.paymentMode || '',
                  'Amount (₹)': Number(t.amount || 0)
                }))}
                fileName={`Daily_Financial_Ledger_${dailyDate}`}
                sheetName="DailyReport"
                title="Export Excel"
              />
            </div>
          </div>

          {/* Comprehensive Responsive Profit & Loss Metric Cards for Daily View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-9 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Sales (Billed)">Total Sales (Billed)</p>
                <DollarSign size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-blue-600 dark:text-blue-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.totalBilledIncome !== undefined ? reportData.summary.totalBilledIncome : dayTotalSales).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.totalBilledIncome !== undefined ? reportData.summary.totalBilledIncome : dayTotalSales).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Total Invoiced Sales">Total Invoiced Sales</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Income Received">Total Income Received</p>
                <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono min-w-0 truncate" title={`+₹${((reportData?.summary?.incomeOpeningBalance || 0) + dayIncomeTotal).toLocaleString('en-IN')}`}>
                +₹{((reportData?.summary?.incomeOpeningBalance || 0) + dayIncomeTotal).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title={`Inc. OB ₹${(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}`}>Inc. OB ₹{(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Capital Account">Capital Account</p>
                <Coins size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 font-mono min-w-0 truncate" title={`+₹${dayCapitalTotal.toLocaleString('en-IN')}`}>
                +₹{dayCapitalTotal.toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Capital Inflow">Capital Inflow</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Purchases">Total Purchases</p>
                <ShoppingCart size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.purchaseTotal !== undefined ? reportData.summary.purchaseTotal : purchases.filter(p => (p.date ? new Date(p.date).toISOString().split('T')[0] : '') === dailyDate).reduce((s, p) => s + (Number(p.amount || p.totalAmount) || 0), 0)).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.purchaseTotal !== undefined ? reportData.summary.purchaseTotal : purchases.filter(p => (p.date ? new Date(p.date).toISOString().split('T')[0] : '') === dailyDate).reduce((s, p) => s + (Number(p.amount || p.totalAmount) || 0), 0)).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Vendor Procurement">Vendor Procurement</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="General Expenses">General Expenses</p>
                <TrendingDown size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-purple-600 dark:text-purple-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.generalExpenseTotal !== undefined ? reportData.summary.generalExpenseTotal : dayExpenseTotal).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.generalExpenseTotal !== undefined ? reportData.summary.generalExpenseTotal : dayExpenseTotal).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Ops & Utilities Outflow">Ops & Utilities Outflow</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Income Opening">Income Opening</p>
                <Coins size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="As of Day Start">As of Day Start</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Expense Opening">Expense Opening</p>
                <TrendingDown size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-rose-600 dark:text-rose-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.expenseOpeningBalance || 0).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.expenseOpeningBalance || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="As of Day Start">As of Day Start</p>
            </div>

            <div className={`bg-white dark:bg-slate-900 border ${dayNetSurplus >= 0 ? 'border-indigo-500/20 dark:border-indigo-500/30' : 'border-amber-500/20 dark:border-amber-500/30'} rounded-2xl p-3.5 shadow-2xs min-w-0`}>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Period Net Profit">Period Net Profit</p>
                <Coins size={16} className={`${dayNetSurplus >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"} shrink-0`} />
              </div>
              <h4 className={`text-base font-black mt-1 font-mono min-w-0 truncate ${dayNetSurplus >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`} title={`${dayNetSurplus >= 0 ? '+' : ''}₹${dayNetSurplus.toLocaleString('en-IN')}`}>
                {dayNetSurplus >= 0 ? '+' : ''}₹{dayNetSurplus.toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title={dayNetSurplus >= 0 ? 'Period Surplus' : 'Period Deficit'}>{dayNetSurplus >= 0 ? 'Period Surplus' : 'Period Deficit'}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-indigo-500/20 dark:border-indigo-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Closing Net Balance">Closing Net Balance</p>
                <Wallet size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono min-w-0 truncate" title={`₹${(((reportData?.summary?.incomeOpeningBalance || 0) + dayIncomeTotal + dayCapitalTotal) - ((reportData?.summary?.expenseOpeningBalance || 0) + dayTotalOutflow)).toLocaleString('en-IN')}`}>
                ₹{(((reportData?.summary?.incomeOpeningBalance || 0) + dayIncomeTotal + dayCapitalTotal) - ((reportData?.summary?.expenseOpeningBalance || 0) + dayTotalOutflow)).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Effective Closing">Effective Closing</p>
            </div>
          </div>

          {/* Filter & Sort Controls Toolbar for Daily View */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search daily transactions by title, payee, category, payment mode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter size={13} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500">Flow:</span>
                <select
                  value={flowFilter}
                  onChange={(e) => setFlowFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="ALL">All Flows</option>
                  <option value="INCOME">Income Inflow (+)</option>
                  <option value="CAPITAL">Capital Inflow (+)</option>
                  <option value="EXPENSE">General Expense (-)</option>
                  <option value="PURCHASE">Vendor Purchase (-)</option>
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

          {/* Consolidated Daily Financial Transactions Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consolidated Daily Ledger (All Inflows & Outflows)</h4>
              <span className="text-[10px] font-bold text-slate-400">{dailyDate}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Flow</th>
                    <th className="py-2.5 px-3">Title / Source / Category</th>
                    <th className="py-2.5 px-3">Client / Payee</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading daily financial ledger...</td></tr>
                  ) : dayCombinedList.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">No matching income, capital, expense, or purchase transactions found for this date.</td></tr>
                  ) : (
                    dayCombinedList.map((item) => {
                      const isIncome = item.flowType === 'INCOME';
                      const isCapital = item.flowType === 'CAPITAL';
                      const isPurchase = item.flowType === 'PURCHASE';
                      return (
                        <tr
                          key={item._id}
                          className={
                            isIncome
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                              : isCapital
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : isPurchase
                              ? 'bg-purple-50/30 dark:bg-purple-950/10'
                              : 'bg-rose-50/20 dark:bg-rose-950/10'
                          }
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isIncome
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isCapital
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : isPurchase
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {item.flowType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="block text-slate-900 dark:text-slate-100">{item.title}</strong>
                            <span className="text-[10px] text-slate-400">{item.category}</span>
                          </td>
                          <td className="py-3 px-3">{item.payee}</td>
                          <td className="py-3 px-3">{item.paymentMode}</td>
                          <td
                            className={`py-3 px-3 text-right font-bold font-mono ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isCapital
                                ? 'text-amber-600 dark:text-amber-400'
                                : isPurchase
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome || isCapital ? '+' : '-'}₹{(item.amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MONTHLY FINANCIAL SUMMARY (INCOME VS EXPENSE) */}
      {activeReportSubTab === 'monthly' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Monthly Income & Expense Summary
              </h3>
              <p className="text-xs text-slate-400">Monthly financial overview of revenues, expenses & net operating profit.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold cursor-pointer"
              >
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comprehensive Responsive Monthly Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-9 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Sales (Billed)">Total Sales (Billed)</p>
                <DollarSign size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-blue-600 dark:text-blue-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.totalBilledIncome !== undefined ? reportData.summary.totalBilledIncome : monthTotalSales).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.totalBilledIncome !== undefined ? reportData.summary.totalBilledIncome : monthTotalSales).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Total Invoiced Sales">Total Invoiced Sales</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Income Received">Total Income Received</p>
                <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono min-w-0 truncate" title={`+₹${((reportData?.summary?.incomeOpeningBalance || 0) + monthIncomeTotal).toLocaleString('en-IN')}`}>
                +₹{((reportData?.summary?.incomeOpeningBalance || 0) + monthIncomeTotal).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title={`Inc. OB ₹${(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}`}>Inc. OB ₹{(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Capital Account">Capital Account</p>
                <Coins size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 font-mono min-w-0 truncate" title={`+₹${monthCapitalTotal.toLocaleString('en-IN')}`}>
                +₹{monthCapitalTotal.toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Monthly Equity Capital">Monthly Equity Capital</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Purchases">Total Purchases</p>
                <ShoppingCart size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.purchaseTotal !== undefined ? reportData.summary.purchaseTotal : monthPurchaseTotal).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.purchaseTotal !== undefined ? reportData.summary.purchaseTotal : monthPurchaseTotal).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Vendor Procurement">Vendor Procurement</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="General Expenses">General Expenses</p>
                <TrendingDown size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-purple-600 dark:text-purple-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.generalExpenseTotal !== undefined ? reportData.summary.generalExpenseTotal : monthGeneralExpenseTotal).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.generalExpenseTotal !== undefined ? reportData.summary.generalExpenseTotal : monthGeneralExpenseTotal).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Ops & Utilities Outflow">Ops & Utilities Outflow</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Income Opening">Income Opening</p>
                <Coins size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="As of Month Start">As of Month Start</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Expense Opening">Expense Opening</p>
                <TrendingDown size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-rose-600 dark:text-rose-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.expenseOpeningBalance || 0).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.expenseOpeningBalance || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="As of Month Start">As of Month Start</p>
            </div>

            <div className={`bg-white dark:bg-slate-900 border ${monthNetProfit >= 0 ? 'border-indigo-500/20 dark:border-indigo-500/30' : 'border-amber-500/20 dark:border-amber-500/30'} rounded-2xl p-3.5 shadow-2xs min-w-0`}>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Period Net Profit">Period Net Profit</p>
                <Coins size={16} className={`${monthNetProfit >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"} shrink-0`} />
              </div>
              <h4 className={`text-base font-black mt-1 font-mono min-w-0 truncate ${monthNetProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`} title={`${monthNetProfit >= 0 ? '+' : ''}₹${monthNetProfit.toLocaleString('en-IN')}`}>
                {monthNetProfit >= 0 ? '+' : ''}₹{monthNetProfit.toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title={monthNetProfit >= 0 ? 'Monthly Net Profit' : 'Monthly Deficit'}>{monthNetProfit >= 0 ? 'Monthly Net Profit' : 'Monthly Deficit'}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-indigo-500/20 dark:border-indigo-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Closing Net Balance">Closing Net Balance</p>
                <Wallet size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono min-w-0 truncate" title={`₹${(((reportData?.summary?.incomeOpeningBalance || 0) + monthIncomeTotal + monthCapitalTotal) - ((reportData?.summary?.expenseOpeningBalance || 0) + monthTotalOutflow)).toLocaleString('en-IN')}`}>
                ₹{(((reportData?.summary?.incomeOpeningBalance || 0) + monthIncomeTotal + monthCapitalTotal) - ((reportData?.summary?.expenseOpeningBalance || 0) + monthTotalOutflow)).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Effective Closing">Effective Closing</p>
            </div>
          </div>

          {/* Filter & Sort Controls Toolbar for Monthly View */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search monthly transactions by title, payee, category, payment mode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter size={13} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500">Flow:</span>
                <select
                  value={flowFilter}
                  onChange={(e) => setFlowFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="ALL">All Flows</option>
                  <option value="INCOME">Income Inflow (+)</option>
                  <option value="CAPITAL">Capital Inflow (+)</option>
                  <option value="EXPENSE">General Expense (-)</option>
                  <option value="PURCHASE">Vendor Purchase (-)</option>
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

          {/* Monthly Consolidated Register */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Consolidated Register (All Inflows & Outflows)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Flow</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category / Title</th>
                    <th className="py-2.5 px-3">Client / Payee</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading monthly financial register...</td></tr>
                  ) : monthCombinedList.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">No financial transactions recorded for this month.</td></tr>
                  ) : (
                    monthCombinedList.map((item) => {
                      const isIncome = item.flowType === 'INCOME';
                      const isCapital = item.flowType === 'CAPITAL';
                      const isPurchase = item.flowType === 'PURCHASE';
                      return (
                        <tr
                          key={item._id}
                          className={
                            isIncome
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                              : isCapital
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : isPurchase
                              ? 'bg-purple-50/30 dark:bg-purple-950/10'
                              : 'bg-rose-50/20 dark:bg-rose-950/10'
                          }
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isIncome
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isCapital
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : isPurchase
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {item.flowType}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {item.title}
                            <span className="block text-[10px] text-slate-400 font-normal">{item.category}</span>
                          </td>
                          <td className="py-3 px-3">{item.payee}</td>
                          <td
                            className={`py-3 px-3 text-right font-mono font-black ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isCapital
                                ? 'text-amber-600 dark:text-amber-400'
                                : isPurchase
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome || isCapital ? '+' : '-'}₹{(item.amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2.5 TOTAL PROFIT AND LOSS STATEMENT (LIFETIME P&L) */}
      {activeReportSubTab === 'total' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Lifetime Total Profit & Loss Statement
              </h3>
              <p className="text-xs text-slate-400">
                Cumulative financial overview of revenues, capital inflows, procurement purchases, operational expenses, owner share drawings & supplier credit liabilities.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExcelExportButton
                data={totalCombinedList.map(item => ({
                  Flow: item.flowType,
                  Date: item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'N/A',
                  'Category / Title': item.title,
                  Category: item.category,
                  'Client / Payee / Vendor': item.payee,
                  'Payment Mode': item.paymentMode,
                  'Amount (₹)': ((item.flowType === 'INCOME' || item.flowType === 'CAPITAL') ? '+' : '-') + (item.amount || 0)
                }))}
                filename="Total_Lifetime_Profit_and_Loss_Statement"
                buttonText="Export Statement (.xlsx)"
              />
            </div>
          </div>

          {/* Comprehensive Lifetime Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* 1. Total Sales (Billed) */}
            <div className="bg-white dark:bg-slate-900 border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Sales (Billed)">Total Sales (Billed)</p>
                <DollarSign size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-blue-600 dark:text-blue-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.totalBilledIncome || 0).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.totalBilledIncome || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Total Invoiced Revenue">Total Invoiced Revenue</p>
            </div>

            {/* 2. Total Income Received */}
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Income Received">Total Income Received</p>
                <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono min-w-0 truncate" title={`+₹${((reportData?.summary?.incomeOpeningBalance || 0) + (reportData?.summary?.totalIncome || 0)).toLocaleString('en-IN')}`}>
                +₹{((reportData?.summary?.incomeOpeningBalance || 0) + (reportData?.summary?.totalIncome || 0)).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title={`Inc. OB ₹${(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}`}>Inc. OB ₹{(reportData?.summary?.incomeOpeningBalance || 0).toLocaleString('en-IN')}</p>
            </div>

            {/* 3. Total Capital Inflow */}
            <div className="bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Capital Inflow">Capital Account</p>
                <Coins size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 font-mono min-w-0 truncate" title={`+₹${(reportData?.summary?.totalCapital || 0).toLocaleString('en-IN')}`}>
                +₹{(reportData?.summary?.totalCapital || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Owner Equity Infusion">Owner Equity Infusion</p>
            </div>

            {/* 4. Total Purchases */}
            <div className="bg-white dark:bg-slate-900 border border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Purchases">Total Purchases</p>
                <ShoppingCart size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-purple-600 dark:text-purple-400 mt-1 font-mono min-w-0 truncate" title={`-₹${(reportData?.summary?.purchaseTotal || 0).toLocaleString('en-IN')}`}>
                -₹{(reportData?.summary?.purchaseTotal || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Vendor Inventory Procurement">Vendor Inventory Procurement</p>
            </div>

            {/* 5. Outstanding Supplier Credit */}
            <div className="bg-white dark:bg-slate-900 border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Supplier Credit (Payable)">Supplier Credit (Payable)</p>
                <CreditCard size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-rose-600 dark:text-rose-400 mt-1 font-mono min-w-0 truncate" title={`₹${computedSupplierCredit.toLocaleString('en-IN')}`}>
                ₹{computedSupplierCredit.toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Unsettled Accounts Payable">Unsettled Accounts Payable</p>
            </div>

            {/* 6. General Expenses */}
            <div className="bg-white dark:bg-slate-900 border border-orange-500/20 dark:border-orange-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="General Expenses">General Expenses</p>
                <TrendingDown size={16} className="text-orange-600 dark:text-orange-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-orange-600 dark:text-orange-400 mt-1 font-mono min-w-0 truncate" title={`-₹${(reportData?.summary?.generalExpenseTotal || 0).toLocaleString('en-IN')}`}>
                -₹{(reportData?.summary?.generalExpenseTotal || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Utilities, Rent & Ops">Utilities, Rent & Ops</p>
            </div>

            {/* 7. Total Salaries */}
            <div className="bg-white dark:bg-slate-900 border border-indigo-500/20 dark:border-indigo-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Total Salaries Paid">Total Salaries Paid</p>
                <Users size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono min-w-0 truncate" title={`-₹${(reportData?.summary?.salaryTotal || 0).toLocaleString('en-IN')}`}>
                -₹{(reportData?.summary?.salaryTotal || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Employee Payroll Payouts">Employee Payroll Payouts</p>
            </div>

            {/* 8. Owner Share Deductions (Drawings) */}
            <div className="bg-white dark:bg-slate-900 border border-cyan-500/20 dark:border-cyan-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Owner Share Drawings">Owner Profit Withdrawn</p>
                <DollarSign size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-cyan-600 dark:text-cyan-400 mt-1 font-mono min-w-0 truncate" title={`-₹${(reportData?.summary?.totalOwnerDrawings || 0).toLocaleString('en-IN')}`}>
                -₹{(reportData?.summary?.totalOwnerDrawings || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title="Partner Share Drawings">Partner Share Drawings</p>
            </div>

            {/* 9. Operating Net Profit / Loss */}
            <div className={`bg-white dark:bg-slate-900 border ${(reportData?.summary?.operatingNetProfit || 0) >= 0 ? 'border-emerald-500/20 dark:border-emerald-500/30' : 'border-rose-500/20 dark:border-rose-500/30'} rounded-2xl p-3.5 shadow-2xs min-w-0`}>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Operating Net Profit">Operating Net Profit</p>
                <TrendingUp size={16} className={`${(reportData?.summary?.operatingNetProfit || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} shrink-0`} />
              </div>
              <h4 className={`text-base font-black mt-1 font-mono min-w-0 truncate ${(reportData?.summary?.operatingNetProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} title={`${(reportData?.summary?.operatingNetProfit || 0) >= 0 ? '+' : ''}₹${(reportData?.summary?.operatingNetProfit || 0).toLocaleString('en-IN')}`}>
                {(reportData?.summary?.operatingNetProfit || 0) >= 0 ? '+' : ''}₹{(reportData?.summary?.operatingNetProfit || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title={(reportData?.summary?.operatingNetProfit || 0) >= 0 ? 'Lifetime Operating Surplus' : 'Lifetime Operating Deficit'}>
                {(reportData?.summary?.operatingNetProfit || 0) >= 0 ? 'Lifetime Operating Surplus' : 'Lifetime Operating Deficit'}
              </p>
            </div>

            {/* 10. Retained Surplus & True Net Position */}
            <div className="bg-white dark:bg-slate-900 border border-indigo-500/20 dark:border-indigo-500/30 rounded-2xl p-3.5 shadow-2xs min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 truncate" title="Retained Closing Balance">Retained Closing Balance</p>
                <Wallet size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
              <h4 className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono min-w-0 truncate" title={`₹${(reportData?.summary?.closingBalance || 0).toLocaleString('en-IN')}`}>
                ₹{(reportData?.summary?.closingBalance || 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 min-w-0 truncate" title={`After Supplier Credit: ₹${((reportData?.summary?.closingBalance || 0) - computedSupplierCredit).toLocaleString('en-IN')}`}>
                True Liquid: ₹{((reportData?.summary?.closingBalance || 0) - computedSupplierCredit).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Filter & Sort Controls Toolbar for Total View */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search lifetime transactions by title, payee, category, payment mode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter size={13} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500">Flow:</span>
                <select
                  value={flowFilter}
                  onChange={(e) => setFlowFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="ALL">All Flows</option>
                  <option value="INCOME">Income Inflow (+)</option>
                  <option value="CAPITAL">Capital Inflow (+)</option>
                  <option value="PURCHASE">Vendor Purchase (-)</option>
                  <option value="EXPENSE">General Expense (-)</option>
                  <option value="SALARY">Employee Salary (-)</option>
                  <option value="OWNER DRAWING">Owner Drawing (-)</option>
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

          {/* Lifetime Consolidated Register Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lifetime Consolidated Financial Register</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Flow</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category / Title</th>
                    <th className="py-2.5 px-3">Client / Payee / Vendor / Partner</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {loading ? (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading lifetime financial register...</td></tr>
                  ) : totalCombinedList.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400">No financial transactions recorded in the lifetime register.</td></tr>
                  ) : (
                    totalCombinedList.map((item) => {
                      const isIncome = item.flowType === 'INCOME';
                      const isCapital = item.flowType === 'CAPITAL';
                      const isPurchase = item.flowType === 'PURCHASE';
                      const isSalary = item.flowType === 'SALARY';
                      const isOwnerDrawing = item.flowType === 'OWNER DRAWING';

                      return (
                        <tr
                          key={item._id}
                          className={
                            isIncome
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                              : isCapital
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : isPurchase
                              ? 'bg-purple-50/30 dark:bg-purple-950/10'
                              : isSalary
                              ? 'bg-indigo-50/30 dark:bg-indigo-950/10'
                              : isOwnerDrawing
                              ? 'bg-cyan-50/30 dark:bg-cyan-950/10'
                              : 'bg-rose-50/20 dark:bg-rose-950/10'
                          }
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isIncome
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isCapital
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : isPurchase
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                  : isSalary
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  : isOwnerDrawing
                                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {item.flowType}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {item.title}
                            <span className="block text-[10px] text-slate-400 font-normal">{item.category}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{item.payee}</td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{item.paymentMode || 'Cash'}</td>
                          <td
                            className={`py-3 px-3 text-right font-mono font-black whitespace-nowrap ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isCapital
                                ? 'text-amber-600 dark:text-amber-400'
                                : isPurchase
                                ? 'text-purple-600 dark:text-purple-400'
                                : isSalary
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : isOwnerDrawing
                                ? 'text-cyan-600 dark:text-cyan-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome || isCapital ? '+' : '-'}₹{(item.amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GENERAL OPERATING EXPENSES REGISTER */}
      {activeReportSubTab === 'expense' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                General Operating Expenses Register
              </h3>
              <p className="text-xs text-slate-400">Statement of site overheads, utilities, travel, refreshments, rent, stationery, and maintenance.</p>
            </div>
            <div className="flex items-center gap-2">
              <ExcelExportButton
                data={filteredGeneralExpenses.map(e => ({
                  Date: e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—',
                  Category: e.categoryName || 'General',
                  Description: e.description || '—',
                  PaidTo: e.paidTo || '—',
                  PaymentMode: e.paymentMode || 'Cash',
                  Status: e.status || 'APPROVED',
                  Amount: Number(e.amount) || 0
                }))}
                fileName={`general_expenses_${new Date().toISOString().split('T')[0]}`}
                title="Export General Expenses"
              />
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 border border-orange-200 dark:border-orange-800">
                {filteredGeneralExpenses.length} General Vouchers
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-orange-500/20 dark:border-orange-500/30 rounded-2xl p-4 shadow-2xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Total General Outflows</p>
              <h4 className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1 font-mono">
                ₹{generalExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{generalExpenses.length} Total Operating Vouchers</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Active Expense Categories</p>
              <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {new Set(generalExpenses.map(e => e.categoryName || 'General')).size}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Rent, Travel, Refreshments, Stationery, etc.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-4 shadow-2xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Average Expense Per Voucher</p>
              <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                ₹{Math.round(generalExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) / (generalExpenses.length || 1)).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Mean Operating Cost</p>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search description, payee, ref..."
                value={expenseSearchQuery}
                onChange={(e) => setExpenseSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={14} className="text-slate-400" />
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {Array.from(new Set(generalExpenses.map(e => e.categoryName || 'General'))).sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">General Expense Audit Table</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description / Remarks</th>
                    <th className="py-2.5 px-3">Paid To / Payee</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredGeneralExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No general operating expense vouchers found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredGeneralExpenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono">
                          {exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                          <span className="px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60">
                            {exp.categoryName || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-[240px] truncate">
                          {exp.description || '—'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {exp.paidTo || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {exp.paymentMode || 'Cash'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {exp.status || 'APPROVED'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-orange-600 dark:text-orange-400 whitespace-nowrap">
                          - ₹{(Number(exp.amount) || 0).toLocaleString('en-IN')}
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

      {/* 3. PURCHASE PROCUREMENT REGISTER */}
      {activeReportSubTab === 'purchase' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Purchase & Procurement Register
              </h3>
              <p className="text-xs text-slate-400">Statement of vendor bills, inventory procurement, and purchase orders.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200 dark:border-purple-800">
                {purchases.length} Procurement Entries
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-purple-500/20 dark:border-purple-500/30 rounded-2xl p-4 shadow-2xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Total Procurement Outflow</p>
              <h4 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
                ₹{purchases.reduce((sum, p) => sum + (Number(p.amount || p.totalAmount) || 0), 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Inventory & Vendor Orders</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4 shadow-2xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Approved Vendor Bills</p>
              <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                ₹{purchases.filter(p => p.status === 'APPROVED' || p.status === 'Paid').reduce((sum, p) => sum + (Number(p.amount || p.totalAmount) || 0), 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Settled Accounts Payable</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-4 shadow-2xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Pending Vendor Bills</p>
              <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                ₹{purchases.filter(p => p.status !== 'APPROVED' && p.status !== 'Paid').reduce((sum, p) => sum + (Number(p.amount || p.totalAmount) || 0), 0).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Unsettled / Approval Pending</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Procurement Purchase Ledger</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Bill / PO Ref</th>
                    <th className="py-2.5 px-3">Vendor Name</th>
                    <th className="py-2.5 px-3">Item / Service Description</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {purchases.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400">No purchase procurement records found.</td></tr>
                  ) : (
                    purchases.map((pur) => (
                      <tr key={pur._id || pur.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(pur.date || pur.purchaseDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {pur.billNo || pur.referenceNo || 'PO-PUR-001'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {pur.paidTo || pur.vendorName || 'Vendor'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {pur.description || pur.itemName || 'Goods / Procurement'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {pur.paymentMode || pur.paymentMethod || 'Bank Transfer'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pur.status === 'APPROVED' || pur.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}>
                            {pur.status || 'APPROVED'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                          - ₹{(Number(pur.amount || pur.totalAmount) || 0).toLocaleString('en-IN')}
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

      {/* 3. CATEGORY & REVENUE BREAKDOWN */}
      {activeReportSubTab === 'category' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Category & Revenue Distribution</h3>
              <p className="text-xs text-slate-400">Percentage distribution & breakdown across categories.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs cursor-pointer"
                placeholder="Start Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs cursor-pointer"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Grand Financial Totals Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Total Revenue Inflows</p>
                <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  ₹{incomes.reduce((sum, i) => sum + (Number(i.receiptAmount || i.totalAmount || i.amount) || 0), 0).toLocaleString('en-IN')}
                </h4>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                {incomes.length} Income Receipts
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Total Expense Outflows</p>
                <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                  ₹{(reportData?.summary?.grandTotal || 0).toLocaleString('en-IN')}
                </h4>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                {reportData?.summary?.categoryCount || 0} Categories Active
              </span>
            </div>
          </div>

          {/* Expense Category Progress Bars */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expense Category Breakdown</h4>
            {loading ? (
              <p className="text-center py-6 text-slate-400 text-xs">Loading category breakdown...</p>
            ) : !reportData?.data || reportData.data.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">No expense category data found.</p>
            ) : (
              reportData.data.map((cat, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{cat.category}</span>
                      {Number(cat.openingBalance || 0) > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-medium">
                          OB: ₹{Number(cat.openingBalance).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 font-semibold font-mono">
                      ₹{(cat.totalAmount || 0).toLocaleString('en-IN')} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. SALARY REPORT */}
      {activeReportSubTab === 'salary' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Employee Salary Disbursement Report</h3>
              <p className="text-xs text-slate-400">Total salaries paid across employees & payroll records.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter Month (e.g. August 2026)"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">Total Disbursed Salary</p>
              <h4 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
                ₹{(reportData?.summary?.totalPaid || 0).toLocaleString('en-IN')}
              </h4>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-semibold">Total Salary Records Processed</p>
              <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {reportData?.summary?.employeeCount || 0}
              </h4>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Salary Disbursal Audit Table</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-y border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Net Paid Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading salary report...</td></tr>
                  ) : !reportData?.data || reportData.data.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">No salary payment records found.</td></tr>
                  ) : (
                    reportData.data.map((p) => {
                      const netPaid = p.paidAmount !== undefined ? p.paidAmount : (p.customNetPay !== undefined ? p.customNetPay : p.basicSalary);
                      return (
                        <tr key={p._id}>
                          <td className="py-3 px-3 font-medium">{new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{p.employeeName || p.employee?.name}</td>
                          <td className="py-3 px-3">{p.month}</td>
                          <td className="py-3 px-3">{p.paymentMode}</td>
                          <td className="py-3 px-3 text-right font-bold text-purple-600 dark:text-purple-400 font-mono">₹{Number(netPaid || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseReportsTab;
