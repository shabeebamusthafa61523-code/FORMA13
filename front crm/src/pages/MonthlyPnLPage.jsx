import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Calendar, 
  Filter,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers
} from 'lucide-react';
import { getMonthlyPnLSummary } from '../services/accountsService';
import { useToast } from '../components/ToastProvider';
import ExcelExportButton from '../components/ExcelExportButton';

const formatINR = (val) => {
  const num = Number(val) || 0;
  const isNeg = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });
  return isNeg ? `-₹${absFormatted}` : `+₹${absFormatted}`;
};

const MonthlyPnLPage = () => {
  const { showToast } = useToast();

  const [monthlyData, setMonthlyData] = useState([]);
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [loading, setLoading] = useState(true);
  const [totalNetProfitWithGen, setTotalNetProfitWithGen] = useState(0);
  const [totalNetProfitWithoutGen, setTotalNetProfitWithoutGen] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const yearParam = selectedYear === 'all' ? '' : selectedYear;
      const res = await getMonthlyPnLSummary(yearParam);
      if (res && res.success) {
        setMonthlyData(Array.isArray(res.data) ? res.data : []);
        setTotalNetProfitWithGen(
          Number(res.totalNetProfitWithGeneralExpense !== undefined ? res.totalNetProfitWithGeneralExpense : res.totalNetProfit) || 0
        );
        setTotalNetProfitWithoutGen(
          Number(res.totalNetProfitWithoutGeneralExpense !== undefined ? res.totalNetProfitWithoutGeneralExpense : res.totalNetProfit) || 0
        );
        if (Array.isArray(res.availableYears) && res.availableYears.length > 0) {
          setAvailableYears(res.availableYears);
        }
      } else {
        showToast(res?.message || 'Failed to load monthly P&L data', 'error');
      }
    } catch (err) {
      console.error('Failed to load monthly P&L:', err);
      showToast(err.response?.data?.message || err.message || 'Error fetching monthly P&L', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Excel export data with both P&L columns and breakdowns
  const excelData = useMemo(() => {
    return monthlyData.map((m, idx) => ({
      index: idx + 1,
      month: m.monthName,
      incomeTotal: m.incomeTotal || 0,
      netPurchases: m.netPurchases || 0,
      grossSalaries: m.salaries || 0,
      wageCredits: m.wageCredits || 0,
      netSalaries: m.netSalaries !== undefined ? m.netSalaries : m.salaries,
      siteExpenses: m.siteExpenses || 0,
      pnlWithoutGenExp: m.pnlWithoutGeneralExpense !== undefined ? m.pnlWithoutGeneralExpense : m.netProfit,
      generalExpenses: m.generalExpenses || 0,
      totalExpenses: m.totalExpenses || 0,
      pnlWithGenExp: m.pnlWithGeneralExpense !== undefined ? m.pnlWithGeneralExpense : m.netProfit,
      status: m.status
    }));
  }, [monthlyData]);

  const excelColumns = useMemo(() => [
    { header: '#', key: 'index', width: 8 },
    { header: 'Month', key: 'month', width: 22 },
    { header: 'Total Income (₹)', key: 'incomeTotal', width: 18 },
    { header: 'Net Purchases (₹)', key: 'netPurchases', width: 18 },
    { header: 'Gross Salaries (₹)', key: 'grossSalaries', width: 18 },
    { header: 'Wage Credits Deducted (₹)', key: 'wageCredits', width: 24 },
    { header: 'Net Salaries (₹)', key: 'netSalaries', width: 18 },
    { header: 'Site Expenses (₹)', key: 'siteExpenses', width: 18 },
    { header: 'P&L (Without Gen Exp) (₹)', key: 'pnlWithoutGenExp', width: 24 },
    { header: 'General Expenses (₹)', key: 'generalExpenses', width: 20 },
    { header: 'Total Outflows (₹)', key: 'totalExpenses', width: 18 },
    { header: 'P&L (With Gen Exp) (₹)', key: 'pnlWithGenExp', width: 24 },
    { header: 'Status', key: 'status', width: 14 }
  ], []);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16">
      {/* 1. Header & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Monthly Profit & Loss
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Historical monthly project site margin vs comprehensive net profit
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Year Selector */}
          <div className="relative flex items-center">
            <Filter size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Filter by Year"
              className="pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Recorded Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Year {yr}</option>
              ))}
            </select>
          </div>

          {/* Export Excel */}
          {monthlyData.length > 0 && (
            <ExcelExportButton
              data={excelData}
              columns={excelColumns}
              filename={`Monthly_Profit_Loss_${selectedYear}_${new Date().toISOString().split('T')[0]}`}
              buttonText="Export Excel"
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            />
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Dual Cumulative P&L Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card 1: P&L (Without General Expense) - Direct Site Performance */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between gap-3 ${
          totalNetProfitWithoutGen >= 0
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
              totalNetProfitWithoutGen >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  P&L (Without General Exp)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Site Margin
                </span>
              </div>
              <h2 className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${
                totalNetProfitWithoutGen >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}>
                {formatINR(totalNetProfitWithoutGen)}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Income − (Purchases + Wages + Site Exp)
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
              totalNetProfitWithoutGen >= 0
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
            }`}>
              {totalNetProfitWithoutGen >= 0 ? 'Profit' : 'Loss'}
            </span>
          </div>
        </div>

        {/* Card 2: P&L (With General Expense) - Comprehensive Bottom-line */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between gap-3 ${
          totalNetProfitWithGen >= 0
            ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60'
            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
              totalNetProfitWithGen >= 0 ? 'bg-indigo-600' : 'bg-rose-600'
            }`}>
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  P&L (With General Exp)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                  Net Profit
                </span>
              </div>
              <h2 className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${
                totalNetProfitWithGen >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-700 dark:text-rose-400'
              }`}>
                {formatINR(totalNetProfitWithGen)}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Full Net Profit after Workshop/Office Overheads
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
              totalNetProfitWithGen >= 0
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
            }`}>
              {totalNetProfitWithGen >= 0 ? 'Profit' : 'Loss'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. The Pure Monthly Profit & Loss Table with Dual Columns */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500 font-medium">Loading monthly Profit & Loss records...</p>
          </div>
        ) : monthlyData.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-center px-4">
            <AlertCircle size={32} className="text-slate-300 dark:text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Monthly Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              There are no transactions recorded for the selected year.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Month</th>
                  
                  {/* Column 1: P&L (Without General Expense) */}
                  <th className="py-3 px-5 text-right">
                    <div>P&L (Without Gen. Exp)</div>
                    <div className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 normal-case">
                      Includes Site Expenses
                    </div>
                  </th>

                  {/* Column 2: P&L (With General Expense) */}
                  <th className="py-3 px-5 text-right">
                    <div>P&L (With Gen. Exp)</div>
                    <div className="text-[9.5px] font-semibold text-indigo-600 dark:text-indigo-400 normal-case">
                      Full Net Profit
                    </div>
                  </th>

                  <th className="py-3 px-4 text-center w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {monthlyData.map((item, index) => {
                  const pnlWithout = item.pnlWithoutGeneralExpense !== undefined ? Number(item.pnlWithoutGeneralExpense) : Number(item.netProfit);
                  const pnlWith = item.pnlWithGeneralExpense !== undefined ? Number(item.pnlWithGeneralExpense) : Number(item.netProfit);
                  const isSiteProfit = pnlWithout >= 0;
                  const isNetProfit = pnlWith >= 0;

                  return (
                    <tr 
                      key={item.period} 
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        isNetProfit 
                          ? 'border-l-4 border-l-indigo-500' 
                          : 'border-l-4 border-l-rose-500'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Month Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className={isNetProfit ? 'text-indigo-600' : 'text-rose-600'} />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.monthName}
                          </span>
                        </div>
                      </td>

                      {/* Column 1: P&L Without General Expense (Includes Site Expense) */}
                      <td className="py-3.5 px-5 text-right">
                        <span className={`font-mono font-black text-base ${
                          isSiteProfit 
                            ? 'text-emerald-700 dark:text-emerald-400' 
                            : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {formatINR(pnlWithout)}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-sans mt-0.5">
                          {Number(item.siteExpenses || 0) > 0 ? (
                            <span>Site Exp: ₹{Number(item.siteExpenses).toLocaleString('en-IN')}</span>
                          ) : (
                            <span>Direct Site Margin</span>
                          )}
                        </div>
                      </td>

                      {/* Column 2: P&L With General Expense (Comprehensive Net Profit) */}
                      <td className="py-3.5 px-5 text-right">
                        <span className={`font-mono font-black text-base ${
                          isNetProfit 
                            ? 'text-indigo-700 dark:text-indigo-400' 
                            : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {formatINR(pnlWith)}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-sans mt-0.5">
                          {Number(item.generalExpenses || 0) > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              Gen Exp: -₹{Number(item.generalExpenses).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span>No Gen Exp</span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          isNetProfit
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {isNetProfit ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                          <span>{isNetProfit ? 'Profit' : 'Loss'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyPnLPage;
