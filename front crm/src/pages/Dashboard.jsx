import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Target, 
  Zap, 
  ListChecks, 
  Timer, 
  Activity, 
  ChevronRight, 
  Loader2,
  LayoutDashboard,
  Users,
  TrendingUp,
  Building,
  ListTodo,
  Shield,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart2,
  FolderKanban,
  Briefcase,
  GraduationCap,
  BookOpen,
  UserCheck,
  Calendar,
  Layers,
  Hammer,
  Coins,
  Wallet,
  CreditCard,
  ArrowRight,
  Sparkles,
  Receipt,
  PackageCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AiAnalyzeModal } from '../components/AiAnalyzeModal';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const Dashboard = ({ isEmbedded = false, mdData = null }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Admin Dashboard States
  const [adminStats, setAdminStats] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [sourcePerformance, setSourcePerformance] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [followupMetrics, setFollowupMetrics] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [clientsData, setClientsData] = useState({ clients: [], stats: {} });
  const [projectsData, setProjectsData] = useState({ projects: [], stats: {} });
  const [clientLeadsData, setClientLeadsData] = useState([]);
  const [deptsData, setDeptsData] = useState([]);
  const [coursesData, setCoursesData] = useState([]);
  const [batchesData, setBatchesData] = useState([]);
  const [enrollmentsData, setEnrollmentsData] = useState([]);
  const [leavesData, setLeavesData] = useState([]);
  const [dailyOpsData, setDailyOpsData] = useState([]);
  const [calendarWorkData, setCalendarWorkData] = useState([]);
  const [financialMetrics, setFinancialMetrics] = useState({
    capital: { amount: 0, count: 0, formatted: '₹0', subtext: 'Assets & Capital Equity' },
    sales: { amount: 0, count: 0, pending: 0, formatted: '₹0', subtext: '0 Fabrication Orders' },
    income: { amount: 0, count: 0, formatted: '₹0', subtext: '0 Receipts Received' },
    purchase: { amount: 0, count: 0, formatted: '₹0', subtext: '0 Raw Material Vouchers' },
    categories: { count: 0, obAmount: 0 },
    expenses: { amount: 0, count: 0, formatted: '₹0', subtext: '0 Operational Vouchers' },
    wage: { amount: 0, count: 0, formatted: '₹0', subtext: '0 Wage Disbursements' },
    ledger: { turnover: 0, count: 0, netBalance: 0, formatted: '₹0', subtext: '0 Ledger Transactions' },
    dayBook: { closingBalance: 0, count: 0, inflow: 0, outflow: 0, formatted: '₹0', subtext: 'Daily Cash In Hand' },
    profitAndLoss: { netProfit: 0, isProfit: true, margin: '0%', formatted: '₹0', subtext: 'Operational P&L Statement' }
  });
  const [accountsCounts, setAccountsCounts] = useState({
    capital: 0,
    sales: 0,
    income: 0,
    purchase: 0,
    categories: 0,
    expenses: 0,
    salary: 0,
    ledger: 0,
    cashBook: 0,
    reports: 0
  });
  const [fabricationJobs, setFabricationJobs] = useState([]);
  const [fabricationStats, setFabricationStats] = useState({ total: 0, active: 0, completed: 0, totalValue: 0 });

  // Filters & Search
  const [userSearch, setUserSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskCurrentPage, setTaskCurrentPage] = useState(1);
  const [userPerformanceSort, setUserPerformanceSort] = useState("completion");
  const [globalDepartment, setGlobalDepartment] = useState("all");

  // AI Analysis Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalContext, setAiModalContext] = useState(null);

  const navigate = useNavigate();

  const getISTDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata'
    }).format(new Date());
  };

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem("token");
    const cleanToken = rawToken ? rawToken.replace(/"/g, "") : "";

    return {
      Authorization: cleanToken.startsWith("Bearer ")
        ? cleanToken
        : `Bearer ${cleanToken}`,
      accept: "application/json"
    };
  }, []);

  const parseAsUTC = (dateInput) => {
    if (!dateInput) return null;

    try {
      return new Date(
        dateInput.endsWith("Z")
          ? dateInput
          : `${dateInput}Z`
      );
    } catch {
      return null;
    }
  };

  // Live Working Hours for Operator Dashboard
  const liveWorkingHours = useMemo(() => {
    if (!attendanceRecord?.check_in_time) return "0.00";

    if (attendanceRecord?.check_out_time) {
      const start = parseAsUTC(attendanceRecord.check_in_time);
      const end = parseAsUTC(attendanceRecord.check_out_time);
      return Math.max(0, (end - start) / 3600000).toFixed(2);
    }

    const start = parseAsUTC(attendanceRecord.check_in_time);
    const diffMs = currentTime.getTime() - start.getTime();
    return Math.max(0, diffMs / 3600000).toFixed(2);
  }, [attendanceRecord, currentTime]);

  const fetchData = useCallback(async (userId, privilegedMode) => {
    try {
      setLoading(true);
      const todayStr = getISTDate();

      const fetchSafe = (url) => fetch(url, { headers: getAuthHeaders() }).catch(err => {
        console.warn(`Fetch error for ${url}:`, err);
        return { ok: false };
      });

      if (privilegedMode) {
        const deptParam = globalDepartment !== 'all' ? `?department=${encodeURIComponent(globalDepartment)}` : '';
        // Fetch Admin specific stats in parallel safely
        const [
          taskRes, userRes, summaryRes, clientsRes,
          capRes, incRes, expRes, catRes, salRes, cbRes, fabRes
        ] = await Promise.all([
          fetchSafe(`${API_BASE}/tasks/all`),
          fetchSafe(`${API_BASE}/v1/users`),
          fetchSafe(`${API_BASE}/v1/analytics/summary${deptParam}`),
          fetchSafe(`${API_BASE}/v1/clients?limit=10&sortBy=createdAt&sortOrder=desc`),
          fetchSafe(`${API_BASE}/v1/accounts/capital`),
          fetchSafe(`${API_BASE}/v1/accounts/income`),
          fetchSafe(`${API_BASE}/v1/accounts/expenses`),
          fetchSafe(`${API_BASE}/v1/accounts/categories`),
          fetchSafe(`${API_BASE}/v1/accounts/salary-payments`),
          fetchSafe(`${API_BASE}/v1/accounts/cash-book`),
          fetchSafe(`${API_BASE}/v1/fabrication/jobs`)
        ]);

        // TASKS
        if (taskRes.ok) {
          const taskData = await taskRes.json().catch(() => null);
          if (taskData) {
            const rawTasks = Array.isArray(taskData) ? taskData : taskData?.data || [];
            setTasks(rawTasks);
          }
        }

        // USERS
        if (userRes.ok) {
          const userData = await userRes.json().catch(() => null);
          if (userData) {
            const rawUsers = userData.data && Array.isArray(userData.data)
              ? userData.data
              : (Array.isArray(userData) ? userData : []);
            setAllUsers(rawUsers);
          }
        }

        // SUMMARY METRICS
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json().catch(() => null);
          if (summaryData && summaryData.success) {
            setAdminStats(summaryData.data);
          }
        }

        // CLIENTS
        if (clientsRes.ok) {
          const cd = await clientsRes.json().catch(() => null);
          if (cd && cd.success) {
            setClientsData({ clients: cd.data?.clients || [], stats: cd.data?.stats || {} });
          }
        }

        // FABRICATION JOBS
        if (fabRes && fabRes.ok) {
          const fabData = await fabRes.json().catch(() => null);
          const rawJobs = Array.isArray(fabData)
            ? fabData
            : (Array.isArray(fabData?.data)
              ? fabData.data
              : (fabData?.data?.jobs || []));
          setFabricationJobs(rawJobs);
          const fabMetrics = fabData?.data?.metrics || {};
          const activeJobs = rawJobs.filter(j => !['completed', 'delivered', 'cancelled'].includes(String(j.status || '').toLowerCase()));
          const completedJobs = rawJobs.filter(j => ['completed', 'delivered'].includes(String(j.status || '').toLowerCase()));
          const totalVal = fabMetrics.totalQuoted !== undefined
            ? Number(fabMetrics.totalQuoted)
            : rawJobs.reduce((s, j) => s + Number(j.financials?.totalQuotation || j.quotationValue || 0), 0);
          setFabricationStats({
            total: fabMetrics.totalJobs !== undefined ? Number(fabMetrics.totalJobs) : rawJobs.length,
            active: fabMetrics.activeJobs !== undefined ? Number(fabMetrics.activeJobs) : activeJobs.length,
            completed: fabMetrics.completedJobs !== undefined ? Number(fabMetrics.completedJobs) : completedJobs.length,
            totalValue: totalVal,
            totalReceived: Number(fabMetrics.totalReceived || 0),
            totalDirectCost: Number(fabMetrics.totalDirectCost || 0),
            totalBalanceDue: Number(fabMetrics.totalBalanceDue || 0),
            netProfit: Number(fabMetrics.totalNetProfit || 0)
          });
        }

        // ACCOUNTS FINANCIAL & OPERATIONAL ANALYTICS
        let rawCapitals = [];
        if (capRes.ok) {
          const d = await capRes.json().catch(() => null);
          rawCapitals = Array.isArray(d) ? d : (d?.data || []);
        }
        if (rawCapitals.length === 0) {
          try {
            const savedCap = localStorage.getItem('crm_capital_records');
            if (savedCap) rawCapitals = JSON.parse(savedCap);
          } catch (e) {}
        }

        let rawIncomes = [];
        let incomeSummary = null;
        if (incRes.ok) {
          const d = await incRes.json().catch(() => null);
          rawIncomes = Array.isArray(d) ? d : (d?.data || d?.incomes || []);
          incomeSummary = d?.summary || null;
        }

        let rawExpenses = [];
        if (expRes.ok) {
          const d = await expRes.json().catch(() => null);
          rawExpenses = Array.isArray(d) ? d : (d?.data || d?.expenses || []);
        }

        let rawCategories = [];
        if (catRes.ok) {
          const d = await catRes.json().catch(() => null);
          rawCategories = Array.isArray(d) ? d : (d?.data || []);
        }

        let rawSalaries = [];
        if (salRes.ok) {
          const d = await salRes.json().catch(() => null);
          rawSalaries = Array.isArray(d) ? d : (d?.data || []);
        }

        let rawCashBook = null;
        if (cbRes.ok) {
          rawCashBook = await cbRes.json().catch(() => null);
        }

        const formatINR = (amt) => '₹' + Math.round(Number(amt) || 0).toLocaleString('en-IN');

        // 1. CAPITAL
        const totalCapitalVal = rawCapitals.reduce((sum, c) => {
          return sum + (Number(c.totalCapital || 0) || (Number(c.amount || 0) + Number(c.openingBalance || 0)));
        }, 0);

        // 2. SALES (Fabrication Orders & Quoted Invoices)
        const totalSalesVolume = rawIncomes.reduce((sum, inc) => {
          return sum + (Number(inc.totalAmount !== undefined && inc.totalAmount !== null ? inc.totalAmount : inc.amount) || 0);
        }, 0);
        const totalReceivedSales = rawIncomes.reduce((sum, inc) => {
          if (Array.isArray(inc.payments) && inc.payments.length > 0) {
            return sum + inc.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          }
          if (inc.status === 'Paid') {
            return sum + (Number(inc.totalAmount !== undefined && inc.totalAmount !== null ? inc.totalAmount : inc.amount) || 0);
          }
          return sum + (Number(inc.receiptAmount) || 0);
        }, 0);
        const pendingSalesVal = Math.max(0, totalSalesVolume - totalReceivedSales);

        // 3. INCOME (Realized Revenue Inflow)
        const totalIncomeVal = (incomeSummary && typeof incomeSummary.totalIncome === 'number' && incomeSummary.totalIncome > 0)
          ? incomeSummary.totalIncome
          : totalReceivedSales;

        // 4. PURCHASE (Raw Materials & Inventory Procurement)
        const purchaseExpenses = rawExpenses.filter(e => {
          const cat = String(e.categoryName || e.category || '').toLowerCase();
          return e.isPurchase === true || cat.includes('purchase') || cat.includes('material') || cat.includes('inventory') || cat.includes('vendor');
        });
        const totalPurchaseVal = purchaseExpenses.reduce((sum, p) => {
          return sum + (Number(p.totalAmount || p.amount) || 0);
        }, 0);

        // 5. OPERATIONAL EXPENSES (General site & fabrication overheads excluding purchases)
        const generalExpenses = rawExpenses.filter(e => {
          const cat = String(e.categoryName || e.category || '').toLowerCase();
          return !e.isPurchase && !cat.includes('purchase') && !cat.includes('material') && !cat.includes('inventory') && !cat.includes('vendor');
        });
        const totalGeneralExpenseVal = generalExpenses.reduce((sum, e) => {
          return sum + (Number(e.totalAmount || e.amount) || 0);
        }, 0);
        const totalAllExpensesVal = totalPurchaseVal + totalGeneralExpenseVal;

        // EXPENSE CATEGORIES
        const totalCategoryOb = rawCategories.reduce((sum, c) => sum + (Number(c.openingBalance) || 0), 0);

        // 6. WAGE (Staff & Worker Salary Disbursements)
        const totalWagesVal = rawSalaries.reduce((sum, p) => {
          const net = p.paidAmount !== undefined
            ? p.paidAmount
            : (p.customNetPay !== undefined
              ? p.customNetPay
              : (p.totalEarnings ? Math.max(0, (p.totalEarnings || 0) - (p.totalDeductions || 0)) : (p.basicSalary || 0)));
          return sum + Number(net || 0);
        }, 0);

        // 7. LEDGER (Combined movement & transaction turnover)
        const totalLedgerTurnover = totalSalesVolume + totalAllExpensesVal + totalWagesVal;
        const totalLedgerCount = rawIncomes.length + rawExpenses.length + rawSalaries.length;
        const netLedgerBalance = totalIncomeVal - (totalAllExpensesVal + totalWagesVal);

        // 8. DAY BOOK (Cash Book Balance & Volume)
        const cbSummary = rawCashBook?.summary || {};
        const dayBookClosing = cbSummary.closingBalance !== undefined
          ? cbSummary.closingBalance
          : (cbSummary.netBalance !== undefined
            ? cbSummary.netBalance
            : (totalIncomeVal - (totalAllExpensesVal + totalWagesVal)));
        const dayBookInflow = cbSummary.totalIncome !== undefined ? cbSummary.totalIncome : totalIncomeVal;
        const dayBookOutflow = cbSummary.totalExpense !== undefined ? cbSummary.totalExpense : (totalAllExpensesVal + totalWagesVal);
        const dayBookCount = Array.isArray(rawCashBook?.data)
          ? rawCashBook.data.length
          : (cbSummary.totalEntries || (rawIncomes.length + rawExpenses.length));

        // 9. PROFIT AND LOSS
        const totalOutflows = totalPurchaseVal + totalGeneralExpenseVal + totalWagesVal;
        const netProfitVal = totalIncomeVal - totalOutflows;
        const isProfit = netProfitVal >= 0;
        const marginPct = totalSalesVolume > 0
          ? ((netProfitVal / totalSalesVolume) * 100).toFixed(1)
          : (totalIncomeVal > 0 ? ((netProfitVal / totalIncomeVal) * 100).toFixed(1) : '0.0');

        setFinancialMetrics({
          capital: {
            amount: totalCapitalVal,
            count: rawCapitals.length,
            formatted: formatINR(totalCapitalVal),
            subtext: `${rawCapitals.length} Assets • Capital Equity`
          },
          sales: {
            amount: totalSalesVolume,
            count: rawIncomes.length,
            pending: pendingSalesVal,
            formatted: formatINR(totalSalesVolume),
            subtext: `${formatINR(pendingSalesVal)} Pending • ${rawIncomes.length} Orders`
          },
          income: {
            amount: totalIncomeVal,
            count: rawIncomes.length,
            formatted: formatINR(totalIncomeVal),
            subtext: `${rawIncomes.length} Receipts • Realized Revenue`
          },
          purchase: {
            amount: totalPurchaseVal,
            count: purchaseExpenses.length,
            formatted: formatINR(totalPurchaseVal),
            subtext: `${purchaseExpenses.length} Vouchers • Material Purchases`
          },
          categories: {
            count: rawCategories.length,
            obAmount: totalCategoryOb
          },
          expenses: {
            amount: totalGeneralExpenseVal,
            count: generalExpenses.length,
            formatted: formatINR(totalGeneralExpenseVal),
            subtext: `${generalExpenses.length} Vouchers • Operating Costs`
          },
          wage: {
            amount: totalWagesVal,
            count: rawSalaries.length,
            formatted: formatINR(totalWagesVal),
            subtext: `${rawSalaries.length} Slips • Staff Wages Disbursed`
          },
          ledger: {
            turnover: totalLedgerTurnover,
            count: totalLedgerCount,
            netBalance: netLedgerBalance,
            formatted: formatINR(totalLedgerTurnover),
            subtext: `${totalLedgerCount} Records • Gross Turnover`
          },
          dayBook: {
            closingBalance: dayBookClosing,
            count: dayBookCount,
            inflow: dayBookInflow,
            outflow: dayBookOutflow,
            formatted: (dayBookClosing < 0 ? '-' : '') + formatINR(Math.abs(dayBookClosing)),
            subtext: `Inflow ${formatINR(dayBookInflow)} • Outflow ${formatINR(dayBookOutflow)}`
          },
          profitAndLoss: {
            netProfit: netProfitVal,
            isProfit,
            margin: `${marginPct}%`,
            formatted: (isProfit ? '+' : '-') + formatINR(Math.abs(netProfitVal)),
            subtext: `Margin: ${marginPct}% • Operational Net P&L`
          }
        });

        setAccountsCounts({
          capital: rawCapitals.length,
          sales: rawIncomes.length,
          income: rawIncomes.length,
          purchase: purchaseExpenses.length,
          categories: rawCategories.length,
          expenses: generalExpenses.length,
          salary: rawSalaries.length,
          ledger: totalLedgerCount,
          cashBook: dayBookCount,
          reports: rawIncomes.length + rawExpenses.length
        });

      } else {
        // Standard User fetching
        const [taskRes, attRes] = await Promise.all([
          fetchSafe(`${API_BASE}/tasks/all`),
          fetchSafe(`${API_BASE}/attendance/${todayStr}`)
        ]);

        if (taskRes.ok) {
          const taskData = await taskRes.json().catch(() => null);
          if (taskData) {
            const rawTasks = Array.isArray(taskData) ? taskData : taskData?.data || [];
            const cleanedTasks = rawTasks.map(task => ({
              ...task,
              assigned_to: (task.assigned_to && typeof task.assigned_to === "object")
                ? (task.assigned_to.id || task.assigned_to._id)
                : task.assigned_to
            }));
            setTasks(cleanedTasks);
          }
        }

        if (attRes.ok) {
          const attData = await attRes.json().catch(() => null);
          setAttendanceRecord(attData || null);
        }
      }

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, globalDepartment]);

  const handleSync = () => {
    if (user?.user_id) {
      fetchData(user.user_id, isAdmin);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const storedUserId = localStorage.getItem("user_id")?.replace(/"/g, '');

    if (savedUser) {
      let parsedUser = null;
      try {
        parsedUser = JSON.parse(savedUser);
      } catch (e) {
        console.error("Failed to parse user:", e);
      }

      if (parsedUser) {
        const resolvedUserId = parsedUser._id || parsedUser.id || parsedUser.user_id || storedUserId || '';
        parsedUser.user_id = resolvedUserId;
        setUser(parsedUser);

        setIsAdmin(true);

        if (resolvedUserId) {
          fetchData(resolvedUserId, true);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchData, isEmbedded]);

  useEffect(() => {
    if (user?.user_id) {
      fetchData(user.user_id, isAdmin);
    }
  }, [globalDepartment, user?.user_id, isAdmin, fetchData]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setTaskCurrentPage(1);
  }, [taskSearch, taskFilter]);

  // Operator specific filtered tasks
  const myTasks = useMemo(() => {
    if (!user?.user_id) return [];

    return tasks.filter(t => {
      const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
        ? (t.assigned_to.id || t.assigned_to._id)
        : t.assigned_to;

      return String(assignedId).trim() === String(user.user_id).trim();
    });
  }, [tasks, user]);

  const operatorMetrics = useMemo(() => {
    const total = myTasks.length;
    const pending = myTasks.filter((t) => ["pending", "current"].includes(t.status?.toLowerCase())).length;
    const completed = myTasks.filter((t) => t.status?.toLowerCase() === "done").length;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, rate };
  }, [myTasks]);

  // Helper to find operator name for tasks
  const getOperatorName = (assignedTo) => {
    if (!assignedTo) return "Unassigned";
    if (typeof assignedTo === "object") {
      return assignedTo.name || assignedTo.email || "Unknown Operator";
    }
    const found = allUsers.find(u => String(u.id || u._id) === String(assignedTo));
    return found ? found.name : `Operator ID: ${String(assignedTo).slice(0, 8)}`;
  };

  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    allUsers.forEach(u => {
      const deptName = u.departmentId?.name || u.department;
      if (deptName) depts.add(deptName);
    });
    return Array.from(depts).sort();
  }, [allUsers]);

  const getOperatorDept = useCallback((assignedTo) => {
    if (!assignedTo) return "";
    const userId = (typeof assignedTo === "object") ? (assignedTo.id || assignedTo._id) : assignedTo;
    const found = allUsers.find(u => String(u.id || u._id) === String(userId));
    return found ? (found.departmentId?.name || found.department || "") : "";
  }, [allUsers]);

  // Filtered operators list (excludes superadmins)
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const userRoleId = String(u.roleId || u.role_id || u.role || '');
      const isSuper = u.isSuperAdmin === true || u.role === 'superadmin' || userRoleId === '0' || userRoleId.toLowerCase() === 'superadmin';
      if (isSuper) return false;
      if (globalDepartment !== "all") {
        const deptName = u.departmentId?.name || u.department || "";
        if (deptName.toLowerCase() !== globalDepartment.toLowerCase()) return false;
      }
      const search = userSearch.toLowerCase().trim();
      if (!search) return true;
      return (
        String(u.name || "").toLowerCase().includes(search) ||
        String(u.email || "").toLowerCase().includes(search) ||
        String(u.department || "").toLowerCase().includes(search) ||
        String(u.role || "").toLowerCase().includes(search)
      );
    });
  }, [allUsers, userSearch, globalDepartment]);

  // Filtered administrative tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (globalDepartment !== "all") {
        const dept = getOperatorDept(t.assigned_to);
        if (dept.toLowerCase() !== globalDepartment.toLowerCase()) return false;
      }
      const search = taskSearch.toLowerCase().trim();
      const statusMatch = taskFilter === "all" || String(t.status || "").toLowerCase() === taskFilter.toLowerCase();
      
      const searchMatch = !search || 
        String(t.title || "").toLowerCase().includes(search) ||
        getOperatorName(t.assigned_to).toLowerCase().includes(search);

      return statusMatch && searchMatch;
    });
  }, [tasks, taskSearch, taskFilter, allUsers, globalDepartment, getOperatorDept]);

  // System Task Monitor Pagination calculations
  const tasksPerPage = 5;
  const totalTaskPages = Math.ceil(filteredTasks.length / tasksPerPage);

  const paginatedTasks = useMemo(() => {
    const activePage = Math.min(taskCurrentPage, totalTaskPages || 1);
    const start = (activePage - 1) * tasksPerPage;
    return filteredTasks.slice(start, start + tasksPerPage);
  }, [filteredTasks, taskCurrentPage, totalTaskPages]);

  const taskPaginationItems = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalTaskPages; i++) {
      if (i === 1 || i === totalTaskPages || (i >= taskCurrentPage - 1 && i <= taskCurrentPage + 1)) {
        pages.push(i);
      }
    }
    const rendered = [];
    for (let i = 0; i < pages.length; i++) {
      if (i > 0 && pages[i] - pages[i - 1] > 1) {
        rendered.push({ type: 'ellipsis' });
      }
      rendered.push({ type: 'page', value: pages[i] });
    }
    return rendered;
  }, [totalTaskPages, taskCurrentPage]);

  // Dynamic department list from allUsers
  const departmentsList = useMemo(() => {
    const depts = new Set();
    allUsers.forEach(u => {
      if (u.department) depts.add(u.department);
    });
    return Array.from(depts);
  }, [allUsers]);

  // Processed todo task metrics grouped by department and sorted (initialized for all departments)
  const processedTodoAnalytics = useMemo(() => {
    const groups = {};

    // Initialize every department from departmentsList
    departmentsList.forEach(dept => {
      groups[dept] = { department: dept, total: 0, completed: 0, pending: 0 };
    });

    tasks.forEach(t => {
      const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
        ? (t.assigned_to.id || t.assigned_to._id)
        : t.assigned_to;
      
      const userObj = allUsers.find(u => String(u.id || u._id) === String(assignedId));
      const dept = userObj ? (userObj.department || "Unassigned") : "Unassigned";

      if (!groups[dept]) {
        groups[dept] = { department: dept, total: 0, completed: 0, pending: 0 };
      }

      groups[dept].total += 1;
      if (String(t.status).toLowerCase() === 'done') {
        groups[dept].completed += 1;
      } else {
        groups[dept].pending += 1;
      }
    });

    const list = Object.values(groups).map(g => ({
      ...g,
      completionRate: g.total ? Math.round((g.completed / g.total) * 100) : 0
    }));

    // Sorting alphabetically by default
    list.sort((a, b) => a.department.localeCompare(b.department));

    return list;
  }, [tasks, allUsers, departmentsList]);



  // Processed user todo performance list (filtered by department and sorted)
  const processedUserTodoPerformance = useMemo(() => {
    // Departments that belong to MD view only — excluded from admin Operational Task Analytics
    const MD_ONLY_DEPTS = ["academy", "hr analytics", "hr/admin", "hr", "daily task tracker"];

    let list = allUsers.filter(u => {
      const userRoleId = String(u.roleId || u.role_id || u.role || '');
      const isSuper = u.isSuperAdmin === true || u.role === 'superadmin' || userRoleId === '0' || userRoleId.toLowerCase() === 'superadmin';
      return !isSuper;
    }).map(u => {
      const userIdStr = String(u.id || u._id || "").trim();
      const userTasks = tasks.filter(t => {
        const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
          ? (t.assigned_to.id || t.assigned_to._id)
          : t.assigned_to;
        return String(assignedId).trim() === userIdStr;
      });

      const total = userTasks.length;
      const completed = userTasks.filter(t => String(t.status).toLowerCase() === 'done').length;
      const completionRate = total ? Math.round((completed / total) * 100) : 0;

      return {
        ...u,
        total,
        completed,
        completionRate
      };
    });

    // Filter by active department selection
    if (globalDepartment !== "all") {
      list = list.filter(u => {
        const deptName = u.departmentId?.name || u.department || "";
        return deptName.toLowerCase().trim() === globalDepartment.toLowerCase().trim();
      });
    } else if (!isEmbedded) {
      // Admin "all" view: exclude MD-only departments from Operational Task Analytics
      list = list.filter(u => {
        const deptName = (u.departmentId?.name || u.department || "").toLowerCase().trim();
        return !MD_ONLY_DEPTS.includes(deptName);
      });
    }

    // Sort by selected criteria
    if (userPerformanceSort === "completion") {
      list.sort((a, b) => b.completionRate - a.completionRate);
    } else if (userPerformanceSort === "workload") {
      list.sort((a, b) => b.total - a.total);
    } else if (userPerformanceSort === "name") {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    return list;
  }, [allUsers, tasks, globalDepartment, userPerformanceSort, isEmbedded]);


  // SVG Bar Chart Generator for User Todo Performance (Premium Edition)
  const renderUserTodoPerformanceChart = () => {
    const data = processedUserTodoPerformance;

    if (data.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-[200px] text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Users className="text-slate-355 dark:text-slate-655 mb-2 animate-bounce" size={24} />
          <p className="text-[10px] font-black text-slate-550 dark:text-slate-455 uppercase tracking-widest">
            No Operators Found in this Department
          </p>
        </div>
      );
    }

    const width = 500;
    const rowHeight = 35;
    const headerHeight = 20;
    const paddingLeft = 120; // for user names
    const paddingRight = 100; // for completion rate and ratio
    const chartWidth = width - paddingLeft - paddingRight;
    const height = headerHeight + (data.length * rowHeight) + 15;

    return (
      <div className="w-full h-full flex flex-col justify-between">
        <div className="relative flex-1" style={{ minHeight: `${height}px` }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="userTodoGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#442d82" />
                <stop offset="100%" stopColor="#b7d333" />
              </linearGradient>
              <filter id="shadow-user" x="-10%" y="-20%" width="120%" height="150%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#442d82" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const x = paddingLeft + ratio * chartWidth;
              return (
                <g key={idx} className="opacity-15 dark:opacity-[0.05]">
                  <line x1={x} y1={headerHeight} x2={x} y2={height - 15} stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-slate-400" />
                  <text x={x} y={headerHeight - 5} textAnchor="middle" className="text-[8px] font-black text-slate-550 fill-current">{ratio * 100}%</text>
                </g>
              );
            })}

            {/* Rows */}
            {data.map((user, idx) => {
              const y = headerHeight + (idx * rowHeight) + 10;
              const barWidth = (user.completionRate / 100) * chartWidth;

              return (
                <g key={user.id || user._id || `user-perf-${idx}`} className="group/row cursor-pointer transition-all duration-300 hover:opacity-90">
                  {/* User Name */}
                  <text
                    x={paddingLeft - 12}
                    y={y + 8}
                    textAnchor="end"
                    className="text-[9px] font-black text-slate-705 dark:text-slate-355 fill-current tracking-wide transition-colors group-hover/row:fill-indigo-500"
                  >
                    {user.name}
                  </text>

                  {/* Background Bar */}
                  <rect
                    x={paddingLeft}
                    y={y}
                    width={chartWidth}
                    height="10"
                    rx="3"
                    className="fill-slate-100 dark:fill-slate-900 transition-all duration-300"
                  />

                  {/* Progress Bar */}
                  <rect
                    x={paddingLeft}
                    y={y}
                    width={Math.max(barWidth, 0)}
                    height="10"
                    rx="3"
                    fill="url(#userTodoGrad)"
                    filter="url(#shadow-user)"
                    className="transition-all duration-500"
                  />

                  {/* Completed / Total Label */}
                  <text
                    x={paddingLeft + Math.max(barWidth, 2) + 8}
                    y={y + 8}
                    className="text-[9px] font-extrabold text-slate-500 dark:text-slate-455 fill-current"
                  >
                    {user.completed}/{user.total}
                  </text>

                  {/* Completion Rate Badge */}
                  <text
                    x={width - 5}
                    y={y + 8}
                    textAnchor="end"
                    className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 fill-current tracking-wider"
                  >
                    {user.completionRate}% Done
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Memoized completed tasks trend data for each user in selected department
  const completedUsersTrendData = useMemo(() => {
    const dates = [];
    const dateLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      dates.push(dateStr);
      
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateLabels.push({ dateStr, label });
    }

    const deptUsers = processedUserTodoPerformance;

    const trend = deptUsers.map(user => {
      const userIdStr = String(user.id || user._id || "").trim();
      const userTasks = tasks.filter(t => {
        const assignedId = (t.assigned_to && typeof t.assigned_to === "object")
          ? (t.assigned_to.id || t.assigned_to._id)
          : t.assigned_to;
        return String(assignedId).trim() === userIdStr;
      });

      const counts = dates.map(dStr => {
        return userTasks.filter(t => {
          const isDone = String(t.status).toLowerCase() === 'done';
          if (!isDone) return false;
          
          const taskDateVal = t.updatedAt || t.completedAt || t.createdAt || t.dueDate;
          if (!taskDateVal) return false;
          
          const taskDate = new Date(taskDateVal);
          const y = taskDate.getFullYear();
          const m = String(taskDate.getMonth() + 1).padStart(2, '0');
          const d = String(taskDate.getDate()).padStart(2, '0');
          const taskDateStr = `${y}-${m}-${d}`;
          
          return taskDateStr === dStr;
        }).length;
      });

      const totalCompletions = counts.reduce((a, b) => a + b, 0);

      return {
        name: user.name,
        counts,
        totalCompletions
      };
    });

    const activeUsers = trend
      .filter(u => u.totalCompletions > 0 || deptUsers.length <= 5)
      .slice(0, 5);

    return {
      dateLabels,
      usersTrend: activeUsers
    };
  }, [tasks, processedUserTodoPerformance]);

  // SVG Multi-Line Chart for User Completed Tasks Activity Trend (Premium Edition)
  const renderTasksTrendLineChart = () => {
    const { dateLabels, usersTrend } = completedUsersTrendData;

    if (usersTrend.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-[200px] text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Activity className="text-slate-355 dark:text-slate-655 mb-2 animate-bounce" size={24} />
          <p className="text-[10px] font-black text-slate-550 dark:text-slate-455 uppercase tracking-widest">
            No Active User Trends Found
          </p>
        </div>
      );
    }

    let maxVal = 2;
    usersTrend.forEach(user => {
      const userMax = Math.max(...user.counts);
      if (userMax > maxVal) maxVal = userMax;
    });

    const width = 500;
    const height = 200;
    const paddingTop = 30;
    const paddingBottom = 30;
    const paddingLeft = 30;
    const paddingRight = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const lineColors = [
      "#442d82", // indigo
      "#ec4899", // pink
      "#b7d333", // emerald
      "#f59e0b", // amber
      "#3b82f6", // blue
      "#a855f7", // purple
      "#06b6d4"  // cyan
    ];

    return (
      <div className="w-full h-full flex flex-col justify-between">
        <div className="relative flex-1" style={{ minHeight: `${height}px` }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid lines */}
            {[0, 0.5, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * ratio;
              const val = Math.round(maxVal * (1 - ratio));
              return (
                <g key={i} className="opacity-10 dark:opacity-[0.05]">
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-slate-400" />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-black text-slate-500 fill-current">{val}</text>
                </g>
              );
            })}

            {/* X-axis date labels */}
            {dateLabels.map((d, i) => {
              const x = paddingLeft + (i * (chartWidth / (dateLabels.length - 1)));
              return (
                <text 
                  key={i}
                  x={x} 
                  y={paddingTop + chartHeight + 15} 
                  textAnchor="middle" 
                  className="text-[8px] font-extrabold text-slate-500 fill-current"
                >
                  {d.label}
                </text>
              );
            })}

            {/* Paths and Dots for each user */}
            {usersTrend.map((user, uIdx) => {
              const userColor = lineColors[uIdx % lineColors.length];
              const points = user.counts.map((count, i) => {
                const x = paddingLeft + (i * (chartWidth / (dateLabels.length - 1)));
                const y = paddingTop + chartHeight - ((count / maxVal) * chartHeight);
                return { x, y, count };
              });

              const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

              return (
                <g key={`trend-line-${user.name || uIdx}`}>
                  <defs>
                    <filter id={`glow-${uIdx}`} x="-10%" y="-20%" width="120%" height="150%">
                      <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor={userColor} floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* Line path */}
                  {pathD && (
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke={userColor} 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      filter={`url(#glow-${uIdx})`}
                      className="transition-all duration-300 hover:stroke-[3px]"
                    />
                  )}

                  {/* Individual Point Circles */}
                  {points.map((p, idx) => (
                    <g key={idx} className="group/dot cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="3.5" 
                        fill={userColor}
                        style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                        className="stroke-white dark:stroke-slate-900 stroke-2 transition-transform duration-300 group-hover/dot:scale-[1.35]" 
                      />
                      <text 
                        x={p.x} 
                        y={p.y - 8} 
                        textAnchor="middle" 
                        className="text-[9px] font-black text-slate-705 dark:text-slate-350 fill-current opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none"
                      >
                        {user.name}: {p.count} Done
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center border-t border-slate-50 dark:border-slate-850 pt-3">
          {usersTrend.map((user, idx) => (
            <div key={`legend-${user.name || idx}`} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-1.5 rounded-full" style={{ backgroundColor: lineColors[idx % lineColors.length] }} />
              <span>{user.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Processed staff performance list (sorted by conversion rate)
  const processedStaffPerformance = useMemo(() => {
    let list = [...staffPerformance];
    list.sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0));
    return list;
  }, [staffPerformance]);

  const leadSourceData = useMemo(() => {
    if (!sourcePerformance) return [];
    return sourcePerformance.slice(0, 6).map((src, i) => {
      const colors = ["#442d82", "#b7d333", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];
      return {
        label: src.source || "Unknown",
        value: src.totalLeads || 0,
        rate: src.conversionRate || 0,
        color: colors[i % colors.length]
      };
    });
  }, [sourcePerformance]);

  const operatorConversionData = useMemo(() => {
    if (!processedStaffPerformance) return [];
    return processedStaffPerformance.slice(0, 6).map((staff, i) => {
      const colors = ["#8b5cf6", "#3b82f6", "#b7d333", "#f59e0b", "#ec4899", "#06b6d4"];
      return {
        label: staff.name || "Unknown",
        value: Math.round(staff.conversionRate || 0),
        color: colors[i % colors.length]
      };
    });
  }, [processedStaffPerformance]);

  // SVG Pie/Donut Chart Generator for Staff Performance
  const renderStaffPerformanceChart = () => {
    const data = operatorConversionData;

    if (data.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-[200px] text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Users className="text-slate-355 dark:text-slate-655 mb-2" size={24} />
          <p className="text-[10px] font-bold text-slate-550 dark:text-slate-455 uppercase tracking-widest">
            No Staff Performance Found
          </p>
        </div>
      );
    }

    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    const avg = data.length ? Math.round(total / data.length) : 0;
    let accumulated = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
        <div className="relative w-40 h-40 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
            {data.map((slice, i) => {
              const percent = total > 0 ? slice.value / total : 0;
              const strokeDasharray = `${percent * 314.159} ${314.159 - (percent * 314.159)}`;
              const strokeDashoffset = -((accumulated / total) * 314.159);
              accumulated += slice.value;
              return (
                <circle
                  key={i}
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:stroke-[14px] cursor-pointer"
                  title={`${slice.label}: ${slice.value}%`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Avg Conv</span>
            <span className="text-xl font-black text-slate-800 dark:text-white">{avg}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full space-y-2">
          {data.map((slice, i) => (
            <div key={i} className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="truncate uppercase text-[10px] tracking-wide">{slice.label}</span>
              </div>
              <span className="font-mono text-indigo-500">{slice.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // SVG LINE/AREA CHART GENERATOR (Real Activity Timeline)
  // ----------------------------------------------------
  const renderWeeklyActivityChart = () => {
    const dataPoints = followupMetrics?.weeklyTimeline || [];

    if (dataPoints.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
          <Activity className="text-slate-350 dark:text-slate-650 mb-2" size={24} />
          <p className="text-[10px] font-bold text-slate-550 dark:text-slate-450 uppercase tracking-widest">No Activity Logged This Week</p>
        </div>
      );
    }

    const maxVal = Math.max(...dataPoints.map(d => d.count), 10);
    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = dataPoints.map((d, i) => {
      const x = paddingLeft + (i / (dataPoints.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
      const label = d.date.includes('-') ? d.date.split('-')[2] : d.date;
      return { x, y, label, count: d.count };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaD = points.length 
      ? `${pathD} L ${points[points.length-1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z` 
      : "";

    return (
      <div className="w-full h-full flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Operator Action Log
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Lead follow-ups registered last 7 days
            </p>
          </div>
          <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded uppercase">
            Live Feed
          </span>
        </div>

        <div className="relative flex-1 min-h-[140px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#442d82" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#442d82" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.33, 0.66, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * ratio;
              const val = Math.round(maxVal * (1 - ratio));
              return (
                <g key={i} className="opacity-15 dark:opacity-[0.07]">
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-slate-400" />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-bold text-slate-550 fill-current">{val}</text>
                </g>
              );
            })}

            {/* Area gradient under path */}
            {areaD && <path d={areaD} fill="url(#areaGrad)" />}

            {/* Solid line path */}
            {pathD && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="#442d82" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                className="drop-shadow-[0_2px_6px_rgba(99,102,241,0.35)]" 
              />
            )}

            {/* Data point anchors */}
            {points.map((p, i) => (
              <g key={i} className="group/anchor">
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="4" 
                  fill="#442d82" 
                  stroke="#fff" 
                  strokeWidth="1.5" 
                  className="cursor-pointer transition-all duration-300 group-hover/anchor:r-5 group-hover/anchor:fill-lime-400" 
                />
                
                {/* Micro-tooltip */}
                <g className="opacity-0 group-hover/anchor:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect x={p.x - 16} y={p.y - 25} width="32" height="16" rx="4" fill="#0f172a" className="dark:fill-slate-800 shadow-md" />
                  <text x={p.x} y={p.y - 14} textAnchor="middle" fill="#fff" className="text-[9px] font-black fill-white">{p.count}</text>
                </g>

                {/* X Axis Date labels */}
                <text x={p.x} y={height - 5} textAnchor="middle" className="text-[9px] font-bold text-slate-500 fill-current">{p.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // RENDER ADMIN VIEW
  // ----------------------------------------------------
  const renderAdminView = () => {
    const filteredUsersCount = allUsers.filter(u => {
      const userRoleId = String(u.roleId || u.role_id || u.role || '');
      const isSuper = u.isSuperAdmin === true || u.role === 'superadmin' || userRoleId === '0' || userRoleId.toLowerCase() === 'superadmin';
      if (isSuper) return false;
      if (globalDepartment === "all") return true;
      const deptName = u.departmentId?.name || u.department || "";
      return deptName.toLowerCase() === globalDepartment.toLowerCase();
    });
    const activeStaffCount = filteredUsersCount.filter(u => u.isActive !== false).length;

    const tasksForDept = tasks.filter(t => {
      if (globalDepartment === "all") return true;
      const dept = getOperatorDept(t.assigned_to);
      return dept.toLowerCase() === globalDepartment.toLowerCase();
    });
    const doneTasksCount = tasksForDept.filter(t => String(t.status).toLowerCase() === "done").length;
    const totalTasksCount = tasksForDept.length;
    const taskCompletionRate = totalTasksCount ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

    const stats = adminStats || {};
    const funnelList = funnelData?.funnel || [];
    const normalizedDept = String(globalDepartment || '').toLowerCase().replace(/\s+/g, '');
    const showLeadsArea = normalizedDept === "all" || 
                          normalizedDept.includes("marketing") || 
                          normalizedDept.includes("sales&growth") || 
                          normalizedDept.includes("salesandgrowth") || 
                          normalizedDept.includes("sales");

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-16 pt-1 max-w-7xl mx-auto px-4">
        
        {/* MINIMAL HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                FABTEC <span className="text-amber-500 font-bold">Operations</span>
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Fabrication production, accounts and financial overview
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Sync System"
            >
              <RefreshCw size={14} />
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
              {currentTime.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        <AiAnalyzeModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          contextData={aiModalContext}
          title="FABTEC AI Operations Analysis"
        />

        {/* MINIMAL DEPARTMENT FILTER PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setGlobalDepartment("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              globalDepartment === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Overview
          </button>

          {/* MD-only tabs — only shown when accessed via MdDashboard */}
          {isEmbedded && (
            <>
              <button
                onClick={() => setGlobalDepartment("Academy")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  globalDepartment.toLowerCase() === "academy"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Academy
              </button>

              <button
                onClick={() => setGlobalDepartment("HR Analytics")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  globalDepartment.toLowerCase() === "hr analytics" || globalDepartment.toLowerCase() === "hr/admin" || globalDepartment.toLowerCase() === "hr"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                HR Analytics
              </button>

              <button
                onClick={() => setGlobalDepartment("Daily Task Tracker")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  globalDepartment.toLowerCase() === "daily task tracker"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Daily Task Tracker
              </button>
            </>
          )}

          {uniqueDepartments.map(dept => (
            <button
              key={dept}
              onClick={() => setGlobalDepartment(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                globalDepartment.toLowerCase() === dept.toLowerCase()
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* MINIMAL FINANCIAL & OPERATIONS METRICS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* 1. FABRICATION */}
          <StatCard
            label="Fabrication"
            badge={`${fabricationStats.total} Jobs`}
            value={fabricationStats.total}
            icon={Hammer}
            color="text-amber-600 dark:text-amber-400"
            subtext={`${fabricationStats.active} Active • ${fabricationStats.completed} Done`}
            onClick={() => navigate('/fabrication')}
          />

          {/* 2. SALES */}
          <StatCard
            label="Sales"
            badge={`${financialMetrics.sales.count} Orders`}
            value={financialMetrics.sales.formatted}
            icon={TrendingUp}
            color="text-teal-600 dark:text-teal-400"
            subtext={financialMetrics.sales.subtext}
            onClick={() => navigate('/accounts/sales')}
          />

          {/* 3. INCOME */}
          <StatCard
            label="Income"
            badge={`${financialMetrics.income.count} Receipts`}
            value={financialMetrics.income.formatted}
            icon={FileText}
            color="text-cyan-600 dark:text-cyan-400"
            subtext={financialMetrics.income.subtext}
            onClick={() => navigate('/accounts/income')}
          />

          {/* 4. PROFIT AND LOSS */}
          <StatCard
            label="Profit and Loss"
            badge={financialMetrics.profitAndLoss.isProfit ? "Profit" : "Deficit"}
            value={financialMetrics.profitAndLoss.formatted}
            icon={BarChart2}
            color={financialMetrics.profitAndLoss.isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            subtext={financialMetrics.profitAndLoss.subtext}
            onClick={() => navigate('/accounts/reports')}
          />

          {/* 5. PURCHASE */}
          <StatCard
            label="Purchase"
            badge={`${financialMetrics.purchase.count} Vouchers`}
            value={financialMetrics.purchase.formatted}
            icon={Building}
            color="text-sky-600 dark:text-sky-400"
            subtext={financialMetrics.purchase.subtext}
            onClick={() => navigate('/accounts/purchase')}
          />

          {/* 6. EXPENSE */}
          <StatCard
            label="Expense"
            badge={`${financialMetrics.expenses.count} Vouchers`}
            value={financialMetrics.expenses.formatted}
            icon={Activity}
            color="text-fuchsia-600 dark:text-fuchsia-400"
            subtext={financialMetrics.expenses.subtext}
            onClick={() => navigate('/accounts/expenses')}
          />

          {/* 7. WAGE */}
          <StatCard
            label="Wage"
            badge={`${financialMetrics.wage.count} Slips`}
            value={financialMetrics.wage.formatted}
            icon={ListChecks}
            color="text-amber-600 dark:text-amber-400"
            subtext={financialMetrics.wage.subtext}
            onClick={() => navigate('/accounts/salary')}
          />

          {/* 8. DAY BOOK */}
          <StatCard
            label="Day Book"
            badge={`${financialMetrics.dayBook.count} Entries`}
            value={financialMetrics.dayBook.formatted}
            icon={Clock}
            color={financialMetrics.dayBook.closingBalance >= 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}
            subtext={financialMetrics.dayBook.subtext}
            onClick={() => navigate('/accounts/cash-book')}
          />

          {/* 9. CAPITAL */}
          <StatCard
            label="Capital"
            badge={`${financialMetrics.capital.count} Assets`}
            value={financialMetrics.capital.formatted}
            icon={Briefcase}
            color="text-emerald-600 dark:text-emerald-400"
            subtext={financialMetrics.capital.subtext}
            onClick={() => navigate('/accounts/capital')}
          />

          {/* 10. LEDGER */}
          <StatCard
            label="Ledger"
            badge={`${financialMetrics.ledger.count} Entries`}
            value={financialMetrics.ledger.formatted}
            icon={BookOpen}
            color="text-orange-600 dark:text-orange-400"
            subtext={financialMetrics.ledger.subtext}
            onClick={() => navigate('/accounts/ledger')}
          />

          {/* 11. CLIENTS */}
          <StatCard
            label="Clients"
            badge={`${clientsData.stats?.total || clientsData.clients?.length || 0}`}
            value={clientsData.stats?.total || clientsData.clients?.length || 0}
            icon={Building}
            color="text-blue-600 dark:text-blue-400"
            subtext={`${clientsData.stats?.active || 0} Active Accounts`}
            onClick={() => navigate('/clients')}
          />

          {/* 12. EMPLOYEES */}
          <StatCard
            label="Employees"
            badge={`${allUsers.length} Total`}
            value={allUsers.length}
            icon={Users}
            color="text-indigo-600 dark:text-indigo-400"
            subtext={`${activeStaffCount} Active On Duty`}
            onClick={() => navigate('/users')}
          />
        </div>

        {/* MINIMAL FABRICATION JOB ORDERS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Hammer size={15} className="text-amber-500" />
                Fabrication Job Orders
              </h2>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold">
                {fabricationStats.total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/accounts/share")}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="View Partner Profit Sharing & Equity"
              >
                <Users size={13} />
                <span>Partner Share</span>
              </button>
              <button
                onClick={() => navigate("/fabrication")}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {fabricationJobs && fabricationJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="text-left pb-2.5 pr-3">Job ID</th>
                    <th className="text-left pb-2.5 pr-3">Client</th>
                    <th className="text-left pb-2.5 pr-3">Scope</th>
                    <th className="text-right pb-2.5 pr-3">Quotation (₹)</th>
                    <th className="text-right pb-2.5 pr-3">Received (₹)</th>
                    <th className="text-right pb-2.5 pr-3">Balance (₹)</th>
                    <th className="text-center pb-2.5 pr-3">Status</th>
                    <th className="text-right pb-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {fabricationJobs.slice(0, 6).map((j) => {
                    const fin = j.financials || {};
                    const quoteVal = Number(fin.totalQuotation || j.quotationValue || 0);
                    const recvVal = Number(fin.totalAmountReceived || 0);
                    const balVal = Number(fin.balanceDue !== undefined ? fin.balanceDue : Math.max(0, quoteVal - recvVal));
                    return (
                      <tr key={j._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <td className="py-2.5 pr-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          #{j.jobNumber || j.jobId || 'FAB'}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-slate-800 dark:text-slate-200">
                          {j.clientName || 'Client'}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-500 max-w-[200px] truncate">
                          {j.jobTitle || (j.quotationItems && j.quotationItems.length > 0 ? j.quotationItems.map(i => i.description).join(', ') : 'Fabrication Work Order')}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{quoteVal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{recvVal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          ₹{balVal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 pr-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            ['completed', 'delivered'].includes(String(j.status || '').toLowerCase())
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : ['in progress', 'active', 'confirmed / in progress'].includes(String(j.status || '').toLowerCase())
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          }`}>
                            {j.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => navigate(`/fabrication/${j._id}`)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                          >
                            Details →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No fabrication jobs recorded yet
            </div>
          )}
        </div>

        {/* MINIMAL CLIENTS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Building size={15} className="text-blue-500" />
                Clients
              </h2>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold">
                {clientsData.stats?.total || clientsData.clients?.length || 0}
              </span>
            </div>
            <button
              onClick={() => navigate("/clients")}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              View All <ChevronRight size={13} />
            </button>
          </div>

          {clientsData.clients && clientsData.clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="text-left pb-2.5 pr-3">Client</th>
                    <th className="text-left pb-2.5 pr-3">Type</th>
                    <th className="text-left pb-2.5 pr-3">Status</th>
                    <th className="text-left pb-2.5">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {clientsData.clients.slice(0, 6).map((c, i) => (
                    <tr key={c._id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                      <td className="py-2.5 pr-3 font-semibold text-slate-800 dark:text-slate-200">
                        {c.name || c.clientName || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">
                        {c.clientType || c.type || 'Standard'}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          String(c.status || '').toLowerCase() === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {c.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                        {c.email || c.contactEmail || c.phone || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No clients registered yet
            </div>
          )}
        </div>

      </motion.div>
    );
  };

  // ----------------------------------------------------
  // RENDER OPERATOR VIEW
  // ----------------------------------------------------
  const renderOperatorView = () => {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20 pt-6 max-w-7xl mx-auto px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Operator Profile</p>
              <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">{user?.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Shift start block */}
            <div
              onClick={() => navigate("/attendance")}
              className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 hover:border-indigo-500/30 dark:hover:border-indigo-500/50 transition-all shadow-sm"
            >
              <div className="p-3 bg-white-500/10 dark:bg-indigo-100/20 rounded-xl text-indigo-500 dark:text-indigo-400"><Timer size={20} /></div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Shift Start</p>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase">
                  {attendanceRecord?.check_in_time
                    ? parseAsUTC(attendanceRecord.check_in_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                    : 'OFFLINE'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Success Rate" value={`${operatorMetrics.rate}%`} icon={Activity} color="text-indigo-600 dark:text-indigo-400" borderColor="bg-indigo-600" bgColor="bg-indigo-50 dark:bg-indigo-950/20" />
          <StatCard label="Live Work Hours" value={`${liveWorkingHours}h`} icon={Clock} color="text-lime-600 dark:text-lime-400" borderColor="bg-lime-500" bgColor="bg-lime-50 dark:bg-lime-950/20" />
          <StatCard label="Pending Tasks" value={operatorMetrics.pending} icon={Target} color="text-amber-600 dark:text-amber-400" borderColor="bg-amber-500" bgColor="bg-amber-50 dark:bg-amber-950/20" />
          <StatCard label="Completed" value={operatorMetrics.completed} icon={ListChecks} color="text-indigo-600 dark:text-indigo-400" borderColor="bg-indigo-500" bgColor="bg-indigo-50 dark:bg-indigo-950/20" />
        </div>

        {/* MISSIONS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tight">
                Personal <span className="text-indigo-500">Missions</span>
              </h2>
            </div>

            <button
              onClick={() => navigate("/todo")}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
            >
              Full Board <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {myTasks.filter(t => t.status === 'pending').length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                  No pending tasks found for operator
                </p>
              </div>
            ) : (
              myTasks
                .filter(t => t.status === 'pending')
                .slice(0, 5)
                .map((task) => (
                  <div
                    key={task.id}
                    className="group p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl flex items-center justify-between hover:border-indigo-500/20 dark:hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-1 h-6 bg-indigo-500/40 rounded-full" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{task.title}</h4>
                        <p className="text-[9px] text-slate-555 dark:text-slate-450 font-bold uppercase tracking-tighter mt-0.5">ID: {task.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] font-black text-orange-500 bg-orange-500/5 border border-orange-500/10 px-3 py-1 rounded-lg uppercase tracking-tighter">
                        Pending
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <LayoutDashboard size={40} className="text-indigo-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-lime-400 border-2 border-white dark:border-slate-950 animate-bounce" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="text-indigo-400 animate-spin" />
          <p className="text-[11px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">
            Loading Overview
          </p>
        </div>
      </motion.div>
    </div>
  );

  return renderAdminView();
};

const StatCard = ({ label, value, badge, icon: Icon, color, subtext, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl relative overflow-hidden group shadow-2xs hover:shadow-xs transition-all hover:border-slate-350 dark:hover:border-slate-700 flex flex-col justify-between ${
      onClick ? 'cursor-pointer hover:translate-y-[-2px] active:translate-y-0' : ''
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {badge}
          </span>
        )}
      </div>
      {Icon && (
        <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 ${color || 'text-slate-600 dark:text-slate-400'} shrink-0`}>
          <Icon size={14} />
        </div>
      )}
    </div>

    <div>
      <h3 className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${color || 'text-slate-900 dark:text-white'}`}>
        {value}
      </h3>
      {subtext && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
          {subtext}
        </p>
      )}
    </div>
  </div>
);

const ActionCard = ({ title, desc, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="group p-5 bg-slate-50/50 hover:bg-white dark:bg-slate-950/20 dark:hover:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl flex flex-col text-left transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full group-hover:bg-indigo-500/10 transition-all" />
    <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
      <Icon size={18} className="text-white" />
    </div>
    <div className="flex items-center gap-1">
      <h3 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-tight group-hover:text-indigo-500 transition-colors">
        {title}
      </h3>
      <ArrowUpRight size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
    </div>
    <p className="text-[9px] text-slate-550 dark:text-slate-455 font-medium uppercase mt-0.5 leading-tight">
      {desc}
    </p>
  </button>
);

export default Dashboard;