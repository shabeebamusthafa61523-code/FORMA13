import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Calendar, 
  Filter,
  Loader2,
  CheckCircle2,
  AlertCircle
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
  const [totalNetProfit, setTotalNetProfit] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const yearParam = selectedYear === 'all' ? '' : selectedYear;
      const res = await getMonthlyPnLSummary(yearParam);
      if (res && res.success) {
        setMonthlyData(Array.isArray(res.data) ? res.data : []);
        setTotalNetProfit(Number(res.totalNetProfit) || 0);
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

  // Excel export data
  const excelData = useMemo(() => {
    return monthlyData.map((m, idx) => ({
      index: idx + 1,
      month: m.monthName,
      netProfit: m.netProfit,
      status: m.status
    }));
  }, [monthlyData]);

  const excelColumns = useMemo(() => [
    { header: '#', key: 'index', width: 8 },
    { header: 'Month', key: 'month', width: 22 },
    { header: 'Profit & Loss (₹)', key: 'netProfit', width: 20 },
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
                Historical monthly profit and loss summary
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

      {/* 2. Cumulative P&L Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        totalNetProfit >= 0
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
          : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
            totalNetProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            {totalNetProfit >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Cumulative Profit & Loss {selectedYear !== 'all' ? `(${selectedYear})` : '(All Time)'}
            </span>
            <h2 className={`text-2xl font-black font-mono tracking-tight ${
              totalNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {formatINR(totalNetProfit)}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            totalNetProfit >= 0
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
          }`}>
            Overall {totalNetProfit >= 0 ? 'Profit' : 'Loss'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Across {monthlyData.length} recorded month{monthlyData.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* 3. The Pure Monthly Profit & Loss Table */}
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
                  <th className="py-3 px-4 w-16 text-center">#</th>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-6 text-right">Profit & Loss</th>
                  <th className="py-3 px-4 text-center w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {monthlyData.map((item, index) => {
                  const isProfit = Number(item.netProfit) >= 0;
                  return (
                    <tr 
                      key={item.period} 
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        isProfit 
                          ? 'border-l-4 border-l-emerald-500' 
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
                          <Calendar size={15} className={isProfit ? 'text-emerald-600' : 'text-rose-600'} />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.monthName}
                          </span>
                        </div>
                      </td>

                      {/* Profit & Loss Amount */}
                      <td className="py-3.5 px-6 text-right">
                        <span className={`font-mono font-black text-base ${
                          isProfit 
                            ? 'text-emerald-700 dark:text-emerald-400' 
                            : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {formatINR(item.netProfit)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          isProfit
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {isProfit ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                          <span>{isProfit ? 'Profit' : 'Loss'}</span>
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
